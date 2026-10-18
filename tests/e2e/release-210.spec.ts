import { expect, test } from '@playwright/test';

const training = {
  version: 1,
  results: [],
  actuals: {},
  recovery: null,
  sessions: [
    {
      id: 's',
      name: 'Adaptable',
      collections: ['c'],
      blocks: [
        {
          id: 'b',
          name: 'Work',
          restSeconds: 0,
          advance: 'automatic',
          config: {
            type: 'countdown',
            durationSeconds: 1,
            leadInSeconds: 0,
            warningSeconds: 0,
            exercises: [
              { id: 'push', name: 'Push-up', supportedUnits: ['reps', 'seconds'] },
              { id: 'hold', name: 'Plank', supportedUnits: ['seconds'] },
            ],
          },
        },
      ],
    },
  ],
};
test('movement changes review incompatible actuals before clearing and preserve cancel', async ({
  page,
}) => {
  await page.addInitScript(
    (data) => localStorage.setItem('nextround.training.v1', JSON.stringify(data)),
    training,
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Adaptable', exact: true }).click();
  await page.getByRole('button', { name: 'Start session', exact: true }).click();
  await page.getByRole('button', { name: 'Record actuals for Work', exact: true }).click();
  await page.getByRole('button', { name: 'Remove entry 2', exact: true }).click();
  await page.getByLabel('Reps', { exact: true }).fill('12');
  await page.getByRole('combobox', { name: 'Movement', exact: true }).selectOption('hold');
  const confirm = page.getByRole('dialog', { name: 'Change recorded movement?', exact: true });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Keep movement', exact: true }).click();
  await expect(page.getByLabel('Reps', { exact: true })).toHaveValue('12');
  await page.getByRole('combobox', { name: 'Movement', exact: true }).selectOption('hold');
  await confirm.getByRole('button', { name: 'Change movement', exact: true }).click();
  await expect(page.getByLabel('Reps', { exact: true })).toHaveCount(0);
  await page.getByLabel('Seconds', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Save actual performance', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Record actual performance', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Save session result', exact: true }).click();
  const result = await page.evaluate(
    () => JSON.parse(localStorage.getItem('nextround.training.v1')!).results[0],
  );
  expect(result.blocks[0].actuals).toEqual([{ exerciseId: 'hold', occurrence: 0, seconds: 0 }]);
});
test('failed collection dependency is not displayed as unfiled and can retry', async ({ page }) => {
  await page.addInitScript((data) => {
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
    localStorage.setItem('nextround.workout-templates.v1', 'broken');
  }, training);
  await page.goto('/');
  const sessions = page.getByRole('region', { name: 'Saved training sessions' });
  await expect(sessions.getByText('Collections unavailable', { exact: true })).toBeVisible();
  await expect(sessions.getByText('Unfiled', { exact: true })).toHaveCount(0);
  await sessions.getByRole('button', { name: 'Collections', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Session collections', exact: true });
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeDisabled();
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 2,
        templates: [],
        collections: [{ id: 'c', name: 'Travel', workoutIds: [] }],
      }),
    ),
  );
  await dialog.getByRole('button', { name: 'Retry collections', exact: true }).click();
  await expect(dialog.getByLabel('Travel', { exact: true })).toBeChecked();
  await expect(dialog.getByRole('button', { name: 'Save changes', exact: true })).toBeEnabled();
});
test('native export cancellation is neutral while write errors remain actionable', async ({
  page,
}) => {
  await page.addInitScript((data) => {
    let attempts = 0;
    Object.defineProperty(window, 'isTauri', { value: true });
    Object.defineProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__', {
      value: { unregisterListener: () => {} },
    });
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {
        transformCallback: () => 1,
        invoke: async (cmd: string) => {
          if (cmd === 'read_training') return data;
          if (cmd === 'distribution_channel') return 'app-store';
          if (cmd === 'read_workout_templates')
            return { version: 2, templates: [], collections: [] };
          if (cmd === 'get_close_behavior') return 'minimize';
          if (cmd === 'save_workout_file') {
            if (attempts++ === 0) return false;
            throw Error('Export disk full');
          }
          return null;
        },
      },
    });
  }, training);
  await page.goto('/');
  const sessions = page.getByRole('region', { name: 'Saved training sessions' });
  const button = sessions.getByRole('button', { name: 'Export session', exact: true });
  await button.click();
  await expect(button).toBeEnabled();
  await expect(sessions.getByRole('alert')).toHaveCount(0);
  await expect(sessions.getByText('Session exported.', { exact: true })).toHaveCount(0);
  await button.click();
  await expect(sessions.getByRole('alert')).toContainText('Export disk full');
});
