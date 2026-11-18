// Download the City's destination photography (as referenced by migrated content) into public/images/<folder>/,
// and write IMAGE_MANIFEST.csv + IMAGE_PERMISSIONS.csv + audit/data/image-map.json (source URL -> local path).
// Files whose names mark them as not-for-sharing are NOT downloaded and are flagged "restricted".
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('../../node_modules/sharp');

const ROOT = path.join(__dirname, '../..');
const pages = require('../data/vc-pages.json');
const OUTDIR = path.join(ROOT, 'public/images');
const mapFile = path.join(__dirname, '../data/image-map.json');
const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : {};

const RESTRICTED = /do[_-]?not[_-]?share|donotshare|no[_-]share|not[_-]for[_-](web|use)/i;
const isCdn = (u) => /assets\.simpleviewinc\.com\/simpleview\/image\/upload\//.test(u);

function folderFor(p, rec) {
  if (p.path === '/') return 'homepage';
  if (p.type === 'event' || p.path.startsWith('/events')) return 'events';
  if (p.type === 'article' || p.path.startsWith('/blog') || p.path.startsWith('/articles')) return 'editorial';
  if (p.type === 'media-gallery' || p.path.startsWith('/media')) return 'media-gallery';
  if (p.path.startsWith('/meetings') || p.path.startsWith('/business-travelers') || p.path.startsWith('/travel-trade')) return 'meetings';
  if (p.path.startsWith('/weddings')) return 'weddings';
  if (p.path.startsWith('/things-to-do/downtown') || p.path.includes('downtown')) return 'downtown';
  if (p.path.startsWith('/things-to-do/outdoor') || /park|trail|hik|bike/.test(p.path)) return 'parks-trails';
  if (p.path.startsWith('/hotels')) return 'hotels';
  if (p.path.startsWith('/restaurants')) return 'restaurants';
  if (p.path.startsWith('/plan-your-visit') || p.path.startsWith('/visitors-guide')) return 'visitor-resources';
  if (p.type === 'listing' && rec) {
    const cat = (rec.primaryCategory?.catname || '').toLowerCase(); const sub = (rec.primaryCategory?.subcatname || '').toLowerCase();
    if (cat.includes('accommodation') || cat.includes('lodging') || sub.includes('hotel') || sub.includes('resort')) return 'hotels';
    if (cat.includes('dining') || cat.includes('restaurant')) return 'restaurants';
    if (/park|trail|golf|recreation|outdoor/.test(sub + cat)) return 'parks-trails';
    if (/venue|meeting/.test(sub + cat)) return 'meetings';
    if ((rec.region || '').includes('Downtown')) return 'downtown';
    return 'attractions';
  }
  return 'visitor-resources';
}

// Decide which images each page needs locally (keep the repo lean but complete for rendering).
const wanted = []; // {src, alt, page, folder, width, role}
for (const p of pages) {
  if (p.error || !p.images) continue;
  const folder = folderFor(p, p.record);
  const recImgs = p.images.filter((i) => i.kind === 'record');
  if (p.type === 'listing') recImgs.slice(0, 4).forEach((i, n) => wanted.push({ ...i, page: p.url, folder, width: n === 0 ? 1600 : 1200, role: n === 0 ? 'primary' : 'gallery' }));
  else if (p.type === 'event') recImgs.slice(0, 2).forEach((i, n) => wanted.push({ ...i, page: p.url, folder, width: 1600, role: n === 0 ? 'primary' : 'gallery' }));
  else {
    const hero = p.heroImage || p.ogImage;
    if (hero) wanted.push({ src: hero, alt: p.heroAlt || p.ogTitle || p.h1 || '', page: p.url, folder, width: 2400, role: 'hero' });
    (p.tiles || []).forEach((t) => t.items.forEach((it) => it.image && wanted.push({ src: it.image, alt: it.alt || it.title, page: p.url, folder, width: 1200, role: 'tile' })));
    if (p.type === 'article' || p.type === 'content' || p.type === 'homepage') p.images.filter((i) => i.kind === 'img').slice(0, p.type === 'homepage' ? 40 : 8).forEach((i) => wanted.push({ ...i, page: p.url, folder, width: 1600, role: 'inline' }));
  }
}
// De-duplicate by source, keeping the largest requested width and first page association.
const bySrc = new Map();
for (const w of wanted) { if (!w.src) continue; const k = w.src; const prev = bySrc.get(k); if (!prev || w.width > prev.width) bySrc.set(k, { ...w, ...(prev ? { page: prev.page, folder: prev.folder, alt: prev.alt || w.alt } : {}) }); }
const items = [...bySrc.values()];
console.log('images wanted', items.length);

const slug = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
async function dl(it) {
  if (map[it.src]?.local && fs.existsSync(path.join(ROOT, 'public', map[it.src].local))) return;
  const file = decodeURIComponent(it.src.split('/').pop().split('?')[0]);
  if (RESTRICTED.test(file)) { map[it.src] = { ...it, local: null, permission: 'restricted', note: 'File name marks image as not for sharing — excluded pending City confirmation' }; return; }
  if (!isCdn(it.src) && !/^https:\/\/www\.visitchandler\.com\//.test(it.src)) { map[it.src] = { ...it, local: null, permission: 'external', note: 'Third-party host — not migrated' }; return; }
  const url = isCdn(it.src) ? it.src.replace('/image/upload/', `/image/upload/c_limit,f_jpg,q_78,w_${it.width}/`) : it.src;
  const name = `${slug(file)}-${crypto.createHash('md5').update(it.src).digest('hex').slice(0, 6)}.jpg`;
  const rel = `/images/${it.folder}/${name}`;
  fs.mkdirSync(path.join(OUTDIR, it.folder), { recursive: true });
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      const out = await sharp(buf).rotate().jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(path.join(ROOT, 'public', rel));
      const tiny = await sharp(buf).resize(16).blur().jpeg({ quality: 40 }).toBuffer();
      map[it.src] = { ...it, local: rel, width: out.width, height: out.height, bytes: out.size, format: 'jpeg', blur: 'data:image/jpeg;base64,' + tiny.toString('base64'), permission: 'pending' };
      return;
    } catch (e) { if (a === 2) map[it.src] = { ...it, local: null, permission: 'pending', note: 'Download failed: ' + e.message }; await new Promise((r) => setTimeout(r, 1000 * (a + 1))); }
  }
}

(async () => {
  const queue = items.slice(); let done = 0;
  const workers = Array.from({ length: 6 }, async () => { while (queue.length) { await dl(queue.shift()); if (++done % 100 === 0) { console.log('...', done); fs.writeFileSync(mapFile, JSON.stringify(map)); } } });
  await Promise.all(workers);
  fs.writeFileSync(mapFile, JSON.stringify(map));
  // Full manifest also lists every image seen on every page (even those not migrated).
  const all = new Map();
  for (const p of pages) (p.images || []).forEach((i) => { if (!all.has(i.src)) all.set(i.src, { ...i, page: p.url }); });
  const esc = (v) => `"${String(v ?? '').replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`;
  const rows = [['source_url', 'local_path', 'original_page', 'image_description', 'width', 'height', 'format', 'alt_text', 'attribution', 'permission_status', 'role', 'notes'].join(',')];
  const perm = [['source_url', 'local_path', 'permission_status', 'rights_holder', 'basis', 'action_required'].join(',')];
  for (const [src, i] of all) {
    const m = map[src] || {};
    const file = decodeURIComponent(src.split('/').pop().split('?')[0]);
    const credit = (file.match(/credit[_-]([A-Za-z_]+?)(?:_[0-9a-f]{8}|\.)/i) || [])[1]?.replace(/_/g, ' ') || '';
    const status = m.permission || (RESTRICTED.test(file) ? 'restricted' : 'not_migrated');
    rows.push([src, m.local || '', m.page || i.page, i.alt || m.alt || file, m.width || '', m.height || '', m.format || (file.split('.').pop() || ''), i.alt || m.alt || '', credit, status, m.role || i.kind, m.note || ''].map(esc).join(','));
    perm.push([src, m.local || '', status, credit || 'City of Chandler / Visit Chandler (to confirm)',
      status === 'restricted' ? 'Filename indicates do-not-share' : 'Published on visitchandler.com (City-operated)',
      status === 'restricted' ? 'City to confirm rights or supply alternative' : 'City to confirm reuse rights before public launch'].map(esc).join(','));
  }
  fs.writeFileSync(path.join(ROOT, 'docs/IMAGE_MANIFEST.csv'), rows.join('\n'));
  fs.writeFileSync(path.join(ROOT, 'docs/IMAGE_PERMISSIONS.csv'), perm.join('\n'));
  const vals = Object.values(map);
  console.log('downloaded', vals.filter((v) => v.local).length, 'restricted', vals.filter((v) => v.permission === 'restricted').length, 'failed', vals.filter((v) => v.note?.startsWith('Download failed')).length, 'manifest rows', rows.length - 1);
})();
