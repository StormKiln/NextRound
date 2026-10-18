import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

const session = result220().session;
async function seed(page: Page) {
  await page.goto('/');
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [s], results: [], actuals: {}, recovery: null }),
      ),
    session,
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Attempt a', exact: true })).toBeEnabled();
}
test('session preview is read-only and shows saved prescriptions', async ({ page }) => {
  await seed(page);
  const before = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  await page.getByRole('button', { name: 'Preview Attempt a', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
  await expect(dialog).toContainText('Push-up');
  await expect(dialog).toContainText('8 reps');
  await expect(dialog).toContainText('Warning: 3s');
  await dialog.getByRole('button', { name: 'Close preview', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(before);
});
test('session preview rereads changes and rejects deleted records', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Preview Attempt a', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
  await expect(dialog).toContainText('Push-up');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    d.sessions[0].name = 'Changed routine';
    localStorage.setItem('nextround.training.v1', JSON.stringify(d));
  });
  await dialog.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(dialog).toContainText('Review the updated details');
  await expect(dialog).toContainText('Changed routine');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    d.sessions = [];
    localStorage.setItem('nextround.training.v1', JSON.stringify(d));
  });
  await dialog.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(dialog).toContainText('no longer exists');
  await expect(page).toHaveURL(/\/$/);
});
test('failed refresh disables cached session library actions until retry', async ({ page }) => {
  await seed(page);
  const open = page.getByRole('button', { name: 'Open Attempt a', exact: true });
  await expect(open).toBeEnabled();
  await page.evaluate(() => {
    localStorage.setItem('nextround.training.v1', 'invalid');
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Retry sessions', exact: true })).toBeVisible();
  await expect(open).toBeDisabled();
  await expect(
    page.getByText('Cached sessions may be out of date.', { exact: false }),
  ).toBeVisible();
});
test('direct session open rejects a changed snapshot', async ({ page }) => {
  await seed(page);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    d.sessions[0].name = 'Changed';
    localStorage.setItem('nextround.training.v1', JSON.stringify(d));
  });
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page).toHaveURL(/\/$/);
});
test('session preview keeps an existing draft when replacement is cancelled', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await page.getByLabel('Session name', { exact: true }).fill('My unsaved draft');
  await page.getByRole('banner').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Attempt a', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
  await dialog.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Replace current draft', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep current draft', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close preview', exact: true }).click();
  await page.getByRole('button', { name: 'Continue editing session', exact: true }).click();
  await expect(page.getByLabel('Session name', { exact: true })).toHaveValue('My unsaved draft');
});
for (const action of ['Duplicate', 'Export session'])
  test(`session ${action} rejects stale snapshots`, async ({ page }) => {
    await seed(page);
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
      d.sessions = [];
      localStorage.setItem('nextround.training.v1', JSON.stringify(d));
    });
    await page.locator('.session-card').getByRole('button', { name: action, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('no longer exists');
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('nextround.training.v1')!).sessions,
      ),
    ).toHaveLength(0);
  });
test('long session collections keep cancellation and save visible', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 2,
        templates: [],
        collections: Array.from({ length: 30 }, (_, i) => ({
          id: `c${i}`,
          name: `Collection ${i} with a long descriptive name`,
          workoutIds: [],
        })),
      }),
    ),
  );
  await page.reload();
  await page
    .locator('.session-card')
    .getByRole('button', { name: 'Collections', exact: true })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Session collections', exact: true });
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await expect(dialog.getByRole('checkbox')).toHaveCount(30);
  const first = await dialog.getByRole('checkbox').first().boundingBox();
  const second = await dialog.getByRole('checkbox').nth(1).boundingBox();
  expect(second!.y - first!.y).toBeGreaterThanOrEqual(40);
});
test('session filters report matches and can be cleared beside session results', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Search saved workouts', { exact: true }).fill('not present');
  const section = page.getByRole('region', { name: 'Saved training sessions', exact: true });
  await expect(section).toContainText('0 of 1 sessions');
  await section.getByRole('button', { name: 'Clear session filters', exact: true }).click();
  await expect(page.getByLabel('Search saved workouts', { exact: true })).toHaveValue('');
  await expect(section).toContainText('1 of 1 sessions');
});

test('twenty-block preview covers every mode with reachable actions and honest unknown duration', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.evaluate((s) => {
    const common = { leadInSeconds: 5, warningSeconds: 3, exercises: s.blocks[0].config.exercises };
    const configs = [
      { ...common, type: 'emom', minutes: 3 },
      { ...common, type: 'countdown', durationSeconds: 90 },
      { ...common, type: 'intervals', rounds: 3, workSeconds: 20, restSeconds: 10 },
      { ...common, type: 'amrap', durationSeconds: 180 },
      { ...common, type: 'forTime' },
      {
        ...common,
        type: 'ladder',
        exercises: common.exercises?.map(({ target, ...e }) => e),
        ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 3 },
      },
    ];
    const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    data.sessions[0].blocks = Array.from({ length: 20 }, (_, i) => ({
      id: `b${i}`,
      name: `Block ${i + 1} with a descriptive title`,
      config: configs[i % 6],
      restSeconds: 10,
      advance: i === 0 ? 'ready' : 'automatic',
    }));
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
  }, session);
  await page.reload();
  const trigger = page.getByRole('button', { name: 'Preview Attempt a', exact: true });
  await trigger.click();
  await page.addStyleTag({ content: '::-webkit-scrollbar { width: 18px; }' });
  const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
  await expect(dialog).toContainText('Duration unknown');
  for (const text of [
    'EMOM',
    'Countdown',
    'Intervals',
    'AMRAP',
    'For Time',
    'Ladder',
    'Wait until ready',
  ])
    await expect(dialog).toContainText(text);
  const close = dialog.getByRole('button', { name: 'Close preview', exact: true });
  await expect(close).toBeInViewport({ ratio: 1 });
  await page.locator('.session-preview-body').evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(dialog.getByText('Final block — no transition recovery.')).toBeInViewport({
    ratio: 1,
  });
  await expect(close).toBeInViewport({ ratio: 1 });
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
});

test('library sections align and management toolbar wraps without wasting desktop rows', async ({
  page,
}) => {
  await seed(page);
  const library = await page.locator('.template-library').boundingBox();
  const sessions = await page
    .getByRole('region', { name: 'Saved training sessions', exact: true })
    .boundingBox();
  expect(Math.abs(sessions!.x - library!.x)).toBeLessThanOrEqual(2);
  expect(sessions!.width).toBeGreaterThanOrEqual(library!.width - 2);
  const first = await page
    .getByRole('button', { name: 'Import workout', exact: true })
    .boundingBox();
  const second = await page
    .getByRole('button', { name: 'Manage collections', exact: true })
    .boundingBox();
  expect(Math.abs(first!.y - second!.y)).toBeLessThanOrEqual(2);
  expect(second!.x - first!.x - first!.width).toBeGreaterThanOrEqual(10);
});

for (const entry of ['Preview', 'Open'])
  test(`${entry} protects an edited empty session draft`, async ({ page }) => {
    await seed(page);
    await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
    await page.getByLabel('Session name', { exact: true }).fill('Unsaved empty plan');
    await page.getByRole('button', { name: 'Remove block 1', exact: true }).click();
    await page.getByRole('banner').getByRole('button', { name: 'Home', exact: true }).click();
    await page.getByRole('button', { name: `${entry} Attempt a`, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
    await dialog.getByRole('button', { name: 'Open in editor', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Replace current draft', exact: true }),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Close preview', exact: true }).click();
    await page
      .getByRole('button', { name: /^(Build a session|Continue editing session)$/ })
      .click();
    await expect(page.getByLabel('Session name', { exact: true })).toHaveValue(
      'Unsaved empty plan',
    );
  });
test('failed collection dependency does not imply zero matching sessions', async ({ page }) => {
  await seed(page);
  await page.getByLabel('Collection', { exact: true }).selectOption('unfiled');
  const region = page.getByRole('region', { name: 'Saved training sessions', exact: true });
  await expect(region).toContainText('1 of 1 sessions');
  await page.evaluate(() => {
    localStorage.setItem('nextround.workout-templates.v1', 'invalid');
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(
    region.getByRole('button', { name: 'Retry collections', exact: true }),
  ).toBeVisible();
  await expect(region).not.toContainText('No sessions match your filters');
  await expect(region).not.toContainText('0 of 1 sessions');
  await page.evaluate(() => localStorage.removeItem('nextround.workout-templates.v1'));
  await region.getByRole('button', { name: 'Retry collections', exact: true }).click();
  await expect(region).toContainText('1 of 1 sessions');
});

test('preview cancellation preserves an in-progress first block', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Build a session', exact: true }).click();
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await page.getByRole('banner').getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Preview Attempt a', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Preview saved session', exact: true });
  await dialog.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await expect(
    dialog.getByRole('button', { name: 'Replace current draft', exact: true }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(
    page.getByRole('complementary', { name: 'Session block editor', exact: true }),
  ).toContainText('Editing a Countdown block');
  await expect(
    page.getByRole('button', { name: 'Continue editing session', exact: true }),
  ).toBeVisible();
});
