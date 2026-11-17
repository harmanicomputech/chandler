import sharp from 'sharp'; import fs from 'fs'; import path from 'path';
const [dir, out] = process.argv.slice(2);
const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|avif|webp)$/i.test(f));
const W = 240, H = 160, cols = 6; const tiles = [];
for (const [i, f] of files.entries()) {
  try { const meta = await sharp(path.join(dir, f)).metadata(); if (meta.width < 100) continue;
    const buf = await sharp(path.join(dir, f)).resize(W, H, { fit: 'cover' }).jpeg().toBuffer();
    const label = Buffer.from(`<svg width="${W}" height="20"><rect width="100%" height="100%" fill="black"/><text x="4" y="14" font-size="11" fill="white" font-family="sans-serif">${tiles.length}: ${f.slice(0,34).replace(/&/g,'&amp;')} ${meta.width}x${meta.height}</text></svg>`);
    tiles.push({ buf, label, f, w: meta.width, h: meta.height, fmt: meta.format }); } catch (e) { console.log('skip', f, e.message); }
}
const rows = Math.ceil(tiles.length / cols);
const comp = []; tiles.forEach((t, i) => { const x = (i % cols) * W, y = Math.floor(i / cols) * (H + 20); comp.push({ input: t.buf, left: x, top: y }, { input: t.label, left: x, top: y + H }); });
await sharp({ create: { width: cols * W, height: rows * (H + 20), channels: 3, background: '#fff' } }).composite(comp).jpeg({ quality: 70 }).toFile(out);
console.log(tiles.map((t, i) => `${i}\t${t.f}\t${t.w}x${t.h}\t${t.fmt}`).join('\n'));
