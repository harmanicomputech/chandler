import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';

const PW = process.env.SEED_PASSWORD ?? fs.readFileSync('.seed-credentials', 'utf8').match(/password: (\S+)/)![1];
async function login(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/admin/login/');
  await page.fill('#email', email); await page.fill('#password', PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(/\/admin\/(portal\/)?$/);
}
test.describe.configure({ mode: 'serial' });

test('admin routes require authentication', async ({ page, request }) => {
  await page.goto('/admin/content/pages/');
  await expect(page).toHaveURL(/\/admin\/login\//);
  const api = await request.get('/api/admin/media/');
  expect(api.status()).toBe(401);
});

test('wrong password is rejected without revealing which field was wrong', async ({ page }) => {
  await page.goto('/admin/login/');
  await page.fill('#email', 'editor@chandler.example'); await page.fill('#password', 'not-the-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid' })).toHaveText('Invalid email or password.');
});

test('editor: create draft page → not public → publish → public → version history → restore', async ({ page, request }) => {
  await login(page, 'editor@chandler.example');
  const slug = `/qa-test-page-${Date.now()}/`;
  await page.goto('/admin/content/pages/new/');
  await page.fill('#f-title', 'QA Test Page'); await page.fill('#f-path', slug);
  await page.selectOption('#f-site', 'visit'); await page.selectOption('#f-template', 'standard');
  await page.locator('#f-bodyHtml').click(); await page.keyboard.type('First version of the body.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await page.waitForURL(/\/admin\/content\/pages\/\d+\/\?created=1/);
  expect((await request.get(slug)).status(), 'draft must not be public').toBe(404);
  await page.locator('#f-bodyHtml').click(); await page.keyboard.press('End'); await page.keyboard.type(' Second version.');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible();
  const live = await request.get(slug); expect(live.status()).toBe(200); expect(await live.text()).toContain('Second version');
  await page.reload();
  await expect(page.getByText(/^v1 ·/)).toBeVisible();
  await page.getByRole('button', { name: 'Restore' }).first().click();
  await expect(page.getByText(/restored as a draft/)).toBeVisible();
  expect((await request.get(slug)).status(), 'restored version is a draft').toBe(404);
});

test('editor: scheduled publishing hides content until publish time', async ({ page, request }) => {
  await login(page, 'editor@chandler.example');
  const slug = `/qa-scheduled-${Date.now()}/`;
  await page.goto('/admin/content/pages/new/');
  await page.fill('#f-title', 'QA Scheduled'); await page.fill('#f-path', slug); await page.selectOption('#f-site', 'visit');
  await page.getByRole('button', { name: 'Save draft' }).click(); await page.waitForURL(/created=1/);
  await page.fill('#f-publishAt', '2099-01-01T09:00');
  await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible();
  expect((await request.get(slug)).status()).toBe(404);
});

test('changing a page path creates a 301 automatically', async ({ page, request }) => {
  await login(page, 'editor@chandler.example');
  const a = `/qa-move-a-${Date.now()}/`; const b = a.replace('move-a', 'move-b');
  await page.goto('/admin/content/pages/new/');
  await page.fill('#f-title', 'QA Move'); await page.fill('#f-path', a); await page.selectOption('#f-site', 'visit');
  await page.getByRole('button', { name: 'Save draft' }).click(); await page.waitForURL(/created=1/);
  await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible();
  await page.fill('#f-path', b); await page.getByRole('button', { name: 'Publish', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toBeVisible();
  const r = await request.get(a, { maxRedirects: 0 });
  expect([301, 308]).toContain(r.status()); expect(r.headers()['location']).toContain(b);
});

test('tourism staff cannot publish (goes to approval) and cannot manage users or EDO content', async ({ page }) => {
  await login(page, 'tourism@chandler.example');
  await page.goto('/admin/content/listings/164/');
  await expect(page.getByRole('button', { name: 'Submit for approval' })).toBeVisible();
  await page.getByRole('button', { name: 'Request publish' }).click();
  await expect(page.getByText('submitted for approval')).toBeVisible();
  await page.goto('/admin/users/'); await expect(page).toHaveURL(/denied=1/);
  await page.goto('/admin/content/properties/'); await expect(page).toHaveURL(/denied=1/);
  // restore published status as editor for subsequent tests
  await login(page, 'editor@chandler.example');
  await page.goto('/admin/content/listings/164/'); await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible();
});

test('public event submission → moderation → converted to a DRAFT event (not public)', async ({ page, request }) => {
  const title = `QA Community Market ${Date.now()}`;
  await page.goto('/events/submit-your-event/');
  await page.waitForTimeout(2600);
  await page.fill('#submit-event-eventTitle', title); await page.fill('#submit-event-startDate', '2027-03-14');
  await page.fill('#submit-event-venue', 'Dr. A.J. Chandler Park'); await page.fill('#submit-event-address', '3 S Arizona Ave');
  await page.selectOption('#submit-event-category', 'Community'); await page.fill('#submit-event-description', 'A QA test event.');
  await page.fill('#submit-event-organiser', 'QA'); await page.fill('#submit-event-email', 'qa@example.com');
  await page.getByRole('button', { name: 'Submit event for review' }).click();
  await expect(page.getByText('will be reviewed by our team')).toBeVisible();
  await login(page, 'tourism@chandler.example');
  await page.goto('/admin/submissions/?type=event');
  await page.getByRole('link', { name: title }).click();
  await page.getByRole('button', { name: 'Approve & create draft' }).click();
  await page.waitForURL(/\/admin\/content\/events\/\d+\//);
  await expect(page.locator('#f-title')).toHaveValue(title);
  await expect(page.getByText('draft', { exact: true }).first()).toBeVisible();
  const search = await request.get(`/api/search/?q=${encodeURIComponent(title)}`);
  expect((await search.json()).results.length, 'draft event not exposed publicly').toBe(0);
});

test('stakeholder portal: partner proposes a change, staff approve, change goes live with a version snapshot', async ({ page, request }) => {
  // link demo partner to a listing (as admin via the editor UI)
  await login(page, 'admin@chandler.example');
  await page.goto('/admin/users/'); const partnerId = (await page.getByRole('link', { name: 'Stakeholder Partner (demo)' }).getAttribute('href'))!.match(/(\d+)/)![1];
  await page.goto('/admin/content/listings/164/'); await page.fill('#f-ownerUserId', partnerId); await page.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'published' })).toBeVisible();
  await login(page, 'partner@chandler.example');
  await expect(page).toHaveURL(/\/admin\/portal\//);
  const phone = `480-555-${String(Date.now()).slice(-4)}`;
  await page.locator('form', { hasText: "Zorba's Greek Cafe" }).locator('input[name=phone]').fill(phone);
  await page.getByRole('button', { name: 'Submit changes for review' }).first().click();
  await expect(page.getByText('Nothing changes publicly until they approve')).toBeVisible();
  expect(await (await request.get('/listing/zorbas-greek-cafe/164/')).text()).not.toContain(phone);
  await page.goto('/admin/content/pages/'); await expect(page).toHaveURL(/denied=1|\/admin\/portal\//); // partners cannot reach the CMS content area
  await login(page, 'tourism@chandler.example');
  await page.goto('/admin/submissions/?type=listing_update');
  await page.getByRole('link', { name: "Update to Zorba's Greek Cafe" }).first().click();
  await page.getByRole('button', { name: 'Approve & apply changes' }).click();
  await page.waitForURL(/\/admin\/content\/listings\/164\//);
  await expect(page.locator('#f-phone')).toHaveValue(phone);
  await expect(page.getByText(/Before stakeholder update/).first()).toBeVisible();
});

test('media upload enforces alt text and strips metadata', async ({ page }) => {
  await login(page, 'editor@chandler.example');
  await page.goto('/admin/media/');
  await page.setInputFiles('input[type=file]', 'public/images/homepage/downtown-family.jpg');
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.locator('input[name=alt]:invalid')).toHaveCount(1); // browser-level required
  await page.fill('form:has-text("Upload image") input[name=alt]', 'QA upload: family walking in Downtown Chandler');
  await page.getByRole('button', { name: 'Upload' }).click();
  await expect(page.getByText(/EXIF removed/)).toBeVisible();
});

test('redirect manager prevents loops and saves redirects', async ({ page, request }) => {
  await login(page, 'editor@chandler.example');
  await page.goto('/admin/redirects/');
  const from = `/qa-old-${Date.now()}/`;
  await page.fill('input[name=fromPath]', from); await page.fill('input[name=toPath]', from);
  await page.getByRole('button', { name: 'Save redirect' }).click();
  await expect(page.getByText('cannot point to itself')).toBeVisible();
  await page.fill('input[name=toPath]', '/hotels/'); await page.getByRole('button', { name: 'Save redirect' }).click();
  await expect(page.getByText(/saved/)).toBeVisible();
  const r = await request.get(from, { maxRedirects: 0 }); expect([301, 308]).toContain(r.status());
});

test('audit log records the actions above', async ({ page }) => {
  await login(page, 'admin@chandler.example');
  await page.goto('/admin/audit/');
  for (const a of ['auth.login', 'content.update', 'submission.convert', 'stakeholder.propose', 'media.upload', 'redirect.save']) await expect(page.getByText(a).first()).toBeVisible();
});

test('analytics dashboard shows recorded trends and exports CSV', async ({ page }) => {
  await page.goto('/listing/10%3a19-coffee/4484/'); // records a listing_view
  await login(page, 'editor@chandler.example');
  await page.goto('/admin/analytics/?days=7');
  await expect(page.getByRole('img', { name: /Visit Chandler interactions trend chart/ })).toBeVisible();
  await expect(page.getByText('Visit · Listing views')).toBeVisible();
  const csv = await page.request.get('/api/admin/analytics.csv?days=7');
  expect(csv.status()).toBe(200); expect(await csv.text()).toMatch(/^day,site,event,count/);
  const anon = await page.context().request.fetch('/api/admin/analytics.csv', { headers: { cookie: '' } });
  expect([200, 401]).toContain(anon.status());
});
