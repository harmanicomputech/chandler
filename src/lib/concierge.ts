import 'server-only';
import Anthropic from '@anthropic-ai/sdk';
import { queryListings, queryEvents, queryArticles } from '@/lib/content';
import { getWeather } from '@/lib/weather';

/**
 * AI travel concierge — retrieval-grounded.
 * 1. Retrieve candidate records (published listings/events/stories) from the CMS for the question.
 * 2. Ask Claude to answer ONLY from those records, returning structured JSON that references record IDs.
 * 3. The UI renders referenced records from the database (verified facts) separately from the AI prose.
 * The model is instructed never to state hours, prices, availability or bookings not present in a record.
 */
export type ConciergeResult = {
  mode: 'ai' | 'retrieval';
  answer: string;
  picks: { kind: 'listing' | 'event' | 'article'; id: number; reason: string }[];
  records: Record<string, { kind: string; id: number; title: string; href: string; image: string | null; meta: string | null }>;
  note?: string;
};

const STOP = new Set('a an and are around best can chandler do does for from good how i in is it me my near of on or places should some the there this to visit we what when where which who with weekend you your'.split(' '));
const TYPE_HINTS: [RegExp, string][] = [[/hotel|stay|resort|sleep|lodging/, 'hotel'], [/eat|restaurant|food|dinner|lunch|brunch|breakfast|dining/, 'restaurant'], [/hike|trail|park|outdoor|nature|bike/, 'park'], [/shop|mall|boutique/, 'shopping'], [/golf/, 'golf'], [/museum|art|gallery|culture/, 'arts'], [/bar|nightlife|cocktail|brewery|beer/, 'nightlife']];

export async function retrieve(question: string) {
  const ql = question.toLowerCase();
  const terms = ql.replace(/[^a-z0-9\s'-]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w)).slice(0, 6);
  const types = TYPE_HINTS.filter(([re]) => re.test(ql)).map(([, t]) => t);
  if (types.includes('park')) types.push('trail', 'recreation');
  const family = /kid|family|child/.test(ql);
  const listingSets = await Promise.all([
    ...types.map((t) => queryListings({ type: t, q: terms.find((x) => !TYPE_HINTS.some(([re]) => re.test(x))), limit: 8 })),
    ...terms.slice(0, 3).map((t) => queryListings({ q: t, limit: 6 })),
    family ? queryListings({ q: 'family', limit: 6 }) : Promise.resolve({ rows: [] as Awaited<ReturnType<typeof queryListings>>['rows'] }),
  ]);
  const wantsEvents = /event|weekend|happening|festival|concert|tonight|this week|calendar|what.*on/.test(ql);
  const [events, articles] = await Promise.all([
    queryEvents({ limit: wantsEvents ? 10 : 4, q: wantsEvents ? undefined : terms[0] }),
    queryArticles({ q: terms[0], limit: 4 }),
  ]);
  const seen = new Set<number>();
  const listings = listingSets.flatMap((s) => s.rows).filter((l) => !seen.has(l.id) && seen.add(l.id)).slice(0, 18);
  return { listings, events: events.rows, articles: articles.rows };
}

export async function askConcierge(question: string): Promise<ConciergeResult> {
  const ctx = await retrieve(question);
  const records: ConciergeResult['records'] = {};
  ctx.listings.forEach((l) => { records[`listing:${l.id}`] = { kind: 'listing', id: l.id, title: l.name, href: `/listing/${l.slug}/${l.id}/`, image: l.image, meta: [l.subcategory, l.region].filter(Boolean).join(' · ') || null }; });
  ctx.events.forEach((e) => { records[`event:${e.id}`] = { kind: 'event', id: e.id, title: e.title, href: `/event/${e.slug}/${e.id}/`, image: e.image, meta: [e.startDate, e.locationName].filter(Boolean).join(' · ') || null }; });
  ctx.articles.forEach((a) => { records[`article:${a.id}`] = { kind: 'article', id: a.id, title: a.title, href: `/blog/post/${a.slug}/`, image: a.image, meta: 'Visit Chandler story' }; });

  const hasCreds = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  if (!hasCreds || process.env.CONCIERGE_MODE === 'retrieval') {
    const picks = Object.values(records).slice(0, 6).map((r) => ({ kind: r.kind as 'listing', id: r.id, reason: r.meta ?? '' }));
    return { mode: 'retrieval', answer: picks.length ? 'Here are official Visit Chandler listings that match your question.' : 'I couldn’t find matching listings. Try different words, or browse the directories.', picks, records,
      note: 'AI suggestions are not enabled on this environment; results are keyword matches from the official directory.' };
  }

  const weather = await getWeather().then((w) => w.data).catch(() => null);
  const today = new Date().toLocaleDateString('en-US', { timeZone: 'America/Phoenix', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const lines = [
    ...ctx.listings.map((l) => `[listing:${l.id}] ${l.name} — ${l.subcategory ?? l.type}${l.region ? `, ${l.region}` : ''}. ${l.excerpt?.trim() ?? ''}`),
    ...ctx.events.map((e) => `[event:${e.id}] ${e.title} — ${e.startDate ?? 'date TBC'}${e.endDate && e.endDate !== e.startDate ? ` to ${e.endDate}` : ''}${e.timesText ? `, ${e.timesText}` : ''} at ${e.locationName ?? 'location TBC'}. Categories: ${e.categories.join(', ')}${e.admission ? `. Admission: ${e.admission}` : ''}`),
    ...ctx.articles.map((a) => `[article:${a.id}] ${a.title}. ${a.excerpt ?? ''}`),
  ];
  const system = `You are the Visit Chandler travel concierge for Chandler, Arizona. Answer the visitor's question using ONLY the official records provided in the user message.
Rules:
- Recommend only records from the list, referencing them by their exact key (e.g. listing:123).
- Never state opening hours, prices, availability, reservations or booking status unless that exact information appears in a record; otherwise tell the visitor to confirm with the business.
- If the records don't answer the question, say so plainly and suggest browsing the relevant section of the website.
- Be warm and concise: 2–4 sentences in "answer", then up to 6 picks with a one-sentence reason each.`;
  const user = `Today is ${today} (Chandler time).${weather?.today.high != null ? ` Forecast high ${weather.today.high}°F, ${weather.today.short}.` : ''}\n\nOfficial records:\n${lines.join('\n') || '(no matching records)'}\n\nVisitor question: ${question}`;

  const client = new Anthropic();
  try {
    const res = await client.beta.messages.create({
      model: process.env.CONCIERGE_MODEL ?? 'claude-opus-5-5',
      max_tokens: 2000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: {
          type: 'object', additionalProperties: false, required: ['answer', 'picks'],
          properties: {
            answer: { type: 'string' },
            picks: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['key', 'reason'], properties: { key: { type: 'string' }, reason: { type: 'string' } } } },
          },
        } },
      },
      system,
      messages: [{ role: 'user', content: user }],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming);
    if (res.stop_reason === 'refusal') return { mode: 'ai', answer: 'Sorry — I can only help with visiting Chandler. Try asking about things to do, places to eat or stay, or events.', picks: [], records };
    const text = res.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '{}';
    const parsed = JSON.parse(text) as { answer: string; picks: { key: string; reason: string }[] };
    const picks = parsed.picks.filter((p) => records[p.key]).slice(0, 6).map((p) => { const [kind, id] = p.key.split(':'); return { kind: kind as 'listing', id: Number(id), reason: p.reason }; });
    return { mode: 'ai', answer: parsed.answer, picks, records };
  } catch (e) {
    console.error('[concierge]', e instanceof Anthropic.APIError ? `${e.status} ${e.message}` : e);
    const picks = Object.values(records).slice(0, 6).map((r) => ({ kind: r.kind as 'listing', id: r.id, reason: r.meta ?? '' }));
    return { mode: 'retrieval', answer: 'The AI assistant is temporarily unavailable, so here are official listings matching your question.', picks, records };
  }
}
