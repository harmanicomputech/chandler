'use client';
import { useActionState, startTransition } from 'react';
import { saveRedirect, type ActionState } from '@/app/admin/actions';
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export function RedirectForm({ csrf }: { csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(saveRedirect, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Add redirect</h2><input type="hidden" name="_csrf" value={csrf} />
      <label className="block text-sm">Website<select name="site" className={input}><option value="visit">Visit Chandler</option><option value="edo">Economic Development</option></select></label>
      <label className="block text-sm">From path<input name="fromPath" required placeholder="/old-page/" className={input} /></label>
      <label className="block text-sm">To (path or https URL)<input name="toPath" required placeholder="/new-page/" className={input} /></label>
      <label className="block text-sm">Type<select name="statusCode" className={input}><option value="301">301 Permanent</option><option value="302">302 Temporary</option></select></label>
      <label className="block text-sm">Note<input name="note" className={input} /></label>
      <button disabled={p} className="w-full rounded-md bg-[#214FA1] py-2 text-sm font-semibold text-white">Save redirect</button>
      <p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p>
    </form>
  );
}
