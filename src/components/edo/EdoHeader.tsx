'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, ChevronDown, ArrowRight } from 'lucide-react';
import { EDO_BASE } from '@/lib/edo';

type Nav = { id: number; label: string; href: string; children: { id: number; label: string; href: string }[] };
export function EdoHeader({ nav }: { nav: Nav[] }) {
  const path = usePathname();
  const [open, setOpen] = useState<number | null>(null); const [drawer, setDrawer] = useState(false); const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const f = () => setScrolled(window.scrollY > 8); f(); window.addEventListener('scroll', f, { passive: true }); return () => window.removeEventListener('scroll', f); }, []);
  useEffect(() => { setOpen(null); setDrawer(false); }, [path]);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(null), setDrawer(false)); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  const h = (p: string) => EDO_BASE + p;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:text-edo-navy">Skip to content</a>
      <div className="bg-edo-ink text-[12px] text-white/70"><div className="mx-auto flex max-w-[1440px] items-center justify-between px-5 py-2 sm:px-8">
        <span>An official website of the <a href="https://www.chandleraz.gov/" className="underline-offset-2 hover:underline">City of Chandler, Arizona</a></span>
        <span className="hidden gap-5 sm:flex"><a href="tel:+14807823030" className="hover:text-white">480-782-3030</a><Link href={h('/contact-us/')} className="hover:text-white">Team directory</Link><Link href="/" className="hover:text-white">Visit Chandler ↗</Link></span>
      </div></div>
      <header className={`sticky top-0 z-50 border-b bg-white transition-shadow ${scrolled ? 'border-edo-line shadow-[0_8px_30px_-12px_rgba(0,60,92,.25)]' : 'border-transparent'}`} onMouseLeave={() => setOpen(null)}>
        <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-6 px-5 sm:px-8">
          <Link href={h('/')} className="flex shrink-0 items-center gap-3">
            <span aria-hidden className="grid size-10 place-items-center bg-edo-navy font-[family-name:var(--font-edo-display)] text-lg font-bold text-white">C</span>
            <span className="leading-none"><span className="block font-[family-name:var(--font-edo-display)] text-[17px] font-bold tracking-tight text-edo-navy">Chandler</span><span className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-edo-skytext">Economic Development</span></span>
          </Link>
          <nav aria-label="Main" className="ml-auto hidden xl:block"><ul className="flex">
            {nav.map((n, i) => (
              <li key={n.id} onMouseEnter={() => setOpen(n.children.length ? i : null)}>
                <Link href={h(n.href)} onFocus={() => setOpen(n.children.length ? i : null)} aria-expanded={n.children.length ? open === i : undefined}
                  className={`flex items-center gap-1 whitespace-nowrap px-2.5 py-6 text-[13.5px] font-semibold text-edo-ink transition-colors hover:text-edo-skytext ${path.startsWith(h(n.href)) ? 'text-edo-skytext shadow-[inset_0_-3px_0_var(--color-edo-sky)]' : ''}`}>
                  {n.label}{n.children.length > 0 && <ChevronDown className="size-3.5 opacity-60" aria-hidden />}
                </Link>
              </li>
            ))}
          </ul></nav>
          <Link href={h('/contact-us/initiate-a-project/')} className="ml-auto hidden items-center gap-2 whitespace-nowrap bg-edo-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-edo-sky xl:ml-3 xl:inline-flex">Initiate a project <ArrowRight className="size-4" aria-hidden /></Link>
          <button onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} className="ml-auto grid size-11 place-items-center xl:hidden"><Menu /></button>
        </div>
        {nav.map((n, i) => n.children.length > 0 && (
          <div key={n.id} hidden={open !== i} onMouseEnter={() => setOpen(i)} className="absolute inset-x-0 top-full hidden border-t border-edo-line bg-white shadow-2xl xl:block">
            <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-8 px-8 py-8">
              <div className="col-span-3 border-r border-edo-line pr-8"><p className="font-mono text-[11px] uppercase tracking-[0.2em] text-edo-skytext">Section</p><p className="mt-2 font-[family-name:var(--font-edo-display)] text-2xl font-bold text-edo-navy">{n.label}</p><Link href={h(n.href)} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-edo-skytext">Overview <ArrowRight className="size-4" aria-hidden /></Link></div>
              <ul className="col-span-9 grid grid-cols-3 gap-x-6 gap-y-1">{n.children.map((c) => <li key={c.id}><Link href={h(c.href)} className="block border-l-2 border-transparent px-3 py-2.5 text-[14px] text-edo-slate transition hover:border-edo-sky hover:bg-edo-paper hover:text-edo-navy">{c.label}</Link></li>)}</ul>
            </div>
          </div>
        ))}
      </header>
      <div role="dialog" aria-modal="true" aria-label="Menu" hidden={!drawer} className="fixed inset-0 z-[60] xl:hidden">
        <div className="absolute inset-0 bg-edo-ink/70" onClick={() => setDrawer(false)} />
        <div className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto bg-white p-5">
          <div className="flex justify-end"><button onClick={() => setDrawer(false)} aria-label="Close menu" className="grid size-11 place-items-center"><X /></button></div>
          <nav aria-label="Mobile">{nav.map((n) => (
            <details key={n.id} className="border-b border-edo-line"><summary className="flex cursor-pointer list-none items-center justify-between py-4 text-lg font-semibold text-edo-navy">{n.label}<ChevronDown className="size-4" aria-hidden /></summary>
              <ul className="pb-3"><li><Link href={h(n.href)} className="block py-2 font-semibold text-edo-skytext">Overview</Link></li>{n.children.map((c) => <li key={c.id}><Link href={h(c.href)} className="block py-2 text-edo-slate">{c.label}</Link></li>)}</ul></details>
          ))}</nav>
          <Link href={h('/contact-us/initiate-a-project/')} className="mt-6 block bg-edo-navy py-4 text-center font-semibold text-white">Initiate a project</Link>
        </div>
      </div>
    </>
  );
}
