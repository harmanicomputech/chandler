import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Download, Phone } from 'lucide-react';
import { getPage, childPages } from '@/lib/content';
import { getIndustries, getDistricts, getStaff, getIndicators } from '@/lib/edo-content';
import { followRedirect } from '@/lib/redirects';
import { sanitizeHtml } from '@/lib/sanitize';
import { SmartForm } from '@/components/shared/SmartForm';
import { FORMS } from '@/lib/forms';
import { Img } from '@/components/shared/Img';
import { EdoHero } from '@/components/edo/EdoHero';
import { Stat } from '@/components/edo/Stat';
import { edo, EDO_BASE } from '@/lib/edo';

type P = { params: Promise<{ slug: string[] }> };
const toPath = (s: string[]) => '/' + s.map(decodeURIComponent).join('/') + '/';
export async function generateMetadata({ params }: P): Promise<Metadata> {
  const p = await getPage('edo', toPath((await params).slug)); if (!p) return {};
  return { title: p.title, description: p.seoDescription ?? p.summary ?? undefined, alternates: { canonical: edo(p.path) } };
}

export default async function EdoPage({ params }: P) {
  const path = toPath((await params).slug);
  const page = await getPage('edo', path);
  if (!page) { await followRedirect('edo', path, EDO_BASE); notFound(); }
  const blocks = (page.blocks ?? []) as any[];
  const [kids, industries, districts, staff, ind] = await Promise.all([childPages('edo', path), path === '/key-industries-and-employers/' ? getIndustries() : null, path === '/employment-and-business-districts/' ? getDistricts() : null, path === '/contact-us/' ? getStaff() : null, page.template === 'district' ? getIndicators('districts') : null]);
  const dslug = path.split('/').filter(Boolean)[1]?.replace(/-/g, '_');
  const dStats = ind?.filter((x) => x.key.startsWith(`district_${dslug}_`)) ?? [];
  const form = blocks.find((b) => b.type === 'form');
  const crumbs = [{ label: 'Economic Development', href: edo('/') }, ...path.split('/').filter(Boolean).map((s, i, a) => ({ label: i === a.length - 1 ? page.title : s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), href: edo('/' + a.slice(0, i + 1).join('/') + '/') }))];
  return (
    <>
      <EdoHero title={page.title} summary={page.summary} image={page.hero?.url} crumbs={crumbs} />
      {dStats.length > 0 && <div className="relative z-10 mx-auto -mt-10 grid max-w-[1440px] grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-6">{dStats.map((s) => <Stat key={s.key} value={s.value} label={s.label.split(': ')[1]} source={s.sourceUrl} asOf={s.asOf} />)}</div>}
      <div className="mx-auto grid max-w-[1440px] gap-14 px-5 py-16 sm:px-8 lg:grid-cols-12">
        <div className="lg:col-span-8">
          {page.bodyHtml && <div className="prose-edo" dangerouslySetInnerHTML={{ __html: sanitizeHtml(page.bodyHtml) }} />}
          {industries && <ul className="mt-10 grid gap-px bg-edo-line sm:grid-cols-2">{industries.map(({ i, img }) => <li key={i.id} className="bg-white"><Link href={edo(`/key-industries-and-employers/${i.slug}/`)} className="group block"><div className="relative aspect-[16/9] overflow-hidden bg-edo-navy"><Img src={img} alt="" fill sizes="40vw" className="object-cover transition group-hover:scale-105" /></div><p className="p-5 font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy">{i.name} →</p></Link></li>)}</ul>}
          {districts && <ul className="mt-10 grid gap-px bg-edo-line sm:grid-cols-2">{districts.map(({ d, img }) => <li key={d.id} className="bg-white"><Link href={edo(`/employment-and-business-districts/${d.slug}/`)} className="group block"><div className="relative aspect-[16/9] overflow-hidden bg-edo-navy"><Img src={img} alt="" fill sizes="40vw" className="object-cover transition group-hover:scale-105" /></div><p className="p-5 font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy">{d.name} →</p></Link></li>)}</ul>}
          {staff && staff.length > 0 && <ul className="mt-10 grid gap-px bg-edo-line sm:grid-cols-2">{staff.map((s) => <li key={s.id} className="bg-white p-6"><p className="font-[family-name:var(--font-edo-display)] text-lg font-bold text-edo-navy">{s.name}</p><p className="text-sm text-edo-slate">{s.title}</p>{s.phone && <a href={`tel:${s.phone}`} className="mt-3 inline-flex items-center gap-2 font-mono text-sm text-edo-skytext"><Phone className="size-4" aria-hidden />{s.phone}</a>}</li>)}</ul>}
          {blocks.filter((b) => b.type === 'embeds').flatMap((b) => b.items).filter((u: string) => /storymaps|youtube|ecdev|issuu/.test(u)).map((u: string) => (
            <div key={u} className="mt-10 aspect-video border border-edo-line bg-edo-paper"><iframe src={u.replace('www.youtube.com/embed', 'www.youtube-nocookie.com/embed').replace('autoplay=1', 'autoplay=0')} title={/storymaps/.test(u) ? 'Interactive story map' : /ecdev/.test(u) ? 'Chandler data dashboard (GIS Planning)' : /issuu/.test(u) ? 'Publication' : 'Video'} loading="lazy" className="size-full" allowFullScreen /></div>
          ))}
          {form && FORMS[form.form] && <div className="mt-12 border border-edo-line bg-edo-paper p-6 sm:p-10"><h2 className="font-[family-name:var(--font-edo-display)] text-2xl font-bold text-edo-navy">{FORMS[form.form].title}</h2><div className="mt-6"><SmartForm formKey={form.form} spec={FORMS[form.form]} theme="edo" /></div></div>}
          {path === '/contact-us/' && <div className="mt-12 border border-edo-line bg-edo-paper p-6 sm:p-10"><h2 className="font-[family-name:var(--font-edo-display)] text-2xl font-bold text-edo-navy">Send an enquiry</h2><div className="mt-6"><SmartForm formKey="investor-enquiry" spec={FORMS['investor-enquiry']} theme="edo" /></div></div>}
        </div>
        <aside className="space-y-6 lg:col-span-4">
          {blocks.filter((b) => b.type === 'downloads').flatMap((b) => b.items).length > 0 && (
            <div className="border border-edo-line"><p className="border-b border-edo-line bg-edo-paper px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-edo-slate">Downloads</p>
              <ul>{blocks.filter((b) => b.type === 'downloads').flatMap((b) => b.items).map((d: { href: string; text: string }) => <li key={d.href} className="border-b border-edo-line last:border-0"><a href={d.href} className="flex items-center justify-between gap-3 px-5 py-4 text-sm font-semibold text-edo-navy hover:bg-edo-paper">{d.text || 'Document'}<Download className="size-4 shrink-0 text-edo-skytext" aria-hidden /></a></li>)}</ul></div>
          )}
          {kids.length > 0 && <div className="border border-edo-line"><p className="border-b border-edo-line bg-edo-paper px-5 py-3 font-mono text-[11px] uppercase tracking-wider text-edo-slate">In this section</p><ul>{kids.map((k) => <li key={k.path} className="border-b border-edo-line last:border-0"><Link href={edo(k.path)} className="flex items-center justify-between px-5 py-4 text-sm font-semibold text-edo-navy hover:bg-edo-paper">{k.title}<ArrowRight className="size-4 text-edo-skytext" aria-hidden /></Link></li>)}</ul></div>}
          <div className="edo-grid-bg bg-edo-navy p-6 text-white"><p className="font-[family-name:var(--font-edo-display)] text-xl font-bold">Ready to talk?</p><p className="mt-2 text-sm text-white/70">Confidential assistance for site selection, expansion and relocation.</p><Link href={edo('/contact-us/initiate-a-project/')} className="mt-5 inline-flex items-center gap-2 bg-edo-gold px-5 py-3 text-sm font-semibold text-edo-ink">Initiate a project <ArrowRight className="size-4" aria-hidden /></Link></div>
          {page.sourceUrl && <p className="font-mono text-[11px] text-edo-slate">Content migrated from <a href={page.sourceUrl} className="underline">chandleraz.gov</a></p>}
        </aside>
      </div>
    </>
  );
}
