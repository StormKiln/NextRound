import { expect, test } from '@playwright/test';

const exercise = {
  id: 'a',
  catalogId: 'pushup',
  name: 'Push-up',
  description: 'Lower and press.',
  target: { unit: 'reps', value: 10 },
};
const configs = [
  { type: 'emom', minutes: 1 },
  { type: 'countdown', durationSeconds: 60 },
  { type: 'intervals', rounds: 1, workSeconds: 60, restSeconds: 10 },
  { type: 'amrap', durationSeconds: 60 },
  { type: 'forTime', timeCapSeconds: 120 },
  {
    type: 'ladder',
    timeCapSeconds: 120,
    ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 1 },
  },
];
for (const mode of configs) {
  test(`${mode.type} compares saved attempts at minimum window size and after restart`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    const config = { ...mode, leadInSeconds: 0, warningSeconds: 0, exercises: [exercise] };
    const results = [1, 2].map((n) => ({
      id: `r${n}`,
      completedAt: 1700000000000 + n * 1000,
      elapsedMs: ['forTime', 'ladder'].includes(mode.type) ? 70000 - n * 10000 : 60000,
      config: {
        ...config,
        exercises: [
          { ...exercise, id: `e${n}`, ...(mode.type === 'ladder' ? { target: undefined } : {}) },
        ],
      },
      checkedExerciseIds: [],
      ...(mode.type === 'amrap'
        ? { amrapProgress: { completedMovements: n, partialValue: 0 } }
        : {}),
      ...(['forTime', 'ladder'].includes(mode.type) ? { outcome: 'finished' } : {}),
      ...(mode.type === 'ladder' ? { ladderCompletedMovements: 1 } : {}),
    }));
    await page.addInitScript((data) => {
      if (!localStorage.getItem('nextround.workout-history.v1'))
        localStorage.setItem(
          'nextround.workout-history.v1',
          JSON.stringify({ version: 1, results: data }),
        );
    }, results);
    await page.goto('/history');
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(/active time · 1 exercise(?:$| ·)/).first()).toBeVisible();
    await page
      .getByRole('button', { name: /View result:/ })
      .first()
      .click();
    await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Compare attempts' });
    await expect(dialog.getByText('2 matching attempts')).toBeVisible();
    if (['forTime', 'ladder'].includes(mode.type))
      await expect(dialog.getByText(/10.0 seconds faster/)).toBeVisible();
    else if (mode.type === 'amrap')
      await expect(dialog.getByText(/Further recorded progress/)).toBeVisible();
    else await expect(dialog.getByText(/Scheduled time is fixed/).first()).toBeVisible();
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await expect(close).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('button', { name: /View result:/ })).toHaveCount(2);
    await page.getByLabel('Search history').fill('pushups');
    await expect(page.getByRole('button', { name: /View result:/ })).toHaveCount(2);
  });
}

test('one-round setup and picker usage use singular nouns', async ({ page }) => {
  await page.goto('/emom');
  await page.getByLabel('Total minutes').fill('1');
  await expect(page.getByText(/1 round, cycling through/)).toBeVisible();
});

test('generated interval seconds fit a short work phase and undo preserves the draft', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({
        version: 1,
        results: [
          {
            id: 'plank-result',
            completedAt: 1700000000000,
            elapsedMs: 60000,
            config: {
              minutes: 1,
              leadInSeconds: 0,
              warningSeconds: 0,
              exercises: [{ id: 'old', catalogId: 'plank', name: 'Plank' }],
            },
            checkedExerciseIds: [],
          },
        ],
      }),
    ),
  );
  await page.goto('/intervals');
  await page.getByLabel('Work seconds').fill('10');
  await page.getByRole('button', { name: 'Create a workout', exact: true }).click();
  await page.getByRole('button', { name: 'My Favorites', exact: true }).click();
  await page.getByLabel('Number of exercises').fill('1');
  await page.getByRole('button', { name: 'Generate workout', exact: true }).click();
  const list = page.getByRole('list', { name: 'Ordered exercises' });
  await expect(list.getByText('Plank', { exact: true })).toBeVisible();
  await expect(list.getByText('10 sec', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Work seconds')).toHaveValue('10');
  await page.getByRole('button', { name: 'Undo generated workout' }).click();
  await expect(list.getByText('10 sec', { exact: true })).toHaveCount(0);
});

test('comparison handles one attempt, read failure, retry and deleted history without overwriting data', async ({
  page,
}) => {
  const data = {
    version: 1,
    results: [
      {
        id: 'single',
        completedAt: 1700000000000,
        elapsedMs: 60000,
        config: { minutes: 1, leadInSeconds: 0, warningSeconds: 0, exercises: [exercise] },
        checkedExerciseIds: [],
      },
    ],
  };
  await page.addInitScript(
    (data) => localStorage.setItem('nextround.workout-history.v1', JSON.stringify(data)),
    data,
  );
  await page.goto('/history');
  await page.getByRole('button', { name: /View result:/ }).click();
  await page.getByRole('button', { name: 'Compare attempts', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare attempts' });
  await expect(dialog.getByText(/No other matching attempt yet/)).toBeVisible();
  await page.evaluate(() => localStorage.setItem('nextround.workout-history.v1', 'broken'));
  await dialog.getByRole('button', { name: 'Refresh attempts' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Existing results are preserved');
  expect(await page.evaluate(() => localStorage.getItem('nextround.workout-history.v1'))).toBe(
    'broken',
  );
  await page.evaluate(
    (data) => localStorage.setItem('nextround.workout-history.v1', JSON.stringify(data)),
    data,
  );
  await dialog.getByRole('button', { name: 'Retry comparisons' }).click();
  await expect(dialog.getByText('1 matching attempt', { exact: true })).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.workout-history.v1',
      JSON.stringify({ version: 1, results: [] }),
    ),
  );
  await dialog.getByRole('button', { name: 'Refresh attempts' }).click();
  await expect(dialog.getByText(/This result is no longer in history/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No saved results yet.' })).toBeVisible();
});
