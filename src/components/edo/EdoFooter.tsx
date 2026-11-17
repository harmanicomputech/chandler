import Link from 'next/link';
import { edo } from '@/lib/edo';
import { NewsletterEdo } from './NewsletterEdo';

export function EdoFooter({ nav }: { nav: { id: number; label: string; href: string; children: { id: number; label: string; href: string }[] }[] }) {
  return (
    <footer className="edo-grid-bg bg-edo-ink text-white">
      <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8">
        <div className="grid gap-12 border-b border-white/10 pb-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="font-[family-name:var(--font-edo-display)] text-3xl font-bold leading-tight">Community of Innovation.</p>
            <p className="mt-4 max-w-sm text-white/65">The City of Chandler Economic Development Division helps companies launch, relocate and expand in Chandler, Arizona.</p>
            <address className="mt-6 text-sm not-italic leading-relaxed text-white/70">Economic Development Division<br />175 S. Arizona Ave., Chandler, AZ 85225<br /><a href="tel:+14807823030" className="hover:text-white">480-782-3030</a> · <a href="mailto:economicdevelopment@chandleraz.gov" className="hover:text-white">economicdevelopment@chandleraz.gov</a></address>
            <a href="https://www.linkedin.com/showcase/chandler-az-economic-development/" rel="noopener" target="_blank" className="mt-6 inline-block border border-white/25 px-4 py-2 text-sm font-semibold hover:bg-white hover:text-edo-ink">LinkedIn<span className="sr-only"> (opens in new tab)</span></a>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-5">
            {nav.slice(0, 6).map((n) => <div key={n.id}><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-edo-gold"><Link href={edo(n.href)}>{n.label}</Link></p><ul className="mt-3 space-y-2">{n.children.slice(0, 5).map((c) => <li key={c.id}><Link href={edo(c.href)} className="text-sm text-white/65 hover:text-white">{c.label}</Link></li>)}</ul></div>)}
          </nav>
          <div className="lg:col-span-3"><p className="font-mono text-[11px] uppercase tracking-[0.18em] text-edo-gold">Business news by e-mail</p><div className="mt-4"><NewsletterEdo /></div></div>
        </div>
        <div className="flex flex-col gap-3 pt-8 text-xs text-white/50 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} City of Chandler, Arizona.</p>
          <ul className="flex flex-wrap gap-5"><li><a href="https://www.chandleraz.gov/privacy-policy" className="hover:text-white">Privacy</a></li><li><a href="https://www.chandleraz.gov/accessibility" className="hover:text-white">Accessibility</a></li><li><Link href={edo('/sitemap/')} className="hover:text-white">Sitemap</Link></li><li><Link href="/" className="hover:text-white">Visit Chandler</Link></li></ul></div>
      </div>
    </footer>
  );
}
