import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { LoginForm } from '@/components/admin/LoginForm';
export const dynamic = 'force-dynamic';
export default async function Login() {
  if (await getSessionUser()) redirect('/admin/');
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[#0d1a30] lg:block">
        <img src="/images/homepage/hot-air-expeditions.jpg" alt="" className="absolute inset-0 size-full object-cover opacity-50" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d1a30] via-[#0d1a30]/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white"><p className="font-mono text-xs uppercase tracking-[0.2em] text-teal-300">City of Chandler</p><p className="mt-3 font-display text-6xl leading-none">One CMS. Two destinations.</p><p className="mt-4 max-w-md text-white/70">Visit Chandler and Chandler Economic Development — content, listings, events, properties and enquiries in one place.</p></div>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <img src="/brand/visit-chandler-logo.svg" alt="Visit Chandler" className="h-12" />
          <h1 className="mt-10 text-2xl font-semibold">Sign in to the CMS</h1>
          <p className="mt-1 text-sm text-slate-600">Staff and approved partner accounts only.</p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
