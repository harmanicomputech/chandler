# Architecture

## Overview

```
                ┌──────────────── CDN / edge (TLS, caching, image cache) ────────────────┐
 www.visitchandler.com ─┐                                                                │
 business.chandleraz.gov┼─► Next.js 16 app (Node 22) ── src/proxy.ts host routing ───────┤
 /admin (both hosts) ───┘     │  React Server Components, ISR, Route Handlers, Server Actions
                              │
                              ├─► PostgreSQL 16 (Drizzle ORM) — content, users, submissions, analytics, cache
                              ├─► Object storage (production) / public/uploads (dev) — media
                              └─► Integrations: NWS · Open-Meteo (UV) · map tiles · CRM webhook · newsletter · e-mail relay · Anthropic (concierge) · GTM/GA4 · GIS Planning (property feed, pending licence)
```

## Technology choices (and why)

| Concern | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 16 App Router, React 19, TypeScript (strict)** | SSR/ISR for SEO & Core Web Vitals, Server Actions for the CMS, one codebase for two sites |
| Styling | **Tailwind CSS v4** with tokens in `@theme` | Design tokens as code; tiny CSS output |
| Database / ORM | **PostgreSQL 16 + Drizzle ORM** (+ drizzle-kit migrations) | Relational integrity, JSONB for flexible blocks, pure-JS driver (no binary engines), typed queries |
| CMS | **Purpose-built shared headless CMS inside the app** | See evaluation below |
| Auth | Own session auth: bcrypt (cost 12), opaque 256-bit cookie token (only SHA-256 stored), per-session CSRF token, lock-out | No third-party identity dependency; ready to front with City SSO (SAML/OIDC) later |
| Maps | **Leaflet** (canvas renderer) + raster tiles (CARTO Voyager default, configurable) | Free/open, no API key, fast with 1,000+ points; swap to City ArcGIS basemap via env |
| Weather | **National Weather Service API** + NOAA solar algorithm; optional Open-Meteo UV | Official, free, no key, US-government data |
| AI concierge | **Anthropic Claude** (`claude-opus-5-5`, effort low, structured JSON output, server-side refusal fallback) grounded in CMS records | Answers constrained to verified records; graceful retrieval-only mode |
| Fonts | Self-hosted OFL fonts via `next/font/local` | Performance, privacy |
| Testing | Playwright E2E + axe-core accessibility | Real browser verification |

### CMS evaluation

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| Simpleview CMS (current) | Incumbent, CRM-integrated | Proprietary, single-site, theming limits, not shared with EDO | Replace front-end; **keep Simpleview CRM as a data source via export/API if contract continues** |
| Drupal (chandleraz.gov) | City already runs it | Different stack for tourism; heavy theming; EDO content lives in City-wide instance | Keep for City services; EDO content migrated out |
| Payload / Strapi / Sanity | Mature headless | Extra service to host/secure (or SaaS licence), second data model to sync with directory/property apps | Viable alternative; adds operational surface |
| **Built-in shared CMS (chosen)** | One database for content + apps (listings, properties, submissions, itineraries), RBAC per site, no licence fees, simple ops | Agency maintains editor UX | **Chosen** — lowest TCO for a two-site municipal deployment; registry-driven so new types are declarative |

## Request flow & rendering

* Public pages are **server components** reading the DB through `src/lib/content.ts` / `edo-content.ts`; content-only routes use ISR (`revalidate`) and every CMS write calls `revalidatePath` so edits appear immediately.
* Only interactive islands ship JS (header, map, planner, forms, charts, gallery).
* `src/proxy.ts`: requests on `EDO_HOSTS` are rewritten to `/edo/*`; `/admin` gets a cookie presence check (real authorisation in `requireUser()`).
* Legacy URLs are preserved (trailing slashes, `/listing/<slug>/<id>/`, `/event/<slug>/<id>/`, `/blog/post/<slug>/`); unknown paths consult the redirect register before 404.

## Security

| Control | Implementation |
|---|---|
| Authentication | bcrypt-12, session table with hashed tokens, 8 h expiry, HttpOnly/SameSite=Lax/Secure cookies, 5-attempt lock-out (15 min), login rate-limit |
| Authorisation | Permission matrix per role + per-site scoping (`can()`), enforced in every server action and admin route |
| CSRF | Per-session token in every admin form + Origin check; public JSON endpoints check Origin |
| Input validation | zod schemas (forms, APIs), registry coercion (CMS), allow-list HTML sanitiser for rich text, iframe host allow-list |
| Output encoding | React escaping; JSON-LD `<` escaped; sanitised HTML only |
| Rate limiting | Postgres fixed-window limiter (forms 8/10 min, login 10/10 min, concierge 12/10 min, search/track) |
| Headers | CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Secrets | Environment variables only; never in client bundles (only `NEXT_PUBLIC_*` IDs); admin shows presence, never values |
| Uploads | MIME + size checks, re-encoded through sharp (strips EXIF/GPS), random file names |
| Audit | `audit_logs` for auth, content, media, nav, redirects, users, settings, moderation |
| Bots | Honeypot + minimum fill-time on forms |

## Performance

ISR + CDN caching; `next/image` AVIF/WebP responsive variants with blurred placeholders; self-hosted fonts with `display: swap`; Leaflet loaded dynamically only where maps appear; canvas markers; DB indexes on type/status/geo/dates; weather cached 10 min in Postgres with stale fallback; map points endpoint `s-maxage=600`.

## Data model

See `DATABASE_SCHEMA.md`.
