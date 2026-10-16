import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// The interface in Arabic: right-to-left layout, every interface string translated, no layout overflow.
const PASSWORD = 'Bayyinah!2026';
const ARABIC = /[؀-ۿ]/;

async function useArabic(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: 'bayyinah_locale', value: 'ar', url: baseURL }]);
}

/** Visible interface text that is still English (3+ English words), outside isolated user content and identifiers. */
async function englishLeftovers(page: Page) {
  return page.evaluate(() => {
    const out: string[] = [];
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      const t = (n.textContent ?? '').trim();
      const el = n.parentElement;
      if (!t || !el || el.closest('[dir=ltr],[dir=auto],bdi,code,script,style,textarea,option,[aria-hidden=true],mark')) continue;
      const st = getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden') continue;
      if (/\b[A-Za-z]{2,}\s+[a-z]{2,}\s+[a-z]{2,}\b/.test(t)) out.push(t.slice(0, 140));
    }
    return out;
  });
}

async function crawlArabic(page: Page, start: string[], scope: RegExp, maxPages = 60) {
  const seen = new Set<string>();
  const queue = [...start];
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`${page.url()} PAGEERROR ${e.message}`));
  while (queue.length && seen.size < maxPages) {
    const key = queue.shift()!.split('#')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    const res = await page.goto(key, { waitUntil: 'networkidle' });
    if ((res?.status() ?? 0) >= 400) problems.push(`${res?.status()} ${key}`);
    const html = page.locator('html');
    if ((await html.getAttribute('dir')) !== 'rtl' || (await html.getAttribute('lang')) !== 'ar') problems.push(`NOT RTL ${key}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`OVERFLOW ${overflow}px ${key}`);
    for (const t of await englishLeftovers(page)) problems.push(`ENGLISH ${key}: ${t}`);
    const hrefs = await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href') || ''));
    for (const h of hrefs) {
      const k = h.split('#')[0];
      if (k && !k.startsWith('/api/') && scope.test(k) && !seen.has(k) && !queue.includes(k)) queue.push(k);
    }
  }
  expect(problems).toEqual([]);
  return seen;
}

test('language switch turns the whole page Arabic and right-to-left, and back', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByTestId('language-switch').first().click();
  await page.waitForURL('**/privacy');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('إشعار الخصوصية');
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl'); // remembered
  await page.getByTestId('language-switch').first().click();
  await page.waitForURL((u) => u.pathname === '/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Turn a payment request');
});

test('the language switch never redirects off-site', async ({ request }) => {
  const r = await request.get('/api/locale?set=ar&next=//evil.example', { maxRedirects: 0 });
  expect(r.status()).toBe(303);
  expect(r.headers()['location']).toBe('/');
  expect(r.headers()['set-cookie']).toContain('bayyinah_locale=ar');
});

test('Arabic quick check analyzes an Arabic request', async ({ page, context, baseURL }) => {
  await useArabic(context, baseURL!);
  await page.goto('/');
  await page.getByRole('radio', { name: /تغيير الحساب البنكي/ }).click();
  await page.getByRole('button', { name: 'متابعة' }).click();
  await page.getByRole('button', { name: 'استخدم مثالاً افتراضياً' }).click();
  await expect(page.locator('#qc-text')).toHaveValue(/عاجل/);
  await page.getByRole('button', { name: 'افحص الطلب' }).click();
  await expect(page.getByText('نقاط يجب التحقق منها قبل الدفع')).toBeVisible();
  await expect(page.getByText('تجاوز الإجراءات').first()).toBeVisible();
  await expect(page.getByText('السرية').first()).toBeVisible();
  await expect(page.locator('mark').first()).toBeVisible();
});

test('Arabic demo mode walks a scenario to rejection', async ({ page, context, baseURL }) => {
  await useArabic(context, baseURL!);
  await page.goto('/demo?scenario=urgent-account-change');
  await expect(page.getByText('بيانات توضيحية ونتائج ذكاء اصطناعي محاكاة.')).toBeVisible();
  await page.getByRole('button', { name: 'شغّل التحليل' }).click();
  await page.getByRole('button', { name: 'شغّل وكيل الإعداد' }).click();
  await page.getByRole('button', { name: 'غير مؤكَّد' }).click();
  await page.getByRole('button', { name: 'أرسل للمراجعة' }).click();
  await page.getByRole('radio', { name: 'المراجِع' }).click();
  await expect(page.getByRole('button', { name: 'اعتمد ضمن سير العمل' })).toBeDisabled();
  await page.getByRole('button', { name: 'ارفض' }).click();
  await expect(page.getByText('مغلقة · مرفوضة').first()).toBeVisible();
  expect(await englishLeftovers(page)).toEqual([]);
});

test('server errors come back in Arabic', async ({ page, context, baseURL }) => {
  await useArabic(context, baseURL!);
  await page.goto('/login');
  await page.getByLabel('البريد الإلكتروني للعمل').fill('omar@alwaha.example');
  await page.getByLabel('كلمة المرور').fill('wrong-password-1');
  await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  await expect(page.getByText('البريد الإلكتروني أو كلمة المرور غير صحيحة.')).toBeVisible();
});

test('public pages are fully Arabic, right-to-left and fit the screen', async ({ page, context, baseURL }) => {
  await useArabic(context, baseURL!);
  await crawlArabic(page, ['/', '/demo', '/privacy', '/terms', '/login', '/signup', '/forgot-password'], /^\/(?!app|platform)/);
});

for (const who of ['omar@alwaha.example', 'sara@alwaha.example', 'layla@alwaha.example', 'ops@bayyinah.example']) {
  test(`signed-in pages are fully Arabic for ${who}`, async ({ page, context, baseURL }) => {
    test.setTimeout(300_000);
    await useArabic(context, baseURL!);
    const r = await page.request.post('/api/auth/login', { data: { email: who, password: PASSWORD } });
    expect(r.ok()).toBe(true);
    const seen = await crawlArabic(page, [who.startsWith('ops') ? '/platform' : '/app'], /^\/(app|platform)/, 45);
    expect(seen.size).toBeGreaterThan(2);
  });
}

test('Arabic layout fits a phone screen', async ({ page, context, baseURL }) => {
  await useArabic(context, baseURL!);
  await page.setViewportSize({ width: 390, height: 844 });
  const fits = async (p: string) => {
    await page.goto(p, { waitUntil: 'networkidle' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), p).toBeLessThanOrEqual(1);
  };
  for (const p of ['/', '/demo', '/login', '/workflow']) await fits(p);
  const r = await page.request.post('/api/auth/login', { data: { email: 'omar@alwaha.example', password: PASSWORD } });
  expect(r.ok()).toBe(true);
  await page.goto('/app', { waitUntil: 'networkidle' });
  const org = new URL(page.url()).pathname.split('/').slice(0, 3).join('/');
  await fits(`${org}/prepare`);
  await page.goto(`${org}/prepare`);
  const casePath = await page.locator('a[href*="/cases/"]').last().getAttribute('href');
  await fits(casePath!);
});
