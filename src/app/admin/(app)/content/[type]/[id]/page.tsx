import { notFound } from 'next/navigation';
import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser, can } from '@/lib/auth';
import { CONTENT_TYPES } from '@/lib/cms-registry';
import { PageHeader, Card, Badge, fmt } from '@/components/admin/ui';
import { ContentForm } from '@/components/admin/ContentForm';
import { restoreVersion, deleteContent } from '../../../../actions';

export default async function EditContent({ params, searchParams }: { params: Promise<{ type: string; id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { type, id } = await params; const sp = await searchParams;
  const ct = CONTENT_TYPES[type]; if (!ct) notFound();
  const user = await requireUser(ct.permission);
  const isNew = id === 'new';
  const row = isNew ? null : (await db.select().from(ct.table).where(eq(ct.table.id, Number(id))).limit(1))[0];
  if (!isNew && !row) notFound();
  const versions = isNew ? [] : await db.select({ v: schema.contentVersions, by: schema.users.name }).from(schema.contentVersions).leftJoin(schema.users, eq(schema.contentVersions.createdBy, schema.users.id))
    .where(and(eq(schema.contentVersions.entity, type), eq(schema.contentVersions.entityId, Number(id)))).orderBy(desc(schema.contentVersions.version)).limit(15);
  const mediaIds = ct.fields.filter((f) => f.type === 'media').map((f) => (row as any)?.[f.name]).filter(Boolean);
  const media = mediaIds.length ? await db.select().from(schema.media).where(eq(schema.media.id, mediaIds[0])) : [];
  const site = (row as any)?.site ?? (ct.site === 'both' ? 'visit' : ct.site);
  const url = row && ct.publicUrl ? ct.publicUrl(row) : null;
  return (
    <>
      <PageHeader title={isNew ? `New ${ct.label.toLowerCase()}` : String((row as any)[ct.titleField])} subtitle={isNew ? ct.plural : `${ct.label} #${id}${(row as any).sourceUrl ? ' · migrated from ' + (row as any).sourceUrl : ''}`}
        actions={<>{row && 'status' in (row as any) && <Badge value={(row as any).status} />}{url && <a href={url} target="_blank" rel="noopener" className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm">{(row as any).status === 'published' ? 'View live' : 'Preview path'} ↗</a>}</>} />
      {sp.created && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Created.</p>}
      {sp.restored && <p role="status" className="mb-4 rounded-md bg-emerald-50 px-4 py-2 text-sm text-emerald-800">Version {sp.restored} restored as a draft.</p>}
      <ContentForm typeKey={type} id={isNew ? null : Number(id)} fields={ct.fields} values={row ?? {}} workflow={ct.workflow} canPublish={can(user, 'content.publish', site)} csrf={user.csrfToken} mediaPreview={media[0] ?? null} />
      {!isNew && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card title="Version history">{versions.length ? <ul className="divide-y divide-slate-100 text-sm">{versions.map(({ v, by }) => (
            <li key={v.id} className="flex items-center justify-between gap-3 py-2"><span>v{v.version} · {by ?? 'system'} · {fmt(v.createdAt)}{v.note && <span className="text-slate-600"> — {v.note}</span>}</span>
              <form action={restoreVersion.bind(null, type, Number(id), v.id)}><input type="hidden" name="_csrf" value={user.csrfToken} /><button className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">Restore</button></form></li>
          ))}</ul> : <p className="text-sm text-slate-600">Versions are saved automatically each time this record is updated.</p>}</Card>
          {can(user, 'content.delete') && <Card title="Danger zone"><form action={deleteContent.bind(null, type, Number(id))}><input type="hidden" name="_csrf" value={user.csrfToken} /><p className="text-sm text-slate-600">Deleting removes the record from both sites. A final snapshot is kept in version history. Prefer <em>Archive</em> to unpublish.</p><button className="mt-3 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Delete permanently</button></form></Card>}
        </div>
      )}
    </>
  );
}
