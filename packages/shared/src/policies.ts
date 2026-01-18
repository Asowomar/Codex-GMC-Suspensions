import { Issue } from "./types";

const POLICY_MAP = {
  returns: ["returns", "refund"],
  shipping: ["shipping", "delivery"],
  contact: ["contact", "support"],
  privacy: ["privacy"],
  terms: ["terms", "conditions"],
};

export function detectPolicyType(urlOrText: string): string | null {
  const lower = urlOrText.toLowerCase();
  for (const [key, words] of Object.entries(POLICY_MAP)) {
    if (words.some((w) => lower.includes(w))) {
      return key;
    }
  }
  return null;
}

export function domainPolicyIssues(foundPolicies: string[]): Issue[] {
  const issues: Issue[] = [];
  if (!foundPolicies.includes("returns")) {
    issues.push({
      code: "NO_RETURNS_POLICY_FOUND",
      severity: "HIGH",
      message: "No returns/refunds policy detected.",
    });
  }
  if (!foundPolicies.includes("shipping")) {
    issues.push({
      code: "NO_SHIPPING_POLICY_FOUND",
      severity: "HIGH",
      message: "No shipping policy detected.",
    });
  }
  if (!foundPolicies.includes("contact")) {
    issues.push({
      code: "NO_CONTACT_INFO_FOUND",
      severity: "HIGH",
      message: "No contact page or info detected.",
    });
  }
  if (!foundPolicies.includes("privacy")) {
    issues.push({
      code: "MISSING_PRIVACY_OR_TERMS",
      severity: "LOW",
      message: "Privacy policy missing.",
    });
  }
  if (!foundPolicies.includes("terms")) {
    issues.push({
      code: "MISSING_PRIVACY_OR_TERMS",
      severity: "LOW",
      message: "Terms and conditions missing.",
    });
  }
  return issues;
}
