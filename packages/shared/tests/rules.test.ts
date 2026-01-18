import { describe, it, expect } from "vitest";
import { runPageRules } from "../src/rules";
import { PageResult } from "../src/types";

describe("rules", () => {
  it("flags missing price for product", () => {
    const page: PageResult = {
      url: "https://example.com/product",
      pageType: "PRODUCT",
      canonicalOk: true,
      httpsOk: true,
      jsonldProductPresent: false,
      priceFound: false,
      currencyFound: false,
      availabilityFound: false,
      imagesOk: true,
      suspiciousKeywords: false,
      issuesCodes: [],
    };
    const issues = runPageRules(page);
    expect(issues.some((i) => i.code === "PRODUCT_MISSING_PRICE")).toBe(true);
  });
});
