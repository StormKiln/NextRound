import { expect, test } from '@playwright/test';

test('countdown excludes lead-in, pauses, completes without rounds, and repeats', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/countdown');
  await page.clock.runFor(3200);
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('5');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByTestId('total-clock')).toHaveText('00:05');
  await page.clock.runFor(3000);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await page.clock.runFor(3000);
  await expect(page.getByTestId('round-clock')).toHaveText('00:04');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(4100);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await expect(page.getByText('rounds completed')).toHaveCount(0);
  await expect(page.getByText('00:05', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.getByRole('button', { name: 'Repeat workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop workout' }).click();
  await page.getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByLabel('Seconds', { exact: true })).toHaveValue('5');
});

test('countdown validates duration and starts immediately with zero lead-in', async ({ page }) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 86400');
  await page.getByLabel('Minutes', { exact: true }).fill('1440');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(page.getByRole('alert')).toContainText('1 to 86400');
  await page.getByLabel('Minutes', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Start countdown' }).click();
  await expect(page.getByRole('heading', { name: 'Make time to move' })).toBeVisible();
  await expect(page.getByText('Next movement')).toHaveCount(0);
});

test('Home offers countdown and preserves separate drafts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Set a countdown' }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('7');
  await page.getByLabel('Seconds', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build an EMOM' }).click();
  await expect(page.getByLabel('Total minutes')).toHaveValue('15');
  await page.getByLabel('Total minutes').fill('9');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Set a countdown' }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Seconds', { exact: true })).toHaveValue('12');
});
