import type { Metadata } from 'next';
import { PageHero } from '@/components/visit/PageHero';
import { TripPlanner } from '@/components/visit/TripPlanner';
export const metadata: Metadata = { title: 'Trip Planner', description: 'Build, save, share and print your Chandler itinerary — no account needed.', alternates: { canonical: '/trip-planner/' } };
export default function Page() {
  return (<><PageHero title="Plan your Chandler trip" eyebrow="Trip planner" intro="Pick your dates and interests, add the places you love, arrange each day — then share or print it. No account needed." crumbs={[{ label: 'Home', href: '/' }, { label: 'Plan Your Visit', href: '/plan-your-visit/' }, { label: 'Trip planner', href: '/trip-planner/' }]} /><TripPlanner /></>);
}
