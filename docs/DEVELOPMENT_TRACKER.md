# Development Tracker

_Last updated: 2026-11-18_

| Stage | Status | Notes |
|---|---|---|
| 1 · Discovery & audit | ✅ Done | 1,193 Visit Chandler URLs crawled (robots Crawl-delay honoured), 121 chandleraz.gov business/EDO URLs; inventories, image manifest (5,054 rows), permissions, SEO map, redirect map generated from data + DB |
| 2 · Architecture | ✅ Done | Next.js 16 / React 19 / TS / Tailwind 4 / Postgres 16 / Drizzle; host routing; CMS evaluation (ARCHITECTURE.md) |
| 3 · Design system | ✅ Done | Tokens, two identities, typography, spacing, component library, motion |
| 4 · Visit Chandler | ✅ Done | Homepage benchmark; CMS templates for every legacy URL; listings/events/articles; directories; map; weather centre; trip planner; collections; concierge; search; forms |
| 5 · Economic Development | ✅ Done (property data = fixtures) | 47 migrated pages, industries, districts, staff, reports, verified indicators & charts, property explorer/compare/enquiry, data portal |
| 6 · CMS & administration | ✅ Done | Registry-driven editor, workflow, scheduling, versions, RBAC, media, navigation, redirects, submissions moderation, partner portal, users, settings, audit, analytics |
| 7 · Integrations | 🟡 Built, awaiting credentials | NWS live; CRM/newsletter/e-mail/GTM/Anthropic/GIS Planning adapters inactive until configured |
| 8 · Migration | ✅ Done (rights pending) | All content + 2,418 migrated images; redirects; metadata preserved |
| 9 · Testing | ✅ 87/87 E2E + axe passing (also on a clean-room CI replay) | See TESTING_REPORT.md for limitations |
| 10 · Deployment preparation | ✅ Documented | DEPLOYMENT_GUIDE.md, .env.example; not deployed (no City authorisation) |

## Gap-closing iteration (2026-11-18) — all done
| Gap | Result |
|---|---|
| Shareable saved collections | `/saved/` page; *Share this list* creates a read-only link (`/collections/<token>/`); recipients can copy it into their own list; API validates records are published |
| Visual review of secondary templates | 52 captures reviewed (desktop + phone); 11 visual/content defects fixed (see TESTING_REPORT §Defects 12–22) |
| Economic Development events | `/edo/events/` (upcoming, ongoing, past) + detail pages with Event JSON-LD; 7 events taken verbatim from City pages; homepage strip; nav; sitemap; CMS-managed |
| CI/CD | `.github/workflows/ci.yml` (Postgres service, type-check, migrate, seed, build, Playwright, `npm audit`); verified by a local clean-room replay |
| Image manifest | Parsing bug fixed; 3,376 unique rows with status for every image |
| Analytics dashboards | KPI tiles with period-over-period change, daily trend charts per site, top listings/properties/pages, submissions by type, CSV export — recorded events only |

## Open dependencies on the City (blocking go-live, not blocking demo)
1. **Image reuse rights** — confirm 2,418 migrated photos (IMAGE_PERMISSIONS.csv); supply alternatives for 6 files marked *do not share*; supply high-resolution originals where only web sizes exist.
2. **Property data licence** — GIS Planning / CoStar API access to replace demonstration fixtures.
3. **Simpleview CRM export** — listing ↔ all categories (secondary categories drive some directories, e.g. outdoor dining, group dining); ongoing listing/event sync decision.
4. **Integration credentials** — CRM webhook, newsletter provider, e-mail relay, GTM container IDs, Anthropic API key, NWS contact address.
5. **Hosts & DNS** — confirm EDO domain; chandleraz.gov 301s (REDIRECT_MAP.csv).
6. **Staff accounts / SSO** — real users (or City Entra ID/SAML integration).
7. **Content decisions** — GTranslate vs curated ES/DE pages; one staff phone number truncated on the City's contact page ("480-782-303").
8. **Client-supplied stock** — 16 generic resort/beach images were not used because they do not depict Chandler; 4 neutral hotel-interior images are available as labelled representative imagery.

## Known limitations / next iteration
* Directory membership uses primary category + preset amenity filters (secondary categories need CRM export).
* Real-device Safari/iOS testing and assistive-technology testing in UAT.
* Optional: Lighthouse CI budget in pipeline; image CDN for `/uploads`.
