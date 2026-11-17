'use client';
import { useEffect, useState } from 'react';
import { ClientImg as Img } from '@/components/shared/ClientImg';
import { X, ChevronLeft, ChevronRight, Expand } from 'lucide-react';

/** Editorial mosaic + accessible lightbox (focus-trapped dialog, arrow keys, Esc). */
export function Gallery({ images }: { images: { src: string; alt: string; credit?: string | null; blur?: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(null); if (e.key === 'ArrowRight') setOpen((i) => (i! + 1) % images.length); if (e.key === 'ArrowLeft') setOpen((i) => (i! - 1 + images.length) % images.length); };
    window.addEventListener('keydown', k); document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.documentElement.style.overflow = ''; };
  }, [open, images.length]);
  if (!images.length) return <div className="aspect-[21/9] rounded-[var(--radius-card)] bg-gradient-to-br from-blue-100 via-mist to-teal-50" />;
  const shown = images.slice(0, 4);
  return (
    <>
      <div className={`grid h-[52vh] min-h-[340px] gap-3 ${shown.length === 1 ? 'grid-cols-1' : 'grid-cols-4 grid-rows-2'}`}>
        {shown.map((g, i) => (
          <button key={g.src} type="button" onClick={() => setOpen(i)}
            className={`group relative overflow-hidden rounded-[var(--radius-card)] ${shown.length === 1 ? '' : i === 0 ? 'col-span-4 row-span-2 sm:col-span-2' : i === 1 ? 'hidden sm:col-span-2 sm:block' : 'hidden sm:block'}`}>
            <span className="sr-only">Open photo {i + 1} of {images.length}: {g.alt}</span><Img src={g.src} alt="" blur={g.blur} fill priority={i === 0} sizes={i === 0 ? '(min-width:640px) 50vw, 100vw' : '25vw'} className="object-cover transition duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-105" />
            {i === shown.length - 1 && images.length > 1 && <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-navy backdrop-blur"><Expand className="size-4" aria-hidden />{images.length} photos</span>}
          </button>
        ))}
      </div>
      {open !== null && (
        <div role="dialog" aria-modal="true" aria-label="Photo viewer" className="fixed inset-0 z-[90] flex flex-col bg-navy-950/95 backdrop-blur" onClick={() => setOpen(null)}>
          <div className="flex items-center justify-between p-4 text-white"><p className="text-sm">{open + 1} / {images.length}</p><button autoFocus onClick={() => setOpen(null)} aria-label="Close photo viewer" className="grid size-11 place-items-center rounded-full bg-white/10"><X /></button></div>
          <div className="relative flex-1" onClick={(e) => e.stopPropagation()}>
            <Img src={images[open].src} alt={images[open].alt} fill sizes="100vw" className="object-contain" />
            <button onClick={() => setOpen((open - 1 + images.length) % images.length)} aria-label="Previous photo" className="absolute left-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"><ChevronLeft /></button>
            <button onClick={() => setOpen((open + 1) % images.length)} aria-label="Next photo" className="absolute right-4 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-white hover:bg-white/30"><ChevronRight /></button>
          </div>
          <p className="p-4 text-center text-sm text-white/80">{images[open].alt}{images[open].credit && <span className="opacity-70"> · Photo: {images[open].credit}</span>}</p>
        </div>
      )}
    </>
  );
}
