import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader } from '@/components/admin/ui';
import { UserForm } from '@/components/admin/UserForm';
export default async function EditUser({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser('users.manage'); const { id } = await params;
  const u = id === 'new' ? null : (await db.select().from(schema.users).where(eq(schema.users.id, Number(id))))[0];
  if (id !== 'new' && !u) notFound();
  return (<><PageHeader title={u ? u.name : 'New user'} /><UserForm id={u?.id ?? null} user={u ? { email: u.email, name: u.name, role: u.role, sites: u.sites, organisation: u.organisation, active: u.active } : null} csrf={me.csrfToken} /></>);
}
