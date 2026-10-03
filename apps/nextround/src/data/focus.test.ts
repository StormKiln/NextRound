import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { matchesExercise } from '../features/setup/exercise-suggestions';
import baseline from './catalog-150-baseline.json';
import { eligibleExercise, metadataFor } from './equipment';
import { exercises } from './exercises';
import { areasFor, focusAreas, matchesFocus, parseTargetAreas } from './focus';

it('audits all 83 catalog movements with valid, unique focus tags', () => {
  expect(exercises).toHaveLength(83);
  for (const entry of exercises) {
    const areas = metadataFor(entry)?.targetAreas;
    expect(areas).toBeDefined();
    expect(new Set(areas).size).toBe(areas?.length);
    for (const area of areas ?? []) expect(Object.keys(focusAreas)).toContain(area);
  }
});
it('matches any selected area, expands lats into back, and supports unspecified snapshots', () => {
  const row = exercises.find((e) => e.id === 'kettlebell-row');
  if (!row) throw new Error('Missing kettlebell row');
  expect(areasFor(row)).toContain('lats');
  expect(matchesFocus(row, ['back'])).toBe(true);
  expect(matchesFocus(row, ['legs', 'lats'])).toBe(true);
  expect(matchesFocus(row, ['whole-body'])).toBe(false);
  const custom = { id: 'custom', name: 'Custom' };
  expect(areasFor(custom)).toEqual([]);
  expect(matchesFocus(custom, [])).toBe(true);
  expect(matchesFocus(custom, ['core'])).toBe(false);
});
it('adds twenty equipment-free movements with compatible editable defaults', () => {
  const added = exercises.slice(63);
  expect(added).toHaveLength(20);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(83);
  for (const e of added) {
    expect(eligibleExercise(e, [])).toBe(true);
    expect(e.name.length).toBeLessThanOrEqual(60);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    expect(e.supportedUnits).not.toContain('calories');
  }
});
it('finds common plural and separated movement names without changing identity', () => {
  for (const [id, queries] of [
    ['dead-bug', ['deadbugs', 'dead bugs', 'dead-bugs']],
    ['bird-dog', ['bird dogs', 'bird-dogs', 'birddogs']],
    ['inchworm-walkout', ['inchworms', 'inch worms']],
  ] as const)
    for (const query of queries) {
      expect(exercises.filter((e) => matchesExercise(e, query)).map((e) => e.id)).toContain(id);
    }
  expect(matchesExercise(exercises[0], 'unrelated')).toBe(false);
});

it('retains all existing catalog values and rejects malformed focus metadata', () => {
  expect(exercises.slice(0, 63)).toEqual(baseline);
  expect(parseTargetAreas(undefined)).toEqual([]);
  expect(parseTargetAreas([])).toEqual([]);
  for (const value of [['unknown'], ['core', 'core'], null, 'core'])
    expect(() => parseTargetAreas(value)).toThrow();
});

it('finds audited common plural names of every new movement', () => {
  const queries = [
    'reverse crunches',
    'bicycle crunches',
    'heel reaches',
    'knee tucks',
    'flutter kicks',
    'leg raises',
    'single leg glute bridges',
    'glute bridge marches',
    'lateral lunges',
    'forward lunges',
    'good mornings',
    'side lying leg raises',
    'clamshells',
    'donkey kicks',
    'fire hydrants',
    'bear crawls',
    'crab walks',
    'knee drives',
    'step jacks',
    'jumping jacks',
  ];
  exercises.slice(63).forEach((entry, index) => {
    expect(matchesExercise(entry, queries[index])).toBe(true);
  });
});

it('resolves complete plural display names to the same catalog identity', () => {
  const queries = [
    'reverse crunches',
    'bicycle crunches',
    'supine lateral heel reaches',
    'seated knee tucks',
    'flutter kicks',
    'lying leg raises',
    'single-leg glute bridges',
    'glute bridge marches',
    'bodyweight lateral lunges',
    'forward lunges',
    'bodyweight good mornings',
    'side-lying leg raises',
    'unbanded clamshells',
    'quadruped donkey kicks',
    'fire hydrants',
    'bear crawls',
    'crab walks',
    'standing alternating knee drives',
    'step jacks',
    'jumping jacks',
  ];
  exercises.slice(63).forEach((entry, index) => {
    expect(matchesExercise(entry, queries[index])).toBe(true);
  });
});
