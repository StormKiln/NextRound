import { expect, test } from '@playwright/test';

test('loaded workouts update in place; stale updates preserve edits and allow save as new', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 1,
        templates: [
          {
            id: 'original',
            name: 'My timer',
            config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 3 },
          },
        ],
      }),
    ),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Load My timer', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('2');
  await page.getByRole('button', { name: 'Update saved workout', exact: true }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByText('Workout saved.', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? 'null').templates,
    ),
  ).toMatchObject([{ id: 'original', config: { durationSeconds: 120 } }]);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? 'null');
    d.templates[0].name = 'External edit';
    localStorage.setItem('nextround.workout-templates.v1', JSON.stringify(d));
  });
  await page.getByLabel('Minutes', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Update saved workout', exact: true }).click();
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await page.getByRole('dialog').getByRole('button', { name: 'Save as new', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const templates = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? 'null').templates,
  );
  expect(templates).toHaveLength(2);
  expect(templates[0]).toMatchObject({
    id: 'original',
    name: 'External edit',
    config: { durationSeconds: 120 },
  });
  expect(templates[1].config.durationSeconds).toBe(180);
});
