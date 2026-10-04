import { expect, test } from '@playwright/test';

test('setup errors belong to each mode and correcting one field preserves other errors', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByLabel('Minutes', { exact: true }).fill('-1');
  await page.getByLabel('Lead-in seconds').fill('-1');
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await expect(page.getByLabel('Minutes', { exact: true })).toBeFocused();
  await page.getByLabel('Minutes', { exact: true }).fill('1');
  await expect(page.getByLabel('Lead-in seconds')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Lead-in seconds')).toHaveAttribute(
    'aria-describedby',
    /leadInSeconds/,
  );
  await page.getByRole('button', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Build a For Time workout' }).click();
  await expect(page.getByLabel('Lead-in seconds')).toHaveAttribute('aria-invalid', 'false');
});
test('invalid exercise list is explained and focused from Save', async ({ page }) => {
  await page.goto('/ladder');
  await page.getByRole('button', { name: 'Save workout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add exercise', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Add exercise', exact: true })).toHaveAttribute(
    'aria-describedby',
    /.+/,
  );
});

for (const [path, start] of [
  ['emom', 'Start workout'],
  ['countdown', 'Start countdown'],
  ['amrap', 'Start AMRAP'],
  ['intervals', 'Start intervals'],
  ['for-time', 'Start For Time'],
  ['ladder', 'Start Ladder'],
]) {
  test(`${path} links its timing error and focuses it at minimum window size`, async ({ page }) => {
    await page.setViewportSize({ width: 760, height: 620 });
    await page.goto(`/${path}`);
    const input = page.getByLabel('Lead-in seconds');
    await input.fill('-1');
    await page.getByRole('button', { name: start, exact: true }).click();
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    const ids = (await input.getAttribute('aria-describedby'))?.split(' ') ?? [];
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) await expect(page.locator(`[id="${id}"]`)).toBeVisible();
  });
}
