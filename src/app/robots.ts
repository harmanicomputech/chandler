import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = ((await headers()).get('host') ?? '').split(':')[0];
  const edoHosts = (process.env.EDO_HOSTS ?? 'edo.localhost,business.localhost').split(',');
  const isEdo = edoHosts.includes(host);
  const base = isEdo ? process.env.EDO_SITE_URL ?? 'https://business.chandleraz.gov' : process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com';
  // Non-production environments must never be indexed.
  if (process.env.ALLOW_INDEXING !== 'true') return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/', '/search/', '/trip-planner/*/'] }], sitemap: isEdo ? `${base}/edo-sitemap.xml` : `${base}/sitemap.xml` };
}
