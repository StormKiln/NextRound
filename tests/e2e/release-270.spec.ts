import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page) {
  await page.goto('/');
  const session = result220().session;
  session.blocks.push({ ...structuredClone(session.blocks[0]), id: 'second' });
  await page.evaluate(
    (s) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [s], results: [], actuals: {}, recovery: null }),
      ),
    session,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
}
test('save a session block independently, reveal it and persist across restart', async ({
  page,
}) => {
  await seed(page);
  const session = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  await page.getByRole('button', { name: 'Save block 1 as workout', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Save block as workout' });
  await d.getByLabel('Workout name').fill('Reusable finisher');
  await expect(d).toContainText('next-block transition');
  await d.getByRole('button', { name: 'Save workout', exact: true }).click();
  await expect(d).toHaveCount(0);
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(2);
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(session);
  await page.getByRole('button', { name: 'Show saved workout — clear library filters' }).click();
  await expect(
    page.getByRole('button', { name: 'Load Reusable finisher', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Load Reusable finisher', exact: true }),
  ).toBeVisible();
});
test('replacement requires selected occurrences and disambiguates same-named blocks', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session' });
  await expect(d).toContainText('Block 1: Work');
  await expect(d).toContainText('Block 2: Work');
  await d.getByLabel('Replace in block 1: Work').uncheck();
  await d.getByLabel('Replace in block 2: Work').uncheck();
  await d.getByLabel('Search replacement exercises').fill('air squat');
  await expect(d.getByRole('button', { name: /Air squat/ })).toHaveCount(0);
  await expect(d).toContainText('Select at least one occurrence');
  await d.getByLabel('Replace in block 2: Work').check();
  await d.getByRole('button', { name: /Air squat/ }).click();
  await expect(d.getByRole('heading', { name: /Block 2: Work/ })).toBeVisible();
});
test('replacement equipment settings retain search and selection with usable fixed actions', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session' });
  await d.getByLabel('Replace in block 1: Work').uncheck();
  await d.getByLabel('Search replacement exercises').fill('squat');
  await expect(d.getByLabel('Show all equipment')).toBeChecked();
  await d.getByLabel('Show all equipment').uncheck();
  await expect(d).toContainText('No equipment selected.');
  await d.getByRole('button', { name: 'Change equipment settings' }).click();
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await settings.getByLabel('Kettlebell', { exact: true }).check();
  await settings.getByRole('button', { name: 'Save equipment', exact: true }).click();
  await settings.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await expect(d.getByRole('button', { name: 'Change equipment settings' })).toBeFocused();
  await expect(d.getByLabel('Search replacement exercises')).toHaveValue('squat');
  await expect(d.getByLabel('Replace in block 1: Work')).not.toBeChecked();
  await expect(d).toContainText('Saved equipment');
  await expect(d.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport();
});
test('long session dialogs retain actions and focus with enlarged text and visible scrollbars', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/');
  const s = result220().session;
  const block = s.blocks[0];
  s.blocks = Array.from({ length: 20 }, (_, i) => ({
    ...structuredClone(block),
    id: `long-${i}`,
    name: `Block with a long descriptive name ${'movement '.repeat(7)}`,
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
  await page.addStyleTag({
    content:
      'html {font-size:20px !important} ::-webkit-scrollbar {width:16px;height:16px} ::-webkit-scrollbar-thumb {background:#777}',
  });
  const trigger = page.getByRole('button', { name: 'Save block 1 as workout', exact: true });
  await trigger.click();
  let d = page.getByRole('dialog', { name: 'Save block as workout' });
  for (const name of ['Save workout', 'Cancel'])
    await expect(d.getByRole('button', { name, exact: true })).toBeInViewport();
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/save-session-block-minimum.png' });
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  d = page.getByRole('dialog', { name: 'Replace across session' });
  for (const name of ['Change equipment settings', 'Cancel', 'Apply replacement'])
    await expect(d.getByRole('button', { name, exact: true })).toBeInViewport();
  expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await d.getByLabel('Search replacement exercises').fill('air squat');
  await d.getByRole('button', { name: /Air squat/ }).click();
  await expect(d.getByRole('button', { name: 'Apply replacement', exact: true })).toBeInViewport();
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/replacement-270-minimum.png' });
});
test('saving cancelled or invalid blocks leaves storage and draft intact', async ({ page }) => {
  await seed(page);
  const trigger = page.getByRole('button', { name: 'Save block 1 as workout', exact: true });
  await trigger.click();
  let d = page.getByRole('dialog', { name: 'Save block as workout' });
  await d.getByLabel('Workout name').fill('   ');
  await d.getByRole('button', { name: 'Save workout', exact: true }).click();
  await expect(d.getByRole('alert')).toContainText('workout name');
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  expect(
    await page.evaluate(() => localStorage.getItem('nextround.workout-templates.v1')),
  ).toBeNull();
  await trigger.click();
  d = page.getByRole('dialog', { name: 'Save block as workout' });
  await d.getByLabel('Workout name').fill('Captured warm-up');
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/save-session-block.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByLabel('Session blocks').locator(':scope > li')).toHaveCount(2);
});
