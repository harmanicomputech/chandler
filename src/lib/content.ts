import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';

const { listings, media, events, articles, pages, navItems, listingMedia } = schema;

/** Visible = published AND inside its publish/expire window. Applies to every content type. */
function live(t: { status: any; publishAt: any; expireAt: any }) {
  return and(eq(t.status, 'published'), or(isNull(t.publishAt), lte(t.publishAt, sql`now()`)), or(isNull(t.expireAt), gte(t.expireAt, sql`now()`)))!;
}

export type ListingCard = {
  id: number; slug: string; name: string; type: string; category: string | null; subcategory: string | null; region: string | null;
  address: string | null; latitude: number | null; longitude: number | null; image: string | null; imageAlt: string | null; website: string | null; phone: string | null; excerpt: string;
};

const listingCardCols = {
  id: listings.id, slug: listings.slug, name: listings.name, type: listings.type, category: listings.category, subcategory: listings.subcategory,
  region: listings.region, address: listings.address, latitude: listings.latitude, longitude: listings.longitude, website: listings.website, phone: listings.phone,
  image: media.url, imageAlt: media.alt, excerpt: sql<string>`left(regexp_replace(${listings.descriptionHtml}, '<[^>]+>', ' ', 'g'), 220)`,
};

export type ListingQuery = { type?: string | string[]; subcategory?: string | string[]; region?: string; q?: string; tag?: string; amenity?: string[]; ids?: number[]; withImage?: boolean; sort?: 'name' | 'recent'; limit?: number; offset?: number };

export async function queryListings(qy: ListingQuery = {}) {
  const where: SQL[] = [live(listings)];
  if (qy.type) where.push(Array.isArray(qy.type) ? inArray(listings.type, qy.type as any) : eq(listings.type, qy.type as any));
  if (qy.subcategory) where.push(Array.isArray(qy.subcategory) ? inArray(listings.subcategory, qy.subcategory) : eq(listings.subcategory, qy.subcategory));
  if (qy.region) where.push(eq(listings.region, qy.region));
  if (qy.tag) where.push(sql`${listings.tags} ? ${qy.tag}`);
  if (qy.ids?.length) where.push(inArray(listings.id, qy.ids));
  if (qy.withImage) where.push(sql`${listings.primaryMediaId} is not null`);
  if (qy.amenity?.length) where.push(sql`${listings.amenities} ?| array[${sql.join(qy.amenity.map((a) => sql`${a}`), sql`, `)}]::text[]`);
  if (qy.q) { const like = `%${qy.q.replace(/[%_]/g, '')}%`; where.push(or(ilike(listings.name, like), ilike(listings.descriptionHtml, like), ilike(listings.subcategory, like), ilike(listings.address, like))!); }
  const base = db.select(listingCardCols).from(listings).leftJoin(media, eq(listings.primaryMediaId, media.id)).where(and(...where));
  const [rows, [{ count }]] = await Promise.all([
    base.orderBy(qy.sort === 'recent' ? desc(listings.updatedAt) : asc(listings.name)).limit(qy.limit ?? 24).offset(qy.offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(listings).where(and(...where)),
  ]);
  return { rows: rows as ListingCard[], total: count };
}

export const getListing = cache(async (id: number) => {
  const [row] = await db.select({ l: listings, img: media }).from(listings).leftJoin(media, eq(listings.primaryMediaId, media.id))
    .where(and(eq(listings.id, id), live(listings))).limit(1);
  if (!row) return null;
  const gallery = await db.select({ url: media.url, alt: media.alt, width: media.width, height: media.height, credit: media.credit }).from(listingMedia)
    .innerJoin(media, eq(listingMedia.mediaId, media.id)).where(eq(listingMedia.listingId, id)).orderBy(asc(listingMedia.sort));
  return { ...row.l, image: row.img, gallery };
});

export async function facetCounts(type?: string) {
  const where = type ? and(live(listings), eq(listings.type, type as any)) : live(listings);
  return db.select({ subcategory: listings.subcategory, n: sql<number>`count(*)::int` }).from(listings).where(where)
    .groupBy(listings.subcategory).orderBy(desc(sql`count(*)`));
}

export async function regions() {
  return db.selectDistinct({ region: listings.region }).from(listings).where(and(live(listings), sql`${listings.region} is not null`)).orderBy(asc(listings.region));
}

export async function nearbyListings(lat: number, lon: number, excludeId: number, limit = 4, type?: string) {
  const dist = sql<number>`(${listings.latitude} - ${lat})^2 + ((${listings.longitude} - ${lon}) * 0.84)^2`;
  const where = [live(listings), sql`${listings.latitude} is not null`, sql`${listings.id} <> ${excludeId}`];
  if (type) where.push(eq(listings.type, type as any));
  return db.select(listingCardCols).from(listings).leftJoin(media, eq(listings.primaryMediaId, media.id))
    .where(and(...where)).orderBy(dist).limit(limit) as Promise<ListingCard[]>;
}

/* ───────────── Events ───────────── */
export type EventCard = { id: number; slug: string; title: string; startDate: string | null; endDate: string | null; timesText: string | null; recurrenceText: string | null; locationName: string | null; categories: string[]; image: string | null; imageAlt: string | null; latitude: number | null; longitude: number | null; admission: string | null };
const eventCols = { id: events.id, slug: events.slug, title: events.title, startDate: events.startDate, endDate: events.endDate, timesText: events.timesText, recurrenceText: events.recurrenceText, locationName: events.locationName, categories: events.categories, image: media.url, imageAlt: media.alt, latitude: events.latitude, longitude: events.longitude, admission: events.admission };

export async function queryEvents(qy: { from?: string; to?: string; category?: string; q?: string; site?: 'visit' | 'edo'; limit?: number; offset?: number; includePast?: boolean } = {}) {
  const where: SQL[] = [live(events), eq(events.site, qy.site ?? 'visit')];
  if (!qy.includePast) where.push(or(gte(events.endDate, qy.from ?? sql`current_date`), and(isNull(events.endDate), gte(events.startDate, qy.from ?? sql`current_date`)), isNull(events.startDate))!);
  if (qy.to) where.push(lte(events.startDate, qy.to));
  if (qy.category) where.push(sql`${events.categories} ? ${qy.category}`);
  if (qy.q) { const like = `%${qy.q.replace(/[%_]/g, '')}%`; where.push(or(ilike(events.title, like), ilike(events.descriptionHtml, like), ilike(events.locationName, like))!); }
  const [rows, [{ count }]] = await Promise.all([
    db.select(eventCols).from(events).leftJoin(media, eq(events.primaryMediaId, media.id)).where(and(...where))
      .orderBy(sql`${events.startDate} asc nulls last`, asc(events.title)).limit(qy.limit ?? 24).offset(qy.offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(events).where(and(...where)),
  ]);
  return { rows: rows as EventCard[], total: count };
}

export const getEvent = cache(async (id: number) => {
  const [row] = await db.select({ e: events, img: media }).from(events).leftJoin(media, eq(events.primaryMediaId, media.id)).where(and(eq(events.id, id), live(events))).limit(1);
  return row ? { ...row.e, image: row.img } : null;
});

export async function eventCategories() {
  const r = await db.execute<{ c: string; n: number }>(sql`select c, count(*)::int n from events, jsonb_array_elements_text(categories) c where status='published' and site='visit' group by c order by n desc`);
  return r.rows;
}

/* ───────────── Articles ───────────── */
export async function queryArticles(qy: { site?: 'visit' | 'edo'; category?: string; q?: string; limit?: number; offset?: number } = {}) {
  const where: SQL[] = [live(articles), eq(articles.site, qy.site ?? 'visit')];
  if (qy.category) where.push(sql`${articles.categories} ? ${qy.category}`);
  if (qy.q) where.push(ilike(articles.title, `%${qy.q.replace(/[%_]/g, '')}%`));
  const [rows, [{ count }]] = await Promise.all([
    db.select({ id: articles.id, slug: articles.slug, title: articles.title, excerpt: articles.excerpt, publishedOn: articles.publishedOn, categories: articles.categories, author: articles.author, image: media.url, imageAlt: media.alt })
      .from(articles).leftJoin(media, eq(articles.heroMediaId, media.id)).where(and(...where))
      .orderBy(sql`${articles.publishedOn} desc nulls last`).limit(qy.limit ?? 12).offset(qy.offset ?? 0),
    db.select({ count: sql<number>`count(*)::int` }).from(articles).where(and(...where)),
  ]);
  return { rows, total: count };
}

export const getArticle = cache(async (site: 'visit' | 'edo', slug: string) => {
  const [row] = await db.select({ a: articles, img: media }).from(articles).leftJoin(media, eq(articles.heroMediaId, media.id))
    .where(and(eq(articles.site, site), eq(articles.slug, slug), live(articles))).limit(1);
  return row ? { ...row.a, image: row.img } : null;
});

/* ───────────── Pages & navigation ───────────── */
export const getPage = cache(async (site: 'visit' | 'edo', path: string) => {
  const [row] = await db.select({ p: pages, img: media }).from(pages).leftJoin(media, eq(pages.heroMediaId, media.id))
    .where(and(eq(pages.site, site), eq(pages.path, path), live(pages))).limit(1);
  return row ? { ...row.p, hero: row.img } : null;
});

export async function childPages(site: 'visit' | 'edo', parentPath: string) {
  const rows = await db.select({ path: pages.path, title: pages.title, summary: pages.summary, image: media.url, imageAlt: media.alt }).from(pages)
    .leftJoin(media, eq(pages.heroMediaId, media.id))
    .where(and(eq(pages.site, site), live(pages), sql`${pages.path} like ${parentPath + '%'}`, sql`${pages.path} <> ${parentPath}`,
      sql`array_length(string_to_array(trim(both '/' from ${pages.path}), '/'), 1) = array_length(string_to_array(trim(both '/' from ${parentPath}), '/'), 1) + 1`))
    .orderBy(asc(pages.title));
  return rows;
}

export const getNav = cache(async (site: 'visit' | 'edo', menu: string) => {
  const rows = await db.select().from(navItems).where(and(eq(navItems.site, site), eq(navItems.menu, menu), eq(navItems.visible, true))).orderBy(asc(navItems.sort));
  const top = rows.filter((r) => !r.parentId);
  return top.map((t) => ({ ...t, children: rows.filter((r) => r.parentId === t.id) }));
});

export const getSetting = cache(async <T,>(site: 'visit' | 'edo', key: string, fallback: T): Promise<T> => {
  const [row] = await db.select().from(schema.settings).where(and(eq(schema.settings.site, site), eq(schema.settings.key, key))).limit(1);
  return (row?.value as T) ?? fallback;
});

export async function siteSearch(q: string, site: 'visit' | 'edo' = 'visit', limit = 30) {
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const [ls, ev, ar, pg] = await Promise.all([
    site === 'visit' ? queryListings({ q, limit: 12 }).then((r) => r.rows) : Promise.resolve([]),
    queryEvents({ q, site, limit: 8 }).then((r) => r.rows),
    queryArticles({ q, site, limit: 8 }).then((r) => r.rows),
    db.select({ path: pages.path, title: pages.title, summary: pages.summary }).from(pages)
      .where(and(eq(pages.site, site), live(pages), or(ilike(pages.title, like), ilike(pages.bodyHtml, like))!)).limit(limit),
  ]);
  return { listings: ls, events: ev, articles: ar, pages: pg };
}
