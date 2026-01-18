import { Issue, IssueSeverity, PageResult, PageType, ProductData } from "./types";

const SUSPICIOUS_KEYWORDS = [
  "aliexpress",
  "temu",
  "replica",
  "1:1",
  "fake",
  "counterfeit",
];

export function runPageRules(
  page: PageResult,
  product?: ProductData
): Issue[] {
  const issues: Issue[] = [];

  if (!page.httpsOk) {
    issues.push({
      code: "NON_HTTPS_OR_MIXED_CONTENT",
      severity: "HIGH",
      message: "Page is not served over HTTPS or has mixed content.",
    });
  }

  if (page.pageType === "PRODUCT") {
    if (!page.priceFound) {
      issues.push({
        code: "PRODUCT_MISSING_PRICE",
        severity: "HIGH",
        message: "Product price is missing.",
      });
    }

    if (!page.imagesOk) {
      issues.push({
        code: "PRODUCT_IMAGE_PLACEHOLDER_OR_TOO_SMALL",
        severity: "HIGH",
        message: "Product image appears missing, placeholder, or too small.",
      });
    }

    if (!page.jsonldProductPresent) {
      issues.push({
        code: "PRODUCT_NO_JSONLD",
        severity: "MEDIUM",
        message: "No Product JSON-LD detected.",
      });
    }

    if (!page.availabilityFound) {
      issues.push({
        code: "PRODUCT_MISSING_AVAILABILITY",
        severity: "MEDIUM",
        message: "Product availability not detected.",
      });
    }

    if (page.suspiciousKeywords) {
      issues.push({
        code: "SUSPICIOUS_KEYWORDS",
        severity: "REVIEW",
        message: "Suspicious keywords detected on page.",
      });
    }

    if (product?.brand && !product.gtin && !product.mpn) {
      issues.push({
        code: "BRAND_MISUSE_OR_GUESS",
        severity: "REVIEW",
        message: "Brand present but no GTIN/MPN detected.",
      });
    }
  }

  return issues;
}

export function detectSuspiciousKeywords(text: string): boolean {
  const lower = text.toLowerCase();
  return SUSPICIOUS_KEYWORDS.some((kw) => lower.includes(kw));
}

export function runPolicyRules(text: string): Issue[] {
  const issues: Issue[] = [];
  const lower = text.toLowerCase();
  const hasReturns = lower.includes("return") || lower.includes("refund");
  const hasShipping = lower.includes("shipping") || lower.includes("delivery");

  if (hasReturns && !/(\d+)\s*(day|days|business days)/i.test(lower)) {
    issues.push({
      code: "POLICY_VAGUE_RETURNS",
      severity: "MEDIUM",
      message: "Returns policy found but no clear timeframe detected.",
    });
  }

  const shippingMatch = lower.match(/(\d{2,})\s*(day|days|business days)/i);
  if (hasShipping && shippingMatch) {
    const days = Number(shippingMatch[1]);
    if (!Number.isNaN(days) && days > 21) {
      issues.push({
        code: "SHIPPING_TIME_EXTREME",
        severity: "MEDIUM",
        message: "Shipping timeframe appears longer than 21 days.",
      });
    }
  }

  return issues;
}

export function severitySummary(issues: Issue[]): IssueSeverity | undefined {
  if (issues.some((i) => i.severity === "HIGH")) return "HIGH";
  if (issues.some((i) => i.severity === "MEDIUM")) return "MEDIUM";
  if (issues.some((i) => i.severity === "LOW")) return "LOW";
  if (issues.some((i) => i.severity === "REVIEW")) return "REVIEW";
  return undefined;
}

export function isPolicyPage(content: string): PageType {
  const lower = content.toLowerCase();
  const policyKeywords = [
    "returns",
    "refund",
    "shipping",
    "delivery",
    "privacy",
    "terms",
    "contact",
  ];
  if (policyKeywords.some((k) => lower.includes(k))) {
    return "POLICY";
  }
  return "OTHER";
}
