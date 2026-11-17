# API & Integrations

All integrations follow one pattern: **inactive until configured**, health recorded in the `integrations` table (visible on the CMS dashboard and Settings), retries with exponential backoff for transient failures (429/5xx/network), timeouts on every call, failures logged and surfaced to staff but **never shown to visitors as broken features**. No credentials are stored in the repository or database.

## Existing City providers identified during the audit

| Provider | Evidence | Recommendation |
|---|---|---|
| **Simpleview** (CMS + CRM + DTN listings, events, coupons) | `assets.simpleviewinc.com`, `crmtracking`, `/includes/rest_v2/plugins_listings_listings/find/` | Keep Simpleview **CRM** as the partner/listing system of record if the contract continues; nightly import via Simpleview CRM API/export into `listings`/`events` (fields already mapped 1:1 incl. legacy record IDs). Replace Simpleview **front-end/CMS**. |
| Google Tag Manager / GA4 | `site_gtm` module, GA4 `view_item_list` events | Reuse existing GTM containers (`NEXT_PUBLIC_GTM_ID_*`); consent-gated |
| GTranslate | footer widget | Decide: keep translation service vs curated ES/DE pages (both currently exist) |
| Issuu (visitors guide, EDO guides) | embeds | Keep — embeds allowed by CSP |
| GIS Planning (`chandler.ecdev.org`) | EDO embeds with public key | Keep dashboards (embedded); **property feed** requires licence/API access → adapter below |
| ArcGIS StoryMaps | EDO embeds | Keep |
| Drupal webforms (chandleraz.gov) | Initiate a Project / Let's Talk Business | Replaced by platform forms + CRM webhook |

## Built integrations

| Integration | Module | Status in this build | Production activation |
|---|---|---|---|
| **National Weather Service** — forecast, hourly, latest observation (KCHD), active alerts | `src/lib/weather.ts` | **Live** (no key). 10-min DB cache, stale fallback up to 6 h, honest "unavailable" state | Set `NWS_USER_AGENT` with a City contact (NWS policy) |
| Sunrise/sunset | NOAA solar algorithm (`sunTimes`) | Live (computed) | — |
| UV index — Open-Meteo | `fetchUv()` | Implemented; returns *not reported* when rate-limited | Commercial Open-Meteo licence for production volume, or EPA Envirofacts UV API |
| **Map tiles** | `MapView` / `MiniMap` | CARTO Voyager raster tiles + OSM attribution | Confirm CARTO terms or switch to City ArcGIS basemap / Mapbox via `NEXT_PUBLIC_MAP_TILE_URL` |
| Directions | Google Maps universal URL | Live (no key) | — |
| **CRM** (Simpleview CRM / Salesforce / HubSpot via middleware) | `syncSubmissionToCrm` | Signed JSON webhook (HMAC-SHA256 header `x-signature-sha256`), per-submission sync status, bulk retry in CMS | `CRM_WEBHOOK_URL`, `CRM_WEBHOOK_SECRET` |
| Newsletter | `subscribeNewsletter` | Subscribers stored with consent timestamp; webhook to provider | `NEWSLETTER_WEBHOOK_URL` (Mailchimp/Simpleview/Constant Contact) |
| Staff e-mail notifications | `notifyStaff` | Logged when not configured | `EMAIL_WEBHOOK_URL`, `STAFF_NOTIFY_TO` (SendGrid/SES relay) |
| **Analytics** | `components/shared/Analytics.tsx`, `/api/track` | First-party cookieless events live; GTM after consent | GTM container IDs |
| **AI concierge** | `src/lib/concierge.ts` | Retrieval-only mode live; Claude mode when key present (structured JSON, records referenced by ID, server-side refusal fallback) | `ANTHROPIC_API_KEY` |
| Calendar export | `/api/events/[id]/ics` | Live | — |
| **Property data — GIS Planning / CoStar** | *(adapter spec)* | Demonstration fixtures only (`is_fixture=true`) | Licence + API credentials; nightly job upserting into `properties` by `source_id`, setting `is_fixture=false` |

### Property data adapter specification
Input: GIS Planning ZoomProspector property API (or CoStar export) → map `propertyId→source_id`, `propertyType→type` (office/industrial/retail/commercial/land), `availableSF`, `totalSF`, `acres`, `zoning` (`zoning_verified=false` until Development Services confirms), `lat/lng`, `brokerContact`, `photos[]` (download to media with `permission='approved'` only if licence allows), `brochureUrl→documents`. Upsert by `source_id`; records missing from the feed → `availability='off_market'`, `status='archived'`. Delete all fixtures (`is_fixture=true`) at go-live.

## Public API endpoints (this platform)

| Method & path | Purpose | Protection |
|---|---|---|
| `POST /api/forms/[form]` | All public forms | Origin check, zod validation, honeypot, min fill time, rate limit |
| `POST /api/newsletter` | Subscribe | Consent required, rate limit |
| `GET /api/map/points` | Map data (published, geocoded) | Cached 10 min |
| `GET /api/search?q=` / `?type=` / `?ids=` | Typeahead | Published only, rate limit |
| `POST /api/itineraries`, `GET/PUT /api/itineraries/[token]` | Trip planner share | Edit requires private token (hashed, timing-safe compare) |
| `POST /api/concierge` | Concierge | Rate limit (12/10 min), length limits |
| `POST /api/track` | First-party analytics beacon | Allow-listed event names, rate limit |
| `GET /api/events/[id]/ics` | Calendar file | Published only |
| `GET /api/admin/media`, `/api/admin/redirects.csv` | CMS helpers | Session + permission |
| `GET /sitemap.xml`, `/edo-sitemap.xml`, `/robots.txt` | SEO | Fixtures & noindex pages excluded; robots blocks all unless `ALLOW_INDEXING=true` |
