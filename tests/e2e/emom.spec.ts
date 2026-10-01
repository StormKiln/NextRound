import { expect, test } from '@playwright/test';

test('custom exercises can be added, reordered and removed', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Custom exercise' }).click();
  await page.getByLabel('Exercise name').fill('My movement');
  await page.getByLabel('Description (optional)').fill('Five careful repetitions');
  await page.getByRole('button', { name: 'Add custom exercise' }).click();
  await expect(page.getByRole('heading', { name: 'My movement' })).toBeVisible();
  await page.getByRole('button', { name: 'Reorder My movement' }).focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('exercise-entry').nth(2)).toContainText('My movement');
  await page.getByRole('button', { name: 'Remove My movement' }).click();
  await expect(page.getByRole('heading', { name: 'My movement' })).toHaveCount(0);
});

test('lead-in, round and total clocks, pause, completion and repeat', async ({ page }) => {
  test.setTimeout(90000);
  await page.clock.install();
  await page.goto('/emom');
  await page.clock.runFor(3200);
  await page.getByLabel('Total minutes').fill('1');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByTestId('total-clock')).toHaveText('01:00');
  await page.clock.runFor(2000);
  await expect(page.getByTestId('round-clock')).toHaveText('01:00');
  await page.clock.runFor(10000);
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await page.clock.runFor(5000);
  await expect(page.getByTestId('round-clock')).toHaveText('00:50');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(51000);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.getByRole('button', { name: 'Repeat workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
});

test('invalid inputs are explained and stop preserves the draft', async ({ page }) => {
  await page.goto('/emom');
  await page.getByLabel('Total minutes').fill('0');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByText('Choose a whole number from 1 to 1440.')).toBeVisible();
  await page.getByLabel('Total minutes').fill('5');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await page.getByRole('button', { name: 'Stop workout' }).click();
  await page.getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByLabel('Total minutes')).toHaveValue('5');
});

test('empty exercise list, blank Custom names and invalid warnings are rejected', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Custom exercise' }).click();
  await page.getByLabel('Exercise name').fill('   ');
  await page.getByRole('button', { name: 'Add custom exercise' }).click();
  await expect(page.getByText('Give your exercise a name.')).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByLabel('Warning seconds').fill('60');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByText('Choose a whole number from 0 to 59.')).toBeVisible();
  await page.getByLabel('Warning seconds').fill('0');
  for (const name of ['Air squat', 'Push-up', 'Sit-up'])
    await page.getByRole('button', { name: `Remove ${name}` }).click();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('alert')).toContainText('Add 1–100 exercises');
});

test('exercise search, uneven rotation and long custom descriptions work in narrow windows', async ({
  page,
}) => {
  await page.setViewportSize({ width: 780, height: 1000 });
  await page.goto('/emom');
  await page.getByLabel('Total minutes').fill('5');
  await expect(page.getByText('2 rounds')).toHaveCount(2);
  await expect(page.getByText('1 round', { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('does not exist');
  await expect(page.getByText(/No matching exercises/)).toBeVisible();
  await page.getByLabel('Search exercises').fill('plank');
  await page.getByRole('button', { name: /Plank Brace/ }).click();
  await expect(page.getByRole('heading', { name: 'Plank', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Custom exercise' }).click();
  await page.getByLabel('Exercise name').fill('Long custom movement '.repeat(5));
  await page.getByLabel('Description (optional)').fill('Controlled repetitions. '.repeat(70));
  await page.getByRole('button', { name: 'Add custom exercise' }).click();
  await expect(page.getByTestId('exercise-entry')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('zero lead-in starts immediately, Escape keeps the workout active, stop can be dismissed', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByLabel('Warning seconds').fill('0');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('heading', { name: 'Air squat', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Pause workout' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop workout' }).click();
  await page.getByRole('button', { name: 'Keep going' }).click();
  await expect(page.getByRole('button', { name: 'Pause workout' })).toBeVisible();
});
