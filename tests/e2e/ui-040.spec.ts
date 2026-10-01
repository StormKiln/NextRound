import { expect, type Page, test } from '@playwright/test';

async function openPage(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator('main')).toBeVisible({ timeout: 15000 });
}

test('home has explicit matching workout panels and intro artwork', async ({ page }) => {
  await openPage(page, '/');
  await expect(page.getByRole('heading', { name: 'EMOM', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Countdown', exact: true })).toBeVisible();
  await expect(page.locator('.home-intro img')).toBeVisible();
  await expect(page.locator('.workout-choice img')).toHaveCount(0);
});

test('unfocused controls have no focus ring', async ({ page }) => {
  await openPage(page, '/emom');
  const button = page.getByRole('button', { name: 'Add exercise', exact: true });
  await expect(button).toHaveCSS('outline-style', 'none');
  await button.focus();
  await expect(button).toHaveCSS('outline-style', 'solid');
});

test('groups collapse and search reveals matching movements', async ({ page }) => {
  await openPage(page, '/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  for (const group of [
    'Kettlebell',
    'Push-ups',
    'Planks',
    'Squats',
    'Cardio',
    'Other bodyweight',
  ]) {
    await expect(page.locator('.exercise-group summary').filter({ hasText: group })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /^Kettlebell swing/ })).toBeHidden();
  await page.getByLabel('Search exercises').fill('swing');
  await expect(page.getByRole('button', { name: /^Kettlebell swing/ })).toBeVisible();
  await expect(page.locator('.exercise-group summary')).toHaveCount(1);
});

test('keyboard reorder can commit and cancel while preserving focus', async ({ page }) => {
  await openPage(page, '/emom');
  const handle = page.getByRole('button', { name: 'Reorder Push-up', exact: true });
  await handle.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('exercise-entry').first()).toContainText('Push-up');
  await expect(handle).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('exercise-entry').first()).toContainText('Air squat');
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Space');
  await expect(page.getByTestId('exercise-entry').first()).toContainText('Push-up');
});

test('pointer reorder preserves duplicate movement targets', async ({ page }) => {
  await openPage(page, '/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('Air squat');
  await page.getByRole('button', { name: /^Air squat/ }).click();
  await page.getByRole('button', { name: 'Set target for Air squat', exact: true }).last().click();
  await page.getByLabel('Target amount', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Save target', exact: true }).click();
  const handle = page.getByRole('button', { name: 'Reorder Air squat', exact: true }).last();
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const to = await page.getByTestId('exercise-entry').first().boundingBox();
  if (!from || !to) throw new Error('Missing drag geometry');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + 20, { steps: 12 });
  await page.mouse.up();
  await expect(page.getByTestId('exercise-entry').first()).toContainText('5 Reps');
  await expect(page.getByTestId('exercise-entry').nth(1)).not.toContainText('5 Reps');
});

for (const viewport of [
  { width: 760, height: 620 },
  { width: 1280, height: 900 },
]) {
  test(`controls and settings fit ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openPage(page, '/emom');
    const controls = page.locator('.add-actions button');
    await expect(controls).toHaveCount(2);
    const boxes = await controls.evaluateAll((buttons) =>
      buttons.map((button) => {
        const { x, y, width, height } = button.getBoundingClientRect();
        return { x, y, width, height };
      }),
    );
    expect(
      boxes[0].x + boxes[0].width <= boxes[1].x - 8 ||
        boxes[0].y + boxes[0].height <= boxes[1].y - 8,
    ).toBeTruthy();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    const sidebar = page.locator('.settings-sidebar');
    const bounds = await sidebar.boundingBox();
    const dialog = await page.getByRole('dialog', { name: 'Settings', exact: true }).boundingBox();
    expect(
      dialog &&
        dialog.x >= 0 &&
        dialog.y >= 0 &&
        dialog.x + dialog.width <= viewport.width &&
        dialog.y + dialog.height <= viewport.height,
    ).toBeTruthy();
    let previousBottom = 0;
    for (const button of await sidebar.getByRole('button').all()) {
      const box = await button.boundingBox();
      expect(
        box &&
          bounds &&
          box.x >= bounds.x &&
          box.x + box.width <= bounds.x + bounds.width &&
          box.y >= previousBottom,
      ).toBeTruthy();
      previousBottom = (box?.y ?? 0) + (box?.height ?? 0) + 8;
    }
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
  });
}

test('pointer drag moves the first exercise down multiple rows and releases cleanly', async ({
  page,
}) => {
  await openPage(page, '/emom');
  const handle = page.getByRole('button', { name: 'Reorder Air squat', exact: true });
  const from = await handle.boundingBox();
  const to = await page.getByTestId('exercise-entry').last().boundingBox();
  if (!from || !to) throw new Error('Missing drag geometry');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + 20, to.y + to.height - 20, { steps: 24 });
  await page.mouse.up();
  await expect(page.getByTestId('exercise-entry').last()).toContainText('Air squat');
  await expect(handle).toHaveAttribute('aria-pressed', 'false');
  await page.mouse.move(from.x + 20, from.y + 20);
  await expect(page.getByTestId('exercise-entry').last()).toContainText('Air squat');
});
