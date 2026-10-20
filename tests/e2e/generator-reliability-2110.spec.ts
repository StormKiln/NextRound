import { expect, test } from '@playwright/test';

test('Retry recovers failed session history without closing or overwriting data', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem('nextround.training.v1', '{broken'));
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'Most used', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Create a workout', exact: true });
  await expect(d.getByRole('alert')).toContainText('could not be loaded');
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe('{broken');
  await page.evaluate(() => localStorage.removeItem('nextround.training.v1'));
  await d.getByRole('button', { name: 'Retry workout suggestions', exact: true }).click();
  await expect(d.getByRole('button', { name: 'Generate workout', exact: true })).toBeEnabled();
  await d.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(3);
});
test('replacement generator focuses count and blocks changed source', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'Try something new', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Create a workout', exact: true });
  await expect(d.getByLabel('Number of exercises', { exact: true })).toBeFocused();
  await page.evaluate(async () => {
    const path = '/src/state/workout.ts';
    const { useWorkout } = await import(path);
    useWorkout.getState().setDraft({ exercises: [{ id: 'current', name: 'Keep my edit' }] });
  });
  await expect(d.getByRole('alert')).toContainText('workout changed');
  await expect(d.getByRole('button', { name: 'Generate workout', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' })).toContainText('Keep my edit');
});
