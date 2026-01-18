import { google } from "googleapis";
import { PageResult, DomainSummary } from "@gmc/shared";
import { env } from "./env";

export type SheetExportResult = {
  sheetId: string;
  sheetUrl: string;
};

function getAuth() {
  return new google.auth.JWT({
    email: env.googleClientEmail,
    key: env.googlePrivateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive"],
  });
}

async function withRetries<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt += 1;
      if (attempt > retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

export async function exportToGoogleSheets(params: {
  domain: string;
  email?: string;
  pages: PageResult[];
  summary: DomainSummary;
  watermark?: string;
}): Promise<SheetExportResult> {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });
  const drive = google.drive({ version: "v3", auth });

  const title = `GMC Scan - ${params.domain} - ${new Date().toISOString().slice(0, 10)}`;
  const created = await withRetries(() =>
    sheets.spreadsheets.create({
      requestBody: {
        properties: { title },
        sheets: [
          { properties: { title: "Pages" } },
          { properties: { title: "Summary" } },
        ],
      },
    })
  );
    requestBody: {
      properties: { title },
      sheets: [
        { properties: { title: "Pages" } },
        { properties: { title: "Summary" } },
      ],
    },
  });

  const sheetId = created.data.spreadsheetId || "";
  const sheetUrl = created.data.spreadsheetUrl || "";

  const header = [
    "url",
    "page_type",
    "http_status",
    "canonical_ok",
    "https_ok",
    "jsonld_product_present",
    "price_found",
    "currency_found",
    "availability_found",
    "images_ok",
    "suspicious_keywords",
    "notes",
    "severity_summary",
    "issues_codes",
    "confidence",
  ];

  const rows = params.pages.map((p) => [
    p.url,
    p.pageType,
    p.httpStatus ?? "",
    p.canonicalOk ? "yes" : "no",
    p.httpsOk ? "yes" : "no",
    p.jsonldProductPresent ? "yes" : "no",
    p.priceFound ? "yes" : "no",
    p.currencyFound ? "yes" : "no",
    p.availabilityFound ? "yes" : "no",
    p.imagesOk ? "yes" : "no",
    p.suspiciousKeywords ? "yes" : "no",
    p.notes ?? "",
    p.severitySummary ?? "",
    p.issuesCodes.join(","),
    p.confidence ?? "",
  ]);

  const chunkSize = 500;
  await withRetries(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Pages!A1",
      valueInputOption: "RAW",
      requestBody: { values: [header] },
    })
  );

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await withRetries(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: "Pages!A1",
        valueInputOption: "RAW",
        requestBody: { values: chunk },
      })
    );
  }

  const summaryRows = [
    ["score", params.summary.score],
    ["top_issues", params.summary.topIssues.map((i) => `${i.code}:${i.severity}`).join(" | ")],
    ["counts_high", params.summary.counts.HIGH],
    ["counts_medium", params.summary.counts.MEDIUM],
    ["counts_low", params.summary.counts.LOW],
    ["counts_review", params.summary.counts.REVIEW],
    ["policy_pages", params.summary.policyPagesFound.join(",")],
  ];
  if (params.watermark) {
    summaryRows.push(["watermark", params.watermark]);
  }

  await withRetries(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: "Summary!A1",
      valueInputOption: "RAW",
      requestBody: { values: summaryRows },
    })
  );

  if (params.email) {
    await withRetries(() =>
      drive.permissions.create({
        fileId: sheetId,
        requestBody: {
          role: "reader",
          type: "user",
          emailAddress: params.email,
        },
        sendNotificationEmail: false,
      })
    );
  }

  return { sheetId, sheetUrl };
}
