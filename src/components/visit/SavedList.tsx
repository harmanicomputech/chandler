'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, Trash2, Route, Loader2, Check, MapPin } from 'lucide-react';
import { readSaved, writeSaved, type SavedItem } from './SaveButton';

/** Visitor's saved places (stored in this browser) with sharing via a server-side snapshot link. */
export function SavedList() {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [title, setTitle] = useState('My Chandler favourites');
  const [share, setShare] = useState<{ state: 'idle' | 'saving' | 'done' | 'error'; url?: string; msg?: string }>({ state: 'idle' });
  useEffect(() => { const s = () => setItems(readSaved()); s(); window.addEventListener('vc:saved-changed', s); return () => window.removeEventListener('vc:saved-changed', s); }, []);
  const remove = (it: SavedItem) => writeSaved(readSaved().filter((x) => !(x.kind === it.kind && x.id === it.id)));
  async function doShare() {
    if (!items?.length) return;
    setShare({ state: 'saving' });
    const r = await fetch('/api/collections/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, items: items.map(({ kind, id }) => ({ kind, id })) }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setShare({ state: 'error', msg: j.error ?? 'Could not create a share link right now.' }); return; }
    const url = `${location.origin}/collections/${j.shareToken}/`;
    setShare({ state: 'done', url });
    try { if (navigator.share) await navigator.share({ title, url }); else await navigator.clipboard.writeText(url); } catch {}
  }
  if (items === null) return <div className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8"><div className="skeleton h-64 rounded-[var(--radius-card)]" /></div>;
  if (!items.length) return (
    <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8">
      <Heart className="mx-auto size-12 text-teal-500" strokeWidth={1.5} aria-hidden />
      <h2 className="mt-6 font-display text-5xl text-navy">Nothing saved yet</h2>
      <p className="mt-4 text-ink-soft">Tap the heart on any hotel, restaurant, attraction or event to keep it here. Saved places stay on this device — no account needed.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3"><Link href="/things-to-do/" className="rounded-full bg-blue-500 px-6 py-3 font-bold text-white">Find things to do</Link><Link href="/events/" className="rounded-full px-6 py-3 font-bold ring-1 ring-line">Browse events</Link></div>
    </div>
  );
  return (
    <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8">
      <div className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-mist p-5 sm:flex-row sm:items-end">
        <label className="flex-1 text-sm font-semibold text-navy">List name<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-2 w-full rounded-xl border border-line bg-white px-4 py-3" /></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={doShare} disabled={share.state === 'saving'} className="inline-flex items-center gap-2 rounded-full bg-blue-500 px-5 py-3 text-sm font-bold text-white hover:bg-navy disabled:opacity-60">{share.state === 'saving' ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Share2 className="size-4" aria-hidden />}Share this list</button>
          <Link href="/trip-planner/" className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold ring-1 ring-line hover:bg-white"><Route className="size-4" aria-hidden />Plan a trip with these</Link>
          <button type="button" onClick={() => { if (confirm('Remove all saved places from this device?')) writeSaved([]); }} className="rounded-full px-4 py-3 text-sm font-semibold text-ink-soft hover:text-red-700">Clear all</button>
        </div>
      </div>
      <div role="status" aria-live="polite">
        {share.state === 'done' && <p className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 px-4 py-3 text-sm"><Check className="size-4 text-teal-700" aria-hidden />Link created and copied: <a href={share.url} className="break-all font-semibold underline">{share.url}</a></p>}
        {share.state === 'error' && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{share.msg}</p>}
      </div>
      <p className="mt-8 text-sm text-ink-soft"><strong className="text-navy">{items.length}</strong> saved {items.length === 1 ? 'place' : 'places'}</p>
      <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((it) => (
          <li key={it.kind + it.id} className="group relative overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line">
            <Link href={it.href} className="block">
              <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-100 via-mist to-teal-50">{it.image && <img src={it.image} alt="" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />}</div>
              <div className="p-5"><p className="eyebrow text-[10px] text-teal-700">{it.kind === 'event' ? 'Event' : it.category ?? 'Place'}</p><p className="mt-1 text-lg font-bold leading-snug text-navy group-hover:underline">{it.name}</p></div>
            </Link>
            <button type="button" onClick={() => remove(it)} aria-label={`Remove ${it.name} from saved`} className="absolute right-3 top-3 grid size-10 place-items-center rounded-full bg-white/90 text-navy shadow-lg hover:text-red-700"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>
      <p className="mt-8 flex items-center gap-2 text-xs text-ink-soft"><MapPin className="size-3.5" aria-hidden />Saved places are stored only in this browser. Sharing creates a read-only link with the places in this list — no personal information is stored.</p>
    </div>
  );
}
