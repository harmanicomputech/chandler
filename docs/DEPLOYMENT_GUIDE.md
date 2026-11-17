# Deployment Guide

> Do not deploy to City infrastructure without City authorisation, DNS ownership and credentials.

## Requirements
Node.js 22 LTS · PostgreSQL 16 (managed, with PITR) · object storage + CDN for uploads · TLS on both hosts.

Recommended topology (e.g. Azure / AWS GovCloud-equivalent or Vercel + managed Postgres): 2+ app instances behind a CDN/WAF, managed Postgres (HA, daily snapshots + point-in-time recovery 7–35 days), object storage for `/uploads`, secrets in the platform secret manager.

## First deployment
```bash
npm ci
cp .env.example .env            # fill values (see table in .env.example) — store secrets in the secret manager
npm run db:migrate              # applies drizzle/*.sql
npm run db:seed                 # migrates audited content (requires audit/data/*.json and public/images)
npm run build
npm start                       # or the platform's Node runtime
```
Then: rotate the seeded demo accounts (create real staff users, disable `*@chandler.example`), delete property fixtures (`delete from properties where is_fixture`), set `ALLOW_INDEXING=true` on production only.

## Hosts & routing
* `www.visitchandler.com` → app (Visit Chandler at root; all legacy URLs preserved).
* `business.chandleraz.gov` (proposed) → same app; set `EDO_HOSTS` and `NEXT_PUBLIC_EDO_BASE_PATH=` (empty). `src/proxy.ts` rewrites to `/edo/*`.
* chandleraz.gov must add 301s from `/business/economic-development/*` to the new host — the full list is `docs/REDIRECT_MAP.csv`.
* At DNS cut-over, keep the old Simpleview site reachable on a temporary host for 30 days for rollback.

## Uploads
`public/uploads` is for development. In production mount object storage (S3/Azure Blob) at `/uploads` behind the CDN, or change `uploadMedia` to write to the bucket (one function).

## Monitoring & operations
* Health: `GET /` and `GET /api/map/points` (DB-backed) for uptime checks.
* Logs: structured stdout (`[weather]`, `[crm]`, `[cms]`, `[concierge]` prefixes) → platform log analytics; alert on `[crm] sync failed` and weather errors.
* Integration health is visible in CMS → Settings / Dashboard.
* Recommended: Sentry (errors), uptime monitor per host, Postgres slow-query alerts.

## Backups & recovery
* Postgres PITR + nightly logical dump (`pg_dump -Fc`) retained 35 days, quarterly restore drill.
* Object storage versioning on `/uploads`.
* Content version history allows editor-level rollback without DB restores.

## CI/CD (recommended pipeline)
1. `npm ci` → `npx tsc --noEmit` → `npm run build`
2. Spin up Postgres service → `npm run db:migrate && npm run db:seed` → `npm start` (port 3001) → `npx playwright test --trace off`
3. Deploy to staging (indexing disabled) → UAT → promote to production.

## Sandbox note
In this development container outbound requests go through a proxy that Node only honours with `NODE_USE_ENV_PROXY=1`; that flag is not needed on normal hosting.
