import { expect, test } from '@playwright/test';

const entry = {
  id: 'personal:recovery1190',
  name: 'Recovery movement',
  description: '',
  category: 'Uncategorized',
  equipment: [],
  targetAreas: [],
  supportedUnits: ['reps'],
  archived: false,
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (e) =>
      localStorage.setItem(
        'nextround.personal-exercises.v1',
        JSON.stringify({ version: 1, exercises: [e] }),
      ),
    entry,
  );
});
test('archive and restore keep keyboard focus when archived rows remain visible', async ({
  page,
}) => {
  await page.goto('/exercises');
  await page.getByLabel('Show archived exercises').check();
  const archive = page.getByRole('button', { name: 'Archive Recovery movement', exact: true });
  await archive.focus();
  await archive.press('Space');
  const restore = page.getByRole('button', { name: 'Restore Recovery movement', exact: true });
  await expect(restore).toBeFocused();
  await restore.press('Space');
  await expect(archive).toBeFocused();
});
test('failed personal archive preserves its row and keyboard focus', async ({ page }) => {
  await page.goto('/exercises');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.personal-exercises.v1') throw new Error('Test write unavailable');
      return original.call(this, key, value);
    };
  });
  const archive = page.getByRole('button', { name: 'Archive Recovery movement', exact: true });
  await archive.focus();
  await archive.press('Space');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(archive).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Recovery movement', exact: true })).toBeVisible();
});
test('modal personal-library archive returns typing to search', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Manage my exercises', exact: true }).click();
  const archive = page.getByRole('button', { name: 'Archive Recovery movement', exact: true });
  await archive.focus();
  await archive.press('Space');
  await expect(page.getByLabel('Search my exercise library')).toBeFocused();
});
test('personal default target limits identify invalid amount without losing the draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit Recovery movement', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Seconds', exact: true }).check();
  await page.getByLabel('Set a default target', { exact: true }).check();
  await page.getByLabel('Default unit', { exact: true }).selectOption('seconds');
  for (const value of ['', '-1', '1.5', '86401']) {
    await page.getByLabel('Default amount', { exact: true }).fill(value);
    await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
    await expect(page.getByLabel('Default amount', { exact: true })).toBeFocused();
    await expect(page.getByRole('alert')).toContainText('1 to 86400');
    await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue(
      'Recovery movement',
    );
  }
  await page.getByLabel('Default amount', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
