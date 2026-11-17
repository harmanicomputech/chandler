import type { Metadata } from 'next';
export const metadata: Metadata = { title: { default: 'CMS', template: '%s · Chandler CMS' }, robots: { index: false, follow: false } };
export default function AdminRoot({ children }: { children: React.ReactNode }) { return <div className="min-h-dvh bg-[#f4f6f9] font-[family-name:var(--font-edo)] text-[#1b2433]">{children}</div>; }
