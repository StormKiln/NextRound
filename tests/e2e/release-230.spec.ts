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
