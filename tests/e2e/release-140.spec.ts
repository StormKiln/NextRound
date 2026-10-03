import { expect, test } from '@playwright/test';

test('AMRAP records explicit mixed-unit progress, corrections and history and repeats from setup', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Build an AMRAP' }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('8');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Remove Push-up', exact: true }).click();
  await page.getByRole('button', { name: 'Remove Sit-up', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('rowing');
  await page.getByRole('button', { name: /^Rowing machine / }).click();
  await page.getByRole('button', { name: 'Edit target for Rowing machine', exact: true }).click();
  await page.getByLabel('Target unit').selectOption('metres');
  await page.getByLabel('Target amount').fill('100');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await page.getByRole('button', { name: 'Start AMRAP' }).click();
  await expect(page.getByRole('button', { name: 'Complete movement', exact: true })).toBeDisabled();
  await page.clock.runFor(2100);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await page.getByRole('button', { name: 'Complete movement', exact: true }).click();
  await page.getByRole('button', { name: 'Undo movement', exact: true }).click();
  await page.getByLabel('Partial progress for Rowing machine (metres)').fill('40');
  await expect(page.getByRole('status')).toContainText('40 m of Rowing machine');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(8100);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByLabel('Partial progress for Rowing machine (metres)').fill('50');
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: /^View result: AMRAP/ }).click();
  await expect(page.getByRole('dialog')).toContainText('50 m of Rowing machine');
  await page.getByRole('button', { name: 'Repeat from setup' }).click();
  await expect(page).toHaveURL(/\/amrap$/);
  await expect(page.getByRole('button', { name: 'Start AMRAP' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Workout history' }).click();
  await page.getByRole('button', { name: /^View result: AMRAP/ }).click();
  await expect(page.getByRole('dialog')).toContainText('50 m of Rowing machine');
});
for (const mode of ['emom', 'countdown', 'intervals', 'amrap']) {
  test(`${mode} pauses during Stop confirmation and keeps an already paused workout paused`, async ({
    page,
  }) => {
    await page.clock.install();
    await page.goto(`/${mode}`);
    await page.getByLabel('Lead-in seconds').fill('0');
    await page.getByRole('button', { name: /^Start (workout|countdown|intervals|AMRAP)$/ }).click();
    await page.clock.runFor(1000);
    await page.getByRole('button', { name: 'Stop workout', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    const time = await page.getByTestId('round-clock').textContent();
    // Cross a round boundary without replaying every polling tick on slow CI runners.
    await page.clock.fastForward(70000);
    await expect(page.getByTestId('round-clock')).toHaveText(time ?? 'missing clock');
    await page.getByRole('button', { name: 'Keep going' }).click();
    await expect(page.getByRole('button', { name: 'Pause workout' })).toBeVisible();
    await page.getByRole('button', { name: 'Pause workout' }).click();
    await page.getByRole('button', { name: 'Stop workout', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Resume workout' })).toBeVisible();
    await page.getByRole('button', { name: 'Stop workout', exact: true }).click();
    await page.getByRole('button', { name: 'End workout' }).click();
    await expect(page).toHaveURL(new RegExp(`/${mode}$`));
  });
}
test('EMOM additions have targets, uneven rotations warn and long lists scroll independently', async ({
  page,
}) => {
  await page.goto('/emom');
  await expect(page.getByRole('button', { name: 'Edit target for Air squat' })).toBeVisible();
  await page.getByLabel('Total minutes').fill('16');
  await expect(page.getByText(/Uneven rotation:/)).toBeVisible();
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
    await page.getByLabel('Exercise name').fill(`Custom ${i}`);
    await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  }
  const list = page.getByRole('list', { name: 'Ordered exercises' });
  expect(await list.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  const add = page.getByRole('button', { name: 'Add exercise', exact: true });
  await add.scrollIntoViewIfNeeded();
  await expect(add).toBeInViewport();
  await list.evaluate((e) => {
    e.scrollTop = 0;
  });
  await expect(add).toBeInViewport();
  await list.evaluate((e) => {
    e.scrollTop = e.scrollHeight;
  });
  await expect(add).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Edit target for Custom 9', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Total minutes').fill('2');
  await expect(page.getByText(/will not run/)).toBeVisible();
});
for (const viewport of [
  { width: 760, height: 620 },
  { width: 1180, height: 820 },
]) {
  test(`AMRAP keeps its timer and controls visible at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/amrap');
    for (let i = 0; i < 10; i++) {
      await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
      await page.getByLabel('Exercise name').fill(`Circuit movement ${i}`);
      await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
    }
    await page.getByLabel('Lead-in seconds').fill('0');
    await page.getByRole('button', { name: 'Start AMRAP', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Pause workout' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole('button', { name: 'Stop workout', exact: true })).toBeInViewport({
      ratio: 1,
    });
    await expect(page.getByTestId('round-clock')).toBeInViewport({ ratio: 1 });
    await page
      .getByRole('button', { name: 'Complete movement', exact: true })
      .scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Complete movement', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toContainText('1 completed movement');
    await page.getByLabel('Partial progress for Push-up (reps)').focus();
    await page.keyboard.press('ArrowUp');
    await expect(page.getByLabel('Partial progress for Push-up (reps)')).toHaveValue('1');
    await expect(page.getByRole('button', { name: 'Pause workout' })).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('round-clock')).toBeInViewport({ ratio: 1 });
  });
}
