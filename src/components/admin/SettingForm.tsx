'use client';
import { useActionState, startTransition } from 'react';
import { saveSetting, type ActionState } from '@/app/admin/actions';
export function SettingForm({ site, k, value, csrf, isNew }: { site: string; k: string; value: string; csrf: string; isNew?: boolean }) {
  const [s, a, p] = useActionState<ActionState, FormData>(saveSetting, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="rounded-lg border border-slate-200 bg-white p-5"><input type="hidden" name="_csrf" value={csrf} /><input type="hidden" name="site" value={site} /><input type="hidden" name="key" value={k} />
      <h2 className="text-sm font-semibold">{site === 'visit' ? 'Visit Chandler' : 'Economic Development'} · {k}{isNew && <span className="font-normal text-slate-600"> (new)</span>}</h2>
      <label className="sr-only" htmlFor={`set-${site}-${k}`}>Value (JSON)</label><textarea id={`set-${site}-${k}`} name="value" defaultValue={value} rows={6} spellCheck={false} className="mt-3 w-full rounded-md border border-slate-300 p-3 font-mono text-xs" />
      <div className="mt-2 flex items-center gap-3"><button disabled={p} className="rounded-md bg-slate-800 px-4 py-1.5 text-sm text-white">Save</button><p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p></div>
    </form>
  );
}
