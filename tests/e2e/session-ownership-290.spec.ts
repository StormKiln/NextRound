import { expect, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

// Dev-server integration: set a pending native-operation boundary in the real store.
// Production behavior remains unchanged; no test hook is shipped in app code.
test('refused duplicate and removal preserve draft and announce only refusal', async ({ page }) => {
  await page.goto('/');
  const s = result220().session;
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [s], results: [], actuals: {}, recovery: null }),
      ),
    s,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await page.getByRole('button', { name: 'Duplicate block 1', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Duplicated');
  await page.evaluate(async () => {
    const path = '/src/state/workout.ts';
    const { useWorkout } = await import(path);
    useWorkout.setState({ busy: true });
  });
  for (const name of ['Duplicate block 1', 'Remove block 1']) {
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Finish the active workout');
    await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(2);
    await expect(page.getByRole('status')).toHaveCount(0);
  }
});
