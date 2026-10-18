import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page) {
  await page.goto('/');
  const a = result220().session;
  a.favourite = true;
  const b = result220('b').session;
  b.name = 'Zulu';
  b.blocks[0].config.durationSeconds = 60;
  await page.evaluate(
    ([a, b]) => {
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [a, b], results: [], actuals: {}, recovery: null }),
      );
      localStorage.setItem(
        'nextround.workout-templates.v1',
        JSON.stringify({
          version: 2,
          templates: [
            { id: 't1', name: 'Alpha workout', config: a.blocks[0].config },
            { id: 't2', name: 'Zulu workout', config: b.blocks[0].config },
          ],
          collections: [],
        }),
      );
    },
    [a, b],
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Open Attempt a', exact: true })).toBeEnabled();
}
test('shared sorting and filter reset preserve data and chosen order', async ({ page }) => {
  await seed(page);
  const before = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  const sort = page.getByLabel('Sort saved library');
  await expect(page.locator('.session-card h3')).toHaveText(['Zulu', 'Attempt a']);
  await sort.selectOption('name');
  await expect(page.locator('.session-card h3')).toHaveText(['Attempt a', 'Zulu']);
  await sort.selectOption('duration');
  await page.getByLabel('Search saved workouts', { exact: true }).fill('Attempt');
  await page.getByRole('button', { name: 'Clear library filters', exact: true }).last().click();
  await expect(sort).toHaveValue('duration');
  await expect(page.locator('.session-card h3')).toHaveText(['Attempt a', 'Zulu']);
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(before);
});
test('hidden session copy offers explicit reveal and preserves sort', async ({ page }) => {
  await seed(page);
  await page.getByLabel('Sort saved library').selectOption('name');
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page
    .locator('.session-card')
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();
  await expect(
    page.getByText('hidden by your current library filters', { exact: false }),
  ).toBeVisible();
  await expect(page.locator('.session-card')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Show session — clear library filters', exact: true })
    .click();
  await expect(page.locator('.session-card')).toHaveCount(3);
  await expect(page.getByLabel('Sort saved library')).toHaveValue('name');
  await expect(page.locator('.session-card:focus')).toContainText('Attempt a');
});
test('remove final session block keeps focus and Undo restores it', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  const remove = page.getByRole('button', { name: 'Remove block 1', exact: true });
  await remove.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Add EMOM block', exact: true })).toBeFocused();
  await expect(page.getByRole('status')).toContainText('Removed Work');
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
  await expect(page.getByLabel('Session blocks')).toContainText('Work');
});

for (const action of ['Rename', 'Collections'] as const) {
  test(`${action} explains a session hidden by shared filters`, async ({ page }) => {
    await seed(page);
    if (action === 'Collections') {
      await page.evaluate(() => {
        const t = JSON.parse(localStorage.getItem('nextround.workout-templates.v1')!);
        t.collections = [{ id: 'group', name: 'Strength', workoutIds: [] }];
        localStorage.setItem('nextround.workout-templates.v1', JSON.stringify(t));
        const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
        d.sessions[0].collections = ['group'];
        localStorage.setItem('nextround.training.v1', JSON.stringify(d));
      });
      await page.reload();
      await page.getByLabel('Collection', { exact: true }).selectOption('group');
    } else await page.getByLabel('Search saved workouts', { exact: true }).fill('Attempt');
    await page.locator('.session-card').getByRole('button', { name: action, exact: true }).click();
    const dialog = page.getByRole('dialog');
    if (action === 'Rename') await dialog.getByRole('textbox').fill('Morning flow');
    else await dialog.getByRole('checkbox', { name: 'Strength', exact: true }).uncheck();
    await dialog.getByRole('button', { name: 'Save changes', exact: true }).click();
    await expect(
      page.getByText('hidden by your current library filters', { exact: false }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Show session — clear library filters', exact: true })
      .click();
    await expect(page.locator('.session-card:focus')).toContainText(
      action === 'Rename' ? 'Morning flow' : 'Attempt a',
    );
  });
}
test('import reveals an independent session without changing draft or automatically resetting filters', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page.getByRole('button', { name: 'Import session', exact: true }).click();
  const session = result220('imported').session;
  await page.getByLabel('Choose JSON file').setInputFiles({
    name: 'session.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'nextround-session', version: 1, session })),
  });
  await page.getByRole('button', { name: 'Add session', exact: true }).click();
  await expect(
    page.getByText('hidden by your current library filters', { exact: false }),
  ).toBeVisible();
  await expect(page.getByLabel('Favourites only', { exact: true })).toBeChecked();
  await page
    .getByRole('button', { name: 'Show session — clear library filters', exact: true })
    .click();
  await expect(page.locator('.session-card:focus')).toContainText('Attempt imported');
});
for (const position of [0, 1, 2]) {
  test(`remove block ${position + 1} and Undo preserve remaining blocks and transitions`, async ({
    page,
  }) => {
    await seed(page);
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
      const original = d.sessions[0].blocks[0];
      d.sessions[0].blocks = [0, 1, 2].map((i) => ({
        ...original,
        id: `b${i}`,
        name: `Work ${i}`,
        restSeconds: i * 10,
      }));
      localStorage.setItem('nextround.training.v1', JSON.stringify(d));
    });
    await page.reload();
    await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
    const original = await page.getByLabel('Session blocks').innerText();
    await page.getByRole('button', { name: `Remove block ${position + 1}`, exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('button', { name: `Edit block ${position === 0 ? 1 : 2}`, exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
    await expect(
      page.getByRole('button', { name: `Edit block ${position + 1}`, exact: true }),
    ).toBeFocused();
    expect(await page.getByLabel('Session blocks').innerText()).toBe(original);
  });
}

test('sort and shared filter controls keep consistent touch targets at minimum window', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.addStyleTag({
    content:
      '* { scrollbar-width:auto !important; } ::-webkit-scrollbar { width:16px !important; }',
  });
  const sort = page.getByLabel('Sort saved library');
  await sort.scrollIntoViewIfNeeded();
  const box = await sort.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  for (const control of await page.locator('.template-search select').all()) {
    expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  }
  expect(box!.x).toBeGreaterThanOrEqual(12);
  expect(box!.x + box!.width).toBeLessThanOrEqual(748);
  await sort.selectOption('name');
  await page.getByRole('button', { name: 'Preview Attempt a', exact: true }).click();
  await page.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preview Attempt a', exact: true })).toBeFocused();
});
test('failed session mutation never announces a successful hidden result', async ({ page }) => {
  await seed(page);
  await page.getByLabel('Favourites only', { exact: true }).check();
  await page.evaluate(() => localStorage.setItem('nextround.training.v1', 'broken'));
  await page
    .locator('.session-card')
    .getByRole('button', { name: 'Duplicate', exact: true })
    .click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Show session — clear library filters', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('Independent session copy saved.', { exact: false })).toHaveCount(0);
});
