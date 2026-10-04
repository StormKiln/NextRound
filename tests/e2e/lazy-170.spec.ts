import { expect, test } from '@playwright/test';

test('home defers setup code and failed setup loading offers retry without resetting home', async ({
  page,
}) => {
  const requests: string[] = [];
  page.on('request', (r) => requests.push(r.url()));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Build a For Time workout' })).toBeVisible();
  expect(requests.some((url) => url.includes('/features/for-time/setup.tsx'))).toBe(false);
  let blocked = true;
  await page.route('**/features/for-time/setup.tsx*', (route) =>
    blocked ? route.abort() : route.continue(),
  );
  await page.getByRole('button', { name: 'Build a For Time workout' }).click();
  await expect(page.getByRole('button', { name: 'Retry loading screen' })).toBeVisible();
  blocked = false;
  await page.getByRole('button', { name: 'Retry loading screen' }).click();
  await expect(page.getByRole('button', { name: 'Start For Time', exact: true })).toBeVisible();
});
