import { expect, test } from '@playwright/test';

const personal = {
  id: 'personal:1180',
  name: 'My push-up',
  description: 'A personal movement',
  category: 'Push-ups',
  equipment: [],
  targetAreas: [],
  supportedUnits: ['reps'],
  archived: false,
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript((entry) => {
    if (!localStorage.getItem('nextround.personal-exercises.v1')) {
      localStorage.setItem(
        'nextround.personal-exercises.v1',
        JSON.stringify({ version: 1, exercises: [entry] }),
      );
    }
  }, personal);
});
test('personal name variants match the picker and empty search has recovery', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByLabel('Search my exercise library').fill('pushup');
  await expect(page.getByRole('button', { name: 'Edit My push-up', exact: true })).toBeVisible();
  await page.getByLabel('Search my exercise library').fill('no-match-1180');
  await page.getByRole('button', { name: 'Clear exercise search', exact: true }).click();
  await expect(page.getByLabel('Search my exercise library')).toHaveValue('');
});
test('renaming out of the active filter returns focus to library search', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByLabel('Search my exercise library').fill('My push-up');
  await page.getByRole('button', { name: 'Edit My push-up', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('New movement');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Search my exercise library')).toBeFocused();
});

test('stars persist, compose with search and return focus when the last favourite disappears', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My push-up');
  const star = page.getByRole('button', { name: 'Favourite My push-up', exact: true });
  await star.click();
  await expect(
    page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My push-up');
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }).click();
  await expect(page.getByLabel('Search exercises')).toBeFocused();
  await expect(
    page.getByRole('heading', { name: 'No matching exercises.', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Show all favourites and non-favourites', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Favourite My push-up', exact: true }),
  ).toBeVisible();
});
for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`starred generation respects the chosen count without history in ${mode}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        'nextround.exercise-favorites.v1',
        JSON.stringify({ version: 1, ids: ['pushup', 'squat', 'personal:archived'] }),
      );
      localStorage.setItem('nextround.workout-history.v1', '{broken');
    });
    await page.goto(`/${mode}`);
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    await expect(page.getByRole('button', { name: 'Create a workout', exact: true })).toBeVisible();
    await expect(list.locator('h3')).toHaveCount(
      ['emom', 'intervals', 'amrap'].includes(mode) ? 3 : 0,
    );
    const before = await list.locator('h3').allTextContents();
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page.getByRole('button', { name: 'My favorites', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create a workout' });
    await dialog.getByLabel('Number of exercises').fill('3');
    await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Only 2 eligible exercises');
    await dialog.getByLabel('Number of exercises').fill('2');
    await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
    await expect(list.locator('h3')).toHaveText(['Air squat', 'Push-up']);
    await page.getByRole('button', { name: 'Undo generated workout', exact: true }).click();
    await expect(list.locator('h3')).toHaveText(before);
  });
}
test('unreadable favourite preferences preserve data and leave manual selection usable', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.exercise-favorites.v1', '{broken'),
  );
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry exercise favourites' })).toBeVisible();
  await page.getByLabel('Search exercises').fill('My push-up');
  await expect(
    page.getByRole('button', { name: 'Favourite My push-up', exact: true }),
  ).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('nextround.exercise-favorites.v1'))).toBe(
    '{broken',
  );
  await page.evaluate(() => localStorage.removeItem('nextround.exercise-favorites.v1'));
  await page.getByRole('button', { name: 'Retry exercise favourites' }).click();
  await expect(
    page.getByRole('button', { name: 'Favourite My push-up', exact: true }),
  ).toBeEnabled();
});

test('failed star writes preserve the selected state and recover without losing preferences', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My push-up');
  await page.getByRole('button', { name: 'Favourite My push-up', exact: true }).click();
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.exercise-favorites.v1') throw new Error('disk full');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/Exercise favourites could not be saved/)).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('nextround.exercise-favorites.v1')!).ids,
    ),
  ).toEqual(['personal:1180']);
  await page.reload();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My push-up');
  await page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Favourite My push-up', exact: true }),
  ).toBeEnabled();
});

test('stars retain personal identity across archive and restore without transferring to a copy', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['personal:1180'] }),
    );
    const doc = JSON.parse(localStorage.getItem('nextround.personal-exercises.v1')!);
    if (doc.exercises.some((entry: { id: string }) => entry.id === 'personal:copy1180')) return;
    doc.exercises[0].archived = true;
    doc.exercises.push({
      ...doc.exercises[0],
      id: 'personal:copy1180',
      name: 'Copied movement',
      archived: false,
    });
    localStorage.setItem('nextround.personal-exercises.v1', JSON.stringify(doc));
  });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Favourites only', { exact: true }).check();
  await expect(
    page.getByRole('heading', { name: 'No matching exercises.', exact: true }),
  ).toBeVisible();
  await page.goto('/exercises');
  await page.getByLabel('Show archived exercises').check();
  await page.getByRole('button', { name: 'Restore My push-up', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Archive My push-up', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build an EMOM', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page.getByLabel('Search exercises').fill('My push-up');
  await expect(
    page.getByRole('button', { name: 'Unfavourite My push-up', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Favourite Copied movement', exact: true }),
  ).toHaveCount(0);
});

test('single suggestions use stars without history and new entries obey equipment and Ladder limits', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['cat-cow', 'dumbbell-suitcase-carry', 'childs-pose'] }),
    );
    localStorage.setItem('nextround.workout-history.v1', '{broken');
  });
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add suggested Cat-cow', exact: true }),
  ).toBeVisible();
  await page.getByLabel('Show all equipment', { exact: true }).uncheck();
  await expect(
    page.getByRole('button', { name: 'Add suggested Dumbbell suitcase carry', exact: true }),
  ).toHaveCount(0);
  await page.goto('/ladder');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a workout' });
  await dialog.getByLabel('Number of exercises').fill('2');
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Only 1 eligible exercise');
});
