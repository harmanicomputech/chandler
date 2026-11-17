import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Outbound integration adapters. Each one is inert until its environment variables are present,
 * records its health in the `integrations` table, retries transient failures, and never throws
 * into the user's request — a failed sync leaves the record `crm_sync_status = 'failed'` so staff
 * can see it in the admin and re-queue it.
 *
 *  CRM_WEBHOOK_URL / CRM_WEBHOOK_SECRET   – generic signed webhook (Simpleview CRM, Salesforce, HubSpot via middleware)
 *  NEWSLETTER_WEBHOOK_URL                  – newsletter provider list-subscribe endpoint
 *  EMAIL_WEBHOOK_URL / STAFF_NOTIFY_TO     – transactional e-mail relay for staff notifications
 */
type Result = { ok: boolean; status: 'sent' | 'not_configured' | 'failed'; error?: string };

async function record(key: string, label: string, ok: boolean, error?: string) {
  await db.insert(schema.integrations).values({ key, label, enabled: true, lastStatus: ok ? 'ok' : 'error', lastCheckedAt: new Date(), lastError: error ?? null })
    .onConflictDoUpdate({ target: schema.integrations.key, set: { lastStatus: ok ? 'ok' : 'error', lastCheckedAt: new Date(), lastError: error ?? null } }).catch(() => {});
}

async function postJson(url: string, body: unknown, secret?: string, attempts = 3): Promise<void> {
  const payload = JSON.stringify(body);
  const sig = secret ? (await import('node:crypto')).createHmac('sha256', secret).update(payload).digest('hex') : undefined;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...(sig ? { 'x-signature-sha256': sig } : {}) }, body: payload, signal: AbortSignal.timeout(8000) });
      if (r.ok) return;
      if (r.status < 500 && r.status !== 429) throw Object.assign(new Error(`HTTP ${r.status}`), { fatal: true });
      last = new Error(`HTTP ${r.status}`);
    } catch (e) { last = e; if ((e as { fatal?: boolean }).fatal) break; }
    await new Promise((res) => setTimeout(res, 400 * 2 ** i));
  }
  throw last;
}

export async function syncSubmissionToCrm(submissionId: number): Promise<Result> {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) {
    await db.update(schema.submissions).set({ crmSyncStatus: 'not_configured' }).where(eq(schema.submissions.id, submissionId));
    return { ok: false, status: 'not_configured' };
  }
  const [s] = await db.select().from(schema.submissions).where(eq(schema.submissions.id, submissionId));
  try {
    await postJson(url, { source: 'chandler-platform', submission: s }, process.env.CRM_WEBHOOK_SECRET);
    await db.update(schema.submissions).set({ crmSyncStatus: 'synced' }).where(eq(schema.submissions.id, submissionId));
    await record('crm', 'CRM webhook', true);
    return { ok: true, status: 'sent' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[crm] sync failed', submissionId, msg);
    await db.update(schema.submissions).set({ crmSyncStatus: 'failed' }).where(eq(schema.submissions.id, submissionId));
    await record('crm', 'CRM webhook', false, msg);
    return { ok: false, status: 'failed', error: msg };
  }
}

export async function notifyStaff(subject: string, text: string): Promise<Result> {
  const url = process.env.EMAIL_WEBHOOK_URL; const to = process.env.STAFF_NOTIFY_TO;
  if (!url || !to) { console.info('[email] not configured — notification skipped:', subject); return { ok: false, status: 'not_configured' }; }
  try { await postJson(url, { to, subject, text }); await record('email', 'Staff e-mail notifications', true); return { ok: true, status: 'sent' }; }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); await record('email', 'Staff e-mail notifications', false, msg); return { ok: false, status: 'failed', error: msg }; }
}

export async function subscribeNewsletter(sub: { email: string; firstName?: string; site: string; interests: string[] }): Promise<Result> {
  const url = process.env.NEWSLETTER_WEBHOOK_URL;
  if (!url) return { ok: false, status: 'not_configured' };
  try { await postJson(url, sub); await record('newsletter', 'Newsletter provider', true); return { ok: true, status: 'sent' }; }
  catch (e) { const msg = e instanceof Error ? e.message : String(e); await record('newsletter', 'Newsletter provider', false, msg); return { ok: false, status: 'failed', error: msg }; }
}
