import { expect, test } from '@playwright/test';

for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'for-time', 'ladder']) {
  test(`${mode} offers warm-up and cool-down options with a five-minute default`, async ({
    page,
  }) => {
    await page.goto(`/${mode}`);
    const options = page.getByRole('group', { name: 'Warm-up and cool-down' });
    const warmup = options.getByRole('checkbox', { name: 'Add a warm-up' });
    const cooldown = options.getByRole('checkbox', { name: 'Add a cool-down' });
    await expect(warmup).not.toBeChecked();
    await expect(cooldown).not.toBeChecked();
    await expect(options.getByRole('slider')).toHaveCount(0);
    await warmup.check();
    const length = options.getByRole('slider', { name: 'Warm-up length' });
    await expect(length).toHaveValue('5');
    await expect(length).toHaveAttribute('min', '1');
    await expect(length).toHaveAttribute('max', '15');
    await expect(options.locator('output')).toHaveText('5 min');
    const movements = options.getByRole('list', { name: 'Warm-up movements' }).locator('li');
    await expect(movements).toHaveCount(5);
    await expect(
      options.getByText(/with warm-up and cool-down|warm-up and cool-down add/i),
    ).toBeVisible();
    await length.fill('3');
    await expect(movements).toHaveCount(3);
    await warmup.uncheck();
    await expect(options.getByRole('slider')).toHaveCount(0);
    await warmup.check();
    await expect(length).toHaveValue('3');
    await cooldown.check();
    await expect(options.getByRole('slider', { name: 'Cool-down length' })).toHaveValue('5');
    await expect(
      options.getByRole('list', { name: 'Cool-down movements' }).locator('li'),
    ).toHaveCount(5);
    await page.reload();
    await expect(page.getByRole('checkbox', { name: 'Add a warm-up' })).toBeChecked();
    await expect(page.getByRole('slider', { name: 'Warm-up length' })).toHaveValue('3');
    await expect(page.getByRole('checkbox', { name: 'Add a cool-down' })).toBeChecked();
  });
}

test('reshuffle replaces the warm-up preview without changing its length', async ({ page }) => {
  await page.goto('/emom');
  await page.getByRole('checkbox', { name: 'Add a warm-up' }).check();
  const list = page.getByRole('list', { name: 'Warm-up movements' }).locator('li');
  await expect(list).toHaveCount(5);
  const before = await list.allTextContents();
  let after = before;
  for (let i = 0; i < 5 && after.join() === before.join(); i++) {
    await page.getByRole('button', { name: 'Reshuffle warm-up' }).click();
    after = await list.allTextContents();
  }
  expect(after).toHaveLength(5);
  if (process.env.NEXTROUND_CAPTURE) {
    await page.getByRole('checkbox', { name: 'Add a cool-down' }).check();
    await page.getByRole('group', { name: 'Warm-up and cool-down' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'docs/screenshots/warmup-cooldown.png' });
  }
  expect(after.join()).not.toBe(before.join());
  expect(new Set(after).size).toBe(5);
});

test('runs warm-up, workout and cool-down in order and saves one result with both', async ({
  page,
}) => {
  // Over three minutes of fake time plus UI checks exceed the default 30 s budget.
  test.setTimeout(90000);
  await page.clock.install();
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('10');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('checkbox', { name: 'Add a warm-up' }).check();
  await page.getByRole('slider', { name: 'Warm-up length' }).fill('1');
  await page.getByRole('checkbox', { name: 'Add a cool-down' }).check();
  await page.getByRole('slider', { name: 'Cool-down length' }).fill('1');
  const firstWarmup = await page
    .getByRole('list', { name: 'Warm-up movements' })
    .locator('li')
    .first()
    .textContent();
  await page.getByRole('button', { name: 'Start countdown' }).click();

  await expect(page.locator('.runner-top .mode-pill')).toHaveText('Warm-up');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(firstWarmup ?? '');
  await expect(page.getByText('Hold for 45 seconds')).toBeVisible();
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/warmup-runner.png' });
  await page.clock.runFor(46000);
  await expect(page.getByText('Change position')).toBeVisible();
  await page.clock.runFor(15000);
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('Countdown');

  await page.clock.runFor(10100);
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('Cool-down');
  await page.getByRole('button', { name: 'Pause cool-down' }).click();
  await page.clock.runFor(5000);
  await page.getByRole('button', { name: 'Resume cool-down' }).click();
  await page.clock.runFor(20000);
  await page.getByRole('button', { name: 'End cool-down' }).click();

  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await expect(page.getByText(/01:00 warm-up · 00:2\d cool-down/)).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
});

test('skipping the warm-up starts the workout straight away', async ({ page }) => {
  await page.clock.install();
  await page.goto('/emom');
  await page.getByRole('checkbox', { name: 'Add a warm-up' }).check();
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('Warm-up');
  await page.getByRole('button', { name: 'Skip warm-up' }).click();
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('EMOM');
  await page.getByRole('button', { name: 'Stop workout' }).click();
});
