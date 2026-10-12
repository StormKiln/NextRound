import { expect, test } from '@playwright/test';

const key = 'nextround.workout-history.v1';
const results = [
  {
    id: 'one',
    completedAt: new Date('2026-10-11T12:00:00').getTime(),
    elapsedMs: 60000,
    note: 'Recovery',
    checkedExerciseIds: [],
    config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 0 },
  },
  {
    id: 'two',
    completedAt: new Date('2026-10-10T12:00:00').getTime(),
    elapsedMs: 120000,
    checkedExerciseIds: [],
    config: { type: 'countdown', durationSeconds: 120, leadInSeconds: 0, warningSeconds: 0 },
  },
];
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, results }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ version: 1, results }));
    },
    { key, results },
  );
  await page.goto('/history');
  await expect(page.getByRole('region', { name: 'Training summary' })).toBeVisible();
});
test('summary follows applied combined filters and leaves invalid date drafts unapplied', async ({
  page,
}) => {
  const summary = page.getByRole('region', { name: 'Training summary' });
  await expect(summary.locator('dd')).toHaveText(['2', '3 min', '2']);
  await page.getByLabel('Date range', { exact: true }).selectOption('custom');
  await page.getByLabel('From date').fill('2026-10-11');
  await page.getByLabel('Through date').fill('2026-10-11');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await page.getByLabel('Workout type').selectOption('countdown');
  await page.getByLabel('Search history').fill('Recovery');
  await expect(summary.locator('dd')).toHaveText(['1', '1 min', '1']);
  await page.getByLabel('Through date').fill('2026-10-10');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect(page.getByRole('alert')).toContainText('on or after');
  await expect(summary.locator('dd')).toHaveText(['1', '1 min', '1']);
  await page.getByLabel('Workout type').selectOption('emom');
  await expect(summary.locator('dd')).toHaveText(['0', '0 sec', '0']);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(summary.locator('dd')).toHaveText(['2', '3 min', '2']);
});
test('changed result is reviewed and explicitly reconfirmed before deletion at minimum size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page
    .getByRole('button', { name: /^Delete result:/ })
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Delete this result?' });
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.results[0].note = 'New observation';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(dialog.getByRole('alert')).toContainText('changed');
  await expect(page.getByRole('region', { name: 'Training summary' }).locator('dd')).toHaveText([
    '2',
    '3 min',
    '2',
  ]);
  await dialog.getByRole('button', { name: 'Refresh history' }).click();
  await expect(dialog).toContainText('New observation');
  await expect(dialog).toContainText('Review this result');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Delete result:/ }).first()).toBeFocused();
  await page.keyboard.press('Space');
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Training summary' }).locator('dd')).toHaveText([
    '1',
    '2 min',
    '1',
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('failed refresh labels cached summary and list until a successful retry', async ({ page }) => {
  const original = await page.evaluate((key) => localStorage.getItem(key) ?? 'null', key);
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
  await expect(page.getByText('Previously loaded history. It may be out of date.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(2);
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), {
    key,
    original,
  });
  await page.getByRole('button', { name: 'Retry history', exact: true }).click();
  await expect(page.getByText('Previously loaded history. It may be out of date.')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('saving a note immediately changes search membership and totals', async ({ page }) => {
  await page.getByLabel('Search history').fill('Recovery');
  await page.getByRole('button', { name: /^View result:/ }).click();
  await page.getByRole('button', { name: 'Edit note' }).click();
  await page.getByRole('textbox', { name: 'Workout note' }).fill('Strength');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Training summary' }).locator('dd')).toHaveText([
    '0',
    '0 sec',
    '0',
  ]);
  await page.getByLabel('Search history').fill('Strength');
  await expect(page.getByRole('region', { name: 'Training summary' }).locator('dd')).toHaveText([
    '1',
    '1 min',
    '1',
  ]);
});

test('failed note-editor refresh remains visible after closing the editor and detail', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: /^View result:/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Edit note' }).click();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await page
    .getByRole('dialog', { name: 'Workout note', exact: true })
    .getByRole('button', { name: 'Refresh history' })
    .click();
  await expect(
    page.getByRole('dialog', { name: 'Workout note', exact: true }).getByRole('alert'),
  ).toContainText('preserved');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Previously loaded history. It may be out of date.')).toBeVisible();
});
