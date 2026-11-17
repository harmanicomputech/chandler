'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Search, Menu, X, Heart, ChevronDown, ArrowUpRight } from 'lucide-react';

export type NavNode = { id: number; label: string; href: string; children: { id: number; label: string; href: string }[] };

export function SiteHeader({ main, utility, overlay }: { main: NavNode[]; utility: NavNode[]; overlay?: boolean }) {
  const pathname = usePathname();
  const isOverlay = overlay ?? pathname === '/';
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [saved, setSaved] = useState(0);
  const lastY = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setHidden(y > 400 && y > lastY.current + 4);
      if (y < lastY.current - 4) setHidden(false);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const read = () => { try { setSaved(JSON.parse(localStorage.getItem('vc:saved') || '[]').length); } catch { setSaved(0); } };
    read();
    window.addEventListener('vc:saved-changed', read);
    window.addEventListener('storage', read);
    return () => { window.removeEventListener('vc:saved-changed', read); window.removeEventListener('storage', read); };
  }, []);

  useEffect(() => { setOpen(null); setDrawer(false); }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(null); setDrawer(false); } };
    window.addEventListener('keydown', onKey);
    document.documentElement.style.overflow = drawer ? 'hidden' : '';
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer]);

  const solid = !isOverlay || scrolled || open !== null;
  const enter = (i: number) => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(i); };
  const leave = () => { closeTimer.current = setTimeout(() => setOpen(null), 160); };

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-white focus:px-5 focus:py-3 focus:text-navy focus:shadow-xl">Skip to content</a>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[transform,background-color,box-shadow,color] duration-500 ease-[var(--ease-out-expo)] ${hidden && open === null ? '-translate-y-full' : ''} ${solid ? 'bg-white/95 text-navy shadow-[0_1px_0_rgba(23,43,77,0.08),0_12px_40px_-20px_rgba(23,43,77,0.25)] backdrop-blur-xl' : 'bg-transparent text-white'}`}
        onMouseLeave={leave}
      >
        {/* Utility bar */}
        <div className={`hidden overflow-hidden transition-all duration-500 lg:block ${scrolled ? 'max-h-0 opacity-0' : 'max-h-10 opacity-100'}`}>
          <div className="mx-auto flex max-w-[1440px] items-center justify-end gap-6 px-8 pt-3 text-[13px] font-medium">
            {utility.map((u) => (
              <Link key={u.id} href={u.href} className="opacity-80 transition-opacity hover:opacity-100">{u.label}</Link>
            ))}
            <span className="h-3 w-px bg-current opacity-30" />
            <Link href="/visita-chandler/" lang="es" className="opacity-80 hover:opacity-100">Español</Link>
            <Link href="/entdecken-chandler/" lang="de" className="opacity-80 hover:opacity-100">Deutsch</Link>
          </div>
        </div>

        <div className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-6 px-5 sm:px-8">
          <Link href="/" className="relative z-10 shrink-0" aria-label="Visit Chandler home">
            <Image src={solid ? '/brand/visit-chandler-logo.svg' : '/brand/visit-chandler-logo-white.svg'} alt="Visit Chandler" width={150} height={60} priority className="h-11 w-auto sm:h-12" />
          </Link>

          <nav aria-label="Main" className="ml-auto hidden lg:block">
            <ul className="flex items-center gap-1">
              {main.map((item, i) => (
                <li key={item.id} onMouseEnter={() => enter(i)}>
                  <Link
                    href={item.href}
                    aria-expanded={item.children.length ? open === i : undefined}
                    onFocus={() => item.children.length && enter(i)}
                    className={`group relative flex items-center gap-1 rounded-full px-4 py-2.5 text-[15px] font-semibold tracking-tight transition-colors ${pathname.startsWith(item.href) ? 'text-teal-700' : ''} ${solid ? 'hover:bg-blue-50' : 'hover:bg-white/10'}`}
                  >
                    {item.label}
                    {item.children.length > 0 && <ChevronDown aria-hidden className={`size-4 transition-transform duration-300 ${open === i ? 'rotate-180' : ''}`} />}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1 lg:ml-2">
            <Link href="/search/" aria-label="Search Visit Chandler" className={`grid size-11 place-items-center rounded-full transition-colors ${solid ? 'hover:bg-blue-50' : 'hover:bg-white/10'}`}><Search className="size-5" /></Link>
            <Link href="/trip-planner/" aria-label={`Saved places and trip planner (${saved} saved)`} className={`relative grid size-11 place-items-center rounded-full transition-colors ${solid ? 'hover:bg-blue-50' : 'hover:bg-white/10'}`}>
              <Heart className="size-5" />
              {saved > 0 && <span className="absolute right-1.5 top-1.5 grid min-w-[18px] place-items-center rounded-full bg-teal-400 px-1 text-[10px] font-bold text-navy">{saved}</span>}
            </Link>
            <Link href="/plan-your-visit/" className="ml-2 hidden rounded-full bg-teal-400 px-5 py-2.5 text-sm font-bold text-navy transition-all hover:-translate-y-0.5 hover:bg-teal-300 hover:shadow-lg hover:shadow-teal-400/30 xl:inline-flex">Plan your trip</Link>
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="mobile-nav" className="grid size-11 place-items-center rounded-full lg:hidden"><Menu className="size-6" /></button>
          </div>
        </div>

        {/* Mega menu */}
        {main.map((item, i) => item.children.length > 0 && (
          <div key={item.id} onMouseEnter={() => enter(i)} hidden={open !== i}
            className="absolute inset-x-0 top-full hidden border-t border-line bg-white text-navy shadow-[0_30px_60px_-30px_rgba(23,43,77,0.35)] lg:block">
            <div className="mx-auto grid max-w-[1440px] grid-cols-12 gap-10 px-8 py-10">
              <div className="col-span-4 border-r border-line pr-10">
                <p className="eyebrow text-teal-700">Explore</p>
                <p className="mt-3 font-display text-5xl leading-none">{item.label}</p>
                <Link href={item.href} className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-blue-500 hover:gap-3 transition-all">See all {item.label.toLowerCase()} <ArrowUpRight className="size-4" /></Link>
              </div>
              <ul className="col-span-8 grid grid-cols-3 gap-x-8 gap-y-1">
                {item.children.map((c, ci) => (
                  <li key={c.id} style={{ animation: open === i ? `rise .5s var(--ease-out-expo) ${ci * 25}ms both` : undefined }}>
                    <Link href={c.href} className="group flex items-center justify-between rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:bg-mist hover:text-navy">
                      {c.label}<ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </header>

      {/* Mobile drawer */}
      <div id="mobile-nav" role="dialog" aria-modal="true" aria-label="Menu" hidden={!drawer} className="fixed inset-0 z-[60] lg:hidden">
        <div className="absolute inset-0 bg-navy/60 backdrop-blur-sm" onClick={() => setDrawer(false)} />
        <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-y-auto bg-white text-navy" style={{ animation: 'rise .45s var(--ease-out-expo) both' }}>
          <div className="flex h-[76px] items-center justify-between px-5">
            <Image src="/brand/visit-chandler-logo.svg" alt="Visit Chandler" width={130} height={52} className="h-10 w-auto" />
            <button onClick={() => setDrawer(false)} aria-label="Close menu" className="grid size-11 place-items-center rounded-full bg-mist"><X className="size-5" /></button>
          </div>
          <nav aria-label="Mobile" className="px-5 pb-10">
            {main.map((item) => (
              <details key={item.id} className="group border-b border-line">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 font-display text-3xl">
                  {item.label}<ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="grid grid-cols-1 pb-4">
                  <li><Link href={item.href} className="block py-2 font-semibold text-blue-500">All {item.label}</Link></li>
                  {item.children.map((c) => <li key={c.id}><Link href={c.href} className="block py-2 text-ink-soft">{c.label}</Link></li>)}
                </ul>
              </details>
            ))}
            <ul className="mt-6 grid grid-cols-2 gap-2">
              {utility.map((u) => <li key={u.id}><Link href={u.href} className="block rounded-xl bg-mist px-4 py-3 text-sm font-semibold">{u.label}</Link></li>)}
            </ul>
            <Link href="/trip-planner/" className="mt-6 flex items-center justify-center rounded-full bg-teal-400 py-4 font-bold">Plan your trip</Link>
          </nav>
        </div>
      </div>
    </>
  );
}
