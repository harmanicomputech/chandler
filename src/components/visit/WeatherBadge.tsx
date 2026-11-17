import Link from 'next/link';
import { getWeather } from '@/lib/weather';
import { WeatherIcon } from './WeatherIcon';

/** Compact live-weather chip for the homepage hero. Renders nothing (not a fake value) if data is unavailable. */
export async function WeatherBadge() {
  const { data } = await getWeather();
  if (!data || data.current.tempF == null) return null;
  return (
    <Link href="/plan-your-visit/weather/" className="group inline-flex items-center gap-3 rounded-full bg-white/10 py-2 pl-2 pr-5 text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20">
      <span className="grid size-10 place-items-center rounded-full bg-white/15"><WeatherIcon condition={data.current.condition} isDay={data.hourly[0]?.isDaytime ?? true} className="size-6" /></span>
      <span className="text-left leading-tight">
        <span className="block text-lg font-bold">{data.current.tempF}°F <span className="text-sm font-medium opacity-80">{data.current.condition}</span></span>
        <span className="block text-xs opacity-75">H {data.today.high ?? '–'}° · L {data.today.low ?? '–'}° · Chandler now</span>
      </span>
    </Link>
  );
}

export async function WeatherCard() {
  const { data, error } = await getWeather();
  if (!data) return (
    <div className="rounded-[var(--radius-card)] bg-white p-8 ring-1 ring-line"><p className="font-bold text-navy">Weather</p><p className="mt-2 text-sm text-ink-soft">{error} <Link className="underline" href="/plan-your-visit/weather/">Weather centre</Link></p></div>
  );
  const next = data.daily.filter((p) => p.isDaytime).slice(0, 4);
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-gradient-to-br from-blue-500 via-blue-600 to-navy p-8 text-white">
      <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-teal-400/30 blur-3xl" />
      <div className="relative flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-teal-200">Chandler right now</p>
          <p className="mt-3 font-display text-8xl leading-none">{data.current.tempF ?? '–'}°</p>
          <p className="mt-2 text-lg font-semibold">{data.current.condition}</p>
          <p className="text-sm text-white/70">High {data.today.high ?? '–'}° · Low {data.today.low ?? '–'}°</p>
        </div>
        <WeatherIcon condition={data.current.condition} isDay={data.hourly[0]?.isDaytime ?? true} className="size-20 text-teal-200" />
      </div>
      <ul className="relative mt-8 grid grid-cols-4 gap-2 border-t border-white/15 pt-6">
        {next.map((p) => (
          <li key={p.start} className="text-center"><p className="text-xs font-semibold text-white/70">{new Date(p.start).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/Phoenix' })}</p><WeatherIcon condition={p.short} isDay className="mx-auto my-2 size-6" /><p className="font-bold">{p.temp}°</p></li>
        ))}
      </ul>
      <div className="relative mt-6 flex items-center justify-between text-xs text-white/60">
        <span>{data.stale ? 'Last updated ' : 'Updated '}{new Date(data.fetchedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Phoenix' })} MST · NWS</span>
        <Link href="/plan-your-visit/weather/" className="font-bold text-white underline-offset-4 hover:underline">Full forecast →</Link>
      </div>
    </div>
  );
}
