// Build src/generated/blur-map.json: local image path -> tiny blurred data URI (used as next/image placeholder).
const fs = require('fs'); const path = require('path'); const ROOT = path.resolve(__dirname, '../..');
const read = (f) => (fs.existsSync(path.join(ROOT, f)) ? JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')) : null);
const out = {};
for (const m of Object.values(read('audit/data/image-map.json') ?? {})) if (m.local && m.blur) out[m.local] = m.blur;
for (const m of Object.values(read('audit/data/ed-image-map.json') ?? {})) if (m.local && m.blur) out[m.local] = m.blur;
for (const m of read('audit/data/supplied-images.json') ?? []) if (m.local && m.blur) out[m.local] = m.blur;
fs.writeFileSync(path.join(ROOT, 'src/generated/blur-map.json'), JSON.stringify(out));
console.log('blur entries', Object.keys(out).length);
