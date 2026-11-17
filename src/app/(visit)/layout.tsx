import { SiteHeader } from '@/components/visit/SiteHeader';
import { SiteFooter } from '@/components/visit/SiteFooter';
import { RevealController } from '@/components/shared/RevealController';
import { Analytics } from '@/components/shared/Analytics';
import { getNav } from '@/lib/content';

export default async function VisitLayout({ children }: { children: React.ReactNode }) {
  const [main, utility, footer, legal] = await Promise.all([getNav('visit', 'main'), getNav('visit', 'utility'), getNav('visit', 'footer'), getNav('visit', 'legal')]);
  return (
    <div data-site="visit" className="flex min-h-dvh flex-col">
      <div aria-hidden className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left scale-x-0 bg-gradient-to-r from-blue-500 to-teal-400" id="scroll-progress" />
      <SiteHeader main={main} utility={utility} />
      <main id="main" className="flex-1">{children}</main>
      <SiteFooter columns={footer} legal={legal.flatMap((l) => [l, ...l.children])} />
      <RevealController />
      <Analytics site="visit" />
    </div>
  );
}
