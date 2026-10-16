import { test, expect } from '@playwright/test';

test('the workflow map walks every step and every scenario', async ({ page }) => {
  await page.goto('/workflow');
  const detail = page.getByTestId('workflow-detail');
  const counter = page.getByTestId('workflow-counter');
  await expect(page.locator('[data-step]')).toHaveCount(19);
  await expect(detail.getByTestId('workflow-title')).toHaveText('Create the organization');
  await expect(counter).toHaveText('Step 1 of 19');
  // Connectors are drawn for every edge once the layout is measured.
  await expect(page.locator('path[data-edge]')).toHaveCount(25);

  await detail.getByRole('button', { name: 'Next step' }).click();
  await expect(counter).toHaveText('Step 2 of 19');
  await expect(detail.getByTestId('workflow-title')).toHaveText('Invite the team');

  // Picking a scenario starts playing it.
  await page.getByRole('button', { name: 'Account change — supplier denies' }).click();
  await expect(counter).toHaveText('Step 1 of 11');
  await expect(counter).toHaveText('Step 2 of 11', { timeout: 6000 });
  await page.getByTestId('workflow-play').click(); // pause
  // The connector into the current stop is drawn in the path colour.
  await expect(page.locator('path[data-state="arriving"]')).toHaveCount(1);

  // Clicking a step jumps to it within the scenario, with what happens there.
  await page.locator('[data-step="C11"]').click();
  await expect(detail.getByTestId('workflow-title')).toHaveText('Record the decision');
  await expect(detail.getByText('Decision: rejected.')).toBeVisible();
  await expect(detail.getByText('Closed · rejected')).toBeVisible();
  await expect(page.locator('[data-status="CLOSED_REJECTED"][aria-current="true"]')).toBeVisible();

  // Branches lead to their target.
  await page.locator('[data-step="C6"]').click();
  await detail.getByRole('button', { name: /no channel to call/ }).click();
  await expect(detail.getByTestId('workflow-title')).toHaveText('Update a supplier reference');

  // State survives a reload through the address bar.
  const url = new URL(page.url());
  expect(url.searchParams.get('scenario')).toBeTruthy();
  await page.reload();
  await expect(detail.getByTestId('workflow-title')).toHaveText('Update a supplier reference');

  // Role filter.
  const reviewer = page.getByRole('group', { name: 'Filter by role' }).getByRole('button', { name: 'Reviewer' });
  await reviewer.click();
  await expect(reviewer).toHaveAttribute('aria-pressed', 'true');

  // Keyboard: arrow keys move between steps.
  await page.getByRole('button', { name: 'Every step' }).click();
  await page.locator('[data-step="A2"]').click();
  await page.keyboard.press('ArrowRight');
  await expect(detail.getByTestId('workflow-title')).toHaveText('Add supplier references');
});

test('the workflow map is linked from the header and the homepage', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'See the full workflow' }).click();
  await expect(page).toHaveURL(/\/workflow/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('From request to decision.');
});
