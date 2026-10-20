import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page, count = 3) {
  await page.goto('/');
  const s = result220().session;
  s.blocks = Array.from({ length: count }, (_, i) => ({
    ...structuredClone(s.blocks[0]),
    id: `b${i}`,
    name: `Work ${i + 1}`,
    restSeconds: 5,
    advance: 'automatic' as const,
  }));
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [s], results: [], actuals: {}, recovery: null }),
      ),
    s,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
}
test('repeat selected ordered blocks independently and undo the whole operation', async ({
  page,
}) => {
  await seed(page);
  const saved = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  await page.getByRole('button', { name: 'Repeat blocks', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  await d.getByLabel('Repeat block 2: Work 2', { exact: true }).uncheck();
  await d.getByLabel('Additional copies').fill('2');
  await expect(d).toContainText('4 new blocks');
  await expect(d).toContainText('7 of 20');
  await expect(d).toContainText('currently final block');
  await d.getByRole('button', { name: 'Add repeated blocks', exact: true }).click();
  const blocks = page.getByLabel('Session blocks').locator(':scope > li');
  await expect(blocks).toHaveCount(7);
  await expect(page.getByLabel('Block 4 name', { exact: true })).toHaveValue('Work 1');
  await expect(page.getByLabel('Block 5 name', { exact: true })).toHaveValue('Work 3');
  await expect(page.getByRole('button', { name: 'Edit block 4', exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(saved);
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(blocks).toHaveCount(3);
});
test('repeat capacity and cancellation preserve draft and restore focus', async ({ page }) => {
  await seed(page, 10);
  const trigger = page.getByRole('button', { name: 'Repeat blocks', exact: true });
  await trigger.click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  await d.getByLabel('Additional copies').fill('2');
  await expect(d.getByRole('alert')).toContainText('20 blocks');
  await expect(d.getByRole('button', { name: 'Add repeated blocks', exact: true })).toBeDisabled();
  await d.getByLabel('Additional copies').fill('1');
  await expect(d).toContainText('20 of 20');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(10);
});
test('field errors are described and transitions are individually labelled', async ({ page }) => {
  await seed(page);
  const name = page.getByLabel('Block 1 name', { exact: true });
  await name.fill(' ');
  await expect(name).toHaveAccessibleDescription('Enter a block name.');
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(name).toBeFocused();
  await name.fill('Restored');
  await expect(name).not.toHaveAttribute('aria-describedby');
  await expect(page.getByLabel('After rest for block 1', { exact: true })).toHaveValue('automatic');
  await expect(page.getByLabel('After rest for block 2', { exact: true })).toHaveValue('automatic');
  await expect(page.getByText(/Final block — stored recovery: 5s/)).toBeVisible();
});

test('repeat preview handles empty and invalid selection without losing the draft', async ({
  page,
}) => {
  await seed(page, 2);
  await page.getByLabel('After rest for block 2', { exact: true }).selectOption('ready');
  await page.getByRole('button', { name: 'Repeat blocks', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  await expect(d).toContainText('wait until ready');
  for (const checkbox of await d.getByRole('checkbox').all()) await checkbox.uncheck();
  await expect(d.getByRole('alert')).toContainText('Select at least one block');
  await expect(d.getByRole('button', { name: 'Add repeated blocks' })).toBeDisabled();
  await d.getByRole('checkbox').first().check();
  await d.getByLabel('Additional copies').fill('1.5');
  await expect(d.getByRole('alert')).toContainText('whole number');
  await expect(d.getByLabel('Additional copies')).toHaveAttribute('aria-invalid', 'true');
  await d.getByLabel('Additional copies').fill('1');
  await d.getByRole('button', { name: 'Add repeated blocks' }).click();
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(3);
  await expect(page.getByLabel('After rest for block 2', { exact: true })).toHaveValue('ready');
  await expect(page.getByLabel('Block 3 name', { exact: true })).toHaveValue('Work 1');
});

test('repeat dialog keeps actions accessible with long names, enlarged text and scrollbars', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page, 10);
  await page
    .getByLabel('Block 1 name', { exact: true })
    .fill('Long descriptive movement sequence '.repeat(3));
  await page.addStyleTag({
    content:
      'html {font-size:20px !important} ::-webkit-scrollbar {width:16px;height:16px} ::-webkit-scrollbar-thumb {background:#777}',
  });
  const trigger = page.getByRole('button', { name: 'Repeat blocks', exact: true });
  await trigger.click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  await expect(d.getByLabel('Additional copies')).toBeFocused();
  for (const name of ['Cancel', 'Add repeated blocks'])
    await expect(d.getByRole('button', { name, exact: true })).toBeInViewport();
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  const body = d.locator('.repeat-block-body');
  expect(await body.evaluate((e) => e.scrollHeight > e.clientHeight)).toBe(true);
  await body.evaluate((e) => (e.scrollTop = e.scrollHeight));
  await expect(
    d.getByText('Final block — no transition recovery.', { exact: true }),
  ).toBeInViewport();
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/repeat-session-minimum.png' });
  await d.getByRole('button', { name: 'Add repeated blocks', exact: true }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(20);
  await expect(trigger).toBeDisabled();
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
});

test('repeat sequence preview presents timing and targets before apply', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Repeat blocks', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  await d.locator('summary').first().click();
  await expect(d).toContainText('6 of 20');
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/repeat-session.png' });
  await page.keyboard.press('Escape');
});

test('completed standalone workout does not block session repeat and capture', async ({ page }) => {
  await seed(page, 1);
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  await page.getByRole('button', { name: 'Set a countdown', exact: true }).click();
  await page.getByLabel('Minutes', { exact: true }).fill('0');
  await page.getByLabel('Seconds', { exact: true }).fill('1');
  await page.getByLabel('Lead-in seconds').fill('0');
  await page.getByRole('button', { name: 'Start countdown', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Workout complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Save result', exact: true }).click();
  await expect(page.getByText('Result saved to history.')).toBeVisible();
  await page.getByRole('button', { name: 'Home', exact: true }).last().click();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await page.getByRole('button', { name: 'Open in editor', exact: true }).click();
  await page.getByRole('button', { name: 'Replace current draft', exact: true }).click();
  await page.getByRole('button', { name: 'Repeat blocks', exact: true }).click();
  await page.getByRole('button', { name: 'Add repeated blocks', exact: true }).click();
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Save block 1 as workout', exact: true }).click();
  const capture = page.getByRole('dialog', { name: 'Save block as workout' });
  await capture.getByLabel('Workout name').fill('After finished workout');
  await capture.getByRole('button', { name: 'Save workout', exact: true }).click();
  await expect(capture).toHaveCount(0);
});
