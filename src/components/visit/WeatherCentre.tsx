import Link from 'next/link';
import { AlertTriangle, Droplets, Wind, Sunrise, Sunset, Thermometer, Eye, SunMedium, ArrowUpRight } from 'lucide-react';
import { getWeather, recommendations } from '@/lib/weather';
import { WeatherIcon } from './WeatherIcon';
import { HourlyChart } from './HourlyChart';
import { WeatherBeacon } from './WeatherBeacon';

const t = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' });

/** Full weather centre. Live NWS data; unavailable fields are labelled, never invented. */
export async function WeatherCentre() {
  const { data, error } = await getWeather();
  if (!data) return (
    <section className="mx-auto max-w-[1440px] px-5 py-16 sm:px-8"><div role="alert" className="rounded-[var(--radius-card)] bg-mist p-10"><p className="text-xl font-bold text-navy">Live weather is temporarily unavailable</p><p className="mt-2 text-ink-soft">{error} Please check the <a className="underline" href="https://forecast.weather.gov/MapClick.php?lat=33.3062&lon=-111.8413">National Weather Service forecast for Chandler</a>.</p></div></section>
  );
  const c = data.current; const tips = recommendations(data);
  const days: { day: typeof data.daily[number]; night?: typeof data.daily[number] }[] = [];
  data.daily.forEach((p) => { if (p.isDaytime || !days.length) days.push({ day: p }); else days[days.length - 1].night = p; });
  const stat = (Icon: typeof Droplets, label: string, value: string | null, note?: string) => (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-line"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-soft"><Icon className="size-4 text-teal-600" aria-hidden />{label}</p><p className="mt-2 text-2xl font-bold text-navy">{value ?? <span className="text-base font-medium text-ink-soft">Not reported</span>}</p>{note && <p className="mt-1 text-xs text-ink-soft">{note}</p>}</div>
  );
  return (
    <section className="mx-auto max-w-[1440px] px-5 py-14 sm:px-8">
      <WeatherBeacon />
      {data.stale && <p role="status" className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">Showing the last successful update from {t(data.fetchedAt)} — the live feed is temporarily unreachable.</p>}
      {data.alerts.length > 0 && (
        <div id="alerts" className="mb-8 space-y-3">{data.alerts.map((a) => (
          <div key={a.id} role="alert" className="rounded-2xl border-l-4 border-red-600 bg-red-50 p-5"><p className="flex items-center gap-2 font-bold text-red-900"><AlertTriangle className="size-5" aria-hidden />{a.event} <span className="text-xs font-semibold uppercase">({a.severity})</span></p><p className="mt-1 text-sm text-red-900">{a.headline}</p>
            <details className="mt-2 text-sm text-red-900"><summary className="cursor-pointer font-semibold">Details</summary><p className="mt-2 whitespace-pre-line">{a.description}</p>{a.instruction && <p className="mt-2 whitespace-pre-line font-semibold">{a.instruction}</p>}</details></div>
        ))}</div>
      )}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-blue-500 via-blue-600 to-navy p-8 text-white lg:col-span-5 sm:p-10">
          <div aria-hidden className="absolute -right-20 -top-20 size-72 rounded-full bg-teal-400/30 blur-3xl" />
          <p className="eyebrow relative text-teal-200">Current conditions · {c.station}</p>
          <div className="relative mt-6 flex items-center gap-6"><WeatherIcon condition={c.condition} isDay={data.hourly[0]?.isDaytime ?? true} className="size-24 text-teal-200" /><p className="font-display text-[9rem] leading-none">{c.tempF ?? '–'}°</p></div>
          <p className="relative mt-2 text-2xl font-semibold">{c.condition ?? 'Conditions not reported'}</p>
          <p className="relative mt-1 text-white/75">Feels like {c.feelsLikeF ?? '–'}°{c.feelsLikeBasis && <span className="text-sm"> ({c.feelsLikeBasis})</span>} · High {data.today.high ?? '–'}° · Low {data.today.low ?? '–'}°</p>
          <p className="relative mt-8 text-xs text-white/60">{c.observedAt ? `Observed ${t(c.observedAt)} MST` : 'Observation time not reported'} · Updated {t(data.fetchedAt)} · Arizona does not observe daylight saving time</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-7">
          {stat(Droplets, 'Humidity', c.humidity != null ? `${c.humidity}%` : null)}
          {stat(Wind, 'Wind', c.windMph != null ? `${c.windMph} mph ${c.windDir ?? ''}` : null, c.windGustMph ? `Gusts ${c.windGustMph} mph` : undefined)}
          {stat(SunMedium, 'UV index', data.uv.max != null ? `${Math.round(data.uv.max)} max` : data.uv.current != null ? String(Math.round(data.uv.current)) : null, data.uv.source ? `Source: ${data.uv.source}` : 'UV provider unavailable')}
          {stat(Sunrise, 'Sunrise', t(data.sun.sunrise), 'NOAA solar calculation')}
          {stat(Sunset, 'Sunset', t(data.sun.sunset), `${Math.floor(data.sun.dayLengthMin / 60)}h ${data.sun.dayLengthMin % 60}m of daylight`)}
          {stat(Thermometer, 'Dew point', c.dewpointF != null ? `${c.dewpointF}°F` : null)}
          {stat(Eye, 'Visibility', c.visibilityMi != null ? `${c.visibilityMi} mi` : null)}
          {stat(Droplets, 'Rain chance (12h)', `${Math.max(0, ...data.hourly.slice(0, 12).map((h) => h.pop ?? 0))}%`)}
        </div>
      </div>

      {tips.length > 0 && (
        <div className="mt-12"><h2 className="font-display text-5xl text-navy">Plan around the weather</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{tips.map((tip) => (
            <li key={tip.title}><Link href={tip.href} className={`group block h-full rounded-2xl p-6 ring-1 transition hover:-translate-y-1 ${tip.tone === 'caution' ? 'bg-amber-50 ring-amber-200' : tip.tone === 'indoor' ? 'bg-blue-50 ring-blue-100' : 'bg-teal-50 ring-teal-100'}`}>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-soft">{tip.tone === 'caution' ? 'Heads up' : tip.tone === 'indoor' ? 'Indoor idea' : 'Outdoor idea'}</p><p className="mt-2 text-lg font-bold text-navy">{tip.title}</p><p className="mt-1 text-sm text-ink-soft">{tip.body}</p><ArrowUpRight className="mt-4 size-5 text-blue-500 transition group-hover:rotate-45" aria-hidden /></Link></li>
          ))}</ul>
          <p className="mt-3 text-xs text-ink-soft">Suggestions are generated from the live forecast using simple rules and link to official directory pages.</p>
        </div>
      )}

      <div className="mt-14 rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line sm:p-8"><h2 className="font-display text-4xl text-navy">Next 24 hours</h2><div className="mt-6"><HourlyChart hours={data.hourly.map((h) => ({ start: h.start, temp: h.temp, pop: h.pop, short: h.short }))} /></div></div>

      <div className="mt-14"><h2 className="font-display text-5xl text-navy">7-day forecast</h2>
        <ul className="mt-6 divide-y divide-line overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line">{days.slice(0, 7).map(({ day, night }) => (
          <li key={day.start} className="grid grid-cols-[110px_48px_1fr] items-center gap-4 bg-white px-5 py-4 sm:grid-cols-[160px_56px_1fr_140px_120px]">
            <p className="font-bold text-navy">{day.name}</p><WeatherIcon condition={day.short} isDay={day.isDaytime} className="size-8 text-blue-500" />
            <div><p className="font-semibold text-navy">{day.short}</p><p className="hidden text-sm text-ink-soft md:block">{day.detailed}</p></div>
            <p className="hidden text-sm text-ink-soft sm:block"><Droplets className="mr-1 inline size-4 text-teal-600" aria-hidden />{day.pop ?? 0}% · {day.wind} {day.windDir}</p>
            <p className="hidden text-right text-lg font-bold text-navy sm:block">{day.isDaytime ? `${day.temp}°` : ''}{night ? <span className="font-medium text-ink-soft"> / {night.temp}°</span> : ''}</p>
          </li>
        ))}</ul>
      </div>
      <p className="mt-8 text-xs text-ink-soft">Data: {data.sources.map((s, i) => <span key={s.url}>{i > 0 && ' · '}<a href={s.url} className="underline">{s.name}</a></span>)}. Forecast grid PSR 167,50 (Phoenix office). Times shown in Mountain Standard Time (America/Phoenix).</p>
    </section>
  );
}
