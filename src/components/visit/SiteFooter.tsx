import Link from 'next/link';
import Image from 'next/image';
import { NewsletterForm } from './NewsletterForm';

type L = { label: string; href: string };
const SOCIAL: L[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/VisitChandler' },
  { label: 'Instagram', href: 'https://www.instagram.com/visitchandler/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@visitchandler' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/company/visit-chandler/' },
  { label: 'YouTube', href: 'https://www.youtube.com/@VisitChandler' },
  { label: 'Pinterest', href: 'https://www.pinterest.com/visitchandler/' },
];
const PARTNERS: L[] = [
  { label: 'City of Chandler', href: 'https://www.chandleraz.gov/' },
  { label: 'Chandler Chamber of Commerce', href: 'https://www.chandlerchamber.com/' },
  { label: 'Downtown Chandler Community Partnership', href: 'https://downtownchandler.org/' },
  { label: 'Arizona Office of Tourism', href: 'https://www.visitarizona.com/' },
];

export function SiteFooter({ columns, legal }: { columns: { label: string; href: string; children: L[] }[]; legal: L[] }) {
  return (
    <footer className="relative overflow-hidden bg-navy-950 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-blue-500/30 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-60 left-1/4 size-[520px] rounded-full bg-teal-400/15 blur-[120px]" />
      <div className="relative mx-auto max-w-[1440px] px-5 pb-10 pt-20 sm:px-8">
        <div className="grid gap-14 border-b border-white/10 pb-16 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow text-teal-300">Stay in the know</p>
            <h2 className="mt-4 max-w-md font-display text-5xl leading-[0.95] sm:text-6xl">Chandler, delivered to your inbox.</h2>
            <p className="mt-5 max-w-md text-white/70">Events, new openings and seasonal itineraries from the Visit Chandler team.</p>
            <div className="mt-8 max-w-md"><NewsletterForm tone="dark" /></div>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/visitors-guide/" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white hover:text-navy">Download the Visitors Guide</Link>
              <Link href="/request-guide/" className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white hover:text-navy">Request a printed guide</Link>
            </div>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:col-span-7">
            {columns.map((c) => (
              <div key={c.href}>
                <p className="text-sm font-bold"><Link href={c.href} className="hover:text-teal-300">{c.label}</Link></p>
                <ul className="mt-4 space-y-2.5">
                  {c.children.slice(0, 7).map((l) => <li key={l.href}><Link href={l.href} className="text-sm text-white/65 transition-colors hover:text-white">{l.label}</Link></li>)}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="grid gap-10 py-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Image src="/brand/visit-chandler-logo-white.svg" alt="Visit Chandler" width={200} height={78} className="h-16 w-auto" />
            <address className="mt-6 not-italic text-sm leading-relaxed text-white/70">
              Chandler, Arizona Tourism Office<br />175 S. Arizona Ave., Chandler, AZ 85225<br />
              <a href="tel:+14807823037" className="hover:text-white">480-782-3037</a>
            </address>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm font-bold">Follow #VisitChandler</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {SOCIAL.map((s) => <li key={s.href}><a href={s.href} rel="noopener" target="_blank" className="inline-block rounded-full bg-white/5 px-4 py-2 text-sm text-white/80 ring-1 ring-white/10 transition hover:bg-teal-400 hover:text-navy">{s.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
            </ul>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm font-bold">Our partners</p>
            <ul className="mt-4 space-y-2">
              {PARTNERS.map((p) => <li key={p.href}><a href={p.href} rel="noopener" target="_blank" className="text-sm text-white/65 hover:text-white">{p.label}<span className="sr-only"> (opens in a new tab)</span></a></li>)}
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/10 pt-8 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} City of Chandler, Arizona Tourism Office.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {legal.map((l) => <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>)}
          </ul>
        </div>
      </div>
      {/* Oversized wordmark */}
      <p aria-hidden className="pointer-events-none select-none whitespace-nowrap text-center font-display text-[22vw] leading-[0.75] text-white/[0.04]">Chandler</p>
    </footer>
  );
}
