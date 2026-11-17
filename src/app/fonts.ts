import localFont from 'next/font/local';

/** Self-hosted (no third-party font requests): editorial serif + humanist grotesk for Visit Chandler. */
export const instrument = localFont({
  src: [
    { path: './fonts/instrument-serif-latin-400-normal.woff2', style: 'normal', weight: '400' },
    { path: './fonts/instrument-serif-latin-400-italic.woff2', style: 'italic', weight: '400' },
  ],
  variable: '--font-instrument', display: 'swap',
});
export const hanken = localFont({ src: './fonts/hanken-grotesk-latin-wght-normal.woff2', variable: '--font-hanken', display: 'swap', weight: '100 900' });
/** Economic Development: geometric display + IBM Plex for authoritative data typography. */
export const sora = localFont({ src: './fonts/sora-latin-wght-normal.woff2', variable: '--font-sora', display: 'swap', weight: '100 800' });
export const plex = localFont({
  src: [
    { path: './fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-sans-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-plex', display: 'swap',
});
export const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-plexmono', display: 'swap',
});
