'use client';
import { MapView } from '@/components/shared/MapView';
import { VISIT_MAP_CATEGORIES } from './mapCategories';
import type { ListingCard } from '@/lib/content';
export function DirectoryMap({ rows }: { rows: ListingCard[] }) {
  const points = rows.filter((r) => r.latitude && r.longitude).map((r) => ({ kind: 'listing', id: r.id, name: r.name, cat: r.type, sub: r.subcategory, lat: r.latitude!, lng: r.longitude!, address: r.address, image: r.image, href: `/listing/${r.slug}/${r.id}/` }));
  return <MapView points={points} categories={VISIT_MAP_CATEGORIES.filter((c) => points.some(c.match))} height="70vh" />;
}
