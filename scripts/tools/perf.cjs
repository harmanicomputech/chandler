// Measure LCP, CLS, transfer size and JS weight for pages on the production server (desktop + mobile emulation, 4x CPU throttle on mobile).
const { chromium, devices } = require('playwright');
const paths = process.argv.slice(2);
(async () => {
  const b = await chromium.launch();
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['mobile', { ...devices['Pixel 7'] }]]) {
    for (const p of paths) {
      const ctx = await b.newContext(opts); const page = await ctx.newPage();
      const cdp = await ctx.newCDPSession(page);
      if (name === 'mobile') { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 10, uploadThroughput: 750e3 / 8 }); }
      let bytes = 0, js = 0; page.on('response', async (r) => { try { const l = Number(r.headers()['content-length'] || (await r.body()).length); bytes += l; if (/\.js(\?|$)/.test(r.url())) js += l; } catch {} });
      await page.addInitScript(() => { window.__lcp = 0; window.__cls = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); });
      await page.goto('http://localhost:3001' + p, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500);
      const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(3), ttfb: Math.round(performance.getEntriesByType('navigation')[0].responseStart) }));
      console.log(`${name.padEnd(7)} ${p.padEnd(42)} TTFB ${String(m.ttfb).padStart(4)}ms  LCP ${String(m.lcp).padStart(5)}ms  CLS ${m.cls}  transfer ${(bytes / 1024).toFixed(0)}KB  JS ${(js / 1024).toFixed(0)}KB`);
      await ctx.close();
    }
  }
  await b.close();
})();
