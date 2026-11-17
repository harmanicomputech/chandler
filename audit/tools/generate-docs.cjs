// Generate inventory & migration documents from the audit data AND the live database (so "migrated" is verified, not assumed).
// Outputs: docs/WEBSITE_INVENTORY.md, docs/ECONOMIC_DEVELOPMENT_INVENTORY.md, docs/SEO_MIGRATION_MAP.csv, docs/REDIRECT_MAP.csv
const fs = require('fs'); const path = require('path');
const { Client } = require('../../node_modules/pg');
const ROOT = path.join(__dirname, '../..'); const D = path.join(ROOT, 'docs'); fs.mkdirSync(D, { recursive: true });
const vc = require('../data/vc-pages.json'); const ed = require('../data/ed-pages.json'); const nav = require('../data/vc-nav.json');
const imgMap = fs.existsSync(path.join(__dirname, '../data/image-map.json')) ? require('../data/image-map.json') : {};
const VC = 'https://www.visitchandler.com'; const CZ = 'https://www.chandleraz.gov'; const ED_PREFIX = '/business/economic-development';
const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\s+/g, ' ').trim()}"`;
const md = (v) => String(v ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').trim();
const rel = (u) => { const r = u.replace(VC, '') || '/'; try { return decodeURIComponent(r); } catch { return r; } };

(async () => {
  const db = new Client({ connectionString: process.env.DATABASE_URL ?? 'postgresql://chandler:chandler_dev@localhost:5432/chandler' }); await db.connect();
  const q = async (s) => (await db.query(s)).rows;
  const pages = new Set((await q(`select site, path from pages`)).map((r) => r.site + r.path));
  const listings = new Map((await q(`select source_id, id, slug, primary_media_id from listings`)).map((r) => [r.source_id, r]));
  const events = new Map((await q(`select source_id, id, slug from events`)).map((r) => [r.source_id, r]));
  const articles = new Set((await q(`select site, slug from articles`)).map((r) => r.site + ':' + r.slug));
  const redirects = await q(`select site, from_path, to_path, status_code, note from redirects order by site, from_path`);
  const navPaths = new Map(); nav.main.forEach((n, i) => navPaths.set(n.href, `Main #${i + 1}`)); nav.secondary.forEach((n, i) => navPaths.set(n.href.replace(VC, ''), `Utility #${i + 1}`)); nav.footer.forEach((n) => { const h = (n.href || '').replace(VC, ''); if (h.startsWith('/') && !navPaths.has(h)) navPaths.set(h, 'Footer'); });

  /* ───────── Visit Chandler ───────── */
  const rows = vc.map((p) => {
    const pth = rel(p.url); let replacement = pth; let status = 'Not migrated';
    if (p.error) { const r = redirects.find((x) => x.site === 'visit' && x.from_path === pth); status = r ? `Redirected (${r.status_code})` : `Inaccessible (${p.error})`; replacement = r?.to_path ?? ''; }
    else if (p.type === 'listing') { const l = listings.get(`vc-listing-${p.record?.recid}`); status = l ? 'Migrated (listing)' : 'Not migrated'; }
    else if (p.type === 'event') { const e = events.get(`vc-event-${p.record?.recid}`); status = e ? 'Migrated (event)' : 'Not migrated'; }
    else if (p.type === 'article') { const slug = pth.split('/').filter(Boolean)[2]; status = articles.has('visit:' + slug) ? 'Migrated (article)' : 'Not migrated'; }
    else status = pages.has('visit' + pth) ? 'Migrated (CMS page)' : 'Not migrated';
    const imgs = p.images || []; const local = imgs.filter((i) => imgMap[i.src]?.local).length; const restricted = imgs.filter((i) => imgMap[i.src]?.permission === 'restricted').length;
    return { p, pth, replacement, status, imgs: imgs.length, local, restricted };
  });
  const by = (f) => rows.reduce((a, r) => ((a[f(r)] = (a[f(r)] || 0) + 1), a), {});
  const typeCounts = by((r) => r.p.type); const statusCounts = by((r) => r.status.replace(/ \(.*/, ''));
  const forms = vc.filter((p) => p.forms?.length); const embeds = new Map(); vc.forEach((p) => (p.embeds || []).forEach((e) => { const h = (() => { try { return new URL(e, VC).host; } catch { return e; } })(); embeds.set(h, (embeds.get(h) || 0) + 1); }));
  const ext = new Map(); vc.forEach((p) => (p.externalLinks || []).forEach((e) => { try { const h = new URL(e).host; ext.set(h, (ext.get(h) || 0) + 1); } catch {} }));
  const downloads = [...new Set(vc.flatMap((p) => p.downloads || []))];
  let out = `# Visit Chandler — Website Inventory\n\n_Generated ${new Date().toISOString().slice(0, 10)} from a full crawl of https://www.visitchandler.com/sitemap.xml (1,193 URLs, robots Crawl-delay 2s honoured) cross-checked against the new CMS database._\n\n`;
  out += `## Summary\n\n| Page type | Count |\n|---|---|\n${Object.entries(typeCounts).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n| **Total** | **${rows.length}** |\n\n`;
  out += `### Migration status\n\n| Status | Count |\n|---|---|\n${Object.entries(statusCounts).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n`;
  out += `### Inaccessible URLs (documented, not silently omitted)\n\n${rows.filter((r) => r.p.error).map((r) => `- \`${r.pth}\` — ${r.p.error} → ${r.replacement ? `redirected to \`${r.replacement}\`` : 'no replacement'}`).join('\n')}\n\n`;
  out += `## Navigation (live site)\n\n- **Main:** ${nav.main.map((n) => `${n.label} (\`${n.href}\`)`).join(' · ')}\n- **Utility:** ${nav.secondary.map((n) => `${n.label} (\`${n.href.replace(VC, '')}\`)`).join(' · ')}\n- **Footer:** ${nav.footer.filter((n) => n.label).map((n) => `${n.label}`).join(' · ')}\n\nThe live mega-menus are rendered client-side; the rebuilt IA (see CMS Navigation) groups every sub-page discovered in the sitemap under these five sections.\n\n`;
  out += `## Forms on the current site\n\n| Page | Action | Fields |\n|---|---|---|\n${forms.map((p) => p.forms.map((f) => `| ${rel(p.url)} | ${md(f.action || f.id)} | ${md(f.fields.map((x) => x.label || x.name).join(', '))} |`).join('\n')).join('\n')}\n\nRebuilt as validated, moderated forms: contact, event submission, meeting RFP, wedding enquiry, partner listing request, visitors-guide request, newsletter (see \`src/lib/forms.ts\`).\n\n`;
  out += `## Interactive features & third-party integrations found\n\n| Feature | Where | Rebuilt as |\n|---|---|---|\n| Simpleview CRM listings directory (filters, map, paging) | 48 directory pages | Server-rendered filterable directory + map (\`Directory.tsx\`) |\n| Events calendar (Simpleview) | /events/ | Events browser + month calendar + .ics export |\n| Weather widget (weather-icons, provider via Simpleview plugin) | Homepage, /plan-your-visit/weather/ | NWS-powered weather centre |\n| Trip/itinerary ("Add to Trip") | Listings, events | Trip planner with shareable itineraries |\n| GTranslate language switcher | Footer | Native Spanish/German landing pages retained; translation service to be confirmed |\n| Social feed (#VisitChandler) | Homepage | Social links (feed provider to be confirmed) |\n| Google Tag Manager / GA4 | All pages | Consent-gated GTM + first-party analytics |\n| Cookie banner | All pages | Consent dialog |\n\n**Embedded third-party hosts:** ${[...embeds].map(([h, n]) => `${h} (${n})`).join(', ') || 'none'}\n\n**Most-linked external hosts:** ${[...ext].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([h, n]) => `${h} (${n})`).join(', ')}\n\n**Downloadable resources:** ${downloads.length ? downloads.map((d) => `\`${d}\``).join(', ') : 'none linked directly from page bodies (Visitors Guide is a hosted publication)'}\n\n`;
  out += `## Directory pages (listing filters captured)\n\n| Page | Sub-categories | Preset amenity filter |\n|---|---|---|\n${vc.filter((p) => p.directory).map((p) => `| ${rel(p.url)} | ${md(p.directory.subcats.join(', '))} | ${md(p.directory.presetAmenities.join(', '))} |`).join('\n')}\n\n> Known limitation: the live widget also matches listings by **secondary** CRM categories, which are not exposed in public page markup. Directory membership in the rebuild uses each listing's primary category plus preset amenity filters. A Simpleview CRM export (listing → all categories) will close this gap during final migration.\n\n`;
  out += `## Complete URL inventory\n\nColumns: original URL · title · type · section (parent) · nav position · layout (widgets) · images (total / migrated / restricted) · forms · embeds · external links · meta description · replacement URL · migration status\n\n| Original URL | Title | Type | Section | Nav | Layout | Images | Forms | Embeds | Ext. links | Meta description | Replacement | Status |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n`;
  out += rows.map(({ p, pth, replacement, status, imgs, local, restricted }) => `| ${md(pth)} | ${md(p.title)} | ${p.type} | ${p.section} | ${navPaths.get(pth) ?? ''} | ${md((p.widgets || []).map((w) => w.replace(/plugins_|collections_type_custom_slides\+|collections_template_custom_/g, '')).slice(0, 4).join(', '))} | ${imgs}/${local}/${restricted} | ${(p.forms || []).length} | ${(p.embeds || []).length} | ${(p.externalLinks || []).length} | ${md((p.metaDescription || '').slice(0, 120))} | ${md(replacement)} | ${status} |`).join('\n');
  fs.writeFileSync(path.join(D, 'WEBSITE_INVENTORY.md'), out + '\n');

  /* ───────── SEO migration map (both sites) ───────── */
  const seo = [['site', 'original_url', 'new_url', 'http_status_on_audit', 'title', 'h1', 'meta_description', 'canonical', 'og_image', 'schema_types', 'migration_status'].join(',')];
  rows.forEach(({ p, pth, replacement, status }) => seo.push([ 'visit', p.url, replacement ? (process.env.VISIT_SITE_URL ?? VC) + replacement : '', p.httpStatus, p.title, p.h1, p.metaDescription, p.canonical, p.ogImage, (p.schemaTypes || []).join(' '), status].map(esc).join(',')));
  const edRows = ed.map((p) => {
    const isArt = p.section === 'blog' || p.section === 'news';
    const to = p.platform !== 'edo' ? null : isArt ? '/news/' + p.path.split('/').pop() + '/' : (p.path.replace(ED_PREFIX, '') || '/').replace(/\/?$/, '/');
    const migrated = !to ? 'Out of scope (City business services remain on chandleraz.gov)' : isArt ? (articles.has('edo:' + p.path.split('/').pop()) ? 'Migrated (article)' : 'Not migrated') : pages.has('edo' + to) ? 'Migrated (EDO page)' : 'Not migrated';
    return { p, to, migrated };
  });
  edRows.forEach(({ p, to, migrated }) => seo.push(['edo', p.url, to ? `${process.env.EDO_SITE_URL ?? 'https://business.chandleraz.gov'}${to}` : '', p.httpStatus, p.title, p.h1, p.metaDescription, p.canonical, p.ogImage, '', migrated].map(esc).join(',')));
  fs.writeFileSync(path.join(D, 'SEO_MIGRATION_MAP.csv'), seo.join('\n') + '\n');

  /* ───────── Redirect map ───────── */
  const rd = [['site', 'from', 'to', 'status_code', 'note'].join(',')];
  redirects.forEach((r) => rd.push([r.site, r.site === 'edo' ? CZ + r.from_path : r.from_path, r.site === 'edo' ? `${process.env.EDO_SITE_URL ?? 'https://business.chandleraz.gov'}${r.to_path}` : r.to_path, r.status_code, r.note].map(esc).join(',')));
  rd.push(['visit', '(all other legacy URLs)', '(same path — preserved)', '200', 'Visit Chandler URL structure is preserved 1:1 (trailingSlash, /listing/<slug>/<id>/, /event/<slug>/<id>/, /blog/post/<slug>/), so no redirect is required'].map(esc).join(','));
  fs.writeFileSync(path.join(D, 'REDIRECT_MAP.csv'), rd.join('\n') + '\n');

  /* ───────── Economic Development inventory ───────── */
  const indicators = await q(`select key, label, value, source_url, as_of from economic_indicators order by key`);
  const staff = await q(`select name, title, phone from staff_profiles order by sort`);
  const reports = await q(`select title, file_url from reports order by title`);
  const edo = edRows.filter((r) => r.p.platform === 'edo');
  const embedsEd = new Map(); edo.forEach(({ p }) => (p.embeds || []).forEach((e) => { const h = new URL(e.replace(/"$/, '')).host; embedsEd.set(h, (embedsEd.get(h) || 0) + 1); }));
  let o = `# Chandler Economic Development — Inventory\n\n_Generated ${new Date().toISOString().slice(0, 10)} from a crawl of chandleraz.gov (business & economic-development sections, related news/blog) cross-checked against the new CMS._\n\n`;
  o += `## Scope\n\n- Economic development pages crawled: **${edo.length}** (all HTTP 200)\n- Related City business pages inventoried (tax & licence, vendor services, airport): **${edRows.length - edo.length}** — these are City services that stay on chandleraz.gov; the new platform links to them.\n\n`;
  o += `## Content discovered\n\n| Area | Pages | Notes |\n|---|---|---|\n${Object.entries(edo.reduce((a, { p }) => ((a[p.section] = (a[p.section] || 0) + 1), a), {})).map(([k, v]) => `| ${k} | ${v} | |`).join('\n')}\n\n`;
  o += `## Existing data sources & integrations\n\n| Integration | Host | Used on | Treatment in new platform |\n|---|---|---|---|\n| GIS Planning (ZoomProspector / "ecdev.org" dashboards: market advantages, economic dashboard, logistics, talent pipeline) | chandler.ecdev.org | Why Choose Chandler, Data & Maps, Workforce | Embedded on migrated pages; **licensed property feed adapter** documented for the property database |\n| ArcGIS StoryMaps (office/industrial project tours, district tours) | storymaps.arcgis.com | Districts, Real Estate, Site Selection | Embedded (accessible title); data portal links |\n| Issuu (Small Business Guide, Community Profile) | e.issuu.com | Small Business, Market Research | Embedded + direct PDF downloads |\n| YouTube (district videos) | youtube.com | Districts | Privacy-enhanced embeds (youtube-nocookie) |\n| Google Maps (office location) | google.com/maps | Contact | Replaced by native map |\n| Drupal webforms (Initiate a Project, Let's Talk Business intake) | chandleraz.gov | Contact, Business Services | Rebuilt as validated enquiry workflows with staff management |\n\nEmbed counts: ${[...embedsEd].map(([h, n]) => `${h} (${n})`).join(', ')}\n\n`;
  o += `## Verified economic indicators (stored with source & as-of)\n\n| Key | Indicator | Value | Source | As of |\n|---|---|---|---|---|\n${indicators.map((i) => `| ${i.key} | ${md(i.label)} | ${md(i.value)} | ${i.source_url} | ${md(i.as_of)} |`).join('\n')}\n\n`;
  o += `## Staff directory (public contact page)\n\n| Name | Title | Phone |\n|---|---|---|\n${staff.map((s) => `| ${s.name} | ${s.title} | ${s.phone ?? '— (not published / truncated on source page)'} |`).join('\n')}\n\n`;
  o += `## Reports & downloads (${reports.length})\n\n${reports.map((r) => `- [${md(r.title)}](${r.file_url})`).join('\n')}\n\n`;
  o += `## Available properties\n\nThe City website **does not publish a list of available properties**; it references a licensed database (GIS Planning) and CoStar data, plus StoryMap tours of existing projects. The property intelligence application is therefore delivered with clearly-labelled **demonstration fixtures** (flagged \`is_fixture\`, banner on every view, excluded from sitemaps) and an import adapter specification (API_INTEGRATIONS.md §Property data). No property records were invented as real listings.\n\n`;
  o += `## Page inventory\n\n| Original URL | Title | Section | Words | Images | Downloads | Embeds | Forms | New URL | Status |\n|---|---|---|---|---|---|---|---|---|---|\n${edRows.map(({ p, to, migrated }) => `| ${p.path} | ${md(p.title)} | ${p.platform}:${p.section} | ${p.wordCount ?? ''} | ${(p.images || []).length} | ${(p.downloads || []).length} | ${(p.embeds || []).length} | ${(p.forms || []).length} | ${to ?? ''} | ${migrated} |`).join('\n')}\n`;
  fs.writeFileSync(path.join(D, 'ECONOMIC_DEVELOPMENT_INVENTORY.md'), o);
  await db.end();
  console.log('docs generated', { visit: rows.length, edo: edRows.length, redirects: redirects.length, status: statusCounts });
})();
