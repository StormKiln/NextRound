import { expect, it } from 'vitest';
import { alternatives, curatedAlternatives } from './exercise-alternatives';
import { exercises } from './exercises';

it('defines directed, explained relationships for at least twenty bundled sources without bad references', () => {
  expect(Object.keys(alternatives).length).toBeGreaterThanOrEqual(20);
  const ids = new Set(exercises.map((e) => e.id));
  for (const [source, choices] of Object.entries(alternatives)) {
    expect(ids.has(source)).toBe(true);
    expect(new Set(choices.map((c) => c.id)).size).toBe(choices.length);
    for (const choice of choices) {
      expect(ids.has(choice.id), choice.id).toBe(true);
      expect(choice.id).not.toBe(source);
      expect(choice.reason.length).toBeGreaterThan(20);
    }
  }
});
it('resolves snapshots by catalog identity and intersects the eligible library', () => {
  const source = { ...exercises[1], id: 'slot', catalogId: 'pushup' };
  const all = curatedAlternatives(source, exercises);
  expect(all.length).toBeGreaterThan(0);
  const one = all[0].entry;
  expect(curatedAlternatives(source, [one])).toEqual([all[0]]);
  expect(curatedAlternatives(source, [])).toEqual([]);
  expect(curatedAlternatives({ ...source, catalogId: 'personal:unknown' }, exercises)).toEqual([]);
  expect(curatedAlternatives({ id: 'custom', name: 'Push-up' }, exercises)).toEqual([]);
});
