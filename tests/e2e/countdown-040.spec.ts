import { expect, type Page, test } from '@playwright/test';

async function setup(page: Page) {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('10');
  await page.getByLabel('Lead-in seconds').fill('0');
  for (const name of ['Squat', 'Stretch']) {
    await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
    await page.getByLabel('Exercise name').fill(name);
    await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Set target for Squat', exact: true }).click();
  await page.getByLabel('Target amount').fill('5');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
}
test('countdown checks survive pause and visibility changes, never end timer, and reset on repeat', async ({
  page,
}) => {
  await page.clock.install();
  await setup(page);
  await page.getByRole('button', { name: 'Start countdown' }).click();
  const list = page.getByRole('region', { name: 'Workout exercises' });
  await expect(list.getByRole('listitem')).toHaveText(['Squat5 reps', 'Stretch']);
  await page.getByRole('checkbox', { name: 'Complete Squat', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Complete Stretch', exact: true }).check();
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.clock.runFor(3000);
  await expect(page.getByRole('checkbox', { name: 'Complete Squat', exact: true })).toBeChecked();
  await expect(page.getByTestId('round-clock')).toHaveText('00:10');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(10100);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Repeat workout' }).click();
  await expect(
    page.getByRole('checkbox', { name: 'Complete Squat', exact: true }),
  ).not.toBeChecked();
});
test('countdown can display an ordered exercise list without checkboxes', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Show completion checkboxes').uncheck();
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(
    page.getByRole('region', { name: 'Workout exercises' }).getByRole('listitem'),
  ).toHaveCount(2);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
});

test('countdown target guidance describes the continuous timer rather than EMOM rounds', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('Rowing machine');
  await page.getByRole('button', { name: /^Rowing machine/ }).click();
  await page.getByRole('button', { name: 'Set target for Rowing machine' }).click();
  await expect(page.getByRole('dialog')).toContainText('Work through your list at your own pace');
  await expect(page.getByRole('dialog')).not.toContainText('60-second round');
});
