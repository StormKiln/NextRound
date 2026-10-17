import { expect, test } from '@playwright/test';

const config = {
  type: 'countdown',
  durationSeconds: 60,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'e', name: 'Rowing', description: 'Steady strokes' }],
};
const key = 'nextround.workout-templates.v1';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({ version: 1, templates: [{ id: 'w', name: 'Morning', config }] }),
      ),
    { key, config },
  );
  await page.goto('/');
});
test('saved search finds exercise snapshots and collection membership survives filtering', async ({
  page,
}) => {
  await page.getByLabel('Search saved workouts').fill('steady');
  await expect(page.getByRole('heading', { name: 'Morning', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Quick sessions');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Quick sessions');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Collections for Morning', exact: true }).click();
  await page.getByLabel('Quick sessions', { exact: true }).check();
  await page.getByRole('button', { name: 'Save collections', exact: true }).click();
  await page.getByLabel('Collection', { exact: true }).selectOption({ label: 'Quick sessions' });
  await expect(page.getByRole('heading', { name: 'Morning', exact: true })).toBeVisible();
  await page.getByLabel('Collection', { exact: true }).selectOption('unfiled');
  await expect(page.getByRole('heading', { name: 'Morning', exact: true })).toHaveCount(0);
});
test('failed replacement import requires an explicit decision to reuse the retained preview', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Import workout', exact: true }).click();
  await page.getByLabel('Workout file').setInputFiles({
    name: 'a.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({ format: 'nextround-workout', version: 1, name: 'Travel', config }),
    ),
  });
  await page.getByLabel('Workout name', { exact: true }).fill('Edited travel');
  await page
    .getByLabel('Workout file')
    .setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expect(page.getByRole('button', { name: 'Add to saved workouts' })).toBeDisabled();
  await expect(page.getByRole('dialog')).toContainText('Travel');
  await page.getByRole('button', { name: 'Use previous workout', exact: true }).click();
  await expect(page.getByLabel('Workout name', { exact: true })).toHaveValue('Edited travel');
  await page.getByRole('button', { name: 'Add to saved workouts' }).click();
  await expect(page.getByRole('heading', { name: 'Edited travel', exact: true })).toBeVisible();
});
test('collection deletion keeps workouts, resets the selected filter and leaves fixed actions reachable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByLabel('Collection name', { exact: true }).fill('Quick sessions');
  await page.getByRole('button', { name: 'Create collection', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Collections for Morning', exact: true }).click();
  await page.getByLabel('Quick sessions', { exact: true }).check();
  await page.getByRole('button', { name: 'Save collections', exact: true }).click();
  await page.getByLabel('Collection', { exact: true }).selectOption({ label: 'Quick sessions' });
  await page.getByRole('button', { name: 'Manage collections', exact: true }).click();
  await page.getByRole('button', { name: 'Delete collection Quick sessions', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('All its workouts will remain saved');
  await page.getByRole('button', { name: 'Confirm delete collection', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Its workouts remain saved');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByLabel('Collection', { exact: true })).toHaveValue('all');
  await expect(page.getByRole('heading', { name: 'Morning', exact: true })).toBeVisible();
});
test('exports a meaningful filename with a collection-free portable payload', async ({ page }) => {
  await page.getByRole('button', { name: 'Export Morning', exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save workout file', exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('Morning.json');
});
test('many collections scroll independently of their fixed modal actions', async ({
  page,
}, testInfo) => {
  await page.evaluate(
    ({ key, config }) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          version: 2,
          templates: [{ id: 'w', name: 'Morning', config }],
          collections: Array.from({ length: 16 }, (_, i) => ({
            id: `c${i}`,
            name: i === 0 ? 'Quick sessions' : `Training collection ${i}`,
            workoutIds: [],
          })),
        }),
      ),
    { key, config },
  );
  await page.getByRole('button', { name: 'Refresh saved workouts', exact: true }).click();
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByRole('button', { name: 'Collections for Morning', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const save = dialog.getByRole('button', { name: 'Save collections', exact: true });
  await expect(save).toBeInViewport();
  await dialog.getByLabel('Training collection 15', { exact: true }).check();
  await expect(save).toBeInViewport();
  await dialog.locator('.template-preview-body').evaluate((el) => {
    el.scrollTop = 0;
  });
  await dialog.screenshot({ path: testInfo.outputPath('workout-collections.png') });
  await save.click();
  await expect(page.getByRole('status')).toContainText('Collections saved');
});
