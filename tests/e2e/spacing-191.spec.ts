import { expect, type Locator, test } from '@playwright/test';

async function bounds(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a visible control');
  return box;
}

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} picker separates search and keeps results above equipment footer`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.addInitScript(() =>
      localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
    );
    await page.goto(`/${mode}`);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.addStyleTag({ content: '::-webkit-scrollbar { width: 18px; }' });
    const manage = page.getByRole('button', { name: 'Manage my exercises', exact: true });
    const search = page.getByLabel('Search exercises', { exact: true });
    const a = await bounds(manage);
    const b = await bounds(search);
    expect(b.y - (a.y + a.height)).toBeGreaterThanOrEqual(10);
    await search.fill('air squat');
    const result = page.getByRole('button', { name: /^Air squat / });
    await expect(result).toBeInViewport({ ratio: 1 });
    const footer = page.getByRole('region', { name: 'Equipment filters' });
    await expect(footer).toBeInViewport({ ratio: 1 });
    const original = await bounds(footer);
    await search.fill('');
    await page.locator('.exercise-group summary').first().click();
    await page.locator('.picker-body').evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    const scrolled = await bounds(footer);
    expect(scrolled.y).toBeCloseTo(original.y, 0);
    await search.fill('push-up');
    await expect(
      page
        .locator('.exercise-group button')
        .filter({ has: page.getByText('Push-up', { exact: true }) }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByRole('checkbox', { name: 'Show all equipment', exact: true }).focus();
    await page.keyboard.press('Space');
    await expect(
      page.getByRole('checkbox', { name: 'Show all equipment', exact: true }),
    ).toBeChecked();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await expect(
      page.getByRole('checkbox', { name: 'Show all equipment', exact: true }),
    ).not.toBeChecked();
  });
}

test('personal library action buttons have space before the search field', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'My exercises', exact: true }).click();
  const button = await bounds(page.getByRole('button', { name: 'Create exercise', exact: true }));
  const search = await bounds(page.getByLabel('Search my exercise library'));
  expect(search.y - (button.y + button.height)).toBeGreaterThanOrEqual(10);
});

test('personal editor separates category selection from equipment fields', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.getByRole('button', { name: 'My exercises', exact: true }).click();
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  const category = await bounds(page.getByLabel('Category', { exact: true }));
  const equipment = await bounds(page.getByText('Required equipment', { exact: true }));
  expect(equipment.y - (category.y + category.height)).toBeGreaterThanOrEqual(12);
});

test('equipment error footer keeps recovery and dismissal reachable by keyboard', async ({
  page,
}) => {
  const raw = '{"version":99,"selection":[]}';
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addInitScript((value) => localStorage.setItem('nextround.equipment.v1', value), raw);
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('air squat');
  await page.getByRole('checkbox', { name: 'Show all equipment', exact: true }).uncheck();
  const retry = page.getByRole('button', { name: 'Retry equipment settings', exact: true });
  await retry.focus();
  await expect(retry).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Enter');
  const override = page.getByRole('checkbox', { name: 'Show all equipment', exact: true });
  await page.keyboard.press('Tab');
  await expect(override).toBeFocused();
  await expect(override).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Space');
  await expect(override).toBeChecked();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Change equipment settings', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Save equipment', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(page.getByLabel('Search exercises')).toHaveValue('air squat');
  const cancel = page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true });
  await cancel.focus();
  await expect(cancel).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('nextround.equipment.v1'))).toBe(raw);
});
