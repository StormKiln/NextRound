import { expect, test } from '@playwright/test';

const modes = [
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
for (const mode of modes) {
  test(`${mode.type} note survives reload and repeat copies configuration only`, async ({
    page,
  }) => {
    const result = {
      id: mode.type,
      completedAt: 1780000000000,
      elapsedMs: 60000,
      checkedExerciseIds: [],
      config: {
        ...mode,
        leadInSeconds: 0,
        warningSeconds: 0,
        exercises:
          mode.type === 'countdown'
            ? []
            : [
                {
                  id: 'a',
                  name: 'Squat',
                  ...(mode.type === 'ladder' ? {} : { target: { unit: 'reps', value: 10 } }),
                },
              ],
      },
      ...(['forTime', 'ladder'].includes(mode.type) ? { outcome: 'finished' } : {}),
      ...(mode.type === 'ladder' ? { ladderCompletedMovements: 1 } : {}),
      ...(mode.type === 'amrap'
        ? { amrapProgress: { completedMovements: 1, partialValue: 0 } }
        : {}),
    };
    await page.addInitScript((result) => {
      if (!localStorage.getItem('nextround.workout-history.v1'))
        localStorage.setItem(
          'nextround.workout-history.v1',
          JSON.stringify({ version: 1, results: [result] }),
        );
    }, result);
    await page.goto('/history');
    await page.getByRole('button', { name: /^View result/ }).click();
    await page.getByRole('button', { name: 'Add note' }).click();
    await page.getByRole('textbox', { name: 'Workout note' }).fill(`Notes for ${mode.type}`);
    await page.getByRole('button', { name: 'Save note', exact: true }).click();
    await page.reload();
    await page.getByRole('button', { name: /^View result/ }).click();
    await expect(page.getByText(`Notes for ${mode.type}`, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Repeat from setup' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/${mode.type === 'forTime' ? 'for-time' : mode.type}$`),
    );
    await expect(page.getByText(`Notes for ${mode.type}`, { exact: true })).toHaveCount(0);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('nextround.workout-history.v1') ?? 'null').results[0],
      ),
    ).toEqual({ ...result, note: `Notes for ${mode.type}` });
  });
}
