import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Demo mode disabled" }, { status: 403 });
  }

  const scan = await prisma.scan.create({
    data: {
      domain: "https://demo-store.example",
      mode: "QUICK",
      status: "DONE",
      progress: 100,
      score: 78,
      topIssues: [
        "NO_RETURNS_POLICY_FOUND",
        "PRODUCT_MISSING_PRICE",
        "PRODUCT_NO_JSONLD",
      ],
      summary: {
        score: 78,
        topIssues: [
          { code: "NO_RETURNS_POLICY_FOUND", severity: "HIGH", message: "Returns policy missing" },
          { code: "PRODUCT_MISSING_PRICE", severity: "HIGH", message: "Price missing" },
          { code: "PRODUCT_NO_JSONLD", severity: "MEDIUM", message: "No JSON-LD" },
        ],
        counts: { HIGH: 2, MEDIUM: 1, LOW: 0, REVIEW: 0 },
        policyPagesFound: ["shipping", "contact"],
      },
      summaryHtml:
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>GMC Scan Summary</title></head><body><h1>GMC Compliance Summary for E-commerce</h1><p>Domain: demo-store.example</p><p>Score: 78</p><h2>Top Issues</h2><ul><li>NO_RETURNS_POLICY_FOUND (HIGH)</li><li>PRODUCT_MISSING_PRICE (HIGH)</li><li>PRODUCT_NO_JSONLD (MEDIUM)</li></ul></body></html>",
    },
  });

  await prisma.scanPage.createMany({
    data: [
      {
        scanId: scan.id,
        url: "https://demo-store.example/products/linen-shirt",
        pageType: "PRODUCT",
        httpStatus: 200,
        finalUrl: "https://demo-store.example/products/linen-shirt",
        canonicalOk: true,
        httpsOk: true,
        jsonldProductPresent: false,
        priceFound: false,
        currencyFound: false,
        availabilityFound: true,
        imagesOk: true,
        suspiciousKeywords: false,
        issuesCodes: ["PRODUCT_MISSING_PRICE", "PRODUCT_NO_JSONLD"],
        severitySummary: "HIGH",
      },
      {
        scanId: scan.id,
        url: "https://demo-store.example/pages/shipping",
        pageType: "POLICY",
        httpStatus: 200,
        finalUrl: "https://demo-store.example/pages/shipping",
        canonicalOk: true,
        httpsOk: true,
        jsonldProductPresent: false,
        priceFound: false,
        currencyFound: false,
        availabilityFound: false,
        imagesOk: false,
        suspiciousKeywords: false,
        issuesCodes: [],
      },
    ],
  });

  await prisma.scanIssue.createMany({
    data: [
      {
        scanId: scan.id,
        code: "NO_RETURNS_POLICY_FOUND",
        severity: "HIGH",
        message: "No returns/refunds policy detected.",
      },
      {
        scanId: scan.id,
        code: "PRODUCT_MISSING_PRICE",
        severity: "HIGH",
        message: "Product price is missing.",
      },
      {
        scanId: scan.id,
        code: "PRODUCT_NO_JSONLD",
        severity: "MEDIUM",
        message: "No Product JSON-LD detected.",
      },
    ],
  });

  return NextResponse.json({ scanId: scan.id });
}
