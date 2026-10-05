import { expect, it } from 'vitest';
import { matchesExercise, normalizeSearch } from './exercise-suggestions';

it('matches canonical and compatibility-equivalent text without dropping accents', () => {
  expect(matchesExercise({ id: 'a', name: 'Café hold' }, 'Cafe\u0301')).toBe(true);
  expect(normalizeSearch('  ＣＯＲＥ   Hold ')).toBe('core hold');
  expect(matchesExercise({ id: 'a', name: 'Café hold' }, 'cafe')).toBe(false);
});
