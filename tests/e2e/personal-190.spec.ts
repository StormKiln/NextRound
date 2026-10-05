import { expect, test } from '@playwright/test';

test('Custom name corrections clear validation without stealing focus', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Give your exercise a name');
  await page.getByLabel('Exercise name', { exact: true }).fill('My movement');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByLabel('Exercise name', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('personal library creates, edits, archives, restores and preserves draft snapshots', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.getByRole('button', { name: 'My exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Café squat');
  await page.getByLabel('Description (optional)', { exact: true }).fill('My original cue');
  await page.getByLabel('Category', { exact: true }).selectOption('Squats');
  await page.getByLabel('Legs', { exact: true }).check();
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Café squat', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Café squat', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build an EMOM', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises', { exact: true }).fill('Cafe\u0301 squat');
  await page.getByRole('button', { name: /^Café squat / }).click();
  await expect(page.getByRole('dialog', { name: 'Target for Café squat' })).toBeVisible();
  await page.getByLabel('Target amount').fill('8');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByTestId('exercise-entry').filter({ hasText: 'Café squat' })).toContainText(
    '8 Reps',
  );
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Manage my exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Café squat', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Renamed squat');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Archive Renamed squat', exact: true }).click();
  await page.getByLabel('Show archived exercises').check();
  await page.getByRole('button', { name: 'Restore Renamed squat', exact: true }).click();
  await page.getByRole('button', { name: 'Back to picker', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('exercise-entry').filter({ hasText: 'Café squat' })).toContainText(
    'My original cue',
  );
});
test('corrupt personal library retains bundled picker choices and disables personal writes', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.personal-exercises.v1', '{broken'),
  );
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(
    page.getByText(
      'Personal exercises could not be loaded. Bundled exercises are still available.',
    ),
  ).toBeVisible();
  await page.getByLabel('Search exercises', { exact: true }).fill('Air squat');
  await expect(page.getByRole('button', { name: /^Air squat / })).toBeVisible();
  await page.getByRole('button', { name: 'Manage my exercises', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create exercise', exact: true })).toBeDisabled();
});
test('a required personal target is collected before adding and cancelling keeps the draft unchanged', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:reps',
            name: 'My reps',
            description: '',
            category: 'Squats',
            equipment: [],
            targetAreas: [],
            supportedUnits: ['reps'],
            archived: false,
          },
        ],
      }),
    ),
  );
  await page.goto('/emom');
  await expect(page.getByRole('button', { name: 'Add exercise', exact: true })).toBeVisible();
  const before = await page.getByTestId('exercise-entry').count();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My reps');
  await page.getByRole('button', { name: /^My reps / }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByTestId('exercise-entry')).toHaveCount(before);
});
test('explicit custom save retries without duplicates and bundled copies get new identities', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Local movement');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem('nextround.personal-exercises.v1')),
  ).toBeNull();
  await page.getByRole('button', { name: 'Save Local movement to library', exact: true }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'nextround.personal-exercises.v1') {
        Storage.prototype.setItem = original;
        throw Error('Disk full');
      }
      return original.call(this, k, v);
    };
  });
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('Local movement');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.personal-exercises.v1') ?? '{}').exercises,
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toMatch(/^personal:/);
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'My exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Copy a bundled exercise', exact: true }).click();
  await page.getByLabel('Search my exercise library').fill('Air squat');
  await page.getByRole('button', { name: 'Copy Air squat', exact: true }).click();
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  const copies = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.personal-exercises.v1') ?? '{}').exercises,
  );
  expect(copies).toHaveLength(2);
  expect(copies[1].sourceId).toBe('squat');
  expect(copies[1].id).not.toBe('squat');
});
for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder'])
  test(`personal defaults and snapshots work in ${mode}`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'nextround.personal-exercises.v1',
        JSON.stringify({
          version: 1,
          exercises: [
            {
              id: 'personal:a',
              name: 'My row',
              description: 'Personal cue',
              category: 'Other bodyweight',
              equipment: [],
              targetAreas: ['core'],
              supportedUnits: ['reps'],
              defaultTarget: { unit: 'reps', value: 7 },
              archived: false,
            },
          ],
        }),
      ),
    );
    await page.goto(`/${mode}`);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Search exercises').fill('My row');
    await page.getByRole('button', { name: /^My row / }).click();
    const row = page.getByTestId('exercise-entry').filter({ hasText: 'My row' });
    await expect(row).toContainText('Personal cue');
    if (mode === 'ladder') {
      await expect(row.getByText('7 Reps')).toHaveCount(0);
    } else await expect(row).toContainText('7 Reps');
  });
test('personal form reports stale edits without dropping changes and leaves keyboard controls reachable', async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:a',
            name: 'Original',
            description: '',
            category: 'Squats',
            equipment: [],
            targetAreas: [],
            supportedUnits: ['reps'],
            archived: false,
          },
        ],
      }),
    ),
  );
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit Original', exact: true }).click();
  await page.addStyleTag({
    content:
      '.personal-form-body{scrollbar-gutter:stable both-edges}::-webkit-scrollbar{width:18px}',
  });
  await page.getByLabel('Exercise name', { exact: true }).fill('My unsaved edit');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.personal-exercises.v1') ?? '{}');
    d.exercises[0].description = 'Concurrent edit';
    localStorage.setItem('nextround.personal-exercises.v1', JSON.stringify(d));
  });
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('My unsaved edit');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Save exercise', exact: true })).toBeFocused();
  const bounds = await page
    .getByRole('button', { name: 'Save exercise', exact: true })
    .boundingBox();
  expect(bounds && bounds.x >= 0 && bounds.y + bounds.height <= 620).toBeTruthy();
  await page.screenshot({ path: info.outputPath('personal-form-minimum.png') });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('saved-workout search finds equivalent Unicode while keeping distinct IDs', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 1,
        templates: ['a', 'b'].map((id) => ({
          id,
          name: 'Café workout',
          config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 3 },
        })),
      }),
    ),
  );
  await page.goto('/');
  await page.getByLabel('Search saved workouts').fill('Cafe\u0301');
  await expect(page.getByRole('button', { name: 'Load Café workout', exact: true })).toHaveCount(2);
});
test('empty picker Custom entry clears a cancelled validation error', async ({ page }) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Give your exercise a name');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('No such movement xyz');
  await page.getByRole('button', { name: 'Add a custom exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('closing and reopening after a personal conflict loads the current record', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:a',
            name: 'Original',
            description: '',
            category: 'Squats',
            equipment: [],
            targetAreas: [],
            supportedUnits: ['reps'],
            archived: false,
          },
        ],
      }),
    ),
  );
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit Original', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('My edit');
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.personal-exercises.v1') ?? '{}');
    d.exercises[0].description = 'Concurrent cue';
    localStorage.setItem('nextround.personal-exercises.v1', JSON.stringify(d));
  });
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Original', exact: true }).click();
  await expect(page.getByLabel('Description (optional)', { exact: true })).toHaveValue(
    'Concurrent cue',
  );
  await page.getByLabel('Exercise name', { exact: true }).fill('My edit');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
