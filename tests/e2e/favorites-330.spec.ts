import { expect, test } from '@playwright/test';

const starred = ['pushup', 'squat', 'burpee', 'plank', 'jumping-jack'];
const names = ['Air squat', 'Burpee', 'Jumping jack', 'Plank', 'Push-up'];

test('the picker shows every starred exercise in an open Favorites group', async ({ page }) => {
  await page.addInitScript(
    (ids) =>
      localStorage.setItem('nextround.exercise-favorites.v1', JSON.stringify({ version: 1, ids })),
    starred,
  );
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const favorites = page
    .locator('details.exercise-group')
    .filter({ has: page.locator('summary', { hasText: /^Favorites/ }) });
  await expect(favorites).toHaveAttribute('open', '');
  await expect(favorites.locator('summary span')).toHaveText('5');
  await expect(favorites.locator('.exercise-choice strong')).toHaveText(names);
  await expect(page.getByRole('button', { name: 'My favorites', exact: true })).toHaveCount(0);

  // Starring from a category group adds it straight away; unstarring removes it.
  await page.getByLabel('Search exercises', { exact: true }).fill('mountain climber');
  await page.getByRole('button', { name: 'Favourite Mountain climber', exact: true }).click();
  await expect(favorites.locator('.exercise-choice strong')).toContainText(['Mountain climber']);
  await page.getByLabel('Search exercises', { exact: true }).fill('');
  await expect(favorites.locator('summary span')).toHaveText('6');
  await favorites.getByRole('button', { name: 'Unfavourite Burpee', exact: true }).click();
  await expect(favorites.locator('summary span')).toHaveText('5');

  // Choosing from Favorites adds the movement to the workout.
  await favorites
    .locator('.exercise-choice > button')
    .filter({ has: page.locator('strong', { hasText: /^Plank$/ }) })
    .click();
  await expect(
    page.getByRole('list', { name: 'Ordered exercises' }).locator('h3', { hasText: /^Plank$/ }),
  ).toHaveCount(1);
});
