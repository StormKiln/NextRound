import { expect, test } from '@playwright/test';

test('equipment settings filter manual and suggested exercises, preserve the draft and reset the picker override', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('Dumbbell');
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(page.getByLabel('Search exercises')).toHaveValue('Dumbbell');
  await expect(page.getByRole('button', { name: /^Dumbbell goblet squat / })).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Show all equipment' }).check();
  await expect(page.getByRole('button', { name: /^Dumbbell goblet squat / })).toContainText(
    'Missing equipment',
  );
  await page.getByRole('button', { name: /^Dumbbell goblet squat / }).click();
  await expect(
    page.getByRole('button', { name: 'Edit target for Dumbbell goblet squat' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Show all equipment' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Try something new', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Add suggested Dumbbell/ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dumbbell', exact: true }).check();
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.getByLabel('Search exercises').fill('db rdl');
  await page.getByRole('button', { name: /^Dumbbell Romanian deadlift / }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('dumbbell');
  await expect(page.getByRole('button', { name: /^Dumbbell Romanian deadlift / })).toBeVisible();
  await page.getByLabel('Search exercises').fill('kettlebell');
  await expect(page.getByRole('button', { name: /^Kettlebell swing / })).toHaveCount(0);
});

for (const raw of ['{broken', '{"version":99,"selection":[]}']) {
  test(`equipment settings preserve unsupported data: ${raw}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem('nextround.equipment.v1', value), raw);
    await page.goto('/emom');
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('preserved');
    await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Save equipment', exact: true })).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Use all equipment', exact: true }),
    ).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem('nextround.equipment.v1'))).toBe(raw);
  });
}

test('equipment write failures keep the saved selection and recover without discarding the draft', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/emom');
  await page.evaluate(() => {
    localStorage.setItem(
      'nextround.equipment.v1',
      JSON.stringify({ version: 1, selection: ['dumbbell'] }),
    );
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.equipment.v1') throw new Error('Storage full');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Dumbbell', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage full');
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('nextround.equipment.v1') ?? '{}').selection,
    ),
  ).toEqual(['dumbbell']);
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.getByLabel('Search exercises').fill('db rdl');
  await expect(page.getByRole('button', { name: /^Dumbbell Romanian deadlift / })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Edit target for Air squat' })).toBeVisible();
});

for (const mode of ['emom', 'countdown', 'intervals', 'amrap']) {
  test(`new catalog entries can be selected in ${mode}`, async ({ page }) => {
    await page.goto(`/${mode}`);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Search exercises').fill('glute bridge');
    await page.getByRole('button', { name: /^Glute bridge Lie / }).click();
    await expect(
      page.getByRole('button', { name: /^(Edit|Set) target for Glute bridge$/ }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Search exercises').fill('dumbbell');
    await expect(
      page.locator('.exercise-group summary').filter({ hasText: /^Dumbbell 8$/ }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
  });
}

test('new exercises preserve identity through templates, history, repeat and usage', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('glute bridge');
  await page.getByRole('button', { name: /^Glute bridge Lie / }).click();
  await page.getByRole('button', { name: 'Set target for Glute bridge', exact: true }).click();
  await page.getByLabel('Target unit').selectOption('reps');
  await page.getByLabel('Target amount').fill('12');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('New movement');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.goto('/');
  await page.getByRole('button', { name: 'Load New movement', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Edit target for Glute bridge', exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.clock.runFor(2100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await page.getByRole('button', { name: 'View history', exact: true }).click();
  await page.getByRole('button', { name: /^View result:/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Glute bridge');
  await page.getByRole('button', { name: 'Repeat from setup', exact: true }).click();
  const records = await page.evaluate(() => ({
    template: JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? '{}')
      .templates[0].config.exercises[0],
    result: JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? '{}').results[0]
      .config.exercises[0],
  }));
  expect(records.template).toMatchObject({
    catalogId: 'glute-bridge',
    target: { unit: 'reps', value: 12 },
  });
  expect(records.result).toEqual(records.template);
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('glute bridge');
  await expect(page.getByRole('button', { name: /^Glute bridge Lie / })).toContainText(
    'Used in 1 saved workouts',
  );
});
