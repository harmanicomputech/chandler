import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Building2, Rocket, Store, GraduationCap, Globe2, MapPinned, Landmark, Handshake } from 'lucide-react';
import { getIndicators, getIndustries, getDistricts, queryProperties, getEdoEvents } from '@/lib/edo-content';
import { EdoEventRow } from '@/components/edo/EdoEventRow';
import { queryArticles } from '@/lib/content';
import { Stat } from '@/components/edo/Stat';
import { BarChart } from '@/components/edo/BarChart';
import { DistrictMap } from '@/components/edo/DistrictMap';
import { Img } from '@/components/shared/Img';
import { edo } from '@/lib/edo';
import { JsonLd } from '@/components/shared/JsonLd';

export const revalidate = 600;

export default async function EdoHome() {
  const [ind, industries, districts, props, news, evs] = await Promise.all([getIndicators(), getIndustries(), getDistricts(), queryProperties(), queryArticles({ site: 'edo', limit: 3 }), getEdoEvents()]);
  const nextEvents = [...evs.upcoming, ...evs.ongoing].slice(0, 3);
  const k = (key: string) => ind.find((x) => x.key === key);
  const headline = ['bond_rating', 'city_sales_tax', 'fortune_1000_presence', 'office_sf', 'industrial_sf', 'az_corporate_tax'].map(k).filter(Boolean) as typeof ind;
  const employers = ind.filter((x) => x.key.startsWith('top_employer_')).sort((a, b) => (b.numericValue ?? 0) - (a.numericValue ?? 0));
  const dStat = (slug: string, f: string) => ind.find((x) => x.key === `district_${slug.replace(/-/g, '_')}_${f}`)?.value;
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'GovernmentOrganization', name: 'City of Chandler Economic Development Division', telephone: '480-782-3030', email: 'economicdevelopment@chandleraz.gov', address: { '@type': 'PostalAddress', streetAddress: '175 S. Arizona Ave.', addressLocality: 'Chandler', addressRegion: 'AZ', postalCode: '85225' } }} />
      {/* HERO */}
      <section className="edo-grid-bg relative overflow-hidden bg-edo-ink text-white">
        <div aria-hidden className="absolute -right-40 top-0 size-[700px] rounded-full bg-edo-sky/25 blur-[140px]" />
        <div className="relative mx-auto grid max-w-[1440px] gap-14 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-12 lg:pb-28 lg:pt-24">
          <div className="lg:col-span-7">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-edo-gold" style={{ animation: 'rise .8s var(--ease-out-expo) both' }}>City of Chandler, Arizona · Economic Development</p>
            <h1 className="split-words mt-6 font-[family-name:var(--font-edo-display)] text-[clamp(3rem,7vw,6.25rem)] font-bold leading-[0.95] tracking-[-0.03em]">
              {'Community of Innovation.'.split(' ').map((w, i) => <span key={i} style={{ '--i': i } as React.CSSProperties} className={i === 2 ? 'text-edo-gold' : ''}>{w}&nbsp;</span>)}
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-white/75" style={{ animation: 'rise .9s var(--ease-out-expo) .4s both' }}>Experience firsthand the business environment and lifestyle that have made Chandler a destination of choice for global industry leaders, exciting startups, talented workers and their families.</p>
            <div className="mt-10 flex flex-wrap gap-3" style={{ animation: 'rise .9s var(--ease-out-expo) .55s both' }}>
              <Link href={edo('/contact-us/initiate-a-project/')} className="inline-flex items-center gap-2 bg-edo-gold px-6 py-4 font-semibold text-edo-ink transition hover:bg-white">Initiate a project <ArrowRight className="size-4" aria-hidden /></Link>
              <Link href={edo('/properties/')} className="inline-flex items-center gap-2 border border-white/30 px-6 py-4 font-semibold transition hover:bg-white hover:text-edo-ink">Explore sites & properties</Link>
              <Link href={edo('/data/')} className="inline-flex items-center gap-2 px-4 py-4 font-semibold text-white/80 hover:text-white">Data portal <ArrowUpRight className="size-4" aria-hidden /></Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-end lg:col-span-5">
            {headline.map((s) => <Stat key={s.key} dark value={s.value} label={s.label} source={s.sourceUrl} asOf={null} />)}
          </div>
        </div>
      </section>

      {/* EMPLOYERS */}
      {employers.length > 0 && (
        <section className="border-b border-edo-line py-20 sm:py-24">
          <div className="mx-auto grid max-w-[1440px] gap-12 px-5 sm:px-8 lg:grid-cols-12">
            <div className="lg:col-span-4" data-reveal>
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-edo-skytext">Major employers</p>
              <h2 className="mt-3 font-[family-name:var(--font-edo-display)] text-4xl font-bold leading-tight tracking-tight text-edo-navy">Global leaders choose Chandler.</h2>
              <p className="mt-4 text-edo-slate">The ten largest private-sector employers by number of Chandler-based jobs, as published by the City.</p>
              {k('fortune_1000_employment_share') && <p className="mt-6 border-l-4 border-edo-gold pl-4 text-edo-ink"><span className="font-[family-name:var(--font-edo-display)] text-3xl font-bold">{k('fortune_1000_employment_share')!.value}</span> <span className="text-sm text-edo-slate">of citywide employment is at Fortune 1000 companies with Chandler offices.</span></p>}
              <Link href={edo('/market-research-data-and-maps/')} className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-edo-skytext">Market research, data & maps <ArrowRight className="size-4" aria-hidden /></Link>
            </div>
            <div className="lg:col-span-8"><BarChart rows={employers.map((e) => ({ label: e.label, value: e.numericValue ?? 0, sub: e.category?.split(':')[1] }))} unit="Chandler-based jobs" caption="Top 10 private employers in Chandler by number of jobs" source={{ name: employers[0].sourceName, url: employers[0].sourceUrl }} /></div>
          </div>
        </section>
      )}

      {/* INDUSTRIES */}
      <section className="bg-edo-paper py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6" data-reveal><div><p className="font-mono text-xs uppercase tracking-[0.2em] text-edo-skytext">Key industries</p><h2 className="mt-3 font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight text-edo-navy sm:text-5xl">Where Chandler leads.</h2></div>
            <Link href={edo('/key-industries-and-employers/')} className="inline-flex items-center gap-2 border border-edo-navy px-5 py-3 text-sm font-semibold text-edo-navy hover:bg-edo-navy hover:text-white">All industries <ArrowRight className="size-4" aria-hidden /></Link></div>
          <ul className={`mt-12 grid gap-px bg-edo-line sm:grid-cols-2 ${industries.length % 4 === 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
            {industries.map(({ i, img, imgAlt }, n) => (
              <li key={i.id} className="bg-white" data-reveal style={{ '--reveal-delay': `${(n % 3) * 60}ms` } as React.CSSProperties}>
                <Link href={edo(`/key-industries-and-employers/${i.slug}/`)} className="group flex h-full flex-col">
                  <div className="relative aspect-[16/10] overflow-hidden bg-edo-navy"><Img src={img} alt={imgAlt ?? ''} fill sizes="25vw" className="object-cover opacity-90 transition duration-700 group-hover:scale-105 group-hover:opacity-100" /></div>
                  <div className="flex flex-1 flex-col p-6"><p className="font-mono text-[11px] text-edo-skytext">{String(n + 1).padStart(2, '0')}</p><p className="mt-2 font-[family-name:var(--font-edo-display)] text-xl font-bold text-edo-navy">{i.name}</p><p className="mt-2 line-clamp-3 text-sm text-edo-slate">{i.summary}</p><span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-edo-skytext">Explore <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden /></span></div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* DISTRICTS */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <div data-reveal><p className="font-mono text-xs uppercase tracking-[0.2em] text-edo-skytext">Employment & business districts</p><h2 className="mt-3 max-w-3xl font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight text-edo-navy sm:text-5xl">Four districts. Distinct advantages.</h2></div>
          <div className="mt-12 grid gap-8 lg:grid-cols-12">
            <div className="overflow-hidden border border-edo-line lg:col-span-7"><DistrictMap districts={districts.map(({ d }) => ({ slug: d.slug, name: d.name, lat: d.latitude!, lng: d.longitude! })).filter((d) => d.lat)} /></div>
            <ul className="grid gap-px bg-edo-line lg:col-span-5">
              {districts.map(({ d }) => (
                <li key={d.id} className="bg-white"><Link href={edo(`/employment-and-business-districts/${d.slug}/`)} className="group grid grid-cols-[1fr_auto] gap-4 p-5 hover:bg-edo-paper">
                  <div><p className="font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy">{d.name}</p>
                    <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs text-edo-slate">
                      {dStat(d.slug, 'jobs') && <div><dt className="inline">Jobs </dt><dd className="inline font-medium text-edo-ink">{dStat(d.slug, 'jobs')}</dd></div>}
                      {dStat(d.slug, 'businesses') && <div><dt className="inline">Businesses </dt><dd className="inline font-medium text-edo-ink">{dStat(d.slug, 'businesses')}</dd></div>}
                      {dStat(d.slug, 'sqmi') && <div><dt className="inline">Area </dt><dd className="inline font-medium text-edo-ink">{dStat(d.slug, 'sqmi')}</dd></div>}
                    </dl></div>
                  <ArrowUpRight className="size-5 text-edo-skytext transition group-hover:rotate-45" aria-hidden /></Link></li>
              ))}
            </ul>
          </div>
          <p className="mt-3 font-mono text-[11px] text-edo-slate">District figures as published on City of Chandler district pages.</p>
        </div>
      </section>

      {/* PROPERTY CTA */}
      <section className="edo-grid-bg bg-edo-navy py-20 text-white">
        <div className="mx-auto grid max-w-[1440px] items-center gap-10 px-5 sm:px-8 lg:grid-cols-12">
          <div className="lg:col-span-7" data-reveal><p className="font-mono text-xs uppercase tracking-[0.2em] text-edo-gold">Site selection</p><h2 className="mt-3 font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight sm:text-5xl">Find your next location.</h2>
            <p className="mt-4 max-w-xl text-white/75">Search, map and compare office, industrial, retail and land opportunities — then talk to the team that knows every site.</p>
            <div className="mt-8 flex flex-wrap gap-3"><Link href={edo('/properties/')} className="inline-flex items-center gap-2 bg-white px-6 py-4 font-semibold text-edo-navy hover:bg-edo-gold">Open property explorer <ArrowRight className="size-4" aria-hidden /></Link><Link href={edo('/business-services/site-selection/')} className="border border-white/30 px-6 py-4 font-semibold hover:bg-white/10">Site selection services</Link></div></div>
          <div className="grid grid-cols-3 gap-px bg-white/15 lg:col-span-5">{(['office', 'industrial', 'land'] as const).map((t) => <div key={t} className="bg-edo-navy p-5"><p className="font-[family-name:var(--font-edo-display)] text-4xl font-bold">{props.filter((p) => p.p.type === t).length}</p><p className="mt-1 text-sm capitalize text-white/70">{t} records</p></div>)}
            <p className="col-span-3 bg-edo-navy p-4 font-mono text-[11px] text-edo-gold">Demonstration dataset — production connects to the City’s licensed property database.</p></div>
        </div>
      </section>

      {/* SERVICES */}
      <section className="py-20 sm:py-24">
        <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
          <h2 className="font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight text-edo-navy" data-reveal>Business services</h2>
          <ul className="mt-10 grid gap-px bg-edo-line sm:grid-cols-2 lg:grid-cols-4">
            {[[Landmark, 'Incentives & funding', '/business-services/incentives-and-funding/'], [MapPinned, 'Site selection', '/business-services/site-selection/'], [Rocket, 'Startups', '/business-services/resources-for-startups/'], [Store, 'Small business', '/business-services/small-business-resources/'],
              [GraduationCap, 'Workforce development', '/business-services/workforce-development-resources/'], [Globe2, 'Export services', '/business-services/export-services/'], [Handshake, "Let's Talk Business", '/business-services/lets-talk-business/'], [Building2, 'Business location strategy', '/business-location-strategy/']].map(([Icon, label, href], n) => {
              const I = Icon as typeof Landmark;
              return <li key={href as string} className="bg-white" data-reveal style={{ '--reveal-delay': `${(n % 4) * 50}ms` } as React.CSSProperties}><Link href={edo(href as string)} className="group flex h-full items-start justify-between gap-4 p-6 hover:bg-edo-paper"><span><I className="size-7 text-edo-skytext" strokeWidth={1.5} aria-hidden /><span className="mt-6 block font-semibold text-edo-navy">{label as string}</span></span><ArrowUpRight className="size-5 text-edo-slate transition group-hover:rotate-45 group-hover:text-edo-skytext" aria-hidden /></Link></li>;
            })}
          </ul>
        </div>
      </section>

      {/* EVENTS */}
      {nextEvents.length > 0 && (
        <section className="py-20" aria-labelledby="edo-events">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
            <div className="flex items-end justify-between"><h2 id="edo-events" className="font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight text-edo-navy">Upcoming business events</h2><Link href={edo('/events/')} className="text-sm font-semibold text-edo-skytext">All events →</Link></div>
            <ul className="mt-8 space-y-px bg-edo-line">{nextEvents.map(({ e }) => <EdoEventRow key={e.id} e={e} />)}</ul>
          </div>
        </section>
      )}

      {/* NEWS */}
      {news.rows.length > 0 && (
        <section className="bg-edo-paper py-20">
          <div className="mx-auto max-w-[1440px] px-5 sm:px-8">
            <div className="flex items-end justify-between"><h2 className="font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight text-edo-navy">News & insights</h2><Link href={edo('/news/')} className="text-sm font-semibold text-edo-skytext">All news →</Link></div>
            <ul className="mt-10 grid gap-8 md:grid-cols-3">{news.rows.map((a) => (
              <li key={a.id} data-reveal><Link href={edo(`/news/${a.slug}/`)} className="group block bg-white"><div className="relative aspect-[16/9] overflow-hidden bg-edo-navy"><Img src={a.image} alt={a.imageAlt ?? ''} fill sizes="33vw" className="object-cover transition duration-700 group-hover:scale-105" /></div>
                <div className="p-6"><p className="font-mono text-[11px] uppercase tracking-wider text-edo-skytext">{a.categories[0]}</p><p className="mt-2 font-[family-name:var(--font-edo-display)] text-lg font-bold leading-snug text-edo-navy group-hover:underline">{a.title}</p></div></Link></li>
            ))}</ul>
          </div>
        </section>
      )}
    </>
  );
}
