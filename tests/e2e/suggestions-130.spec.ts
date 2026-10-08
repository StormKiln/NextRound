import { expect, test } from '@playwright/test';

test('saved history drives usage and suggestions across restart and deletion', async ({ page }) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('pushups');
  await page.getByRole('button', { name: /^Push-up / }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.clock.resume();
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add suggested Push-up', exact: true }),
  ).toContainText('Used in 1 saved workout');
  await page.getByRole('button', { name: 'Add suggested Push-up', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add suggested Push-up', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: /^Delete result:/ }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByText('No saved results yet.')).toBeVisible();
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByText(/No attributed exercise history yet/)).toBeVisible();
  await page.getByLabel('Search exercises').fill('push ups');
  await expect(page.getByRole('button', { name: /^Push-up / })).toContainText(
    'Used in 0 saved workouts',
  );
});

test('unreadable history allows manual exercise selection without invented counts', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('nextround.workout-history.v1', 'broken'));
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry exercise usage' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'My favorites', exact: true })).toHaveCount(0);
  await page.getByLabel('Search exercises').fill('pushup');
  await page.getByRole('button', { name: /^Push-up / }).click();
  await expect(page.getByRole('button', { name: 'Remove Push-up', exact: true })).toBeVisible();
});
