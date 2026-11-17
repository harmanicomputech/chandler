'use client';
import { useState } from 'react';

/** Horizontal bar chart (single measure, single hue). Hover/focus tooltip; table alternative; values direct-labelled. */
export function BarChart({ rows, unit, caption, source }: { rows: { label: string; value: number; sub?: string }[]; unit: string; caption: string; source: { name: string; url: string } }) {
  const [hi, setHi] = useState<number | null>(null);
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <figure>
      <figcaption className="sr-only">{caption}</figcaption>
      <ol className="space-y-2.5" aria-hidden>
        {rows.map((r, i) => (
          <li key={r.label} className="grid grid-cols-[minmax(120px,38%)_1fr] items-center gap-4 text-sm" onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}>
            <span className={`truncate ${hi === i ? 'font-semibold text-edo-navy' : 'text-edo-slate'}`} title={r.label}>{r.label}</span>
            <span className="relative flex items-center gap-3">
              <span className="h-6 origin-left rounded-r-[4px] transition-[background-color] duration-300" data-reveal style={{ width: `${(r.value / max) * 100}%`, background: hi === i ? 'var(--color-edo-navy)' : 'var(--color-edo-sky)', ['--reveal-delay' as string]: `${i * 60}ms` }} />
              <span className="shrink-0 font-mono text-xs font-medium text-edo-ink">{r.value.toLocaleString()}</span>
              {hi === i && r.sub && <span className="absolute -top-9 left-0 z-10 whitespace-nowrap bg-edo-ink px-2.5 py-1.5 text-xs text-white shadow-lg">{r.label} · {r.sub} · {r.value.toLocaleString()} {unit}</span>}
            </span>
          </li>
        ))}
      </ol>
      <details className="mt-5 text-sm"><summary className="cursor-pointer font-semibold text-edo-skytext">View data table</summary>
        <table className="mt-3 w-full text-left text-sm"><thead><tr className="border-b-2 border-edo-navy font-mono text-[11px] uppercase tracking-wider text-edo-slate"><th className="py-2">Company</th><th>Industry</th><th className="text-right">{unit}</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.label} className="border-b border-edo-line"><td className="py-2">{r.label}</td><td className="text-edo-slate">{r.sub}</td><td className="text-right font-mono">{r.value.toLocaleString()}</td></tr>)}</tbody></table>
      </details>
      <p className="mt-4 font-mono text-[11px] text-edo-slate">Source: <a href={source.url} className="underline">{source.name}</a></p>
    </figure>
  );
}
