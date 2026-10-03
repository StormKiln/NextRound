import { expect, test } from '@playwright/test';

test('cancel keyboard reorder preserves intervening target edits', async ({ page }) => {
  await page.goto('/emom');
  const handle = page.getByRole('button', { name: 'Reorder Push-up', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Edit target for Push-up', exact: true }).click();
  await page.getByLabel('Target amount', { exact: true }).fill('12');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await handle.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('exercise-entry').filter({ hasText: 'Push-up' })).toContainText(
    '12 Reps',
  );
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
});

for (const [path, label] of [
  ['/emom', 'Total minutes'],
  ['/countdown', 'Minutes'],
  ['/intervals', 'Work seconds'],
]) {
  test(`saved feedback clears after editing ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.getByRole('button', { name: 'Save workout', exact: true }).click();
    await page.getByLabel('Workout name').fill('Original');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Workout saved.', { exact: true })).toBeVisible();
    await page.getByLabel(label, { exact: true }).fill('9');
    await expect(page.getByText('Workout saved.', { exact: true })).toHaveCount(0);
  });
}

test('picker distinguishes deferred loading and failed load from no matches', async ({ page }) => {
  await page.route('**/src/data/exercises.ts', async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      'return exercises;',
      `await new Promise(resolve => setTimeout(resolve, 5000)); throw new Error('Library unavailable');`,
    );
    await route.fulfill({ response, body });
  });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByText('Loading exercises…')).toBeVisible();
  await expect(page.getByText(/No matching exercises/)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Retry loading exercises' })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText(/No matching exercises/)).toHaveCount(0);
});

test('cancelling reorder preserves additions and removals', async ({ page }) => {
  await page.goto('/emom');
  const handle = page.getByRole('button', { name: 'Reorder Push-up', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.getByRole('button', { name: 'Remove Air squat', exact: true }).click();
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('New movement');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await handle.focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Remove Air squat', exact: true })).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Remove New movement', exact: true }),
  ).toBeVisible();
});
