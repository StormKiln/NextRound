import { expect, test } from '@playwright/test';

test('intervals run work/rest without final rest, pause and repeat', async ({ page }) => {
  await page.clock.install();
  await page.goto('/intervals');
  await page.clock.runFor(3200);
  await page.getByLabel('Work seconds', { exact: true }).fill('4');
  await page.getByLabel('Rest seconds', { exact: true }).fill('2');
  await page.getByLabel('Rounds', { exact: true }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start intervals', exact: true }).click();
  await expect(page.getByTestId('total-clock')).toHaveText('00:10');
  await page.clock.runFor(6100);
  await expect(page.getByTestId('interval-phase')).toHaveText('Rest');
  await page.getByRole('button', { name: 'Pause workout' }).click();
  const before = await page.getByTestId('round-clock').textContent();
  await page.clock.runFor(5000);
  await expect(page.getByTestId('round-clock')).toHaveText(before ?? '');
  await page.getByRole('button', { name: 'Resume workout' }).click();
  await page.clock.runFor(2000);
  await expect(page.getByTestId('interval-phase')).toHaveText('Work');
  await expect(page.getByText('Round 2 of 2', { exact: true })).toBeVisible();
  await page.clock.runFor(4000);
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await expect(page.getByText('00:10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.getByRole('button', { name: 'Repeat workout' }).click();
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop workout' }).click();
  await page.getByRole('button', { name: 'End workout' }).click();
  await expect(page.getByLabel('Work seconds', { exact: true })).toHaveValue('4');
});
test('save intervals, reload and load without replacing EMOM draft', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build intervals' }).click();
  await page.getByLabel('Work seconds', { exact: true }).fill('30');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await page.getByLabel('Workout name').fill('Thirty on');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Workout saved.')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Load Thirty on', exact: true }).click();
  await page.getByRole('button', { name: 'Load workout', exact: true }).click();
  await expect(page.getByLabel('Work seconds', { exact: true })).toHaveValue('30');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build an EMOM' }).click();
  await expect(page.getByLabel('Total minutes')).toHaveValue('15');
});
test('padded search matches and whitespace-only search collapses groups', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByLabel('Search exercises').fill('  kettlebell   swing  ');
  await expect(page.getByRole('button', { name: /^Kettlebell swing/ })).toBeVisible();
  await page.getByLabel('Search exercises').fill('   ');
  await expect(page.locator('.exercise-group summary')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /^Kettlebell swing/ })).toBeHidden();
});
test('oversized EMOM target warns without blocking intentional saving', async ({ page }) => {
  await page.goto('/emom');
  await page
    .getByRole('button', { name: /Edit target/ })
    .first()
    .click();
  await page.getByLabel('Target unit').selectOption('seconds');
  await page.getByLabel('Target amount').fill('90');
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'exceeds the 60-second work phase',
  );
  await page.getByRole('button', { name: 'Save target' }).click();
  await expect(page.getByText('90 sec', { exact: true })).toBeVisible();
});
test('About native link failure shows exact URL and successful retry clears it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let attempts = 0;
    Object.defineProperty(window, 'isTauri', { value: true });
    Object.defineProperty(window, '__TAURI_EVENT_PLUGIN_INTERNALS__', {
      value: { unregisterListener: () => {} },
    });
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      value: {
        transformCallback: () => 1,
        invoke: async (cmd: string) => {
          if (cmd === 'distribution_channel') return 'app-store';
          if (cmd === 'read_workout_templates') return { version: 1, templates: [] };
          if (cmd === 'get_close_behavior') return 'minimize';
          if (cmd === 'open_project_page' && ++attempts === 1)
            throw new Error('Browser unavailable');
          return null;
        },
      },
    });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await page.getByRole('link', { name: 'Privacy policy', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(
    'https://github.com/StormKiln/NextRound/blob/main/PRIVACY.md',
  );
  await page.getByRole('link', { name: 'Privacy policy', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
