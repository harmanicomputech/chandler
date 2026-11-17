import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TRACKED_EVENTS, trackServer } from '@/lib/analytics';
import { rateLimit } from '@/lib/rate-limit';

const Body = z.object({ site: z.enum(['visit', 'edo']), name: z.enum(TRACKED_EVENTS), path: z.string().max(300).optional(), entity: z.string().max(32).optional(), entityId: z.number().int().optional(), props: z.record(z.string(), z.union([z.string().max(300), z.number(), z.boolean()])).optional() });

/** Beacon endpoint for first-party, cookieless interaction events. */
export async function POST(req: Request) {
  if (!(await rateLimit('track', 120, 60)).ok) return new NextResponse(null, { status: 204 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (p.success) await trackServer(p.data.site, p.data.name, { ...(p.data.props ?? {}), path: p.data.path ?? '' }, p.data.entity && p.data.entityId ? { type: p.data.entity, id: p.data.entityId } : undefined);
  return new NextResponse(null, { status: 204 });
}
