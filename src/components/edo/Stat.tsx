/** Verified indicator tile: every number links to its source and as-of note. */
export function Stat({ value, label, source, asOf, dark }: { value: string; label: string; source: string; asOf?: string | null; dark?: boolean }) {
  const m = value.match(/^([^\d]*)([\d,.]+)(.*)$/);
  const num = m ? Number(m[2].replace(/,/g, '')) : NaN;
  const decimals = m && m[2].includes('.') ? m[2].split('.')[1].length : 0;
  return (
    <div className={`flex flex-col justify-between border p-5 ${dark ? 'border-white/15 bg-white/[0.03]' : 'border-edo-line bg-white'}`}>
      <p className={`font-[family-name:var(--font-edo-display)] text-4xl font-bold tracking-tight ${value.length > 6 ? 'sm:text-4xl' : 'sm:text-5xl'} ${dark ? 'text-white' : 'text-edo-navy'}`}
        {...(m && !isNaN(num) ? { 'data-count': num, 'data-decimals': decimals, 'data-prefix': m[1], 'data-suffix': m[3] } : {})}>{value}</p>
      <div className="mt-4"><p className={`text-sm font-medium ${dark ? 'text-white/85' : 'text-edo-ink'}`}>{label}</p>
        <a href={source} className={`mt-1 block font-mono text-[10px] uppercase tracking-wider underline-offset-2 hover:underline ${dark ? 'text-edo-gold/80' : 'text-edo-skytext'}`}>Source{asOf ? ` · ${asOf}` : ''}</a></div>
    </div>
  );
}
