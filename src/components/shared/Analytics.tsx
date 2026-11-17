'use client';
import Script from 'next/script';
import { useEffect, useState } from 'react';

/**
 * Loads Google Tag Manager only when NEXT_PUBLIC_GTM_ID is configured AND the visitor has consented.
 * Consent is stored per-browser. Without consent, only the first-party cookieless beacon is used.
 */
export function Analytics({ site }: { site: 'visit' | 'edo' }) {
  const id = site === 'visit' ? process.env.NEXT_PUBLIC_GTM_ID_VISIT : process.env.NEXT_PUBLIC_GTM_ID_EDO;
  const [consent, setConsent] = useState<'yes' | 'no' | null>('no');
  useEffect(() => { try { setConsent((localStorage.getItem('cc:consent') as 'yes' | 'no' | null) ?? null); } catch {} }, []);
  if (!id) return null;
  const decide = (v: 'yes' | 'no') => { try { localStorage.setItem('cc:consent', v); } catch {} setConsent(v); };
  return (
    <>
      {consent === 'yes' && <Script id="gtm" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${id}');`}</Script>}
      {consent === null && (
        <div role="dialog" aria-label="Cookie consent" className="fixed inset-x-4 bottom-4 z-[80] mx-auto flex max-w-2xl flex-col gap-4 rounded-2xl bg-white p-5 text-sm text-navy shadow-2xl ring-1 ring-black/5 sm:flex-row sm:items-center">
          <p className="flex-1">We use analytics cookies to understand how visitors use this site. You can accept or decline.</p>
          <div className="flex gap-2"><button onClick={() => decide('no')} className="rounded-full px-4 py-2 font-semibold ring-1 ring-line">Decline</button><button onClick={() => decide('yes')} className="rounded-full bg-blue-500 px-4 py-2 font-semibold text-white">Accept</button></div>
        </div>
      )}
    </>
  );
}
