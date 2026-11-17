# Typography System

All fonts are **self-hosted** via `next/font/local` from OFL-licensed @fontsource packages (no Google/Typekit requests → faster, private, no third-party cookies). Files: `src/app/fonts/`.

## Visit Chandler
| Role | Family | Size (fluid) | Line-height | Notes |
|---|---|---|---|---|
| Hero display | Instrument Serif 400 | clamp(3.6rem, 11vw, 10.5rem) | 0.86 | One italic word in teal-300/blue |
| H1 page | Instrument Serif | clamp(3rem, 7.5vw, 7rem) | 0.9 | |
| H2 section | Instrument Serif | clamp(2.6rem, 5.5vw, 4.75rem) | 0.95 | italic accent span in blue-500 |
| H3 card | Hanken Grotesk 700 | 1.125–1.25rem | 1.3 | |
| Eyebrow | Hanken Grotesk 600 | 0.75rem, tracking 0.22em, uppercase | — | teal-700 on light, teal-300 on dark |
| Body | Hanken Grotesk 400 | 1.0625rem | 1.75 | ink-soft #4A5A74 |
| Small/meta | Hanken Grotesk | 0.8125–0.875rem | 1.5 | |

## Economic Development
| Role | Family | Size | Notes |
|---|---|---|---|
| Display | Sora 700, tracking −0.03em | clamp(2.4rem, 7vw, 6.25rem) | |
| Section | Sora 700 | 2.25–3rem | |
| Body | IBM Plex Sans 400/500/600 | 1.0625rem / 1.7 | |
| Figures & eyebrows | IBM Plex Mono 400/500 | 0.6875–0.75rem, uppercase, tracking 0.2em | Sources, labels, table heads |

## Rules
- Maximum line length ~70ch for prose (`max-w-2xl`/`760px` article column).
- Never set display serif below 1.5rem.
- Headings are semantic (`h1` once per page, ordered levels); visual size is independent of level.
