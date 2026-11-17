// Re-encode large JPEG masters in public/images (keeps paths; next/image derives responsive AVIF/WebP from these).
const fs = require('fs'); const path = require('path'); const sharp = require('sharp');
const root = path.resolve(__dirname, '../../public/images'); let before = 0, after = 0, n = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
(async () => {
  for (const f of walk(root).filter((f) => /\.jpe?g$/i.test(f))) {
    const s = fs.statSync(f).size; before += s;
    if (s < 120_000) { after += s; continue; }
    const buf = await sharp(f).resize({ width: 1600, withoutEnlargement: true }).jpeg({ quality: 70, mozjpeg: true, progressive: true }).toBuffer();
    if (buf.length < s) { fs.writeFileSync(f, buf); after += buf.length; n++; } else after += s;
  }
  console.log(`re-encoded ${n} files: ${(before / 1e6).toFixed(0)}MB -> ${(after / 1e6).toFixed(0)}MB`);
})();
