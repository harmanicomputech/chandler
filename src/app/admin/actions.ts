'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { and, desc, eq, sql } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { db, schema } from '@/db';
import { login, logout, requireUser, assertCsrf, audit, can, hashPassword, type Site } from '@/lib/auth';
import { CONTENT_TYPES, type Field } from '@/lib/cms-registry';
import { sanitizeHtml } from '@/lib/sanitize';
import { rateLimit } from '@/lib/rate-limit';

export type ActionState = { ok?: boolean; error?: string; message?: string; fieldErrors?: Record<string, string> } | undefined;

/* ───────────── Auth ───────────── */
export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await rateLimit('login', Number(process.env.LOGIN_RATE_LIMIT ?? 10), 600)).ok) return { error: 'Too many sign-in attempts. Please wait 10 minutes.' };
  const email = String(fd.get('email') ?? ''); const password = String(fd.get('password') ?? '');
  if (!email || !password) return { error: 'Enter your email and password.' };
  const r = await login(email, password);
  if (!r.ok) return { error: r.error };
  redirect('/admin/');
}
export async function logoutAction() { await logout(); redirect('/admin/login/'); }

/* ───────────── Field coercion ───────────── */
function coerce(f: Field, raw: FormDataEntryValue | null, all: FormData): { value: unknown; error?: string } {
  const s = raw == null ? '' : String(raw).trim();
  if (f.required && f.type !== 'boolean' && !s) return { value: null, error: `${f.label} is required` };
  switch (f.type) {
    case 'number': if (!s) return { value: null }; return isNaN(Number(s)) ? { value: null, error: `${f.label} must be a number` } : { value: f.name === 'acreage' ? s : Number(s) };
    case 'boolean': return { value: all.get(f.name) === 'on' };
    case 'date': if (!s) return { value: null }; return /^\d{4}-\d{2}-\d{2}$/.test(s) ? { value: s } : { value: null, error: `${f.label} must be a date` };
    case 'datetime': if (!s) return { value: null }; { const d = new Date(s + (s.length === 16 ? ':00-07:00' : '')); return isNaN(+d) ? { value: null, error: `${f.label} is invalid` } : { value: d }; }
    case 'media': return { value: s ? Number(s) : null };
    case 'tags': return { value: s ? s.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 60) : [] };
    case 'json': if (!s) return { value: f.name === 'blocks' || f.name === 'documents' ? [] : null }; try { return { value: JSON.parse(s) }; } catch { return { value: null, error: `${f.label} is not valid JSON` }; }
    case 'richtext': return { value: sanitizeHtml(s) };
    case 'url': if (!s) return { value: null }; try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? { value: s } : { value: null, error: `${f.label} must be http(s)` }; } catch { return { value: null, error: `${f.label} must be a full URL` }; }
    case 'email': if (!s) return { value: null }; return z.string().email().safeParse(s).success ? { value: s } : { value: null, error: `${f.label} is not a valid email` };
    case 'select': if (!s) return { value: null }; return f.options?.includes(s) ? { value: s } : { value: null, error: `Invalid ${f.label}` };
    default: if (f.name === 'path' && s && !/^\/[a-z0-9\-/._%]*\/$/i.test(s)) return { value: null, error: 'Path must start and end with "/"' }; return { value: s || null };
  }
}

/* ───────────── Content: save with workflow + versioning ───────────── */
export async function saveContent(typeKey: string, id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const ct = CONTENT_TYPES[typeKey]; if (!ct) return { error: 'Unknown content type' };
  const user = await requireUser(ct.permission);
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const values: Record<string, unknown> = {}; const fieldErrors: Record<string, string> = {};
  for (const f of ct.fields) { const r = coerce(f, fd.get(f.name), fd); if (r.error) fieldErrors[f.name] = r.error; else values[f.name] = r.value; }
  if (Object.keys(fieldErrors).length) return { error: 'Please fix the highlighted fields.', fieldErrors };
  // Blank optional values on NOT NULL columns fall back to the column default instead of violating the constraint.
  for (const [k, v] of Object.entries(values)) { const col = ct.table[k]; if (v === null && col?.notNull) delete values[k]; }
  const site = (values.site as Site | undefined) ?? (ct.site === 'both' ? 'visit' : ct.site);
  if (!can(user, ct.permission, site)) return { error: `You don’t have permission to edit ${site === 'edo' ? 'Economic Development' : 'Visit Chandler'} content.` };

  if (ct.workflow) {
    const intent = String(fd.get('_intent') ?? 'draft');
    const wanted = intent === 'publish' ? 'published' : intent === 'review' ? 'in_review' : intent === 'archive' ? 'archived' : 'draft';
    values.status = wanted === 'published' && !can(user, 'content.publish', site) ? 'in_review' : wanted;
  }
  const table = ct.table;
  let rowId = id;
  if (id) {
    const [prev] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!prev) return { error: 'Record not found' };
    const [{ v }] = await db.select({ v: sql<number>`coalesce(max(version), 0)::int` }).from(schema.contentVersions).where(and(eq(schema.contentVersions.entity, typeKey), eq(schema.contentVersions.entityId, id)));
    await db.insert(schema.contentVersions).values({ entity: typeKey, entityId: id, version: v + 1, data: prev, createdBy: user.id, note: String(fd.get('_note') ?? '') || null });
    if (typeKey === 'pages' && prev.path !== values.path) {
      await db.insert(schema.redirects).values({ site: prev.site, fromPath: prev.path, toPath: values.path as string, statusCode: 301, note: `Auto-created when page #${id} moved` })
        .onConflictDoUpdate({ target: [schema.redirects.site, schema.redirects.fromPath], set: { toPath: values.path as string } });
    }
    await db.update(table).set({ ...values, ...('updatedAt' in table ? { updatedAt: new Date() } : {}), ...('updatedBy' in table ? { updatedBy: user.id } : {}) }).where(eq(table.id, id));
  } else {
    try { const [row] = await db.insert(table).values({ ...values, ...(ct.site === 'both' && !values.site ? { site } : {}) }).returning({ id: table.id }); rowId = row.id; }
    catch (e) { console.error('[cms] create failed', typeKey, (e as { cause?: unknown }).cause ?? e); return { error: /unique|duplicate/i.test(String((e as { cause?: unknown }).cause ?? e)) ? 'A record with this slug/path already exists.' : 'Could not create the record.' }; }
  }
  await audit({ userId: user.id, action: id ? `content.update` : 'content.create', entity: typeKey, entityId: rowId!, site, detail: { status: values.status } });
  revalidatePath('/', 'layout');
  if (!id) redirect(`/admin/content/${typeKey}/${rowId}/?created=1`);
  return { ok: true, message: values.status === 'in_review' && fd.get('_intent') === 'publish' ? 'Saved and submitted for approval (you don’t have publish rights).' : `Saved${values.status ? ` · status: ${String(values.status).replace('_', ' ')}` : ''}.` };
}

export async function deleteContent(typeKey: string, id: number, fd: FormData) {
  const ct = CONTENT_TYPES[typeKey]; const user = await requireUser('content.delete');
  await assertCsrf(user, fd.get('_csrf'));
  const [prev] = await db.select().from(ct.table).where(eq(ct.table.id, id));
  if (prev) await db.insert(schema.contentVersions).values({ entity: typeKey, entityId: id, version: Date.now() % 1e9, data: prev, createdBy: user.id, note: 'Deleted' }).onConflictDoNothing();
  await db.delete(ct.table).where(eq(ct.table.id, id));
  await audit({ userId: user.id, action: 'content.delete', entity: typeKey, entityId: id });
  revalidatePath('/', 'layout'); redirect(`/admin/content/${typeKey}/?deleted=1`);
}

export async function restoreVersion(typeKey: string, id: number, versionId: number, fd: FormData) {
  const ct = CONTENT_TYPES[typeKey]; const user = await requireUser(ct.permission);
  await assertCsrf(user, fd.get('_csrf'));
  const [v] = await db.select().from(schema.contentVersions).where(eq(schema.contentVersions.id, versionId));
  if (!v || v.entity !== typeKey || v.entityId !== id) throw new Error('Version not found');
  const data = { ...(v.data as Record<string, unknown>) }; delete data.id; delete data.createdAt;
  for (const k of ['publishAt', 'expireAt', 'updatedAt']) if (data[k]) data[k] = new Date(data[k] as string);
  data.status = 'draft';
  await db.update(ct.table).set(data).where(eq(ct.table.id, id));
  await audit({ userId: user.id, action: 'content.restore', entity: typeKey, entityId: id, detail: { version: v.version } });
  revalidatePath('/', 'layout'); redirect(`/admin/content/${typeKey}/${id}/?restored=${v.version}`);
}

/* ───────────── Media ───────────── */
const MAX_UPLOAD = 15 * 1024 * 1024;
export async function uploadMedia(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('media.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const file = fd.get('file');
  if (!(file instanceof File) || !file.size) return { error: 'Choose an image to upload.' };
  if (file.size > MAX_UPLOAD) return { error: 'Images must be under 15 MB.' };
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) return { error: 'Upload a JPEG, PNG, WebP or AVIF image.' };
  const alt = String(fd.get('alt') ?? '').trim(); if (!alt) return { error: 'Alternative text is required for accessibility.' };
  const buf = Buffer.from(await file.arrayBuffer());
  let meta; try { meta = await sharp(buf).metadata(); } catch { return { error: 'That file is not a valid image.' }; }
  const now = new Date(); const dir = `/uploads/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  const name = file.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 50) + '-' + crypto.randomBytes(3).toString('hex') + '.jpg';
  await fs.mkdir(path.join(process.cwd(), 'public', dir), { recursive: true });
  const out = await sharp(buf).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(process.cwd(), 'public', dir, name)); // strips EXIF/GPS
  await db.insert(schema.media).values({ url: `${dir}/${name}`, alt, caption: String(fd.get('caption') ?? '') || null, credit: String(fd.get('credit') ?? '') || null, width: out.width, height: out.height, format: 'jpeg', folder: String(fd.get('folder') ?? 'uploads'), site: (fd.get('site') as Site) || null, permission: String(fd.get('permission') ?? 'pending'), uploadedBy: user.id });
  await audit({ userId: user.id, action: 'media.upload', detail: { url: `${dir}/${name}`, w: meta.width, h: meta.height } });
  revalidatePath('/admin/media/');
  return { ok: true, message: `Uploaded ${file.name} (${out.width}×${out.height}, EXIF removed).` };
}
export async function updateMedia(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('media.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const alt = String(fd.get('alt') ?? '').trim(); if (!alt) return { error: 'Alt text is required.' };
  await db.update(schema.media).set({ alt, caption: String(fd.get('caption') ?? '') || null, credit: String(fd.get('credit') ?? '') || null, permission: String(fd.get('permission') ?? 'pending'), updatedAt: new Date() }).where(eq(schema.media.id, id));
  await audit({ userId: user.id, action: 'media.update', entity: 'media', entityId: id });
  revalidatePath('/admin/media/'); return { ok: true, message: 'Saved.' };
}

/* ───────────── Navigation ───────────── */
export async function saveNav(fd: FormData) {
  const user = await requireUser('nav.manage'); await assertCsrf(user, fd.get('_csrf'));
  const id = Number(fd.get('id')) || null;
  const v = { site: String(fd.get('site')) as Site, menu: String(fd.get('menu')), label: String(fd.get('label')).trim().slice(0, 80), href: String(fd.get('href')).trim().slice(0, 300), sort: Number(fd.get('sort')) || 0, parentId: Number(fd.get('parentId')) || null, visible: fd.get('visible') === 'on' };
  if (!v.label || !v.href) throw new Error('Label and link are required');
  if (id) await db.update(schema.navItems).set(v).where(eq(schema.navItems.id, id)); else await db.insert(schema.navItems).values(v);
  await audit({ userId: user.id, action: id ? 'nav.update' : 'nav.create', entity: 'nav', entityId: id ?? undefined, site: v.site });
  revalidatePath('/', 'layout');
}
export async function deleteNav(fd: FormData) {
  const user = await requireUser('nav.manage'); await assertCsrf(user, fd.get('_csrf'));
  const id = Number(fd.get('id'));
  await db.delete(schema.navItems).where(eq(schema.navItems.parentId, id)); await db.delete(schema.navItems).where(eq(schema.navItems.id, id));
  await audit({ userId: user.id, action: 'nav.delete', entity: 'nav', entityId: id }); revalidatePath('/', 'layout');
}

/* ───────────── Redirects ───────────── */
export async function saveRedirect(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('redirects.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const from = String(fd.get('fromPath') ?? '').trim(); const to = String(fd.get('toPath') ?? '').trim(); const site = String(fd.get('site')) as Site; const code = Number(fd.get('statusCode') ?? 301);
  if (!from.startsWith('/')) return { error: 'From path must start with /' };
  if (!(to.startsWith('/') || /^https:\/\//.test(to))) return { error: 'To must be a path or https URL' };
  if (from === to) return { error: 'A redirect cannot point to itself' };
  const [loop] = await db.select().from(schema.redirects).where(and(eq(schema.redirects.site, site), eq(schema.redirects.fromPath, to)));
  if (loop?.toPath === from) return { error: 'This would create a redirect loop' };
  await db.insert(schema.redirects).values({ site, fromPath: from, toPath: to, statusCode: [301, 302, 307, 308].includes(code) ? code : 301, note: String(fd.get('note') ?? '') || null })
    .onConflictDoUpdate({ target: [schema.redirects.site, schema.redirects.fromPath], set: { toPath: to, statusCode: code } });
  await audit({ userId: user.id, action: 'redirect.save', site, detail: { from, to } });
  revalidatePath('/admin/redirects/'); return { ok: true, message: `Redirect ${from} → ${to} saved.` };
}
export async function deleteRedirect(fd: FormData) {
  const user = await requireUser('redirects.manage'); await assertCsrf(user, fd.get('_csrf'));
  await db.delete(schema.redirects).where(eq(schema.redirects.id, Number(fd.get('id'))));
  await audit({ userId: user.id, action: 'redirect.delete', entityId: Number(fd.get('id')) }); revalidatePath('/admin/redirects/');
}

/* ───────────── Submissions (moderation) ───────────── */
export async function updateSubmission(id: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('submissions.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const [s] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id)); if (!s) return { error: 'Not found' };
  if (!can(user, 'submissions.manage', s.site)) return { error: 'Not permitted for this site.' };
  const status = String(fd.get('status') ?? s.status) as typeof s.status; const note = String(fd.get('note') ?? '').trim().slice(0, 2000);
  const notes = note ? [...s.notes, { at: new Date().toISOString(), by: user.name, text: note }] : s.notes;
  await db.update(schema.submissions).set({ status, notes, assignedTo: Number(fd.get('assignedTo')) || s.assignedTo, updatedAt: new Date() }).where(eq(schema.submissions.id, id));
  await audit({ userId: user.id, action: 'submission.update', entity: 'submission', entityId: id, site: s.site, detail: { status } });
  revalidatePath(`/admin/submissions/${id}/`); return { ok: true, message: 'Submission updated.' };
}

/** Convert an approved public submission into a DRAFT record (never published directly). */
export async function convertSubmission(id: number, fd: FormData) {
  const user = await requireUser('submissions.manage'); await assertCsrf(user, fd.get('_csrf'));
  const [s] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, id)); if (!s) throw new Error('Not found');
  const p = s.payload as Record<string, string>;
  const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'item';
  let dest = '';
  if (s.type === 'event') {
    const [e] = await db.insert(schema.events).values({ site: s.site, title: p.eventTitle, slug: slug(p.eventTitle), startDate: p.startDate, endDate: p.endDate || p.startDate, timesText: p.times || null, admission: p.admission || null, locationName: p.venue, address: p.address, categories: p.category ? [p.category] : [], website: p.website || null, hostName: p.organiser, contactEmail: p.email, descriptionHtml: sanitizeHtml(`<p>${(p.description ?? '').replace(/</g, '&lt;').replace(/\n+/g, '</p><p>')}</p>`), status: 'draft', sourceId: `submission-${id}` }).returning({ id: schema.events.id });
    dest = `/admin/content/events/${e.id}/`;
  } else if (s.type === 'partner') {
    const type = ({ Hotel: 'hotel', Restaurant: 'restaurant', Attraction: 'attraction', Shopping: 'shopping', Recreation: 'recreation', Venue: 'venue', Services: 'services' } as const)[p.category as 'Hotel'] ?? 'other';
    const [l] = await db.insert(schema.listings).values({ name: p.businessName, slug: slug(p.businessName), type, address: p.address, website: p.website || null, phone: p.businessPhone || null, email: p.email, descriptionHtml: sanitizeHtml(`<p>${(p.description ?? '').replace(/</g, '&lt;')}</p>`), status: 'draft', sourceId: `submission-${id}`, ownerUserId: s.submittedBy }).returning({ id: schema.listings.id });
    dest = `/admin/content/listings/${l.id}/`;
  } else if (s.type === 'listing_update' && s.entityId) {
    const allowed = ['descriptionHtml', 'phone', 'website', 'email', 'hours', 'bookingUrl', 'address'];
    const changes = Object.fromEntries(Object.entries(p).filter(([k]) => allowed.includes(k)).map(([k, v]) => [k, k === 'descriptionHtml' ? sanitizeHtml(String(v)) : v]));
    const [prev] = await db.select().from(schema.listings).where(eq(schema.listings.id, s.entityId));
    const [{ v }] = await db.select({ v: sql<number>`coalesce(max(version),0)::int` }).from(schema.contentVersions).where(and(eq(schema.contentVersions.entity, 'listings'), eq(schema.contentVersions.entityId, s.entityId)));
    await db.insert(schema.contentVersions).values({ entity: 'listings', entityId: s.entityId, version: v + 1, data: prev, createdBy: user.id, note: `Before stakeholder update #${id}` });
    await db.update(schema.listings).set({ ...changes, updatedAt: new Date() }).where(eq(schema.listings.id, s.entityId));
    dest = `/admin/content/listings/${s.entityId}/`;
  } else throw new Error('This submission type cannot be converted');
  await db.update(schema.submissions).set({ status: 'approved', notes: [...s.notes, { at: new Date().toISOString(), by: user.name, text: `Approved → ${dest}` }] }).where(eq(schema.submissions.id, id));
  await audit({ userId: user.id, action: 'submission.convert', entity: 'submission', entityId: id, detail: { dest } });
  revalidatePath('/', 'layout'); redirect(dest);
}

/* ───────────── Stakeholder portal ───────────── */
export async function proposeListingUpdate(listingId: number, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('stakeholder.propose');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const [l] = await db.select().from(schema.listings).where(eq(schema.listings.id, listingId));
  if (!l || l.ownerUserId !== user.id) return { error: 'You can only propose updates to listings linked to your account.' };
  const payload: Record<string, string> = {};
  for (const k of ['descriptionHtml', 'phone', 'website', 'email', 'hours', 'bookingUrl']) { const v = String(fd.get(k) ?? '').trim(); if (v && v !== String((l as Record<string, unknown>)[k] ?? '')) payload[k] = v.slice(0, 5000); }
  if (!Object.keys(payload).length) return { error: 'No changes to submit.' };
  await db.insert(schema.submissions).values({ site: 'visit', type: 'listing_update', name: user.name, email: user.email, organisation: user.organisation, subject: `Update to ${l.name}`, payload, entity: 'listing', entityId: l.id, submittedBy: user.id });
  await audit({ userId: user.id, action: 'stakeholder.propose', entity: 'listing', entityId: l.id });
  return { ok: true, message: 'Thanks — your changes were sent to the tourism team for review. Nothing changes publicly until they approve.' };
}

/* ───────────── Users ───────────── */
const UserIn = z.object({ email: z.string().email().max(255), name: z.string().min(1).max(120), role: z.enum(schema.roleEnum.enumValues), sites: z.array(z.enum(['visit', 'edo'])).min(1), organisation: z.string().max(160).optional() });
export async function saveUser(id: number | null, _: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('users.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const p = UserIn.safeParse({ email: String(fd.get('email') ?? '').toLowerCase().trim(), name: fd.get('name'), role: fd.get('role'), sites: fd.getAll('sites'), organisation: fd.get('organisation') || undefined });
  if (!p.success) return { error: 'Check the user details (valid email, name, role and at least one site).' };
  const pw = String(fd.get('password') ?? '');
  if (pw && (pw.length < 12 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw))) return { error: 'Passwords need at least 12 characters including letters and numbers.' };
  if (id) {
    if (id === user.id && p.data.role !== 'admin') return { error: 'You cannot remove your own administrator role.' };
    await db.update(schema.users).set({ ...p.data, active: fd.get('active') === 'on', ...(pw ? { passwordHash: await hashPassword(pw), failedLogins: 0, lockedUntil: null } : {}), updatedAt: new Date() }).where(eq(schema.users.id, id));
    if (pw || fd.get('active') !== 'on') await db.delete(schema.sessions).where(eq(schema.sessions.userId, id));
  } else {
    if (!pw) return { error: 'Set an initial password.' };
    try { await db.insert(schema.users).values({ ...p.data, passwordHash: await hashPassword(pw) }); } catch { return { error: 'A user with that email already exists.' }; }
  }
  await audit({ userId: user.id, action: id ? 'user.update' : 'user.create', entity: 'user', entityId: id ?? undefined, detail: { email: p.data.email, role: p.data.role } });
  revalidatePath('/admin/users/'); if (!id) redirect('/admin/users/?created=1');
  return { ok: true, message: 'User saved.' };
}

/* ───────────── Settings & integrations ───────────── */
export async function saveSetting(_: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser('settings.manage');
  try { await assertCsrf(user, fd.get('_csrf')); } catch (e) { return { error: (e as Error).message }; }
  const site = String(fd.get('site')) as Site; const key = String(fd.get('key'));
  let value: unknown; try { value = JSON.parse(String(fd.get('value'))); } catch { return { error: 'Settings value must be valid JSON.' }; }
  await db.insert(schema.settings).values({ site, key, value }).onConflictDoUpdate({ target: [schema.settings.site, schema.settings.key], set: { value, updatedAt: new Date() } });
  await audit({ userId: user.id, action: 'settings.update', site, detail: { key } });
  revalidatePath('/', 'layout'); return { ok: true, message: 'Settings saved.' };
}
export async function toggleIntegration(fd: FormData) {
  const user = await requireUser('settings.manage'); await assertCsrf(user, fd.get('_csrf'));
  const key = String(fd.get('key')); const enabled = fd.get('enabled') === 'true';
  await db.update(schema.integrations).set({ enabled, updatedAt: new Date() }).where(eq(schema.integrations.key, key));
  await audit({ userId: user.id, action: 'integration.toggle', detail: { key, enabled } }); revalidatePath('/admin/settings/');
}
export async function retryCrmSync(fd: FormData) {
  const user = await requireUser('submissions.manage'); await assertCsrf(user, fd.get('_csrf'));
  const { syncSubmissionToCrm } = await import('@/lib/integrations');
  const failed = await db.select({ id: schema.submissions.id }).from(schema.submissions).where(sql`crm_sync_status in ('failed','pending')`).orderBy(desc(schema.submissions.id)).limit(50);
  for (const f of failed) await syncSubmissionToCrm(f.id);
  await audit({ userId: user.id, action: 'crm.retry', detail: { count: failed.length } }); revalidatePath('/admin/submissions/');
}
