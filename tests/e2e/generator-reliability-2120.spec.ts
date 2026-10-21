import { expect, test } from '@playwright/test';

for (const kind of ['Fill remaining slots', 'Create a workout']) {
  test(`${kind} cannot revive after its draft is changed then restored`, async ({ page }) => {
    await page.goto('/emom');
    await page.getByRole('button', { name: kind, exact: true }).click();
    if (kind === 'Create a workout')
      await page.getByRole('button', { name: 'Try something new', exact: true }).click();
    const d = page.getByRole('dialog', { name: kind, exact: true });
    await page.evaluate(async () => {
      const path = '/src/state/workout.ts';
      const { useWorkout } = await import(path);
      (window as any).original2120 = structuredClone(useWorkout.getState().draft.exercises);
      useWorkout.getState().setDraft({ exercises: [{ id: 'edited', name: 'Changed draft' }] });
    });
    await expect(d.getByRole('alert')).toContainText('workout changed');
    await page.evaluate(async () => {
      const path = '/src/state/workout.ts';
      const { useWorkout } = await import(path);
      useWorkout.getState().setDraft({ exercises: (window as any).original2120 });
    });
    await expect(d.getByRole('alert')).toContainText('workout changed');
    await expect(
      d.getByRole('button', {
        name: kind === 'Create a workout' ? 'Generate workout' : 'Preview additions',
        exact: true,
      }),
    ).toBeDisabled();
  });
  test(`${kind} does not mark valid counts invalid for an empty eligible pool`, async ({
    page,
  }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'nextround.exercise-favorites.v1',
        JSON.stringify({ version: 1, ids: [] }),
      ),
    );
    await page.goto('/countdown');
    await page.getByRole('button', { name: kind, exact: true }).click();
    if (kind === 'Create a workout')
      await page.getByRole('button', { name: 'My favorites', exact: true }).click();
    const d = page.getByRole('dialog', { name: kind, exact: true });
    if (kind === 'Fill remaining slots')
      await d.getByLabel('My favorites only', { exact: true }).check();
    await d
      .getByRole('button', {
        name: kind === 'Create a workout' ? 'Generate workout' : 'Preview additions',
        exact: true,
      })
      .click();
    await expect(d.getByRole('alert')).toContainText('Only 0');
    const count = d.getByLabel(
      kind === 'Create a workout' ? 'Number of exercises' : 'Total exercises',
      { exact: true },
    );
    await expect(count).toHaveAttribute('aria-invalid', 'false');
    await count.fill('0');
    await d
      .getByRole('button', {
        name: kind === 'Create a workout' ? 'Generate workout' : 'Preview additions',
        exact: true,
      })
      .click();
    await expect(count).toHaveAttribute('aria-invalid', 'true');
  });
}
