import { expect, test } from '@playwright/test';

const config = {
  type: 'countdown',
  durationSeconds: 60,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'e', name: 'Rowing' }],
};
const key = 'nextround.workout-templates.v1';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          templates: [
            { id: 'w', name: 'Morning', config },
            { id: 'v', name: 'Evening', config },
          ],
          collections: [{ id: 'c', name: 'Training', workoutIds: ['v', 'w'] }],
        }),
      ),
    { key, config },
  );
  await page.goto('/');
});
test('exports every collection member despite Home filters and imports independent named copies', async ({
  page,
}) => {
  await page.getByLabel('Collection', { exact: true }).selectOption('c');
  await page.getByLabel('Search saved library').fill('Morning');
  await page.getByRole('button', { name: 'Export collection', exact: true }).click();
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save collection file', exact: true }).click();
  const download = await pending;
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const file = JSON.parse(raw.toString());
  expect(file.workouts.map((w: { name: string }) => w.name)).toEqual(['Evening', 'Morning']);
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  await page
    .getByLabel('Collection file', { exact: true })
    .setInputFiles({ name: 'training.json', mimeType: 'application/json', buffer: raw });
  await expect(page.getByLabel('Imported collection name')).toHaveValue('Training (copy)');
  await expect(page.getByLabel('Workout 1 name')).toHaveValue('Evening (copy)');
  await page.getByRole('button', { name: 'Add collection and workouts', exact: true }).click();
  const doc = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key);
  expect(doc.templates).toHaveLength(4);
  expect(doc.collections).toHaveLength(2);
  expect(doc.collections[1].workoutIds).not.toContain('w');
});
test('retains edited collection preview after a failed replacement and commits nothing prematurely', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  await page.getByLabel('Collection file', { exact: true }).setInputFiles({
    name: 'travel.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'nextround-collection',
        version: 1,
        name: 'Travel',
        workouts: [{ name: 'A', config }],
      }),
    ),
  });
  await page.getByLabel('Imported collection name').fill('Edited travel');
  await page
    .getByLabel('Collection file', { exact: true })
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('button', { name: 'Add collection and workouts' })).toBeDisabled();
  await page.getByRole('button', { name: 'Use previous collection' }).click();
  await expect(page.getByLabel('Imported collection name')).toHaveValue('Edited travel');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).templates.length, key),
  ).toBe(2);
});
test('reveals and focuses collection editing and confirmation in a long list', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)!);
    d.collections = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i}`,
      name: `Collection ${i}`,
      workoutIds: [],
    }));
    localStorage.setItem(key, JSON.stringify(d));
  }, key);
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByRole('button', { name: 'Rename collection Collection 29', exact: true }).click();
  await expect(page.getByLabel('Collection name', { exact: true })).toBeFocused();
  await expect(page.getByLabel('Collection name', { exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Cancel rename', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Rename collection Collection 29', exact: true }),
  ).toBeFocused();
  await page.getByRole('button', { name: 'Delete collection Collection 0', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Keep collection', exact: true })).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Confirm delete collection', exact: true }),
  ).toBeInViewport();
});
test('duplicate collection names can be corrected without closing or discarding the draft', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Training');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
  await expect(page.getByRole('alert')).not.toContainText('Close this dialog');
  await expect(page.getByLabel('Collection name', { exact: true })).toBeFocused();
  await page.getByLabel('Collection name', { exact: true }).fill('Fresh training');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'created' })).toBeVisible();
});

test('stale collection edits require explicit reload and retain drafts until then', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByRole('button', { name: 'Rename collection Training', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('My draft');
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? '{}');
    doc.collections[0].name = 'Changed elsewhere';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Rename collection', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('changed');
  await expect(page.getByLabel('Collection name', { exact: true })).toHaveValue('My draft');
  await page.getByRole('button', { name: 'Reload collection data', exact: true }).click();
  await expect(page.getByLabel('Collection name', { exact: true })).toHaveValue('');
  await expect(
    page.getByRole('button', { name: 'Rename collection Changed elsewhere', exact: true }),
  ).toBeVisible();
});

test('storage failure preserves collection draft for retry', async ({ page }) => {
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Retry this');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      Storage.prototype.setItem = original;
      if (k === 'nextround.workout-templates.v1') throw new Error('Storage unavailable');
      original.call(this, k, v);
    };
  });
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage unavailable');
  await expect(page.getByLabel('Collection name', { exact: true })).toHaveValue('Retry this');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'created' })).toBeVisible();
});

test('collection preview scrolls with fixed actions at a narrow size', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addStyleTag({
    content: '* { scrollbar-width:auto !important } ::-webkit-scrollbar { width:15px; }',
  });
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  await page.getByLabel('Collection file', { exact: true }).setInputFiles({
    name: 'routine.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'nextround-collection',
        version: 1,
        name: 'Daily movement',
        workouts: Array.from({ length: 12 }, (_, i) => ({ name: `Session ${i + 1}`, config })),
      }),
    ),
  });
  await expect(
    page.getByRole('button', { name: 'Add collection and workouts', exact: true }),
  ).toBeInViewport();
  await expect(page.locator('.collection-file-field')).toHaveCSS('row-gap', '8px');
  await page.screenshot({ path: testInfo.outputPath('collection-sharing.png') });
  await page.getByLabel('Workout 12 name').focus();
  await expect(page.getByLabel('Workout 12 name')).toBeInViewport();
  await expect(
    page.getByRole('button', { name: 'Add collection and workouts', exact: true }),
  ).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('cancelling deletion restores the same action near the bottom of a long list', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? '{}');
    doc.collections = Array.from({ length: 30 }, (_, i) => ({
      id: `c${i}`,
      name: `Collection ${i}`,
      workoutIds: [],
    }));
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  const action = page.getByRole('button', { name: 'Delete collection Collection 29', exact: true });
  await action.click();
  await page.getByRole('button', { name: 'Keep collection', exact: true }).click();
  await expect(action).toBeFocused();
  await expect(action).toBeInViewport();
});

test('reveals a fresh import collision after reviewing a long preview', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByRole('button', { name: 'Import collection', exact: true }).click();
  await page.getByLabel('Collection file', { exact: true }).setInputFiles({
    name: 'many.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'nextround-collection',
        version: 1,
        name: 'New routine',
        workouts: Array.from({ length: 12 }, (_, i) => ({ name: `Session ${i + 1}`, config })),
      }),
    ),
  });
  await page.getByLabel('Workout 12 name').focus();
  await page.evaluate(
    ({ key, config }) => {
      const doc = JSON.parse(localStorage.getItem(key) ?? '{}');
      doc.templates.push({ id: 'conflict', name: 'Session 12', config });
      localStorage.setItem(key, JSON.stringify(doc));
    },
    { key, config },
  );
  await page.getByRole('button', { name: 'Add collection and workouts', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Session 12');
  await expect(page.getByRole('alert')).toBeInViewport();
  await expect(page.getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Workout 12 name')).toHaveValue('Session 12');
});
