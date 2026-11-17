import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="relative flex min-h-[80vh] items-center overflow-hidden bg-mist px-5 pt-32">
      <div aria-hidden className="absolute -right-20 top-20 size-[420px] rounded-full bg-teal-100 blur-3xl" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="eyebrow text-teal-700">404 · Page not found</p>
        <h1 className="mt-4 font-display text-[clamp(3rem,8vw,6rem)] leading-[0.9] text-navy">Looks like you wandered off the trail.</h1>
        <p className="mt-6 text-lg text-ink-soft">The page you’re looking for may have moved. Try searching, or start from one of these:</p>
        <form action="/search/" className="mx-auto mt-8 flex max-w-lg gap-2"><label htmlFor="nf-q" className="sr-only">Search</label><input id="nf-q" name="q" placeholder="Search Visit Chandler" className="flex-1 rounded-full border border-line bg-white px-5 py-3" /><button className="rounded-full bg-blue-500 px-6 font-bold text-white">Search</button></form>
        <ul className="mt-8 flex flex-wrap justify-center gap-3 text-sm font-semibold">{[['Hotels', '/hotels/'], ['Restaurants', '/restaurants/'], ['Things to do', '/things-to-do/'], ['Events', '/events/'], ['Home', '/']].map(([l, h]) => <li key={h}><Link href={h} className="inline-block rounded-full bg-white px-5 py-2.5 ring-1 ring-line hover:ring-blue-500">{l}</Link></li>)}</ul>
      </div>
    </section>
  );
}
