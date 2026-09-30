import { expect, test } from '@playwright/test';

test('exercise prescriptions follow ordering into the workout', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Set target for Push-up', exact: true }).click();
  await page.getByLabel('Target amount', { exact: true }).fill('10');
  await page.getByLabel('Target unit', { exact: true }).selectOption('reps');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await page.getByRole('button', { name: 'Reorder Push-up', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Start workout', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Push-up', exact: true })).toBeVisible();
  await expect(page.getByText('10 reps', { exact: true })).toBeVisible();
});

test('rowing supports seconds, calories and metres and targets can be cleared', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('rowing');
  await page.getByRole('button', { name: /^Rowing machine/ }).click();
  await page.getByRole('button', { name: 'Set target for Rowing machine', exact: true }).click();
  await expect(page.getByLabel('Target unit').locator('option')).toHaveText([
    'Seconds',
    'Metres',
    'Calories',
  ]);
  await page.getByLabel('Target unit').selectOption('metres');
  await page.getByLabel('Target amount').fill('500');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('500 m', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit target for Rowing machine', exact: true }).click();
  await page.getByRole('button', { name: 'Clear target', exact: true }).click();
  await expect(page.getByText('500 m', { exact: true })).toHaveCount(0);
});

test('invalid targets stay editable and time targets display clearly', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Set target for Push-up', exact: true }).click();
  await page.getByLabel('Target amount').fill('0');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('positive whole number');
  await page.getByLabel('Target unit').selectOption('seconds');
  await page.getByLabel('Target amount').fill('30');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('30 sec', { exact: true })).toBeVisible();
});

test('custom exercise supports all prescription units', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name').fill('Ski erg');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Set target for Ski erg', exact: true }).click();
  await expect(page.getByLabel('Target unit').locator('option')).toHaveText([
    'Repetitions',
    'Seconds',
    'Metres',
    'Calories',
  ]);
  await page.getByLabel('Target unit').selectOption('calories');
  await page.getByLabel('Target amount').fill('10');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByText('10 cal', { exact: true })).toBeVisible();
});
