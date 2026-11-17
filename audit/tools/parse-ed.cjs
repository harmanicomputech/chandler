// Parse crawled chandleraz.gov business / economic-development pages into a structured inventory.
// Output: audit/data/ed-pages.json
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const RAW = path.join(__dirname, '../raw/ed');
const OUT = path.join(__dirname, '../data');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://www.chandleraz.gov';
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const abs = (u) => (!u ? u : u.startsWith('http') ? u : u.startsWith('//') ? 'https:' + u : BASE + (u.startsWith('/') ? '' : '/') + u);

const status = fs.readFileSync(path.join(RAW, '_status.tsv'), 'utf8').trim().split('\n').map((l) => {
  const [url, code, finalUrl, file, err] = l.split('\t'); return { url, code: Number(code), finalUrl, file, err };
});

function classify(p) {
  if (p.startsWith('/business/economic-development')) {
    const seg = p.split('/')[3] || 'home';
    return { platform: 'edo', section: seg };
  }
  if (p.startsWith('/news-center/')) return { platform: 'edo', section: 'news' };
  if (p.startsWith('/blog/')) return { platform: 'edo', section: 'blog' };
  if (p.startsWith('/business')) return { platform: 'city-business', section: p.split('/')[2] || 'business' };
  return { platform: 'city-other', section: p.split('/')[1] };
}

const pages = [];
for (const s of status) {
  const p = s.url.replace(BASE, '');
  const rec = { url: s.url, path: p, httpStatus: s.code, finalUrl: s.finalUrl, ...classify(p) };
  if (s.code !== 200) { rec.error = s.err || `HTTP ${s.code}`; pages.push(rec); continue; }
  const $ = cheerio.load(fs.readFileSync(path.join(RAW, s.file), 'utf8'));
  rec.title = clean($('title').text()).replace(/ \| City of Chandler, AZ$/, '');
  rec.metaDescription = $('meta[name="description"]').attr('content') || '';
  rec.ogImage = $('meta[property="og:image"]').attr('content') || '';
  rec.canonical = $('link[rel="canonical"]').attr('href') || '';
  rec.breadcrumb = $('.breadcrumb li, nav[aria-label*=readcrumb] li').map((_, li) => clean($(li).text())).get().filter(Boolean);
  const region = $('.region-content').first();
  region.find('script, style, noscript, .breadcrumb, nav[aria-label*=readcrumb]').remove();
  rec.h1 = clean(region.find('h1').first().text()) || clean($('h1').first().text());
  rec.headings = region.find('h2,h3').map((_, h) => ({ level: h.tagName, text: clean($(h).text()) })).get().filter((h) => h.text);
  // Body: Drupal body fields + paragraphs (keeps tables, lists, links)
  const parts = [];
  region.find('article .field--name-body, article .paragraph, article .field--name-field-paragraphs > .field__item').each((_, el) => {
    if ($(el).parents('.paragraph').length) return; // avoid nested duplicates
    parts.push($(el).html());
  });
  rec.bodyHtml = (parts.join('\n') || region.find('article').first().html() || '').trim();
  rec.text = clean(region.text());
  rec.wordCount = rec.text.split(' ').length;
  rec.images = region.find('img').map((_, i) => ({ src: abs($(i).attr('src')), alt: $(i).attr('alt') || '' })).get()
    .filter((i) => i.src && !/\.svg/.test(i.src));
  const links = region.find('a[href]').map((_, a) => ({ href: abs($(a).attr('href')), text: clean($(a).text()) })).get();
  rec.downloads = links.filter((l) => /\.(pdf|docx?|xlsx?|pptx?)(\?|$)/i.test(l.href));
  rec.externalLinks = links.filter((l) => !l.href.startsWith(BASE) && /^https?:/.test(l.href));
  rec.internalLinks = links.filter((l) => l.href.startsWith(BASE)).map((l) => ({ ...l, href: l.href.replace(BASE, '') }));
  rec.embeds = $('iframe').map((_, f) => $(f).attr('src')).get().filter(Boolean);
  rec.forms = region.find('form').map((_, f) => ({
    id: $(f).attr('id') || '', action: $(f).attr('action') || '',
    fields: $(f).find('input,select,textarea').map((__, i) => ({ name: $(i).attr('name'), type: $(i).attr('type') || i.tagName,
      label: clean($(f).find(`label[for="${$(i).attr('id')}"]`).text()) })).get().filter((x) => x.name && x.type !== 'hidden' && !/^(form_|op$|antibot)/.test(x.name)),
  })).get();
  // Staff contact cards (contact-us page)
  rec.contacts = region.find('.views-row, .card, .paragraph--type--contact, .contact').map((_, c) => clean($(c).text())).get().filter((t) => /@|\d{3}[.-]\d{3}[.-]\d{4}/.test(t)).slice(0, 40);
  pages.push(rec);
}
fs.writeFileSync(path.join(OUT, 'ed-pages.json'), JSON.stringify(pages, null, 1));
const by = pages.reduce((a, p) => ((a[p.platform + ':' + p.section] = (a[p.platform + ':' + p.section] || 0) + 1), a), {});
console.log('ed pages', pages.length, by);
