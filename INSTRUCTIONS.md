# GMC Compliance Scanner - Operator Guide

This file explains how the app works, which systems are used, and how to operate it.

## 1) What the app does
GMC Compliance Scanner crawls an e-commerce domain, discovers product and policy pages, runs compliance checks, and exports results to Google Sheets. Each URL becomes a row with pass/fail/warn and details.

## 2) System components
- Web app (Next.js): landing page, lead magnet flow, dashboard, APIs.
- Worker (Node + BullMQ): crawling, parsing, rules engine, Sheets export.
- Database (Postgres + Prisma): users, leads, scans, pages, issues, custom rules.
- Queue (Redis/BullMQ): async scans with progress updates.
- Crawling (Playwright + fetch): dynamic rendering + fallback HTTP.
- Parsing (Cheerio + JSON-LD): product data extraction.
- Email (Resend): scan completion links.
- Sheets API (Google): export per scan and share with email.

## 3) High-level flow
1) User submits domain + email on landing page.
2) API creates Lead + Scan (status QUEUED) and enqueues a job.
3) Worker runs crawler, extracts data, applies rules, writes ScanPages + ScanIssues.
4) Worker exports results to Google Sheets and updates scan status to DONE.
5) UI polls status and renders score + top issues.

## 4) Running locally
1) Copy `.env.example` to `.env` and set credentials.
2) Start Postgres + Redis.
3) Run migrations and generate Prisma client.
4) Start the web app + worker.

```bash
cp .env.example .env
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
pnpm dev:worker
```

## 5) Demo mode (presentation)
Demo mode creates an instant, pre-filled scan (no crawling).

- Enable demo mode: set `NEXT_PUBLIC_DEMO_MODE=true`.
- Landing page shows “Run Demo Scan (Instant)”.

This creates a scan with:
- Example score + issues
- Sample pages
- HTML summary

## 6) Custom rule additions (manual knowledge)
Sometimes Google policy edge cases are not documented. You can add custom rules that flag pages by keyword or regex.

### Create a custom rule
Authenticated request to `/api/custom-rules`:

```bash
curl -X POST http://localhost:3000/api/custom-rules \
  -H 'Content-Type: application/json' \
  -H 'Cookie: <your_auth_cookie>' \
  -d '{
    "name": "Supplier badge",
    "pattern": "fulfilled by",
    "patternType": "KEYWORD",
    "appliesTo": "PRODUCT",
    "severity": "REVIEW",
    "message": "Supplier fulfilment badge detected; review for GMC risk."
  }'
```

### List custom rules
```bash
curl http://localhost:3000/api/custom-rules \
  -H 'Cookie: <your_auth_cookie>'
```

Rules are applied to page text + URL + title. Each match creates a `CUSTOM_<ruleId>` issue.

### Import/export rules
- Export JSON: open `/api/custom-rules?format=json` (authenticated).
- Export CSV: open `/api/custom-rules?format=csv` (authenticated).
- Import JSON/CSV: use the Custom Rules page in the dashboard and upload a file.

## 7) Data outputs
- Google Sheet contains a row per URL and a Summary tab with score + issue counts.
- HTML summary is available at `/api/scan/{scanId}/summary`.

## 8) Common operator checks
- If a scan finishes too fast: confirm Redis + worker are running.
- If Sheets export fails: verify Google service account + sharing permissions.
- If Playwright fails: run `pnpm -C apps/worker exec playwright install`.

## 9) Key configuration
- `DATABASE_URL`: Postgres connection string.
- `REDIS_URL`: BullMQ queue backend.
- `GOOGLE_SHEETS_CLIENT_EMAIL` + `GOOGLE_SHEETS_PRIVATE_KEY`.
- `RESEND_API_KEY`: email delivery.
- `NEXT_PUBLIC_DEMO_MODE`: enable demo scan button.
