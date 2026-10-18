import { expect, test } from '@playwright/test';
import { result220 } from '../fixtures/training-220';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(
    (results) => {
      if (!localStorage.getItem('nextround.training.v1'))
        localStorage.setItem(
          'nextround.training.v1',
          JSON.stringify({
            version: 1,
            sessions: [results[0].session],
            results,
            actuals: {},
            recovery: null,
          }),
        );
    },
    [result220(), result220('b', 1)],
  );
});
test('compare attempts explicitly and retain zero values at minimum size', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/history');
  await page.getByRole('button', { name: 'View session result' }).first().click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox', { name: 'Attempt A', exact: true })).toHaveValue('a');
  await expect(dialog.getByRole('combobox', { name: 'Attempt B', exact: true })).toHaveValue('b');
  await expect(dialog).toContainText('+2 reps');
  await expect(dialog).toContainText('0 kg');
  await dialog.getByRole('combobox', { name: 'Attempt A', exact: true }).selectOption('b');
  await dialog.getByRole('combobox', { name: 'Attempt B', exact: true }).selectOption('a');
  await expect(dialog).toContainText('−2 reps');
  await dialog.getByRole('button', { name: 'Close comparison' }).click();
  await expect(page.getByRole('dialog', { name: 'Attempt a', exact: true })).toBeVisible();
});

test('changed and partial attempts require explicit inspection and never show deltas', async ({
  page,
}) => {
  await page.goto('/history');
  const changed = result220('changed', 3);
  changed.session.blocks[0].config.exercises![0].target!.value = 15;
  const partial = result220('partial', 4);
  partial.blocks[0].status = 'partial';
  await page.evaluate(
    (extra) => {
      const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
      data.results.push(...extra);
      localStorage.setItem('nextround.training.v1', JSON.stringify(data));
      window.dispatchEvent(new Event('visibilitychange'));
    },
    [changed, partial],
  );
  await expect(page.locator('.session-card')).toHaveCount(4);
  await page.locator('.session-card').filter({ hasText: 'Attempt a' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  const choice = dialog.getByRole('combobox', { name: 'Attempt B', exact: true });
  await expect(choice.locator('option[value="changed"]')).toHaveCount(0);
  await dialog.getByLabel('Include changed or partial attempts for inspection').check();
  await choice.selectOption('changed');
  await expect(dialog.getByRole('status')).toContainText('Different prescriptions');
  await expect(dialog.getByRole('region', { name: 'Recorded differences' })).toHaveCount(0);
  await expect(dialog.getByRole('region', { name: 'Attempt B snapshot' })).toContainText('15 reps');
  await choice.selectOption('partial');
  await expect(dialog.getByRole('status')).toContainText('Partial or skipped');
  await expect(dialog.getByRole('region', { name: 'Recorded differences' })).toHaveCount(0);
  await dialog.getByLabel('Include changed or partial attempts for inspection').uncheck();
  await expect(dialog.getByRole('region', { name: 'Attempt B snapshot' })).toHaveCount(0);
});
test('comparison entry protects unsaved notes and does not modify history', async ({ page }) => {
  await page.goto('/history');
  const original = await page.evaluate(() => localStorage.getItem('nextround.training.v1'));
  await page.getByRole('button', { name: 'View session result' }).first().click();
  await page.getByLabel('Session note', { exact: true }).fill('Unsaved note');
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  await page.getByRole('button', { name: 'Keep editing', exact: true }).click();
  await expect(page.getByLabel('Session note', { exact: true })).toHaveValue('Unsaved note');
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await page.getByRole('button', { name: 'Close comparison' }).click();
  await expect(page.getByLabel('Session note', { exact: true })).toHaveValue('');
  expect(await page.evaluate(() => localStorage.getItem('nextround.training.v1'))).toBe(original);
});
test('failed reads hide comparison evidence and deleted selections cannot linger after retry', async ({
  page,
}) => {
  await page.goto('/history');
  await page.getByRole('button', { name: 'View session result' }).first().click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  await page.evaluate(() => {
    localStorage.setItem('nextround.training.v1', 'bad');
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(dialog.getByRole('button', { name: 'Retry comparison history' })).toBeVisible();
  await expect(dialog.getByRole('region', { name: 'Recorded differences' })).toHaveCount(0);
  await page.evaluate(
    (r) =>
      localStorage.setItem(
        'nextround.training.v1',
        JSON.stringify({ version: 1, sessions: [], results: [r], actuals: {}, recovery: null }),
      ),
    result220(),
  );
  await dialog.getByRole('button', { name: 'Retry comparison history' }).click();
  await expect(dialog.getByRole('status')).toContainText('no longer available');
  await expect(dialog.getByRole('region', { name: 'Attempt B snapshot' })).toHaveCount(0);
});

test('unknown load, equal timestamps, refreshed edits and restart retain truthful comparisons', async ({
  page,
}) => {
  await page.goto('/history');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    data.results[1].completedAt = data.results[0].completedAt;
    delete data.results[1].blocks[0].actuals[0].load;
    delete data.results[1].blocks[0].actuals[0].loadUnit;
    data.results[0].blocks[0].actuals[0].reps = 0;
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
  });
  await page.reload();
  await page.locator('.session-card').filter({ hasText: 'Attempt a' }).getByRole('button').click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  await expect(dialog).toContainText('Load unrecorded');
  await expect(dialog).toContainText('0 reps');
  await expect(dialog.getByRole('combobox', { name: 'Attempt B', exact: true })).toHaveValue('b');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    Object.assign(data.results[1].blocks[0].actuals[0], { load: 0, loadUnit: 'kg' });
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
    window.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(dialog).toContainText('−10 reps');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Compare session results', exact: true }),
  ).toBeFocused();
});

test('twenty-block comparisons retain the close action and scroll without horizontal clipping', async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/history');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    for (const r of data.results) {
      const block = r.session.blocks[0],
        outcome = r.blocks[0];
      r.session.blocks = Array.from({ length: 20 }, (_, i) => ({
        ...structuredClone(block),
        id: `${r.id}-${i}`,
        name: `Block ${i + 1}: repeated movement with a deliberately descriptive name`,
      }));
      r.blocks = r.session.blocks.map((b: { id: string }) => ({
        ...structuredClone(outcome),
        blockId: b.id,
      }));
    }
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: 'View session result' }).first().click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare session results', exact: true });
  await expect(dialog.getByRole('button', { name: 'Close comparison' })).toBeInViewport();
  expect(await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  const body = dialog.locator('.comparison-body');
  expect(await body.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await body.evaluate((el) => (el.scrollTop = el.scrollHeight));
  await expect(dialog.getByRole('button', { name: 'Close comparison' })).toBeInViewport();
  const lastHeading = dialog
    .getByRole('region', { name: 'Attempt B snapshot' })
    .getByRole('heading', { name: /20\. Block 20/ });
  await lastHeading.scrollIntoViewIfNeeded();
  await expect(lastHeading).toBeInViewport();
  await expect(dialog.getByRole('button', { name: 'Close comparison' })).toBeInViewport();
});

test('snapshots show saved AMRAP, Ladder and checklist progress without manual actuals', async ({
  page,
}) => {
  await page.goto('/history');
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('nextround.training.v1')!);
    for (const [i, r] of data.results.entries()) {
      const block = r.session.blocks[0],
        outcome = r.blocks[0];
      const base = { leadInSeconds: 0, warningSeconds: 3, exercises: block.config.exercises };
      r.session.blocks = [
        {
          ...structuredClone(block),
          id: r.id + '-amrap',
          name: 'Circuit',
          config: { ...base, type: 'amrap', durationSeconds: 60 },
        },
        {
          ...structuredClone(block),
          id: r.id + '-ladder',
          name: 'Ladder',
          config: {
            ...base,
            exercises: base.exercises.map(
              ({ target, ...e }: { target?: unknown; id: string }) => e,
            ),
            type: 'ladder',
            ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 3 },
          },
        },
        {
          ...structuredClone(block),
          id: r.id + '-check',
          name: 'Checklist',
          config: { ...base, type: 'countdown', durationSeconds: 60, showChecklist: true },
        },
      ];
      r.blocks = r.session.blocks.map((b: { id: string }, index: number) => ({
        ...structuredClone(outcome),
        blockId: b.id,
        actuals: [],
        completedMovements: index === 0 ? 2 - i : index === 1 ? 1 - i : 0,
        partialValue: index === 0 ? 3 - i : 0,
        checkedIds: index === 2 && i === 0 ? [base.exercises[0].id] : [],
      }));
    }
    localStorage.setItem('nextround.training.v1', JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: 'View session result' }).first().click();
  await page.getByRole('button', { name: 'Compare session results', exact: true }).click();
  const a = page.getByRole('region', { name: 'Attempt A snapshot' }),
    b = page.getByRole('region', { name: 'Attempt B snapshot' });
  await expect(a).toContainText('2 completed rounds + 0 completed movements + 3 reps of Push-up');
  await expect(b).toContainText('1 completed round + 0 completed movements + 2 reps of Push-up');
  await expect(a).toContainText('1 of 3 rungs');
  await expect(b).toContainText('0 of 3 rungs');
  await expect(a).toContainText('Checked: Push-up');
  await expect(b).toContainText('Not checked: Push-up');
});
