import { test, expect, type Page } from '@playwright/test';

const PASSWORD = 'Bayyinah!2026';

async function crawl(page: Page, start: string[], label: string, maxPages = 80) {
  const seen = new Set<string>();
  const queue = [...start];
  const problems: string[] = [];
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`${page.url()} :: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`${page.url()} :: PAGEERROR ${e.message}`));
  while (queue.length && seen.size < maxPages) {
    const url = queue.shift()!;
    const key = url.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const res = await page.goto(key, { waitUntil: 'networkidle' });
    const status = res?.status() ?? 0;
    if (status >= 400) problems.push(`${status} ${key}`);
    const text = (await page.locator('body').innerText()).trim();
    if (text.length < 120) problems.push(`BLANK ${key} (${text.length} chars)`);
    if (/Application error|Unhandled Runtime Error|This page could not load/.test(text)) problems.push(`ERROR PAGE ${key}`);
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => (a as HTMLAnchorElement).getAttribute('href') || ''));
    for (const h of hrefs) {
      if (!h.startsWith('/') || h.startsWith('//')) continue;
      if (h.startsWith('/api/')) {
        // Download links: verify they respond, without navigating.
        const r = await page.request.get(h);
        if (r.status() >= 400) problems.push(`${r.status()} ${h} (download)`);
        continue;
      }
      const k = h.split('#')[0] || '/';
      if (!seen.has(k) && !queue.includes(k)) queue.push(k);
    }
  }
  console.log(`[${label}] crawled ${seen.size} pages`);
  expect(problems, `${label} problems`).toEqual([]);
  expect(errors, `${label} console errors`).toEqual([]);
  return seen;
}

async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

test('public site has no broken links, blank pages or console errors', async ({ page }) => {
  const seen = await crawl(page, ['/', '/demo', '/privacy', '/terms', '/login', '/signup', '/forgot-password', '/this-page-does-not-exist-404'].slice(0, 7), 'public');
  for (const p of ['/', '/demo', '/privacy', '/terms', '/login', '/signup', '/forgot-password']) expect(seen.has(p)).toBe(true);
  const nf = await page.goto('/definitely-missing');
  expect(nf?.status()).toBe(404);
  await expect(page.getByText('This page has no evidence.')).toBeVisible();
});

for (const who of ['omar@alwaha.example', 'sara@alwaha.example', 'layla@alwaha.example', 'hana@desertrose.example', 'ops@bayyinah.example']) {
  test(`workspace crawl as ${who}`, async ({ page }) => {
    await login(page, who);
    await crawl(page, [new URL(page.url()).pathname, '/app'], who);
  });
}

test('protected routes redirect anonymous visitors to sign-in', async ({ page }) => {
  await page.goto('/app');
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
  await page.goto('/platform');
  await expect(page).toHaveURL(/\/login\?next=%2Fplatform/);
  const api = await page.request.post('/api/orgs', { data: { name: 'x' } });
  expect(api.status()).toBe(401);
});
