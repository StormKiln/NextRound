import { expect, test } from '@playwright/test';

test('home opens EMOM and preserves its draft when returning home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
  await page.getByRole('button', { name: 'Build an EMOM' }).click();
  await page.getByLabel('Total minutes').fill('12');
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build an EMOM' }).click();
  await expect(page.getByLabel('Total minutes')).toHaveValue('12');
});

test('splash remains visible for three seconds and blocks underlying actions', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Starting NextRound' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Build an EMOM' })).toHaveCount(0);
  await page.clock.runFor(2900);
  await expect(page.getByRole('status', { name: 'Starting NextRound' })).toBeVisible();
  await page.clock.runFor(200);
  await expect(page.getByRole('heading', { name: 'Your next round starts here.' })).toBeVisible();
});

test('Settings supports keyboard closing and About information at minimum size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await page.getByRole('button', { name: 'About', exact: true }).click();
  await expect(page.getByText('Version 1.7.0', { exact: true })).toBeVisible();
  const privacy = page.getByRole('link', { name: 'Privacy policy', exact: true });
  await expect(privacy).toBeVisible();
  await expect(privacy).toHaveAttribute(
    'href',
    'https://github.com/StormKiln/NextRound/blob/main/PRIVACY.md',
  );
  await expect(privacy).toHaveAttribute('target', '_blank');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeFocused();
});

test('home navigation is disabled during both running and paused workouts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Build an EMOM' }).click();
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Start workout' }).click();
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Pause workout' }).click();
  await expect(page.getByRole('button', { name: 'Home', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(page.getByRole('button', { name: 'Resume workout' })).toBeVisible();
});
