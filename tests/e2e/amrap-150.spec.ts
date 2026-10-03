import { expect, test } from '@playwright/test';

test('long AMRAP circuits follow advance, undo and wrap without stealing focus or resetting manual scroll', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/amrap');
  for (let i = 0; i < 10; i++) {
    await page.getByRole('button', { name: 'Custom exercise', exact: true }).click();
    await page.getByLabel('Exercise name').fill(`Movement ${i}`);
    await page.getByRole('button', { name: 'Add custom exercise', exact: true }).click();
  }
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Start AMRAP', exact: true }).click();
  const complete = page.getByRole('button', { name: 'Complete movement', exact: true });
  const current = page.locator('.amrap-circuit [aria-current="step"]');
  const list = page.locator('.amrap-circuit');
  for (let i = 0; i < 12; i++) await complete.click();
  await expect(current).toBeInViewport({ ratio: 1 });
  await expect(complete).toBeFocused();
  await expect(page.getByTestId('round-clock')).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('button', { name: 'Stop workout', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await complete.click();
  await expect(current).toContainText('Air squat');
  await expect(current).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: 'Undo movement', exact: true }).click();
  await expect(current).toContainText('Movement 9');
  await expect(current).toBeInViewport({ ratio: 1 });
  await list.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(400);
  expect(await list.evaluate((el) => el.scrollTop)).toBe(0);
});
