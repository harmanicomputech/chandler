'use client';
/** Fire-and-forget analytics beacon (first-party) + GA4 dataLayer push when GTM is present. */
export function track(site: 'visit' | 'edo', name: string, extra: { entity?: string; entityId?: number; props?: Record<string, string | number | boolean> } = {}) {
  try {
    const body = JSON.stringify({ site, name, path: location.pathname, ...extra });
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track/', new Blob([body], { type: 'application/json' }));
    else fetch('/api/track/', { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true });
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer?.push({ event: name, site, ...extra.props, entity_id: extra.entityId });
  } catch {}
}
