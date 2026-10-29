import { expect, test } from '@playwright/test';

test('personal exercises opt in to a phase and the library filters by it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'My exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('My hip flow');
  await page.getByLabel('Warm-up', { exact: true }).check();
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('My untagged move');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await page.reload();
  await expect(page.getByText('Phase: Warm-up', { exact: true })).toBeVisible({ timeout: 15000 });

  const phase = page.getByLabel('Workout phase', { exact: true });
  await phase.selectOption('warmup');
  await expect(page.getByRole('heading', { name: 'My hip flow', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'My untagged move', exact: true })).toHaveCount(0);
  await phase.selectOption('cooldown');
  await expect(page.getByText('No personal exercises are tagged Cool-down.')).toBeVisible();
  await page.getByRole('button', { name: 'Show all phases', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'My untagged move', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Copy a bundled exercise', exact: true }).click();
  await phase.selectOption('cooldown');
  await expect(page.getByRole('heading', { name: 'Pigeon pose', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Burpee', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy Pigeon pose', exact: true }).click();
  await expect(page.getByLabel('Cool-down', { exact: true })).toBeChecked();
  await expect(page.getByLabel('Warm-up', { exact: true })).not.toBeChecked();
});

test('the exercise picker filters by workout phase and shows tags', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workout phase', { exact: true }).selectOption('warmup');
  await dialog.getByLabel('Search exercises', { exact: true }).fill('greatest');
  await expect(
    dialog.getByRole('button', { name: /^World’s greatest stretch .*Warm-up/ }),
  ).toBeVisible();
  await dialog.getByLabel('Search exercises', { exact: true }).fill('pigeon pose');
  await expect(dialog.getByRole('button', { name: /^Pigeon pose / })).toHaveCount(0);
  await expect(
    dialog.getByText('No exercises match the current search and filters.'),
  ).toBeVisible();
  await dialog.getByLabel('Workout phase', { exact: true }).selectOption('cooldown');
  await expect(dialog.getByRole('button', { name: /^Pigeon pose .*Cool-down/ })).toBeVisible();
});
