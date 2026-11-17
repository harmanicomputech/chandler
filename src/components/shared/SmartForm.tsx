'use client';
import { useRef, useState } from 'react';
import type { FormSpec } from '@/lib/forms';
import { CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

/** Accessible, spec-driven form: labelled fields, inline errors linked via aria-describedby, live status region. */
export function SmartForm({ formKey, spec, theme = 'visit', extra, compact }: { formKey: string; spec: FormSpec; theme?: 'visit' | 'edo'; extra?: Record<string, unknown>; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const started = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const edo = theme === 'edo';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('sending'); setErrors({});
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { ...extra, _t: started.current };
    fd.forEach((v, k) => { body[k] = v; });
    spec.fields.filter((f) => f.type === 'checkbox').forEach((f) => { body[f.name] = fd.get(f.name) === 'on'; });
    try {
      const r = await fetch(`/api/forms/${formKey}/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      if (j.ok) { setState('done'); setMessage(j.message); formRef.current?.reset(); }
      else {
        setState('error'); setMessage(j.error || 'Something went wrong.'); setErrors(j.errors || {});
        const first = Object.keys(j.errors || {})[0];
        if (first) (formRef.current?.elements.namedItem(first) as HTMLElement | null)?.focus();
      }
    } catch { setState('error'); setMessage('Network error — please check your connection and try again.'); }
  }

  const input = edo
    ? 'w-full rounded-md border border-edo-line bg-white px-3.5 py-3 text-[15px] text-edo-ink outline-none transition focus:border-edo-sky focus:ring-4 focus:ring-edo-sky/15'
    : 'w-full rounded-xl border border-line bg-white px-4 py-3.5 text-[15px] text-navy outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10';

  if (state === 'done') return (
    <div role="status" className={`flex items-start gap-4 p-6 ${edo ? 'rounded-md bg-edo-sky-100 text-edo-navy' : 'rounded-2xl bg-teal-50 text-navy'}`}>
      <CheckCircle2 className={`mt-0.5 size-6 shrink-0 ${edo ? 'text-edo-green' : 'text-teal-600'}`} aria-hidden />
      <div><p className="font-bold">Submitted</p><p className="mt-1 text-sm opacity-80">{message}</p></div>
    </div>
  );

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate className="grid grid-cols-1 gap-x-5 gap-y-5 sm:grid-cols-2" aria-describedby={spec.intro ? `${formKey}-intro` : undefined}>
      {!compact && spec.intro && <p id={`${formKey}-intro`} className="text-sm opacity-75 sm:col-span-2">{spec.intro}</p>}
      {spec.fields.map((f) => {
        const id = `${formKey}-${f.name}`; const err = errors[f.name];
        const common = { id, name: f.name, required: f.required, 'aria-invalid': !!err || undefined, 'aria-describedby': [err && `${id}-err`, f.help && `${id}-help`].filter(Boolean).join(' ') || undefined, autoComplete: f.autoComplete };
        return (
          <div key={f.name} className={f.width === 'full' || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            {f.type === 'checkbox' ? (
              <label htmlFor={id} className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <input type="checkbox" {...common} className={`size-5 rounded ${edo ? 'accent-edo-sky' : 'accent-blue-500'}`} />{f.label}
              </label>
            ) : (
              <>
                <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">{f.label}{f.required && <span aria-hidden className={edo ? 'text-edo-skytext' : 'text-teal-700'}> *</span>}</label>
                {f.type === 'textarea' ? <textarea {...common} rows={5} maxLength={f.max} className={input} />
                  : f.type === 'select' ? (
                    <select {...common} className={input} defaultValue=""><option value="" disabled>Select…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                  ) : <input type={f.type} {...common} maxLength={f.max} className={input} />}
              </>
            )}
            {f.help && <p id={`${id}-help`} className="mt-1 text-xs opacity-60">{f.help}</p>}
            {err && <p id={`${id}-err`} className="mt-1.5 flex items-center gap-1 text-sm font-medium text-red-700"><AlertCircle className="size-4" aria-hidden />{err}</p>}
          </div>
        );
      })}
      {/* honeypot */}
      <div aria-hidden className="absolute -left-[9999px]"><label>Leave blank<input name="company_website" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={state === 'sending'}
          className={edo ? 'inline-flex items-center gap-2 rounded-md bg-edo-navy px-6 py-3.5 font-semibold text-white transition hover:bg-edo-sky disabled:opacity-60'
            : 'inline-flex items-center gap-2 rounded-full bg-blue-500 px-7 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-navy hover:shadow-xl disabled:opacity-60'}>
          {state === 'sending' && <Loader2 className="size-4 animate-spin" aria-hidden />}{spec.submitLabel}
        </button>
        <p role="status" aria-live="polite" className="text-sm font-medium text-red-700">{state === 'error' ? message : ''}</p>
      </div>
    </form>
  );
}
