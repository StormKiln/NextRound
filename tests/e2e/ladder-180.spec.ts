import { expect, test } from '@playwright/test';

test('Ladder preview, undo, final confirmation and immutable history', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a Ladder' }).click();
  await page.getByLabel('Pattern', { exact: true }).selectOption('pyramid');
  await page.getByLabel('Rungs to peak', { exact: true }).fill('2');
  await expect(page.getByTestId('ladder-preview')).toContainText('2 → 4 → 2');
  await page.getByLabel('Pattern', { exact: true }).selectOption('ascending');
  await page.getByLabel('Rungs', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name').fill('Test squat');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Start Ladder', exact: true }).click();
  await page.clock.runFor(1200);
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('paused');
  await page.clock.runFor(4000);
  await expect(page.getByTestId('round-clock')).toHaveText('00:01');
  await page.getByRole('button', { name: 'Keep going', exact: true }).click();
  await page.getByRole('button', { name: 'Undo movement', exact: true }).click();
  await expect(page.getByTestId('ladder-progress')).toContainText('0 of 1 movements');
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await page.getByRole('button', { name: 'Finish and review', exact: true }).click();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  const r = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results[0],
  );
  expect(r).toMatchObject({
    outcome: 'finished',
    ladderCompletedMovements: 1,
    config: { type: 'ladder' },
  });
  await page.getByRole('button', { name: 'Repeat from setup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start Ladder', exact: true })).toBeVisible();
});

test('Ladder filters non-rep exercises and preserves partial progress at the cap in a small window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.clock.install();
  await page.goto('/ladder');
  await page.getByLabel('Pattern', { exact: true }).selectOption('descending');
  await page.getByLabel('Starting reps', { exact: true }).fill('6');
  await page.getByLabel('Rungs', { exact: true }).fill('3');
  await expect(page.getByTestId('ladder-preview')).toContainText('6 → 4 → 2');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('rowing');
  await expect(page.getByRole('button', { name: /^Rowing machine/ })).toHaveCount(0);
  await page.getByLabel('Search exercises').fill('push-up');
  await page.getByRole('button', { name: /^Push-up / }).click();
  await page.getByLabel('Use a time cap').check();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('3');
  await page.getByLabel('Lead-in seconds').fill('1');
  await page.getByRole('button', { name: 'Start Ladder', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Complete movement', exact: true })).toBeDisabled();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await expect(page.getByTestId('ladder-progress')).toContainText('1 of 3 rungs completed');
  await page.getByRole('button', { name: 'Undo movement', exact: true }).click();
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await page.clock.runFor(3000);
  await expect(page.getByRole('heading', { name: 'Time cap reached', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  const r = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results[0],
  );
  expect(r).toMatchObject({
    outcome: 'timeCapReached',
    ladderCompletedMovements: 1,
    elapsedMs: 3000,
  });
  await page.screenshot({ path: '/tmp/nextround-180-ladder-cap.png', fullPage: true });
  await page.getByRole('button', { name: 'Repeat from setup', exact: true }).click();
  await page.screenshot({ path: '/tmp/nextround-180-ladder-setup-small.png', fullPage: true });
});
