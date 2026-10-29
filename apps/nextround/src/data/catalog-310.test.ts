import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise, normalizeSearch } from '../features/setup/exercise-suggestions';
import { type FillFilters, fillCandidates } from '../features/setup/fill-workout';
import { generatedEntry } from '../features/setup/workout-generator';
import baseline from './catalog-2120-baseline.json';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';
import { matchesPhase, type Phase, phasesFor } from './phases';

const added = exercises.slice(443);
const emptyFillFilters: FillFilters = {
  equipment: null,
  areas: [],
  category: '',
  intensity: '',
  favoritesOnly: false,
  favoriteIds: [],
};

it('adds thirty distinct warm-up and cool-down movements while preserving all 443 existing records', () => {
  expect(exercises).toHaveLength(473);
  expect(exercises.slice(0, 443)).toEqual(baseline);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(473);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(473);
  const prior = exercises
    .slice(0, 443)
    .flatMap((e) => [
      normalizeSearch(e.name),
      ...catalogMetadata[e.id].aliases.map(normalizeSearch),
    ]);
  for (const e of added)
    for (const label of [e.name, ...catalogMetadata[e.id].aliases])
      expect(prior).not.toContain(normalizeSearch(label));
  expect(added.filter((e) => matchesPhase(e, 'warmup'))).toHaveLength(15);
  expect(added.filter((e) => matchesPhase(e, 'cooldown'))).toHaveLength(15);
});

it('gives every addition complete mobility metadata and targets for every mode', () => {
  for (const e of added) {
    const meta = catalogMetadata[e.id];
    const [phase] = phasesFor(e);
    expect(phasesFor(e)).toHaveLength(1);
    expect(meta.trainingType).toBe('mobility');
    expect(meta.intensity).toMatch(phase === 'cooldown' ? /^low$/ : /^(low|moderate)$/);
    expect(meta.equipment).toEqual([]);
    expect(eligibleExercise(e, [])).toBe(true);
    expect(meta.category).toBe('Other bodyweight');
    expect(meta.targetAreas?.length).toBeGreaterThan(0);
    expect(meta.aliases.length).toBeGreaterThan(0);
    for (const alias of meta.aliases) expect(matchesExercise(e, alias)).toBe(true);
    expect(e.description!.length).toBeLessThanOrEqual(240);
    expect(e.supportedUnits).toContain('seconds');
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
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
  // Warm-ups are dynamic and countable; cool-down holds are timed.
  for (const e of added.filter((e) => matchesPhase(e, 'warmup')))
    expect(defaultEmomTarget(e).unit).toBe('reps');
});

it('has a phase pool large enough for a fifteen-minute block and never tags strength work', () => {
  for (const phase of ['warmup', 'cooldown'] as Phase[]) {
    const pool = fillCandidates(exercises, [], 'emom', {
      ...emptyFillFilters,
      phase,
    });
    expect(pool.length).toBeGreaterThanOrEqual(15);
    expect(pool.every((e) => matchesPhase(e, phase))).toBe(true);
    for (const e of pool) {
      expect(catalogMetadata[e.id].trainingType).not.toBe('strength');
      expect(catalogMetadata[e.id].intensity).not.toBe('high');
    }
  }
  expect(fillCandidates(exercises, [], 'emom', emptyFillFilters)).toHaveLength(473);
});
