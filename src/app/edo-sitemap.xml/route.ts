import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
export const revalidate = 3600;
/** Economic Development XML sitemap (served at the EDO host root). */
export async function GET() {
  const base = process.env.EDO_SITE_URL ?? 'https://business.chandleraz.gov';
  const prefix = process.env.NEXT_PUBLIC_EDO_BASE_PATH ?? '';
  const [pages, props, news] = await Promise.all([
    db.select({ path: schema.pages.path, u: schema.pages.updatedAt }).from(schema.pages).where(and(eq(schema.pages.site, 'edo'), eq(schema.pages.status, 'published'))),
    db.select({ slug: schema.properties.slug, u: schema.properties.updatedAt }).from(schema.properties).where(and(eq(schema.properties.status, 'published'), eq(schema.properties.isFixture, false))),
    db.select({ slug: schema.articles.slug, u: schema.articles.updatedAt }).from(schema.articles).where(and(eq(schema.articles.site, 'edo'), eq(schema.articles.status, 'published'))),
  ]);
  const urls = [...pages.map((p) => [p.path, p.u] as const), ...['/properties/', '/data/', '/reports/', '/news/'].map((p) => [p, null] as const), ...props.map((p) => [`/properties/${p.slug}/`, p.u] as const), ...news.map((n) => [`/news/${n.slug}/`, n.u] as const)];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(([p, u]) => `<url><loc>${base}${prefix}${p}</loc>${u ? `<lastmod>${new Date(u).toISOString()}</lastmod>` : ''}</url>`).join('')}</urlset>`;
  return new Response(xml, { headers: { 'content-type': 'application/xml' } });
}
