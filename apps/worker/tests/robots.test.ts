import { describe, it, expect } from "vitest";
import { parseRobotsTxt, isUrlAllowedByRobots } from "../src/crawler";

describe("robots.txt parsing", () => {
  it("blocks disallowed paths but allows explicit allow", () => {
    const rules = parseRobotsTxt(`User-agent: *
Disallow: /private
Allow: /private/ok
`);
    expect(isUrlAllowedByRobots("https://example.com/private/page", rules)).toBe(false);
    expect(isUrlAllowedByRobots("https://example.com/private/ok/page", rules)).toBe(true);
  });

  it("supports wildcard and end anchor", () => {
    const rules = parseRobotsTxt(`User-agent: *
Disallow: /*?sort=
Allow: /products$
`);
    expect(isUrlAllowedByRobots("https://example.com/products", rules)).toBe(true);
    expect(isUrlAllowedByRobots("https://example.com/products?sort=asc", rules)).toBe(false);
  });
});
