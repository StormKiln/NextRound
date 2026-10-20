import { expect, test } from '@playwright/test';

test('changed library favorites cannot revive an old pinned preview when restored', async ({
  page,
}) => {
  await page.goto('/countdown');
  await page.getByRole('button', { name: 'Fill remaining slots', exact: true }).click();
  const d = page.getByRole('dialog', { name: 'Fill remaining slots' });
  await d.getByRole('button', { name: 'Preview additions', exact: true }).click();
  await d.getByRole('button', { name: /Pin / }).first().click();
  const old = await page.evaluate(async () => {
    const path = '/src/features/exercises/favorites-store.ts';
    const { useExerciseFavorites } = await import(path);
    const ids = useExerciseFavorites.getState().ids;
    useExerciseFavorites.setState({ ids: ['squat'] });
    return ids;
  });
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeDisabled();
  await page.evaluate(async (ids) => {
    const path = '/src/features/exercises/favorites-store.ts';
    const { useExerciseFavorites } = await import(path);
    useExerciseFavorites.setState({ ids });
  }, old);
  await expect(d.getByRole('button', { name: 'Add to workout', exact: true })).toBeDisabled();
  await expect(d.getByRole('button', { name: /Unpin / })).toHaveCount(0);
});
