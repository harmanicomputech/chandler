// Append client-supplied and Economic Development images to docs/IMAGE_MANIFEST.csv and IMAGE_PERMISSIONS.csv (idempotent).
const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '../..'); const D = path.join(ROOT, 'docs');
const esc = (v) => `"${String(v ?? '').replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`;
const strip = (f) => fs.readFileSync(f, 'utf8').split('\n').filter((l) => l && !l.startsWith('"client-supplied:') && !l.includes('www.chandleraz.gov/sites/default/files'));
const man = strip(path.join(D, 'IMAGE_MANIFEST.csv')); const perm = strip(path.join(D, 'IMAGE_PERMISSIONS.csv'));
for (const x of require('../data/supplied-images.json')) {
  const status = x.status === 'imported' ? x.permission : `${x.status} — ${x.reason}`;
  man.push([`client-supplied:${x.file}`, x.local, 'Client upload (zip)', x.alt ?? x.file, x.width, x.height, 'jpeg', x.alt, x.set === 'A' ? 'Client-supplied stock' : 'Visit Chandler (client-supplied)', status, x.set === 'A' ? 'representative' : 'supplied', x.reason].map(esc).join(','));
  perm.push([`client-supplied:${x.file}`, x.local, x.status === 'imported' ? 'client-supplied' : x.status, x.set === 'A' ? 'Stock licensor (to confirm)' : 'City of Chandler / Visit Chandler', 'Supplied by client for this project', x.set === 'A' ? 'Confirm stock licence covers municipal web use' : 'Confirm rights; supply hi-res originals'].map(esc).join(','));
}
for (const x of Object.values(require('../data/ed-image-map.json'))) {
  man.push([x.src, x.local, x.page, x.alt, x.width, x.height, 'jpeg', x.alt, 'City of Chandler', x.local ? 'pending' : 'not_migrated', 'edo', x.note].map(esc).join(','));
  if (x.local) perm.push([x.src, x.local, 'pending', 'City of Chandler (to confirm)', 'Published on chandleraz.gov', 'City to confirm reuse rights (some photos may be partner-supplied)'].map(esc).join(','));
}
fs.writeFileSync(path.join(D, 'IMAGE_MANIFEST.csv'), man.join('\n') + '\n'); fs.writeFileSync(path.join(D, 'IMAGE_PERMISSIONS.csv'), perm.join('\n') + '\n');
console.log('manifest rows', man.length - 1, 'permission rows', perm.length - 1);
