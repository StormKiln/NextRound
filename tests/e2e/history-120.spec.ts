import { expect, test } from '@playwright/test';

const key = 'nextround.workout-history.v1';
test('completed countdown saves checks once, survives reload, repeats and deletes', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('4');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('Push-up');
  await page.getByRole('button', { name: /^Push-up / }).click();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.clock.runFor(4100);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.getByRole('button', { name: 'View history', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeVisible();
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), key);
  expect(saved.results).toHaveLength(1);
  expect(saved.results[0].checkedExerciseIds).toHaveLength(1);
  expect(saved.results[0].config.exercises[0].catalogId).toBe('pushup');
  await page.clock.resume();
  await page.reload();
  await page.getByRole('button', { name: 'View result' }).click();
  await expect(page.getByRole('dialog')).toContainText('Checked off');
  await page.getByRole('button', { name: 'Repeat from setup' }).click();
  await expect(page.getByLabel('Seconds', { exact: true })).toHaveValue('4');
  await page.getByLabel('Seconds', { exact: true }).fill('20');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? '{}').results[0].config.durationSeconds,
      key,
    ),
  ).toBe(4);
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: 'Delete result' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View result' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Delete result' }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByText('No saved results yet.')).toBeVisible();
});
test('unsaved completion requires explicit discard before navigation', async ({ page }) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Home', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Unsaved workout result' })).toBeVisible();
  await page.getByRole('button', { name: 'Keep result', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).first().click();
  await page.getByRole('button', { name: 'Discard and continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
});

test('save failure keeps completion retryable without duplicate results', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    let failed = false;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.workout-history.v1' && !failed) {
        failed = true;
        throw new Error('Disk full');
      }
      return original.call(this, key, value);
    };
  });
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  await expect(page.getByRole('button', { name: 'Repeat workout' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').results.length, key),
  ).toBe(1);
});
test('future history schema stays intact and reports a retryable error', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.workout-history.v1', '{"version":99,"results":[]}'),
  );
  await page.goto('/history');
  await expect(page.getByRole('alert')).toContainText('version is unsupported');
  await expect(page.getByRole('button', { name: 'Retry history' })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    '{"version":99,"results":[]}',
  );
});
