import type { Metadata } from 'next';
import Link from 'next/link';
import { getEdoEvents } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { EdoEventRow } from '@/components/edo/EdoEventRow';
import { edo } from '@/lib/edo';
export const metadata: Metadata = { title: 'Business Events', description: 'Workshops, one-on-one meetings and innovation events from the City of Chandler Economic Development Division.' };
export const revalidate = 600;
export default async function EdoEvents() {
  const { upcoming, ongoing, past } = await getEdoEvents();
  const Section = ({ title, rows, muted, empty }: { title: string; rows: typeof upcoming; muted?: boolean; empty: string }) => (
    <section className="mt-12" aria-labelledby={`h-${title}`}><h2 id={`h-${title}`} className="font-[family-name:var(--font-edo-display)] text-2xl font-bold text-edo-navy">{title}</h2>
      {rows.length ? <ul className="mt-5 space-y-px bg-edo-line">{rows.map(({ e }) => <EdoEventRow key={e.id} e={e} muted={muted} />)}</ul> : <p className="mt-4 text-edo-slate">{empty}</p>}</section>
  );
  return (<>
    <EdoHero title="Business events" eyebrow="News & events" summary="Workshops, one-on-one meetings with the Economic Development team, and Chandler's innovation programs." crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Events', href: edo('/events/') }]} />
    <div className="mx-auto max-w-[1100px] px-5 pb-20 sm:px-8">
      <Section title="Upcoming" rows={upcoming} empty="No dated events are scheduled right now — see ongoing programs below." />
      <Section title="Ongoing programs" rows={ongoing} empty="—" />
      <Section title="Past events" rows={past} muted empty="—" />
      <p className="mt-12 text-sm text-edo-slate">Visitor and community events (festivals, concerts, markets) are on the <Link href="/events/" className="text-edo-skytext underline">Visit Chandler events calendar</Link>. Event information is published by the City of Chandler; confirm details with the organizer.</p>
    </div>
  </>);
}
