// Paced fetcher: starts one request every <delayMs> (robots Crawl-delay), without waiting for slow responses. Resumable.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const [,, urlsFile, base, outDir, delayArg] = process.argv;
const delay = Number(delayArg || 2000);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 TechatronAudit/1.0';
fs.mkdirSync(outDir, { recursive: true });
const st = path.join(outDir, '_status.tsv');
const done = new Set(fs.existsSync(st) ? fs.readFileSync(st, 'utf8').split('\n').map(l => l.split('\t')[0]) : []);
const log = fs.createWriteStream(st, { flags: 'a' });
const fname = u => crypto.createHash('sha1').update(u).digest('hex').slice(0, 16) + '.html';
const urls = fs.readFileSync(urlsFile, 'utf8').split('\n').filter(Boolean).map(u => u.startsWith('http') ? u : base + u).filter(u => !done.has(u));
console.log('remaining', urls.length);
const inflight = [];
for (const full of urls) {
  inflight.push((async () => {
    let status = 0, final = full, err = '';
    try {
      const r = await fetch(full, { headers: { 'user-agent': UA, accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(60000) });
      status = r.status; final = r.url; fs.writeFileSync(path.join(outDir, fname(full)), await r.text());
    } catch (e) { err = String(e.message || e); }
    log.write([full, status, final, fname(full), err].join('\t') + '\n');
  })());
  await new Promise(r => setTimeout(r, delay));
}
await Promise.all(inflight); console.log('done');
