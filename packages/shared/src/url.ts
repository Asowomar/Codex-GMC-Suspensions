import { z } from "zod";
import net from "node:net";
import dns from "node:dns/promises";

const urlSchema = z.string().url();

const PRIVATE_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
];

export function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return true;
  }
  const ipType = net.isIP(hostname);
  if (ipType === 0) {
    return false;
  }
  return PRIVATE_RANGES.some((re) => re.test(hostname));
}

export async function isPrivateHostResolved(hostname: string): Promise<boolean> {
  if (isPrivateHost(hostname)) return true;
  try {
    const results = await dns.lookup(hostname, { all: true });
    return results.some((result) => isPrivateHost(result.address));
  } catch {
    return false;
  }
}

export function coerceUrlInput(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  let fixed = trimmed;
  fixed = fixed.replace(/^https?:\/\//i, (match) => match.toLowerCase());
  fixed = fixed.replace(/^https?:\/(?!\/)/i, (match) =>
    match.toLowerCase().startsWith("https") ? "https://" : "http://"
  );
  fixed = fixed.replace(/^https?\/\//i, (match) =>
    match.toLowerCase().startsWith("https") ? "https://" : "http://"
  );

  if (!/^https?:\/\//i.test(fixed)) {
    return `https://${fixed}`;
  }
  return fixed;
}

export function normalizeUrl(input: string, base?: string): string | null {
  try {
    const raw = base ? new URL(input, base) : new URL(input);
    raw.hash = "";
    const params = raw.searchParams;
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"].forEach(
      (key) => params.delete(key)
    );
    raw.search = params.toString() ? `?${params.toString()}` : "";
    return raw.toString();
  } catch {
    return null;
  }
}

export function enforceSameDomain(url: string, domain: string, allowSubdomains: boolean): boolean {
  const target = new URL(url);
  const base = new URL(domain);
  if (allowSubdomains) {
    return target.hostname === base.hostname || target.hostname.endsWith(`.${base.hostname}`);
  }
  return target.hostname === base.hostname;
}

export function validateSafeUrl(input: string, domain: string, allowSubdomains: boolean): string {
  const normalized = normalizeUrl(input);
  if (!normalized || !urlSchema.safeParse(normalized).success) {
    throw new Error("Invalid URL");
  }
  const parsed = new URL(normalized);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error("Only http/https allowed");
  }
  if (isPrivateHost(parsed.hostname)) {
    throw new Error("Private or local host blocked");
  }
  if (!enforceSameDomain(normalized, domain, allowSubdomains)) {
    throw new Error("URL outside allowed domain");
  }
  return normalized;
}
