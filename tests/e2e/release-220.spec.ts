import { expect, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (results) => {
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({
          version: 1,
          sessions: [results[0].session],
          results,
          actuals: {},
          recovery: null,
        }),
      );
    },
    [result220(), result220('b', 1)],
  );
});
test('one-block saved sessions and history use singular counts', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('1 workout block', { exact: true })).toBeVisible();
  await page.goto('/history');
  await expect(page.locator('.session-card').first()).toContainText('1 block ·');
});
test('failed refresh labels cached history and disables export until retry', async ({ page }) => {
  await page.goto('/history');
  const exportButton = page.getByRole('button', { name: 'Export filtered session CSV' });
  await expect(exportButton).toBeEnabled();
  await page.evaluate(() => {
    localStorage.setItem('nextround.training.v1', 'invalid');
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.getByRole('button', { name: 'Retry session history' })).toBeVisible();
  await expect(exportButton).toBeDisabled();
  await expect(
    page.getByText('Cached session history may be out of date.', { exact: false }),
  ).toBeVisible();
  await page.evaluate(
    (results) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [], results, actuals: {}, recovery: null }),
      ),
    [result220()],
  );
  await page.getByRole('button', { name: 'Retry session history' }).click();
  await expect(exportButton).toBeEnabled();
  await expect(page.locator('.session-card')).toHaveCount(1);
});
