import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
const config = {
  type: 'countdown',
  durationSeconds: 110,
  leadInSeconds: 10,
  warningSeconds: 3,
  exercises: [],
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          templates: [
            { id: 'a', name: 'Short session', favourite: true, config },
            { id: 'b', name: 'Long session', config: { ...config, durationSeconds: 600 } },
            {
              id: 'c',
              name: 'Open session',
              config: { type: 'forTime', leadInSeconds: 0, warningSeconds: 3, exercises: [] },
            },
          ],
          collections: [],
        }),
      ),
    { key, config },
  );
  await page.goto('/');
});
test('applies time explicitly, retains valid filter on invalid draft, combines and clears at minimum size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  const budget = page.getByLabel('Available minutes', { exact: true });
  await budget.fill('2');
  await expect(page.getByRole('heading', { name: 'Long session', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Apply time', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Long session', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Open session', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Short session', exact: true })).toBeVisible();
  await budget.fill('0');
  await page.getByRole('button', { name: 'Apply time', exact: true }).click();
  await expect(budget).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('heading', { name: 'Long session', exact: true })).toHaveCount(0);
  await page.getByLabel('Search saved library').fill('missing');
  await expect(
    page.getByText('No saved workouts match your filters.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Clear library filters', exact: true }).first().click();
  await expect(budget).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Long session', exact: true })).toBeVisible();
  await expect(budget).toHaveAttribute('aria-invalid', 'false');
});

test('reveals export errors below a long collection and retries safely', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.evaluate(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          templates: Array.from({ length: 40 }, (_, i) => ({
            id: `w${i}`,
            name: `Workout ${i}`,
            config,
          })),
          collections: [
            {
              id: 'c',
              name: 'Long collection',
              workoutIds: Array.from({ length: 40 }, (_, i) => `w${i}`),
            },
          ],
        }),
      ),
    { key, config },
  );
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.getByLabel('Collection', { exact: true }).selectOption('c');
  await page.getByRole('button', { name: 'Export collection', exact: true }).click();
  await page.evaluate((key) => localStorage.setItem(key, 'invalid JSON'), key);
  await page.getByRole('button', { name: 'Save collection file', exact: true }).click();
  const alert = page.getByRole('dialog').getByRole('alert');
  await expect(alert).toBeFocused();
  await expect(alert).toBeInViewport();
});
test('explains blank and duplicate import names and navigates to offscreen fields', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  await page.getByLabel('Collection file', { exact: true }).setInputFiles({
    name: 'many.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'nextround-collection',
        version: 1,
        name: 'Travel',
        workouts: Array.from({ length: 20 }, (_, i) => ({ name: `Workout ${i}`, config })),
      }),
    ),
  });
  const last = page.getByLabel('Workout 20 name', { exact: true });
  await last.fill('');
  await expect(last).toHaveAttribute('aria-invalid', 'true');
  await expect(
    page.getByRole('button', { name: 'Review invalid names', exact: true }),
  ).toBeInViewport();
  await page.getByRole('button', { name: 'Review invalid names', exact: true }).click();
  await expect(last).toBeFocused();
  await expect(last).toHaveAccessibleDescription(/Enter a workout name/);
  await last.fill('Workout 0');
  const first = page.getByLabel('Workout 1 name', { exact: true });
  await expect(first).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Review invalid names', exact: true }).click();
  await expect(first).toBeFocused();
  await last.fill('Distinct final workout');
  await page.getByRole('button', { name: 'Add collection and workouts', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('retries an initial export read failure without reopening the dialog', async ({ page }) => {
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)!);
    d.collections = [{ id: 'c', name: 'Training', workoutIds: ['a'] }];
    localStorage.setItem(key, JSON.stringify(d));
  }, key);
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.getByLabel('Collection', { exact: true }).selectOption('c');
  await page.evaluate((key) => {
    const get = Storage.prototype.getItem;
    (window as unknown as { restoreRead: () => void }).restoreRead = () => {
      Storage.prototype.getItem = get;
    };
    Storage.prototype.getItem = function (k) {
      if (k === key) {
        throw Error('Read temporarily unavailable');
      }
      return get.call(this, k);
    };
  }, key);
  await page.getByRole('button', { name: 'Export collection', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeFocused();
  await page.evaluate(() => (window as unknown as { restoreRead: () => void }).restoreRead());
  await page.getByRole('button', { name: 'Retry collection', exact: true }).click();
  await expect(page.getByRole('dialog').getByText('Short session', { exact: true })).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save collection file', exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/json$/);
});

test('time filters survive navigation, reset on restart and label capped previews honestly', async ({
  page,
}) => {
  await page.getByLabel('Available minutes', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Apply time', exact: true }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await expect(page.getByLabel('Available minutes', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('heading', { name: 'Open session', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Preview Short session', exact: true }).click();
  await expect(
    page
      .getByRole('dialog')
      .getByText('Duration + lead-in: 02:00. Pauses add time.', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Available minutes', { exact: true })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'Open session', exact: true })).toBeVisible();
});
