import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page) {
  await page.goto('/');
  const a = result220().session;
  a.favourite = true;
  const b = result220('b').session;
  b.name = 'Zulu';
  b.blocks[0].config.durationSeconds = 60;
  await page.evaluate(
    ([a, b]) => {
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [a, b], results: [], actuals: {}, recovery: null }),
      );
      localStorage.setItem(
        'nextround.workout-templates.v1',
        JSON.stringify({
          version: 2,
          templates: [
            { id: 't1', name: 'Alpha workout', config: a.blocks[0].config },
            { id: 't2', name: 'Zulu workout', config: b.blocks[0].config },
          ],
          collections: [],
        }),
      );
    },
    [a, b],
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Attempt a', exact: true })).toBeEnabled();
}
test('shared sorting and filter reset preserve data and chosen order', async ({ page }) => {
  await seed(page);
  const before = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  const sort = page.getByLabel('Sort saved library');
  await expect(page.locator('.session-card h3')).toHaveText(['Zulu', 'Attempt a']);
  await sort.selectOption('name');
  await expect(page.locator('.session-card h3')).toHaveText(['Attempt a', 'Zulu']);
  await sort.selectOption('duration');
  await page.getByLabel('Search saved workouts', { exact: true }).fill('Attempt');
  await page.getByRole('button', { name: 'Clear library filters', exact: true }).last().click();
  await expect(sort).toHaveValue('duration');
  await expect(page.locator('.session-card h3')).toHaveText(['Attempt a', 'Zulu']);
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(before);
});
test('hidden session copy offers explicit reveal and preserves sort', async ({ page }) => {
  await seed(page);
  await page.getByLabel('Sort saved library').selectOption('name');
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page
    .locator('.session-card')
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();
  await expect(
    page.getByText('hidden by your current library filters', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.session-card')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Show session — clear library filters', exact: true })
    .click();
  await expect(page.locator('.session-card')).toHaveCount(3);
  await expect(page.getByLabel('Sort saved library')).toHaveValue('name');
  await expect(page.locator('.session-card:focus')).toContainText('Attempt a');
});
test('remove final session block keeps focus and Undo restores it', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Remove block 1', exact: true });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Add EMOM block', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Removed Work');
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
  await expect(page.getByLabel('Session blocks')).toContainText('Work');
});
