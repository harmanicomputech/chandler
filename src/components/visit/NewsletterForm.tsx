'use client';
import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

export function NewsletterForm({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending');
    const r = await fetch('/api/newsletter/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: fd.get('email'), consent: fd.get('consent') === 'on', site: 'visit', hp: fd.get('hp') }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok) { setState('done'); setMsg(j.message); } else { setState('error'); setMsg(j.error ?? 'Could not subscribe right now.'); }
  }
  const dark = tone === 'dark';
  if (state === 'done') return <p role="status" className={`flex items-center gap-3 rounded-full px-5 py-4 font-semibold ${dark ? 'bg-white/10' : 'bg-teal-50 text-navy'}`}><Check className="size-5 text-teal-400" aria-hidden />{msg}</p>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className={`flex items-center gap-2 rounded-full p-1.5 pl-6 ring-1 transition focus-within:ring-2 ${dark ? 'bg-white/5 ring-white/20 focus-within:ring-teal-400' : 'bg-white ring-line focus-within:ring-blue-500'}`}>
        <label htmlFor={`nl-${tone}`} className="sr-only">Email address</label>
        <input id={`nl-${tone}`} name="email" type="email" required autoComplete="email" placeholder="Your email address" className={`min-w-0 flex-1 bg-transparent py-2.5 outline-none ${dark ? 'placeholder:text-white/40' : 'placeholder:text-ink-soft/60'}`} />
        <input name="hp" tabIndex={-1} aria-hidden className="hidden" autoComplete="off" />
        <button disabled={state === 'sending'} className="inline-flex items-center gap-2 rounded-full bg-teal-400 px-5 py-3 text-sm font-bold text-navy transition hover:bg-teal-300 disabled:opacity-60">Subscribe <ArrowRight className="size-4" aria-hidden /></button>
      </div>
      <label className={`flex items-start gap-2.5 text-xs ${dark ? 'text-white/60' : 'text-ink-soft'}`}>
        <input type="checkbox" name="consent" required className="mt-0.5 accent-teal-400" />
        <span>I agree to receive e-mail from Visit Chandler and can unsubscribe at any time. See our <a href="/privacy-policy/" className="underline">privacy policy</a>.</span>
      </label>
      {state === 'error' && <p role="alert" className="text-sm font-medium text-red-400">{msg}</p>}
    </form>
  );
}
