import { expect, type Page, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

async function seed(page: Page) {
  await page.goto('/');
  const s = result220().session;
  s.blocks.push({ ...structuredClone(s.blocks[0]), id: 'second', name: 'Second block' });
  await page.evaluate((s) => {
    localStorage.setItem(
      'nextround.training.v1',
      JSON.stringify({ version: 1, sessions: [s], results: [], actuals: {}, recovery: null }),
    );
    localStorage.setItem(
      'nextround.workout-templates.v1',
      JSON.stringify({
        version: 2,
        templates: [
          { id: 'a', name: 'Alpha', config: s.blocks[0].config },
          { id: 'b', name: 'Beta', config: s.blocks[0].config },
        ],
        collections: [],
      }),
    );
  }, s);
  await page.reload();
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
}
test('session replacement reviews a subset, applies once and undoes without changing sources', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  await d.getByLabel('Movement to replace').selectOption({ label: 'Push-up (2 occurrences)' });
  await d.getByLabel('Replace in block 2: Second block').uncheck();
  await d.getByLabel('Search replacement exercises').fill('air squat');
  await d.getByRole('button', { name: /Air squat/ }).click();
  await expect(d).toContainText('Target kept: 8 reps');
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/session-replacement.png' });
  await d.getByRole('button', { name: 'Apply replacement', exact: true }).click();
  await expect(d).toHaveCount(0);
  const blocks = page.getByLabel('Session blocks').locator(':scope > li');
  await expect(blocks.nth(0)).toContainText('Air squat');
  await expect(blocks.nth(1)).toContainText('Push-up');
  await expect(page.getByRole('button', { name: 'Edit block 1', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Undo last edit' }).click();
  await expect(blocks.nth(0)).toContainText('Push-up');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('nextround.training.v1')!).sessions[0].blocks[0].config
          .exercises[0].name,
    ),
  ).toBe('Push-up');
});
test('chooser clears filters without losing selection and dismisses preview to its invoker', async ({
  page,
}) => {
  await seed(page);
  await page.getByRole('button', { name: 'Choose saved workouts', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Choose saved workouts', exact: true });
  await d.getByRole('checkbox', { name: 'Select Alpha' }).check();
  await d.getByLabel('Find a saved workout').fill('zzz');
  await expect(d).toContainText('1 selected workout hidden by filters');
  await d.getByRole('button', { name: 'Clear chooser filters', exact: true }).click();
  await expect(d.getByRole('checkbox', { name: 'Select Alpha' })).toBeChecked();
  await d.getByRole('button', { name: 'Preview Alpha', exact: true }).click();
  await expect(d.getByRole('heading', { name: 'Alpha', exact: true })).toBeFocused();
  await d.getByRole('button', { name: 'Close preview', exact: true }).click();
  await expect(d.getByRole('button', { name: 'Preview Alpha', exact: true })).toBeFocused();
  await expect(d.getByRole('region', { name: 'Saved workout details' })).toHaveCount(0);
});
test('replacement cancel preserves the draft and returns focus at minimum window size', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await seed(page);
  const trigger = page.getByRole('button', { name: 'Replace across session', exact: true });
  await trigger.click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expect(page.getByLabel('Session blocks')).not.toContainText('Air squat');
});
test('changed personal replacement is rejected without a partial batch', async ({ page }) => {
  await seed(page);
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({
        version: 1,
        exercises: [
          {
            id: 'personal:review',
            name: 'Review movement',
            description: 'Test movement',
            category: 'Other bodyweight',
            equipment: [],
            targetAreas: ['core'],
            supportedUnits: ['reps'],
            archived: false,
          },
        ],
      }),
    ),
  );
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  await d.getByLabel('Search replacement exercises').fill('Review movement');
  await d.locator('.exercise-choice button').filter({ hasText: 'Review movement' }).click();
  await page.evaluate(() =>
    localStorage.setItem(
      'nextround.personal-exercises.v1',
      JSON.stringify({ version: 1, exercises: [] }),
    ),
  );
  await d.getByRole('button', { name: 'Apply replacement', exact: true }).click();
  await expect(d.getByRole('alert')).toContainText('changed or was removed');
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Session blocks')).not.toContainText('Review movement');
});
test('replacement can review and explicitly edit a changed target', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  await d.getByLabel('Search replacement exercises').fill('rowing machine');
  await d.getByRole('button', { name: /Rowing machine/ }).click();
  await expect(d).toContainText('because the previous unit is not supported');
  await d.getByRole('button', { name: 'Set target for Work', exact: true }).click();
  const t = page.getByRole('dialog').last();
  await t.getByRole('spinbutton').fill('100');
  await t.getByRole('button', { name: 'Save target', exact: true }).click();
  await expect(d).toContainText('Target explicitly edited');
  await d.getByRole('button', { name: 'Apply replacement', exact: true }).click();
  await expect(page.getByLabel('Session blocks')).toContainText('100');
});
test('comparison and replacement controls have usable heights and reachable actions', async ({
  page,
}) => {
  await seed(page);
  await page.setViewportSize({ width: 760, height: 620 });
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  const height = await d
    .getByLabel('Movement to replace')
    .evaluate((e) => e.getBoundingClientRect().height);
  expect(height).toBeGreaterThanOrEqual(44);
  const cancel = await d.getByRole('button', { name: 'Cancel', exact: true }).boundingBox();
  expect(cancel!.y + cancel!.height).toBeLessThanOrEqual(620);
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(
    (results) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [], results, actuals: {}, recovery: null }),
      ),
    [result220(), result220('b', 1)],
  );
  await page.goto('/history');
  await page.getByRole('button', { name: 'View session result', exact: true }).first().click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const compare = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  for (const control of await compare.getByRole('combobox').all())
    expect(await control.evaluate((e) => e.getBoundingClientRect().height)).toBeGreaterThanOrEqual(
      44,
    );
});
test('long replacement reviews keep actions reachable with scrollbars and larger text', async ({
  page,
}) => {
  await seed(page);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    const block = d.sessions[0].blocks[0];
    d.sessions[0].blocks = Array.from({ length: 20 }, (_, i) => ({
      ...structuredClone(block),
      id: `long-${i}`,
      name: `Block ${i + 1} with a long descriptive movement sequence name`,
    }));
    localStorage.setItem('nextround.training.v1', JSON.stringify(d));
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Open Attempt a', exact: true }).click();
  await page.setViewportSize({ width: 760, height: 620 });
  await page.addStyleTag({ content: 'html {font-size:20px} ::-webkit-scrollbar {width:16px}' });
  await page.getByRole('button', { name: 'Replace across session', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Replace across session', exact: true });
  await d.getByLabel('Search replacement exercises').fill('air squat');
  await d.getByRole('button', { name: /Air squat/ }).click();
  await expect(d.locator('.replacement-review')).toHaveCount(20);
  const body = await d.locator('.replacement-body').evaluate((e) => ({
    height: e.clientHeight,
    scroll: e.scrollHeight,
    width: e.clientWidth,
    scrollWidth: e.scrollWidth,
  }));
  expect(body.scroll).toBeGreaterThan(body.height);
  expect(body.height).toBeGreaterThan(80);
  expect(body.scrollWidth).toBeLessThanOrEqual(body.width);
  for (const name of ['Cancel', 'Apply replacement']) {
    const b = await d.getByRole('button', { name, exact: true }).boundingBox();
    expect(b!.y + b!.height).toBeLessThanOrEqual(620);
    expect(b!.x).toBeGreaterThanOrEqual(0);
  }
  if (process.env.NEXTROUND_CAPTURE)
    await page.screenshot({ path: 'docs/screenshots/session-replacement-minimum.png' });
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
});
