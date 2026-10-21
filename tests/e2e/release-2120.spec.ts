import { expect, test } from '@playwright/test';

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} swaps only one slot and preserves pins, Apply and Undo`, async ({ page }) => {
    await page.goto(`/${mode}`);
    await expect(
      page.getByRole('button', { name: 'Fill remaining slots', exact: true }),
    ).toBeVisible();
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    const before = await list.locator('li').allTextContents();
    await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
    const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
    await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
    const rows = d.getByRole('list', { name: 'Proposed additions' }).locator('li');
    const original = await rows.locator('.fill-movement').allTextContents();
    await rows.nth(1).getByRole('button', { name: /^Pin / }).click();
    await expect(rows.nth(1).getByRole('button', { name: /^Swap / })).toBeDisabled();
    await rows
      .nth(0)
      .getByRole('button', { name: /^Swap / })
      .focus();
    await page.keyboard.press('Enter');
    await expect(rows.nth(0).getByRole('button', { name: /^Swap / })).toBeFocused();
    await expect(rows.nth(0).locator('.fill-movement')).not.toHaveText(original[0]);
    await expect(rows.nth(1).locator('.fill-movement')).toHaveText(original[1]);
    await expect(rows.nth(2).locator('.fill-movement')).toHaveText(original[2]);
    await expect(rows.nth(1).getByRole('button', { name: /^Unpin / })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const names = await rows.locator('strong').allTextContents();
    expect(new Set(names).size).toBe(3);
    await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
    expect((await list.locator('h3').allTextContents()).slice(-3)).toEqual(names);
    await page.getByRole('button', { name: 'Undo fill', exact: true }).click();
    expect(await list.locator('li').allTextContents()).toEqual(before);
  });
}

test('exhausted swap keeps preview and Apply with a local error and valid count', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['swing'] }),
    ),
  );
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByLabel('Total exercises', { exact: true }).fill('1');
  await d.getByLabel('My favorites only', { exact: true }).check();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  const row = d.getByRole('list', { name: 'Proposed additions' }).locator('li');
  const before = await row.locator('.fill-movement').textContent();
  await row.getByRole('button', { name: /^Swap / }).click();
  await expect(d.getByRole('alert')).toContainText('No different eligible movement');
  await expect(row.locator('.fill-movement')).toHaveText(before!);
  await expect(row.getByRole('button', { name: /^Swap / })).toBeFocused();
  await expect(d.getByLabel('Total exercises', { exact: true })).toHaveAttribute(
    'aria-invalid',
    'false',
  );
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeEnabled();
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('list', { name: 'Ordered exercises' }).locator('li')).toHaveCount(0);
});

test('session block captures a swapped suggestion', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a session', exact: true }).click();
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  const row = d.getByRole('list', { name: 'Proposed additions' }).locator('li').first();
  await row.getByRole('button', { name: /^Swap / }).click();
  const name = await row.locator('strong').innerText();
  await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
  await page.getByRole('button', { name: 'Add block to session', exact: true }).click();
  await page.getByRole('button', { name: 'Edit block 1', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Ordered exercises' }).locator('h3').first(),
  ).toHaveText(name);
});

test('Swap and Pin stay separated with long names, larger text and keyboard replacement', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addInitScript(() => {
    const names = [
      'A long personal movement name for a unilateral strength exercise with a controlled range of motion',
      'Another long personal movement name for a gentle conditioning exercise with a comfortable range',
    ];
    const exercises = names.map((name, i) => ({
      id: `personal:swap-${i}`,
      name,
      description: 'Local sample',
      category: 'Other bodyweight',
      equipment: [],
      targetAreas: ['core'],
      supportedUnits: ['seconds'],
      defaultTarget: { unit: 'seconds', value: 19 },
      archived: false,
    }));
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({ version: 1, exercises }),
    );
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: exercises.map((e) => e.id) }),
    );
  });
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await page.addStyleTag({
    content:
      '.fill-dialog {font-size:20px;} .fill-dialog button,.fill-dialog input,.fill-dialog select {font-size:inherit;}',
  });
  await d.getByLabel('Total exercises', { exact: true }).fill('1');
  await d.getByLabel('My favorites only', { exact: true }).check();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  const row = d.getByRole('list', { name: 'Proposed additions' }).locator('li');
  const old = await row.locator('strong').innerText();
  await row.getByRole('button', { name: /^Swap / }).focus();
  await page.keyboard.press('Space');
  await expect(row.locator('strong')).not.toHaveText(old);
  await expect(row.getByRole('button', { name: /^Swap / })).toBeFocused();
  const boxes = await row.locator('.fill-movement,button').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].left).toBeGreaterThan(0);
    expect(boxes[i].right).toBeLessThan(760);
    for (let j = i + 1; j < boxes.length; j++)
      expect(
        boxes[j].left >= boxes[i].right + 8 || boxes[j].top >= boxes[i].bottom + 8,
      ).toBeTruthy();
  }
  for (const button of await d.locator('.dialog-actions button').all())
    await expect(button).toBeInViewport();
});
