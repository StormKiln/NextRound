import { expect, test } from '@playwright/test';

const personal = {
  id: 'personal:1190',
  name: 'My movement',
  description: '',
  category: 'Uncategorized',
  equipment: [],
  targetAreas: ['core'],
  supportedUnits: ['reps'],
  archived: false,
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript((entry) => {
    if (!localStorage.getItem('nextround.personal-exercises.v1'))
      localStorage.setItem(
        'nextround.personal-exercises.v1',
        JSON.stringify({ version: 1, exercises: [entry] }),
      );
  }, personal);
});
test('archive of the last visible personal row returns keyboard focus to search', async ({
  page,
}) => {
  await page.goto('/exercises');
  const archive = page.getByRole('button', { name: 'Archive My movement', exact: true });
  await archive.focus();
  await archive.press('Space');
  await expect(archive).toHaveCount(0);
  await expect(page.getByLabel('Search my exercise library')).toBeFocused();
});
test('clearing an empty bundled search returns focus to search', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Copy a bundled exercise', exact: true }).click();
  await page.getByLabel('Search my exercise library').fill('nothing-1190');
  const clear = page.getByRole('button', { name: 'Clear exercise search', exact: true });
  await clear.focus();
  await clear.press('Space');
  await expect(page.getByLabel('Search my exercise library')).toBeFocused();
});
test('invalid personal default focuses and describes the amount field', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit My movement', exact: true }).click();
  await page.getByLabel('Set a default target', { exact: true }).check();
  await page.getByLabel('Default amount', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByLabel('Default amount', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Default amount', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'true',
  );
  await page.getByLabel('Default amount', { exact: true }).fill('8');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
test('missing supported units focuses the target-unit group', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit My movement', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Reps', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Reps', exact: true })).toBeFocused();
});
test('changing a focus filter reveals the start of scrolled picker results', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises', { exact: true }).fill('a');
  await page.locator('.focus-controls summary').click();
  const body = page.locator('.picker-body');
  await body.evaluate((el) => {
    el.scrollTop = 400;
  });
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).check();
  await expect.poll(() => body.evaluate((el) => el.scrollTop)).toBe(0);
});
test('generation combines selected focus with favourites and preserves count through settings', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['pushup', 'squat', 'personal:1190'] }),
    ),
  );
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await page.getByLabel('Number of exercises', { exact: true }).fill('1');
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).check();
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(page.getByLabel('Number of exercises', { exact: true })).toHaveValue('1');
  await expect(page.getByText('Matching any: Core / abs', { exact: true })).toBeVisible();
  await page.getByText('Focus areas', { exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Core / abs', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('h3')).toHaveCount(1);
  await page.getByRole('button', { name: 'Undo generated workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('h3')).toHaveCount(3);
});

test('clearing generation focus filters never submits the workout', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'Try something new', exact: true }).click();
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).check();
  await page.getByRole('button', { name: 'Clear focus filters', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create a workout', exact: true })).toBeVisible();
  await expect(page.getByLabel('Number of exercises', { exact: true })).toHaveValue('3');
});

const focusedEntries = [
  { ...personal, id: 'personal:lat1190', name: 'A 1190 lat movement', targetAreas: ['lats'] },
  {
    ...personal,
    id: 'personal:whole1190',
    name: 'B 1190 whole movement',
    targetAreas: ['whole-body'],
  },
  { ...personal, id: 'personal:untagged1190', name: 'C 1190 untagged', targetAreas: [] },
  {
    ...personal,
    id: 'personal:equipment1190',
    name: 'A 1190 equipment',
    targetAreas: ['lats'],
    equipment: ['kettlebell'],
  },
  {
    ...personal,
    id: 'personal:archived1190',
    name: 'A 1190 archived',
    targetAreas: ['lats'],
    archived: true,
  },
];
for (const [i, mode] of [
  'emom',
  'countdown',
  'intervals',
  'amrap',
  'for-time',
  'ladder',
].entries()) {
  test(`${mode} generates focus-matched movements with count, timing and Undo intact`, async ({
    page,
  }) => {
    await page.addInitScript((entries) => {
      localStorage.setItem(
        'nextround.personal-exercises.v1',
        JSON.stringify({ version: 1, exercises: entries }),
      );
      localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] }));
      localStorage.setItem(
        'nextround.exercise-favorites.v1',
        JSON.stringify({ version: 1, ids: entries.map((e) => e.id) }),
      );
    }, focusedEntries);
    await page.setViewportSize({ width: 760, height: 620 });
    await page.goto(`/${mode}`);
    await expect(page.locator('.configuration input').first()).toBeVisible();
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    await expect(list.locator('h3')).toHaveCount(
      ['emom', 'intervals', 'amrap'].includes(mode) ? 3 : 0,
    );
    const before = await list.locator('h3').allTextContents();
    const timing = await page
      .locator('.configuration input')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page
      .getByRole('button', {
        name: ['My favorites', 'Most used', 'Try something new', 'Mix It Up'][i % 4],
        exact: true,
      })
      .click();
    await page.getByText('Focus areas', { exact: true }).click();
    await page.getByRole('checkbox', { name: 'Lats', exact: true }).check();
    await page.getByLabel('Number of exercises', { exact: true }).fill('1');
    const submit = page.getByRole('button', { name: 'Generate workout', exact: true });
    const bounds = await submit.boundingBox();
    if (!bounds) throw new Error('Generate button has no bounds');
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(620);
    await submit.click();
    await expect(list.locator('h3')).toHaveText(['A 1190 lat movement']);
    expect(
      await page
        .locator('.configuration input')
        .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)),
    ).toEqual(timing);
    await page.getByRole('button', { name: 'Undo generated workout', exact: true }).click();
    expect(await list.locator('h3').allTextContents()).toEqual(before);
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page.getByRole('button', { name: 'My favorites', exact: true }).click();
    await expect(page.getByText('All areas', { exact: true })).toBeVisible();
  });
}

test('focus generation uses ANY semantics, Back includes Lats, and empty matches never relax filters', async ({
  page,
}) => {
  await page.addInitScript((entries) => {
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({ version: 1, exercises: entries }),
    );
    localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] }));
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: entries.map((e) => e.id) }),
    );
  }, focusedEntries);
  await page.goto('/ladder');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My favorites', exact: true }).click();
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).check();
  await page.getByLabel('Number of exercises').fill('2');
  await page.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Only 0 eligible exercises');
  await expect(page.getByLabel('Number of exercises')).toBeFocused();
  await page.getByRole('checkbox', { name: 'Core / abs', exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'Back', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Lats', exact: true }).check();
  await expect(page.getByText(/^1 eligible exercise\./)).toBeVisible();
  await page.getByRole('checkbox', { name: 'Whole body', exact: true }).check();
  await expect(page.getByText(/^2 eligible exercises\./)).toBeVisible();
  await expect(page.getByLabel('Number of exercises')).toHaveValue('2');
  await page.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('h3')).toHaveText([
    'A 1190 lat movement',
    'B 1190 whole movement',
  ]);
});
