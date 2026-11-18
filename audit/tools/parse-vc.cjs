// Parse every crawled Visit Chandler page into a structured inventory.
// Output: audit/data/vc-pages.json (full detail) — consumed by inventory/manifest generators and the DB seed.
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const extractData = require('./extract-data.cjs');

const RAW = path.join(__dirname, '../raw/vc');
const OUT = path.join(__dirname, '../data');
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'https://www.visitchandler.com';

const status = fs.readFileSync(path.join(RAW, '_status.tsv'), 'utf8').trim().split('\n').map((l) => {
  const [url, code, finalUrl, file, err] = l.split('\t');
  return { url, code: Number(code), finalUrl, file, err };
});

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
/** Strip Simpleview CDN transformation segment to recover the master asset URL. */
function masterImage(u) {
  if (!u) return u;
  u = u.startsWith('//') ? 'https:' + u : u.startsWith('/') ? BASE + u : u;
  return u.replace(/(\/image\/upload\/)(?:[a-z]_[^/]+\/)+(v\d+\/)?/, (m, a, v) => a + (v || ''));
}
function pageType(p) {
  if (p === '/') return 'homepage';
  if (p.startsWith('/listing/')) return 'listing';
  if (p.startsWith('/event/')) return 'event';
  if (/^\/blog\/stories\/post\//.test(p) || /^\/blog\/post\//.test(p)) return 'article';
  if (p.startsWith('/blog/')) return 'blog-index';
  if (p.startsWith('/media-gallery/')) return 'media-gallery';
  if (p.startsWith('/coupon/')) return 'offer';
  if (/^\/events\//.test(p)) return 'events-landing';
  return 'content';
}

const pages = [];
for (const s of status) {
  const p = s.url.replace(BASE, '');
  const rec = { url: s.url, path: p, httpStatus: s.code, finalUrl: s.finalUrl, redirected: s.finalUrl !== s.url, type: pageType(p), section: '/' + (p.split('/')[1] || '') };
  if (s.code !== 200 || !fs.existsSync(path.join(RAW, s.file))) { rec.error = s.err || `HTTP ${s.code}`; pages.push(rec); continue; }
  const html = fs.readFileSync(path.join(RAW, s.file), 'utf8');
  const $ = cheerio.load(html);
  rec.title = clean($('title').first().text());
  rec.metaDescription = $('meta[name="description"]').attr('content') || '';
  rec.canonical = $('link[rel="canonical"]').attr('href') || '';
  rec.ogImage = $('meta[property="og:image"]').attr('content') || '';
  rec.ogTitle = $('meta[property="og:title"]').attr('content') || '';
  rec.robots = $('meta[name="robots"]').attr('content') || '';
  rec.h1 = clean($('h1').first().text());

  // Breadcrumb + schema types from JSON-LD
  rec.schemaTypes = []; rec.breadcrumb = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const j = JSON.parse($(el).text());
      const graph = j['@graph'] || [j];
      for (const g of graph) {
        rec.schemaTypes.push(g['@type']);
        if (g['@id'] && /#(event|localbusiness|lodgingbusiness|hotel|restaurant|touristattraction|place|article|blogposting)$/i.test(g['@id'])) rec.ld = g;
        if (!rec.ld && /^(Event|LocalBusiness|Hotel|LodgingBusiness|Restaurant|TouristAttraction|BlogPosting|Article)$/.test(g['@type'])) rec.ld = g;
        if (g.breadcrumb?.itemListElement) rec.breadcrumb = g.breadcrumb.itemListElement.map((b) => clean(b.name));
        if (g['@type'] === 'BreadcrumbList') rec.breadcrumb = g.itemListElement.map((b) => clean(b.name));
      }
    } catch {}
  });
  rec.schemaTypes = [...new Set(rec.schemaTypes.flat().filter(Boolean))];

  const main = $('main').first().length ? $('main').first() : $('body');
  main.find('script, style, noscript').remove();

  // Widgets that compose the page (layout fingerprint)
  rec.widgets = [];
  main.find('.contentRender').each((_, el) => {
    const cls = $(el).attr('class') || '';
    const m = cls.match(/contentRender_name_([a-z0-9_]+)/g);
    if (m) rec.widgets.push(m.map((x) => x.replace('contentRender_name_', '')).join('+'));
  });
  rec.widgets = [...new Set(rec.widgets)];

  // Headings & body copy
  rec.headings = main.find('h1,h2,h3').map((_, h) => ({ level: h.tagName, text: clean($(h).text()) })).get().filter((h) => h.text).slice(0, 60);
  const textboxes = main.find('.contentRender_name_plugins_core_textbox');
  rec.bodyHtml = textboxes.map((_, el) => $(el).html()).get().join('\n').trim();
  if (!rec.bodyHtml) {
    const cand = main.find('.content, .text-content, .page-content, .wysiwyg, article').first();
    rec.bodyHtml = cand.length ? cand.html().trim() : '';
  }
  rec.textExcerpt = clean(main.text()).slice(0, 1200);
  rec.wordCount = clean(main.text()).split(' ').length;

  // Collection tiles/cards (curated links with imagery) -> CMS blocks
  rec.tiles = [];
  main.find('.contentRender_name_plugins_collections_type_custom_slides').each((_, w) => {
    const tpl = ((($(w).attr('class') || '').match(/template_custom_([a-z0-9_]+)/) || [])[1]) || 'slides';
    const items = [];
    $(w).find('a[href]').each((__, a) => {
      const $a = $(a); const img = $a.find('img').first();
      const title = clean($a.find('h2,h3,h4,.title').first().text()) || clean($a.attr('aria-label')) || clean($a.text()).slice(0, 120);
      const href = $a.attr('href');
      if (!href || href.startsWith('#') || items.find((i) => i.href === href)) return;
      items.push({ title, href, image: masterImage(img.attr('data-src') || img.attr('src')) || null, alt: img.attr('alt') || '' });
    });
    const heading = clean($(w).find('h2').first().text());
    if (items.length) rec.tiles.push({ template: tpl, heading, items: items.slice(0, 24) });
  });

  // Images (img/src/srcset/data-src/picture source/bg images)
  const imgs = new Map();
  const add = (src, alt, kind) => {
    if (!src || src.startsWith('data:') || /\.svg(\?|$)/.test(src)) return;
    const master = masterImage(src.split(' ')[0]);
    if (!imgs.has(master)) imgs.set(master, { src: master, rendered: src.split(' ')[0], alt: alt || '', kind });
  };
  $('main img, header img, .hero img').each((_, el) => {
    const $i = $(el);
    add($i.attr('data-src') || $i.attr('src'), $i.attr('alt'), 'img');
    ($i.attr('data-srcset') || $i.attr('srcset') || '').split(/,\s+/).forEach((x) => add(x.trim(), $i.attr('alt'), 'srcset'));
  });
  $('main source').each((_, el) => ($(el).attr('data-srcset') || $(el).attr('srcset') || '').split(/,\s+/).forEach((x) => add(x.trim(), '', 'picture')));
  $('[style*="background-image"]').each((_, el) => { const m = ($(el).attr('style') || '').match(/url\(['"]?([^'")]+)/); if (m) add(m[1], '', 'background'); });
  if (rec.ogImage) add(rec.ogImage, rec.ogTitle, 'og');
  // Hero: first large image inside the page header/hero region
  const heroImg = $('.contentRender_name_plugins_common_page_header img, .page-header img, .hero img, header + * img').first();
  rec.heroImage = heroImg.length ? masterImage(heroImg.attr('data-src') || heroImg.attr('src')) : null;
  rec.heroAlt = heroImg.attr('alt') || '';

  // Directory widget configuration (which listings a directory page shows)
  if (html.includes('plugins_listings_listings')) {
    const v = {}; const re = /var (subcats|regions|regionsChosen|subcatsChosen|specificListingsChosen|amenities|listingIds|recids|listings) = ([^\n]*);/g; let m;
    while ((m = re.exec(html))) { if (v[m[1]] !== undefined) continue; try { v[m[1]] = JSON.parse(m[2]); } catch { v[m[1]] = m[2].slice(0, 200); } }
    if (Array.isArray(v.subcats)) {
      rec.directory = {
        subcats: v.subcats.map((s) => s.label),
        regions: v.regionsChosen ? (v.regions || []).map((r) => r.label) : [],
        presetAmenities: Array.isArray(v.amenities) && v.amenities.length <= 3 ? v.amenities.map((a) => a.label) : [],
        specificListings: v.specificListingsChosen === true,
      };
      const ids = html.match(/"recids"\s*:\s*\[([\d,\s"]+)\]/);
      if (ids) rec.directory.recids = ids[1].split(',').map((x) => Number(x.replace(/"/g, ''))).filter(Boolean);
    }
  }

  // Structured record (listings/events)
  const data = extractData(html);
  const dm = html.match(/var dates = "([^"]*)";/); if (dm) rec.eventDates = dm[1].split(',').map((d) => d.trim()).filter(Boolean);
  const rm = html.match(/"recurrence"\s*:\s*"([^"]*)"/); if (rm) rec.recurrence = rm[1];
  if (data) {
    (data.media || []).forEach((m) => add(m.mediaurl, m.mediadesc || m.medianame, 'record'));
    (data.media_raw || []).forEach((m) => add(m.mediaurl, m.mediadesc || data.title, 'record'));
    rec.record = data;
  }
  rec.images = [...imgs.values()];

  // Video / iframes / interactive embeds
  rec.embeds = $('iframe').map((_, f) => $(f).attr('src') || $(f).attr('data-src')).get().filter(Boolean);
  rec.videos = $('video source, video').map((_, v) => $(v).attr('src')).get().filter(Boolean);

  // Forms
  rec.forms = $('form').map((_, f) => ({
    action: $(f).attr('action') || '', method: $(f).attr('method') || 'get', id: $(f).attr('id') || '',
    fields: $(f).find('input,select,textarea').map((__, i) => ({ name: $(i).attr('name'), type: $(i).attr('type') || i.tagName, label: clean($(f).find(`label[for="${$(i).attr('id')}"]`).text()) || $(i).attr('placeholder') || '' })).get().filter((x) => x.name && x.type !== 'hidden'),
  })).get().filter((f) => f.fields.length);

  // Links
  const internal = new Set(); const external = new Set(); const downloads = new Set();
  main.find('a[href]').each((_, a) => {
    const h = $(a).attr('href');
    if (!h || h.startsWith('#') || h.startsWith('javascript')) return;
    if (/\.(pdf|docx?|xlsx?|zip)(\?|$)/i.test(h)) downloads.add(h.startsWith('/') ? BASE + h : h);
    if (h.startsWith('/') || h.startsWith(BASE)) internal.add(h.replace(BASE, '')); else if (/^https?:/.test(h)) external.add(h);
    else if (h.startsWith('mailto:') || h.startsWith('tel:')) external.add(h);
  });
  rec.internalLinks = [...internal]; rec.externalLinks = [...external]; rec.downloads = [...downloads];

  // Blog article metadata
  if (rec.type === 'article') {
    rec.articleDate = $('meta[property="article:published_time"]').attr('content') || clean(main.find('time, .date, .post-date').first().text()) || '';
    rec.author = clean(main.find('.author, .byline, [rel=author]').first().text());
  }
  pages.push(rec);
}

// Global navigation (from homepage)
const home = status.find((s) => s.url === BASE + '/');
const nav = { main: [], secondary: [], footer: [], dropdowns: {} };
if (home) {
  const $ = cheerio.load(fs.readFileSync(path.join(RAW, home.file), 'utf8'));
  $('.contentRender_name_plugins_nav_main a, nav.main-nav a').each((_, a) => nav.main.push({ label: clean($(a).text()), href: $(a).attr('href') }));
  $('.contentRender_name_plugins_nav_secondary a').each((_, a) => nav.secondary.push({ label: clean($(a).text()), href: $(a).attr('href') }));
  $('footer a').each((_, a) => nav.footer.push({ label: clean($(a).text()) || $(a).attr('aria-label') || '', href: $(a).attr('href') }));
  $('.contentRender_name_plugins_nav_main_dropdown, [class*="main_dropdown"]').each((_, d) => {
    $(d).find('a').each((__, a) => { (nav.dropdowns.all ||= []).push({ label: clean($(a).text()), href: $(a).attr('href') }); });
  });
}
const dedupe = (arr) => arr.filter((x, i) => x.href && arr.findIndex((y) => y.href === x.href && y.label === x.label) === i);
nav.main = dedupe(nav.main); nav.secondary = dedupe(nav.secondary); nav.footer = dedupe(nav.footer);
if (nav.dropdowns.all) nav.dropdowns.all = dedupe(nav.dropdowns.all);

fs.writeFileSync(path.join(OUT, 'vc-pages.json'), JSON.stringify(pages, null, 1));
fs.writeFileSync(path.join(OUT, 'vc-nav.json'), JSON.stringify(nav, null, 1));
const byType = pages.reduce((a, p) => ((a[p.type] = (a[p.type] || 0) + 1), a), {});
console.log('pages', pages.length, byType, 'errors', pages.filter((p) => p.error).length);
