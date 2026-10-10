import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
const templates = ['Alpha', 'Beta', 'Gamma'].map((name, index) => ({
  id: name,
  name,
  config:
    index === 0
      ? { minutes: 3, leadInSeconds: 0, warningSeconds: 0, exercises: [{ id: 'a', name: 'Squat' }] }
      : { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 0 },
}));
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, templates }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ version: 1, templates }));
    },
    { key, templates },
  );
  await page.goto('/');
});

test('favourites persist and combine with mode and normalized name filters', async ({ page }) => {
  await page.getByRole('button', { name: 'Favourite Alpha', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Favourites only' }).check();
  await expect(page.locator('.template-list > li')).toHaveCount(1);
  await page.getByLabel('Workout type', { exact: true }).selectOption('countdown');
  await expect(page.getByText('No saved workouts match your filters.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('Search saved workouts').fill('ALPHA');
  await expect(page.locator('.template-list > li')).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Unfavourite Alpha', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('checkbox', { name: 'Favourites only' }).check();
  await page.getByRole('button', { name: 'Unfavourite Alpha', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
});

test('stale load offers refresh without changing the workout draft', async ({ page }) => {
  await page.getByRole('button', { name: 'Load Alpha', exact: true }).click();
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, templates: [] })),
    key,
  );
  const dialog = page.getByRole('dialog', { name: 'Load saved workout' });
  await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('no longer exists');
  await dialog.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.template-list > li')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
});

test('stale rename preserves typed text and requires review of the new name', async ({ page }) => {
  await page.getByRole('button', { name: 'Rename Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Rename saved workout' });
  await dialog.getByLabel('Workout name').fill('My proposal');
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.templates[0].name = 'Changed elsewhere';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(dialog.getByRole('alert')).toContainText('name changed');
  await dialog.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await expect(dialog.getByLabel('Workout name')).toHaveValue('My proposal');
  await expect(dialog).toContainText('Changed elsewhere');
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'My proposal', exact: true })).toBeVisible();
  await expect(page.getByText(/Current saved name:/)).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Workout renamed.');
});

for (const name of ['Alpha', 'Beta', 'Gamma']) {
  test(`deleting ${name} restores stable library focus`, async ({ page }) => {
    await page.getByRole('button', { name: `Delete ${name}`, exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Delete workout', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
  });
}

test('failed refresh preserves typed rename and can retry after storage recovery', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Rename Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Workout name').fill('Keep this text');
  await page.evaluate((key) => localStorage.setItem(key, '{broken'), key);
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await dialog.getByRole('button', { name: 'Refresh saved workouts' }).click();
  await expect(dialog.getByRole('alert')).toContainText('preserved');
  await expect(dialog.getByLabel('Workout name')).toHaveValue('Keep this text');
  await page.evaluate(
    ({ key, templates }) => localStorage.setItem(key, JSON.stringify({ version: 1, templates })),
    { key, templates },
  );
  await dialog.getByRole('button', { name: 'Refresh saved workouts' }).click();
  await dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'Keep this text', exact: true })).toBeVisible();
});

test('cancel restores its origin and filtered rename or last deletion falls back to heading', async ({
  page,
}) => {
  const origin = page.getByRole('button', { name: 'Rename Alpha', exact: true });
  await origin.click();
  await page.keyboard.press('Escape');
  await expect(origin).toBeFocused();
  await page.getByLabel('Search saved workouts').fill('Alpha');
  await origin.click();
  await page.getByRole('dialog').getByLabel('Workout name').fill('Renamed');
  await page.getByRole('dialog').getByRole('button', { name: 'Save name' }).click();
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
  await page.getByLabel('Search saved workouts').fill('Renamed');
  await page.getByRole('button', { name: 'Delete Renamed', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete workout' }).click();
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
  await expect(page.getByLabel('Search saved workouts')).toHaveValue('Renamed');
});

test('favourite write failure is visible and does not falsely change its state', async ({
  page,
}) => {
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Disk full');
    };
  });
  await page.getByRole('button', { name: 'Favourite Alpha', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  await expect(page.getByRole('button', { name: 'Favourite Alpha', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

const modes = [
  { type: 'emom', minutes: 1 },
  { type: 'countdown', durationSeconds: 60 },
  { type: 'intervals', rounds: 1, workSeconds: 30, restSeconds: 10 },
  { type: 'amrap', durationSeconds: 60 },
  { type: 'forTime', timeCapSeconds: 120 },
  {
    type: 'ladder',
    timeCapSeconds: 120,
    ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 2 },
  },
];
test('all six workout types filter and load at minimum size without overlapping controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addStyleTag({ content: '::-webkit-scrollbar { width: 16px; }' });
  const entries = modes.map((mode) => ({
    id: mode.type,
    name: `${mode.type} routine with a long but readable name`,
    favourite: true,
    config: {
      ...mode,
      leadInSeconds: 0,
      warningSeconds: 0,
      exercises: [
        {
          id: 'a',
          name: 'Squat',
          ...(mode.type === 'ladder' ? {} : { target: { unit: 'reps', value: 5 } }),
        },
      ],
    },
  }));
  await page.evaluate(
    ({ key, entries }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, templates: entries })),
    { key, entries },
  );
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  for (const mode of modes) {
    await page.getByLabel('Workout type', { exact: true }).selectOption(mode.type);
    await page.getByRole('checkbox', { name: 'Favourites only' }).check();
    const row = page.locator('.template-list > li');
    await expect(row).toHaveCount(1);
    const buttons = await row.getByRole('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const a = await buttons[i].boundingBox();
      expect(a).not.toBeNull();
      if (!a) continue;
      expect(a.x).toBeGreaterThanOrEqual(0);
      expect(a.x + a.width).toBeLessThanOrEqual(760);
      for (let j = i + 1; j < buttons.length; j++) {
        const b = await buttons[j].boundingBox();
        if (b)
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
      }
    }
    if (mode.type === 'emom')
      await page.screenshot({ path: '/tmp/nextround-1120-library-760.png', fullPage: true });
    await row.getByRole('button', { name: /^Load / }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Load workout', exact: true })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/${mode.type === 'forTime' ? 'for-time' : mode.type}$`),
    );
    await page.getByRole('button', { name: 'Home', exact: true }).click();
  }
});
