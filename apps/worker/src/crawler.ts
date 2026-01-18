import { load } from "cheerio";
import { extractJsonLdObjects, findProductJsonLd } from "@gmc/shared";
import { parseSitemapXml } from "@gmc/shared";
import { extractSitemapsFromRobots } from "@gmc/shared";
import { normalizeUrl } from "@gmc/shared";

export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchWithRetry(url: string, timeoutMs: number, retries = 2): Promise<Response> {
  let attempt = 0;
  while (attempt <= retries) {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (res.status >= 500 || res.status === 429) {
      attempt += 1;
      if (attempt > retries) return res;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      continue;
    }
    return res;
  }
  return fetchWithTimeout(url, timeoutMs);
}

export async function fetchRobotsTxt(domain: string, timeoutMs: number): Promise<string | null> {
  try {
    const robotsUrl = new URL("/robots.txt", domain).toString();
    const res = await fetchWithRetry(robotsUrl, timeoutMs);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export type RobotsRules = {
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
};

export function parseRobotsTxt(robotsTxt: string): RobotsRules {
  const lines = robotsTxt.split(/\r?\n/);
  let inStarGroup = false;
  let seenRuleInGroup = false;
  const allow: string[] = [];
  const disallow: string[] = [];
  let crawlDelay: number | undefined;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [rawKey, ...rest] = trimmed.split(":");
    const key = rawKey.toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      if (seenRuleInGroup) {
        inStarGroup = false;
        seenRuleInGroup = false;
      }
      if (value === "*") {
        inStarGroup = true;
      }
      continue;
    }
    if (!inStarGroup) continue;
    seenRuleInGroup = true;

    if (key === "disallow") {
      disallow.push(value);
    }
    if (key === "allow") {
      allow.push(value);
    }
    if (key === "crawl-delay") {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) crawlDelay = parsed;
    }
  }

  return { allow, disallow, crawlDelay };
}

function patternToRegex(pattern: string): RegExp {
  const hasEnd = pattern.endsWith("$");
  const raw = hasEnd ? pattern.slice(0, -1) : pattern;
  const escaped = raw.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}${hasEnd ? "$" : ""}`);
}

function matchesPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  if (pattern === "/") return true;
  return patternToRegex(pattern).test(path);
}

export function isUrlAllowedByRobots(url: string, rules: RobotsRules): boolean {
  const parsed = new URL(url);
  const path = (parsed.pathname || "/") + (parsed.search || "");
  let bestAllow = -1;
  let bestDisallow = -1;

  for (const allow of rules.allow) {
    if (matchesPattern(path, allow)) {
      bestAllow = Math.max(bestAllow, allow.length);
    }
  }

  for (const disallow of rules.disallow) {
    if (matchesPattern(path, disallow)) {
      bestDisallow = Math.max(bestDisallow, disallow.length);
    }
  }

  if (bestDisallow < 0 && bestAllow < 0) return true;
  if (bestAllow >= bestDisallow) return true;
  return false;
}

export function robotsDisallowAll(robotsTxt: string): boolean {
  const lower = robotsTxt.toLowerCase();
  if (!lower.includes("user-agent: *")) return false;
  return /user-agent:\s*\*([\s\S]*?)disallow:\s*\/\s*/i.test(robotsTxt);
}

export async function discoverSitemaps(domain: string, timeoutMs: number): Promise<string[]> {
  const robots = await fetchRobotsTxt(domain, timeoutMs);
  if (robots) {
    const sitemaps = extractSitemapsFromRobots(robots);
    if (sitemaps.length > 0) return sitemaps;
  }
  return [new URL("/sitemap.xml", domain).toString()];
}

export async function fetchSitemapUrls(sitemapUrl: string, timeoutMs: number): Promise<string[]> {
  const res = await fetchWithRetry(sitemapUrl, timeoutMs);
  if (!res.ok) return [];
  const xml = await res.text();
  const { urls, sitemapIndexes } = parseSitemapXml(xml);
  const collected = urls.map((u) => u.loc);
  for (const idx of sitemapIndexes) {
    const more = await fetchSitemapUrls(idx, timeoutMs);
    collected.push(...more);
  }
  return collected;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const $ = load(html);
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    const normalized = normalizeUrl(href, baseUrl);
    if (normalized) links.push(normalized);
  });
  return links;
}

export function detectProductUrl(url: string): boolean {
  return /\/products\//i.test(url) || /\/product\//i.test(url);
}

export function detectPolicyUrl(url: string): boolean {
  return /(returns|refund|shipping|delivery|privacy|terms|contact|support)/i.test(url);
}

export function detectProductFromHtml(html: string): boolean {
  const objects = extractJsonLdObjects(html);
  const products = findProductJsonLd(objects);
  return products.length > 0;
}

export function isPlaceholderImage(url: string): boolean {
  return /placeholder|dummy|spacer|1x1|blank/i.test(url);
}
