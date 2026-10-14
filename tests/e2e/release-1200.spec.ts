import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
const alpha = {
  id: 'alpha',
  name: 'Alpha',
  config: {
    type: 'countdown',
    durationSeconds: 60,
    leadInSeconds: 10,
    warningSeconds: 3,
    exercises: [
      {
        id: 'one',
        name: 'Snapshot movement',
        description: 'Saved description',
        target: { unit: 'reps', value: 8 },
      },
    ],
  },
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, alpha }) =>
      localStorage.setItem(key, JSON.stringify({ version: 1, templates: [alpha] })),
    { key, alpha },
  );
  await page.goto('/');
});
test('renaming a filtered workout explains where it went and offers recovery', async ({ page }) => {
  await page.getByLabel('Search saved workouts').fill('Alpha');
  await page.getByRole('button', { name: 'Rename Alpha', exact: true }).click();
  await page.getByLabel('Workout name').fill('Beta');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('hidden');
  await page.getByRole('button', { name: 'Show renamed workout' }).click();
  await expect(page.getByRole('heading', { name: 'Beta', exact: true })).toBeVisible();
  await expect(page.getByLabel('Search saved workouts')).toBeFocused();
});
test('keyboard clear filters restores search focus', async ({ page }) => {
  await page.getByLabel('Search saved workouts').fill('No match');
  const clear = page.getByRole('button', { name: 'Clear filters', exact: true });
  await clear.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Search saved workouts')).toBeFocused();
});
test('preview is read only and shows saved exercise snapshots', async ({ page }) => {
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview saved workout' });
  await expect(dialog).toContainText('Snapshot movement');
  await expect(dialog).toContainText('Saved description');
  await expect(dialog).toContainText('8 reps');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before);
  await expect(page.getByRole('button', { name: 'Preview Alpha', exact: true })).toBeFocused();
});

test('preview reads fresh data and requires explicit confirmation to replace a draft', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Set a countdown' }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('7');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.templates[0].config.durationSeconds = 120;
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('02:00');
  await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(dialog).toContainText('replaces the current setup');
  await dialog.getByRole('button', { name: 'Keep current setup' }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Set a countdown' }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('7');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm load' }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('2');
  await expect(page.getByRole('button', { name: 'Update saved workout' })).toBeVisible();
});
test('changed preview must be reviewed again before loading', async ({ page }) => {
  await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.templates[0].name = 'Changed';
    doc.templates[0].config.durationSeconds = 180;
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await dialog.getByRole('button', { name: 'Confirm load' }).click();
  await expect(dialog.getByRole('status')).toContainText('changed');
  await expect(dialog).toContainText('03:00');
  await expect(dialog.getByRole('button', { name: 'Confirm load' })).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm load' }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('3');
});
for (const failure of ['deleted', 'corrupted']) {
  test(`preview handles ${failure} data without loading and can retry`, async ({ page }) => {
    await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
    await page.evaluate(
      ({ key, failure }) =>
        localStorage.setItem(
          key,
          failure === 'deleted' ? JSON.stringify({ version: 1, templates: [] }) : '{broken',
        ),
      { key, failure },
    );
    await dialog.getByRole('button', { name: 'Confirm load' }).click();
    await expect(dialog.getByRole('alert')).toContainText(
      failure === 'deleted' ? 'no longer exists' : 'preserved',
    );
    await expect(dialog.getByRole('button', { name: 'Load workout', exact: true })).toBeDisabled();
    await page.evaluate(
      ({ key, alpha }) =>
        localStorage.setItem(key, JSON.stringify({ version: 1, templates: [alpha] })),
      { key, alpha },
    );
    await dialog.getByRole('button', { name: 'Retry preview' }).click();
    await expect(dialog.getByRole('button', { name: 'Load workout', exact: true })).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Preview Alpha', exact: true })).toBeFocused();
  });
}
const modes = [
  { config: { minutes: 5 }, text: 'One movement per minute', duration: '05:00' },
  {
    config: { type: 'countdown', durationSeconds: 60, showChecklist: false },
    text: 'Checklist: Off',
    duration: '01:00',
  },
  {
    config: { type: 'intervals', rounds: 3, workSeconds: 30, restSeconds: 10 },
    text: 'No rest after the final work round.',
    duration: '01:50',
  },
  { config: { type: 'amrap', durationSeconds: 180 }, text: 'AMRAP', duration: '03:00' },
  { config: { type: 'forTime' }, text: 'No time cap', duration: 'Checklist: On' },
  {
    config: {
      type: 'ladder',
      timeCapSeconds: 600,
      ladder: { direction: 'pyramid', startReps: 2, increment: 2, rungs: 3 },
    },
    text: '2 → 4 → 6 → 4 → 2',
    duration: 'Time cap: 10:00',
  },
];
for (const [i, mode] of modes.entries()) {
  test(`preview mode ${i} preserves snapshots and actions at minimum size`, async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.evaluate(
      ({ key, alpha, mode }) =>
        localStorage.setItem(
          key,
          JSON.stringify({
            version: 1,
            templates: [
              {
                ...alpha,
                config: {
                  ...mode.config,
                  leadInSeconds: 10,
                  warningSeconds: 3,
                  exercises: Array.from({ length: 20 }, (_, n) => ({
                    id: String(n),
                    name: `Saved custom ${n}`,
                    description: 'Long saved description '.repeat(20),
                    target: mode.config.type === 'ladder' ? undefined : { unit: 'reps', value: 8 },
                  })),
                },
              },
            ],
          }),
        ),
      { key, alpha, mode },
    );
    await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText(mode.text);
    await expect(dialog).toContainText(mode.duration);
    await page.addStyleTag({ content: '::-webkit-scrollbar { width: 16px; }' });
    await dialog.locator('.template-preview-body').evaluate((e) => {
      e.scrollTop = e.scrollHeight;
    });
    for (const name of ['Close', 'Load workout']) {
      const box = await dialog.getByRole('button', { name, exact: true }).boundingBox();
      expect(box).not.toBeNull();
      if (!box) throw new Error(`Missing ${name} button bounds`);
      expect(box.y + box.height).toBeLessThan(621);
      expect(box.x).toBeGreaterThan(0);
    }
    await dialog.getByRole('button', { name: 'Load workout', exact: true }).click();
    await expect(dialog.getByRole('button', { name: 'Confirm load' })).toBeInViewport();
    await expect(dialog.getByRole('status')).toBeInViewport();
  });
}
test('optional empty exercise list has an explicit preview state', async ({ page }) => {
  await page.evaluate(
    ({ key, alpha }) => {
      const { exercises: _, ...config } = alpha.config;
      localStorage.setItem(key, JSON.stringify({ version: 1, templates: [{ ...alpha, config }] }));
    },
    { key, alpha },
  );
  await page.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('No exercises specified.');
});
test('clearing filters after the last saved entry disappears focuses the library heading', async ({
  page,
}) => {
  await page.getByLabel('Search saved workouts').fill('Alpha');
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, templates: [] })),
    key,
  );
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Saved workouts', exact: true })).toBeFocused();
});
