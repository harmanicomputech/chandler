'use client';
import { useActionState, startTransition } from 'react';
import { updateSubmission, type ActionState } from '@/app/admin/actions';
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export function SubmissionForm({ id, status, assignedTo, staff, csrf }: { id: number; status: string; assignedTo: number | null; staff: { id: number; name: string }[]; csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(updateSubmission.bind(null, id), undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5"><h2 className="text-sm font-semibold">Manage</h2><input type="hidden" name="_csrf" value={csrf} />
      <label className="block text-sm">Status<select name="status" defaultValue={status} className={input}>{['new', 'in_progress', 'approved', 'rejected', 'closed'].map((x) => <option key={x} value={x}>{x.replace('_', ' ')}</option>)}</select></label>
      <label className="block text-sm">Assign to<select name="assignedTo" defaultValue={assignedTo ?? ''} className={input}><option value="">Unassigned</option>{staff.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
      <label className="block text-sm">Internal note<textarea name="note" rows={3} className={input} /></label>
      <button disabled={p} className="w-full rounded-md bg-[#214FA1] py-2 text-sm font-semibold text-white">Update</button>
      <p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p>
    </form>
  );
}
