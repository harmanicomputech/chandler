// Visual review: capture pages at a width, crop the first N px, and tile into contact sheets.
const { chromium, devices } = require('playwright'); const sharp = require('sharp'); const fs = require('fs');
const [out, mode, ...paths] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const opts = mode === 'mobile' ? { ...devices['Pixel 7'] } : { viewport: { width: 1440, height: 900 } };
const CROP = mode === 'mobile' ? 2600 : 2200;
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(opts); const tiles = [];
  for (const p of paths) {
    const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    const r = await pg.goto('http://localhost:3001' + p, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => null);
    await pg.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-visible')));
    await pg.waitForTimeout(900);
    const ow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    const buf = await pg.screenshot({ fullPage: true, type: 'png' });
    const meta = await sharp(buf).metadata();
    const w = 480; const crop = await sharp(buf).extract({ left: 0, top: 0, width: meta.width, height: Math.min(meta.height, Math.round(CROP * meta.width / (opts.viewport?.width ?? meta.width))) }).resize({ width: w }).toBuffer();
    const label = Buffer.from(`<svg width="${w}" height="22"><rect width="100%" height="100%" fill="#111"/><text x="6" y="15" font-size="12" fill="#fff" font-family="sans-serif">${r?.status() ?? 'ERR'} ${p.replace(/&/g, '&amp;').slice(0, 60)}${ow > 1 ? ' OVERFLOW ' + ow : ''}${errs.length ? ' JSERR' : ''}</text></svg>`);
    tiles.push({ label, crop, h: (await sharp(crop).metadata()).height });
    console.log(r?.status(), p, ow > 1 ? `OVERFLOW ${ow}px` : '', errs.join(' | ').slice(0, 200));
    await pg.close();
  }
  for (let s = 0; s * 4 < tiles.length; s++) {
    const group = tiles.slice(s * 4, s * 4 + 4); const H = Math.max(...group.map((t) => t.h)) + 22;
    await sharp({ create: { width: 4 * 490, height: H, channels: 3, background: '#ddd' } }).composite(group.flatMap((t, i) => [{ input: t.label, left: i * 490, top: 0 }, { input: t.crop, left: i * 490, top: 22 }])).jpeg({ quality: 72 }).toFile(`${out}/${mode}_${s}.jpg`);
  }
  await b.close();
})();
