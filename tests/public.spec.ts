import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';

/* ─────────────── Routes ─────────────── */
const VISIT_ROUTES = ['/', '/hotels/', '/hotels/pet-friendly/', '/restaurants/', '/restaurants/mexican-food/', '/things-to-do/', '/things-to-do/outdoor-recreation/hiking/',
  '/events/', '/events/this-weekend/', '/events/annual-events/ostrich-festival/', '/plan-your-visit/', '/plan-your-visit/weather/', '/meetings/', '/weddings/', '/blog/',
  '/media/', '/contact/', '/partnerwithus/', '/sitemap/', '/privacy-policy/', '/accessibility-statement/', '/visita-chandler/', '/map/', '/trip-planner/', '/concierge/', '/search/?q=brunch',
  '/listing/10%3a19-coffee/4484/', '/event/16th-annual-arizona-balloon-classic/8751/'];
const EDO_ROUTES = ['/edo/', '/edo/why-choose-chandler/', '/edo/why-choose-chandler/business-climate/', '/edo/key-industries-and-employers/', '/edo/key-industries-and-employers/advanced-manufacturing/',
  '/edo/employment-and-business-districts/price-corridor/', '/edo/business-services/incentives-and-funding/', '/edo/market-research-data-and-maps/', '/edo/contact-us/', '/edo/contact-us/initiate-a-project/',
  '/edo/properties/', '/edo/data/', '/edo/reports/', '/edo/news/'];

for (const path of [...VISIT_ROUTES, ...EDO_ROUTES]) {
  test(`route renders: ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const res = await page.goto(path, { waitUntil: 'domcontentloaded' });
    expect(res?.status(), `${path} status`).toBe(200);
    await expect(page.locator('h1').first()).toBeVisible();
    expect(await page.locator('h1').count(), 'exactly one h1').toBe(1);
    await expect(page.locator('main#main')).toBeVisible();
    expect(errors, 'no uncaught JS errors').toEqual([]);
  });
}

test('legacy URL sample from the audit inventory resolves (200)', async ({ request }) => {
  const pages = JSON.parse(fs.readFileSync('audit/data/vc-pages.json', 'utf8')) as { url: string; httpStatus: number }[];
  const ok = pages.filter((p) => p.httpStatus === 200);
  const sample = Array.from({ length: 60 }, (_, i) => ok[Math.floor((i * ok.length) / 60)]);
  const failures: string[] = [];
  for (const p of sample) { const path = p.url.replace('https://www.visitchandler.com', ''); const r = await request.get(path, { maxRedirects: 0 }); if (r.status() !== 200) failures.push(`${r.status()} ${path}`); }
  expect(failures).toEqual([]);
});

test('redirect register: legacy 404 URL and old City EDO URLs redirect permanently', async ({ request }) => {
  const r = await request.get('/articles/post/', { maxRedirects: 0 });
  expect([301, 308]).toContain(r.status());
  expect(r.headers()['location']).toContain('/blog/');
  const e = await request.get('/edo/business/economic-development/why-choose-chandler/', { maxRedirects: 0 });
  expect([301, 308]).toContain(e.status());
});

test('unknown URL returns branded 404', async ({ page }) => {
  const r = await page.goto('/this-page-does-not-exist/');
  expect(r?.status()).toBe(404);
  await expect(page.getByText('wandered off the trail')).toBeVisible();
});

/* ─────────────── SEO ─────────────── */
test('SEO: metadata, canonical, JSON-LD and sitemaps', async ({ page, request }) => {
  await page.goto('/listing/10%3a19-coffee/4484/');
  expect(await page.title()).toContain('10:19 Coffee');
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', /\/listing\/10%3A19-coffee\/4484\/|\/listing\/10:19-coffee\/4484\//i);
  const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
  expect(ld.some((t) => t.includes('"Restaurant"') || t.includes('"LocalBusiness"'))).toBeTruthy();
  expect(ld.some((t) => t.includes('BreadcrumbList'))).toBeTruthy();
  const sm = await request.get('/sitemap.xml'); expect(sm.status()).toBe(200);
  const body = await sm.text(); expect((body.match(/<loc>/g) ?? []).length).toBeGreaterThan(1100);
  const edo = await request.get('/edo-sitemap.xml'); expect(edo.status()).toBe(200);
  expect(await edo.text()).not.toContain('demo'); // fixtures excluded from sitemap
  const robots = await request.get('/robots.txt'); expect(await robots.text()).toContain('Disallow');
});

/* ─────────────── Directory, search, events ─────────────── */
test('directory: keyword filter narrows results and map view loads', async ({ page }) => {
  await page.goto('/restaurants/');
  const total = Number((await page.locator('#directory p[aria-live] strong').textContent()) ?? 0);
  expect(total).toBeGreaterThan(100);
  await page.fill('#dq', 'pizza'); await page.getByRole('button', { name: 'Apply' }).click();
  await page.waitForURL(/q=pizza/);
  const filtered = Number(await page.locator('#directory p[aria-live] strong').textContent());
  expect(filtered).toBeGreaterThan(0); expect(filtered).toBeLessThan(total);
  await page.getByRole('link', { name: 'Map', exact: true }).click();
  await expect(page.locator('.leaflet-container')).toBeVisible();
  await page.getByRole('button', { name: 'List' }).click();
  await expect(page.locator('#directory ul li').first()).toBeVisible();
});

test('pet-friendly directory applies the preset amenity filter', async ({ page }) => {
  await page.goto('/hotels/pet-friendly/');
  const n = Number(await page.locator('#directory p[aria-live] strong').textContent());
  await page.goto('/hotels/');
  const all = Number(await page.locator('#directory p[aria-live] strong').textContent());
  expect(n).toBeGreaterThan(0); expect(n).toBeLessThanOrEqual(all);
});

test('events: month calendar view and ICS export', async ({ page, request }) => {
  await page.goto('/events/?view=month');
  await expect(page.getByRole('grid')).toBeVisible();
  await page.getByRole('button', { name: 'Next month' }).click();
  const ics = await request.get('/api/events/8751/ics/');
  expect(ics.status()).toBe(200); expect(await ics.text()).toContain('BEGIN:VEVENT');
});

test('site search returns grouped results', async ({ page }) => {
  await page.goto('/search/?q=balloon');
  await expect(page.getByText(/results/)).toBeVisible();
  await expect(page.locator('h2', { hasText: /Places|Events|Stories|Pages/ }).first()).toBeVisible();
});

/* ─────────────── Weather ─────────────── */
test('weather centre shows live NWS data or an honest unavailable state', async ({ page }) => {
  await page.goto('/plan-your-visit/weather/');
  const live = page.getByText('Current conditions');
  const down = page.getByText('Live weather is temporarily unavailable');
  await expect(live.or(down)).toBeVisible();
  if (await live.isVisible()) {
    await expect(page.getByText('7-day forecast')).toBeVisible();
    await expect(page.getByText('National Weather Service (NOAA)')).toBeVisible();
    await page.getByText('View as table').click();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThan(10);
  }
});

/* ─────────────── Forms ─────────────── */
test('contact form validates, then submits and stores', async ({ page }) => {
  await page.goto('/contact/');
  await page.waitForTimeout(2600); // minimum human fill time (anti-bot)
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Please correct the highlighted fields.')).toBeVisible();
  await expect(page.locator('[aria-invalid="true"]').first()).toBeFocused();
  await page.fill('#contact-firstName', 'Test'); await page.fill('#contact-lastName', 'Visitor'); await page.fill('#contact-email', `qa+${Date.now()}@example.com`);
  await page.selectOption('#contact-topic', 'Visitor information'); await page.fill('#contact-message', 'Automated QA message — please ignore.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('your message has been sent')).toBeVisible();
});

test('newsletter requires consent and subscribes', async ({ request }) => {
  const bad = await request.post('/api/newsletter/', { data: { email: 'x@example.com', consent: false, site: 'visit' } });
  expect(bad.status()).toBe(422);
  const ok = await request.post('/api/newsletter/', { data: { email: `qa+${Date.now()}@example.com`, consent: true, site: 'visit' } });
  expect(ok.status()).toBe(200);
});

/* ─────────────── Trip planner & saved items ─────────────── */
test('save a listing, build a trip, share it and open the shared itinerary', async ({ page }) => {
  await page.goto('/listing/10%3a19-coffee/4484/');
  await page.getByRole('button', { name: 'Save to trip' }).click();
  await expect(page.getByRole('button', { name: 'Saved to your trip' })).toBeVisible();
  await page.goto('/trip-planner/');
  await page.getByRole('button', { name: /Add 10:19 Coffee to day 1/ }).click();
  await page.fill('#tp-q', 'ostrich');
  await page.locator('button[aria-label^="Add "]').first().click();
  await expect(page.locator('ol li').first().getByRole('link').first()).toBeVisible();
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Save & share' }).click();
  const link = page.locator('a[href*="/trip-planner/"]').filter({ hasText: '/trip-planner/' });
  await expect(link).toBeVisible();
  await page.goto(await link.getAttribute('href') as string);
  await expect(page.getByRole('heading', { name: 'Day 1' })).toBeVisible();
  await expect(page.getByRole('link', { name: '10:19 Coffee' })).toBeVisible();
});

/* ─────────────── Concierge ─────────────── */
test('concierge answers only with verified records and labels the mode', async ({ request }) => {
  const r = await request.post('/api/concierge/', { data: { question: 'Where can I find family-friendly restaurants?' } });
  expect(r.status()).toBe(200);
  const j = await r.json();
  expect(['ai', 'retrieval']).toContain(j.mode);
  for (const p of j.picks) expect(j.records[`${p.kind}:${p.id}`], 'every pick references a real record').toBeTruthy();
});

/* ─────────────── Economic development ─────────────── */
test('EDO: every headline figure links to a source', async ({ page }) => {
  await page.goto('/edo/');
  const tiles = page.locator('section').first().locator('a', { hasText: 'Source' });
  expect(await tiles.count()).toBeGreaterThanOrEqual(4);
  await expect(page.getByText('Global leaders choose Chandler.')).toBeVisible();
});

test('EDO: property explorer filters, compares and sends an enquiry', async ({ page }) => {
  await page.goto('/edo/properties/');
  await expect(page.getByText('Demonstration data.')).toBeVisible();
  await page.getByLabel('Type', { exact: true }).selectOption('office');
  await expect(page.getByText(/^2 of 10 properties$/)).toBeVisible();
  await page.getByLabel('Type', { exact: true }).selectOption('');
  const compare = page.getByRole('button', { name: 'Compare' });
  await compare.nth(0).click(); await compare.nth(1).click();
  await page.getByRole('link', { name: 'Compare side by side' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await page.getByRole('table').getByRole('link').first().click();
  await page.waitForTimeout(2600);
  await page.fill('#property-enquiry-firstName', 'QA'); await page.fill('#property-enquiry-lastName', 'Tester'); await page.fill('#property-enquiry-email', 'qa@example.com');
  await page.fill('#property-enquiry-message', 'Automated QA enquiry.');
  await page.getByRole('button', { name: 'Send enquiry' }).click();
  await expect(page.getByText('Your property enquiry has been sent')).toBeVisible();
});

test('EDO: data portal lists sourced indicators', async ({ page }) => {
  await page.goto('/edo/data/');
  const rows = page.locator('table:has(caption:text("All published indicators")) tbody tr');
  expect(await rows.count()).toBeGreaterThan(30);
  expect(await rows.locator('a').count()).toBe(await rows.count());
});

/* ─────────────── Accessibility (axe, WCAG 2.1 AA) ─────────────── */
for (const path of ['/', '/hotels/', '/listing/10%3a19-coffee/4484/', '/event/16th-annual-arizona-balloon-classic/8751/', '/plan-your-visit/weather/', '/trip-planner/', '/contact/', '/edo/', '/edo/properties/', '/edo/data/', '/admin/login/']) {
  test(`a11y (axe WCAG 2.1 AA): ${path}`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.querySelectorAll('[data-reveal]').forEach((e) => e.classList.add('is-visible')));
    await page.waitForTimeout(1300);
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).exclude('.leaflet-container').analyze();
    const serious = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    if (serious.length) console.log(path, JSON.stringify(serious.map((v) => ({ id: v.id, n: v.nodes.length, t: v.nodes[0]?.target })), null, 0));
    expect(serious.map((v) => v.id)).toEqual([]);
  });
}

test('keyboard: skip link and mega-menu open on focus, close on Escape', async ({ page }) => {
  await page.goto('/hotels/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  const hotels = page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Hotels' });
  await hotels.focus();
  await expect(hotels).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(hotels).toHaveAttribute('aria-expanded', 'false');
});

/* ─────────────── Mobile ─────────────── */
test('@mobile navigation drawer, hero search and directory work on phones', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Menu' }).getByText('Restaurants', { exact: true }).click();
  await page.getByRole('dialog', { name: 'Menu' }).getByRole('link', { name: 'All Restaurants' }).click();
  await expect(page).toHaveURL(/\/restaurants\//);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, 'no horizontal page scroll').toBeLessThanOrEqual(1);
});

/* ─────────────── Saved collections ─────────────── */
test('saved places: save two items, share the list, recipient copies it into their own saved list', async ({ page, browser }) => {
  await page.goto('/listing/10%3a19-coffee/4484/');
  await page.getByRole('button', { name: 'Save to trip' }).click();
  await page.goto('/event/16th-annual-arizona-balloon-classic/8751/');
  await page.getByRole('button', { name: 'Save to trip' }).click();
  await page.getByRole('link', { name: /Saved places \(2 saved\)/ }).click();
  await expect(page).toHaveURL(/\/saved\//);
  await page.getByLabel('List name').fill('QA weekend list');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Share this list' }).click();
  const link = page.locator('a[href*="/collections/"]');
  await expect(link).toBeVisible();
  const url = (await link.getAttribute('href'))!;
  const other = await browser.newContext(); const p2 = await other.newPage();       // a different visitor
  await p2.goto(url);
  await expect(p2.getByRole('heading', { level: 1 })).toContainText('QA weekend list');
  await expect(p2.getByRole('link', { name: '10:19 Coffee' }).first()).toBeVisible();
  await expect(p2.getByText('16th Annual Arizona Balloon Classic').first()).toBeVisible();
  await p2.getByRole('button', { name: 'Save all to my list' }).click();
  await p2.goto('/saved/');
  await expect(p2.getByText('2 saved places')).toBeVisible();
  await other.close();
});

test('collections API rejects unpublished or unknown records', async ({ request }) => {
  const r = await request.post('/api/collections/', { data: { title: 'x', items: [{ kind: 'listing', id: 999999999 }] } });
  expect(r.status()).toBe(422);
});

test('EDO events: upcoming, ongoing and past sections with sourced detail pages', async ({ page }) => {
  await page.goto('/edo/events/');
  await expect(page.getByRole('heading', { name: 'Ongoing programs' })).toBeVisible();
  await expect(page.getByText('Chandler Endeavor Venture Innovation Incubator')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Past events' })).toBeVisible();
  await page.getByRole('link', { name: 'Annual Chandler Innovation Fair' }).click();
  await expect(page).toHaveURL(/\/edo\/events\/chandler-innovation-fair\//);
  await expect(page.getByText('Annually in February').first()).toBeVisible();
  await expect(page.getByText(/Source: https:\/\/www\.chandleraz\.gov/)).toBeVisible();
});

test('@mobile no horizontal overflow on key pages (including embedded maps)', async ({ page }) => {
  for (const p of ['/', '/hotels/', '/listing/10%3a19-coffee/4484/', '/plan-your-visit/weather/', '/edo/', '/edo/contact-us/', '/edo/properties/', '/edo/data/', '/saved/']) {
    await page.goto(p, { waitUntil: 'networkidle' });
    const over = await page.evaluate(() => {
      const clipped = (el: Element) => { for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) { const o = getComputedStyle(a).overflowX; if (o !== 'visible') return true; } return false; };
      const rights = [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).position !== 'fixed' && !clipped(e); }).map((e) => e.getBoundingClientRect().right);
      return Math.max(0, ...rights) - window.innerWidth;
    });
    expect(over, `${p} content wider than viewport`).toBeLessThanOrEqual(1);
  }
});
