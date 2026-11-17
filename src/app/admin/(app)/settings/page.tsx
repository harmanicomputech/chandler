import { asc } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth';
import { PageHeader, Card, Badge, fmt } from '@/components/admin/ui';
import { SettingForm } from '@/components/admin/SettingForm';
import { toggleIntegration } from '../../actions';

/** Env-var presence only — secret values are never read into the UI. */
const ENV: [string, string][] = [['DATABASE_URL', 'Database'], ['ANTHROPIC_API_KEY', 'AI concierge (Claude)'], ['CRM_WEBHOOK_URL', 'CRM webhook'], ['NEWSLETTER_WEBHOOK_URL', 'Newsletter provider'], ['EMAIL_WEBHOOK_URL', 'Staff e-mail relay'], ['NEXT_PUBLIC_GTM_ID_VISIT', 'GTM (Visit Chandler)'], ['NEXT_PUBLIC_GTM_ID_EDO', 'GTM (EDO)'], ['NEXT_PUBLIC_MAP_TILE_URL', 'Custom map tiles'], ['NWS_USER_AGENT', 'NWS contact user-agent'], ['EDO_HOSTS', 'EDO host names']];
export default async function Settings() {
  const user = await requireUser('settings.manage');
  const [settings, integ] = await Promise.all([db.select().from(schema.settings).orderBy(asc(schema.settings.site)), db.select().from(schema.integrations).orderBy(asc(schema.integrations.key))]);
  return (
    <>
      <PageHeader title="Settings" subtitle="Website configuration, integrations and environment status" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Integrations"><ul className="divide-y divide-slate-100">{integ.map((i) => (
          <li key={i.key} className="flex items-center justify-between gap-3 py-3 text-sm"><div><p className="font-medium">{i.label}</p><p className="text-xs text-slate-600">{i.lastCheckedAt ? `Last check ${fmt(i.lastCheckedAt)}` : 'Not yet checked'}{i.lastError && ` · ${i.lastError}`}</p></div>
            <div className="flex items-center gap-2"><Badge value={i.enabled ? i.lastStatus : 'not_configured'} /><form action={toggleIntegration}><input type="hidden" name="_csrf" value={user.csrfToken} /><input type="hidden" name="key" value={i.key} /><input type="hidden" name="enabled" value={String(!i.enabled)} /><button className="rounded border border-slate-300 px-2 py-1 text-xs">{i.enabled ? 'Disable' : 'Enable'}</button></form></div></li>
        ))}</ul></Card>
        <Card title="Environment configuration"><ul className="space-y-2 text-sm">{ENV.map(([k, l]) => <li key={k} className="flex justify-between"><span>{l} <code className="text-xs text-slate-600">{k}</code></span>{process.env[k] ? <Badge value="ok" /> : <Badge value="not_configured" />}</li>)}</ul><p className="mt-3 text-xs text-slate-600">Secrets are managed in the hosting platform’s secret store and are never displayed or stored in the CMS database.</p></Card>
        {settings.map((s) => <SettingForm key={s.site + s.key} site={s.site} k={s.key} value={JSON.stringify(s.value, null, 2)} csrf={user.csrfToken} />)}
        <SettingForm site="visit" k="seo" value={JSON.stringify({ defaultOgImage: '/images/homepage/hot-air-expeditions.jpg', twitter: '@VisitChandler' }, null, 2)} csrf={user.csrfToken} isNew />
      </div>
    </>
  );
}
