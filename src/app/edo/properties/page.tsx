import type { Metadata } from 'next';
import { queryProperties, getDistricts } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { PropertyExplorer } from '@/components/edo/PropertyExplorer';
import { edo } from '@/lib/edo';
export const metadata: Metadata = { title: 'Property Explorer', description: 'Search, map and compare office, industrial, retail and land opportunities in Chandler, Arizona.' };
export default async function Properties() {
  const [rows, districts] = await Promise.all([queryProperties(), getDistricts()]);
  return (<>
    <EdoHero title="Sites & property explorer" eyebrow="Site selection" summary="Filter by property type, district and size; view on the map; shortlist and compare side by side; then send an enquiry to the Economic Development team." crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Properties', href: edo('/properties/') }]} />
    <PropertyExplorer properties={rows.map((r) => ({ ...r.p, acreage: r.p.acreage ? Number(r.p.acreage) : null, district: r.district, districtSlug: r.districtSlug, img: r.img }))} districts={districts.map(({ d }) => ({ slug: d.slug, name: d.name }))} />
  </>);
}
