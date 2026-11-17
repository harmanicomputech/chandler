# Chandler Digital Ecosystem — Project Overview

**Client:** City of Chandler, Arizona · **Agency:** Techatron Consulting Limited · **Budget reference:** up to US$100,000 · **Target launch:** late fall 2027

## What this repository contains

One codebase and one PostgreSQL database serving three applications:

| Application | Audience | Local URL | Production host (proposed) |
|---|---|---|---|
| **Visit Chandler** — destination marketing & trip planning | Visitors, meeting planners, media, partners | `http://localhost:3000/` | `www.visitchandler.com` (URLs preserved 1:1) |
| **Chandler Economic Development** — investment attraction & site selection | Site selectors, brokers, investors, businesses | `http://localhost:3000/edo/` | e.g. `business.chandleraz.gov` (host-routed via `EDO_HOSTS`) |
| **Shared CMS & administration** | City tourism + ED staff, editors, approved partners | `http://localhost:3000/admin/` | same deployment, `/admin` |

## Guiding principles (as agreed with the client)

1. **The existing sites are the reference — nothing invented.** All 1,193 sitemap URLs were crawled (robots Crawl-delay honoured) and 1,191 are migrated with provenance (`source_url`, `source_id`) on every row; the 2 URLs that 404 on the live site are documented. Copy, listings, events, articles, staff, statistics and imagery come from the City's own sites. Where the City publishes no data (available properties), the system ships with **clearly-labelled demonstration fixtures** and an integration spec — never presented as real.
2. **A backend as strong as the frontend.** Editorial workflow (draft → review → published → archived, scheduling, expiry), version history with restore, RBAC per site, moderated stakeholder portal, submission management with CRM hand-off, redirect register, media library with rights tracking, audit log, first-party analytics.
3. **Homepage as the visual benchmark;** both sites inherit its discipline but have deliberately distinct identities (Visit: photographic/editorial, logo blue + teal; EDO: data-led/corporate, City petrol navy + sky + gold).

## Feature map

**Visit Chandler:** homepage · CMS-driven pages for every legacy URL (standard, directory, form, offer, media gallery, sitemap templates) · 783 listings with galleries, amenities, maps, nearby · 27 events with calendar month view, filters, .ics export, sharing · 166 blog articles · live NWS weather centre (current, hourly chart, 7-day, alerts, UV, sunrise/sunset, weather-aware suggestions) · filterable directories with map/list · full interactive map with accessible list alternative · trip planner (no account; dates, interests, day-by-day ordering, drag-and-drop, notes, map, share link, print/PDF) · saved collections · AI concierge grounded in official records (with labelled retrieval fallback) · search · newsletter · 7 public forms.

**Economic Development:** homepage with verified indicators & charts · 47 migrated pages (why Chandler, business services, incentives, districts, industries, workforce, data & maps, news) · property explorer (filters, synced map/list, shortlist & side-by-side compare, detail + enquiry) · economic data portal (every figure sourced & dated) · reports library (19 City PDFs) · staff directory · investor/site-selection/"Let's Talk Business" enquiry workflows · news.

**Shared CMS:** dashboard · 9 content types from one registry · rich-text editor · media library (upload with EXIF stripping, alt-text enforcement, rights status) · navigation editor · redirects (+ auto-redirect when a page moves, CSV export) · submissions moderation (convert to draft event/listing, apply stakeholder updates) · users & roles · settings & integration status · audit log · analytics · partner portal.

## Repository layout

```
src/app/(visit)/        Visit Chandler routes (legacy URL shapes preserved)
src/app/edo/            Economic Development routes (host-rewritten in src/proxy.ts)
src/app/admin/          CMS (login + (app) route group)
src/app/api/            Forms, newsletter, map points, search, itineraries, concierge, tracking, ICS
src/lib/                auth/RBAC, content queries, weather, forms, integrations, concierge, sanitiser, rate limiting
src/db/                 Drizzle schema (25 tables) — migrations in /drizzle
scripts/                migrate, seed (content migration), tools
audit/                  crawler, parsers, image migration, doc generators + extracted data (raw HTML not committed)
docs/                   all project documentation, inventories, manifests, maps
tests/                  Playwright end-to-end + accessibility tests
public/brand, public/images   official logos; migrated photography (by section)
```

See `DEVELOPMENT_TRACKER.md` for stage-by-stage status and open dependencies.
