# GMC Compliance Scanner

Production-ready SaaS for Google Merchant Center compliance checks on e-commerce domains.

## Monorepo
- `apps/web`: Next.js 14 app (landing + dashboard + API)
- `apps/worker`: BullMQ worker for crawling/scanning
- `packages/shared`: shared types, rules, and crawl utilities

## Local development
1) Create `.env` from `.env.example`.
2) Start Postgres + Redis (Docker example below) or use Supabase/Upstash.
3) Run Prisma migrations.
4) Start web app and worker.

```bash
# from repo root
cp .env.example .env

# optional docker
cat <<'YML' > docker-compose.yml
version: "3.9"
services:
  postgres:
    image: postgres:15
    ports: ["5432:5432"]
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: gmc_scanner
  redis:
    image: redis:7
    ports: ["6379:6379"]
YML

docker compose up -d

pnpm install
pnpm prisma:generate
pnpm prisma:migrate

pnpm dev
pnpm dev:worker
```

## Deploy
- Web/API: Vercel
- Worker: Railway/Fly.io (Node)
- Database: Supabase Postgres
- Queue: Upstash Redis

## Notes
- Google Sheets export uses service account credentials.
- Scan limits are enforced by plan/credits.
