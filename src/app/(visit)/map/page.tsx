import type { Metadata } from 'next';
import { PageHero } from '@/components/visit/PageHero';
import { HomeMap } from '@/components/visit/HomeMap';
import { FullMap } from '@/components/visit/FullMap';
export const metadata: Metadata = { title: 'Interactive Map of Chandler', description: 'Explore hotels, restaurants, parks, attractions and events on an interactive map of Chandler, Arizona.', alternates: { canonical: '/map/' } };
export default function MapPage() {
  void HomeMap;
  return (<>
    <PageHero title="Explore Chandler on the map" eyebrow="Interactive map" intro="Filter by what you love, tap a pin for details and directions, or switch to the list view." crumbs={[{ label: 'Home', href: '/' }, { label: 'Things To Do', href: '/things-to-do/' }, { label: 'Map', href: '/map/' }]} />
    <div className="mx-auto max-w-[1440px] px-5 py-10 sm:px-8"><div className="overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line"><FullMap /></div>
      <p className="mt-4 text-sm text-ink-soft">Parking: see <a href="/plan-your-visit/chandler-transportation/downtown-chandler-parking/" className="underline">Downtown Chandler parking</a>. Map data © OpenStreetMap contributors.</p></div>
  </>);
}
