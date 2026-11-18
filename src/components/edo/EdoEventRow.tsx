import Link from 'next/link';
import { CalendarDays, MapPin, Clock } from 'lucide-react';
import { edo } from '@/lib/edo';
type E = { slug: string; title: string; startDate: string | null; timesText: string | null; recurrenceText: string | null; locationName: string | null; categories: string[] };
export function EdoEventRow({ e, muted }: { e: E; muted?: boolean }) {
  const d = e.startDate ? new Date(e.startDate + 'T12:00:00') : null;
  return (
    <li className={`group relative grid grid-cols-[84px_1fr] gap-5 bg-white p-5 sm:grid-cols-[96px_1fr_auto] ${muted ? 'opacity-75' : ''}`}>
      <div className="flex flex-col items-center justify-center border border-edo-line py-3 text-center">
        {d ? <><span className="font-mono text-[11px] uppercase tracking-wider text-edo-skytext">{d.toLocaleDateString('en-US', { month: 'short' })}</span><span className="font-[family-name:var(--font-edo-display)] text-3xl font-bold text-edo-navy">{d.getDate()}</span><span className="font-mono text-[10px] text-edo-slate">{d.getFullYear()}</span></>
          : <span className="px-2 font-mono text-[10px] uppercase leading-tight text-edo-skytext">{e.recurrenceText?.split('—')[0].trim() ?? 'Ongoing'}</span>}
      </div>
      <div>
        <p className="font-mono text-[11px] uppercase tracking-wider text-edo-skytext">{e.categories.join(' · ')}</p>
        <Link href={edo(`/events/${e.slug}/`)} className="mt-1 block font-[family-name:var(--font-edo-display)] text-lg font-bold leading-snug text-edo-navy after:absolute after:inset-0 group-hover:underline">{e.title}</Link>
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-edo-slate">
          {d && <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />{d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>}
          {e.timesText && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" aria-hidden />{e.timesText}</span>}
          {e.locationName && <span className="inline-flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{e.locationName}</span>}
          {!d && e.recurrenceText && <span>{e.recurrenceText}</span>}
        </p>
      </div>
    </li>
  );
}
