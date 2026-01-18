import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export type SitemapEntry = {
  loc: string;
  lastmod?: string;
};

export type SitemapParseResult = {
  urls: SitemapEntry[];
  sitemapIndexes: string[];
};

export function parseSitemapXml(xml: string): SitemapParseResult {
  const data = parser.parse(xml);
  const urls: SitemapEntry[] = [];
  const sitemapIndexes: string[] = [];

  if (data.urlset?.url) {
    const entries = Array.isArray(data.urlset.url) ? data.urlset.url : [data.urlset.url];
    for (const entry of entries) {
      if (entry?.loc) {
        urls.push({ loc: entry.loc, lastmod: entry.lastmod });
      }
    }
  }

  if (data.sitemapindex?.sitemap) {
    const entries = Array.isArray(data.sitemapindex.sitemap)
      ? data.sitemapindex.sitemap
      : [data.sitemapindex.sitemap];
    for (const entry of entries) {
      if (entry?.loc) {
        sitemapIndexes.push(entry.loc);
      }
    }
  }

  return { urls, sitemapIndexes };
}
