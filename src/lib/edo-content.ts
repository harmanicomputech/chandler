import 'server-only';
import { cache } from 'react';
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/db';

const { properties, districts, industries, economicIndicators, reports, staffProfiles, media } = schema;
const live = (t: { status: any }) => eq(t.status, 'published');

export const getIndicators = cache(async (category?: string) =>
  db.select().from(economicIndicators).where(category ? sql`${economicIndicators.category} like ${category + '%'}` : undefined).orderBy(asc(economicIndicators.key)));
export const getDistricts = cache(async () => db.select({ d: districts, img: media.url, imgAlt: media.alt }).from(districts).leftJoin(media, eq(districts.heroMediaId, media.id)).where(live(districts)).orderBy(asc(districts.name)));
export const getIndustries = cache(async () => db.select({ i: industries, img: media.url, imgAlt: media.alt }).from(industries).leftJoin(media, eq(industries.heroMediaId, media.id)).where(live(industries)).orderBy(asc(industries.name)));
export const getStaff = cache(async () => db.select().from(staffProfiles).where(eq(staffProfiles.site, 'edo')).orderBy(asc(staffProfiles.sort)));
export const getReports = cache(async () => db.select().from(reports).where(live(reports)).orderBy(sql`${reports.publishedOn} desc nulls last`, asc(reports.title)));

export type PropertyQuery = { type?: string; district?: string; minSqft?: number; maxSqft?: number; q?: string; ids?: number[]; sort?: string };
export async function queryProperties(qy: PropertyQuery = {}) {
  const where: SQL[] = [live(properties)];
  if (qy.type) where.push(eq(properties.type, qy.type as any));
  if (qy.district) where.push(eq(districts.slug, qy.district));
  if (qy.minSqft) where.push(gte(properties.availableSqft, qy.minSqft));
  if (qy.maxSqft) where.push(lte(properties.availableSqft, qy.maxSqft));
  if (qy.ids?.length) where.push(inArray(properties.id, qy.ids));
  if (qy.q) { const l = `%${qy.q.replace(/[%_]/g, '')}%`; where.push(or(ilike(properties.name, l), ilike(properties.description, l), ilike(properties.zoning, l))!); }
  const order = qy.sort === 'size_desc' ? desc(properties.availableSqft) : qy.sort === 'size_asc' ? asc(properties.availableSqft) : asc(properties.name);
  return db.select({ p: properties, district: districts.name, districtSlug: districts.slug, img: media.url }).from(properties)
    .leftJoin(districts, eq(properties.districtId, districts.id)).leftJoin(media, eq(properties.primaryMediaId, media.id))
    .where(and(...where)).orderBy(sql`${order}`, asc(properties.id));
}
export const getProperty = cache(async (slug: string) => (await db.select({ p: properties, district: districts.name, districtSlug: districts.slug, img: media.url }).from(properties)
  .leftJoin(districts, eq(properties.districtId, districts.id)).leftJoin(media, eq(properties.primaryMediaId, media.id)).where(and(eq(properties.slug, slug), live(properties))).limit(1))[0] ?? null);
void isNull;
