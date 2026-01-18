import { describe, it, expect } from "vitest";
import { normalizeUrl, enforceSameDomain, isPrivateHost, coerceUrlInput } from "../src/url";

describe("url utils", () => {
  it("normalizes and strips utm params", () => {
    const url = normalizeUrl("https://example.com/product?utm_source=x&id=1#frag");
    expect(url).toBe("https://example.com/product?id=1");
  });

  it("coerces URLs without scheme", () => {
    const url = coerceUrlInput("example.com/product");
    expect(url).toBe("https://example.com/product");
  });

  it("fixes common scheme typos", () => {
    const url = coerceUrlInput("https//example.com");
    expect(url).toBe("https://example.com");
  });

  it("fixes single-slash scheme typo", () => {
    const url = coerceUrlInput("http:/example.com");
    expect(url).toBe("http://example.com");
  });

  it("enforces same domain", () => {
    expect(enforceSameDomain("https://shop.example.com/p", "https://example.com", true)).toBe(true);
    expect(enforceSameDomain("https://shop.example.com/p", "https://example.com", false)).toBe(false);
  });

  it("blocks private hosts", () => {
    expect(isPrivateHost("127.0.0.1")).toBe(true);
    expect(isPrivateHost("example.com")).toBe(false);
  });
});
