'use client';
import { useActionState, startTransition } from 'react';
import { proposeListingUpdate, type ActionState } from '@/app/admin/actions';
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export function ProposeForm({ listing: l, csrf }: { listing: { id: number; name: string; descriptionHtml: string; phone: string | null; website: string | null; email: string | null; hours: string | null; bookingUrl: string | null; status: string }; csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(proposeListingUpdate.bind(null, l.id), undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"><input type="hidden" name="_csrf" value={csrf} />
      <h2 className="font-semibold">{l.name} <span className="text-xs font-normal text-slate-600">({l.status})</span></h2>
      <label className="block text-sm">Description (HTML allowed: p, strong, em, a)<textarea name="descriptionHtml" defaultValue={l.descriptionHtml} rows={5} className={input} /></label>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">Phone<input name="phone" defaultValue={l.phone ?? ''} className={input} /></label><label className="text-sm">Website<input name="website" type="url" defaultValue={l.website ?? ''} className={input} /></label><label className="text-sm">Email<input name="email" type="email" defaultValue={l.email ?? ''} className={input} /></label><label className="text-sm">Booking URL<input name="bookingUrl" type="url" defaultValue={l.bookingUrl ?? ''} className={input} /></label></div>
      <label className="block text-sm">Hours<textarea name="hours" defaultValue={l.hours ?? ''} rows={2} className={input} /></label>
      <button disabled={p} className="rounded-md bg-[#214FA1] px-4 py-2 text-sm font-semibold text-white">Submit changes for review</button>
      <p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p>
    </form>
  );
}
