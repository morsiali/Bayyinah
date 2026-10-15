import { test, expect } from '@playwright/test';

test('quick check analyzes a pasted request in the browser', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('radio', { name: /Bank account change/ }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Use a fictional example' }).click();
  await page.getByRole('button', { name: 'Check request' }).click();
  await expect(page.getByText('Points to verify before paying')).toBeVisible();
  await expect(page.getByText('bypass procedure').first()).toBeVisible();
  await expect(page.locator('mark').first()).toBeVisible();
});

test('demo mode walks a scenario from preparation to rejection', async ({ page }) => {
  await page.goto('/demo?scenario=urgent-account-change');
  await expect(page.getByText('Demonstration data and simulated AI results.')).toBeVisible();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await page.getByRole('button', { name: 'Run preparation agent' }).click();
  await page.getByRole('button', { name: 'Not confirmed' }).click();
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await page.getByRole('radio', { name: 'Reviewer' }).click();
  await expect(page.getByRole('button', { name: 'Approve within workflow' })).toBeDisabled();
  await page.getByRole('button', { name: 'Reject' }).click();
  await expect(page.getByText('Closed · rejected').first()).toBeVisible();
  await page.getByRole('radio', { name: 'Organization admin' }).click();
  await expect(page.getByText(/review decision — rejected/)).toBeVisible();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.getByText('No demo actions yet.')).toBeVisible();
});
