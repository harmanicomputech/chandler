import { NextResponse } from 'next/server';
import { z } from 'zod';
import { askConcierge } from '@/lib/concierge';
import { rateLimit } from '@/lib/rate-limit';
import { trackServer } from '@/lib/analytics';

const Body = z.object({ question: z.string().trim().min(3).max(400) });
export async function POST(req: Request) {
  if (!(await rateLimit('concierge', 12, 600)).ok) return NextResponse.json({ error: 'You’ve asked a lot of questions — please wait a few minutes.' }, { status: 429 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: 'Please ask a question (3–400 characters).' }, { status: 422 });
  const result = await askConcierge(p.data.question);
  await trackServer('visit', 'concierge_query', { mode: result.mode, picks: result.picks.length });
  return NextResponse.json(result);
}
