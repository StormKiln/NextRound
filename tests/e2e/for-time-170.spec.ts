import { expect, test } from '@playwright/test';

test('For Time manual finish pauses confirmation, saves elapsed and repeats a fresh checklist', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a For Time workout' }).click();
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name').fill('Core flow');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Start For Time', exact: true }).click();
  await page.clock.runFor(2250);
  await expect(page.getByTestId('round-clock')).toHaveText('00:02');
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('1 exercise remains unchecked');
  await page.clock.runFor(5000);
  await expect(page.getByTestId('round-clock')).toHaveText('00:02');
  await page.getByRole('button', { name: 'Keep going', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Complete Core flow' }).check();
  await expect(page.getByRole('heading', { name: 'Workout finished' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await page.getByRole('button', { name: 'Finish and review', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout finished' })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results[0],
  );
  expect(saved.outcome).toBe('finished');
  expect(saved.elapsedMs).toBeGreaterThanOrEqual(2250);
  expect(saved.elapsedMs).toBeLessThan(4000);
  await page.getByRole('button', { name: 'Repeat workout', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Complete Core flow' })).not.toBeChecked();
});
test('For Time lead-in disables Finish and cap ends with a distinct saved outcome', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/for-time');
  await page.getByLabel('Use a time cap').check();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('1');
  await page.getByRole('button', { name: 'Start For Time', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Finish workout', exact: true })).toBeDisabled();
  await page.clock.runFor(3200);
  await expect(page.getByRole('heading', { name: 'Time cap reached', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  const result = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results[0],
  );
  expect(result).toMatchObject({ outcome: 'timeCapReached', elapsedMs: 2000 });
});
test('For Time templates and history retain targets and route back to their own setup', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/for-time');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByLabel('Use a time cap').check();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('bear plank');
  await page.getByRole('button', { name: /^Bear-plank hold / }).click();
  await page.getByRole('button', { name: 'Set target for Bear-plank hold' }).click();
  await page.getByLabel('Target amount').fill('20');
  await expect(page.getByRole('dialog')).toContainText('one pass');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Core for time');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Load Core for time', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start For Time', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start For Time', exact: true }).click();
  await page.clock.runFor(1200);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await page.getByRole('button', { name: 'View history', exact: true }).click();
  await page.getByRole('button', { name: /^View result: For Time/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Time cap reached');
  await expect(page.getByRole('dialog')).toContainText('20 sec');
  await expect(page.getByRole('dialog')).toContainText('Not checked off');
  await page.getByRole('button', { name: 'Repeat from setup', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Start For Time', exact: true })).toBeVisible();
});
test('For Time long checklist and Finish dialog remain usable at minimum size', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/for-time');
  await page.getByLabel('Lead-in seconds').fill('0');
  for (let i = 0; i < 8; i++) {
    await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
    await page.getByLabel('Exercise name').fill(`Movement ${i} with a long description and target`);
    await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Start For Time', exact: true }).click();
  await expect(page.getByTestId('round-clock')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Finish workout', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.getByRole('button', { name: 'Finish workout', exact: true }).click();
  await page.screenshot({ path: info.outputPath('finish-minimum.png') });
  await expect(page.getByRole('button', { name: 'Finish and review', exact: true })).toBeInViewport(
    { ratio: 1 },
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Pause workout' })).toBeVisible();
});
