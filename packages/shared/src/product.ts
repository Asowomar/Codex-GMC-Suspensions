import { ProductData } from "./types";

export function extractProductFromJsonLd(product: Record<string, unknown>): ProductData {
  const offers = product.offers as any;
  const firstOffer = Array.isArray(offers) ? offers[0] : offers;
  const images = product.image
    ? Array.isArray(product.image)
      ? product.image
      : [product.image]
    : [];

  return {
    name: typeof product.name === "string" ? product.name : undefined,
    price: firstOffer?.price ? String(firstOffer.price) : undefined,
    priceCurrency: firstOffer?.priceCurrency ? String(firstOffer.priceCurrency) : undefined,
    availability: firstOffer?.availability ? String(firstOffer.availability) : undefined,
    sku: typeof product.sku === "string" ? product.sku : undefined,
    brand: typeof product.brand === "string" ? product.brand : product.brand?.name,
    gtin: product.gtin || product.gtin13 || product.gtin14 || product.gtin8,
    mpn: product.mpn,
    images: images.filter(Boolean).map(String),
  };
}

export function fallbackExtractProduct(html: string): ProductData {
  const priceMatch = html.match(/(\$|€|£)\s?\d+[\.,]?\d*/);
  const currencyMatch = html.match(/\b(USD|EUR|GBP|CAD|AUD|CHF|SEK|NOK|DKK)\b/i);
  const availabilityMatch = html.match(/\b(in stock|out of stock|preorder|backorder)\b/i);
  const imageMatches = Array.from(html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)).map(
    (m) => m[1]
  );

  return {
    price: priceMatch ? priceMatch[0].replace(/\s/g, "") : undefined,
    priceCurrency: currencyMatch ? currencyMatch[0].toUpperCase() : undefined,
    availability: availabilityMatch ? availabilityMatch[0].toLowerCase() : undefined,
    images: imageMatches.slice(0, 5),
  };
}
