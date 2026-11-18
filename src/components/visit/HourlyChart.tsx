'use client';
import { useEffect, useRef, useState } from 'react';

type H = { start: string; temp: number; pop: number | null; short: string };
/**
 * Two aligned single-measure charts (never dual-axis): temperature line (°F) and precipitation chance bars (%).
 * Crosshair + tooltip on hover/focus, keyboard stepping with ←/→, plus a full data table alternative.
 */
export function HourlyChart({ hours }: { hours: H[] }) {
  const data = hours.slice(0, 24);
  const [i, setI] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(960);
  // Draw at the container's real pixel width so axis text stays legible on phones (no SVG down-scaling).
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width)))); ro.observe(el); return () => ro.disconnect(); }, []);
  const H1 = 200, H2 = 70, PAD = { l: 36, r: 12, t: 16, b: 22 };
  const temps = data.map((d) => d.temp);
  const min = Math.floor((Math.min(...temps) - 3) / 5) * 5, max = Math.ceil((Math.max(...temps) + 3) / 5) * 5;
  const x = (n: number) => PAD.l + (n / Math.max(1, data.length - 1)) * (W - PAD.l - PAD.r);
  const y = (t: number) => PAD.t + (1 - (t - min) / (max - min || 1)) * (H1 - PAD.t - PAD.b);
  const line = data.map((d, n) => `${n ? 'L' : 'M'}${x(n).toFixed(1)},${y(d.temp).toFixed(1)}`).join('');
  const area = `${line}L${x(data.length - 1)},${H1 - PAD.b}L${x(0)},${H1 - PAD.b}Z`;
  const ticks = Array.from({ length: (max - min) / 5 + 1 }, (_, k) => min + k * 5).filter((_, k, a) => a.length <= 6 || k % 2 === 0);
  const hr = (s: string) => new Date(s).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: 'America/Phoenix' });
  const onMove = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W;
    setI(Math.max(0, Math.min(data.length - 1, Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (data.length - 1)))));
  };
  const cur = i != null ? data[i] : null;
  if (!data.length) return null;
  return (
    <figure className="relative">
      <figcaption className="sr-only">Hourly temperature and chance of precipitation for the next 24 hours. A data table follows.</figcaption>
      <div ref={box} className="relative" onPointerLeave={() => setI(null)}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H1 + H2 + 10}`} className="w-full touch-none select-none" onPointerMove={onMove} onPointerDown={onMove}
          tabIndex={0} role="img" aria-label="Hourly forecast chart. Use left and right arrow keys to inspect hours."
          onKeyDown={(e) => { if (e.key === 'ArrowRight') setI((v) => Math.min(data.length - 1, (v ?? -1) + 1)); if (e.key === 'ArrowLeft') setI((v) => Math.max(0, (v ?? 1) - 1)); }} onBlur={() => setI(null)}>
          <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#214FA1" stopOpacity=".18" /><stop offset="100%" stopColor="#214FA1" stopOpacity="0" /></linearGradient></defs>
          {ticks.map((t) => <g key={t}><line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#DFE6EE" strokeWidth="1" /><text x={PAD.l - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#4A5A74">{t}°</text></g>)}
          <path d={area} fill="url(#tg)" />
          <path d={line} fill="none" stroke="#214FA1" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, n) => n % (W < 520 ? 6 : 3) === 0 && <text key={n} x={x(n)} y={H1 - 4} textAnchor="middle" fontSize="11" fill="#4A5A74">{hr(d.start)}</text>)}
          {/* Precipitation (separate chart, own baseline, single hue) */}
          <text x={PAD.l - 8} y={H1 + 18} textAnchor="end" fontSize="10" fill="#4A5A74">Rain</text>
          {data.map((d, n) => { const h = ((d.pop ?? 0) / 100) * (H2 - 14); const bw = (W - PAD.l - PAD.r) / data.length - 2;
            return <rect key={n} x={x(n) - bw / 2} y={H1 + H2 - h} width={bw} height={Math.max(h, 1)} rx="2" fill={i === n ? '#00715E' : '#45D7BC'} />; })}
          <line x1={PAD.l} x2={W - PAD.r} y1={H1 + H2} y2={H1 + H2} stroke="#DFE6EE" />
          {cur && i != null && (<g pointerEvents="none">
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={H1 + H2} stroke="#172B4D" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={x(i)} cy={y(cur.temp)} r="5" fill="#214FA1" stroke="#fff" strokeWidth="2" />
          </g>)}
        </svg>
        {cur && i != null && (
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-navy px-3 py-2 text-xs text-white shadow-xl" style={{ left: `${(x(i) / W) * 100}%` }} role="status">
            <p className="font-bold">{hr(cur.start)} · {cur.temp}°F</p><p className="opacity-80">{cur.short} · {cur.pop ?? 0}% rain</p>
          </div>
        )}
      </div>
      <details className="mt-4 text-sm"><summary className="cursor-pointer font-semibold text-blue-500">View as table</summary>
        <div className="mt-3 max-h-72 overflow-auto rounded-xl ring-1 ring-line"><table className="w-full text-left"><thead className="sticky top-0 bg-mist"><tr><th className="p-2">Hour</th><th className="p-2">Temp</th><th className="p-2">Rain chance</th><th className="p-2">Conditions</th></tr></thead>
          <tbody>{data.map((d) => <tr key={d.start} className="border-t border-line"><td className="p-2">{hr(d.start)}</td><td className="p-2">{d.temp}°F</td><td className="p-2">{d.pop ?? 0}%</td><td className="p-2">{d.short}</td></tr>)}</tbody></table></div>
      </details>
    </figure>
  );
}
