'use client';
import { useEffect } from 'react';
import { track } from '@/components/shared/track';

export function TrackView({ site, name, entity, id }: { site: 'visit' | 'edo'; name: string; entity: string; id: number }) {
  useEffect(() => { track(site, name, { entity, entityId: id }); }, [site, name, entity, id]);
  return null;
}
/** External link that records booking/website clicks (first-party analytics). */
export function OutboundLink({ href, event, id, entity = 'listing', className, children }: { href: string; event: 'booking_click' | 'website_click' | 'report_download'; id: number; entity?: string; className?: string; children: React.ReactNode }) {
  return <a href={href} target="_blank" rel="noopener" className={className} onClick={() => track(entity === 'property' || event === 'report_download' ? 'edo' : 'visit', event, { entity, entityId: id, props: { href } })}>{children}<span className="sr-only"> (opens in a new tab)</span></a>;
}
