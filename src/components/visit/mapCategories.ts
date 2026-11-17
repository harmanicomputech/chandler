import type { Category } from '@/components/shared/MapView';
export const VISIT_MAP_CATEGORIES: Category[] = [
  { key: 'stay', label: 'Hotels', color: '#214FA1', match: (p) => p.cat === 'hotel' },
  { key: 'eat', label: 'Restaurants', color: '#172B4D', match: (p) => p.cat === 'restaurant' || p.cat === 'nightlife' },
  { key: 'do', label: 'Attractions', color: '#00C1A0', match: (p) => ['attraction', 'arts', 'golf', 'recreation'].includes(p.cat) },
  { key: 'outdoors', label: 'Parks & trails', color: '#3F7D4E', match: (p) => p.cat === 'park' || p.cat === 'trail' },
  { key: 'shop', label: 'Shopping', color: '#85A3DD', match: (p) => p.cat === 'shopping' },
  { key: 'events', label: 'Events', color: '#0E8AA8', match: (p) => p.cat === 'event' },
  { key: 'more', label: 'Venues & services', color: '#8796AE', match: (p) => ['venue', 'services', 'other'].includes(p.cat) },
];
