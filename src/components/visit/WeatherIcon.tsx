import { Sun, Moon, Cloud, CloudSun, CloudMoon, CloudRain, CloudLightning, CloudFog, Wind, Snowflake, CloudDrizzle } from 'lucide-react';

/** Maps NWS condition text to an icon (decorative; the text condition is always shown alongside). */
export function WeatherIcon({ condition, isDay = true, className }: { condition: string | null | undefined; isDay?: boolean; className?: string }) {
  const c = (condition || '').toLowerCase();
  const Icon = /thunder|storm/.test(c) ? CloudLightning : /snow|sleet|ice/.test(c) ? Snowflake : /drizzle/.test(c) ? CloudDrizzle : /rain|shower/.test(c) ? CloudRain
    : /fog|haze|smoke|dust/.test(c) ? CloudFog : /wind|breez/.test(c) ? Wind : /overcast|cloudy/.test(c) && !/partly|mostly sunny|mostly clear/.test(c) ? Cloud
    : /partly|mostly sunny|mostly clear|few|scattered/.test(c) ? (isDay ? CloudSun : CloudMoon) : isDay ? Sun : Moon;
  return <Icon aria-hidden className={className} strokeWidth={1.6} />;
}
