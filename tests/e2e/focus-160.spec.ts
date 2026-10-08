import { expect, test } from '@playwright/test';

test('focus groups overlap by identity and match any selected area with equipment and search', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Group exercises by').selectOption('focus');
  await page.getByLabel('Search exercises').fill('kettlebell bent-over row');
  await expect(page.locator('.exercise-group summary')).toHaveText(['Arms 1', 'Back 1', 'Lats 1']);
  await expect(page.getByRole('button', { name: /^Kettlebell bent-over row / })).toHaveCount(3);
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add suggested Kettlebell bent-over row', exact: true }),
  ).toHaveCount(1);
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Legs', exact: true }).check();
  await expect(page.getByText('No matching exercises.', { exact: false })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Back', exact: true }).check();
  await expect(
    page.getByRole('button', { name: 'Add suggested Kettlebell bent-over row', exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole('button', { name: /^Kettlebell bent-over row / })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Remove Kettlebell bent-over row', exact: true }),
  ).toHaveCount(1);
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(page.getByLabel('Group exercises by')).toHaveValue('type');
  await expect(page.getByRole('button', { name: 'My favorites', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('picker keeps preset, view, focus, search and override across Equipment settings at minimum size', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('deadbugs');
  await page.getByLabel('Group exercises by').selectOption('focus');
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Show all equipment', exact: true }).check();
  await page.getByRole('button', { name: 'Mix it up', exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath('focus-minimum.png') });
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Mix it up', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByLabel('Group exercises by')).toHaveValue('focus');
  await expect(page.getByLabel('Search exercises')).toHaveValue('deadbugs');
  await expect(
    page.getByRole('checkbox', { name: 'Show all equipment', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mix it up', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(
    page.getByRole('button', { name: 'Add suggested Dead bug', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add exercise', exact: true })).toBeFocused();
});

test('saved but filtered-out usage is not described as globally missing history', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('kettlebell swing');
  await page.getByRole('button', { name: /^Kettlebell swing / }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.clock.resume();
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(page.getByText(/No attributed exercise history yet/)).toHaveCount(0);
  await expect(page.getByText(/None of the eligible exercises have saved usage/)).toBeVisible();
});

test('1.6.0 exercises preserve identity through templates, history, repeat and usage', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('reverse crunch');
  await page.getByRole('button', { name: /^Reverse crunch / }).click();
  await page.getByRole('button', { name: 'Set target for Reverse crunch', exact: true }).click();
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
    page.getByRole('button', { name: 'Edit target for Reverse crunch', exact: true }),
  ).toBeVisible();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.getByRole('checkbox').check();
  await page.clock.runFor(2100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await page.getByRole('button', { name: 'View history', exact: true }).click();
  await page.getByRole('button', { name: /^View result:/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Reverse crunch');
  await page.getByRole('button', { name: 'Repeat from setup', exact: true }).click();
  const records = await page.evaluate(() => ({
    template: JSON.parse(localStorage.getItem('nextround.workout-templates.v1') ?? '{}')
      .templates[0].config.exercises[0],
    result: JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? '{}').results[0]
      .config.exercises[0],
  }));
  expect(records.template).toMatchObject({
    catalogId: 'reverse-crunch',
    target: { unit: 'reps', value: 12 },
  });
  expect(records.result).toEqual(records.template);
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('reverse crunch');
  await expect(page.getByRole('button', { name: /^Reverse crunch / })).toContainText(
    'Used in 1 saved workout',
  );
});

for (const mode of ['emom', 'countdown', 'intervals', 'amrap']) {
  test(`1.6.0 bodyweight choices and targets work in ${mode}`, async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
    );
    await page.goto(`/${mode}`);
    for (const name of ['Bicycle crunch', 'Bear crawl', 'Step jack']) {
      await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
      await page.getByLabel('Search exercises').fill(name);
      await page.getByRole('button', { name: new RegExp(`^${name} `) }).click();
      await expect(page.getByRole('button', { name: `Remove ${name}`, exact: true })).toBeVisible();
    }
    if (mode === 'emom' || mode === 'amrap') {
      await expect(
        page.getByRole('button', { name: 'Edit target for Bicycle crunch', exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Edit target for Bear crawl', exact: true }),
      ).toBeVisible();
    }
  });
}
