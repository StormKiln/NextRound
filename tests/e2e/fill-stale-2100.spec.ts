import { expect, test } from '@playwright/test';

// Dev-server integration exercises real stores; no production test hooks.
test('changed workout blocks an old fill preview and Undo stays invalid after later edits', async ({
  page,
}) => {
  await page.goto('/emom');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeEnabled();
  await page.evaluate(async () => {
    const path = '/src/state/workout.ts';
    const { useWorkout } = await import(path);
    const state = useWorkout.getState();
    state.setDraft({ exercises: state.draft.exercises.slice(0, 1) });
  });
  await expect(d.getByRole('alert')).toContainText('workout changed');
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await d.getByRole('button', { name: 'Add to workout', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Undo fill', exact: true })).toBeVisible();
  const original = await page.evaluate(async () => {
    const path = '/src/state/workout.ts';
    const { useWorkout } = await import(path);
    const state = useWorkout.getState();
    const original = state.draft.exercises;
    state.setDraft({ exercises: original.slice(0, 1) });
    return original;
  });
  await expect(page.getByRole('button', { name: 'Undo fill', exact: true })).toHaveCount(0);
  await page.evaluate(async (exercises) => {
    const path = '/src/state/workout.ts';
    const { useWorkout } = await import(path);
    useWorkout.getState().setDraft({ exercises });
  }, original);
  await expect(page.getByRole('button', { name: 'Undo fill', exact: true })).toHaveCount(0);
});
