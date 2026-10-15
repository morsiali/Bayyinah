import { test, expect, type Page } from '@playwright/test';

const PW = 'E2e-Password-2026';
const run = Date.now().toString(36);
const A = { name: 'Amal Preparer', email: `amal-${run}@e2e.example` };
const B = { name: 'Bilal Reviewer', email: `bilal-${run}@e2e.example` };
const C = { name: 'Chen Outsider', email: `chen-${run}@e2e.example` };
const ORG = `E2E Trading ${run}`;
const REF_IBAN = 'AE420260001015333439101';
const NEW_IBAN = 'AE910337777777777777777';
const REQUEST = `From: Accounts <accounts@gulf-supplies-co.example>
Subject: URGENT - updated bank details
Dear Finance Team,
Please note our bank details have changed. Kindly pay invoice INV-2026-0412 for AED 18,750.00 into our new account immediately.
Beneficiary Name: Gulf Supplies Co.
IBAN: ${NEW_IBAN}
Please skip the usual verification call, our phone lines are down. Keep this confidential.`;

test.describe.configure({ mode: 'serial' });

async function register(page: Page, u: { name: string; email: string }, path = '/signup') {
  await page.goto(path);
  await page.getByLabel('Full name').fill(u.name);
  await page.getByLabel('Work email').fill(u.email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/signup'));
}
async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await page.waitForURL((u) => u.pathname === '/');
}
async function signIn(page: Page, email: string, next?: string) {
  await page.goto(next ? `/login?next=${encodeURIComponent(next)}` : '/login');
  await page.getByLabel('Work email').fill(email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/login'));
}

let orgPath = '';
let casePath = '';
let inviteLink = '';

test('A registers, creates an organization, a supplier and invites B', async ({ page }) => {
  await register(page, A);
  await expect(page.getByRole('heading', { name: 'Set up your organization.' })).toBeVisible();
  await page.getByLabel('Organization name').fill(ORG);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await page.waitForURL(/\/app\/[^/]+\/admin$/);
  orgPath = new URL(page.url()).pathname.replace(/\/admin$/, '');

  await page.goto(`${orgPath}/admin/suppliers`);
  await page.getByLabel('Supplier name').fill('Gulf Supplies Co.');
  await page.getByLabel('Expected beneficiary name').fill('Gulf Supplies Co. LLC');
  await page.getByLabel('Reference IBAN').fill(REF_IBAN);
  await page.getByLabel('Previously recorded email').fill('finance@gulfsupplies.example');
  await page.getByLabel('Previously recorded phone').fill('+971 4 555 0202');
  await page.getByLabel('Source of this reference information').fill('Signed supplier agreement 2025');
  await page.getByRole('button', { name: 'Create supplier reference' }).click();
  await page.waitForURL(/\/admin\/suppliers\/[^/]+$/);
  await page.getByRole('button', { name: 'Mark reference as reviewed' }).click();
  await expect(page.getByText('Reference information reviewed by the business — by')).toBeVisible();

  await page.goto(`${orgPath}/admin/members`);
  await page.getByLabel('Email address').fill(B.email);
  await page.getByText('Preparer', { exact: true }).last().click(); // untick default Preparer
  await page.getByText('Reviewer', { exact: true }).last().click();
  await page.getByRole('button', { name: 'Create invitation link' }).click();
  const link = page.locator('span.font-mono', { hasText: '/invite/' });
  await expect(link).toBeVisible();
  inviteLink = new URL((await link.innerText()).trim()).pathname;
  await signOut(page);
});

test('B accepts the invitation as a Reviewer', async ({ page }) => {
  await page.goto(inviteLink);
  await expect(page.getByText(`Join ${ORG}.`).first()).toBeVisible();
  await page.getByRole('link', { name: 'Create an account to accept' }).click();
  await page.getByLabel('Full name').fill(B.name);
  await expect(page.getByLabel('Work email')).toHaveValue(B.email);
  await page.getByLabel('Password').fill(PW);
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL((u) => u.pathname === inviteLink);
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await page.waitForURL(/\/review$/);
  await expect(page.getByRole('heading', { name: 'Review cases' })).toBeVisible();
  // B has no preparer or admin workspace.
  await expect(page.getByRole('link', { name: 'Prepare cases' })).toHaveCount(0);
  const res = await page.goto(`${orgPath}/admin/members`);
  expect(res?.status()).toBe(200);
  await expect(page.getByText('You don’t have access to this workspace')).toBeVisible();
  await signOut(page);
});

test('A prepares a bank account change case end to end', async ({ page }) => {
  test.setTimeout(240_000);
  await signIn(page, A.email);
  await page.goto(`${orgPath}/prepare/new`);
  await page.getByLabel('Supplier').selectOption({ label: 'Gulf Supplies Co.' });
  await page.getByRole('radio', { name: /Bank account change/ }).click();
  await page.getByRole('button', { name: 'Create case' }).click();
  await page.waitForURL(/\/cases\/[^/]+$/);
  casePath = new URL(page.url()).pathname;

  await page.getByLabel('Request text').fill(REQUEST);
  await page.getByRole('button', { name: 'Save source' }).click();
  await expect(page.getByRole('button', { name: 'Run analysis' })).toBeVisible({ timeout: 15_000 });

  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.getByText(/Business rule R-INDEPENDENT-VERIFICATION/).first()).toBeVisible({ timeout: 150_000 });

  await page.getByRole('button', { name: 'Run preparation agent' }).click();
  await expect(page.getByText('Create verification task').first()).toBeVisible({ timeout: 60_000 });

  // Submission is blocked until verification is recorded.
  const blocked = await page.request.post(`/api${casePath.replace('/app', '/orgs')}/submit`, { data: { expectedRevision: 999 } });
  expect(blocked.status()).toBe(422);

  await page.getByRole('link', { name: 'Record verification outcome' }).click();
  await page.getByRole('radio', { name: 'Confirmed by supplier' }).click();
  await page.getByLabel('Notes — optional').fill('Spoke with Rashid on the reference number; change confirmed with letter.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Record outcome' }).click();
  await page.waitForURL((u) => u.pathname === casePath);
  await expect(page.getByText(/Verification outcome recorded by Amal Preparer/).first()).toBeVisible();

  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByText('Ready for review').first()).toBeVisible({ timeout: 15_000 });
  // A cannot decide its own case, even via the API.
  const self = await page.request.post(`/api${casePath.replace('/app', '/orgs')}/decision`, { data: { decision: 'APPROVED', rationale: 'Approving my own case should fail.', expectedRevision: 1, caseInputVersionId: 'x' } });
  expect([403, 409]).toContain(self.status());
  await signOut(page);
});

test('B reviews and approves; the decision persists and the report renders', async ({ page }) => {
  await signIn(page, B.email);
  await page.goto(`${orgPath}/review`);
  await page.getByRole('link', { name: /Gulf Supplies Co\./ }).first().click();
  await page.waitForURL((u) => u.pathname === casePath);
  await page.getByLabel('Rationale').fill('Supplier confirmed the account change through the reference phone number.');
  await page.getByRole('button', { name: 'Approve within workflow' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  // Wait for the persisted state, not the transient toast (it can vanish during the refresh).
  await expect(page.getByText('Closed · approved').first()).toBeVisible({ timeout: 15_000 });
  await page.reload();
  await expect(page.getByText('Closed · approved').first()).toBeVisible();
  await expect(page.getByText('An authorized reviewer recorded approval within this workflow.').first()).toBeVisible();
  await page.goto(`${casePath}/report`);
  await expect(page.getByRole('heading', { name: 'Decision report' })).toBeVisible();
  await expect(page.getByText('Bilal Reviewer').first()).toBeVisible();
  await expect(page.getByText('LIVE MODE')).toBeVisible();
  await signOut(page);
});

test('A sees the audit history', async ({ page }) => {
  await signIn(page, A.email);
  await page.goto(`${orgPath}/admin/audit`);
  for (const a of ['review.approved', 'verification.recorded', 'agent.completed', 'analysis.completed', 'invitation.accepted', 'supplier.created']) await expect(page.getByText(a, { exact: true }).first()).toBeVisible();
  await signOut(page);
});

test('a second organization cannot see the first organization’s case', async ({ page }) => {
  await register(page, C);
  await page.getByLabel('Organization name').fill(`Other Org ${run}`);
  await page.getByRole('button', { name: 'Create organization' }).click();
  await page.waitForURL(/\/admin$/);
  const res = await page.goto(casePath);
  expect(res?.status()).toBe(404);
  const api = await page.request.post(`/api${casePath.replace('/app', '/orgs')}/analyze`);
  expect(api.status()).toBe(403);
});
