import { expect, test } from '@playwright/test';

test('bundled copy search uses aliases and provides no-match recovery', async ({ page }) => {
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Copy a bundled exercise' }).click();
  await page.getByLabel('Search my exercise library').fill('pushup');
  await expect(page.getByRole('button', { name: 'Copy Push-up', exact: true })).toBeVisible();
  await page.getByLabel('Search my exercise library').fill('nothingmatchesxyz');
  await expect(page.getByText('No bundled exercises match.')).toBeVisible();
  await page.getByRole('button', { name: 'Clear exercise search' }).click();
  await expect(page.getByLabel('Search my exercise library')).toHaveValue('');
});

test('dirty exercise drafts survive Cancel and Escape until explicitly discarded', async ({
  page,
}) => {
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Create personal exercise', exact: true });
  await page.getByLabel('Exercise name', { exact: true }).fill('My new movement');
  await editor.getByRole('button', { name: 'Cancel', exact: true }).click();
  const confirmation = page.getByRole('dialog', { name: 'Discard exercise changes?' });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Exercise name', { exact: true })).toHaveValue('My new movement');
  await page.keyboard.press('Escape');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Discard changes' }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Create exercise', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Create exercise', exact: true }).click();
  await page.getByLabel('Exercise name', { exact: true }).fill('temporary');
  await page.getByLabel('Exercise name', { exact: true }).fill('');
  await page.keyboard.press('Escape');
  await expect(editor).toHaveCount(0);
  await expect(confirmation).toHaveCount(0);
});

test('CSV export uses applied filters and opt-in notes, and excludes subsequent data changes', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({
        version: 1,
        results: [
          {
            id: 'export-one',
            completedAt: Date.parse('2026-10-12T12:00:00Z'),
            elapsedMs: 60000,
            note: 'Include me',
            checkedExerciseIds: [],
            config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 0 },
          },
          {
            id: 'export-two',
            completedAt: Date.parse('2026-10-11T12:00:00Z'),
            elapsedMs: 120000,
            note: 'Other',
            checkedExerciseIds: [],
            config: {
              type: 'countdown',
              durationSeconds: 120,
              leadInSeconds: 0,
              warningSeconds: 0,
            },
          },
        ],
      }),
    ),
  );
  await page.goto('/history');
  await page.getByLabel('Search history').fill('Include me');
  await page.getByRole('button', { name: 'Export CSV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export workout history' });
  await expect(dialog).toContainText('1 saved session');
  await expect(dialog.getByLabel('Include workout notes')).not.toBeChecked();
  await dialog.getByLabel('Include workout notes').check();
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({ version: 1, results: [] }),
    ),
  );
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Save CSV' }).click(),
  ]);
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Missing download stream');
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv).toContain('export-one');
  expect(csv).not.toContain('export-two');
  expect(csv).toContain('Include me');
  await expect(dialog).toHaveCount(0);
});
test('empty or unreadable history cannot be exported', async ({ page }) => {
  await page.goto('/history');
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
  await page.evaluate(() => localStorage.setItem('nextround.workout-history.v1', 'invalid'));
  await page.getByRole('button', { name: 'Refresh history', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV', exact: true })).toBeDisabled();
});

test('metadata-only edits and failed saves remain protected at minimum window size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Copy a bundled exercise', exact: true }).click();
  await page.getByLabel('Search my exercise library').fill('Wall push-up');
  await page.getByRole('button', { name: 'Copy Wall push-up', exact: true }).click();
  await page.getByLabel('Category', { exact: true }).selectOption('Other bodyweight');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Discard exercise changes?' });
  await expect(confirm.getByRole('button', { name: 'Keep editing' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(confirm).toHaveCount(0);
  await expect(page.getByLabel('Category', { exact: true })).toHaveValue('Other bodyweight');
  await page.getByLabel('Set a default target').check();
  await page.getByLabel('Default amount').fill('7');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'nextround.personal-exercises.v1') throw new Error('Disk full');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: 'Save exercise', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Disk full');
  await page.keyboard.press('Escape');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByLabel('Default amount')).toHaveValue('7');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await confirm.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('button', { name: 'Copy Wall push-up', exact: true })).toBeFocused();
});

test('native key ordering does not make an unchanged or reverted default target dirty', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            archived: false,
            category: 'Other bodyweight',
            defaultTarget: { unit: 'reps', value: 7 },
            description: 'Original cue',
            equipment: [],
            id: 'personal:native',
            name: 'Native movement',
            supportedUnits: ['reps'],
            targetAreas: ['core'],
          },
        ],
      }),
    ),
  );
  await page.goto('/exercises');
  await page.getByRole('button', { name: 'Edit Native movement', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit Native movement', exact: true }).click();
  await page.getByLabel('Default amount').fill('9');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await page.getByLabel('Default amount').fill('7');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`new carries use time targets and stay out of reps-only selection in ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/${mode}`);
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Search exercises').fill('db farmers carry');
    const choice = page.getByRole('button', { name: /^Dumbbell farmer carry / });
    if (mode === 'ladder') await expect(choice).toHaveCount(0);
    else {
      await choice.click();
      const row = page.getByTestId('exercise-entry').filter({ hasText: 'Dumbbell farmer carry' });
      if (mode === 'emom' || mode === 'amrap') await expect(row).toContainText('30 sec');
      await row
        .getByRole('button', { name: /^(Edit|Set) target for Dumbbell farmer carry$/ })
        .click();
      await expect(page.getByLabel('Target unit').locator('option')).toHaveText([
        'Seconds',
        'Metres',
      ]);
      await page.getByLabel('Target unit').selectOption('metres');
      await page.getByLabel('Target amount').fill('25');
      await page.getByRole('button', { name: 'Save target', exact: true }).click();
      await expect(row).toContainText('25 m');
    }
  });
}
