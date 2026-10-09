import type { ExerciseEntry } from '@nextround/core';
import { expect, it } from 'vitest';
import { replaceExercise } from './exercise-replacement';

const old: ExerciseEntry = {
  id: 'slot',
  catalogId: 'old',
  name: 'Old',
  description: 'Old description',
  target: { unit: 'reps', value: 12 },
};
const pushup: ExerciseEntry = {
  id: 'pushup',
  name: 'Push-up',
  description: 'New technique',
  supportedUnits: ['reps', 'seconds'],
};
it('preserves slot and compatible target while replacing all movement identity fields', () => {
  const result = replaceExercise(old, pushup, 'emom');
  expect(result.entry).toEqual({
    ...pushup,
    id: old.id,
    catalogId: 'pushup',
    target: { unit: 'reps', value: 12 },
  });
  expect(result.entry.target).not.toBe(old.target);
  expect(result.notice).toContain('kept');
  expect(old.name).toBe('Old');
});
it('explains incompatible target changes and clamps new interval defaults', () => {
  const plank: ExerciseEntry = {
    id: 'personal:plank',
    name: 'My plank',
    supportedUnits: ['seconds'],
    target: { unit: 'seconds', value: 45 },
  };
  const result = replaceExercise(old, plank, 'intervals', 10);
  expect(result.entry.target).toEqual({ unit: 'seconds', value: 10 });
  expect(result.notice).toContain('changed');
  expect(result.entry.description).toBeUndefined();
});
it('keeps intentional supported time targets but gives a default where mandatory', () => {
  expect(
    replaceExercise({ ...old, target: { unit: 'seconds', value: 40 } }, pushup, 'intervals', 10)
      .entry.target,
  ).toEqual({ unit: 'seconds', value: 40 });
  expect(
    replaceExercise(
      { ...old, target: undefined },
      { id: 'personal:row', name: 'Row', supportedUnits: ['metres'] },
      'amrap',
    ).entry.target,
  ).toEqual({ unit: 'metres', value: 100 });
});
it('uses ladder reps schedule without per-entry targets and rejects incompatible movements', () => {
  expect(replaceExercise(old, pushup, 'ladder').entry.target).toBeUndefined();
  expect(() =>
    replaceExercise(old, { id: 'plank', name: 'Plank', supportedUnits: ['seconds'] }, 'ladder'),
  ).toThrow(/reps/);
});
it('does not manufacture optional targets when replacing an untargeted countdown movement', () => {
  expect(
    replaceExercise({ ...old, target: undefined }, pushup, 'countdown').entry.target,
  ).toBeUndefined();
});
