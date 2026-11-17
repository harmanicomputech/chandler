import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';

/**
 * Weather service for Chandler, AZ.
 *
 * Primary provider: U.S. National Weather Service API (api.weather.gov) — official, free, no key,
 *   public-domain data. Grid PSR/167,50; observation station KCHD (Chandler Municipal Airport).
 * UV index: Open-Meteo (optional, may be rate-limited) → otherwise reported as unavailable.
 * Sunrise/sunset: computed with the NOAA solar position algorithm (deterministic astronomy).
 *
 * Never fabricates values: any field a provider does not return is `null` and the UI says so.
 * Responses are cached in Postgres (api_cache). If a refresh fails, the last good payload is served
 * with `stale: true` and its real `fetchedAt` time, up to MAX_STALE.
 */
export const CHANDLER = { lat: 33.3062, lon: -111.8413, tz: 'America/Phoenix', grid: 'PSR/167,50', station: 'KCHD' };
const TTL_MS = 10 * 60_000;
const MAX_STALE_MS = 6 * 3600_000;
const UA = process.env.NWS_USER_AGENT ?? 'VisitChandlerWeather/1.0 (city-of-chandler-tourism)';

export type Period = { name: string; start: string; end: string; isDaytime: boolean; temp: number; pop: number | null; wind: string; windDir: string; short: string; detailed: string; icon: string; humidity?: number | null };
export type Alert = { id: string; event: string; headline: string; severity: string; description: string; instruction: string | null; expires: string | null };
export type WeatherPayload = {
  current: {
    observedAt: string | null; condition: string | null; tempF: number | null; feelsLikeF: number | null; feelsLikeBasis: 'heat index' | 'wind chill' | 'air temperature' | null;
    humidity: number | null; windMph: number | null; windDir: string | null; windGustMph: number | null; dewpointF: number | null; visibilityMi: number | null; icon: string | null; station: string;
  };
  today: { high: number | null; low: number | null; short: string | null };
  daily: Period[]; hourly: Period[]; alerts: Alert[];
  uv: { current: number | null; max: number | null; source: string | null };
  sun: { sunrise: string; sunset: string; dayLengthMin: number };
  fetchedAt: string; stale: boolean; sources: { name: string; url: string }[];
};

const cToF = (c: number | null | undefined) => (c == null ? null : Math.round(c * 9 / 5 + 32));
const kmhToMph = (k: number | null | undefined) => (k == null ? null : Math.round(k * 0.621371));
const DIRS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const degToDir = (d: number | null | undefined) => (d == null ? null : DIRS[Math.round(d / 22.5) % 16]);

async function getJson(url: string, timeoutMs = 8000) {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/geo+json' }, signal: AbortSignal.timeout(timeoutMs), cache: 'no-store' });
      if (r.status === 429 || r.status >= 500) throw new Error(`HTTP ${r.status} from ${new URL(url).host}`);
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status} from ${new URL(url).host}`), { fatal: true });
      return await r.json();
    } catch (e) {
      lastErr = e;
      if ((e as { fatal?: boolean }).fatal) break;
      await new Promise((res) => setTimeout(res, 300 * 2 ** attempt)); // exponential backoff
    }
  }
  throw lastErr;
}

function mapPeriod(p: Record<string, any>): Period {
  return {
    name: p.name, start: p.startTime, end: p.endTime, isDaytime: p.isDaytime, temp: p.temperature,
    pop: p.probabilityOfPrecipitation?.value ?? null, wind: p.windSpeed, windDir: p.windDirection,
    short: p.shortForecast, detailed: p.detailedForecast, icon: p.icon, humidity: p.relativeHumidity?.value ?? null,
  };
}

/* NOAA solar calculator (https://gml.noaa.gov/grad/solcalc/) — returns ISO strings. */
export function sunTimes(date: Date, lat = CHANDLER.lat, lon = CHANDLER.lon) {
  const rad = Math.PI / 180;
  const jd = Math.floor(date.getTime() / 86400000) + 2440587.5; // Julian day at 00:00 UTC
  const t = (jd - 2451545) / 36525;
  const L0 = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const M = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const C = Math.sin(M * rad) * (1.914602 - t * (0.004817 + 0.000014 * t)) + Math.sin(2 * M * rad) * (0.019993 - 0.000101 * t) + Math.sin(3 * M * rad) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * t;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * rad);
  const eps0 = 23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * rad);
  const decl = Math.asin(Math.sin(eps * rad) * Math.sin(lambda * rad)) / rad;
  const y = Math.tan((eps / 2) * rad) ** 2;
  const eqTime = 4 / rad * (y * Math.sin(2 * L0 * rad) - 2 * e * Math.sin(M * rad) + 4 * e * y * Math.sin(M * rad) * Math.cos(2 * L0 * rad) - 0.5 * y * y * Math.sin(4 * L0 * rad) - 1.25 * e * e * Math.sin(2 * M * rad));
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl * rad)) - Math.tan(lat * rad) * Math.tan(decl * rad)) / rad;
  const noonMin = 720 - 4 * lon - eqTime; // minutes from 00:00 UTC
  const base = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const sunrise = new Date(base + (noonMin - 4 * ha) * 60000);
  const sunset = new Date(base + (noonMin + 4 * ha) * 60000);
  return { sunrise: sunrise.toISOString(), sunset: sunset.toISOString(), dayLengthMin: Math.round(8 * ha) };
}

/** Local calendar date in Chandler (Arizona does not observe DST). */
export function chandlerDate(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: CHANDLER.tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  return new Date(parts + 'T12:00:00Z');
}

async function fetchUv(): Promise<WeatherPayload['uv']> {
  if (process.env.WEATHER_UV_PROVIDER === 'none') return { current: null, max: null, source: null };
  try {
    const j = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${CHANDLER.lat}&longitude=${CHANDLER.lon}&current=uv_index&daily=uv_index_max&timezone=America%2FPhoenix&forecast_days=1`, 5000);
    return { current: j.current?.uv_index ?? null, max: j.daily?.uv_index_max?.[0] ?? null, source: 'Open-Meteo' };
  } catch {
    return { current: null, max: null, source: null };
  }
}

async function fetchFresh(): Promise<WeatherPayload> {
  const base = 'https://api.weather.gov';
  const [daily, hourly, obs, alerts, uv] = await Promise.all([
    getJson(`${base}/gridpoints/${CHANDLER.grid}/forecast?units=us`),
    getJson(`${base}/gridpoints/${CHANDLER.grid}/forecast/hourly?units=us`),
    getJson(`${base}/stations/${CHANDLER.station}/observations/latest`).catch(() => null),
    getJson(`${base}/alerts/active?point=${CHANDLER.lat},${CHANDLER.lon}`).catch(() => ({ features: [] })),
    fetchUv(),
  ]);
  const d: Period[] = (daily.properties?.periods ?? []).map(mapPeriod);
  const h: Period[] = (hourly.properties?.periods ?? []).slice(0, 48).map(mapPeriod);
  const o = obs?.properties ?? {};
  const tempF = cToF(o.temperature?.value);
  const heat = cToF(o.heatIndex?.value); const chill = cToF(o.windChill?.value);
  // NWS convention: feels-like is heat index or wind chill when applicable, otherwise the air temperature.
  const feels = heat ?? chill ?? tempF;
  const firstDay = d.find((p) => p.isDaytime); const firstNight = d.find((p) => !p.isDaytime);
  return {
    current: {
      observedAt: o.timestamp ?? null, condition: o.textDescription || h[0]?.short || null,
      tempF: tempF ?? h[0]?.temp ?? null, feelsLikeF: feels ?? null,
      feelsLikeBasis: heat != null ? 'heat index' : chill != null ? 'wind chill' : feels != null ? 'air temperature' : null,
      humidity: o.relativeHumidity?.value != null ? Math.round(o.relativeHumidity.value) : h[0]?.humidity ?? null,
      windMph: kmhToMph(o.windSpeed?.value) ?? (h[0] ? parseInt(h[0].wind) || null : null),
      windDir: degToDir(o.windDirection?.value) ?? h[0]?.windDir ?? null,
      windGustMph: kmhToMph(o.windGust?.value), dewpointF: cToF(o.dewpoint?.value),
      visibilityMi: o.visibility?.value != null ? Math.round((o.visibility.value / 1609.34) * 10) / 10 : null,
      icon: o.icon ?? h[0]?.icon ?? null, station: 'KCHD — Chandler Municipal Airport',
    },
    today: { high: firstDay?.temp ?? null, low: firstNight?.temp ?? null, short: d[0]?.short ?? null },
    daily: d, hourly: h,
    alerts: (alerts.features ?? []).map((f: any) => ({ id: f.id, event: f.properties.event, headline: f.properties.headline, severity: f.properties.severity, description: f.properties.description, instruction: f.properties.instruction, expires: f.properties.expires })),
    uv,
    sun: sunTimes(chandlerDate()),
    fetchedAt: new Date().toISOString(), stale: false,
    sources: [
      { name: 'National Weather Service (NOAA)', url: 'https://www.weather.gov/psr/' },
      ...(uv.source ? [{ name: 'UV index: Open-Meteo.com (CC BY 4.0)', url: 'https://open-meteo.com/' }] : []),
    ],
  };
}

export async function getWeather(): Promise<{ data: WeatherPayload | null; error: string | null }> {
  const key = 'weather:chandler:v1';
  const [cached] = await db.select().from(schema.apiCache).where(eq(schema.apiCache.key, key)).limit(1);
  if (cached && cached.expiresAt > new Date()) return { data: cached.value as WeatherPayload, error: null };
  try {
    const fresh = await fetchFresh();
    await db.insert(schema.apiCache).values({ key, value: fresh, fetchedAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS) })
      .onConflictDoUpdate({ target: schema.apiCache.key, set: { value: fresh, fetchedAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS) } });
    await db.insert(schema.integrations).values({ key: 'weather_nws', label: 'National Weather Service', enabled: true, lastStatus: 'ok', lastCheckedAt: new Date() })
      .onConflictDoUpdate({ target: schema.integrations.key, set: { lastStatus: 'ok', lastCheckedAt: new Date(), lastError: null } });
    return { data: fresh, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[weather] refresh failed:', msg);
    await db.insert(schema.integrations).values({ key: 'weather_nws', label: 'National Weather Service', enabled: true, lastStatus: 'error', lastCheckedAt: new Date(), lastError: msg })
      .onConflictDoUpdate({ target: schema.integrations.key, set: { lastStatus: 'error', lastCheckedAt: new Date(), lastError: msg } }).catch(() => {});
    if (cached && Date.now() - cached.fetchedAt.getTime() < MAX_STALE_MS) return { data: { ...(cached.value as WeatherPayload), stale: true }, error: null };
    return { data: null, error: 'Live weather is temporarily unavailable.' };
  }
}

/** Weather-aware visitor guidance. Purely rule-based on the live forecast; recommends real listing categories. */
export function recommendations(w: WeatherPayload) {
  const t = w.current.tempF ?? w.today.high ?? null;
  const pop = Math.max(...w.hourly.slice(0, 12).map((h) => h.pop ?? 0), 0);
  const uv = w.uv.max ?? w.uv.current;
  const tips: { tone: 'outdoor' | 'indoor' | 'caution'; title: string; body: string; href: string }[] = [];
  if (w.alerts.length) tips.push({ tone: 'caution', title: 'Active weather alert', body: 'Check the alert details below and follow official guidance before heading out.', href: '#alerts' });
  if (pop >= 40) tips.push({ tone: 'indoor', title: 'Rain is likely — head indoors', body: 'Museums, galleries and indoor attractions make for a great wet-weather day.', href: '/things-to-do/indoor-activities/' });
  if (t != null && t >= 100) {
    tips.push({ tone: 'caution', title: 'Extreme heat', body: 'Hike at sunrise, carry plenty of water, and plan indoor time during the afternoon peak.', href: '/things-to-do/indoor-activities/' });
    tips.push({ tone: 'indoor', title: 'Cool off indoors', body: 'Shopping, museums and family fun centers are air-conditioned escapes.', href: '/things-to-do/shopping-in-chandler-az/' });
  } else if (t != null && t >= 60 && t < 95 && pop < 40) {
    tips.push({ tone: 'outdoor', title: 'Ideal for the outdoors', body: 'Great conditions for trails, parks, golf and patio dining.', href: '/things-to-do/outdoor-recreation/' });
    tips.push({ tone: 'outdoor', title: 'Patio season', body: 'Find a restaurant with outdoor seating downtown.', href: '/restaurants/outdoor-dining/' });
  } else if (t != null && t < 60) {
    tips.push({ tone: 'outdoor', title: 'Crisp desert air', body: 'Perfect for a brisk walk or bike ride — bring a layer for the evening.', href: '/things-to-do/outdoor-recreation/bike-trails/' });
  }
  if (uv != null && uv >= 6) tips.push({ tone: 'caution', title: `High UV (${Math.round(uv)})`, body: 'Wear sunscreen, a hat and sunglasses; seek shade at midday.', href: '/plan-your-visit/weather/' });
  return tips;
}
