import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise } from '../features/setup/exercise-suggestions';
import { generatedEntry } from '../features/setup/workout-generator';
import baseline from './catalog-280-baseline.json';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';

it('adds twenty distinct no-equipment exercises while preserving all 383 existing entries', () => {
  expect(exercises).toHaveLength(403);
  expect(exercises.slice(0, 383)).toEqual(baseline);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(403);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(403);
  for (const e of exercises.slice(383)) {
    expect(eligibleExercise(e, [])).toBe(true);
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
});
