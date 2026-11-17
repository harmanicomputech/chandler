'use client';
import { useState } from 'react';
import { Share2, Check } from 'lucide-react';
export function ShareButtons({ title, light }: { title: string; light?: boolean }) {
  const [done, setDone] = useState(false);
  const share = async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); setDone(true); setTimeout(() => setDone(false), 2500); } } catch {}
  };
  return <button type="button" onClick={share} className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ring-1 ${light ? 'text-navy ring-line hover:bg-mist' : 'bg-white/10 ring-white/25 hover:bg-white/20'}`}>{done ? <Check className="size-4" aria-hidden /> : <Share2 className="size-4" aria-hidden />}{done ? 'Link copied' : 'Share'}</button>;
}
