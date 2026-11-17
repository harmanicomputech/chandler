'use client';
import { useActionState, startTransition } from 'react';
import { saveUser, type ActionState } from '@/app/admin/actions';
const input = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm';
export function UserForm({ id, user, csrf }: { id: number | null; user: { email: string; name: string; role: string; sites: string[]; organisation: string | null; active: boolean } | null; csrf: string }) {
  const [s, a, p] = useActionState<ActionState, FormData>(saveUser.bind(null, id), undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => a(fd)); }} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-6"><input type="hidden" name="_csrf" value={csrf} />
      <label className="block text-sm">Name<input name="name" defaultValue={user?.name} required className={input} /></label>
      <label className="block text-sm">Email<input name="email" type="email" defaultValue={user?.email} required className={input} /></label>
      <label className="block text-sm">Role<select name="role" defaultValue={user?.role ?? 'editor'} className={input}><option value="admin">Administrator</option><option value="editor">Editor</option><option value="tourism_staff">Tourism staff</option><option value="edo_staff">Economic development staff</option><option value="stakeholder">Stakeholder (partner)</option></select></label>
      <fieldset><legend className="text-sm">Websites</legend><div className="mt-1 flex gap-4 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="sites" value="visit" defaultChecked={user?.sites.includes('visit') ?? true} />Visit Chandler</label><label className="flex items-center gap-2"><input type="checkbox" name="sites" value="edo" defaultChecked={user?.sites.includes('edo')} />Economic Development</label></div></fieldset>
      <label className="block text-sm">Organisation (stakeholders)<input name="organisation" defaultValue={user?.organisation ?? ''} className={input} /></label>
      <label className="block text-sm">{id ? 'Reset password (leave blank to keep)' : 'Initial password'}<input name="password" type="password" autoComplete="new-password" minLength={12} className={input} /><span className="mt-1 block text-xs text-slate-600">At least 12 characters with letters and numbers. Changing it signs the user out everywhere.</span></label>
      {id && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={user?.active} />Account active</label>}
      {!id && <input type="hidden" name="active" value="on" />}
      <button disabled={p} className="rounded-md bg-[#214FA1] px-5 py-2 text-sm font-semibold text-white">Save user</button>
      <p role="status" className={`text-sm ${s?.error ? 'text-red-600' : 'text-emerald-700'}`}>{s?.error ?? s?.message}</p>
    </form>
  );
}
