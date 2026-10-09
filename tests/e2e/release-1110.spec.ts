import { expect, test } from '@playwright/test';

test('generator focuses invalid counts and returns from equipment settings with its draft', async ({
  page,
}) => {
  await page.goto('/emom');
  const list = page.getByRole('list', { name: 'Ordered exercises' });
  await expect(list.locator('li')).toHaveCount(3);
  const before = await list.locator('h3').allTextContents();
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'Mix It Up', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a workout' });
  const count = dialog.getByLabel('Number of exercises');
  for (const value of ['', '0', '1.5', '101']) {
    await count.fill(value);
    await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
    await expect(count).toBeFocused();
    await expect(count).toHaveAttribute('aria-invalid', 'true');
  }
  await count.fill('100');
  await dialog.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await settings.getByRole('button', { name: 'Close Settings' }).click();
  await expect(count).toHaveValue('100');
  await expect(dialog.getByText('Mix It Up', { exact: true })).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Change equipment settings', exact: true }),
  ).toBeFocused();
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('eligible exercises');
  await expect(count).toBeFocused();
  await dialog.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await settings.getByRole('button', { name: 'Use all equipment', exact: true }).click();
  await settings.getByRole('button', { name: 'Close Settings' }).click();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await list.locator('h3').allTextContents()).toEqual(before);
});

test('comparison returns focus to its history origin, or the heading if removed', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({
        version: 1,
        results: [
          {
            id: 'focus-result',
            completedAt: 1700000000000,
            elapsedMs: 60000,
            config: {
              minutes: 1,
              leadInSeconds: 0,
              warningSeconds: 0,
              exercises: [{ id: 'a', name: 'Push-up' }],
            },
            checkedExerciseIds: [],
          },
        ],
      }),
    ),
  );
  await page.goto('/history');
  const origin = page.getByRole('button', { name: /View result:/ });
  for (const useEscape of [true, false]) {
    await origin.click();
    await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Compare attempts' });
    await expect(dialog.getByText('1 matching attempt', { exact: true })).toBeVisible();
    if (useEscape) await page.keyboard.press('Escape');
    else await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(origin).toBeFocused();
  }
  await origin.click();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare attempts' });
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({ version: 1, results: [] }),
    ),
  );
  await dialog.getByRole('button', { name: 'Refresh attempts' }).click();
  await expect(dialog.getByText(/This result is no longer/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
});

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} replaces one slot, cancels safely and undoes without losing timing`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.goto(`/${mode}`);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Search exercises').fill('air squat');
    await page.getByRole('button', { name: /^Air squat / }).click();
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    const before = await list.locator('h3').allTextContents();
    const row = list.locator('li').last();
    await row.getByRole('button', { name: 'Replace Air squat', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await list.locator('h3').allTextContents()).toEqual(before);
    await expect(row.getByRole('button', { name: 'Replace Air squat', exact: true })).toBeFocused();
    await row.getByRole('button', { name: 'Replace Air squat', exact: true }).click();
    await page.getByLabel('Search exercises').fill('push-up');
    await page.getByRole('button', { name: /^Push-up / }).click();
    await expect(row.locator('h3')).toHaveText('Push-up');
    expect(await list.locator('h3').allTextContents()).toEqual([...before.slice(0, -1), 'Push-up']);
    await expect(row.getByRole('button', { name: 'Replace Push-up', exact: true })).toBeFocused();
    const timing = page.getByLabel('Lead-in seconds');
    await timing.fill('12');
    await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
    expect(await list.locator('h3').allTextContents()).toEqual(before);
    await expect(timing).toHaveValue('12');
  });
}

test('replacement explains incompatible targets, preserves other edits, and expires undo after target editing', async ({
  page,
}) => {
  await page.goto('/emom');
  const list = page.getByRole('list', { name: 'Ordered exercises' });
  await list.getByRole('button', { name: 'Replace Air squat', exact: true }).click();
  await page.getByLabel('Search exercises').fill('plank');
  await page.getByRole('button', { name: /^Plank Brace/ }).click();
  await expect(
    page.getByRole('status').filter({ hasText: /Target changed from 10 reps to 30 sec/ }),
  ).toBeVisible();
  const row = list.locator('li').first();
  await expect(row).toContainText('30 sec');
  await list.getByRole('button', { name: 'Remove Sit-up', exact: true }).click();
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(list.locator('h3')).toHaveText(['Air squat', 'Push-up']);
  await list.getByRole('button', { name: 'Replace Air squat', exact: true }).click();
  await page.getByLabel('Search exercises').fill('plank');
  await page.getByRole('button', { name: /^Plank Brace/ }).click();
  await row.getByRole('button', { name: 'Edit target for Plank' }).click();
  await page.getByLabel('Target amount').fill('20');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo replacement', exact: true })).toHaveCount(0);
  await expect(row).toContainText('20 sec');
});

test('replacement uses personal movements, saves independent templates and performed snapshots', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:press',
            name: 'My press',
            description: 'Original cue',
            category: 'Push-ups',
            equipment: [],
            targetAreas: [],
            supportedUnits: ['reps'],
            defaultTarget: { unit: 'reps', value: 7 },
            archived: false,
          },
        ],
      }),
    ),
  );
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Original custom');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Replace Original custom', exact: true }).click();
  await page.getByLabel('Search exercises').fill('My press');
  await page.getByRole('button', { name: /^My press / }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' })).toContainText('7 Reps');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Replacement session');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Workout saved.', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: 'Load Replacement session', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' })).toContainText('Original cue');
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(2200);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  const saved = await page.evaluate(() => ({
    template: JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? '{}')
      .templates[0],
    result: JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? '{}').results[0],
  }));
  expect(saved.result.config.exercises[0]).toMatchObject({
    name: 'My press',
    description: 'Original cue',
    catalogId: 'personal:press',
    target: { unit: 'reps', value: 7 },
  });
  expect(saved.template.config.exercises[0].catalogId).toBe('personal:press');
});

test('replacement picker respects ladder compatibility and equipment, and custom fallback replaces instead of adding', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
  );
  await page.goto('/ladder');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('air squat');
  await page.getByRole('button', { name: /^Air squat / }).click();
  const row = page.getByRole('list', { name: 'Ordered exercises' }).locator('li').last();
  await row.getByRole('button', { name: 'Replace Air squat', exact: true }).click();
  await page.getByLabel('Search exercises').fill('plank');
  await expect(page.getByRole('button', { name: /^Plank Brace/ })).toHaveCount(0);
  await page.getByLabel('Search exercises').fill('kettlebell swing');
  await expect(page.getByRole('button', { name: /^Kettlebell swing / })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show all equipment' }).check();
  await expect(page.getByRole('button', { name: /^Kettlebell swing / })).toBeVisible();
  await page.getByLabel('Search exercises').fill('unlisted movement');
  await page.getByRole('button', { name: 'Add a custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('My ladder movement');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await expect(row.locator('h3')).toHaveText('My ladder movement');
  await page.getByRole('button', { name: 'Undo replacement', exact: true }).click();
  await expect(row.locator('h3')).toHaveText('Air squat');
});

test('generator accepts boundary count and cancels settings without changing preferences', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My Favorites', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a workout' });
  await dialog.getByLabel('Number of exercises').fill('1');
  await dialog.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Settings' })
    .getByRole('checkbox', { name: 'Kettlebell', exact: true })
    .check();
  await page.keyboard.press('Escape');
  await expect(dialog.getByLabel('Number of exercises')).toHaveValue('1');
  await expect(dialog.getByText('All equipment is included.', { exact: false })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('nextround.equipment.v1'))).toBeNull();
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(1);
});
