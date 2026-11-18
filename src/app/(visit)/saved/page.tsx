import type { Metadata } from 'next';
import { PageHero } from '@/components/visit/PageHero';
import { SavedList } from '@/components/visit/SavedList';
export const metadata: Metadata = { title: 'Saved places', robots: { index: false } };
export default function Saved() {
  return (<><PageHero title="Your saved places" eyebrow="Favourites" intro="Everything you’ve hearted across Visit Chandler — share the list with your travel companions or turn it into an itinerary." crumbs={[{ label: 'Home', href: '/' }, { label: 'Saved places', href: '/saved/' }]} /><SavedList /></>);
}
