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
test('recovery preview applies subset atomically, preserves source and offers Undo', async ({
  page,
}) => {
  await seed(page);
  const saved = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  await page.getByRole('button', { name: 'Edit recovery', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Edit session recovery' });
  await expect(d.getByLabel('Recovery seconds', { exact: true })).toBeFocused();
  await d.getByLabel('Recovery seconds', { exact: true }).fill('30');
  await d.getByLabel('Update recovery for block 2: Work 2', { exact: true }).uncheck();
  await expect(d).toContainText('Final block — stored only');
  await expect(d).toContainText('2 selected blocks');
  await d.getByRole('button', { name: 'Apply recovery', exact: true }).click();
  await expect(page.getByLabel('Rest after block 1 (seconds)', { exact: true })).toHaveValue('30');
  await expect(page.getByLabel('Rest after block 2 (seconds)', { exact: true })).toHaveValue('5');
  await expect(page.getByLabel('Rest after block 3 (seconds)', { exact: true })).toHaveValue('30');
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(saved);
  await page.getByRole('button', { name: 'Undo last edit', exact: true }).click();
  await expect(page.getByLabel('Rest after block 1 (seconds)', { exact: true })).toHaveValue('5');
});
test('recovery validation, empty selection, cancel and incomplete draft repair', async ({
  page,
}) => {
  await seed(page);
  await page.getByLabel('Block 1 name', { exact: true }).fill('');
  await page.getByLabel('Rest after block 1 (seconds)', { exact: true }).fill('');
  const trigger = page.getByRole('button', { name: 'Edit recovery', exact: true });
  await trigger.click();
  const d = page.getByRole('dialog', { name: 'Edit session recovery' });
  await d.getByLabel('Recovery seconds', { exact: true }).fill('');
  await expect(d.getByRole('button', { name: 'Apply recovery' })).toBeDisabled();
  await expect(d.getByLabel('Recovery seconds', { exact: true })).toHaveAccessibleDescription(
    'Enter whole seconds from 0 to 3600.',
  );
  await d.getByLabel('Recovery seconds', { exact: true }).fill('10');
  for (const c of await d.getByRole('checkbox').all()) await c.uncheck();
  await expect(d).toContainText('Select at least one block');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await d.getByLabel('Recovery seconds', { exact: true }).fill('10');
  await d.getByRole('button', { name: 'Apply recovery' }).click();
  await expect(page.getByLabel('Block 1 name', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Rest after block 1 (seconds)', { exact: true })).toHaveValue('10');
});
test('recovery dialog remains usable with long names, scrolling and larger text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page, 20);
  await page.getByLabel('Block 1 name', { exact: true }).fill('Long recovery sequence '.repeat(5));
  await page.addStyleTag({
    content:
      'html{font-size:20px!important} ::-webkit-scrollbar{width:16px;height:16px} ::-webkit-scrollbar-thumb{background:#777}',
  });
  await page.getByRole('button', { name: 'Edit recovery', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Edit session recovery' });
  await d.getByLabel('Recovery seconds', { exact: true }).fill('15');
  await d.getByLabel('After recovery', { exact: true }).selectOption('ready');
  for (const name of ['Cancel', 'Apply recovery'])
    await expect(d.getByRole('button', { name, exact: true })).toBeInViewport();
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await d.locator('.recovery-body').evaluate((e) => (e.scrollTop = e.scrollHeight));
  await expect(
    d.getByText('After: Duration unknown · manual wait or uncapped block'),
  ).toBeInViewport();
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/session-recovery-minimum.png' });
});
test('repeat count marks capacity and upper-bound errors invalid', async ({ page }) => {
  await seed(page, 10);
  await page.getByRole('button', { name: 'Repeat blocks', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Repeat session blocks' });
  for (const v of ['2', '20']) {
    await d.getByLabel('Additional copies').fill(v);
    await expect(d.getByLabel('Additional copies')).toHaveAttribute('aria-invalid', 'true');
    await expect(d.getByRole('button', { name: 'Add repeated blocks' })).toBeDisabled();
  }
  await d.getByLabel('Additional copies').fill('1');
  await expect(d.getByLabel('Additional copies')).toHaveAttribute('aria-invalid', 'false');
});
test('editor reserves actual footer height under long feedback and enlarged text', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.addStyleTag({ content: 'html{font-size:24px!important}' });
  await page.getByLabel('Block 1 name', { exact: true }).fill('Long block name '.repeat(8));
  await page.getByRole('button', { name: 'Remove block 1', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const last = page.locator('.session-add > p');
  const footer = page.locator('.session-footer');
  await expect
    .poll(async () => {
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const a = await last.boundingBox(),
        b = await footer.boundingBox();
      return a!.y + a!.height - b!.y;
    })
    .toBeLessThanOrEqual(0);
  await expect(
    page.getByRole('button', { name: 'Choose saved workouts', exact: true }),
  ).toBeInViewport();
});
test('recovery timing preview and saved persistence', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Edit recovery', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Edit session recovery' });
  await expect(d.getByRole('button', { name: 'Apply recovery' })).toBeDisabled();
  await d.getByLabel('Recovery seconds', { exact: true }).fill('20');
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/session-recovery.png' });
  await d.getByRole('button', { name: 'Apply recovery' }).click();
  await page.getByRole('button', { name: 'Save session', exact: true }).click();
  await expect(page.getByText('Session saved', { exact: true })).toBeVisible();
  await page.goto('/');
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await expect(page.getByLabel('Rest after block 3 (seconds)', { exact: true })).toHaveValue('20');
});
