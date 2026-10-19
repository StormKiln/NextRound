import { expect, test } from '@playwright/test';

const key = 'nextround.workout-templates.v1';
const config = {
  type: 'countdown',
  durationSeconds: 60,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [
    {
      id: 'foreign',
      catalogId: 'personal:foreign',
      name: 'Travel movement',
      description: 'Original cue',
      target: { unit: 'reps', value: 8 },
    },
  ],
};
const file = { format: 'nextround-workout', version: 1, name: 'Travel', config };
test('import previews, preserves filters and creates an independent snapshot', async ({ page }) => {
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, templates: [{ id: 'existing', name: 'Travel', config }] }),
      ),
    { key, config },
  );
  await page.goto('/');
  await page.getByLabel('Search saved library').fill('hidden');
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page.getByLabel('Workout file').setInputFiles({
    name: 'session.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  const dialog = page.getByRole('dialog', { name: 'Import saved workout' });
  await expect(dialog).toContainText('Original cue');
  await expect(dialog.getByLabel('Workout name')).toHaveValue('Travel (copy)');
  await dialog.getByRole('button', { name: 'Add to saved workouts' }).click();
  await expect(page.getByLabel('Search saved library')).toHaveValue('hidden');
  await page.getByRole('button', { name: 'Show imported workout' }).click();
  await expect(page.getByRole('heading', { name: 'Travel (copy)', exact: true })).toBeVisible();
  const entries = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).templates,
    key,
  );
  expect(entries).toHaveLength(2);
  expect(entries[1].config.exercises[0].catalogId).toBeUndefined();
  expect(entries[1].config.exercises[0].id).not.toBe('foreign');
  expect(entries[1].favourite).toBeUndefined();
});
test('invalid file and cancelled preview never write to the library', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page.getByLabel('Workout file').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('Unsupported');
  await page.getByLabel('Workout file').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByRole('dialog')).toContainText('Original cue');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
});
const personal = {
  id: 'personal:1210',
  name: 'Alpha movement',
  description: 'Personal cue',
  category: 'Other bodyweight',
  equipment: [],
  targetAreas: ['core'],
  supportedUnits: ['reps', 'seconds'],
  defaultTarget: { unit: 'reps', value: 8 },
  archived: false,
};
test.describe('personal library feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(
      (entry) =>
        localStorage.setItem(
          'nextround.personal-exercises.v1',
          JSON.stringify({ version: 1, exercises: [entry] }),
        ),
      personal,
    );
    await page.goto('/exercises');
  });
  test('hidden saved exercise offers explicit reveal without resetting search', async ({
    page,
  }) => {
    await page.getByLabel('Search my exercise library').fill('Alpha');
    await page.getByRole('button', { name: 'Edit Alpha movement', exact: true }).click();
    await page.getByLabel('Exercise name', { exact: true }).fill('Beta movement');
    await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Exercise library update' })).toContainText(
      'hidden',
    );
    await expect(page.getByLabel('Search my exercise library')).toHaveValue('Alpha');
    await page.getByRole('button', { name: 'Show saved exercise' }).click();
    await expect(page.getByRole('heading', { name: 'Beta movement' })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Edit Beta movement', exact: true }),
    ).toBeFocused();
  });
  test('archive and restore have named accessible success feedback', async ({ page }) => {
    await page.getByRole('button', { name: 'Archive Alpha movement', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Exercise library update' })).toContainText(
      'Archived “Alpha movement”',
    );
    await page.getByRole('button', { name: 'Show archived exercises', exact: true }).click();
    await page.getByRole('button', { name: 'Restore Alpha movement', exact: true }).click();
    await expect(page.getByRole('status', { name: 'Exercise library update' })).toContainText(
      'Restored “Alpha movement”',
    );
  });
  test('summaries distinguish supported units from default prescription', async ({ page }) => {
    await expect(page.getByText('Default target: 8 reps', { exact: true })).toBeVisible();
    await expect(page.getByText('Supported targets: Reps, Seconds', { exact: true })).toBeVisible();
  });
});
test('export contains the fresh saved snapshot and can be imported again', async ({ page }) => {
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          templates: [{ id: 'export', name: 'Travel', config, favourite: true }],
        }),
      ),
    { key, config },
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Export Travel', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(
    'Custom descriptions may contain personal information',
  );
  await page.evaluate((key) => {
    const d = JSON.parse(localStorage.getItem(key)!);
    d.templates[0].config.durationSeconds = 90;
    localStorage.setItem(key, JSON.stringify(d));
  }, key);
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save workout file' }).click();
  const stream = await (await downloaded).createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const doc = JSON.parse(raw.toString());
  expect(doc.config.durationSeconds).toBe(90);
  expect(doc.favourite).toBeUndefined();
  expect(doc.id).toBeUndefined();
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page
    .getByLabel('Workout file')
    .setInputFiles({ name: 'again.json', mimeType: 'application/json', buffer: raw });
  await expect(page.getByRole('dialog')).toContainText('01:30');
  await page.getByRole('button', { name: 'Add to saved workouts' }).click();
  await expect(page.getByRole('heading', { name: 'Travel (copy)', exact: true })).toBeVisible();
});
test('concurrent name collision and rejected import preserve data and offer retry', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page.getByLabel('Workout file').setInputFiles({
    name: 'valid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(file)),
  });
  await expect(page.getByLabel('Workout name')).toHaveValue('Travel');
  await page.evaluate(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, templates: [{ id: 'external', name: 'Travel', config }] }),
      ),
    { key, config },
  );
  await page.getByRole('button', { name: 'Add to saved workouts' }).click();
  await expect(page.getByRole('alert')).toContainText('already exists');
  await page.getByLabel('Workout name').fill('Other');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === 'nextround.workout-templates.v1') throw new Error('Disk full');
      return original.call(this, k, v);
    };
  });
  await page.getByRole('button', { name: 'Add to saved workouts' }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  expect(
    await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).templates.length, key),
  ).toBe(1);
  await expect(page.getByLabel('Workout name')).toHaveValue('Other');
});
test('long imported list scrolls without covering fixed actions at minimum size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  const long = {
    ...file,
    config: {
      ...config,
      exercises: Array.from({ length: 100 }, (_, i) => ({
        ...config.exercises[0],
        id: String(i),
        name: `Movement ${i}`,
        description: 'Long cue '.repeat(100),
      })),
    },
  };
  await page.getByLabel('Workout file').setInputFiles({
    name: 'long.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(long)),
  });
  const body = page.locator('.template-preview-body');
  await expect(body).toContainText('Movement 99');
  expect(await body.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  const add = page.getByRole('button', { name: 'Add to saved workouts' });
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
  for (const b of [add, cancel]) {
    const box = await b.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(620);
  }
  await cancel.click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
});

test('cancelled native replacement keeps the reviewed import and edited name', async ({ page }) => {
  await page.addInitScript((file) => {
    let selections = 0;
    Object.defineProperty(window, 'isTauri', { value: true });
    Object.defineProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__', {
      value: { unregisterListener: () => {} },
    });
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {
        transformCallback: () => 1,
        invoke: async (cmd: string) => {
          if (cmd === 'read_training')
            return { version: 1, sessions: [], results: [], actuals: {}, recovery: null };
          if (cmd === 'distribution_channel') return 'app-store';
          if (cmd === 'read_workout_templates') return { version: 1, templates: [] };
          if (cmd === 'get_close_behavior') return 'minimize';
          if (cmd === 'open_workout_file') return selections++ === 0 ? JSON.stringify(file) : null;
          return null;
        },
      },
    });
  }, file);
  await page.goto('/');
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page.getByRole('button', { name: 'Choose workout file' }).click();
  await page.getByLabel('Workout name', { exact: true }).fill('My reviewed name');
  await page.getByRole('button', { name: 'Choose workout file' }).click();
  await expect(page.getByLabel('Workout name', { exact: true })).toHaveValue('My reviewed name');
  await expect(page.getByRole('button', { name: 'Add to saved workouts' })).toBeEnabled();
});
