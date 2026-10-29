import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise } from '../features/setup/exercise-suggestions';
import { generatedEntry } from '../features/setup/workout-generator';
import baseline from './catalog-2110-baseline.json';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';

it('adds twenty distinct equipment movements while preserving all 423 existing records', () => {
  expect(exercises).toHaveLength(473);
  expect(exercises.slice(0, 423)).toEqual(baseline);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(473);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(473);
  for (const e of exercises.slice(423, 443)) {
    const meta = catalogMetadata[e.id];
    expect(meta.equipment.length).toBeGreaterThan(0);
    expect(eligibleExercise(e, [])).toBe(false);
    expect(eligibleExercise(e, meta.equipment)).toBe(true);
    expect(meta.targetAreas?.length).toBeGreaterThan(0);
    expect(meta.trainingType).toBeTruthy();
    expect(meta.intensity).toBeTruthy();
    expect(e.description!.length).toBeLessThanOrEqual(240);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    for (const alias of meta.aliases) expect(matchesExercise(e, alias)).toBe(true);
    for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'forTime'] as const) {
      const entry = generatedEntry(e, mode, 10);
      expect(e.supportedUnits).toContain(entry.target!.unit);
      if (mode === 'intervals' && entry.target!.unit === 'seconds')
        expect(entry.target!.value).toBeLessThanOrEqual(10);
    }
    if (e.supportedUnits?.includes('reps'))
      expect(generatedEntry(e, 'ladder').target).toBeUndefined();
    else expect(() => generatedEntry(e, 'ladder')).toThrow('reps-compatible');
  }
});
