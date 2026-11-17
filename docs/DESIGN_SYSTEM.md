# Design System

Two sibling identities on one component foundation. Tokens: `BRAND_TOKENS.json` (source) → `src/app/globals.css` `@theme` (Tailwind v4). Related: `TYPOGRAPHY_SYSTEM.md`, `SPACING_SYSTEM.md`, `COMPONENT_LIBRARY.md`.

## 1. Brand analysis (from the live sites)

| Finding | Evidence | Decision |
|---|---|---|
| Logo colours are exactly **#214FA1** (23 fills) and **#00C1A0** (1 fill) | `public/brand/visit-chandler-logo.svg` (official file from visitchandler.com) | Blue = identity; teal = accent only |
| Live site CSS uses a hue-210 primary scale and a hue-29 (orange) secondary scale, system fonts (`--font-display: var(--font-body)`) and a Typekit kit | inline `:root` custom properties on every page | Orange secondary **not** carried forward (brief: no unrelated orange); system fonts replaced by self-hosted editorial pairing |
| Official reversed (white) logo exists | `logo-footer.svg` | Used over photography & in footer — never recoloured |
| City website theme colours: #003C5C (59 uses), #187DAE (34), #FFC25F (14), #11A26F (19), #710036 (24) | `chandleraz.gov/themes/kwall_bootstrap_theme/css/style.css` | EDO palette derived from City theme (burgundy omitted) |
| Brand line "Where City Meets Desert" | Graphic in client-supplied assets; meta description "where city life meets the desert" | Homepage headline |
| City ED tagline "Community of Innovation" | chandleraz.gov ED homepage copy | EDO homepage headline |

**Logo:** the brief refers to a "supplied logo" PNG; no logo file was supplied, so the official SVG was taken from visitchandler.com and rasterised (not redrawn) to `public/brand/visit-chandler-logo.png` at 1733×689.

## 2. Visit Chandler — "editorial desert light"

* **Photography leads.** Full-bleed heroes with Ken Burns cross-fades (pausable — WCAG 2.2.2), parallax bands, image masks that open on scroll, mosaic gateways. White space generous; coloured backgrounds limited to mist (#F5F8FA), navy bands and one teal newsletter band.
* **Typography:** Instrument Serif (display, with italic accents in brand blue/teal for one word per heading) + Hanken Grotesk (UI/body).
* **Shape:** 20 px card radius, pill buttons, soft long shadows on hover.
* **Accent discipline:** teal for CTAs (navy text), focus rings, list bullets, link underlines, icons. Never teal text on white.

## 3. Economic Development — "civic data"

* Dark petrol hero with a 64 px blueprint grid, sharp 0-radius geometry, hairline 1 px dividers (`gap-px` grids), monospaced figures, gold highlight used only on dark backgrounds.
* **Typography:** Sora (display) + IBM Plex Sans (body) + IBM Plex Mono (figures, eyebrows, sources).
* **Data rule:** every figure renders with a source link (`Stat` component); charts follow the dataviz method (single hue, no dual axes, table alternative, hover/focus tooltips).

## 4. Motion

| Effect | Where | Implementation | Reduced motion |
|---|---|---|---|
| Word-by-word headline rise (blur → sharp) | All hero `h1` | CSS `split-words` | Disabled |
| Scroll reveal (fade/translate, staggered) | Section headings, cards | One IntersectionObserver (`RevealController`) | Content shown immediately |
| Image mask opening | Feature images | `clip-path` transition | Disabled |
| Parallax | Spotlight & feature photos | rAF transform on `[data-parallax]` | Disabled |
| Ken Burns hero cross-fade | Homepage, page heroes | CSS keyframes, pause button | Static first image |
| Count-up numbers | Facts, EDO stats | `[data-count]` | Final value |
| Header hide-on-scroll / glass on scroll | Visit header | scroll listener | Instant |
| Scroll progress bar | Visit pages | rAF | — |
| Mega-menu stagger | Desktop nav | CSS animation per item | Disabled |

Nothing animates continuously except the pausable hero. No animation library is shipped (zero JS animation dependencies) — this keeps the JS budget low.

## 5. Accessibility baked into the system

Focus ring 3 px teal (Visit) / gold (EDO) with offset; skip links; all interactive components keyboard-operable (mega-menu opens on focus, Esc closes; lightbox focus + arrows; calendar & charts arrow-key navigation); colour never the sole carrier of meaning; touch targets ≥ 40 px; min body 15–17 px.
