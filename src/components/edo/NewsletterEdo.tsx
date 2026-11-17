'use client';
import { useState } from 'react';
export function NewsletterEdo() {
  const [s, setS] = useState<'idle' | 'ok' | 'err'>('idle'); const [m, setM] = useState('');
  return s === 'ok' ? <p role="status" className="text-sm text-edo-gold">{m}</p> : (
    <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const r = await fetch('/api/newsletter/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), consent: fd.get('c') === 'on', site: 'edo' }) }).catch(() => null); const j = r ? await r.json() : {}; if (r?.ok) { setS('ok'); setM(j.message); } else { setS('err'); setM(j.error ?? 'Could not subscribe.'); } }}>
      <label htmlFor="edo-nl" className="sr-only">Email address</label>
      <div className="flex"><input id="edo-nl" name="email" type="email" required placeholder="you@company.com" className="min-w-0 flex-1 border border-white/25 bg-transparent px-3 py-2.5 text-sm placeholder:text-white/40" /><button className="bg-edo-gold px-4 text-sm font-semibold text-edo-ink">Join</button></div>
      <label className="flex gap-2 text-[11px] text-white/55"><input type="checkbox" name="c" required className="accent-edo-gold" />I agree to receive e-mail from the City of Chandler.</label>
      {s === 'err' && <p role="alert" className="text-xs text-red-300">{m}</p>}
    </form>
  );
}
