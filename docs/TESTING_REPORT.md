# Testing Report

_Run date: 2026-11-17 · Environment: production build (`next build && next start`), PostgreSQL 16, Chromium (Playwright 1.63) · Suite: `npm run test:e2e`_

## Result: **82 / 82 passing** (two consecutive full runs, 0 flaky)

| Area | Tests | What is verified |
|---|---|---|
| Route rendering | 42 | Visit + EDO key routes return 200, exactly one `h1`, `main` landmark, no uncaught JS errors |
| Legacy URL preservation | 1 (60 URLs) | Evenly-spaced sample across all 1,191 live legacy URLs returns 200 with **no redirect** |
| Redirects & 404 | 2 | Legacy 404 → 301 to /blog/; old chandleraz.gov EDO paths → 301; branded 404 |
| SEO | 1 | Title, canonical, Restaurant/LocalBusiness + BreadcrumbList JSON-LD, sitemap (>1,100 URLs), EDO sitemap excludes fixtures, robots |
| Directory | 2 | Keyword filter narrows results; map view + accessible list view; pet-friendly preset amenity filter |
| Events | 1 | Month calendar grid & navigation; ICS export |
| Search | 1 | Grouped results |
| Weather | 1 | Live NWS current/7-day/sources and chart table alternative (or honest unavailable state) |
| Forms | 2 | Inline validation + focus to first error; successful stored submission; newsletter consent enforcement |
| Trip planner | 1 | Save from listing → add to day → add via search → share → open shared itinerary |
| Concierge | 1 | Every recommendation references a real record; mode labelled |
| EDO | 3 | Every headline figure has a source link; property explorer filter/compare/detail/enquiry; data portal rows all sourced |
| Accessibility (axe-core, WCAG 2.1 A/AA) | 11 pages | **0 serious/critical violations** (map canvas excluded — list alternative provided) |
| Keyboard | 1 | Skip link; mega-menu opens on focus, closes on Escape |
| Mobile (iPhone 13 profile) | 1 | Drawer navigation, routing, **no horizontal scroll** |
| CMS security | 2 | Admin routes & admin APIs require auth; generic login error |
| CMS workflow | 3 | Draft hidden → publish live → version history → restore-as-draft; scheduled publish hidden until time; path change auto-301 |
| RBAC | 1 | Tourism staff: publish routed to approval; denied Users and EDO Properties |
| Moderation | 2 | Public event submission → staff convert → **draft** (not public); partner proposal not public until approved → applied with version snapshot; partner denied CMS content |
| Media | 1 | Alt text required; upload re-encoded (EXIF stripped) |
| Redirect manager | 1 | Self-redirect prevented; saved redirect works |
| Audit | 1 | Log contains login, content.update, submission.convert, stakeholder.propose, media.upload, redirect.save |

## Defects found by testing and fixed
| # | Defect | Fix |
|---|---|---|
| 1 | Legacy listing/event URLs 404'd (DB ids ≠ Simpleview record ids) | Legacy record ids preserved as primary keys |
| 2 | Media-gallery URLs containing `%26` 404'd | Paths stored decoded |
| 3 | `<dl>` structure invalid on detail pages (axe) | Restructured |
| 4 | Accessible names not matching visible labels (gallery, EDO logo) | Fixed |
| 5 | Sky-blue small text 4.4:1 on grey (EDO) / slate-500 on admin grey | AA text token `edo-skytext` 5.8:1; slate-600 7.0:1 |
| 6 | Property filters' accessible names included option text | Explicit label/for |
| 7 | **CMS create failed** when an optional select with a DB default was blank | NOT NULL blanks fall back to column default; errors logged |
| 8 | **Forms lost user input on validation errors** (React 19 auto-reset) | Transition-based submit preserving input |
| 9 | Server Action 1 MB body limit would reject photo uploads | Raised to 16 MB |
| 10 | 1.4 MB placeholder map shipped to browsers | Placeholders resolved server-side (JS −70%) |
| 11 | Directory map markers missing when points passed directly | Map-ready state |

## Performance (production build, local server)
| Page | Desktop LCP | Mobile LCP (4× CPU, ~1.6 Mbps) | CLS | JS (uncompressed) |
|---|---|---|---|---|
| Home | 0.28 s | 1.04 s | 0 | 686 KB |
| Hotels directory | 0.47 s | 1.03 s | 0 | 564 KB |
| Listing | 0.27 s | 0.69 s | 0 | 694 KB |
| Events | 0.24 s | 0.79 s | 0 | 564 KB |
| EDO home | 0.25 s | 0.84 s | 0 | 697 KB |
| Property explorer | 0.09 s | 0.68 s | 0 | 680 KB |

Homepage HTML: 51 KB gzipped. Images: AVIF/WebP responsive via next/image with blurred placeholders.

## Manual verification performed
Visual review of homepage (desktop + mobile), directory, listing, weather centre, EDO home, property explorer, CMS dashboard and editor at 1440 px and 390 px; keyboard walkthrough of header/menus, gallery lightbox, calendar and chart; screen-reader semantics spot-checked via accessibility tree snapshots.

## Not covered / environment limitations (honest list)
* **Map tiles** could not load in the test sandbox (tile CDN not reachable from the container); markers, filters and list view are tested. Tiles load in normal browsers.
* **WebKit/Safari** engine not installed in the sandbox; mobile tests ran on Chromium with the iPhone 13 profile. Run on BrowserStack/real devices before launch.
* **Claude AI mode** of the concierge not exercised (no API key in this environment); retrieval mode and grounding contract are tested.
* CRM, newsletter, e-mail and GTM integrations verified only in "not configured" mode (no credentials).
* Screen-reader testing with NVDA/JAWS/VoiceOver on real assistive technology is scheduled for the UAT phase.
* The original site's own screenshots could not be captured (bot protection blocks automated browsers); the audit relies on full HTML capture instead.
