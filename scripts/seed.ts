/**
 * Content migration + seed.
 *
 * Source of truth = the audit captured from the live sites (audit/data/*.json). Every migrated row keeps
 * `sourceUrl`/`sourceId` provenance. Nothing here invents destination content. The only synthetic records
 * are (a) staff/demo user accounts and (b) property records explicitly flagged `isFixture = true`, because
 * the City publishes no public available-property list (it licenses GIS Planning / CoStar data).
 *
 * Idempotent: re-running upserts by provenance keys.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as s from '../src/db/schema';

const ROOT = path.resolve(import.meta.dirname, '..');
const read = <T,>(f: string, fallback?: T): T => { const p = path.join(ROOT, f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : (fallback as T); };
const pool = new Pool({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chandler:chandler_dev@localhost:5432/chandler' });
const db = drizzle(pool, { schema: s });

const VC = 'https://www.visitchandler.com';
const CZ = 'https://www.chandleraz.gov';
const vcPages: any[] = read('audit/data/vc-pages.json', []);
const edPages: any[] = read('audit/data/ed-pages.json', []);
const imageMap: Record<string, any> = read('audit/data/image-map.json', {});
const membership: Record<string, { recids?: number[] }> = read('audit/data/directory-membership.json', {});
const edImageMap: Record<string, any> = read('audit/data/ed-image-map.json', {});
const supplied: any[] = read('audit/data/supplied-images.json', []);

const clean = (t?: string | null) => (t ?? '').replace(/\s+/g, ' ').trim();
const decodeEnt = (t: string) => t.replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
const relPath = (u: string) => { const r = u.replace(VC, '') || '/'; try { return decodeURIComponent(r); } catch { return r; } };
const scrub = (t?: string | null) => clean((t ?? '').replace(/<!--[\s\S]*?-->/g, '').replace(/[a-z]+\s*\{[^}]*\}/gi, ''));
/** Page title: legacy h1 (some contain a pasted spreadsheet style block as text — scrubbed), else og:title / <title> before "|". */
const titleFrom = (p: any) => decodeEnt(scrub(p.h1) || scrub(p.ogTitle).replace(/\s*\|.*$/, '') || clean(p.title).replace(/\s*\|.*$/, ''));
const pageTitleByPath = (href: string) => { const pg = vcPages.find((x) => !x.error && relPath(x.url) === href); return pg ? titleFrom(pg) : null; };
/** Tile label: legacy title, else the linked page's own title, else short alt text, else a neutral call to action. */
const tileTitle = (i: any) => { const t = decodeEnt(clean(i.title)); if (t) return t; const h = (i.href || '').replace(VC, ''); if (h.startsWith('/')) { const pt = pageTitleByPath(h.split('#')[0]); if (pt) return pt; } return i.alt && i.alt.length <= 40 ? i.alt : 'Learn more'; };
const stripLegacy = (html: string) => (html || '')
  .replace(/ data-sv-[a-z-]+="[^"]*"/g, '').replace(/ data-guid="[^"]*"/g, '')
  .replace(/https:\/\/www\.visitchandler\.com\//g, '/')
  .replace(/<section[^>]*>|<\/section>/g, '').replace(/<h1[^>]*>[\s\S]*?<\/h1>/gi, '').replace(/<p>\s*(&nbsp;)?\s*<\/p>/g, '').trim();

/* ───────────── Media ───────────── */
const mediaIds = new Map<string, number>();
async function mediaFor(src?: string | null, alt?: string | null, folder?: string): Promise<number | null> {
  if (!src) return null;
  const m = imageMap[src];
  const url = m?.local ?? null;
  if (!url) return null; // not migrated (restricted, failed, third-party) — never hot-link restricted images
  if (mediaIds.has(url)) return mediaIds.get(url)!;
  const file = decodeURIComponent(src.split('/').pop() ?? '');
  const credit = (file.match(/credit[_-]([A-Za-z_]+?)(?:_[0-9a-f]{8}|\.)/i) || [])[1]?.replace(/_/g, ' ') ?? null;
  const [row] = await db.insert(s.media).values({
    site: 'visit', url, sourceUrl: src, alt: clean(alt || m.alt || '').slice(0, 300), width: m.width, height: m.height, format: 'jpeg',
    folder: folder ?? m.folder, credit, permission: m.permission ?? 'pending',
  }).onConflictDoUpdate({ target: s.media.url, set: { alt: sql`excluded.alt`, sourceUrl: src } }).returning({ id: s.media.id });
  mediaIds.set(url, row.id);
  return row.id;
}
const local = (src?: string | null) => (src ? imageMap[src]?.local ?? null : null);

/* ───────────── Listing classification (from legacy CRM categories) ───────────── */
function listingType(cat = '', sub = ''): (typeof s.listingTypeEnum.enumValues)[number] {
  const c = cat.toLowerCase(), x = sub.toLowerCase();
  if (c.includes('where to stay')) return 'hotel';
  if (c === 'dining') return x.includes('nightlife') ? 'nightlife' : 'restaurant';
  if (/parks?$/.test(x) || x.includes('hiking') || x.includes('trail')) return x.includes('hiking') || x.includes('trail') ? 'trail' : 'park';
  if (x.includes('golf')) return 'golf';
  if (x.includes('casino')) return 'nightlife';
  if (c === 'shopping' || x === 'shopping' || x.includes('shopping')) return 'shopping';
  if (x.includes('museum') || x.includes('arts')) return 'arts';
  if (c.includes('meeting') || c.includes('venue')) return 'venue';
  if (c.includes('sports') || x.includes('fitness') || x.includes('aquatic') || x.includes('recreation')) return 'recreation';
  if (c.includes('business travel') || c.includes('transportation') || c.includes('deals')) return 'services';
  if (c.includes('things to do')) return 'attraction';
  return 'other';
}
function amenitiesOf(tree: any[] = []): string[] {
  const out: string[] = [];
  for (const tab of tree) for (const g of tab.groups ?? []) for (const f of g.fields ?? []) {
    const v = f.doc?.value_raw; if (v === true || (typeof v === 'number' && v > 0) || (typeof v === 'string' && v && v !== 'false')) out.push(clean(f.localeLabel || f.label));
  }
  return [...new Set(out)].slice(0, 40);
}

async function main() {
  console.log('Seeding…');
  /* ───────────── Users (demo staff accounts; passwords generated, never committed) ───────────── */
  const pw = process.env.SEED_PASSWORD ?? crypto.randomBytes(9).toString('base64url');
  const hash = await bcrypt.hash(pw, 12);
  const users = [
    { email: 'admin@chandler.example', name: 'Platform Administrator', role: 'admin' as const, sites: ['visit', 'edo'] as ('visit' | 'edo')[] },
    { email: 'editor@chandler.example', name: 'Content Editor', role: 'editor' as const, sites: ['visit', 'edo'] as ('visit' | 'edo')[] },
    { email: 'tourism@chandler.example', name: 'Tourism Staff', role: 'tourism_staff' as const, sites: ['visit'] as ('visit' | 'edo')[] },
    { email: 'edo@chandler.example', name: 'Economic Development Staff', role: 'edo_staff' as const, sites: ['edo'] as ('visit' | 'edo')[] },
    { email: 'partner@chandler.example', name: 'Stakeholder Partner (demo)', role: 'stakeholder' as const, sites: ['visit'] as ('visit' | 'edo')[], organisation: 'Demo Hospitality Partner' },
  ];
  for (const u of users) {
    await db.insert(s.users).values({ ...u, passwordHash: hash }).onConflictDoUpdate({ target: s.users.email, set: { passwordHash: hash, role: u.role, sites: u.sites } });
  }
  fs.writeFileSync(path.join(ROOT, '.seed-credentials'), `# Demo staff accounts (development only — rotate before any shared deployment)\n${users.map((u) => `${u.role.padEnd(14)} ${u.email}`).join('\n')}\npassword: ${pw}\n`);

  /* ───────────── Listings ───────────── */
  const listingIdByRec = new Map<number, number>();
  const lst = vcPages.filter((p) => p.type === 'listing' && p.record);
  for (const p of lst) {
    const r = p.record; const ld = p.ld ?? {};
    const seg = relPath(p.url).split('/').filter(Boolean); // listing/<slug>/<id>
    const type = listingType(r.primaryCategory?.catname, r.primaryCategory?.subcatname);
    const media0 = (r.media ?? []).sort((a: any, b: any) => a.sortorder - b.sortorder);
    const primaryId = await mediaFor(media0[0]?.mediaurl, media0[0]?.mediadesc || media0[0]?.medianame || r.title, undefined);
    const vals = {
      id: Number(r.recid), // legacy Simpleview record ID kept as primary key so /listing/<slug>/<id>/ URLs are identical
      slug: decodeURIComponent(seg[1] ?? 'listing'), name: decodeEnt(clean(r.title)), type, category: r.primaryCategory?.catname ?? null, subcategory: r.primaryCategory?.subcatname ?? null,
      descriptionHtml: stripLegacy(r.description ?? ''), address: clean(r.address1 ?? ld.address?.streetAddress) || null,
      city: r.city ?? ld.address?.addressLocality ?? null, zip: ld.address?.postalCode ?? r.zip ?? null, region: r.region ?? null,
      latitude: Number(r.latitude) || null, longitude: Number(r.longitude) || null, phone: r.phone ?? ld.telephone ?? null, email: r.email ?? null,
      website: r.weburl ?? null, social: (r.social ?? []).map((x: any) => { const url = x.value ?? x.url; let service = 'Website'; try { service = new URL(url).hostname.replace(/^www\./, '').split('.')[0]; } catch {} return { service: service.charAt(0).toUpperCase() + service.slice(1), url }; }).filter((x: any) => x.url),
      amenities: amenitiesOf(r.amenityTree), primaryMediaId: primaryId, sourceUrl: p.url, sourceId: `vc-listing-${r.recid}`, status: 'published' as const,
      seoTitle: clean(p.title) || null, seoDescription: p.metaDescription || null, canonicalUrl: relPath(p.canonical || p.url),
    };
    const [row] = await db.insert(s.listings).values(vals).onConflictDoUpdate({ target: s.listings.sourceId, set: vals }).returning({ id: s.listings.id });
    listingIdByRec.set(Number(r.recid), row.id);
    await db.delete(s.listingMedia).where(sql`listing_id = ${row.id}`);
    let n = 0;
    for (const m of media0) { const mid = await mediaFor(m.mediaurl, m.mediadesc || m.medianame || r.title); if (mid) await db.insert(s.listingMedia).values({ listingId: row.id, mediaId: mid, sort: n++ }).onConflictDoNothing(); }
  }
  await db.execute(sql`select setval(pg_get_serial_sequence('listings','id'), greatest((select max(id) from listings), 100000))`);
  console.log('listings', lst.length);

  /* ───────────── Events ───────────── */
  const evs = vcPages.filter((p) => p.type === 'event' && p.record);
  const toIso = (d: string) => { const t = new Date(d); return isNaN(+t) ? null : t.toISOString().slice(0, 10); };
  for (const p of evs) {
    const r = p.record; const ld = p.ld ?? {};
    const seg = relPath(p.url).split('/').filter(Boolean);
    const dates = (p.eventDates ?? []).map(toIso).filter(Boolean) as string[];
    const primary = (r.media_raw ?? []).sort((a: any, b: any) => a.sortorder - b.sortorder)[0];
    const vals = {
      id: Number(r.recid), // legacy record ID preserved for /event/<slug>/<id>/ URLs
      site: 'visit' as const, slug: decodeURIComponent(seg[1] ?? 'event'), title: decodeEnt(clean(r.title)), descriptionHtml: stripLegacy(r.description ?? ''),
      categories: (r.categories ?? []).map((c: any) => c.catName), startDate: ld.startDate ?? dates[0] ?? null, endDate: ld.endDate ?? dates[dates.length - 1] ?? null,
      timesText: clean(r.eventTime || r.times) || null, recurrenceText: dates.length > 1 && dates.length <= 12 ? `${dates.length} dates: ${dates.map((d) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).join(', ')}` : dates.length > 12 ? `Recurring — ${dates.length} dates` : null,
      locationName: clean(r.location) || null, address: [ld.location?.address?.streetAddress, ld.location?.address?.addressLocality].filter(Boolean).join(', ') || null,
      latitude: Number(r.latitude) || null, longitude: Number(r.longitude) || null, admission: clean(r.admission) || null, website: r.linkUrl ?? null,
      hostName: clean(r.hostname) || null, contactEmail: r.email ?? null, primaryMediaId: await mediaFor(primary?.mediaurl, r.title),
      sourceUrl: p.url, sourceId: `vc-event-${r.recid}`, status: 'published' as const, seoDescription: p.metaDescription || null, canonicalUrl: relPath(p.url),
    };
    await db.insert(s.events).values(vals).onConflictDoUpdate({ target: [s.events.site, s.events.sourceId], set: vals });
  }
  await db.execute(sql`select setval(pg_get_serial_sequence('events','id'), greatest((select max(id) from events), 100000))`);
  console.log('events', evs.length);

  /* ───────────── Articles (blog) ───────────── */
  const arts = vcPages.filter((p) => p.type === 'article' && !p.error);
  for (const p of arts) {
    const slug = relPath(p.url).split('/').filter(Boolean)[2];
    if (!slug) continue;
    const ld = p.ld ?? {};
    const hero = p.heroImage || p.ogImage || p.images?.[0]?.src;
    const vals = {
      site: 'visit' as const, slug, title: titleFrom(p), excerpt: p.metaDescription || null, bodyHtml: stripLegacy(p.bodyHtml),
      author: (typeof ld.author === 'object' ? ld.author?.name : ld.author) || p.author || null,
      categories: [], publishedOn: (ld.datePublished || p.articleDate || '').slice(0, 10) || null,
      heroMediaId: await mediaFor(hero, p.heroAlt || titleFrom(p), 'editorial'), sourceUrl: p.url, sourceId: `vc-article-${slug}`, status: 'published' as const,
      seoTitle: clean(p.title) || null, seoDescription: p.metaDescription || null, ogImage: local(p.ogImage), canonicalUrl: relPath(p.url),
    };
    await db.insert(s.articles).values(vals).onConflictDoUpdate({ target: [s.articles.site, s.articles.slug], set: vals });
  }
  console.log('articles', arts.length);

  /* ───────────── Pages (every remaining legacy URL) ───────────── */
  const special: Record<string, string> = {
    '/': 'home', '/events/': 'events', '/events/this-weekend/': 'events', '/blog/': 'blog-index', '/plan-your-visit/weather/': 'weather',
    '/sitemap/': 'sitemap', '/contact/': 'form', '/events/submit-your-event/': 'form', '/meetings/submit-rfp/': 'form', '/request-guide/': 'form',
    '/partnerwithus/': 'form', '/media/media-gallery/': 'media-gallery', '/media-gallery/': 'media-gallery', '/weddings/planning/': 'form', '/travel-trade/request-information/': 'form',
  };
  const formKey: Record<string, string> = { '/contact/': 'contact', '/events/submit-your-event/': 'submit-event', '/meetings/submit-rfp/': 'meeting-rfp', '/request-guide/': 'visitor-guide', '/partnerwithus/': 'partner', '/weddings/planning/': 'wedding', '/travel-trade/request-information/': 'contact' };
  const contentPages = vcPages.filter((p) => !['listing', 'event', 'article'].includes(p.type) && !p.error);
  for (const p of contentPages) {
    const pth = relPath(p.url);
    const dir = membership[pth]?.recids?.length ? membership[pth].recids : null;
    let template = special[pth] ?? (p.type === 'media-gallery' ? 'media-item' : p.type === 'offer' ? 'offer' : (dir || p.directory) ? 'directory' : 'standard');
    const blocks: any[] = [];
    if (template === 'directory') blocks.push({ type: 'directory', recids: (dir ?? []).map((id) => listingIdByRec.get(id)).filter(Boolean), subcats: p.directory?.subcats ?? [], presetAmenities: p.directory?.presetAmenities ?? [], regions: p.directory?.regions ?? [] });
    if (formKey[pth]) blocks.push({ type: 'form', form: formKey[pth] });
    for (const t of p.tiles ?? []) {
      if (pth === '/') continue;
      const items = t.items.filter((i: any) => i.href && !/^https?:\/\/(?!www\.visitchandler\.com)/.test(i.href) || /^https?:/.test(i.href)).map((i: any) => ({ title: tileTitle(i), href: i.href.replace(VC, ''), image: local(i.image), alt: i.alt }));
      if (items.length) blocks.push({ type: 'tiles', template: t.template, heading: decodeEnt(t.heading || ''), items });
    }
    if (p.embeds?.length) blocks.push({ type: 'embeds', items: p.embeds });
    if (p.type === 'media-gallery') blocks.push({ type: 'gallery', images: (p.images ?? []).filter((i: any) => local(i.src)).map((i: any) => ({ src: local(i.src), alt: i.alt })) });
    const hero = p.heroImage || p.ogImage;
    const vals = {
      site: 'visit' as const, path: pth, title: titleFrom(p) || pth, template, section: '/' + (pth.split('/')[1] ?? ''), summary: p.metaDescription || null,
      bodyHtml: stripLegacy(p.bodyHtml), heroMediaId: await mediaFor(hero, p.heroAlt || titleFrom(p)), blocks,
      seoTitle: clean(p.title) || null, seoDescription: p.metaDescription || null, canonicalUrl: relPath(p.canonical || p.url), ogImage: local(p.ogImage),
      noindex: /noindex/i.test(p.robots ?? ''), status: 'published' as const, sourceUrl: p.url, sourceId: `vc-page-${pth}`,
    };
    await db.insert(s.pages).values(vals).onConflictDoUpdate({ target: [s.pages.site, s.pages.path], set: vals });
  }
  console.log('pages', contentPages.length);

  /* Homepage blocks — composed from the live homepage's own modules */
  const home = vcPages.find((p) => p.path === '/');
  if (home) {
    const tiles = (tpl: string) => home.tiles?.find((t: any) => t.template === tpl);
    const gw = home.tiles?.find((t: any) => t.template === 'core_callout_tiles_3_across_fullwidth');
    const gwLabels = ['Dining', 'Places to Stay', 'Downtown', 'Outdoors & Wildlife', 'Business Traveler', 'Family Fun'];
    const sbs = home.tiles?.filter((t: any) => t.template === 'core_side_by_side_1_across') ?? [];
    const hl = tiles('highlights');
    const introHtml = (home.bodyHtml || '').split('</p>').slice(0, 2).join('</p>') + '</p>';
    const supplied = (f: string) => `/images/homepage/${f}`;
    const blocks = [
      // Hero: high-resolution official photography only (≥2400 px masters) so portrait crops on phones stay sharp.
      { key: 'hero', headline: 'Where city meets desert.', slides: [
        { src: local(tiles('core_featured_events')?.items?.[0]?.image), alt: 'Couple taking selfie in front of the Tumbleweed Tree in Chandler, AZ', caption: 'Tumbleweed Tree Lighting, Downtown Chandler' },
        { src: '/images/visitor-resources/downtown-chandler-evening-316acf01-e74a-ecec-c81319adbca5fdcd-4be0f5.jpg', alt: 'Palm-lined street in Downtown Chandler at dusk', caption: 'Evening in Downtown Chandler' },
        { src: '/images/homepage/just-roughing-it-pc310031-4c00c22e-d505-4c35-a0cd-589d62f31e28-4f514b.jpg', alt: 'Group of hikers on a desert trail near Chandler, AZ on a sunny day', caption: 'Hiking near Chandler' },
        { src: '/images/media-gallery/thaidancers-dwntwnblock-316a58a3-fe00-666f-ef0ac86849b2045c-4dda36.jpg', alt: 'Dancers in pink dresses performing at Chandler’s annual Multi-Cultural Festival', caption: 'Chandler Multi-Cultural Festival' },
      ].filter((x) => x.src) },
      { key: 'intro', eyebrow: 'Visit Chandler', title: 'Big-city energy, wide-open desert.', html: stripLegacy(introHtml), image: local(gw?.items?.[3]?.image), imageAlt: gw?.items?.[3]?.alt, image2: local(gw?.items?.[2]?.image), image2Alt: gw?.items?.[2]?.alt,
        facts: [{ value: '300+', count: 300, suffix: '+', label: 'days of sunshine a year' }] },
      { key: 'gateways', items: (gw?.items ?? []).map((it: any, i: number) => ({ label: gwLabels[i] ?? it.alt, href: it.href.replace(VC, ''), image: local(it.image), alt: it.alt })) },
      { key: 'spotlight', eyebrow: "Don't miss", title: 'Tumbleweed Tree Lighting & Parade', text: 'Don’t Miss This Iconic Chandler Holiday Event', href: '/events/annual-events/tumbleweed-tree-lighting/', image: local(tiles('core_featured_events')?.items?.[0]?.image) },
      { key: 'hike', title: sbs[0]?.heading || 'Hike the Top 10 Trails of Chandler', text: 'There are many ways to explore the great outdoors - and a favorite of visitors and residents alike is a walk or hike at one…' /* verbatim teaser copy from the live homepage */, href: '/things-to-do/outdoor-recreation/hiking/', image: local(sbs[0]?.items?.[0]?.image), alt: sbs[0]?.items?.[0]?.alt },
      // The legacy guide photo is flagged DO_NOT_SHARE in its file name, so a permitted official photo is used instead.
      { key: 'guide', title: 'Chandler Visitors Guide', text: 'Plan your next trip to Chandler with the free official visitors guide for Chandler!', href: '/visitors-guide/', image: local(sbs[1]?.items?.[0]?.image) ?? supplied('open-graph-lake.jpg'), alt: local(sbs[1]?.items?.[0]?.image) ? sbs[1]?.items?.[0]?.alt : 'Aerial view of a lake and palm-lined parks in Chandler' },
      { key: 'highlights', title: 'Discover more', items: (hl?.items ?? []).map((i: any) => { const href = i.href.replace(VC, ''); const pg = vcPages.find((x) => relPath(x.url) === href); return { label: decodeEnt(i.title) || (pg ? titleFrom(pg).replace(/ in Chandler,? AZ$/i, '') : href), href }; }).filter((i: any) => i.label && !/^view all$/i.test(i.label)) },
    ];
    await db.update(s.pages).set({ blocks, template: 'home', title: 'Visit Chandler' }).where(sql`site = 'visit' and path = '/'`);
  }

  /* ───────────── Navigation (mirrors the live IA) ───────────── */
  await db.delete(s.navItems);
  const exists = new Set(contentPages.map((p) => relPath(p.url)));
  const T = (pth: string, fallback?: string) => { const pg = contentPages.find((p) => relPath(p.url) === pth); return pg ? titleFrom(pg).replace(/ in Chandler,? AZ$/i, '') : fallback ?? pth; };
  const MAIN: [string, string, string[]][] = [
    ['Hotels', '/hotels/', ['/hotels/downtown/', '/hotels/extended-stay/', '/hotels/pet-friendly/', '/hotels-with-shuttles/', '/specials/']],
    ['Restaurants', '/restaurants/', ['/restaurants/breakfast/', '/restaurants/mexican-food/', '/restaurants/asian/', '/restaurants/steakhouses/', '/restaurants/breweries/', '/restaurants/outdoor-dining/', '/restaurants/family-friendly/', '/restaurants/group-restaurants/', '/restaurants/sports-bars/', '/restaurants/local-restaurants/', '/restaurants/downtown/', '/coffee-shops/', '/dessert/', '/cocktails-winebars/', '/bbq/', '/american/', '/international/']],
    ['Things To Do', '/things-to-do/', ['/things-to-do/top-attractions/', '/things-to-do/downtown-chandler/', '/things-to-do/west-chandler/', '/things-to-do/outdoor-recreation/', '/things-to-do/museums/', '/things-to-do/shopping-in-chandler-az/', '/things-to-do/nightlife/', '/things-to-do/things-to-do-with-kids/', '/things-to-do/free-things-to-do-in-chandler-az/', '/things-to-do/indoor-activities/', '/things-to-do/recreation-sports/', '/map/']],
    ['Events', '/events/', ['/events/this-weekend/', '/events/annual-events/', '/events/sports-events/', '/events/spring-events/', '/events/summer-events/', '/events/fall-events/', '/events/holiday-events/', '/events/submit-your-event/']],
    ['Plan Your Visit', '/plan-your-visit/', ['/plan-your-visit/weather/', '/trip-planner/', '/plan-your-visit/chandler-transportation/', '/plan-your-visit/visitor-center/', '/visitors-guide/', '/plan-your-visit/about/', '/plan-your-visit/about/history/', '/plan-your-visit/about/accessibility/', '/plan-your-visit/relocating-to-chandler/', '/plan-your-visit/relocating-to-chandler/fun-facts/', '/plan-your-visit/visiting-asu/', '/concierge/']],
  ];
  const appTitles: Record<string, string> = { '/map/': 'Interactive map', '/trip-planner/': 'Trip planner', '/concierge/': 'Ask the concierge' };
  let sort = 0;
  for (const [label, href, kids] of MAIN) {
    const [top] = await db.insert(s.navItems).values({ site: 'visit', menu: 'main', label, href, sort: sort++ }).returning({ id: s.navItems.id });
    let k = 0;
    for (const c of kids) if (exists.has(c) || appTitles[c]) await db.insert(s.navItems).values({ site: 'visit', menu: 'main', parentId: top.id, label: appTitles[c] ?? T(c), href: c, sort: k++ });
  }
  for (const [i, [label, href]] of ([['Business Travelers', '/business-travelers/'], ['Meetings', '/meetings/'], ['Weddings', '/weddings/'], ['Blog', '/blog/']] as const).entries())
    await db.insert(s.navItems).values({ site: 'visit', menu: 'utility', label, href, sort: i });
  const FOOT: [string, string, string[]][] = [
    ['Explore', '/things-to-do/', ['/hotels/', '/restaurants/', '/things-to-do/', '/events/', '/map/', '/trip-planner/']],
    ['Groups & business', '/meetings/', ['/meetings/', '/business-travelers/', '/weddings/', '/travel-trade/', '/sports/', '/film-chandler/']],
    ['About', '/about-chandler-tourism/', ['/about-chandler-tourism/', '/contact/', '/media/', '/partnerwithus/', '/sistercities/', '/plan-your-visit/relocating-to-chandler/']],
  ];
  for (const [i, [label, href, kids]] of FOOT.entries()) {
    const [top] = await db.insert(s.navItems).values({ site: 'visit', menu: 'footer', label, href, sort: i }).returning({ id: s.navItems.id });
    for (const [k, c] of kids.entries()) await db.insert(s.navItems).values({ site: 'visit', menu: 'footer', parentId: top.id, label: appTitles[c] ?? T(c), href: c, sort: k });
  }
  for (const [i, [label, href]] of ([['Sitemap', '/sitemap/'], ['Privacy Policy', '/privacy-policy/'], ['Accessibility Statement', '/accessibility-statement/']] as const).entries())
    await db.insert(s.navItems).values({ site: 'visit', menu: 'legal', label, href, sort: i });

  await seedEdo();
  await seedPlatform();
  console.log('Done.');
  await pool.end();
}

/* ═════════════ Economic Development ═════════════ */
const ED_PREFIX = '/business/economic-development';
async function edoMedia(src?: string | null, alt?: string | null): Promise<number | null> {
  const m = src ? edImageMap[src] : null; if (!m?.local) return null;
  if (mediaIds.has(m.local)) return mediaIds.get(m.local)!;
  const [row] = await db.insert(s.media).values({ site: 'edo', url: m.local, sourceUrl: src, alt: clean(alt || m.alt || ''), width: m.width, height: m.height, format: 'jpeg', folder: 'edo', permission: 'pending' })
    .onConflictDoUpdate({ target: s.media.url, set: { alt: sql`excluded.alt` } }).returning({ id: s.media.id });
  mediaIds.set(m.local, row.id); return row.id;
}
/** Hero photo for an EDO page: first large migrated image that is a photograph, not an infographic tile (e.g. "1.3M SF of Office Space"). */
const edoHero = (p: any) => (p.images ?? []).find((i: any) => edImageMap[i.src]?.local && (edImageMap[i.src].width ?? 0) >= 700 && !/\bSF of\b|infographic|icon|logo|placeholder/i.test(i.alt ?? '') && !/sf-of|-sf-|infographic/i.test(i.src));
/** Rewrite City-hosted image URLs in migrated body HTML to their migrated local copies. */
/** Remove the legacy animated-counter widget (numbers rendered as "506.00 / Total Businesses"); the figures are shown from sourced indicators instead. */
const stripCounters = (html: string) => html.replace(/<div[^>]*id="number-\d+"[^>]*>\s*[\d.,]+\s*<\/div>\s*<div[^>]*>[^<]*<\/div>/g, '');
const localiseEdoImgs = (html: string) => html.replace(/src="([^"]+)"/g, (m, u) => { const abs = u.startsWith('http') ? u : CZ + u; return edImageMap[abs]?.local ? `src="${edImageMap[abs].local}"` : m; });
const edPath = (p: string) => (p.replace(ED_PREFIX, '') || '/').replace(/\/?$/, '/');

async function seedEdo() {
  const ed = edPages.filter((p) => p.platform === 'edo' && !p.error);
  for (const p of ed) {
    let pth: string;
    if (p.section === 'blog') pth = '/news/' + p.path.split('/').pop() + '/';
    else if (p.section === 'news') pth = '/news/' + p.path.split('/').pop() + '/';
    else pth = edPath(p.path);
    const body = localiseEdoImgs(stripCounters(p.bodyHtml || '')).replace(/ (class|style|data-[a-z-]+)="[^"]*"/g, '').replace(/href="\/(?!\/)/g, `href="${CZ}/`).replace(new RegExp(`${CZ}${ED_PREFIX}`, 'g'), '');
    const isArticle = p.section === 'blog' || p.section === 'news';
    if (isArticle) {
      const slug = p.path.split('/').pop();
      const h = edoHero(p);
      const vals = { site: 'edo' as const, slug, title: p.h1 || p.title, excerpt: p.metaDescription || p.text.slice((p.h1 || '').length, 260).trim(), bodyHtml: body, categories: [p.section === 'blog' ? 'Insights' : 'News'], heroMediaId: await edoMedia(h?.src, h?.alt), publishedOn: (p.text.match(/(20\d\d)/)?.[1] ? `${p.text.match(/(20\d\d)/)![1]}-12-31` : null), sourceUrl: p.url, sourceId: `ed-${slug}`, status: 'published' as const, seoDescription: p.metaDescription || null };
      await db.insert(s.articles).values(vals).onConflictDoUpdate({ target: [s.articles.site, s.articles.slug], set: vals });
      continue;
    }
    const template = pth === '/' ? 'edo-home' : pth.startsWith('/key-industries-and-employers/') && pth.split('/').length > 3 ? 'industry' : pth.startsWith('/employment-and-business-districts/') && pth.split('/').length > 3 ? 'district' : 'standard';
    const blocks: any[] = [];
    if (p.downloads?.length) blocks.push({ type: 'downloads', items: p.downloads });
    if (p.embeds?.length) blocks.push({ type: 'embeds', items: p.embeds.map((e: string) => e.replace(/"$/, '')) });
    if (p.forms?.length || /initiate-a-project|intake-form/.test(pth)) blocks.push({ type: 'form', form: pth.includes('intake') ? 'lets-talk-business' : 'initiate-a-project' });
    const hero = edoHero(p);
    const vals = { site: 'edo' as const, path: pth, title: p.h1 || p.title, template, heroMediaId: await edoMedia(hero?.src, hero?.alt), section: '/' + (pth.split('/')[1] ?? ''), summary: p.metaDescription || null, bodyHtml: body, blocks,
      seoTitle: p.title, seoDescription: p.metaDescription || null, status: 'published' as const, sourceUrl: p.url, sourceId: `ed-page-${pth}` };
    await db.insert(s.pages).values(vals).onConflictDoUpdate({ target: [s.pages.site, s.pages.path], set: vals });
  }
  console.log('edo pages', ed.length);

  // Districts — verified stats from district pages (CoStar July 2024 per City page)
  const num = (t: string, re: RegExp) => { const m = t.match(re); return m ? Number(m[1].replace(/,/g, '')) : null; };
  const districtGeo: Record<string, [number, number]> = { 'airpark-area': [33.2696, -111.8111], 'price-corridor': [33.2905, -111.8890], 'uptown-chandler': [33.3330, -111.8415], 'west-chandler': [33.3050, -111.9300] };
  for (const p of ed.filter((x) => x.section === 'employment-and-business-districts' && x.path.split('/').length > 4)) {
    const slug = p.path.split('/').pop();
    const facts = { businesses: num(p.text, /([\d,.]+)\s*Total Businesses/), jobs: num(p.text, /([\d,.]+)\s*Total Number of Jobs/), sqmi: num(p.text, /([\d,.]+)\s*Total Square Miles/),
      space: p.images.filter((i: any) => /SF of/i.test(i.alt)).map((i: any) => i.alt.trim()) };
    const dimg = edoHero(p);
    const vals = { slug, heroMediaId: await edoMedia(dimg?.src, dimg?.alt), name: (p.h1 || p.title).replace(/ Business District$/, ''), summary: p.text.split('. ').slice(1, 3).join('. ').slice(0, 400), bodyHtml: '', latitude: districtGeo[slug]?.[0], longitude: districtGeo[slug]?.[1], sourceUrl: p.url, sourceId: `ed-district-${slug}`, status: 'published' as const };
    await db.insert(s.districts).values(vals).onConflictDoUpdate({ target: s.districts.slug, set: vals });
    const key = (k: string) => `district_${slug.replace(/-/g, '_')}_${k}`;
    const ind = [
      facts.businesses && { key: key('businesses'), label: `${vals.name}: total businesses`, value: facts.businesses.toLocaleString(), numericValue: facts.businesses },
      facts.jobs && { key: key('jobs'), label: `${vals.name}: total jobs`, value: facts.jobs.toLocaleString(), numericValue: facts.jobs },
      facts.sqmi && { key: key('sqmi'), label: `${vals.name}: area`, value: `${facts.sqmi} sq mi`, numericValue: facts.sqmi },
      ...facts.space.map((sp: string, i: number) => ({ key: key(`space_${i}`), label: `${vals.name}: ${sp.replace(/^[\d.]+[KM]?\s*/, '')}`, value: sp.match(/^[\d.]+[KM]?/)?.[0] ?? sp, numericValue: null })),
    ].filter(Boolean) as any[];
    for (const i of ind) await upsertIndicator({ ...i, category: 'districts', sourceName: `City of Chandler — ${vals.name} district page`, sourceUrl: p.url, asOf: /Costar \(([^)]+)\)/i.exec(p.text)?.[1] ? `CoStar, ${/Costar \(([^)]+)\)/i.exec(p.text)![1]}` : null });
  }

  // Industries
  const kiLanding = ed.find((x) => x.path.endsWith('/key-industries-and-employers'));
  const kiImg = (name: string) => { const words = name.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3); return (kiLanding?.images ?? []).find((i: any) => words.some((w: string) => i.alt.toLowerCase().includes(w.slice(0, 6)))); };
  for (const p of ed.filter((x) => x.section === 'key-industries-and-employers' && x.path.split('/').length === 5 && x.wordCount > 20)) {
    const slug = p.path.split('/').pop();
    const img = edoHero(p) ?? kiImg(p.h1 || p.title);
    const vals = { slug, name: p.h1 || p.title, summary: p.text.slice((p.h1 || '').length, 420).trim(), bodyHtml: '', employers: [], heroMediaId: await edoMedia(img?.src, img?.alt), sourceUrl: p.url, sourceId: `ed-industry-${slug}`, status: 'published' as const };
    await db.insert(s.industries).values(vals).onConflictDoUpdate({ target: s.industries.slug, set: vals });
  }

  // Economic indicators verified on City pages
  const mr = ed.find((p) => p.path.endsWith('market-research-data-and-maps'));
  if (mr) {
    const rows = [...mr.bodyHtml.matchAll(/<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([\d,]+)<\/td>/g)];
    for (const [i, r] of rows.entries()) await upsertIndicator({ key: `top_employer_${i + 1}`, label: clean(r[1]), value: r[3], numericValue: Number(r[3].replace(/,/g, '')), unit: 'Chandler-based jobs', category: 'top_employers:' + clean(r[2]), sourceName: 'City of Chandler — Market Research, Data & Maps', sourceUrl: mr.url, asOf: 'As published by the City' });
    const f = mr.text.match(/more than (\d+) companies on the (\d{4}) Fortune 1000/);
    if (f) await upsertIndicator({ key: 'fortune_1000_presence', label: `Fortune 1000 companies with Chandler offices (${f[2]} list)`, value: `${f[1]}+`, numericValue: Number(f[1]), category: 'business', sourceName: 'City of Chandler — Market Research, Data & Maps', sourceUrl: mr.url, asOf: `${f[2]} Fortune 1000` });
    const e = mr.text.match(/more than ([\d,]+) employees in Chandler, which translates to about (\d+)% of citywide employment/);
    if (e) await upsertIndicator({ key: 'fortune_1000_employment_share', label: 'Share of citywide employment at Fortune 1000 companies', value: `${e[2]}%`, numericValue: Number(e[2]), unit: '%', category: 'business', sourceName: 'City of Chandler — Market Research, Data & Maps', sourceUrl: mr.url, asOf: 'As published by the City' });
  }
  const bc = ed.find((p) => p.path.endsWith('business-climate'));
  if (bc) {
    if (/AAA bond rating/.test(bc.text)) await upsertIndicator({ key: 'bond_rating', label: 'Bond rating (all three major agencies)', value: 'AAA', category: 'business', sourceName: 'City of Chandler — Business Climate', sourceUrl: bc.url, asOf: 'As published by the City' });
    const st = bc.text.match(/sales tax rate among the metro area's major cities at ([\d.]+) percent/); if (st) await upsertIndicator({ key: 'city_sales_tax', label: 'City sales tax rate (lowest among major metro cities)', value: `${st[1]}%`, numericValue: Number(st[1]), unit: '%', category: 'business', sourceName: 'City of Chandler — Business Climate', sourceUrl: bc.url, asOf: 'As published by the City' });
    const ct = bc.text.match(/corporate income tax rates at ([\d.]+) percent/); if (ct) await upsertIndicator({ key: 'az_corporate_tax', label: 'Arizona corporate income tax rate', value: `${ct[1]}%`, numericValue: Number(ct[1]), unit: '%', category: 'business', sourceName: 'City of Chandler — Business Climate', sourceUrl: bc.url, asOf: 'As published by the City' });
  }
  const re = ed.find((p) => p.path.endsWith('office-commercial-industrial-real-estate'));
  if (re) {
    const ind = re.text.match(/There is ([\d]+) million square feet of industrial space/); if (ind) await upsertIndicator({ key: 'industrial_sf', label: 'Industrial space citywide', value: `${ind[1]}M sq ft`, numericValue: Number(ind[1]) * 1e6, unit: 'sq ft', category: 'real_estate', sourceName: 'City of Chandler — Office, Industrial & Commercial Real Estate', sourceUrl: re.url, asOf: 'As published by the City' });
    const off = re.text.match(/about ([\d]+) million square feet of office space/); if (off) await upsertIndicator({ key: 'office_sf', label: 'Office space citywide', value: `${off[1]}M sq ft`, numericValue: Number(off[1]) * 1e6, unit: 'sq ft', category: 'real_estate', sourceName: 'City of Chandler — Office, Industrial & Commercial Real Estate', sourceUrl: re.url, asOf: 'As published by the City' });
  }

  // Staff directory (public contact page)
  const cu = ed.find((p) => p.path.endsWith('/contact-us'));
  if (cu) {
    await db.delete(s.staffProfiles).where(sql`site = 'edo'`);
    const re2 = /([A-Z][a-z]+ [A-Z][A-Za-z]+)(Economic Development Director|Senior Program Manager|Project Manager|Economic Development Specialist|Tourism Marketing Coordinator|Management Assistant)(\d{3}-\d{3}-\d{3,4})?/g;
    let m; let i = 0;
    while ((m = re2.exec(cu.text))) await db.insert(s.staffProfiles).values({ site: 'edo', name: m[1], title: m[2], phone: m[3] && m[3].length === 12 ? m[3] : null, sort: i++, sourceUrl: cu.url });
  }

  // Reports & downloads (link to City-hosted originals)
  await db.delete(s.reports);
  const seen = new Set<string>();
  for (const p of ed) for (const d of p.downloads ?? []) {
    if (seen.has(d.href)) continue; seen.add(d.href);
    const yr = d.href.match(/(20\d\d)/)?.[1];
    await db.insert(s.reports).values({ title: clean(d.text) || decodeURIComponent(d.href.split('/').pop()!), fileUrl: d.href, category: p.section.replace(/-/g, ' '), publishedOn: yr ? `${yr}-01-01` : null, sourceUrl: p.url, status: 'published' });
  }

  // Business events — verbatim from the City's News & Events and Cursos de Negocios pages.
  const ne = ed.find((p) => p.path.endsWith('/news-and-events')); const cu2 = ed.find((p) => p.path.endsWith('/cursos-de-negocios'));
  const edImg = (pg: any, re: RegExp) => { const i = (pg?.images ?? []).find((x: any) => re.test(x.src)); return edoMedia(i?.src, i?.alt); };
  const LTB_DESC = "This new initiative gives business owners, entrepreneurs, developers, investors and commercial real estate professionals direct access to Economic Development Director, Micah Miranda, with dedicated 30-minute one-on-one meetings scheduled by YOU. Whether you're looking to expand, relocate, invest, redevelop, or navigate city resources, we're here to help.";
  const CURSOS_INTRO = 'En colaboración con nuestro aliado DAS Foundation, ofrecemos talleres gratuitos, 100% en español, de alta calidad. Los talleres se llevarán a cabo en formato híbrido en el Centro de Innovación ASU Chandler, 249 E. Chicago St., y por Zoom.';
  const edoEvents = [
    { key: 'lets-talk-business-2026-11-19', title: "Let's Talk Business — one-on-one with the Economic Development Director", startDate: '2026-11-19', timesText: '8:30 – 11 a.m.', categories: ['Business & Networking'], descriptionHtml: `<p>${LTB_DESC}</p>`, website: '/edo/business-services/lets-talk-business/', src: ne?.url },
    { key: 'lets-talk-business-2026-10-15', title: "Let's Talk Business — one-on-one with the Economic Development Director", startDate: '2026-10-15', timesText: '8:30 – 11 a.m.', categories: ['Business & Networking'], descriptionHtml: `<p>${LTB_DESC}</p>`, website: '/edo/business-services/lets-talk-business/', src: ne?.url },
    { key: 'chandler-endeavor', title: 'Chandler Endeavor Venture Innovation Incubator', startDate: null, recurrenceText: 'Ongoing — monthly workshops and coffee + connections', locationName: 'ASU Chandler Innovation Center', address: '249 E. Chicago St., Chandler, AZ', latitude: 33.3030, longitude: -111.8410, categories: ['Startups & Innovation'], descriptionHtml: '<p>City of Chandler and Arizona State University will host a variety of events at the ASU Chandler Innovation Center, 249 E. Chicago St. including monthly workshops and coffee + connections.</p>', src: ne?.url },
    { key: 'chandler-innovation-fair', title: 'Annual Chandler Innovation Fair', startDate: null, recurrenceText: 'Annually in February', categories: ['Startups & Innovation'], descriptionHtml: '<p>Showcases the businesses, artists, students and innovators in the community as Chandler participates in the statewide Arizona SciTech Festival.</p>', website: '/events/annual-events/innovation-fair/', src: ne?.url },
    ...[['presupuestos', 'Cursos de Negocios: Presupuestos', '2026-02-25', /presupuestos/], ['estrategias-de-precios', 'Cursos de Negocios: Estrategias de Precios Inteligentes', '2026-03-25', /precios/], ['estados-financieros', 'Cursos de Negocios: Comprensión de Estados Financieros', '2026-04-22', /estados-financieros/]].map(([k, t, d, re]) => ({
      key: `cursos-${k}`, title: t as string, startDate: d as string, locationName: 'Centro de Innovación ASU Chandler y Zoom (híbrido)', address: '249 E. Chicago St., Chandler, AZ', latitude: 33.3030, longitude: -111.8410, categories: ['Small Business', 'En español'],
      descriptionHtml: `<p>${CURSOS_INTRO}</p><p><em>Fecha publicada por la Ciudad: ${(d as string).slice(8)} de ${{ '02': 'febrero', '03': 'marzo', '04': 'abril' }[(d as string).slice(5, 7)]}. El año (2026) se infiere de la fecha de publicación de la página.</em></p>`,
      website: '/edo/news-and-events/cursos-de-negocios/', src: cu2?.url, img: re as RegExp })),
  ];
  for (const e of edoEvents) {
    const slug = e.key.replace(/-\d{4}-\d{2}-\d{2}$/, '') + (e.startDate ? '-' + e.startDate : '');
    const vals = { site: 'edo' as const, slug, title: e.title, startDate: e.startDate, endDate: e.startDate, timesText: (e as any).timesText ?? null, recurrenceText: (e as any).recurrenceText ?? null,
      locationName: (e as any).locationName ?? null, address: (e as any).address ?? null, latitude: (e as any).latitude ?? null, longitude: (e as any).longitude ?? null, categories: e.categories, descriptionHtml: e.descriptionHtml,
      website: (e as any).website ?? null, hostName: 'City of Chandler Economic Development', primaryMediaId: (e as any).img ? await edImg(cu2, (e as any).img) : null, sourceUrl: e.src, sourceId: `ed-event-${e.key}`, status: 'published' as const };
    await db.insert(s.events).values(vals).onConflictDoUpdate({ target: [s.events.site, s.events.sourceId], set: vals });
  }
  console.log('edo events', edoEvents.length);

  // Demonstration property fixtures — clearly labelled; replaced by GIS Planning / CoStar feed in production.
  const districts = await db.select().from(s.districts);
  const did = (slug: string) => districts.find((d) => d.slug === slug)?.id ?? null;
  const fx = [
    ['Airpark Area Flex Building (Demo A)', 'industrial', 'airpark-area', 33.2662, -111.8148, 48000, 120000, 'I-1'], ['Airpark Build-to-Suit Parcel (Demo B)', 'land', 'airpark-area', 33.2611, -111.8030, null, null, 'PAD'],
    ['Price Corridor Class A Office (Demo C)', 'office', 'price-corridor', 33.2931, -111.8889, 36500, 210000, 'PAD'], ['Price Corridor Campus Suite (Demo D)', 'office', 'price-corridor', 33.2858, -111.8902, 12800, 95000, 'PAD'],
    ['West Chandler Industrial (Demo E)', 'industrial', 'west-chandler', 33.3071, -111.9302, 64000, 180000, 'I-1'], ['West Chandler Retail Pad (Demo F)', 'retail', 'west-chandler', 33.3203, -111.9115, 4200, 4200, 'C-2'],
    ['Uptown Adaptive Reuse Opportunity (Demo G)', 'development', 'uptown-chandler', 33.3352, -111.8411, 22000, 22000, 'C-2'], ['Uptown Commercial Center Suite (Demo H)', 'commercial', 'uptown-chandler', 33.3305, -111.8495, 3100, 46000, 'C-2'],
    ['Airpark Advanced Manufacturing Shell (Demo I)', 'industrial', 'airpark-area', 33.2745, -111.8230, 110000, 110000, 'I-2'], ['Price Corridor Development Land (Demo J)', 'land', 'price-corridor', 33.2805, -111.8840, null, null, 'PAD'],
  ] as const;
  for (const [i, f] of fx.entries()) {
    const slug = f[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
    const vals = { slug, name: f[0], type: f[1] as any, districtId: did(f[2]), latitude: f[3], longitude: f[4], availableSqft: f[5], totalSqft: f[6], acreage: f[1] === 'land' ? String(8 + i * 3.5) : null, zoning: f[7], zoningVerified: false,
      address: `Demonstration record — ${f[2].replace(/-/g, ' ')} (not a real address)`, availability: 'available',
      description: 'DEMONSTRATION RECORD. This property is a development fixture used to test search, mapping, comparison and enquiry workflows. It is not a real listing. In production, records are synchronised from the City’s licensed property database (GIS Planning / CoStar).',
      contactName: 'Economic Development Division', contactEmail: null, contactPhone: '480-782-3030', isFixture: true, status: 'published' as const, sourceId: `fixture-${i}` };
    await db.insert(s.properties).values(vals).onConflictDoUpdate({ target: s.properties.slug, set: vals });
  }

  // EDO navigation
  await db.delete(s.navItems).where(sql`site = 'edo'`);
  const NAV: [string, string, [string, string][]][] = [
    ['Why Chandler', '/why-choose-chandler/', [['Business Climate', '/why-choose-chandler/business-climate/'], ['Workforce Strategy', '/why-choose-chandler/workforce-development-strategy/'], ['Connectivity & Market Access', '/why-choose-chandler/connectivity-infrastructure-and-market-access/'], ['Lifestyle & Culture', '/why-choose-chandler/lifestyle-and-culture/'], ['Office Space', '/why-choose-chandler/office-space/'], ['Real Estate', '/why-choose-chandler/office-commercial-industrial-real-estate/']]],
    ['Industries', '/key-industries-and-employers/', []],
    ['Districts', '/employment-and-business-districts/', []],
    ['Sites & Properties', '/properties/', [['Property explorer (map)', '/properties/'], ['Compare properties', '/properties/compare/'], ['Site selection services', '/business-services/site-selection/'], ['Business location strategy', '/business-location-strategy/']]],
    ['Data & Research', '/data/', [['Economic data portal', '/data/'], ['Market research, data & maps', '/market-research-data-and-maps/'], ['Reports & downloads', '/reports/']]],
    ['Business Services', '/business-services/', [['Incentives & funding', '/business-services/incentives-and-funding/'], ['Startups', '/business-services/resources-for-startups/'], ['Small business', '/business-services/small-business-resources/'], ['Workforce development', '/business-services/workforce-development-resources/'], ['Export services', '/business-services/export-services/'], ["Let's Talk Business", '/business-services/lets-talk-business/']]],
    ['News & Events', '/news-and-events/', [['News & announcements', '/news/'], ['Business events', '/events/'], ['Cursos de Negocios (español)', '/news-and-events/cursos-de-negocios/'], ['News & Events overview', '/news-and-events/']]],
  ];
  const inds = await db.select().from(s.industries); const dists = await db.select().from(s.districts);
  NAV[1][2] = inds.map((x) => [x.name, `/key-industries-and-employers/${x.slug}/`]);
  NAV[2][2] = dists.map((x) => [x.name, `/employment-and-business-districts/${x.slug}/`]);
  for (const [i, [label, href, kids]] of NAV.entries()) {
    const [top] = await db.insert(s.navItems).values({ site: 'edo', menu: 'main', label, href, sort: i }).returning({ id: s.navItems.id });
    for (const [k, [l, h]] of kids.entries()) await db.insert(s.navItems).values({ site: 'edo', menu: 'main', parentId: top.id, label: l, href: h, sort: k });
  }
}

async function upsertIndicator(v: { key: string; label: string; value: string; numericValue?: number | null; unit?: string | null; category?: string | null; sourceName: string; sourceUrl: string; asOf?: string | null }) {
  await db.insert(s.economicIndicators).values(v).onConflictDoUpdate({ target: s.economicIndicators.key, set: { ...v, updatedAt: new Date() } });
}

/* ═════════════ Platform (redirects, integrations, settings) ═════════════ */
async function seedPlatform() {
  // Redirects: legacy URLs that already redirect on the old site + every old City EDO URL -> new EDO platform.
  for (const p of vcPages.filter((x) => x.redirected && x.finalUrl)) {
    await db.insert(s.redirects).values({ site: 'visit', fromPath: relPath(p.url), toPath: relPath(p.finalUrl), statusCode: 301, note: 'Legacy redirect preserved from visitchandler.com' }).onConflictDoNothing();
  }
  await db.insert(s.redirects).values({ site: 'visit', fromPath: '/articles/post/', toPath: '/blog/', statusCode: 301, note: 'Legacy URL returned 404 on audit; redirected to blog index' }).onConflictDoNothing();
  for (const p of edPages.filter((x) => x.platform === 'edo' && !x.error)) {
    const to = p.section === 'blog' || p.section === 'news' ? '/news/' + p.path.split('/').pop() + '/' : edPath(p.path);
    await db.insert(s.redirects).values({ site: 'edo', fromPath: p.path.replace(/\/?$/, '/'), toPath: to, statusCode: 301, note: 'chandleraz.gov economic development URL -> dedicated EDO platform' }).onConflictDoNothing();
  }
  const integ = [
    ['weather_nws', 'National Weather Service (weather.gov)', 'visit', true], ['weather_uv', 'Open-Meteo UV index', 'visit', true], ['map_tiles', 'Map tiles (CARTO / OpenStreetMap)', null, true],
    ['crm', 'CRM webhook (Simpleview CRM / Salesforce)', null, false], ['newsletter', 'Newsletter provider', null, false], ['email', 'Staff e-mail notifications', null, false],
    ['ga4', 'Google Analytics 4 / Tag Manager', null, false], ['gis_planning', 'GIS Planning property database (chandler.ecdev.org)', 'edo', false], ['arcgis', 'ArcGIS StoryMaps embeds', 'edo', true],
    ['ai_concierge', 'AI travel concierge (Anthropic Claude)', 'visit', false],
  ] as const;
  for (const [key, label, site, enabled] of integ) await db.insert(s.integrations).values({ key, label, site: site as any, enabled }).onConflictDoNothing();
  const settings: [('visit' | 'edo'), string, unknown][] = [
    ['visit', 'site', { name: 'Visit Chandler', url: process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com', phone: '480-782-3037', address: '175 S. Arizona Ave., Chandler, AZ 85225' }],
    ['edo', 'site', { name: 'Chandler Economic Development', url: process.env.EDO_SITE_URL ?? 'https://business.chandleraz.gov', phone: '480-782-3030', address: '175 S. Arizona Ave., Chandler, AZ 85225' }],
  ];
  for (const [site, key, value] of settings) await db.insert(s.settings).values({ site, key, value }).onConflictDoUpdate({ target: [s.settings.site, s.settings.key], set: { value } });
}

main().catch((e) => { console.error(e); process.exit(1); });
