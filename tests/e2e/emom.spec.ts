import { expect, test } from '@playwright/test';

test('custom exercises can be added, reordered and removed', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Custom exercise' }).click();
  await page.getByLabel('Exercise name').fill('My movement');
  await page.getByLabel('Description (optional)').fill('Five careful repetitions');
  await page.getByRole('button', { name: 'Add custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'My movement' })).toBeVisible();
  await page.getByRole('button', { name: 'Move My movement up' }).click();
  await expect(page.getByTestId('exercise-entry').nth(2)).toContainText('My movement');
  await page.getByRole('button', { name: 'Remove My movement' }).click();
  await expect(page.getByRole('heading', { name: 'My movement' })).toHaveCount(0);
});

test('lead-in, round and total clocks, pause, completion and repeat', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByLabel('Total minutes').fill('1');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByTestId('total-clock')).toHaveText('01:00');
  await page.clock.runFor(2000);
  await expect(page.getByTestId('round-clock')).toHaveText('01:00');
  await page.clock.runFor(10000);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await page.clock.runFor(5000);
  await expect(page.getByTestId('round-clock')).toHaveText('00:50');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(50000);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Repeat workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
});

test('invalid inputs are explained and stop preserves the draft', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Total minutes').fill('0');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByText('Choose a whole number from 1 to 1440.')).toBeVisible();
  await page.getByLabel('Total minutes').fill('5');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Stop workout' }).click();
  await page.getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByLabel('Total minutes')).toHaveValue('5');
});
