import { expect, type Page, test } from '@playwright/test';

const upNextName = async (page: Page) =>
  ((await page.locator('.up-next strong').textContent()) ?? '').split(' · ')[0];

test('EMOM previews the next movement description and keeps controls in view', async ({ page }) => {
  // A minute of fake time renders every tick; slower CI runners exceed the default 30 s budget.
  test.setTimeout(90000);
  await page.setViewportSize({ width: 760, height: 620 });
  await page.clock.install();
  await page.goto('/emom');
  await page.getByLabel('Total minutes').fill('2');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start workout' }).click();

  // The lead-in already describes the first movement, so the panel names it without repeating it.
  await expect(page.getByRole('heading', { name: 'Get ready' })).toBeVisible();
  await expect(page.getByTestId('next-description')).toHaveCount(0);

  await page.clock.runFor(2500);
  await expect(page.getByTestId('round-clock')).toHaveText(/00:5\d/);
  const nextDescription = page.getByTestId('next-description');
  await expect(nextDescription).toBeVisible();
  await expect(nextDescription).not.toBeEmpty();
  const description = await nextDescription.textContent();
  const name = await upNextName(page);
  await expect(page.getByRole('button', { name: 'Pause workout' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Stop workout' })).toBeInViewport();

  await page.clock.runFor(60000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await expect(page.locator('.movement-description')).toHaveText(description ?? '');
  await expect(page.locator('.up-next strong')).toHaveText('Finish strong.');
  await expect(page.getByTestId('next-description')).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop workout' }).click();
});

test('warm-up previews the next movement description outside the change window', async ({
  page,
}) => {
  // A minute of fake time renders every tick; slower CI runners exceed the default 30 s budget.
  test.setTimeout(90000);
  await page.clock.install();
  await page.goto('/emom');
  await page.getByRole('checkbox', { name: 'Add a warm-up' }).check();
  await page.getByRole('slider', { name: 'Warm-up length' }).fill('2');
  await page.getByLabel('Lead-in seconds').fill('2');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('Warm-up');
  await expect(page.getByTestId('next-description')).toHaveCount(0);

  await page.clock.runFor(2500);
  await expect(page.getByTestId('next-description')).toBeVisible();
  const description = await page.getByTestId('next-description').textContent();
  expect(description?.trim()).toBeTruthy();
  const name = await upNextName(page);

  // While changing position the heading and description already show the next movement.
  await page.clock.runFor(46000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(`Next: ${name}`);
  await expect(page.locator('.movement-description')).toHaveText(description ?? '');
  await expect(page.locator('.up-next')).toHaveCount(0);

  await page.clock.runFor(15000);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(name);
  await expect(page.getByText(/Last minute/)).toBeVisible();
  await expect(page.getByTestId('next-description')).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip warm-up' }).click();
  await expect(page.locator('.runner-top .mode-pill')).toHaveText('EMOM');
});
