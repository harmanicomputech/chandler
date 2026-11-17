# Spacing & Layout System

Base unit **4 px** (Tailwind scale). Container **1440 px** max, side gutter **20 px mobile / 32 px ≥ 640 px**.

| Token | Value | Use |
|---|---|---|
| Section padding (Visit) | 96 px mobile → 128 px desktop (`py-24 sm:py-32`) | Major homepage bands |
| Section padding (EDO) | 80–96 px | Denser, data-led |
| Heading → content | 56 px (`mt-14`) | After `SectionHeading` |
| Card gap | 24 px; 48 px row-gap for image cards | Grids |
| Card radius | 20 px (Visit) · 0 px (EDO) | |
| Input height | 48–52 px | Touch friendly |
| Sticky offsets | header 76 px (Visit) / 72 px (EDO) | `scroll-padding-top: 6rem` |

## Breakpoints & intent
| Breakpoint | Layout intent |
|---|---|
| < 640 | Single column; horizontal snap scrollers for card rows; drawer navigation; map ≥ 420 px tall with list toggle |
| 640–1023 | Two-column grids; filters wrap |
| 1024–1279 | 12-column editorial grid; sidebars appear; mega-menus (EDO from 1280) |
| ≥ 1280 / 1440 | Four-column cards; full mega-menus; asymmetric bento layouts |

Mobile is designed, not shrunk: hero search becomes a tabbed full-width panel, gallery collapses to a single lead image + "n photos" lightbox, property compare becomes a sticky bottom bar, admin tables scroll horizontally inside cards.
