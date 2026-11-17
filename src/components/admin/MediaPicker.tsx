'use client';
import { useEffect, useState } from 'react';
type M = { id: number; url: string; alt: string };
/** Searchable media picker backed by /api/admin/media (session-authenticated). */
export function MediaPicker({ name, initial, preview }: { name: string; initial: number | null; preview: M | null }) {
  const [sel, setSel] = useState<M | null>(preview ?? (initial ? { id: initial, url: '', alt: `Media #${initial}` } : null));
  const [open, setOpen] = useState(false); const [q, setQ] = useState(''); const [items, setItems] = useState<M[]>([]);
  useEffect(() => { if (!open) return; const t = setTimeout(() => fetch(`/api/admin/media/?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((j) => setItems(j.items ?? [])), 200); return () => clearTimeout(t); }, [open, q]);
  return (
    <div className="mt-1">
      <input type="hidden" name={name} value={sel?.id ?? ''} />
      {sel?.url ? <img src={sel.url} alt={sel.alt} className="aspect-video w-full rounded-md object-cover" /> : <div className="grid aspect-video place-items-center rounded-md bg-slate-100 text-xs text-slate-600">{sel ? sel.alt : 'No image'}</div>}
      <div className="mt-2 flex gap-2"><button type="button" onClick={() => setOpen(true)} className="rounded border border-slate-300 px-2.5 py-1 text-xs">Choose…</button>{sel && <button type="button" onClick={() => setSel(null)} className="text-xs text-slate-600">Remove</button>}</div>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="Choose image" className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="max-h-[85vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2 border-b p-3"><label className="sr-only" htmlFor="mp-q">Search images</label><input id="mp-q" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by alt text or folder" className="flex-1 rounded border px-3 py-2 text-sm" /><button type="button" onClick={() => setOpen(false)} className="px-3 text-sm">Close</button></div>
            <ul className="grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto p-3 sm:grid-cols-5">{items.map((m) => <li key={m.id}><button type="button" onClick={() => { setSel(m); setOpen(false); }} className="block w-full overflow-hidden rounded ring-[#214FA1] hover:ring-2"><img src={m.url} alt={m.alt} className="aspect-square w-full object-cover" /><span className="block truncate px-1 py-0.5 text-left text-[10px]">{m.alt}</span></button></li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
