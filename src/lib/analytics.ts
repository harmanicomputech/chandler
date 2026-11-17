import 'server-only';
import { db, schema } from '@/db';

/**
 * First-party, cookieless event log (no personal data) used for the admin reporting dashboards.
 * GA4/GTM tags are loaded client-side only when NEXT_PUBLIC_GTM_ID is configured and consent is given;
 * these server events are a privacy-safe complement, not an estimate.
 */
export const TRACKED_EVENTS = [
  'listing_view', 'event_view', 'article_view', 'booking_click', 'website_click', 'newsletter_subscribe', 'visitor_guide_download',
  'itinerary_create', 'itinerary_share', 'map_interaction', 'weather_view', 'save_item', 'concierge_query',
  'property_search', 'property_view', 'property_compare', 'report_download', 'industry_view', 'investor_enquiry',
] as const;

export async function trackServer(site: 'visit' | 'edo', name: string, props: Record<string, unknown> = {}, entity?: { type: string; id: number }) {
  try {
    await db.insert(schema.analyticsEvents).values({ site, name: name.slice(0, 64), props, entity: entity?.type, entityId: entity?.id, path: typeof props.path === 'string' ? props.path : null });
  } catch (e) { console.error('[analytics]', e); }
}
