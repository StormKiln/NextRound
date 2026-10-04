import { expect, test } from '@playwright/test';

test('history filters combine, preserve detail context, and delete only the selected ID', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({
        version: 1,
        results: [
          {
            id: 'keep',
            completedAt: 1000,
            elapsedMs: 60000,
            checkedExerciseIds: [],
            config: {
              minutes: 1,
              leadInSeconds: 0,
              warningSeconds: 0,
              exercises: [{ id: 'a', name: 'Squat' }],
            },
          },
          {
            id: 'delete',
            completedAt: 2000,
            elapsedMs: 30000,
            checkedExerciseIds: [],
            config: {
              type: 'countdown',
              durationSeconds: 30,
              leadInSeconds: 0,
              warningSeconds: 0,
              exercises: [{ id: 'b', name: 'Custom movement', description: 'Slow tempo' }],
            },
          },
        ],
      }),
    ),
  );
  await page.goto('/history');
  await page.getByLabel('Workout type', { exact: true }).selectOption('countdown');
  await page.getByLabel('Search history', { exact: true }).fill(' slow  tempo ');
  await expect(page.getByRole('button', { name: /View result:/ })).toHaveCount(1);
  await page.getByRole('button', { name: /View result:/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByLabel('Search history', { exact: true })).toHaveValue(' slow  tempo ');
  await page.getByRole('button', { name: /Delete result:/ }).click();
  await page.getByRole('button', { name: 'Delete permanently', exact: true }).click();
  await expect(page.getByText('No results match these filters.')).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results.map(
        (r: { id: string }) => r.id,
      ),
    ),
  ).toEqual(['keep']);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.getByRole('button', { name: /View result: EMOM/ })).toBeVisible();
});
