import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise } from '../features/setup/exercise-suggestions';
import { generatedEntry } from '../features/setup/workout-generator';
import baseline from './catalog-260-baseline.json';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';

it('adds twenty equipment-classified movements without rewriting existing prescriptions', () => {
  expect(exercises).toHaveLength(423);
  expect(exercises.slice(0, 343)).toEqual(baseline);
  const added = exercises.slice(343, 363);
  expect(added.filter((e) => eligibleExercise(e, []))).toHaveLength(10);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('dumbbell'))).toHaveLength(5);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('kettlebell'))).toHaveLength(
    5,
  );
  for (const e of added) {
    expect(catalogMetadata[e.id].targetAreas?.length).toBeGreaterThan(0);
    expect(catalogMetadata[e.id].trainingType).toBeTruthy();
    expect(catalogMetadata[e.id].intensity).toBeTruthy();
    expect(e.description!.length).toBeLessThanOrEqual(240);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    for (const alias of catalogMetadata[e.id].aliases) expect(matchesExercise(e, alias)).toBe(true);
    for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'forTime'] as const)
      expect(e.supportedUnits).toContain(generatedEntry(e, mode, 10).target!.unit);
    if (e.supportedUnits?.includes('reps'))
      expect(generatedEntry(e, 'ladder').target).toBeUndefined();
    else expect(() => generatedEntry(e, 'ladder')).toThrow('reps-compatible');
  }
  for (const id of ['dumbbell-reverse-grip-bench-press', 'dumbbell-decline-bench-press']) {
    const e = exercises.find((e) => e.id === id)!;
    expect(eligibleExercise(e, ['dumbbell'])).toBe(false);
    expect(eligibleExercise(e, ['dumbbell', 'raised-surface'])).toBe(true);
  }
});
