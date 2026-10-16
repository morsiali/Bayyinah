import { test, expect } from '@playwright/test';

// SMS intake end to end: an admin creates the address, a phone forwards a text to it, the text
// waits in the inbox, and a preparer turns it into a case whose first source is the SMS.
const run = Date.now().toString(36);
const PW = 'E2e-Password-2026';
const TEXT = 'Gulf Supplies: our bank account has changed. Pay INV-2026-0412 AED 18,750.00 to the new IBAN AE91 0337 7777 7777 7777 777 today. Do not call.';

test.describe.configure({ mode: 'serial' });

test('a forwarded SMS lands in the inbox first and becomes a case', async ({ page, request }) => {
  test.setTimeout(240_000);
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Sami Admin');
  await page.getByLabel('Work email').fill(`sami-${run}@e2e.example`);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.getByLabel('Organization name').fill(`SMS Trading ${run}`);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await page.waitForURL(/\/app\/[^/]+\/admin$/);
  const org = new URL(page.url()).pathname.replace(/\/admin$/, '');

  // Supplier reference with the phone number the text will come from.
  await page.goto(`${org}/admin/suppliers`);
  await page.getByLabel('Supplier name').fill('Gulf Supplies Co.');
  await page.getByLabel('Reference IBAN').fill('AE420260001015333439101');
  await page.getByLabel('Expected beneficiary name').fill('Gulf Supplies Co. LLC');
  await page.getByLabel('Previously recorded phone').fill('+971 4 555 0202');
  await page.getByRole('button', { name: 'Create supplier reference' }).click();
  await page.waitForURL(/\/admin\/suppliers\/[^/]+$/);

  // The inbox explains that SMS is not set up yet.
  await page.goto(`${org}/inbox`);
  await expect(page.getByText('SMS intake is not set up yet')).toBeVisible();
  await page.getByRole('link', { name: 'Set up SMS intake' }).click();
  await page.waitForURL(/\/admin\/sms$/);
  await expect(page.getByTestId('sms-status')).toHaveText('Off');
  await page.getByTestId('sms-create-address').click();
  const address = (await page.getByTestId('sms-address').innerText()).trim();
  expect(address).toMatch(/\/api\/sms\/inbound\/[\w-]{40,}$/);
  await expect(page.getByTestId('sms-status')).toHaveText('On');

  // An Android forwarder posts the text, twice (a retry): it is stored once.
  const path = new URL(address).pathname;
  for (let i = 0; i < 2; i++) {
    const r = await request.post(path, { data: { from: '04 555 0202', text: TEXT, id: `e2e-${run}` } });
    expect(r.status()).toBe(200);
  }
  expect((await request.post(path, { data: { text: 'missing sender' } })).status()).toBe(400);

  // The tab counts it; the inbox shows it with indicators and a supplier suggestion that is not verification.
  await page.goto(`${org}/inbox`);
  await expect(page.getByTestId('tab-inbox').first()).toContainText('1');
  const card = page.getByTestId('sms-message');
  await expect(card).toHaveCount(1);
  await expect(card.getByTestId('sms-body')).toHaveText(TEXT);
  await expect(card.getByText('Looks like: Bank account change')).toBeVisible();
  await expect(card.getByText(/Sender number matches the recorded phone of .Gulf Supplies Co\../)).toBeVisible();
  await expect(card.getByText(/a sender number can be forged/)).toBeVisible();
  await expect(card.getByLabel('Language indicators')).toContainText('urgency');

  // One click to a case: supplier and type are prefilled from the message.
  await card.getByTestId('sms-open-case').click();
  await expect(card.getByLabel('Supplier')).toHaveValue(/.+/);
  await expect(card.getByLabel('Request type')).toHaveValue('BANK_ACCOUNT_CHANGE');
  await card.getByTestId('sms-create-case').click();
  await page.waitForURL(/\/cases\/[^/]+$/);
  await expect(page.getByText('SMS from 045550202').first()).toBeVisible();
  await expect(page.getByText(TEXT).first()).toBeVisible();

  // The message moved to Handled, linked to its case.
  await page.goto(`${org}/inbox?view=handled`);
  await expect(page.getByTestId('sms-message')).toContainText('Case created');
  await expect(page.getByTestId('sms-message').getByRole('link', { name: /BAY-/ })).toBeVisible();

  // A test SMS from the admin page, then dismissed with a reason.
  await page.goto(`${org}/admin/sms`);
  await page.getByLabel('Sender number').fill('+971 50 000 1111');
  await page.getByLabel('Message text').fill('Happy Eid from all of us!');
  await page.getByTestId('sms-send-test').click();
  await expect(page.getByText('Test SMS delivered to the inbox')).toBeVisible();
  await page.goto(`${org}/inbox`);
  const test1 = page.getByTestId('sms-message').filter({ hasText: 'Happy Eid' });
  await expect(test1).toContainText('Test message');
  await expect(test1).toContainText('The sender number is not a phone you hold for any supplier.');
  await test1.getByRole('button', { name: 'Dismiss' }).click();
  await test1.getByLabel('Why does this message need no case?').fill('Personal greeting');
  await test1.getByRole('button', { name: 'Dismiss message' }).click();
  await expect(page.getByText('No new messages')).toBeVisible();

  // The same inbox in Arabic.
  await page.context().addCookies([{ name: 'bayyinah_locale', value: 'ar', url: page.url() }]);
  await page.goto(`${org}/inbox?view=handled`);
  await expect(page.getByRole('heading', { name: 'وارد الرسائل النصية' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByText('مستبعدة').first()).toBeVisible();
  await expect(page.getByText('تعامل مع كل رسالة على أنها غير موثّقة.')).toBeVisible();
});
