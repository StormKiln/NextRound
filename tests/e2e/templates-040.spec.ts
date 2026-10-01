import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
test('saved countdown survives reload, loads an isolated draft, searches, renames and deletes', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('7');
  await page.getByLabel('Show completion checkboxes').uncheck();
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Recovery');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Workout saved.', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.reload();
  await page.getByLabel('Search saved workouts').fill('missing');
  await expect(page.getByText('No saved workouts match your search.')).toBeVisible();
  await page.getByLabel('Search saved workouts').fill('recovery');
  await page.getByRole('button', { name: 'Load Recovery', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toHaveValue('7');
  await expect(page.getByLabel('Show completion checkboxes')).not.toBeChecked();
  await page.getByLabel('Minutes', { exact: true }).fill('9');
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), key);
  expect(stored.templates[0].config.durationSeconds).toBe(420);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Rename Recovery', exact: true }).click();
  await page.getByLabel('Workout name').fill('Easy day');
  await page.getByRole('button', { name: 'Save name', exact: true }).click();
  await page.getByRole('button', { name: 'Delete Easy day', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Easy day', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Delete Easy day', exact: true }).click();
  await page.getByRole('button', { name: 'Delete workout', exact: true }).click();
  await page.reload();
  await expect(
    page.getByText('Save a workout from any workout setup to see it here.'),
  ).toBeVisible();
});
test('future saved template schema reports an error and cannot be overwritten by saving', async ({
  page,
}) => {
  await page.goto('/');
  const raw = JSON.stringify({ version: 99, templates: [] });
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('version is unsupported');
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('New');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('version is unsupported');
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(raw);
});
