import { getEvent } from '@/lib/content';
import { stripTags } from '@/lib/sanitize';

/** iCalendar export for a published event (all-day spans; times are free text from the organizer). */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const e = await getEvent(Number((await params).id));
  if (!e || !e.startDate) return new Response('Not found', { status: 404 });
  const d = (s: string) => s.replace(/-/g, '');
  const end = new Date((e.endDate ?? e.startDate) + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 1);
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1').replace(/\n/g, '\\n');
  const base = process.env.VISIT_SITE_URL ?? 'https://www.visitchandler.com';
  const body = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Visit Chandler//Events//EN', 'BEGIN:VEVENT', `UID:event-${e.id}@visitchandler`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d(e.startDate)}`, `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`, `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc((e.timesText ? e.timesText + ' — ' : '') + stripTags(e.descriptionHtml).slice(0, 600))}`, `LOCATION:${esc([e.locationName, e.address].filter(Boolean).join(', '))}`,
    `URL:${base}/event/${e.slug}/${e.id}/`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  return new Response(body, { headers: { 'content-type': 'text/calendar; charset=utf-8', 'content-disposition': `attachment; filename="${e.slug}.ics"` } });
}
