import { expect, it } from 'vitest';
import { suggestExercises } from './exercise-suggestions';

const library = Array.from({ length: 7 }, (_, i) => ({ id: `e${i}`, name: `Exercise ${i}` }));
const counts = new Map([
  ['e0', 9],
  ['e1', 5],
  ['e2', 2],
]);
it('returns the requested number of unique favorites, least-used or mixed movements', () => {
  expect(suggestExercises(library, counts, 'favorites', 5).map((e) => e.id)).toEqual([
    'e0',
    'e1',
    'e2',
    'e3',
    'e4',
  ]);
  expect(suggestExercises(library, counts, 'new', 5).map((e) => e.id)).toEqual([
    'e3',
    'e4',
    'e5',
    'e6',
    'e2',
  ]);
  const mix = suggestExercises(library, counts, 'mix', 6).map((e) => e.id);
  expect(mix).toHaveLength(6);
  expect(new Set(mix).size).toBe(6);
  expect(mix.slice(0, 2)).toEqual(['e0', 'e3']);
  expect(suggestExercises(library, counts, 'mix', 20)).toHaveLength(7);
  expect(suggestExercises(library, counts, 'favorites')).toHaveLength(3);
});

import type { ExerciseEntry } from '@nextround/core';
import { generatedEntry } from './workout-generator';

it('creates independent snapshots with valid supported targets and preserves personal defaults', () => {
  const personal: ExerciseEntry = {
    id: 'personal:row',
    name: 'My row',
    supportedUnits: ['metres'],
    target: { unit: 'metres', value: 250 },
  };
  const a = generatedEntry(personal, 'amrap');
  const b = generatedEntry(personal, 'amrap');
  expect(a.catalogId).toBe(personal.id);
  expect(a.id).not.toBe(b.id);
  expect(a.target).toEqual({ unit: 'metres', value: 250 });
  expect(a.target).not.toBe(personal.target);
  expect(generatedEntry({ ...personal, target: undefined }, 'emom').target).toEqual({
    unit: 'metres',
    value: 100,
  });
  expect(
    generatedEntry({ id: 'personal:move', name: 'My movement', supportedUnits: ['reps'] }, 'amrap')
      .target,
  ).toEqual({ unit: 'reps', value: 8 });
  expect(
    generatedEntry({ id: 'pushup', name: 'Push-up', supportedUnits: ['reps', 'seconds'] }, 'emom')
      .target,
  ).toEqual({ unit: 'reps', value: 8 });
});
it('Ladder uses its configured rung targets instead of per-exercise defaults', () => {
  expect(
    generatedEntry(
      { id: 'x', name: 'Movement', supportedUnits: ['reps'], target: { unit: 'reps', value: 20 } },
      'ladder',
    ).target,
  ).toBeUndefined();
  expect(() =>
    generatedEntry({ id: 'row', name: 'Row', supportedUnits: ['metres'] }, 'ladder'),
  ).toThrow('reps-compatible');
});
it('ranking handles invalid counts and duplicate catalog records without changing the input', () => {
  expect(suggestExercises(library, counts, 'new', 0)).toEqual([]);
  expect(suggestExercises(library, counts, 'new', 1.5)).toEqual([]);
  expect(suggestExercises(library, counts, 'new', 101)).toEqual([]);
  expect(suggestExercises([...library, library[0]], counts, 'mix', 100)).toHaveLength(7);
  expect(library.map((e) => e.id)).toEqual(['e0', 'e1', 'e2', 'e3', 'e4', 'e5', 'e6']);
});
