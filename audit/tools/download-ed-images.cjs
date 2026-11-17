// Download City economic-development photography (jpg/png photos, not icons) into public/images/edo/.
const fs = require('fs'); const path = require('path'); const crypto = require('crypto'); const sharp = require('../../node_modules/sharp');
const ROOT = path.join(__dirname, '../..'); const pages = require('../data/ed-pages.json').filter((p) => p.platform === 'edo' && !p.error);
const OUT = path.join(ROOT, 'public/images/edo'); fs.mkdirSync(OUT, { recursive: true });
const mapFile = path.join(__dirname, '../data/ed-image-map.json'); const map = fs.existsSync(mapFile) ? require(mapFile) : {};
const items = new Map(); pages.forEach((p) => p.images.forEach((i) => { if (!/\/fa-|icon|logo/i.test(i.src) && !items.has(i.src)) items.set(i.src, { ...i, page: p.url }); }));
(async () => {
  for (const it of items.values()) {
    if (map[it.src]) continue;
    try {
      const r = await fetch(it.src, { headers: { 'user-agent': 'Mozilla/5.0 TechatronAudit/1.0' }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer()); const meta = await sharp(buf).metadata();
      if (meta.width < 300) { map[it.src] = { ...it, local: null, note: 'small graphic, not migrated' }; continue; }
      const name = decodeURIComponent(it.src.split('/').pop().split('?')[0]).replace(/\.[a-z]+$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '-' + crypto.createHash('md5').update(it.src).digest('hex').slice(0, 6) + '.jpg';
      const info = await sharp(buf).flatten({ background: '#ffffff' }).resize({ width: 1800, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(path.join(OUT, name));
      const blur = 'data:image/jpeg;base64,' + (await sharp(buf).resize(16).flatten({ background: '#ffffff' }).jpeg({ quality: 40 }).toBuffer()).toString('base64');
      map[it.src] = { ...it, local: `/images/edo/${name}`, width: info.width, height: info.height, blur, permission: 'pending' };
    } catch (e) { map[it.src] = { ...it, local: null, note: 'Download failed: ' + e.message }; }
    fs.writeFileSync(mapFile, JSON.stringify(map)); await new Promise((r) => setTimeout(r, 1000));
  }
  console.log('ed images', Object.values(map).filter((m) => m.local).length, 'of', items.size);
})();
