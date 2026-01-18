import { PrismaClient } from "@prisma/client";
import { Resend } from "resend";
import pLimit from "p-limit";
import { load } from "cheerio";
import {
  detectSuspiciousKeywords,
  domainPolicyIssues,
  extractJsonLdObjects,
  findProductJsonLd,
  extractProductFromJsonLd,
  fallbackExtractProduct,
  PageResult,
  runPageRules,
  runPolicyRules,
  scoreDomain,
  severitySummary,
  isPrivateHostResolved,
  validateSafeUrl,
} from "@gmc/shared";
import { env } from "./env";
import {
  discoverSitemaps,
  fetchSitemapUrls,
  extractLinks,
  detectProductUrl,
  detectPolicyUrl,
  detectProductFromHtml,
  fetchWithRetry,
  fetchWithTimeout,
  isPlaceholderImage,
  isUrlAllowedByRobots,
  parseRobotsTxt,
  robotsDisallowAll,
} from "./crawler";
import { exportToGoogleSheets } from "./sheetsExporter";
import { chromium, type Browser } from "playwright";
import { rateLimitDomain } from "./rateLimiter";

const prisma = new PrismaClient();
const resend = new Resend(env.resendApiKey || "");

async function getHtml(
  url: string,
  timeoutMs: number,
  useBrowser: boolean,
  browser: Browser | null
): Promise<string> {
  if (!useBrowser) {
    const res = await fetchWithRetry(url, timeoutMs);
    return await res.text();
  }
  if (!browser) {
    throw new Error("Browser not available");
  }
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  const html = await page.content();
  await page.close();
  return html;
}

function extractText(html: string): string {
  const $ = load(html);
  return $("body").text();
}

function canonicalFromHtml(html: string): string | undefined {
  const $ = load(html);
  return $("link[rel=canonical]").attr("href") || undefined;
}

function titleFromHtml(html: string): string | undefined {
  const $ = load(html);
  return $("title").first().text().trim() || undefined;
}

function metaDescriptionFromHtml(html: string): string | undefined {
  const $ = load(html);
  return $("meta[name=description]").attr("content") || undefined;
}

function imageUrlsFromHtml(html: string): string[] {
  const $ = load(html);
  const imgs: string[] = [];
  $("img[src]").each((_, el) => {
    const src = $(el).attr("src");
    if (src) imgs.push(src);
  });
  return imgs;
}

function applyCustomRules(params: {
  rules: Array<{
    id: string;
    name: string;
    pattern: string;
    patternType: "KEYWORD" | "REGEX";
    appliesTo: "PRODUCT" | "POLICY" | "ANY";
    severity: "HIGH" | "MEDIUM" | "LOW" | "REVIEW";
    message: string;
  }>;
  pageType: "PRODUCT" | "POLICY" | "OTHER";
  url: string;
  title?: string;
  text: string;
}): Array<{ code: string; severity: any; message: string; evidence?: any }> {
  const issues: Array<{ code: string; severity: any; message: string; evidence?: any }> = [];
  const haystack = `${params.url}\n${params.title || ""}\n${params.text}`.toLowerCase();

  for (const rule of params.rules) {
    if (rule.appliesTo !== "ANY" && rule.appliesTo !== params.pageType) continue;
    let matched = false;
    if (rule.patternType === "KEYWORD") {
      matched = haystack.includes(rule.pattern.toLowerCase());
    } else {
      try {
        const re = new RegExp(rule.pattern, "i");
        matched = re.test(haystack);
      } catch {
        matched = false;
      }
    }
    if (matched) {
      issues.push({
        code: `CUSTOM_${rule.id}`,
        severity: rule.severity,
        message: rule.message || rule.name,
        evidence: { ruleId: rule.id, ruleName: rule.name },
      });
    }
  }

  return issues;
}

async function getImageDimensionsFromPage(
  url: string,
  timeoutMs: number,
  browser: Browser | null
): Promise<Array<{ src: string; width: number; height: number }>> {
  if (!browser) return [];
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
  const images = await page.$$eval("img", (imgs) =>
    imgs.map((img) => ({
      src: (img as HTMLImageElement).currentSrc || (img as HTMLImageElement).src || "",
      width: (img as HTMLImageElement).naturalWidth || 0,
      height: (img as HTMLImageElement).naturalHeight || 0,
    }))
  );
  await page.close();
  return images;
}

async function discoverCandidateUrls(domain: string, maxPages: number, timeoutMs: number) {
  const sitemaps = await discoverSitemaps(domain, timeoutMs);
  const urls: string[] = [];
  for (const sitemap of sitemaps) {
    const entries = await fetchSitemapUrls(sitemap, timeoutMs);
    urls.push(...entries);
  }

  const normalized: string[] = [];
  for (const url of urls) {
    try {
      const safe = validateSafeUrl(url, domain, true);
      normalized.push(safe);
    } catch {
      continue;
    }
  }

  const deduped = Array.from(new Set(normalized));
  if (deduped.length > 0) return deduped.slice(0, maxPages * 2);

  const queue: string[] = [domain];
  const visited = new Set<string>();
  while (queue.length > 0 && visited.size < maxPages * 2) {
    const next = queue.shift();
    if (!next || visited.has(next)) continue;
    visited.add(next);
    let html = "";
    try {
      html = await getHtml(next, timeoutMs, false, null);
    } catch {
      continue;
    }
    const links = extractLinks(html, next);
    for (const link of links) {
      if (visited.has(link)) continue;
      try {
        const safe = validateSafeUrl(link, domain, true);
        queue.push(safe);
      } catch {
        continue;
      }
    }
  }
  return Array.from(visited).slice(0, maxPages * 2);
}

function computeImagesOk(images: string[]): boolean {
  const filtered = images.filter((img) => !isPlaceholderImage(img));
  return filtered.length > 0;
}

export async function processScan(scanId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId } });
  if (!scan) return;

  const hostname = new URL(scan.domain).hostname;
  if (await isPrivateHostResolved(hostname)) {
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        errorMessage: "Domain resolves to a private or local address.",
      },
    });
    return;
  }

  const maxPages = scan.mode === "QUICK" ? 25 : env.defaultFullScanLimit;
  const timeoutMs = 20000;
  const customRules = await prisma.customRule.findMany({ where: { enabled: true } });

  await prisma.scan.update({
    where: { id: scanId },
    data: { status: "RUNNING", startedAt: new Date(), progress: 1 },
  });

  const robotsTxt = await fetchWithTimeout(new URL("/robots.txt", scan.domain).toString(), timeoutMs)
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null);
  const robotsRules = robotsTxt ? parseRobotsTxt(robotsTxt) : null;

  if (robotsTxt && robotsDisallowAll(robotsTxt)) {
    const blockedIssue = {
      code: "BLOCKED_CRAWLING",
      severity: "HIGH" as const,
      message: "robots.txt blocks crawling for user-agent *.",
    };
    const summary = scoreDomain([blockedIssue], []);
    const summaryHtml = `<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>GMC Scan Summary</title></head>\n<body>\n<h1>GMC Compliance Summary for E-commerce</h1>\n<p>Domain: ${scan.domain}</p>\n<p>Score: ${summary.score}</p>\n<p>Crawl blocked by robots.txt</p>\n</body></html>`;
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "DONE",
        progress: 100,
        finishedAt: new Date(),
        score: summary.score,
        topIssues: summary.topIssues.map((i) => i.code),
        summary: summary,
        summaryHtml,
        errorMessage: "robots.txt blocks crawling",
      },
    });
    await prisma.scanIssue.create({
      data: {
        scanId,
        code: blockedIssue.code,
        severity: blockedIssue.severity,
        message: blockedIssue.message,
      },
    });
    return;
  }

  let candidates = await discoverCandidateUrls(scan.domain, maxPages, timeoutMs);
  if (robotsRules) {
    candidates = candidates.filter((url) => isUrlAllowedByRobots(url, robotsRules));
  }
  if (candidates.length === 0) {
    const blockedIssue = {
      code: "BLOCKED_CRAWLING",
      severity: "HIGH" as const,
      message: "No crawlable URLs discovered from sitemaps or crawl.",
    };
    const summary = scoreDomain([blockedIssue], []);
    const summaryHtml = `<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>GMC Scan Summary</title></head>\n<body>\n<h1>GMC Compliance Summary for E-commerce</h1>\n<p>Domain: ${scan.domain}</p>\n<p>Score: ${summary.score}</p>\n<p>No crawlable URLs discovered.</p>\n</body></html>`;
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "DONE",
        progress: 100,
        finishedAt: new Date(),
        score: summary.score,
        topIssues: summary.topIssues.map((i) => i.code),
        summary: summary,
        summaryHtml,
        errorMessage: "No crawlable URLs discovered",
      },
    });
    await prisma.scanIssue.create({
      data: {
        scanId,
        code: blockedIssue.code,
        severity: blockedIssue.severity,
        message: blockedIssue.message,
      },
    });
    return;
  }

  let browser: Browser | null = null;
  const getBrowser = async () => {
    if (!browser) browser = await chromium.launch();
    return browser;
  };

  let policyUrls = candidates.filter((u) => detectPolicyUrl(u));
  let productUrls = candidates.filter((u) => detectProductUrl(u));

  if (policyUrls.length === 0) {
    try {
      const homeHtml = await getHtml(scan.domain, timeoutMs, true, await getBrowser());
      const homeLinks = extractLinks(homeHtml, scan.domain);
      const filtered = robotsRules ? homeLinks.filter((u) => isUrlAllowedByRobots(u, robotsRules)) : homeLinks;
      policyUrls = filtered.filter((u) => detectPolicyUrl(u));
    } catch {
      // ignore
    }
  }

  if (productUrls.length < maxPages) {
    const limit = pLimit(3);
    const extra = await Promise.all(
      candidates.slice(0, 100).map((url) =>
        limit(async () => {
          try {
            const html = await getHtml(url, timeoutMs, false, null);
            return detectProductFromHtml(html) ? url : null;
          } catch {
            return null;
          }
        })
      )
    );
    productUrls = Array.from(new Set(productUrls.concat(extra.filter(Boolean) as string[])));
  }

  const targetUrls = Array.from(new Set([...policyUrls, ...productUrls])).slice(0, maxPages + policyUrls.length);

  const results: PageResult[] = [];
  const issuesRecords: Array<{ code: string; severity: any; message: string; evidence?: any; url?: string }> = [];
  const policyFound: string[] = [];

  const limit = pLimit(3);
  let processed = 0;
  const minDelayMs = robotsRules?.crawlDelay ? robotsRules.crawlDelay * 1000 : 300;
  const domainKey = new URL(scan.domain).hostname;
  const hostSafetyCache = new Map<string, boolean>();
  let lastProgress = 0;
  let lastProgressAt = 0;

  const isHostSafe = async (hostname: string) => {
    if (hostSafetyCache.has(hostname)) return hostSafetyCache.get(hostname) as boolean;
    const unsafe = await isPrivateHostResolved(hostname);
    const safe = !unsafe;
    hostSafetyCache.set(hostname, safe);
    return safe;
  };

  const updateProgress = async () => {
    const percent = Math.min(99, Math.round((processed / targetUrls.length) * 100));
    const now = Date.now();
    if (percent > lastProgress && now - lastProgressAt > 400) {
      lastProgress = percent;
      lastProgressAt = now;
      await prisma.scan.update({
        where: { id: scanId },
        data: { progress: percent },
      });
    }
  };

  await Promise.all(
    targetUrls.map((url) =>
      limit(async () => {
        await rateLimitDomain(domainKey, minDelayMs, 200);

        let httpStatus: number | undefined;
        let finalUrl: string | undefined;
        let html = "";
        let errorMessage: string | undefined;
        const hostname = new URL(url).hostname;
        if (!(await isHostSafe(hostname))) {
          errorMessage = "Blocked host (private or local address)";
          processed += 1;
          await updateProgress();
          results.push({
            url,
            pageType: "OTHER",
            httpStatus,
            finalUrl,
            canonicalOk: false,
            httpsOk: url.startsWith("https://"),
            jsonldProductPresent: false,
            priceFound: false,
            currencyFound: false,
            availabilityFound: false,
            imagesOk: false,
            suspiciousKeywords: false,
            issuesCodes: [],
            errorMessage,
          });
          return;
        }
        try {
          const res = await fetchWithRetry(url, timeoutMs);
          httpStatus = res.status;
          finalUrl = res.url;
          html = await res.text();
          if (!html || html.length < 300) {
            html = await getHtml(url, timeoutMs, true, await getBrowser());
          }
        } catch (err: any) {
          errorMessage = err?.message || "Fetch failed";
          processed += 1;
          await updateProgress();
          results.push({
            url,
            pageType: "OTHER",
            httpStatus,
            finalUrl,
            canonicalOk: false,
            httpsOk: url.startsWith("https://"),
            jsonldProductPresent: false,
            priceFound: false,
            currencyFound: false,
            availabilityFound: false,
            imagesOk: false,
            suspiciousKeywords: false,
            issuesCodes: [],
            errorMessage,
          });
          return;
        }

        const canonical = canonicalFromHtml(html);
        const title = titleFromHtml(html);
        const metaDescription = metaDescriptionFromHtml(html);
        const canonicalOk = canonical ? canonical === finalUrl || canonical === url : false;
        const httpsOk = (finalUrl || url).startsWith("https://");

        const text = extractText(html);
        const suspiciousKeywords = detectSuspiciousKeywords(text);

        const jsonld = extractJsonLdObjects(html);
        const productLd = findProductJsonLd(jsonld);
        const product = productLd[0] ? extractProductFromJsonLd(productLd[0]) : undefined;
        const fallbackProduct = fallbackExtractProduct(html);

        const images = product?.images?.length ? product.images : imageUrlsFromHtml(html);
        let imagesOk = computeImagesOk(images || []);

        let pageType: "PRODUCT" | "POLICY" | "OTHER" = "OTHER";
        if (detectPolicyUrl(url)) pageType = "POLICY";
        if (detectProductUrl(url) || productLd.length > 0) pageType = "PRODUCT";

        if (pageType === "POLICY") {
          if (url.toLowerCase().includes("returns") || url.toLowerCase().includes("refund")) policyFound.push("returns");
          if (url.toLowerCase().includes("shipping") || url.toLowerCase().includes("delivery")) policyFound.push("shipping");
          if (url.toLowerCase().includes("contact") || url.toLowerCase().includes("support")) policyFound.push("contact");
          if (url.toLowerCase().includes("privacy")) policyFound.push("privacy");
          if (url.toLowerCase().includes("terms")) policyFound.push("terms");
        }

        if (pageType === "PRODUCT" && !imagesOk) {
          try {
            const imageMeta = await getImageDimensionsFromPage(url, timeoutMs, await getBrowser());
            const hasLarge = imageMeta.some(
              (img) => img.width >= 100 && img.height >= 100 && !isPlaceholderImage(img.src)
            );
            imagesOk = imagesOk || hasLarge;
          } catch {
            // ignore image dimension failures
          }
        }

        const priceFound = Boolean(product?.price || fallbackProduct.price);
        const currencyFound = Boolean(product?.priceCurrency || fallbackProduct.priceCurrency);
        const availabilityFound = Boolean(product?.availability || fallbackProduct.availability);

        const pageResult: PageResult = {
          url,
          pageType,
          httpStatus,
          finalUrl,
          canonicalUrl: canonical,
          title,
          metaDescription,
          canonicalOk,
          httpsOk,
          jsonldProductPresent: productLd.length > 0,
          priceFound,
          currencyFound,
          availabilityFound,
          imagesOk,
          suspiciousKeywords,
          notes: pageType === "POLICY" ? "Policy page detected" : undefined,
          issuesCodes: [],
          confidence: pageType === "PRODUCT" ? 0.8 : 0.6,
          rawData: {
            product,
            fallbackProduct,
          },
        };

        const issues = runPageRules(pageResult, product).concat(
          pageType === "POLICY" ? runPolicyRules(text) : []
        );
        const customIssues = applyCustomRules({
          rules: customRules as any,
          pageType,
          url,
          title,
          text,
        });
        customIssues.forEach((issue) => issues.push(issue as any));
        pageResult.issuesCodes = issues.map((i) => i.code);
        pageResult.severitySummary = severitySummary(issues);

        issues.forEach((issue) => {
          issuesRecords.push({
            code: issue.code,
            severity: issue.severity,
            message: issue.message,
            evidence: issue.evidence,
            url,
          });
        });

        results.push(pageResult);

        processed += 1;
        await updateProgress();
      })
    )
  );

  if (browser) {
    await browser.close();
  }

  const uniquePolicies = Array.from(new Set(policyFound));
  const domainIssues = domainPolicyIssues(uniquePolicies);

  const allIssues = issuesRecords.map((i) => ({
    code: i.code,
    severity: i.severity,
    message: i.message,
    evidence: i.evidence,
  }))
  .concat(domainIssues);

  const summary = scoreDomain(allIssues, uniquePolicies);
  const summaryHtml = `<!doctype html>\n<html><head><meta charset=\"utf-8\"><title>GMC Scan Summary</title></head>\n<body>\n<h1>GMC Compliance Summary for E-commerce</h1>\n<p>Domain: ${scan.domain}</p>\n<p>Score: ${summary.score}</p>\n<h2>Top Issues</h2>\n<ul>\n${summary.topIssues.map((i) => `<li>${i.code} (${i.severity})</li>`).join(\"\")}\n</ul>\n<h2>Policy Pages Found</h2>\n<p>${summary.policyPagesFound.join(\", \") || \"None\"}</p>\n</body></html>`;

  await prisma.scanPage.createMany({
    data: results.map((r) => ({
      scanId,
      url: r.url,
      pageType: r.pageType,
      httpStatus: r.httpStatus,
      finalUrl: r.finalUrl,
      canonicalUrl: r.canonicalUrl,
      canonicalOk: r.canonicalOk,
      httpsOk: r.httpsOk,
      jsonldProductPresent: r.jsonldProductPresent,
      priceFound: r.priceFound,
      currencyFound: r.currencyFound,
      availabilityFound: r.availabilityFound,
      imagesOk: r.imagesOk,
      suspiciousKeywords: r.suspiciousKeywords,
      notes: r.notes,
      title: r.title,
      metaDescription: r.metaDescription,
      severitySummary: r.severitySummary,
      issuesCodes: r.issuesCodes,
      confidence: r.confidence,
      rawData: r.rawData,
      errorMessage: r.errorMessage,
    })),
  });

  const pages = await prisma.scanPage.findMany({
    where: { scanId },
    select: { id: true, url: true },
  });
  const pageIdByUrl = new Map(pages.map((p) => [p.url, p.id]));

  await prisma.scanIssue.createMany({
    data: issuesRecords
      .map((i) => ({
        scanId,
        pageId: i.url ? pageIdByUrl.get(i.url) : undefined,
        code: i.code,
        severity: i.severity,
        message: i.message,
        evidence: i.evidence,
      }))
      .concat(
        domainIssues.map((i) => ({
          scanId,
          code: i.code,
          severity: i.severity,
          message: i.message,
          evidence: i.evidence,
        }))
      ),
  });

  const sheet = await exportToGoogleSheets({
    domain: scan.domain,
    email: scan.requestedEmail || undefined,
    pages: results,
    summary,
    watermark: scan.mode === "QUICK" && !scan.userId ? "Free Quick Scan" : undefined,
  });

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "DONE",
      progress: 100,
      finishedAt: new Date(),
      score: summary.score,
      topIssues: summary.topIssues.map((i) => i.code),
      sheetId: sheet.sheetId,
      sheetUrl: sheet.sheetUrl,
      summary: summary,
      summaryHtml,
    },
  });

  if (scan.requestedEmail && env.resendApiKey) {
    await resend.emails.send({
      from: "GMC Compliance Scanner <no-reply@yourdomain.com>",
      to: scan.requestedEmail,
      subject: `Your GMC compliance scan for ${scan.domain}`,
      html: `Your e-commerce compliance scan is complete. View results: <a href=\"${env.appBaseUrl}/scan/${scanId}\">Open results</a>`,
    });
  }
}
