import { expect, test } from '@playwright/test';

for (const width of [760, 1280]) {
  test(`home action has space above workout cards at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 620 });
    await page.goto('/');
    const action = page.getByRole('button', { name: 'My exercises', exact: true });
    await expect(action).toBeVisible();
    const a = await action.boundingBox();
    const b = await page.locator('.workout-choices').boundingBox();
    if (!a || !b) throw Error('Home layout missing');
    expect(b.y - a.y - a.height).toBeGreaterThanOrEqual(16);
  });
}

test('unset equipment starts checked and unchecking filters to no-equipment movements', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const all = page.getByRole('checkbox', { name: 'Show all equipment' });
  await expect(all).toBeChecked();
  await all.uncheck();
  await expect(page.getByText('No equipment selected.', { exact: false })).toBeVisible();
  await page.getByLabel('Search exercises').fill('kettlebell');
  await expect(page.getByRole('button', { name: /^Kettlebell swing / })).toHaveCount(0);
  await page.getByLabel('Search exercises').fill('air squat');
  await expect(page.getByRole('button', { name: /^Air squat / })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await expect(all).toBeChecked();
  expect(await page.evaluate(() => localStorage.getItem('nextround.equipment.v1'))).toBeNull();
});

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} generates a chosen exercise count and supports undo`, async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.addInitScript(() =>
      localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
    );
    await page.goto(`/${mode}`);
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    await expect(page.getByRole('button', { name: 'Create a workout', exact: true })).toBeVisible();
    const before = await list.locator('h3').allTextContents();
    const timing = await page
      .locator('.configuration input')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page.getByRole('button', { name: 'Try something new', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create a workout' });
    await dialog.getByLabel('Number of exercises').fill('5');
    await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(list.locator('li')).toHaveCount(5);
    const names = await list.locator('h3').allTextContents();
    expect(new Set(names).size).toBe(5);
    expect(names.some((name) => /kettlebell|dumbbell|rowing/i.test(name))).toBe(false);
    if (mode === 'emom' || mode === 'amrap')
      await expect(list.getByRole('button', { name: /^Edit target/ })).toHaveCount(5);
    expect(
      await page
        .locator('.configuration input')
        .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)),
    ).toEqual(timing);
    await page.getByRole('button', { name: 'Undo generated workout', exact: true }).click();
    expect(await list.locator('h3').allTextContents()).toEqual(before);
  });
}

test('generator validates counts, cancels cleanly and supports keyboard preset selection', async ({
  page,
}) => {
  await page.goto('/emom');
  const trigger = page.getByRole('button', { name: 'Create a workout', exact: true });
  await trigger.click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'My Favorites', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog', { name: 'Create a workout' });
  const amount = dialog.getByLabel('Number of exercises');
  await amount.fill('0');
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('whole number');
  await amount.fill('1.5');
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('whole number');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(3);
  await trigger.click();
  await page.getByRole('button', { name: 'Mix It Up', exact: true }).click();
  await amount.fill('2');
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(2);
  await page
    .getByRole('button', { name: /^Remove / })
    .first()
    .click();
  await expect(
    page.getByRole('button', { name: 'Undo generated workout', exact: true }),
  ).toHaveCount(0);
});

test('generator explains insufficient eligible exercises without replacing the draft', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
  );
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My Favorites', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create a workout' });
  await dialog.getByLabel('Number of exercises').fill('100');
  await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('eligible exercises are available');
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(3);
});

for (const key of [
  'nextround.workout-history.v1',
  'nextround.equipment.v1',
  'nextround.personal-exercises.v1',
]) {
  test(`generator preserves unreadable data and retries ${key}`, async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{broken'), key);
    await page.goto('/emom');
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page.getByRole('button', { name: 'My Favorites', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create a workout' });
    await expect(
      dialog.getByRole('button', { name: 'Generate workout', exact: true }),
    ).toBeDisabled();
    await expect(dialog.getByRole('alert')).toContainText('current workout is unchanged');
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken');
    await page.evaluate((key) => localStorage.removeItem(key), key);
    await dialog.getByRole('button', { name: 'Retry workout suggestions', exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Generate workout', exact: true }),
    ).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(
      3,
    );
  });
}

test('saved equipment override survives visiting settings without changing preferences', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.equipment.v1',
      JSON.stringify({ version: 1, selection: ['dumbbell'] }),
    ),
  );
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  const override = page.getByRole('checkbox', { name: 'Show all equipment', exact: true });
  await override.check();
  await page.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(override).toBeChecked();
  await page.getByLabel('Search exercises').fill('kettlebell swing');
  await expect(page.getByRole('button', { name: /^Kettlebell swing / })).toBeVisible();
});

test('whole-workout presets use saved history rankings', async ({ page }) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('pushup');
  await page.getByRole('button', { name: /^Push-up / }).click();
  await page.clock.install();
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await page.clock.runFor(1100);
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.clock.resume();
  await page.goto('/countdown');
  for (const [preset, count, names] of [
    ['My Favorites', '1', ['Push-up']],
    ['Try something new', '1', ['Abdominal crunch']],
    ['Mix It Up', '2', ['Push-up', 'Abdominal crunch']],
  ] as const) {
    await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
    await page.getByRole('button', { name: preset, exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create a workout' });
    await dialog.getByLabel('Number of exercises').fill(count);
    await dialog.getByRole('button', { name: 'Generate workout', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(
      await page.getByRole('list', { name: 'Ordered exercises' }).locator('h3').allTextContents(),
    ).toEqual(names);
  }
});
