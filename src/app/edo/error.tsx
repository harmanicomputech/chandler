'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (<section className="mx-auto max-w-2xl px-5 py-32 text-center"><h1 className="font-[family-name:var(--font-edo-display)] text-4xl font-bold text-edo-navy">Something went wrong.</h1><p className="mt-4 text-edo-slate">Please try again, or call the Economic Development team at 480-782-3030.</p><button onClick={reset} className="mt-8 bg-edo-navy px-6 py-3 font-semibold text-white">Try again</button></section>);
}
