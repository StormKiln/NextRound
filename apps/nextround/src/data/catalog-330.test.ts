import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise, normalizeSearch } from '../features/setup/exercise-suggestions';
import { generatedEntry } from '../features/setup/workout-generator';
import baseline from './catalog-320-baseline.json';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';
import { phasesFor } from './phases';

const added = exercises.slice(473);

it('adds twenty-two distinct plank, bodyweight and kettlebell movements while preserving all 473 existing records', () => {
  expect(exercises).toHaveLength(495);
  expect(added).toHaveLength(22);
  expect(exercises.slice(0, 473)).toEqual(baseline);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(495);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(495);
  const prior = exercises
    .slice(0, 473)
    .flatMap((e) => [
      normalizeSearch(e.name),
      ...catalogMetadata[e.id].aliases.map(normalizeSearch),
    ]);
  const labels = added.flatMap((e) => [e.name, ...catalogMetadata[e.id].aliases]);
  expect(new Set(labels.map(normalizeSearch)).size).toBe(labels.length);
  for (const label of labels) expect(prior).not.toContain(normalizeSearch(label));
  expect(added.filter((e) => eligibleExercise(e, []))).toHaveLength(5);
  expect(added.filter((e) => catalogMetadata[e.id].category === 'Kettlebell')).toHaveLength(17);
});

it('gives every addition complete metadata and targets for every mode', () => {
  for (const e of added) {
    const meta = catalogMetadata[e.id];
    expect(meta.trainingType).toBe('strength');
    expect(meta.intensity).toMatch(/^(moderate|high)$/);
    expect(phasesFor(e)).toEqual([]);
    if (meta.category === 'Kettlebell') expect(meta.equipment).toEqual(['kettlebell']);
    else {
      expect(meta.equipment).toEqual([]);
      expect(['Planks', 'Squats', 'Push-ups']).toContain(meta.category);
    }
    expect(meta.targetAreas?.length).toBeGreaterThan(0);
    expect(meta.aliases.length).toBeGreaterThan(0);
    for (const alias of meta.aliases) expect(matchesExercise(e, alias)).toBe(true);
    expect(e.name.length).toBeLessThanOrEqual(60);
    expect(e.description!.length).toBeLessThanOrEqual(240);
    expect(e.description).toMatch(/one rep\.$/);
    expect(e.supportedUnits).toEqual(['reps', 'seconds']);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    for (const mode of ['emom', 'countdown', 'intervals', 'amrap', 'forTime'] as const) {
      const entry = generatedEntry(e, mode, 10);
      expect(e.supportedUnits).toContain(entry.target!.unit);
      if (mode === 'intervals' && entry.target!.unit === 'seconds')
        expect(entry.target!.value).toBeLessThanOrEqual(10);
    }
    expect(generatedEntry(e, 'ladder').target).toBeUndefined();
  }
});

it('finds requested common names, including new aliases on existing movements', () => {
  const find = (search: string) =>
    exercises.filter((e) => matchesExercise(e, search)).map((e) => e.id);
  const expected: [string, string][] = [
    // 3.3.0 aliases added to existing entries (#488).
    ['squat jumps', 'squat-jump'],
    ['kettlebell gorilla row', 'kettlebell-gorilla-row'],
    ['kb gorilla row', 'kettlebell-gorilla-row'],
    ['buttkickers', 'butt-kicks'],
    ['plank jacks', 'plank-jack'],
    ['kettlebell halos', 'kettlebell-halo'],
    // Already matched before 3.3.0.
    ['plank shoulder tap', 'high-plank-shoulder-tap'],
    ['mountain climbers', 'mountain-climber'],
    ['jumping jacks', 'jumping-jack'],
    ['high knees', 'high-knees-running'],
    // New movements.
    ['knee taps', 'plank-knee-tap'],
    ['hand-release push-up', 'dead-stop-pushup'],
    ['kettlebell pullover', 'kettlebell-floor-pullover'],
    ['kettlebell woodchopper', 'kettlebell-woodchopper'],
  ];
  for (const [search, id] of expected) expect(find(search)).toContain(id);
  const aliasAdditions: Record<string, string[]> = {
    'squat-jump': ['squat jumps'],
    'butt-kicks': ['butt kickers', 'buttkickers'],
    'plank-jack': ['jumping jack plank', 'plank jacks'],
    'kettlebell-gorilla-row': [
      'kb alternating gorilla row',
      'kettlebell gorilla rows',
      'kb gorilla rows',
    ],
    'kettlebell-halo': ['kettlebell halos'],
  };
  for (const [id, aliases] of Object.entries(aliasAdditions))
    expect(catalogMetadata[id].aliases).toEqual(aliases);
});
