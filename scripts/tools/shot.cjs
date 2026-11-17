// Screenshot local pages: node shot.cjs <outDir> <width> <path...>
const { chromium } = require('playwright');
const [out, width, ...paths] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
  for (const p of paths) {
    const pg = await c.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message)); pg.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 200)));
    const r = await pg.goto('http://localhost:3000' + p, { waitUntil: 'networkidle', timeout: 120000 }).catch((e) => ({ status: () => 'ERR ' + e.message }));
    await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); } window.scrollTo(0, 0); });
    await pg.waitForTimeout(1200);
    const f = `${out}/${width}${p.replace(/[^a-z0-9]+/gi, '_')}.jpg`;
    await pg.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 70 });
    console.log(r.status(), p, f, errs.length ? 'ERRORS: ' + errs.slice(0, 3).join(' | ') : '');
    await pg.close();
  }
  await b.close();
})();
