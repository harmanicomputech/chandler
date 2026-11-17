'use client';
import { MapView } from '@/components/shared/MapView';
import { EDO_BASE } from '@/lib/edo';
export function DistrictMap({ districts }: { districts: { slug: string; name: string; lat: number; lng: number }[] }) {
  const points = districts.map((d, i) => ({ kind: 'district', id: i + 1, name: d.name, cat: 'district', lat: d.lat, lng: d.lng, href: `${EDO_BASE}/employment-and-business-districts/${d.slug}/`, address: 'Employment & business district (approximate centre)' }));
  return <MapView points={points} site="edo" categories={[{ key: 'district', label: 'Districts', color: '#003C5C', match: () => true }]} height="460px" compact center={[33.30, -111.86]} zoom={11} />;
}
