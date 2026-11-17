import './globals.css';
import type { Metadata, Viewport } from 'next';
import { instrument, hanken, sora, plex, plexMono } from './fonts';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VISIT_SITE_URL ?? 'http://localhost:3000'),
  title: { default: 'Visit Chandler, AZ', template: '%s | Visit Chandler' },
};
export const viewport: Viewport = { themeColor: '#214FA1', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-US" className={`${instrument.variable} ${hanken.variable} ${sora.variable} ${plex.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
