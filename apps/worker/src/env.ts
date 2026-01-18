export const env = {
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  databaseUrl: process.env.DATABASE_URL || "",
  resendApiKey: process.env.RESEND_API_KEY || "",
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  googleClientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || "",
  googlePrivateKey: (process.env.GOOGLE_SHEETS_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  googleProjectId: process.env.GOOGLE_SHEETS_PROJECT_ID || "",
  defaultFullScanLimit: Number(process.env.DEFAULT_FULL_SCAN_LIMIT || 500),
};
