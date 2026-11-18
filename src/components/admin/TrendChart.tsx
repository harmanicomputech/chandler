'use client';
import { useRef, useState } from 'react';

/** Single-series daily trend (line + area), crosshair tooltip, arrow-key navigation, table alternative. */
export function TrendChart({ data, label, color = '#214FA1' }: { data: { day: string; n: number }[]; label: string; color?: string }) {
  const [i, setI] = useState<number | null>(null); const ref = useRef<SVGSVGElement>(null);
  const W = 640, H = 180, P = { l: 34, r: 10, t: 12, b: 22 };
  const max = Math.max(4, ...data.map((d) => d.n)); const niceMax = Math.ceil(max / 4) * 4;
  const x = (k: number) => P.l + (k / Math.max(1, data.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / niceMax) * (H - P.t - P.b);
  const line = data.map((d, k) => `${k ? 'L' : 'M'}${x(k).toFixed(1)},${y(d.n).toFixed(1)}`).join('');
  const total = data.reduce((a, d) => a + d.n, 0);
  const fmt = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const move = (e: React.PointerEvent) => { const r = ref.current!.getBoundingClientRect(); const px = ((e.clientX - r.left) / r.width) * W; setI(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1))))); };
  return (
    <figure>
      <figcaption className="sr-only">{label}: daily recorded interactions, {total} in total. Data table follows.</figcaption>
      <div className="relative" onPointerLeave={() => setI(null)}>
        <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={move} tabIndex={0} role="img" aria-label={`${label} trend chart. Use arrow keys to read daily values.`}
          onKeyDown={(e) => { if (e.key === 'ArrowRight') setI((v) => Math.min(data.length - 1, (v ?? -1) + 1)); if (e.key === 'ArrowLeft') setI((v) => Math.max(0, (v ?? 1) - 1)); }} onBlur={() => setI(null)}>
          {[0, 0.5, 1].map((f) => <g key={f}><line x1={P.l} x2={W - P.r} y1={y(niceMax * f)} y2={y(niceMax * f)} stroke="#e2e8f0" /><text x={P.l - 6} y={y(niceMax * f) + 4} fontSize="10" textAnchor="end" fill="#475569">{Math.round(niceMax * f)}</text></g>)}
          <path d={`${line}L${x(data.length - 1)},${H - P.b}L${x(0)},${H - P.b}Z`} fill={color} opacity=".08" />
          <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {data.map((d, k) => (k === 0 || k === data.length - 1 || k % Math.ceil(data.length / 6) === 0) && <text key={d.day} x={x(k)} y={H - 5} fontSize="10" textAnchor="middle" fill="#475569">{fmt(d.day)}</text>)}
          {i != null && <g pointerEvents="none"><line x1={x(i)} x2={x(i)} y1={P.t} y2={H - P.b} stroke="#0f172a" strokeDasharray="3 3" /><circle cx={x(i)} cy={y(data[i].n)} r="4.5" fill={color} stroke="#fff" strokeWidth="2" /></g>}
        </svg>
        {i != null && <div role="status" className="pointer-events-none absolute top-0 -translate-x-1/2 rounded bg-slate-900 px-2 py-1 text-xs text-white" style={{ left: `${(x(i) / W) * 100}%` }}>{fmt(data[i].day)} · {data[i].n}</div>}
      </div>
      <details className="mt-2 text-xs"><summary className="cursor-pointer text-[#214FA1]">View data</summary><table className="mt-2 w-full"><thead><tr className="text-left text-slate-600"><th>Day</th><th className="text-right">Interactions</th></tr></thead><tbody>{data.map((d) => <tr key={d.day} className="border-t border-slate-100"><td>{d.day}</td><td className="text-right font-mono">{d.n}</td></tr>)}</tbody></table></details>
    </figure>
  );
}
