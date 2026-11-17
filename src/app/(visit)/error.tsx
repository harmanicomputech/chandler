'use client';
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (<section className="flex min-h-[70vh] items-center justify-center px-5 pt-32 text-center"><div><p className="eyebrow text-teal-700">Something went wrong</p><h1 className="mt-4 font-display text-6xl text-navy">We hit a bump in the road.</h1><p className="mt-4 text-ink-soft">Please try again. If the problem continues, contact the Visit Chandler team at 480-782-3037.</p><button onClick={reset} className="mt-8 rounded-full bg-blue-500 px-7 py-3 font-bold text-white">Try again</button></div></section>);
}
