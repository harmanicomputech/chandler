# Database Schema

PostgreSQL 16 · Drizzle ORM · source `src/db/schema.ts` · migrations `drizzle/*.sql` (`npm run db:migrate`).

## Conventions
* Every publishable table has `status` (`draft | in_review | published | archived`), `publish_at`, `expire_at`, `source_url`, `source_id` (legacy provenance) — "live" = published within its window.
* SEO fields (`seo_title`, `seo_description`, `canonical_url`, `og_image`, `noindex`) on public content.
* `site` enum (`visit | edo`) separates the two websites where content is site-specific; media, users, redirects and audit are shared but site-aware.

## Tables (25)

| Group | Table | Key columns / relations | Indexes & constraints |
|---|---|---|---|
| Identity | `users` | email, password_hash, role, sites[], organisation, failed_logins, locked_until | unique(email) |
| | `sessions` | id = sha256(token), user_id → users, csrf_token, expires_at | idx(user_id) |
| Media | `media` | url, source_url, alt, credit, width/height, folder, **permission** (pending/approved/restricted), uploaded_by | unique(url), idx(folder) |
| Pages | `pages` | site, path, template, section, body_html, hero_media_id → media, blocks (jsonb) | unique(site, path), idx(site, section) |
| | `content_versions` | entity, entity_id, version, data (jsonb snapshot), note, created_by | unique(entity, entity_id, version) |
| | `nav_items` | site, menu, parent_id, label, href, sort, visible | idx(site, menu) |
| Tourism | `listings` | type enum, category/subcategory, region, address, lat/lng, contact, amenities[], tags[], primary_media_id, owner_user_id (stakeholder) | unique(source_id), idx(type,status), idx(lat,lng) |
| | `listing_media` | listing_id, media_id, sort | PK(listing_id, media_id), cascade |
| | `events` | site, dates, times_text, recurrence_text, location, lat/lng, categories[], admission, host | unique(site, source_id), idx(start_date, end_date) |
| | `articles` | site, slug, body_html, author, categories, published_on, hero_media_id | unique(site, slug) |
| EDO | `districts`, `industries` | slug, summary, hero, coordinates / employers | unique(slug) |
| | `properties` | type enum, district_id → districts, available/total sqft, acreage, zoning (+verified flag), availability, documents (jsonb), contact, **is_fixture** | unique(slug), idx(type, status) |
| | `reports` | title, file_url, category, published_on | |
| | `economic_indicators` | key, label, value, numeric_value, unit, category, **source_name, source_url (NOT NULL)**, as_of, captured_at | unique(key) |
| | `staff_profiles` | name, title, phone, email, focus, sort | |
| Workflow | `submissions` | site, type enum (12 kinds), status enum, payload (jsonb), entity/entity_id, submitted_by, assigned_to, notes (jsonb), crm_sync_status | idx(site, type, status) |
| | `newsletter_subscribers` | site, email, interests, consent_at, sync_status, unsubscribed_at | unique(site, email) |
| Visitor | `itineraries` | share_token (public), edit_token (sha256), dates, interests, days (jsonb) | unique(share_token) |
| | `collections` | share_token, title, items (jsonb `{kind,id}`) — shared saved-places lists | unique(share_token) |
| Platform | `redirects` | site, from_path, to_path, status_code, hits | unique(site, from_path) |
| | `audit_logs` | user_id, action, entity, entity_id, site, detail, ip | idx(created_at), idx(entity, entity_id) |
| | `analytics_events` | site, name, path, entity, entity_id, props | idx(site, name, created_at) |
| | `integrations` | key, enabled, config (non-secret), last_status, last_error | PK(key) |
| | `settings` | site, key, value (jsonb) | PK(site, key) |
| | `rate_limits` | key, count, window_start | PK(key) |
| | `api_cache` | key, value, fetched_at, expires_at | PK(key) |

## Migration data volumes (seeded from the audit)
listings 783 · events 27 (Visit) + 7 (EDO) · articles 166 (Visit) + 10 (EDO) · pages 215 (Visit) + 37 (EDO) · media ≈ 3,000 · indicators 41 · staff 8 · reports 19 · districts 4 · industries 6 · redirects 48 · properties 10 (fixtures).
