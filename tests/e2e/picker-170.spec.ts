import { expect, test } from '@playwright/test';

for (const view of ['type', 'focus'])
  test(`changed query reopens ${view} groups while same-query collapse survives a preset change`, async ({
    page,
  }) => {
    await page.goto('/countdown');
    await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
    await page.getByLabel('Group exercises by').selectOption(view);
    await page.getByLabel('Search exercises').fill('kettlebell clean');
    const group = page.locator('.exercise-group').first();
    await expect(group).toHaveAttribute('open', '');
    await group.locator('summary').click();
    await expect(group).not.toHaveAttribute('open');
    await page.getByRole('button', { name: 'My favorites', exact: true }).click();
    await expect(group).not.toHaveAttribute('open');
    await page.getByLabel('Search exercises').fill('kettlebell deadlift');
    await expect(group).toHaveAttribute('open', '');
  });
test('empty filtered manual results explain constraints and offer nearby recovery without changing equipment', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.getByText('Focus areas', { exact: true }).click();
  await page.getByRole('checkbox', { name: 'Legs', exact: true }).check();
  await page.getByLabel('Search exercises').fill('dead bug');
  await page.getByText('Focus areas', { exact: true }).click();
  const empty = page.getByRole('region', { name: 'No matching exercises' });
  await expect(empty).toContainText('Legs');
  await expect(empty).toContainText('dead bug');
  await empty.getByRole('button', { name: 'Clear focus filters', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Dead bug / })).toBeVisible();
  await expect(page.getByLabel('Search exercises')).toHaveValue('dead bug');
});
test('picker controls stay inside the scrollport with reserved scrollbar space', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 760, height: 620 });
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Add exercise', exact: true }).click();
  await page.addStyleTag({
    content:
      '.picker-body { scrollbar-gutter: stable both-edges; } ::-webkit-scrollbar { width: 18px; }',
  });
  await page.getByRole('button', { name: 'Mix it up', exact: true }).click();
  const violations = await page.locator('.picker-body').evaluate((el) => {
    const r = el.getBoundingClientRect();
    const left = r.left + el.clientLeft;
    const right = left + el.clientWidth;
    return [...el.querySelectorAll('button,input,select')]
      .filter((e) => e.getClientRects().length)
      .filter((e) => {
        const b = e.getBoundingClientRect();
        return b.left < left - 1 || b.right > right + 1;
      })
      .map((e) => e.textContent);
  });
  expect(violations).toEqual([]);
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeInViewport({
    ratio: 1,
  });
  await page.screenshot({ path: info.outputPath('picker-scrollbar.png') });
});
