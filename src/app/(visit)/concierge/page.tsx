import type { Metadata } from 'next';
import { PageHero } from '@/components/visit/PageHero';
import { Concierge } from '@/components/visit/Concierge';
export const metadata: Metadata = { title: 'Ask the Concierge', description: 'Ask questions about visiting Chandler and get suggestions drawn from the official Visit Chandler directory.', alternates: { canonical: '/concierge/' } };
export default function Page() { return (<><PageHero title="Ask the concierge" eyebrow="Trip help" intro="Questions about your visit? Get suggestions drawn only from official Visit Chandler listings, events and stories." crumbs={[{ label: 'Home', href: '/' }, { label: 'Plan Your Visit', href: '/plan-your-visit/' }, { label: 'Concierge', href: '/concierge/' }]} /><Concierge /></>); }
