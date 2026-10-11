import { expect, test } from '@playwright/test';

const key = 'nextround.workout-history.v1';
const result = {
  id: 'one',
  completedAt: 1780000000000,
  elapsedMs: 60000,
  checkedExerciseIds: [],
  config: {
    type: 'countdown',
    durationSeconds: 60,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: [{ id: 'a', name: 'Squat' }],
  },
};
test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    ({ key, result }) => {
      if (!localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify({ version: 1, results: [result] }));
    },
    { key, result },
  );
  await page.goto('/history');
});
test('notes save as plain text and are searchable without changing the workout', async ({
  page,
}) => {
  await page.getByRole('button', { name: /^View result:/ }).click();
  await page.getByRole('button', { name: 'Add note', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Workout note', exact: true })
    .fill('24 kg\n<script>not markup</script> Café');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(
    page.getByText('24 kg\n<script>not markup</script> Café', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByLabel('Search history').fill('cafe\u0301');
  await expect(page.locator('.history-list > li')).toHaveCount(1);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? 'null').results[0],
    key,
  );
  expect(saved).toEqual({ ...result, note: '24 kg\n<script>not markup</script> Café' });
});
test('stale repeat recovers via refresh and restores heading focus', async ({ page }) => {
  await page.getByRole('button', { name: /^View result:/ }).click();
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, results: [] })),
    key,
  );
  await page.getByRole('button', { name: 'Repeat from setup' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('no longer exists');
  await page.getByRole('dialog').getByRole('button', { name: 'Refresh history' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
});
test('deleting the only result restores stable heading focus', async ({ page }) => {
  await page.getByRole('button', { name: /^Delete result:/ }).click();
  await page.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
});
test('long result keeps footer visible in the minimum window', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.evaluate(
    ({ key, result }) => {
      result.config.exercises = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Long exercise ${i} ${'words '.repeat(12)}`,
      }));
      localStorage.setItem(key, JSON.stringify({ version: 1, results: [result] }));
    },
    { key, result },
  );
  await page.reload();
  await page.getByRole('button', { name: /^View result:/ }).click();
  await expect(page.getByRole('button', { name: 'Repeat from setup' })).toBeInViewport();
  await expect(
    page.getByRole('heading', { name: 'Countdown result', exact: true }),
  ).toBeInViewport();
  expect(
    await page
      .locator('.history-detail-body')
      .evaluate((body) => body.scrollHeight > body.clientHeight),
  ).toBe(true);
});

test('unsaved cancel preserves draft and discard keeps persisted note', async ({ page }) => {
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByRole('textbox', { name: 'Workout note', exact: true }).fill('Keep this draft');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('textbox', { name: 'Workout note', exact: true })).toHaveValue(
    'Keep this draft',
  );
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('dialog', { name: 'Workout note', exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null').results[0].note,
      key,
    ),
  ).toBeUndefined();
});

test('conflict refresh preserves proposed text and explicitly reviews the new note', async ({
  page,
}) => {
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByRole('textbox', { name: 'Workout note', exact: true }).fill('My draft');
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.results[0].note = 'Another edit';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Workout note', exact: true });
  await expect(editor.getByRole('alert')).toContainText('note changed');
  await editor.getByRole('button', { name: 'Refresh history' }).click();
  await expect(editor.getByRole('textbox', { name: 'Workout note', exact: true })).toHaveValue(
    'My draft',
  );
  await expect(editor.getByRole('region', { name: 'Latest saved note' })).toContainText(
    'Another edit',
  );
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByText('My draft', { exact: true })).toBeVisible();
});

test('missing note result retains text and cannot be recreated', async ({ page }) => {
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  await page.getByRole('textbox', { name: 'Workout note', exact: true }).fill('Copy me');
  await page.evaluate(
    (key) => localStorage.setItem(key, JSON.stringify({ version: 1, results: [] })),
    key,
  );
  const editor = page.getByRole('dialog', { name: 'Workout note', exact: true });
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('no longer exists');
  await editor.getByRole('button', { name: 'Refresh history' }).click();
  await expect(editor.getByRole('textbox', { name: 'Workout note', exact: true })).toHaveValue(
    'Copy me',
  );
  await expect(editor.getByRole('button', { name: 'Save note', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Discard changes' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
});

test('Unicode limit can be corrected and blank note clears annotation', async ({ page }) => {
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  const field = page.getByRole('textbox', { name: 'Workout note', exact: true });
  await field.fill('😀'.repeat(2001));
  await expect(page.getByRole('button', { name: 'Save note', exact: true })).toBeDisabled();
  await field.fill('😀'.repeat(2000));
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('button', { name: 'Edit note' }).click();
  await field.fill(' \n ');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add note' })).toBeVisible();
});

test('browser back offers save and keep editing without losing the draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Workout history', exact: true }).click();
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  await page
    .getByRole('textbox', { name: 'Workout note', exact: true })
    .fill('Saved before leaving');
  await page.goBack();
  await page.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('textbox', { name: 'Workout note', exact: true })).toHaveValue(
    'Saved before leaving',
  );
  await page.goBack();
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null').results[0].note,
      key,
    ),
  ).toBe('Saved before leaving');
});

test('saving a note that removes the search match restores history focus on close', async ({
  page,
}) => {
  await page.evaluate((key) => {
    const doc = JSON.parse(localStorage.getItem(key) ?? 'null');
    doc.results[0].note = 'Matching note';
    localStorage.setItem(key, JSON.stringify(doc));
  }, key);
  await page.reload();
  await page.getByLabel('Search history').fill('Matching');
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Edit note' }).click();
  await page.getByRole('textbox', { name: 'Workout note', exact: true }).fill('Changed');
  await page.getByRole('button', { name: 'Save note', exact: true }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout history', exact: true })).toBeFocused();
  await expect(page.getByLabel('Search history')).toHaveValue('Matching');
});

test('failed write and refresh preserve draft and stored bytes', async ({ page }) => {
  await page.getByRole('button', { name: /^View result/ }).click();
  await page.getByRole('button', { name: 'Add note' }).click();
  const editor = page.getByRole('dialog', { name: 'Workout note', exact: true });
  await editor.getByRole('textbox', { name: 'Workout note', exact: true }).fill('Recoverable');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new Error('Disk full');
    };
  });
  await editor.getByRole('button', { name: 'Save note', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('Disk full');
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? 'null').results[0].note,
      key,
    ),
  ).toBeUndefined();
  await page.evaluate(() => {
    Storage.prototype.getItem = () => {
      throw new Error('Cannot read');
    };
  });
  await editor.getByRole('button', { name: 'Refresh history' }).click();
  await expect(editor.getByRole('alert')).toContainText('Cannot read');
  await expect(editor.getByRole('textbox', { name: 'Workout note', exact: true })).toHaveValue(
    'Recoverable',
  );
});
