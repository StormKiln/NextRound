import { expect, test } from '@playwright/test';

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} fills remaining slots with preview, reshuffle and exact Undo`, async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.addInitScript(() =>
      localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
    );
    await page.goto(`/${mode}`);
    await expect(
      page.getByRole('button', { name: 'Fill remaining slots', exact: true }),
    ).toBeVisible();
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    const before = await list.locator('li').allTextContents();
    const names = await list.locator('h3').allTextContents();
    const timing = await page
      .locator('.configuration input')
      .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value));
    const trigger = page.getByRole('button', { name: 'Fill remaining slots', exact: true });
    await trigger.click();
    const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
    await expect(d.getByLabel('Total exercises', { exact: true })).toBeFocused();
    await d.getByLabel('Total exercises', { exact: true }).fill(String(before.length + 2));
    await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
    await expect(d.getByRole('list', { name: 'Proposed additions' }).locator('li')).toHaveCount(2);
    expect(await list.locator('li').allTextContents()).toEqual(before);
    await d.getByRole('button', { name: 'Reshuffle additions', exact: true }).click();
    expect(await list.locator('li').allTextContents()).toEqual(before);
    await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
    await expect(d).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(list.locator('li')).toHaveCount(before.length + 2);
    expect((await list.locator('h3').allTextContents()).slice(0, names.length)).toEqual(names);
    expect(
      await page
        .locator('.configuration input')
        .evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value)),
    ).toEqual(timing);
    await page.getByRole('button', { name: 'Undo fill', exact: true }).click();
    expect(await list.locator('li').allTextContents()).toEqual(before);
  });
}

test('fill filters exclude custom duplicates and invalidate previews; Cancel preserves choices', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] }));
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['pushup', 'squat'] }),
    );
  });
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('Push-up');
  await page.getByLabel('Description (optional)', { exact: true }).fill('Keep this cue');
  await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByLabel('My favorites only', { exact: true }).check();
  await d.getByLabel('Total exercises', { exact: true }).fill('2');
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('list', { name: 'Proposed additions' })).toContainText('Air squat');
  await expect(d.getByRole('list', { name: 'Proposed additions' })).not.toContainText('Push-up');
  await d.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Kettlebell');
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('alert')).toContainText('Only 0');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(1);
});

test('fill validates totals, uses no-equipment override and retains filters through settings', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  const total = d.getByLabel('Total exercises', { exact: true });
  for (const value of ['0', '1.5', '101']) {
    await total.fill(value);
    await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
    await expect(d.getByRole('alert')).toContainText('whole-number');
  }
  await total.fill('2');
  const all = d.getByLabel('Show all equipment', { exact: true });
  await expect(all).toBeChecked();
  await all.uncheck();
  await d.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Kettlebell');
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('alert')).toContainText('Only 0');
  await d.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(all).not.toBeChecked();
  await expect(total).toHaveValue('2');
  await expect(d.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue(
    'Kettlebell',
  );
  expect(await page.evaluate(() => localStorage.getItem('nextround.equipment.v1'))).toBeNull();
  await all.check();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('list', { name: 'Proposed additions' }).locator('li')).toHaveCount(2);
});

for (const key of [
  'nextround.personal-exercises.v1',
  'nextround.equipment.v1',
  'nextround.exercise-favorites.v1',
]) {
  test(`fill preserves unreadable ${key} and retries`, async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{broken'), key);
    await page.goto('/countdown');
    await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
    const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
    if (key.includes('favorites')) await d.getByLabel('My favorites only', { exact: true }).check();
    await expect(d.getByRole('alert')).toContainText('workout is unchanged');
    await expect(d.getByRole('button', { name: 'Preview additions', exact: true })).toBeDisabled();
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe('{broken');
    await page.evaluate((key) => localStorage.removeItem(key), key);
    await d.getByRole('button', { name: 'Retry available exercises', exact: true }).click();
    await expect(d.getByRole('button', { name: 'Preview additions', exact: true })).toBeEnabled();
    await d.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(
      0,
    );
  });
}

test('fill footer and controls remain separated at minimum size and larger text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  await page.addStyleTag({
    content:
      '.fill-dialog { font-size: 20px; } .fill-dialog button, .fill-dialog input, .fill-dialog select { font-size: inherit; }',
  });
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByLabel('Total exercises', { exact: true }).fill('20');
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  const body = d.locator('.generator-body');
  await body.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  const bounds = await d.locator('.dialog-actions button').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  for (const b of bounds) {
    expect(b.left).toBeGreaterThan(0);
    expect(b.right).toBeLessThan(760);
    expect(b.bottom).toBeLessThan(620);
  }
  for (let i = 1; i < bounds.length; i++)
    expect(
      bounds[i].left >= bounds[i - 1].right + 8 || bounds[i].top >= bounds[i - 1].bottom + 8,
    ).toBeTruthy();
  const bodyBounds = await body.boundingBox();
  expect(bodyBounds!.y + bodyBounds!.height).toBeLessThanOrEqual(
    Math.min(...bounds.map((b) => b.top)),
  );
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeInViewport();
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('fill works in a session block without saving over the source session', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a session', exact: true }).click();
  await page.getByLabel('Session name', { exact: true }).fill('Filled routine');
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(3);
  await page.getByRole('button', { name: 'Add block to session', exact: true }).click();
  await page.getByRole('button', { name: 'Edit block 1', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(3);
});
