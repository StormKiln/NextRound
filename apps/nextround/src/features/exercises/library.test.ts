import { expect, it } from 'vitest';
import { eligibleExercise, metadataFor } from '@/data/equipment';
import { exercises } from '@/data/exercises';
import { matchesFocus } from '@/data/focus';
import { mergeLibrary, toWorkoutEntry } from './library';
import type { PersonalExercise } from './repository';

const personal: PersonalExercise = {
  id: 'personal:a',
  name: 'Personal row',
  description: 'My cue',
  category: 'Cardio',
  equipment: ['rower'],
  targetAreas: ['lats'],
  supportedUnits: ['metres'],
  defaultTarget: { unit: 'metres', value: 100 },
  archived: false,
};
it('merges active personal metadata without changing bundled records', () => {
  const before = structuredClone(exercises);
  const library = mergeLibrary([
    personal,
    { ...personal, id: 'personal:archived', archived: true },
  ]);
  expect(library).toHaveLength(exercises.length + 1);
  const e = library[exercises.length];
  expect(metadataFor(e)?.category).toBe('Cardio');
  expect(eligibleExercise(e, [])).toBe(false);
  expect(eligibleExercise(e, ['rower'])).toBe(true);
  expect(matchesFocus(e, ['back'])).toBe(true);
  expect(exercises).toEqual(before);
});
it('copies snapshots with independent identities and only workout fields for all modes', () => {
  const e = mergeLibrary([personal])[exercises.length];
  for (const mode of ['emom', 'amrap', 'countdown', 'intervals', 'forTime'] as const) {
    const snapshot = toWorkoutEntry(e, mode);
    expect(snapshot.catalogId).toBe(personal.id);
    expect(snapshot.id).not.toBe(e.id);
    expect(snapshot.target).toEqual(personal.defaultTarget);
    expect(Object.keys(snapshot).sort()).toEqual([
      'catalogId',
      'description',
      'id',
      'name',
      'supportedUnits',
      'target',
    ]);
    snapshot.name = 'Changed';
    expect(e.name).toBe(personal.name);
  }
  expect(() => toWorkoutEntry(e, 'ladder')).toThrow(/reps/);
  const reps = mergeLibrary([
    { ...personal, supportedUnits: ['reps'], defaultTarget: { unit: 'reps', value: 8 } },
  ])[exercises.length];
  expect(toWorkoutEntry(reps, 'ladder').target).toBeUndefined();
});
it('never silently invents unsupported targets for personal entries', () => {
  const e = mergeLibrary([{ ...personal, defaultTarget: undefined, supportedUnits: ['reps'] }])[
    exercises.length
  ];
  expect(toWorkoutEntry(e, 'emom').target).toBeUndefined();
  expect(toWorkoutEntry(e, 'amrap').target).toBeUndefined();
});
