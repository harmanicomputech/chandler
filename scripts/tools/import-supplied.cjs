// Import client-supplied images: convert (many are AVIF with .jpg names) to optimised JPEG, record in manifest JSON.
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const ROOT = path.resolve(__dirname, '../..');
const out = []; const slug = (s) => s.toLowerCase().replace(/\.[a-z]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const B_HOME = { 'Hot Air Expeditions.jpg': 'hot-air-expeditions', 'Mother and father swinging little girl between them walking down the sidewalk in Downtown Chandler.jpg': 'downtown-family', 'Open Graph image.jpg': 'open-graph-lake' };
const A_KEEP = ['concierge-assists-with-checkin-hotel.jpg', 'luxury-bedroom-hotel.jpg', 'tidy-hotel-room-with-brown-curtains.jpg', 'croissant-boiled-egg-orange-juice-yogurt-breakfast-tray-bed-hotel-room.jpg'];
(async () => {
  for (const [dir, set] of [['assets-supplied/b', 'B'], ['assets-supplied/a', 'A']]) {
    for (const f of fs.readdirSync(path.join(ROOT, dir))) {
      if (!/\.(jpe?g|png)$/i.test(f)) continue;
      const src = path.join(ROOT, dir, f); const meta = await sharp(src).metadata().catch(() => null);
      if (!meta || meta.width < 300) { out.push({ file: f, set, status: 'skipped', reason: 'too small / placeholder' }); continue; }
      if (set === 'A' && !A_KEEP.includes(f)) { out.push({ file: f, set, status: 'excluded', reason: 'Generic resort/beach stock — not representative of Chandler (Sonoran Desert); not used to avoid misrepresenting the destination' }); continue; }
      if (/Where City Meets Desert|Performance resource/.test(f)) { out.push({ file: f, set, status: 'reference', reason: 'Brand graphic / UI asset from current site, used as reference only' }); continue; }
      const folder = set === 'A' ? 'client-supplied/representative' : B_HOME[f] ? 'homepage' : 'client-supplied/chandler';
      const name = (B_HOME[f] ?? slug(f)) + '.jpg';
      fs.mkdirSync(path.join(ROOT, 'public/images', folder), { recursive: true });
      const info = await sharp(src).rotate().resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true, progressive: true }).toFile(path.join(ROOT, 'public/images', folder, name));
      const blur = 'data:image/jpeg;base64,' + (await sharp(src).resize(16).blur().jpeg({ quality: 40 }).toBuffer()).toString('base64');
      out.push({ file: f, set, status: 'imported', local: `/images/${folder}/${name}`, width: info.width, height: info.height, alt: f.replace(/\.[a-z]+$/i, '').replace(/[-_]/g, ' '), blur,
        permission: set === 'A' ? 'client-supplied stock (representative — not a Chandler location)' : 'client-supplied (Visit Chandler photography)' });
    }
  }
  fs.writeFileSync(path.join(ROOT, 'audit/data/supplied-images.json'), JSON.stringify(out, null, 1));
  console.log(out.reduce((a, o) => ((a[o.set + ':' + o.status] = (a[o.set + ':' + o.status] || 0) + 1), a), {}));
})();
