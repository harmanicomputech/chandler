import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq, gt, lt } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Session authentication.
 *  - Opaque 256-bit random token in an HttpOnly, SameSite=Lax, Secure (prod) cookie.
 *  - Only the SHA-256 hash of the token is stored server-side.
 *  - Per-session CSRF token, verified on every state-changing admin request.
 *  - Account lock-out after repeated failures.
 */
const COOKIE = 'cc_session';
const SESSION_HOURS = 8;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export type Role = (typeof schema.roleEnum.enumValues)[number];
export type Site = 'visit' | 'edo';
export type SessionUser = {
  id: number; email: string; name: string; role: Role; sites: Site[]; organisation: string | null; csrfToken: string;
};

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

export async function hashPassword(pw: string) { return bcrypt.hash(pw, 12); }

export async function login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const h = await headers();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email.toLowerCase().trim())).limit(1);
  // Constant-ish work even when the user doesn't exist (mitigates user enumeration by timing).
  const valid = await bcrypt.compare(password, user?.passwordHash ?? '$2a$12$C6UzMDM.H6dfI/f/IKcEeO7sX1rQ0FzvYQe5mY0xY0bJm0bJm0bJm');
  if (!user || !user.active) return { ok: false, error: 'Invalid email or password.' };
  if (user.lockedUntil && user.lockedUntil > new Date()) return { ok: false, error: 'Account temporarily locked. Try again later.' };
  if (!valid) {
    const failed = user.failedLogins + 1;
    await db.update(schema.users).set({
      failedLogins: failed,
      lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
    }).where(eq(schema.users.id, user.id));
    await audit({ userId: user.id, action: 'auth.failed' });
    return { ok: false, error: 'Invalid email or password.' };
  }
  const token = crypto.randomBytes(32).toString('base64url');
  const csrf = crypto.randomBytes(24).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 3600_000);
  await db.insert(schema.sessions).values({
    id: sha256(token), userId: user.id, csrfToken: csrf, expiresAt,
    ip: h.get('x-forwarded-for')?.split(',')[0] ?? null, userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  });
  await db.update(schema.users).set({ failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: expiresAt,
  });
  await audit({ userId: user.id, action: 'auth.login' });
  return { ok: true };
}

export async function logout() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  jar.delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db.select({ u: schema.users, s: schema.sessions }).from(schema.sessions)
    .innerJoin(schema.users, eq(schema.sessions.userId, schema.users.id))
    .where(and(eq(schema.sessions.id, sha256(token)), gt(schema.sessions.expiresAt, new Date()))).limit(1);
  const row = rows[0];
  if (!row || !row.u.active) return null;
  return { id: row.u.id, email: row.u.email, name: row.u.name, role: row.u.role, sites: row.u.sites, organisation: row.u.organisation, csrfToken: row.s.csrfToken };
}

export async function purgeExpiredSessions() {
  await db.delete(schema.sessions).where(lt(schema.sessions.expiresAt, new Date()));
}

/* ───────────── Role-based access control ───────────── */
export type Permission =
  | 'content.edit' | 'content.publish' | 'content.delete' | 'media.manage' | 'nav.manage' | 'redirects.manage'
  | 'users.manage' | 'settings.manage' | 'submissions.view' | 'submissions.manage' | 'audit.view'
  | 'properties.edit' | 'stakeholder.propose';

const MATRIX: Record<Role, Permission[]> = {
  admin: ['content.edit', 'content.publish', 'content.delete', 'media.manage', 'nav.manage', 'redirects.manage', 'users.manage', 'settings.manage', 'submissions.view', 'submissions.manage', 'audit.view', 'properties.edit'],
  editor: ['content.edit', 'content.publish', 'media.manage', 'nav.manage', 'redirects.manage', 'submissions.view', 'submissions.manage', 'properties.edit'],
  tourism_staff: ['content.edit', 'media.manage', 'submissions.view', 'submissions.manage'],
  edo_staff: ['content.edit', 'media.manage', 'submissions.view', 'submissions.manage', 'properties.edit'],
  stakeholder: ['stakeholder.propose'],
};
export const ROLE_PERMISSIONS = MATRIX;

export function can(user: Pick<SessionUser, 'role' | 'sites'> | null, perm: Permission, site?: Site): boolean {
  if (!user) return false;
  if (!MATRIX[user.role].includes(perm)) return false;
  if (site && user.role !== 'admin' && !user.sites.includes(site)) return false;
  return true;
}

export async function requireUser(perm?: Permission, site?: Site): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect('/admin/login/');
  if (perm && !can(user, perm, site)) redirect('/admin/?denied=1');
  return user;
}

/** Verify the CSRF token submitted with an admin form (double-submit tied to the session) and the Origin header. */
export async function assertCsrf(user: SessionUser, submitted: FormDataEntryValue | null) {
  const h = await headers();
  const origin = h.get('origin');
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (origin && host && new URL(origin).host !== host) throw new Error('Cross-origin request rejected');
  const a = Buffer.from(String(submitted ?? '')); const b = Buffer.from(user.csrfToken);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error('Invalid CSRF token');
}

/* ───────────── Audit log ───────────── */
export async function audit(entry: { userId?: number | null; action: string; entity?: string; entityId?: number; site?: Site; detail?: Record<string, unknown> }) {
  let ip: string | null = null;
  try { ip = (await headers()).get('x-forwarded-for')?.split(',')[0] ?? null; } catch {}
  await db.insert(schema.auditLogs).values({ ...entry, userId: entry.userId ?? null, detail: entry.detail ?? {}, ip });
}
