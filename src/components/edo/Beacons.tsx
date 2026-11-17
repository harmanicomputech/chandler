'use client';
import { useEffect } from 'react';
import { track } from '@/components/shared/track';
export function CompareBeacon({ ids }: { ids: number[] }) { useEffect(() => { if (ids.length > 1) track('edo', 'property_compare', { props: { count: ids.length } }); }, [ids]); return null; }
export function DownloadLink({ href, id, children, className }: { href: string; id: number; children: React.ReactNode; className?: string }) {
  return <a href={href} className={className} onClick={() => track('edo', 'report_download', { entity: 'report', entityId: id })}>{children}</a>;
}
