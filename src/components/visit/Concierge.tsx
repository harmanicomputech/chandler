'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Send, Loader2, BadgeCheck, Info } from 'lucide-react';
import type { ConciergeResult } from '@/lib/concierge';

const EXAMPLES = ['What can I do in Chandler this weekend?', 'Where can I find family-friendly restaurants?', 'What outdoor activities are available?', 'Where should I stay near downtown?', 'What events are happening during my visit?'];
type Turn = { q: string; r?: ConciergeResult; error?: string };

export function Concierge() {
  const [q, setQ] = useState(''); const [turns, setTurns] = useState<Turn[]>([]); const [busy, setBusy] = useState(false);
  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setBusy(true); setQ(''); setTurns((t) => [...t, { q: question }]);
    const r = await fetch('/api/concierge/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ question }) }).catch(() => null);
    const j = r ? await r.json().catch(() => null) : null;
    setTurns((t) => t.map((x, i) => (i === t.length - 1 ? (r?.ok && j ? { ...x, r: j } : { ...x, error: j?.error ?? 'Something went wrong. Please try again.' }) : x)));
    setBusy(false);
  }
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <div className="space-y-10" aria-live="polite">
        {turns.map((t, i) => (
          <div key={i} className="space-y-4">
            <p className="ml-auto w-fit max-w-[85%] rounded-3xl rounded-br-md bg-navy px-5 py-3 text-white">{t.q}</p>
            {!t.r && !t.error && <p className="flex items-center gap-2 text-ink-soft"><Loader2 className="size-4 animate-spin" aria-hidden />Searching official Visit Chandler content…</p>}
            {t.error && <p role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">{t.error}</p>}
            {t.r && (
              <div className="space-y-4">
                <div className="rounded-3xl rounded-bl-md bg-mist p-5">
                  <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">{t.r.mode === 'ai' ? <><Sparkles className="size-3.5" aria-hidden />AI-generated suggestion</> : <><Info className="size-3.5" aria-hidden />Directory search</>}</p>
                  <p className="text-navy">{t.r.answer}</p>
                  {t.r.note && <p className="mt-2 text-xs text-ink-soft">{t.r.note}</p>}
                </div>
                {t.r.picks.length > 0 && (
                  <div><p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-ink-soft"><BadgeCheck className="size-4 text-blue-500" aria-hidden />Confirmed listings from the official directory</p>
                    <ul className="grid gap-3 sm:grid-cols-2">{t.r.picks.map((p) => { const rec = t.r!.records[`${p.kind}:${p.id}`]; if (!rec) return null; return (
                      <li key={p.kind + p.id}><Link href={rec.href} className="group flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-line transition hover:ring-blue-500">
                        {rec.image ? <img src={rec.image} alt="" className="size-20 shrink-0 rounded-xl object-cover" /> : <span className="size-20 shrink-0 rounded-xl bg-blue-50" />}
                        <span className="min-w-0"><span className="block font-bold text-navy group-hover:underline">{rec.title}</span>{rec.meta && <span className="block truncate text-xs text-ink-soft">{rec.meta}</span>}{t.r!.mode === 'ai' && <span className="mt-1 block text-sm text-ink-soft"><span className="sr-only">AI note: </span>{p.reason}</span>}</span></Link></li>); })}</ul></div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {turns.length === 0 && (<div><p className="text-sm font-bold text-navy">Try asking</p><ul className="mt-3 flex flex-wrap gap-2">{EXAMPLES.map((e) => <li key={e}><button type="button" onClick={() => ask(e)} className="rounded-full bg-mist px-4 py-2.5 text-sm font-semibold text-navy hover:bg-blue-50">{e}</button></li>)}</ul></div>)}
      <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="sticky bottom-4 mt-10 flex items-center gap-2 rounded-full bg-white p-2 pl-5 shadow-2xl ring-1 ring-line">
        <label htmlFor="cq" className="sr-only">Ask the concierge</label>
        <input id="cq" value={q} onChange={(e) => setQ(e.target.value)} maxLength={400} placeholder="Ask anything about visiting Chandler…" className="min-w-0 flex-1 bg-transparent py-3 outline-none" />
        <button disabled={busy || q.trim().length < 3} aria-label="Send question" className="grid size-12 place-items-center rounded-full bg-blue-500 text-white disabled:opacity-50">{busy ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}</button>
      </form>
      <p className="mt-4 text-center text-xs text-ink-soft">The concierge only recommends places and events from the official Visit Chandler directory. It does not know live hours, prices or availability — please confirm with businesses directly.</p>
    </div>
  );
}
