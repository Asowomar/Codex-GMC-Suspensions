export type ScanMode = "QUICK" | "FULL";
export type ScanStatus = "QUEUED" | "RUNNING" | "DONE" | "FAILED";

export type PageType = "PRODUCT" | "POLICY" | "OTHER";

export type IssueSeverity = "HIGH" | "MEDIUM" | "LOW" | "REVIEW";

export type Issue = {
  code: string;
  severity: IssueSeverity;
  message: string;
  evidence?: Record<string, unknown>;
};

export type PageResult = {
  url: string;
  pageType: PageType;
  httpStatus?: number;
  finalUrl?: string;
  canonicalUrl?: string;
  title?: string;
  metaDescription?: string;
  canonicalOk: boolean;
  httpsOk: boolean;
  jsonldProductPresent: boolean;
  priceFound: boolean;
  currencyFound: boolean;
  availabilityFound: boolean;
  imagesOk: boolean;
  suspiciousKeywords: boolean;
  notes?: string;
  errorMessage?: string;
  issuesCodes: string[];
  severitySummary?: IssueSeverity;
  confidence?: number;
  rawData?: Record<string, unknown>;
};

export type DomainSummary = {
  score: number;
  topIssues: Issue[];
  counts: Record<IssueSeverity, number>;
  policyPagesFound: string[];
};

export type ProductData = {
  name?: string;
  price?: string;
  priceCurrency?: string;
  availability?: string;
  sku?: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  images?: string[];
};

export type ScanConfig = {
  domain: string;
  mode: ScanMode;
  maxPages: number;
  allowSubdomains: boolean;
  concurrency: number;
  timeoutMs: number;
};
