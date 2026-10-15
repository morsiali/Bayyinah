import { test, expect } from '@playwright/test';

// A preparer works a case end to end in the Arabic interface: every server-written message must arrive in Arabic.
const run = Date.now().toString(36);
const PW = 'E2e-Password-2026';
const ARABIC = /[؀-ۿ]/;
const REQUEST = `من: accounts@gulf-supplies-co.example
الموضوع: عاجل - تحديث البيانات البنكية
نود إبلاغكم بتغيير الحساب البنكي لدينا. يرجى تحويل قيمة الفاتورة INV-2026-0412 إلى حساب بنكي جديد فوراً.
المبلغ: 18,750.00 درهم
اسم المستفيد: Gulf Supplies Co.
IBAN: AE91 0337 7777 7777 7777 777
يرجى التحويل بدون التحقق المعتاد. نرجو التعامل مع الأمر بسرية.`;

test('an Arabic-speaking preparer prepares a bank account change case', async ({ page, context, baseURL }) => {
  test.setTimeout(240_000);
  await context.addCookies([{ name: 'bayyinah_locale', value: 'ar', url: baseURL! }]);

  await page.goto('/signup');
  await page.getByLabel('الاسم الكامل').fill('مريم المُعِدّة');
  await page.getByLabel('البريد الإلكتروني للعمل').fill(`mariam-${run}@e2e.example`);
  await page.getByLabel('كلمة المرور').fill(PW);
  await page.getByRole('button', { name: 'إنشاء الحساب' }).click();
  await expect(page.getByRole('heading', { name: 'أعِدّ مؤسستك.' })).toBeVisible();
  await page.getByLabel('اسم المؤسسة').fill(`مؤسسة الاختبار ${run}`);
  await page.getByRole('button', { name: 'إنشاء المؤسسة' }).click();
  await page.waitForURL(/\/app\/[^/]+\/admin$/);
  const org = new URL(page.url()).pathname.replace(/\/admin$/, '');

  // Supplier reference, with a server-side validation error in Arabic first.
  await page.goto(`${org}/admin/suppliers`);
  await page.getByLabel('اسم المورّد').fill('Gulf Supplies Co.');
  await page.getByLabel('الآيبان المرجعي').fill('AE00 1234');
  await page.getByRole('button', { name: 'أنشئ السجل المرجعي للمورّد' }).click();
  await expect(page.getByText(/الآيبان المرجعي (لا يملك بنية الآيبان|يتكون من|لا يجتاز)/)).toBeVisible();
  await page.getByLabel('الآيبان المرجعي').fill('AE420260001015333439101');
  await page.getByLabel('اسم المستفيد المتوقع').fill('Gulf Supplies Co. LLC');
  await page.getByLabel('البريد المسجّل سابقاً').fill('finance@gulfsupplies.example');
  await page.getByLabel('الهاتف المسجّل سابقاً').fill('+971 4 555 0202');
  await page.getByRole('button', { name: 'أنشئ السجل المرجعي للمورّد' }).click();
  await page.waitForURL(/\/admin\/suppliers\/[^/]+$/);
  await page.getByRole('button', { name: 'علِّم السجل كمُراجَع' }).click();
  await expect(page.getByText(/بيانات مرجعية راجعتها الجهة — بواسطة/)).toBeVisible();

  // The organization's creator holds every role, so they can prepare this case.
  await page.goto(`${org}/prepare/new`);
  await page.getByLabel('المورّد').selectOption({ label: 'Gulf Supplies Co.' });
  await page.getByRole('radio', { name: /تغيير الحساب البنكي/ }).click();
  await page.getByRole('button', { name: 'إنشاء الحالة' }).click();
  await page.waitForURL(/\/cases\/[^/]+$/);

  await page.getByLabel('نص الطلب').fill(REQUEST);
  await page.getByRole('button', { name: 'احفظ المصدر' }).click();
  await expect(page.getByText('تمت إضافة المصدر')).toBeVisible();
  await page.getByRole('button', { name: 'شغّل التحليل' }).click();
  await expect(page.getByText('اكتمل التحليل')).toBeVisible();
  await page.getByRole('button', { name: 'شغّل وكيل الإعداد' }).click();
  await expect(page.getByText('أنهى وكيل الإعداد عمله')).toBeVisible();
  await page.reload();

  // Readiness, findings, the task and the agent summary are all server-written and must be Arabic.
  const passport = page.locator('main');
  await expect(passport.getByText('تسجيل التحقق المستقل').first()).toBeVisible();
  await expect(passport.getByText('التحقق المستقل مطلوب.').first()).toBeVisible();
  await expect(passport.getByText(/تجاوز إجراء التحقق المعتاد/).first()).toBeVisible();
  await expect(passport.getByText('اتصل بالمورّد على رقم الهاتف المرجعي').first()).toBeVisible();
  await expect(passport.getByText(/^التحقق المستقل: سُجّلت 0 من 1 مهام\.$|^متبقٍ:/).first()).toBeVisible();
  const summary = await page.locator('section', { hasText: 'الطلب' }).first().innerText();
  expect(summary).toMatch(ARABIC);

  // Recording the outcome in Arabic.
  await page.getByRole('link', { name: 'سجّل نتيجة التحقق' }).first().click();
  await page.getByRole('radio', { name: 'غير مؤكَّد' }).click();
  await page.getByLabel(/^الملاحظات/).fill('تحدثت مع قسم المالية على الرقم المرجعي ولم يطلبوا أي تغيير.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'سجّل النتيجة' }).click();
  await page.waitForURL(/\/cases\/[^/]+$/);
  await expect(page.getByText('سجّل مريم المُعِدّة نتيجة التحقق').first()).toBeVisible();
});
