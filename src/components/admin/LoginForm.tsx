'use client';
import { useActionState, startTransition } from 'react';
import { loginAction } from '@/app/admin/actions';
export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter); startTransition(() => action(fd)); }} className="mt-8 space-y-4">
      <div><label htmlFor="email" className="text-sm font-medium">Email</label><input id="email" name="email" type="email" autoComplete="username" required className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
      <div><label htmlFor="password" className="text-sm font-medium">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
      {state?.error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-md bg-[#214FA1] py-2.5 font-semibold text-white hover:bg-[#172B4D] disabled:opacity-60">{pending ? 'Signing in…' : 'Sign in'}</button>
    </form>
  );
}
