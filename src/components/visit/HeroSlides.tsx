'use client';
import { useEffect, useState } from 'react';
import { ClientImg as Img } from '@/components/shared/ClientImg';
import { Pause, Play } from 'lucide-react';

/** Cross-fading Ken-Burns hero of official destination photography. Pausable (WCAG 2.2.2); static if reduced motion. */
export function HeroSlides({ slides }: { slides: { src: string; alt: string; caption?: string; blur?: string }[] }) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPlaying(false); return; }
  }, []);
  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % slides.length), 7000);
    return () => clearInterval(t);
  }, [playing, slides.length]);
  return (
    <>
      <div className="absolute inset-0 overflow-hidden" aria-roledescription="carousel" aria-label="Chandler photography">
        {slides.map((s, n) => (
          <div key={s.src} aria-hidden={n !== i} className="absolute inset-0 transition-opacity duration-[1600ms] ease-in-out" style={{ opacity: n === i ? 1 : 0 }}>
            <div className="absolute inset-0" style={{ animation: n === i && playing ? 'kenburns 9s ease-out both' : undefined }}>
              <Img src={s.src} alt={s.alt} blur={s.blur} fill priority={n === 0} sizes="100vw" className="object-cover" />
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-8 right-5 z-20 flex items-center gap-3 sm:right-8">
        <p className="hidden max-w-xs text-right text-xs text-white/70 md:block" aria-live="polite">{slides[i]?.caption ?? slides[i]?.alt}</p>
        <div className="flex gap-1.5">{slides.map((s, n) => <button key={s.src} onClick={() => setI(n)} aria-label={`Show photo ${n + 1}: ${s.alt}`} aria-current={n === i} className={`h-1.5 rounded-full transition-all duration-500 ${n === i ? 'w-8 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />)}</div>
        <button onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause slideshow' : 'Play slideshow'} className="grid size-9 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/25 backdrop-blur hover:bg-white/25">{playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
      </div>
    </>
  );
}
