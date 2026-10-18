import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
const original = {
  id: 'alpha',
  name: 'Alpha',
  favourite: true,
  config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 0 },
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, original }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ version: 1, templates: [original] }));
    },
    { key, original },
  );
  await page.goto('/');
});
test('duplicate preserves source and filters, reports hidden copy and survives restart', async ({
  page,
}) => {
  await page.getByRole('checkbox', { name: 'Favourites only' }).check();
  await page.getByRole('button', { name: 'Duplicate Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Duplicate saved workout' });
  await expect(dialog.getByLabel('Workout name')).toHaveValue('Copy of Alpha');
  await dialog.getByLabel('Workout name').fill('My variant');
  await dialog.getByRole('button', { name: 'Create copy' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status').filter({ hasText: 'hidden' })).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Favourites only' })).toBeChecked();
  const doc = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
  expect(doc.templates[0]).toEqual(original);
  expect(doc.templates[1]).toMatchObject({ name: 'My variant', config: original.config });
  expect(doc.templates[1].id).not.toBe(original.id);
  expect(doc.templates[1].favourite).toBeFalsy();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'My variant', exact: true })).toBeVisible();
});
test('library filters survive navigation and reset on restart', async ({ page }) => {
  await page.getByLabel('Search saved workouts').fill('Alpha');
  await page.getByLabel('Workout type', { exact: true }).selectOption('countdown');
  await page.getByRole('checkbox', { name: 'Favourites only' }).check();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('Search saved workouts')).toHaveValue('Alpha');
  await expect(page.getByLabel('Workout type', { exact: true })).toHaveValue('countdown');
  await expect(page.getByRole('checkbox', { name: 'Favourites only' })).toBeChecked();
  await page.reload();
  await expect(page.getByLabel('Search saved workouts')).toHaveValue('');
});
test('failed refresh clears old success feedback', async ({ page }) => {
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Saved workouts refreshed.' }),
  ).toBeVisible();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('preserved');
  await expect(page.getByText('Saved workouts refreshed.')).toHaveCount(0);
});
test('changed template cannot be deleted until refreshed and reconfirmed', async ({ page }) => {
  await page.getByRole('button', { name: 'Delete Alpha', exact: true }).click();
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key) ?? 'null');
    d.templates[0].name = 'Changed';
    localStorage.setItem(key, JSON.stringify(d));
  }, key);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('changed');
  await dialog.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(dialog).toContainText('Changed');
  await dialog.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
});

test('duplicate retains typed name on source conflict and reviews refreshed settings', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Duplicate Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workout name').fill('Keep my name');
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key) ?? 'null');
    d.templates[0].config.durationSeconds = 120;
    localStorage.setItem(key, JSON.stringify(d));
  }, key);
  await dialog.getByRole('button', { name: 'Create copy' }).click();
  await expect(dialog.getByRole('alert')).toContainText('changed');
  await dialog.getByRole('button', { name: 'Refresh saved workouts' }).click();
  await expect(dialog.getByLabel('Workout name')).toHaveValue('Keep my name');
  await expect(dialog).toContainText('120 seconds');
  await dialog.getByRole('button', { name: 'Create copy' }).click();
  const doc = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
  expect(doc.templates[1].config.durationSeconds).toBe(120);
});

test('show copied workout clears filters and obsolete hidden-copy feedback', async ({ page }) => {
  await page.getByRole('checkbox', { name: 'Favourites only' }).check();
  await page.getByRole('button', { name: 'Duplicate Alpha', exact: true }).click();
  await page.getByRole('button', { name: 'Create copy', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'hidden' })).toBeVisible();
  await page.getByRole('button', { name: 'Show copied workout' }).click();
  await expect(page.getByRole('heading', { name: 'Copy of Alpha', exact: true })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'hidden' })).toHaveCount(0);
});
test('duplication retries a failed write and rejects blank names at minimum window size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 640, height: 560 });
  await page.getByRole('button', { name: 'Duplicate Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workout name').fill('   ');
  await expect(dialog.getByRole('button', { name: 'Create copy' })).toBeDisabled();
  await dialog.getByLabel('Workout name').fill('Élan 🏋');
  await page.evaluate((key) => {
    const originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === key) throw new Error('Disk full');
      return originalSet.call(this, k, v);
    };
    (window as unknown as { restore: () => void }).restore = () => {
      Storage.prototype.setItem = originalSet;
    };
  }, key);
  await dialog.getByRole('button', { name: 'Create copy' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Disk full');
  await expect(dialog.getByLabel('Workout name')).toHaveValue('Élan 🏋');
  await page.evaluate(() => (window as unknown as { restore: () => void }).restore());
  await dialog.getByRole('button', { name: 'Create copy' }).click();
  await expect(page.getByRole('heading', { name: 'Élan 🏋', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Duplicate Alpha', exact: true })).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('direct duplication leaves loaded source and edited setup untouched', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Alpha', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate Alpha', exact: true }).click();
  await page.getByRole('button', { name: 'Create copy', exact: true }).click();
  await page.getByRole('button', { name: 'Set a countdown', exact: true }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'Update saved workout', exact: true }).click();
  await expect(page.getByRole('dialog').getByLabel('Workout name')).toHaveValue('Alpha');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
});
