import { expect, it } from 'vitest';
import { copyName } from './filter-state';

it('suggests an editable name within the input limit without splitting Unicode characters', () => {
  const suggestion = copyName('🏋'.repeat(120));
  expect(suggestion.length).toBeLessThanOrEqual(120);
  expect(suggestion).toBe(`Copy of ${'🏋'.repeat(56)}`);
  expect(copyName('Routine')).toBe('Copy of Routine');
});
