import { expect, it } from 'vitest';
import { defaultEmomTarget } from '../features/setup/emom-defaults';
import { catalogMetadata, eligibleExercise } from './equipment';
import { exercises } from './exercises';

it('adds exactly twenty distinct, classified movements with compatible targets', () => {
  expect(exercises).toHaveLength(243);
  const added = exercises.slice(223);
  expect(added.filter((e) => eligibleExercise(e, []))).toHaveLength(12);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('dumbbell'))).toHaveLength(4);
  expect(added.filter((e) => catalogMetadata[e.id].equipment.includes('kettlebell'))).toHaveLength(
    4,
  );
  for (const e of added) {
    expect(catalogMetadata[e.id].targetAreas?.length).toBeGreaterThan(0);
    expect(catalogMetadata[e.id].aliases.length).toBeGreaterThan(0);
    expect(catalogMetadata[e.id].trainingType).toBeTruthy();
    expect(catalogMetadata[e.id].intensity).toBeTruthy();
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
  }
  expect(added.find((e) => e.id === 'kettlebell-overhead-carry')?.supportedUnits).toEqual([
    'seconds',
    'metres',
  ]);
  expect(added.find((e) => e.id === 'tree-pose')?.supportedUnits).toEqual(['seconds']);
});

import baseline from './catalog-200-baseline.json';

it('preserves every pre-2.1 catalog snapshot', () => {
  expect(exercises.slice(0, 223)).toEqual(baseline);
});
