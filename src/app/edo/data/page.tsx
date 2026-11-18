import type { Metadata } from 'next';
import { getIndicators, getDistricts } from '@/lib/edo-content';
import { EdoHero } from '@/components/edo/EdoHero';
import { Stat } from '@/components/edo/Stat';
import { BarChart } from '@/components/edo/BarChart';
import { edo } from '@/lib/edo';
export const metadata: Metadata = { title: 'Economic Data Portal', description: 'Verified economic indicators for Chandler, Arizona with sources and update dates.' };
export const revalidate = 600;
export default async function DataPortal() {
  const [ind, districts] = await Promise.all([getIndicators(), getDistricts()]);
  const groups: [string, string][] = [['business', 'Business climate'], ['real_estate', 'Real estate']];
  const employers = ind.filter((x) => x.key.startsWith('top_employer_')).sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0));
  const jobs = districts.map(({ d }) => ({ label: d.name, value: ind.find((x) => x.key === `district_${d.slug.replace(/-/g, '_')}_jobs`)?.numericValue ?? 0, sub: 'Total jobs' })).filter((x) => x.value);
  const latest = ind.reduce((a, x) => (x.capturedAt > a ? x.capturedAt : a), new Date(0));
  return (<>
    <EdoHero title="Economic data portal" eyebrow="Market intelligence" summary="Every figure on this page is taken from a published City of Chandler source and links back to it. No estimates are shown." crumbs={[{ label: 'Economic Development', href: edo('/') }, { label: 'Data', href: edo('/data/') }]} />
    <div className="mx-auto max-w-[1440px] space-y-16 px-5 py-14 sm:px-8">
      <p className="font-mono text-xs text-edo-slate">Data last refreshed from sources: {latest.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      {groups.map(([g, label]) => { const rows = ind.filter((x) => x.category === g); return rows.length ? (
        <section key={g}><h2 className="font-[family-name:var(--font-edo-display)] text-3xl font-bold text-edo-navy">{label}</h2><div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{rows.map((s) => <Stat key={s.key} value={s.value} label={s.label} source={s.sourceUrl} asOf={s.asOf} />)}</div></section>) : null; })}
      {employers.length > 0 && <section><h2 className="font-[family-name:var(--font-edo-display)] text-3xl font-bold text-edo-navy">Top 10 private employers</h2><div className="mt-6 border border-edo-line p-6"><BarChart rows={employers.map((e) => ({ label: e.label, value: e.numericValue ?? 0, sub: e.category?.split(':')[1] }))} unit="Chandler-based jobs" caption="Top private employers by Chandler-based jobs" source={{ name: employers[0].sourceName, url: employers[0].sourceUrl }} /></div></section>}
      {jobs.length > 0 && <section><h2 className="font-[family-name:var(--font-edo-display)] text-3xl font-bold text-edo-navy">Jobs by employment district</h2><div className="mt-6 border border-edo-line p-6"><BarChart rows={jobs} unit="jobs" caption="Total jobs by employment district" source={{ name: 'City of Chandler district pages', url: 'https://www.chandleraz.gov/business/economic-development/employment-and-business-districts' }} /></div></section>}
      <section><h2 className="font-[family-name:var(--font-edo-display)] text-3xl font-bold text-edo-navy">All indicators</h2>
        <div className="mt-6 overflow-x-auto border border-edo-line"><table className="w-full min-w-[720px] text-left text-sm"><caption className="sr-only">All published indicators with sources</caption>
          <thead className="bg-edo-paper"><tr className="font-mono text-[11px] uppercase tracking-wider text-edo-slate"><th scope="col" className="p-3">Indicator</th><th scope="col" className="p-3">Value</th><th scope="col" className="p-3">Source</th><th scope="col" className="p-3">As of</th></tr></thead>
          <tbody>{ind.map((x) => <tr key={x.key} className="border-t border-edo-line"><td className="p-3">{x.label}</td><td className="p-3 font-mono font-medium">{x.value}</td><td className="p-3"><a href={x.sourceUrl} className="text-edo-skytext underline">{x.sourceName}</a></td><td className="p-3 text-edo-slate">{x.asOf ?? '—'}</td></tr>)}</tbody></table></div>
        <p className="mt-4 text-sm text-edo-slate">Need custom research? The Economic Development team provides custom data reports on request — <a href={edo('/contact-us/')} className="text-edo-skytext underline">contact the team</a>. Live dashboards from the City’s data provider are available on <a href={edo('/market-research-data-and-maps/')} className="text-edo-skytext underline">Research, Data & Maps</a>.</p>
      </section>
    </div>
  </>);
}
