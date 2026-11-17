# Component Library

| Component | File | Notes |
|---|---|---|
| SiteHeader (Visit) | `components/visit/SiteHeader.tsx` | Transparent→glass on scroll, hide on scroll-down, mega-menu (hover/focus, Esc), utility bar, saved-count badge, mobile drawer (dialog) |
| SiteFooter (Visit) | `components/visit/SiteFooter.tsx` | Newsletter, guide CTAs, CMS-driven columns, social, partners, legal |
| EdoHeader / EdoFooter | `components/edo/*` | City attribution bar, mega-menus, drawer |
| PageHero + Breadcrumbs | `components/visit/PageHero.tsx` | Image or typographic hero; BreadcrumbList JSON-LD |
| EdoHero | `components/edo/EdoHero.tsx` | Grid background, split image |
| SectionHeading | `components/visit/Cards.tsx` | Eyebrow + display title + intro + CTA |
| ListingCardView / EventCardView (card & row) / StoryCard | `components/visit/Cards.tsx` | Save button, hover zoom, accessible full-card links |
| SaveButton | `components/visit/SaveButton.tsx` | aria-pressed toggle, localStorage, cross-component sync event |
| Img | `components/shared/Img.tsx` | next/image + blurred placeholder map |
| HeroSlides / HeroDiscover | `components/visit/*` | Pausable cross-fade; tabbed category search |
| Directory | `components/visit/Directory.tsx` | GET-form filters (no-JS), grid/map, pagination |
| MapView | `components/shared/MapView.tsx` | Leaflet canvas markers, filters, map/list, detail card, directions |
| MiniMap | `components/visit/MiniMap.tsx` | Static detail map |
| Gallery | `components/visit/Gallery.tsx` | Mosaic + accessible lightbox |
| EventsBrowser / EventsCalendar | `components/visit/*` | Filters, list/month, pagination |
| WeatherBadge / WeatherCard / WeatherCentre / HourlyChart | `components/visit/*` | Live NWS data, chart with table alternative |
| TripPlanner | `components/visit/TripPlanner.tsx` | Itinerary builder, share/print |
| Concierge | `components/visit/Concierge.tsx` | AI vs verified separation |
| Blocks | `components/visit/Blocks.tsx` | Migrated tiles, embeds, galleries, forms |
| SmartForm | `components/shared/SmartForm.tsx` | Spec-driven, inline errors, honeypot, live region; Visit & EDO themes |
| NewsletterForm / NewsletterEdo | | Consent required |
| Stat / BarChart / DistrictMap / PropertyExplorer | `components/edo/*` | Sourced figures; accessible charts; compare tray |
| Admin UI kit | `components/admin/ui.tsx` | PageHeader, Card, Badge, Btn |
| ContentForm / RichText / MediaPicker | `components/admin/*` | Registry-driven editor |
| RevealController / Analytics / track | `components/shared/*` | Motion orchestration; consent-gated GTM; first-party beacon |
