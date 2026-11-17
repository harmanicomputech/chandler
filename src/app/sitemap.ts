import type { MetadataRoute } from 'next';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';

export const revalidate = 3600;
/** Visit Chandler XML sitemap — every published, indexable URL from the CMS (legacy URLs preserved). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com';
  const [pages, listings, events, articles] = await Promise.all([
    db.select({ path: schema.pages.path, u: schema.pages.updatedAt }).from(schema.pages).where(and(eq(schema.pages.site, 'visit'), eq(schema.pages.status, 'published'), eq(schema.pages.noindex, false))),
    db.select({ id: schema.listings.id, slug: schema.listings.slug, u: schema.listings.updatedAt }).from(schema.listings).where(eq(schema.listings.status, 'published')),
    db.select({ id: schema.events.id, slug: schema.events.slug, u: schema.events.updatedAt }).from(schema.events).where(and(eq(schema.events.status, 'published'), eq(schema.events.site, 'visit'))),
    db.select({ slug: schema.articles.slug, u: schema.articles.updatedAt }).from(schema.articles).where(and(eq(schema.articles.status, 'published'), eq(schema.articles.site, 'visit'))),
  ]);
  return [
    ...pages.map((p) => ({ url: base + p.path, lastModified: p.u, priority: p.path === '/' ? 1 : 0.7 })),
    ...['/trip-planner/', '/map/', '/concierge/'].map((p) => ({ url: base + p, priority: 0.6 })),
    ...listings.map((l) => ({ url: `${base}/listing/${encodeURIComponent(l.slug)}/${l.id}/`, lastModified: l.u, priority: 0.6 })),
    ...events.map((e) => ({ url: `${base}/event/${encodeURIComponent(e.slug)}/${e.id}/`, lastModified: e.u, priority: 0.6 })),
    ...articles.map((a) => ({ url: `${base}/blog/post/${a.slug}/`, lastModified: a.u, priority: 0.5 })),
  ];
}
