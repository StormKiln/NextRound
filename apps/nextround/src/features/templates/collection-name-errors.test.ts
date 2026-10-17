import { expect, it } from 'vitest';
import { validateImportNames } from './collection-name-errors';

it('identifies every duplicate under normalized matching and validates blank and long names', () => {
  const result = validateImportNames(' ', [' A ', 'Ａ', '', 'b'.repeat(121)]);
  expect(result.collection).toMatch(/collection name/);
  expect(result.workouts[0]).toMatch(/distinct/);
  expect(result.workouts[1]).toMatch(/distinct/);
  expect(result.workouts[2]).toMatch(/workout name/);
  expect(result.workouts[3]).toMatch(/120/);
  expect(validateImportNames('Training', ['A', 'B'])).toEqual({
    collection: '',
    workouts: ['', ''],
  });
});
