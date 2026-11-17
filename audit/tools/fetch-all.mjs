// Polite sequential fetcher honouring robots Crawl-delay. Usage: node fetch-all.mjs <urlsFile> <base> <outDir> <delayMs>
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [,, urlsFile, base, outDir, delayArg] = process.argv;
const delay = Number(delayArg || 2000);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 TechatronAudit/1.0';
fs.mkdirSync(outDir, { recursive: true });
const urls = fs.readFileSync(urlsFile, 'utf8').split('\n').filter(Boolean);
const log = fs.createWriteStream(path.join(outDir, '_status.tsv'), { flags: 'a' });
const done = new Set(fs.existsSync(path.join(outDir,'_status.tsv')) ? fs.readFileSync(path.join(outDir,'_status.tsv'),'utf8').split('\n').map(l=>l.split('\t')[0]) : []);
const fname = u => crypto.createHash('sha1').update(u).digest('hex').slice(0,16) + '.html';
for (const u of urls) {
  const full = u.startsWith('http') ? u : base + u;
  if (done.has(full)) continue;
  let status = 0, final = full, err = '';
  try {
    const r = await fetch(full, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow' });
    status = r.status; final = r.url;
    const body = await r.text();
    fs.writeFileSync(path.join(outDir, fname(full)), body);
  } catch (e) { err = String(e.message || e); }
  log.write([full, status, final, fname(full), err].join('\t') + '\n');
  await new Promise(r => setTimeout(r, delay));
}
console.log('done');
