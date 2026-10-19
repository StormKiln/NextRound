import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';

it('adds exactly twenty distinct, classified movements with compatible targets', () => {
  expect(exercises).toHaveLength(363);
  const added = exercises.slice(243, 263);
  expect(added.filter((e) => eligibleExercise(e, []))).toHaveLength(8);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('dumbbell'))).toHaveLength(6);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('kettlebell'))).toHaveLength(
    6,
  );
  for (const e of added) {
    expect(catalogMetadata[e.id].targetAreas?.length).toBeGreaterThan(0);
    expect(catalogMetadata[e.id].aliases.length).toBeGreaterThan(0);
    expect(catalogMetadata[e.id].trainingType).toBeTruthy();
    expect(catalogMetadata[e.id].intensity).toBeTruthy();
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
  }
  expect(added.find((e) => e.id === 'dumbbell-overhead-carry')?.supportedUnits).toEqual([
    'seconds',
    'metres',
  ]);
  expect(added.find((e) => e.id === 'boat-pose')?.supportedUnits).toEqual(['seconds']);
});

import baseline from './catalog-210-baseline.json';

it('preserves every pre-2.2 catalog snapshot', () => {
  expect(exercises.slice(0, 243)).toEqual(baseline);
});

import { matchesExercise } from '../features/setup/exercise-suggestions';
import { generatedEntry } from '../features/setup/workout-generator';

it('keeps new entries searchable, equipment-aware and valid for every supported workout', () => {
  for (const entry of exercises.slice(243, 263)) {
    for (const alias of catalogMetadata[entry.id].aliases)
      expect(matchesExercise(entry, alias)).toBe(true);
    expect(eligibleExercise(entry, catalogMetadata[entry.id].equipment)).toBe(true);
    for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'forTime'] as const) {
      const generated = generatedEntry(entry, mode, 10);
      expect(entry.supportedUnits).toContain(generated.target!.unit);
      expect(generated.catalogId).toBe(entry.id);
      expect(generated.id).not.toBe(entry.id);
      if (mode === 'intervals' && generated.target!.unit === 'seconds')
        expect(generated.target!.value).toBeLessThanOrEqual(10);
    }
    if (entry.supportedUnits?.includes('reps'))
      expect(generatedEntry(entry, 'ladder').target).toBeUndefined();
    else expect(() => generatedEntry(entry, 'ladder')).toThrow('reps-compatible');
  }
});
