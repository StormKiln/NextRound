import { expect, test } from '@playwright/test';

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} pins preview positions while reshuffling and preserves Undo`, async ({ page }) => {
    await page.goto(`/${mode}`);
    const trigger = page.getByRole('button', { name: 'Fill remaining slots', exact: true });
    await expect(trigger).toBeVisible();
    const list = page.getByRole('list', { name: 'Ordered exercises' });
    const before = await list.locator('li').allTextContents();
    await trigger.click();
    const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
    await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
    const rows = d.getByRole('list', { name: 'Proposed additions' }).locator('li');
    const pinned = await rows.nth(1).locator('.fill-movement').textContent();
    await rows.nth(1).getByRole('button', { name: /Pin / }).click();
    for (let i = 0; i < 3; i++)
      await d.getByRole('button', { name: 'Reshuffle additions', exact: true }).click();
    await expect(rows.nth(1).locator('.fill-movement')).toHaveText(pinned!);
    await expect(rows.nth(1).getByRole('button', { name: /Unpin / })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await rows.nth(0).getByRole('button', { name: /Pin / }).click();
    await rows.nth(2).getByRole('button', { name: /Pin / }).click();
    await expect(
      d.getByRole('button', { name: 'Reshuffle additions', exact: true }),
    ).toBeDisabled();
    await expect(d.getByText('All additions are pinned. Unpin one to reshuffle.')).toBeVisible();
    await rows
      .nth(0)
      .getByRole('button', { name: /Unpin / })
      .click();
    await expect(d.getByRole('button', { name: 'Reshuffle additions', exact: true })).toBeEnabled();
    await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
    await expect(list.locator('li')).toHaveCount(before.length + 3);
    await page.getByRole('button', { name: 'Undo fill', exact: true }).click();
    expect(await list.locator('li').allTextContents()).toEqual(before);
  });
}
test('filter reset retains total and saved equipment, clears preview and pins', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('nextround.equipment.v1', JSON.stringify({ version: 1, selection: [] })),
  );
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByLabel('Total exercises', { exact: true }).fill('4');
  await d.getByLabel('Show all equipment', { exact: true }).check();
  await d.getByRole('combobox', { name: 'Category', exact: true }).selectOption('Kettlebell');
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await d
    .getByRole('list', { name: 'Proposed additions' })
    .getByRole('button', { name: /Pin / })
    .first()
    .click();
  await d.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await expect(d.getByLabel('Total exercises', { exact: true })).toHaveValue('4');
  await expect(d.getByLabel('Show all equipment', { exact: true })).not.toBeChecked();
  await expect(d.getByRole('combobox', { name: 'Category', exact: true })).toHaveValue('');
  await expect(d.getByRole('list', { name: 'Proposed additions' })).toHaveCount(0);
  await expect(d.getByRole('status')).toContainText('Preview and pins cleared');
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('button', { name: /Unpin / })).toHaveCount(0);
  await d.getByLabel('Total exercises', { exact: true }).fill('5');
  await expect(d.getByRole('list', { name: 'Proposed additions' })).toHaveCount(0);
});

test('long preview names and keyboard pin controls fit the minimum window with larger text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addInitScript(() => {
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:long',
            name: 'A very long personal movement name with detailed unilateral variation and comfortable range of motion',
            description: 'Local sample',
            category: 'Other bodyweight',
            equipment: [],
            targetAreas: ['core'],
            supportedUnits: ['seconds'],
            defaultTarget: { unit: 'seconds', value: 19 },
            archived: false,
          },
        ],
      }),
    );
    localStorage.setItem(
      'nextround.exercise-favorites.v1',
      JSON.stringify({ version: 1, ids: ['personal:long'] }),
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
  const pin = d.getByRole('button', { name: /Pin A very long/ });
  await pin.focus();
  await page.keyboard.press('Space');
  await expect(pin).toHaveAttribute('aria-pressed', 'true');
  const row = d.getByRole('list', { name: 'Proposed additions' }).locator('li');
  const boxes = await row.locator('.fill-movement,button').evaluateAll((els) =>
    els.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }),
  );
  expect(boxes[1].left >= boxes[0].right + 8 || boxes[1].top >= boxes[0].bottom + 8).toBeTruthy();
  for (const b of boxes) {
    expect(b.left).toBeGreaterThan(0);
    expect(b.right).toBeLessThan(760);
  }
  for (const button of await d.locator('.dialog-actions button').all())
    await expect(button).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Fill remaining slots', exact: true }),
  ).toBeFocused();
});

test('pins survive an unchanged equipment-settings visit and session block capture', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build a session', exact: true }).click();
  await page.getByRole('button', { name: 'Add Countdown block', exact: true }).click();
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  const row = d.getByRole('list', { name: 'Proposed additions' }).locator('li').first();
  const name = await row.locator('strong').innerText();
  await row.getByRole('button', { name: /Pin / }).click();
  await d.getByRole('button', { name: 'Change equipment settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(d.getByRole('button', { name: `Unpin ${name}`, exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await d.getByRole('button', { name: 'Reshuffle additions', exact: true }).click();
  await expect(row.locator('strong')).toHaveText(name);
  await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
  await page.getByRole('button', { name: 'Add block to session', exact: true }).click();
  await page.getByRole('button', { name: 'Edit block 1', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Ordered exercises' }).locator('h3').first(),
  ).toHaveText(name);
});
