import { expect, test } from '@playwright/test';

const key = 'nextround.workout-history.v1';
const makeResult = (id: string, date: string) => ({
  id,
  completedAt: new Date(date).getTime(),
  elapsedMs: 60000,
  checkedExerciseIds: [],
  note: 'Steady recovery',
  config: {
    type: 'countdown',
    durationSeconds: 60,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: [],
  },
});
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, results }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ version: 1, results }));
    },
    {
      key,
      results: [makeResult('one', '2026-10-11T12:00:00'), makeResult('two', '2026-09-01T12:00:00')],
    },
  );
  await page.goto('/history');
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeVisible();
});
test('custom range combines search and type, keeps invalid draft separate and resets', async ({
  page,
}) => {
  await page.getByLabel('Date range', { exact: true }).selectOption('custom');
  await page.getByLabel('From date').fill('2026-10-11');
  await page.getByLabel('Through date').fill('2026-10-11');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await page.getByLabel('Workout type').selectOption('countdown');
  await page.getByLabel('Search history').fill('recovery');
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(1);
  await page.getByLabel('Through date').fill('2026-10-10');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect(page.getByLabel('Through date')).toBeFocused();
  await expect(page.getByRole('alert')).toContainText('on or after');
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(2);
});
test('filters survive Home and return', async ({ page }) => {
  await page.getByLabel('Workout type').selectOption('emom');
  await page.getByLabel('Search history').fill('steady');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await expect(page.getByLabel('Workout type')).toHaveValue('emom');
  await expect(page.getByLabel('Search history')).toHaveValue('steady');
});
test('refresh replaces outdated missing-result notice', async ({ page }) => {
  await page
    .getByRole('button', { name: /^View result:/ })
    .first()
    .click();
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, results: [] })),
    key,
  );
  await page.getByRole('dialog').getByRole('button', { name: 'Refresh history' }).click();
  await expect(page.getByText('This result is no longer in history.')).toBeVisible();
  await page.getByRole('button', { name: 'Refresh history' }).click();
  await expect(page.getByText('This result is no longer in history.')).toHaveCount(0);
  await expect(page.getByText('History refreshed.')).toBeVisible();
});
test('comparison returns to current result and restores nested focus', async ({ page }) => {
  await page
    .getByRole('button', { name: /^View result:/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Compare attempts', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Countdown result', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Compare attempts', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('button', { name: /^View result:/ }).first()).toBeFocused();
});

test('relative dates advance at midnight and after returning to the window', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-11T23:59:50') });
  await page.reload();
  await page.clock.runFor(3200);
  await page.getByLabel('Date range', { exact: true }).selectOption('today');
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(1);
  await page.clock.runFor(31000);
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(0);
  await page.clock.setSystemTime(new Date('2026-10-11T15:00:00'));
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(1);
});

test('custom dates and pending draft survive routes without applying the draft', async ({
  page,
}) => {
  await page.getByLabel('Date range', { exact: true }).selectOption('custom');
  await page.getByLabel('From date').fill('2026-10-11');
  await page.getByLabel('Through date').fill('2026-10-11');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await page.getByLabel('Through date').fill('2026-09-01');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await expect(page.getByLabel('Through date')).toHaveValue('2026-09-01');
  await expect(page.getByText(/Custom dates are not applied yet/)).toBeVisible();
  await expect(page.getByRole('button', { name: /^View result:/ })).toHaveCount(1);
  await page.getByRole('button', { name: /^View result:/ }).click();
  await page.getByRole('button', { name: 'Repeat from setup' }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await expect(page.getByLabel('Through date')).toHaveValue('2026-09-01');
  await page.reload();
  await expect(page.getByLabel('Date range', { exact: true })).toHaveValue('all');
});

test('comparisons ignore list dates and return with latest notes; missing result falls back', async ({
  page,
}) => {
  await page.getByLabel('Date range', { exact: true }).selectOption('custom');
  await page.getByLabel('From date').fill('2026-10-11');
  await page.getByLabel('Through date').fill('2026-10-11');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await page.getByRole('button', { name: /^View result:/ }).click();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  await expect(page.getByText('2 matching attempts', { exact: true })).toBeVisible();
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key)!);
    doc.results[0].note = 'Updated elsewhere';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByText('Updated elsewhere', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key)!);
    doc.results.shift();
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
  await expect(page.getByText('This result is no longer in history.')).toBeVisible();
  await expect(page.getByLabel('From date')).toHaveValue('2026-10-11');
});

test('comparison return read failure retains dialog and supports retry', async ({ page }) => {
  const original = await page.evaluate((key) => localStorage.getItem(key)!, key);
  await page
    .getByRole('button', { name: /^View result:/ })
    .first()
    .click();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Compare attempts', exact: true }).getByRole('alert'),
  ).toContainText('history is preserved');
  await expect(page.getByRole('dialog', { name: 'Compare attempts', exact: true })).toBeVisible();
  await page.evaluate(({ key, original }) => localStorage.setItem(key, original), {
    key,
    original,
  });
  await page.getByRole('button', { name: 'Retry return' }).click();
  await expect(page.getByRole('dialog', { name: 'Countdown result', exact: true })).toBeVisible();
});

test('minimum window keeps date controls usable and empty history recoverable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByLabel('Date range', { exact: true }).selectOption('custom');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect(page.getByLabel('From date')).toBeFocused();
  await page.getByLabel('From date').fill('2099-01-01');
  await page.getByLabel('Through date').fill('2099-01-02');
  await page.getByRole('button', { name: 'Apply dates' }).click();
  await expect(
    page.getByRole('heading', { name: 'No results match these filters.' }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, results: [] })),
    key,
  );
  await page.getByRole('button', { name: 'Refresh history' }).click();
  await page.getByRole('button', { name: 'Reset filters', exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'No saved results yet.' })).toBeVisible();
  await expect(page.getByLabel('Date range', { exact: true })).toHaveValue('all');
});
