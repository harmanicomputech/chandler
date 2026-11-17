import Link from 'next/link';
import { LayoutDashboard, FileText, MapPin, CalendarDays, Newspaper, Building, Image as ImageIcon, Menu, ArrowLeftRight, Inbox, Users, Settings, ScrollText, BarChart3, Handshake, Factory, Map, Database, FileDown, LogOut, ExternalLink } from 'lucide-react';
import { requireUser, can, type Permission } from '@/lib/auth';
import { logoutAction } from '../actions';
import { db, schema } from '@/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
const NAV: { group: string; items: { href: string; label: string; icon: typeof FileText; perm?: Permission }[] }[] = [
  { group: '', items: [{ href: '/admin/', label: 'Dashboard', icon: LayoutDashboard }] },
  { group: 'Content', items: [
    { href: '/admin/content/pages/', label: 'Pages', icon: FileText, perm: 'content.edit' }, { href: '/admin/content/listings/', label: 'Listings', icon: MapPin, perm: 'content.edit' },
    { href: '/admin/content/events/', label: 'Events', icon: CalendarDays, perm: 'content.edit' }, { href: '/admin/content/articles/', label: 'Articles & news', icon: Newspaper, perm: 'content.edit' },
  ] },
  { group: 'Economic Development', items: [
    { href: '/admin/content/properties/', label: 'Properties', icon: Building, perm: 'properties.edit' }, { href: '/admin/content/districts/', label: 'Districts', icon: Map, perm: 'content.edit' },
    { href: '/admin/content/industries/', label: 'Industries', icon: Factory, perm: 'content.edit' }, { href: '/admin/content/indicators/', label: 'Economic data', icon: Database, perm: 'content.edit' }, { href: '/admin/content/reports/', label: 'Reports', icon: FileDown, perm: 'content.edit' },
  ] },
  { group: 'Site', items: [
    { href: '/admin/media/', label: 'Media library', icon: ImageIcon, perm: 'media.manage' }, { href: '/admin/navigation/', label: 'Navigation', icon: Menu, perm: 'nav.manage' }, { href: '/admin/redirects/', label: 'Redirects', icon: ArrowLeftRight, perm: 'redirects.manage' },
  ] },
  { group: 'Operations', items: [
    { href: '/admin/submissions/', label: 'Submissions', icon: Inbox, perm: 'submissions.view' }, { href: '/admin/analytics/', label: 'Analytics', icon: BarChart3, perm: 'submissions.view' },
    { href: '/admin/users/', label: 'Users & roles', icon: Users, perm: 'users.manage' }, { href: '/admin/settings/', label: 'Settings', icon: Settings, perm: 'settings.manage' }, { href: '/admin/audit/', label: 'Audit log', icon: ScrollText, perm: 'audit.view' },
  ] },
  { group: 'Partner', items: [{ href: '/admin/portal/', label: 'My listings', icon: Handshake, perm: 'stakeholder.propose' }] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schema.submissions).where(sql`status = 'new'`);
  return (
    <div className="lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="bg-[#0f1b2d] text-white lg:sticky lg:top-0 lg:h-dvh lg:overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5"><span className="grid size-9 place-items-center rounded-md bg-gradient-to-br from-[#214FA1] to-[#00C1A0] font-bold">C</span><div className="leading-tight"><p className="font-semibold">Chandler CMS</p><p className="text-xs text-white/50">Shared content platform</p></div></div>
        <nav aria-label="Admin" className="space-y-5 px-3 py-5 text-sm">
          {NAV.map((g) => { const items = g.items.filter((i) => !i.perm || can(user, i.perm)); if (!items.length) return null; return (
            <div key={g.group}>{g.group && <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">{g.group}</p>}
              <ul>{items.map((i) => <li key={i.href}><Link href={i.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-white/75 hover:bg-white/5 hover:text-white"><i.icon className="size-4" aria-hidden />{i.label}{i.href === '/admin/submissions/' && n > 0 && <span className="ml-auto rounded-full bg-[#00C1A0] px-2 text-xs font-bold text-[#0f1b2d]">{n}</span>}</Link></li>)}</ul></div>); })}
        </nav>
        <div className="border-t border-white/10 px-5 py-4 text-sm"><p className="font-medium">{user.name}</p><p className="text-xs capitalize text-white/50">{user.role.replace('_', ' ')} · {user.sites.join(' + ')}</p>
          <div className="mt-3 flex gap-3"><Link href="/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"><ExternalLink className="size-3" aria-hidden />Visit site</Link><Link href="/edo/" className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"><ExternalLink className="size-3" aria-hidden />EDO site</Link>
            <form action={logoutAction}><button className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"><LogOut className="size-3" aria-hidden />Sign out</button></form></div></div>
      </aside>
      <div className="min-w-0 p-5 sm:p-8">{children}</div>
    </div>
  );
}
