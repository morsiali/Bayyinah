import { test, expect } from '@playwright/test';

test.use({ viewport: { width: 375, height: 800 } });

async function noOverflow(page: import('@playwright/test').Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  expect(sw, `${path} is ${sw}px wide in a ${iw}px viewport`).toBeLessThanOrEqual(iw);
}

test('public pages fit a phone screen', async ({ page }) => {
  for (const p of ['/', '/demo', '/login', '/signup', '/privacy', '/terms', '/forgot-password']) await noOverflow(page, p);
});

for (const email of ['omar@alwaha.example', 'layla@alwaha.example', 'ops@bayyinah.example']) {
  test(`workspace pages fit a phone screen for ${email}`, async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Work email').fill(email);
    await page.getByLabel('Password').fill('Bayyinah!2026');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL((u) => !u.pathname.startsWith('/login'));
    await page.waitForLoadState('networkidle');
    const start = new URL(page.url()).pathname;
    const links = new Set<string>([start]);
    for (const h of await page.$$eval('main a[href^="/app"], main a[href^="/platform"]', (as) => as.map((a) => a.getAttribute('href')!))) links.add(h.split('#')[0]);
    for (const l of [...links].slice(0, 12)) await noOverflow(page, l);
  });
}
