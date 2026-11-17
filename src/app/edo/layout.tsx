import type { Metadata } from 'next';
import { EdoHeader } from '@/components/edo/EdoHeader';
import { EdoFooter } from '@/components/edo/EdoFooter';
import { RevealController } from '@/components/shared/RevealController';
import { Analytics } from '@/components/shared/Analytics';
import { getNav } from '@/lib/content';

export const metadata: Metadata = {
  title: { default: 'Chandler Economic Development | Chandler, Arizona', template: '%s | Chandler Economic Development' },
  description: 'Site selection, data, incentives and business services from the City of Chandler, Arizona — the Community of Innovation.',
  metadataBase: new URL(process.env.EDO_SITE_URL ?? 'http://localhost:3000'),
};

export default async function EdoLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNav('edo', 'main');
  return (
    <div data-site="edo" className="flex min-h-dvh flex-col bg-white font-[family-name:var(--font-edo)] text-edo-ink">
      <EdoHeader nav={nav} />
      <main id="main" className="flex-1">{children}</main>
      <EdoFooter nav={nav} />
      <RevealController />
      <Analytics site="edo" />
    </div>
  );
}
