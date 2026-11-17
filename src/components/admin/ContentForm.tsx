'use client';
import { useActionState, useState, startTransition } from 'react';
import type { Field } from '@/lib/cms-registry';
import { saveContent, type ActionState } from '@/app/admin/actions';
import { RichText } from './RichText';
import { MediaPicker } from './MediaPicker';

const toLocal = (d: unknown) => { if (!d) return ''; const x = new Date(d as string); if (isNaN(+x)) return ''; return new Date(x.getTime() - 7 * 3600_000).toISOString().slice(0, 16); }; // America/Phoenix (UTC-7, no DST)

export function ContentForm({ typeKey, id, fields, values, workflow, canPublish, csrf, mediaPreview }: { typeKey: string; id: number | null; fields: Field[]; values: Record<string, any>; workflow: boolean; canPublish: boolean; csrf: string; mediaPreview: { id: number; url: string; alt: string } | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveContent.bind(null, typeKey, id), undefined);
  const [seoOpen, setSeoOpen] = useState(false);
  const input = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#214FA1] focus:outline-none focus:ring-2 focus:ring-[#214FA1]/20';
  const render = (f: Field) => {
    const v = values[f.name]; const err = state?.fieldErrors?.[f.name]; const id = `f-${f.name}`;
    const label = <label htmlFor={id} className="text-sm font-medium">{f.label}{f.required && <span className="text-red-600"> *</span>}</label>;
    const help = f.help && <p id={`${id}-h`} className="mt-1 text-xs text-slate-600">{f.help}</p>;
    const e = err && <p id={`${id}-e`} className="mt-1 text-xs font-medium text-red-600">{err}</p>;
    const aria = { 'aria-invalid': !!err || undefined, 'aria-describedby': [f.help && `${id}-h`, err && `${id}-e`].filter(Boolean).join(' ') || undefined };
    let ctl: React.ReactNode;
    switch (f.type) {
      case 'richtext': ctl = <RichText id={id} name={f.name} initial={v ?? ''} />; break;
      case 'textarea': ctl = <textarea id={id} name={f.name} defaultValue={v ?? ''} rows={4} className={input} {...aria} />; break;
      case 'json': ctl = <textarea id={id} name={f.name} defaultValue={v ? JSON.stringify(v, null, 2) : ''} rows={8} spellCheck={false} className={`${input} font-mono text-xs`} {...aria} />; break;
      case 'select': ctl = <select id={id} name={f.name} defaultValue={v ?? ''} className={input} {...aria}><option value="">—</option>{f.options!.map((o) => <option key={o} value={o}>{o.replace(/_/g, ' ')}</option>)}</select>; break;
      case 'boolean': return <label key={f.name} className="flex items-center gap-2 text-sm"><input type="checkbox" name={f.name} defaultChecked={!!v} className="size-4 accent-[#214FA1]" />{f.label}</label>;
      case 'tags': ctl = <input id={id} name={f.name} defaultValue={Array.isArray(v) ? v.join(', ') : ''} className={input} placeholder="Comma-separated" {...aria} />; break;
      case 'media': ctl = <MediaPicker name={f.name} initial={v ?? null} preview={mediaPreview && mediaPreview.id === v ? mediaPreview : null} />; break;
      case 'datetime': ctl = <input id={id} type="datetime-local" name={f.name} defaultValue={toLocal(v)} className={input} {...aria} />; break;
      case 'date': ctl = <input id={id} type="date" name={f.name} defaultValue={v ?? ''} className={input} {...aria} />; break;
      case 'number': ctl = <input id={id} type="number" step="any" name={f.name} defaultValue={v ?? ''} className={input} {...aria} />; break;
      default: ctl = <input id={id} type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'} name={f.name} defaultValue={v ?? ''} className={input} {...aria} />;
    }
    return <div key={f.name}>{label}{ctl}{help}{e}</div>;
  };
  const main = fields.filter((f) => !f.group || f.group === 'main'); const side = fields.filter((f) => f.group === 'side'); const seo = fields.filter((f) => f.group === 'seo');
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => action(fd)); }} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <input type="hidden" name="_csrf" value={csrf} />
      <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-5">
        {main.map(render)}
        {seo.length > 0 && <div className="border-t border-slate-100 pt-4"><button type="button" onClick={() => setSeoOpen((o) => !o)} aria-expanded={seoOpen} className="text-sm font-semibold text-[#214FA1]">{seoOpen ? '▾' : '▸'} SEO & social</button><div hidden={!seoOpen} className="mt-4 space-y-4">{seo.map(render)}</div></div>}
      </div>
      <aside className="space-y-5">
        <div className="sticky top-4 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold">Publish</p>
          <label className="block text-xs text-slate-600" htmlFor="note">Change note (optional)<input id="note" name="_note" className={input} placeholder="What changed?" /></label>
          {workflow ? (<div className="grid gap-2">
            <button name="_intent" value="draft" disabled={pending} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">Save draft</button>
            {!canPublish && <button name="_intent" value="review" disabled={pending} className="rounded-md bg-amber-500 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-600">Submit for approval</button>}
            <button name="_intent" value="publish" disabled={pending} className="rounded-md bg-[#214FA1] px-3 py-2 text-sm font-semibold text-white hover:bg-[#172B4D]">{canPublish ? 'Publish' : 'Request publish'}</button>
            <button name="_intent" value="archive" disabled={pending} className="rounded-md px-3 py-2 text-xs text-slate-600 hover:text-slate-800">Archive (unpublish)</button>
          </div>) : <button disabled={pending} className="w-full rounded-md bg-[#214FA1] px-3 py-2 text-sm font-semibold text-white">Save</button>}
          <p role="status" aria-live="polite" className={`text-sm ${state?.error ? 'text-red-600' : 'text-emerald-700'}`}>{pending ? 'Saving…' : state?.error ?? state?.message ?? ''}</p>
        </div>
        {side.length > 0 && <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">{side.map(render)}</div>}
      </aside>
    </form>
  );
}
