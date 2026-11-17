'use client';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/**
 * One IntersectionObserver for the whole page drives every [data-reveal] element, plus
 * [data-parallax] elements (transform on scroll via rAF) and [data-count] number tickers.
 * Elements are visible by default; hiding only happens after JS adds `js-reveal`, so content
 * is never lost without JS. Honours prefers-reduced-motion.
 */
export function RevealController() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.classList.add('is-visible');
        if (el.dataset.count && !reduce) countUp(el);
        io.unobserve(el);
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible), [data-count]').forEach((el) => io.observe(el));

    const parallax = reduce ? [] : Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      for (const el of parallax) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) continue;
        const speed = Number(el.dataset.parallax || 0.15);
        const offset = (r.top + r.height / 2 - vh / 2) * -speed;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(${el.dataset.parallaxScale || 1.12})`;
      }
      const bar = document.getElementById('scroll-progress');
      if (bar) bar.style.transform = `scaleX(${Math.min(1, window.scrollY / Math.max(1, document.body.scrollHeight - vh))})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { io.disconnect(); window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf); };
  }, [pathname]);
  return null;
}

function countUp(el: HTMLElement) {
  const target = Number(el.dataset.count);
  const decimals = Number(el.dataset.decimals || 0);
  const prefix = el.dataset.prefix || ''; const suffix = el.dataset.suffix || '';
  const dur = 1600; const t0 = performance.now();
  const fmt = (v: number) => prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
  const step = (t: number) => {
    const p = Math.min(1, (t - t0) / dur); const eased = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(target * eased);
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
  };
  requestAnimationFrame(step);
}
