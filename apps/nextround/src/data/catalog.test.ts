import { expect, it } from 'vitest';
import previousCatalog from './catalog-1160-baseline.json';
import baseline from './catalog-baseline.json';
import { exercises } from './exercises';

it('adds twenty distinct exercises without changing the original catalog identities', () => {
  expect(exercises).toHaveLength(223);
  expect(exercises.slice(0, 43).map((e) => e.id)).toEqual(baseline);
  expect(exercises.slice(43, 63).map((e) => e.name)).toEqual([
    'Glute bridge',
    'Mountain climber',
    'Dead bug',
    'Bird dog',
    'Hollow-body hold',
    'Superman hold',
    'Standing calf raise',
    'Inchworm walkout',
    'Dumbbell goblet squat',
    'Dumbbell reverse lunge',
    'Dumbbell Romanian deadlift',
    'Dumbbell single-arm row',
    'Dumbbell floor press',
    'Dumbbell strict press',
    'Dumbbell push press',
    'Dumbbell thruster',
    'Box step-up',
    'Box jump',
    'Pull-up',
    'Medicine-ball slam',
  ]);
});

import { defaultEmomTarget } from '../features/setup/emom-defaults';
import fullBaseline from './catalog-160-baseline.json';
import { metadataFor } from './equipment';

it('1.7 adds twenty whole-body/core movements with valid metadata and targets preserving every prior record', () => {
  expect(exercises).toHaveLength(223);
  expect(exercises.slice(0, 83)).toEqual(fullBaseline);
  const additions = exercises.slice(83, 103);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(223);
  expect(additions.filter((e) => metadataFor(e)?.targetAreas?.includes('whole-body'))).toHaveLength(
    10,
  );
  expect(additions.filter((e) => metadataFor(e)?.equipment.length === 0)).toHaveLength(15);
  for (const exercise of additions) {
    expect(exercise.description?.length).toBeLessThanOrEqual(240);
    expect(exercise.name.length).toBeLessThanOrEqual(60);
    expect(metadataFor(exercise)?.targetAreas?.length).toBeGreaterThan(0);
    expect(metadataFor(exercise)?.aliases.length).toBeGreaterThan(0);
    const target = defaultEmomTarget(exercise);
    expect(exercise.supportedUnits).toContain(target.unit);
    expect(target.value).toBeGreaterThan(0);
    expect(target.value).toBeLessThanOrEqual(30);
  }
});

import { matchesExercise } from '../features/setup/exercise-suggestions';

it('finds full plural names for every 1.7 catalog movement', () => {
  const names = [
    'abdominal crunches',
    'bodyweight russian twists',
    'v-ups',
    'hollow-body rocks',
    'side-plank hip lifts',
    'side-plank reach-throughs',
    'high-plank shoulder taps',
    'reverse-plank holds',
    'bear-plank holds',
    'standing cross-body crunches',
    'squat thrusts',
    'burpee broad jumps',
    'skater bounds',
    'high-knees running in place',
    'inchworms with push-ups',
    'kettlebell turkish get-ups',
    'kettlebell clean and presses',
    'alternating dumbbell snatches',
    'dumbbell devil presses',
    'dumbbell man makers',
  ];
  exercises.slice(83, 103).forEach((entry, index) => {
    expect(matchesExercise(entry, names[index]), names[index]).toBe(true);
  });
});

it('1.17 adds twenty distinct movements, including equipment-free options and distance carries', () => {
  expect(exercises.slice(0, 103)).toEqual(previousCatalog);
  const additions = exercises.slice(103, 123);
  expect(additions).toHaveLength(20);
  expect(additions.filter((e) => metadataFor(e)?.equipment.length === 0)).toHaveLength(8);
  expect(additions.filter((e) => metadataFor(e)?.equipment.includes('dumbbell'))).toHaveLength(8);
  expect(additions.filter((e) => metadataFor(e)?.equipment.includes('kettlebell'))).toHaveLength(4);
  for (const e of additions) {
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(e.name.length).toBeLessThanOrEqual(60);
    expect(metadataFor(e)?.targetAreas?.length).toBeGreaterThan(0);
    expect(metadataFor(e)?.aliases.length).toBeGreaterThan(0);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    expect(defaultEmomTarget(e).value).toBeGreaterThan(0);
    if (e.id.includes('carry')) {
      expect(e.supportedUnits).toEqual(['seconds', 'metres']);
      expect(defaultEmomTarget(e)).toEqual({ unit: 'seconds', value: 30 });
    }
  }
});

import release1170 from './catalog-1170-baseline.json';

it('1.18 preserves all prior entries and adds twenty complete, searchable, eligible movements', () => {
  expect(exercises.slice(0, 123)).toEqual(release1170);
  expect(exercises).toHaveLength(223);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(223);
  const added = exercises.slice(123, 143);
  expect(added.filter((e) => metadataFor(e)?.equipment.length === 0)).toHaveLength(10);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('dumbbell'))).toHaveLength(6);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('kettlebell'))).toHaveLength(4);
  for (const e of added) {
    expect(e.description?.length).toBeGreaterThan(50);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(metadataFor(e)?.targetAreas?.length).toBeGreaterThan(0);
    expect(metadataFor(e)?.aliases.length).toBeGreaterThan(0);
    for (const alias of metadataFor(e)?.aliases ?? []) expect(matchesExercise(e, alias)).toBe(true);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    expect(defaultEmomTarget(e).value).toBeLessThanOrEqual(30);
    expect(e.supportedUnits).not.toContain('calories');
  }
  for (const id of [
    'childs-pose',
    'cobra-stretch',
    'downward-facing-dog',
    'half-kneeling-hip-flexor-stretch',
    'dumbbell-suitcase-carry',
  ]) {
    const entry = added.find((e) => e.id === id)!;
    expect(entry.supportedUnits).not.toContain('reps');
    expect(defaultEmomTarget(entry).unit).toBe('seconds');
  }
});

import release1200 from './catalog-1200-baseline.json';

it('1.21 preserves 143 records and adds 20 distinct fully described exercises', () => {
  expect(exercises.slice(0, 143)).toEqual(release1200);
  expect(exercises).toHaveLength(223);
  const added = exercises.slice(143, 163);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(223);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(223);
  expect(added.filter((e) => metadataFor(e)?.equipment.length === 0)).toHaveLength(10);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('dumbbell'))).toHaveLength(6);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('kettlebell'))).toHaveLength(4);
  for (const e of added) {
    expect(e.description?.length).toBeGreaterThan(40);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(metadataFor(e)?.targetAreas?.length).toBeGreaterThan(0);
    expect(metadataFor(e)?.aliases.length).toBeGreaterThan(0);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    expect(defaultEmomTarget(e).value).toBeLessThanOrEqual(30);
    expect(matchesExercise(e, e.name)).toBe(true);
  }
});

import release1210 from './catalog-1210-baseline.json';

it('1.22 preserves 163 snapshots and adds 20 distinct complete movements', () => {
  expect(exercises.slice(0, 163)).toEqual(release1210);
  expect(exercises).toHaveLength(223);
  const added = exercises.slice(163, 183);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(223);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(223);
  expect(added.filter((e) => metadataFor(e)?.equipment.length === 0)).toHaveLength(10);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('dumbbell'))).toHaveLength(6);
  expect(added.filter((e) => metadataFor(e)?.equipment.includes('kettlebell'))).toHaveLength(4);
  for (const e of added) {
    expect(e.description?.length).toBeGreaterThan(40);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(metadataFor(e)?.targetAreas?.length).toBeGreaterThan(0);
    expect(metadataFor(e)?.aliases.length).toBeGreaterThan(0);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    expect(defaultEmomTarget(e).value).toBeLessThanOrEqual(30);
    for (const alias of metadataFor(e)?.aliases ?? []) expect(matchesExercise(e, alias)).toBe(true);
  }
});

it('finds correctly pluralised new stretch and press names', () => {
  for (const [id, query] of [
    ['standing-calf-stretch', 'standing calf stretches'],
    ['seated-hamstring-stretch', 'seated hamstring stretches'],
    ['kettlebell-clean-squat-press', 'kettlebell clean, squat and presses'],
  ]) {
    const entry = exercises.find((e) => e.id === id);
    expect(entry).toBeDefined();
    if (entry) expect(matchesExercise(entry, query)).toBe(true);
  }
});

import release1220 from './catalog-1220-baseline.json';

it('1.23 preserves all 183 snapshots and adds twenty complete low-impact movements', () => {
  expect(exercises.slice(0, 183)).toEqual(release1220);
  expect(exercises).toHaveLength(223);
  const added = exercises.slice(183, 203);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(223);
  for (const e of added) {
    const m = metadataFor(e);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(m?.intensity).toBe('low');
    expect(m?.trainingType).toBeDefined();
    expect(m?.targetAreas?.length).toBeGreaterThan(0);
    expect(m?.aliases.length).toBeGreaterThan(0);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    for (const alias of m?.aliases ?? []) expect(matchesExercise(e, alias)).toBe(true);
  }
});

import release1230 from './catalog-1230-baseline.json';

it('1.24 preserves prior snapshots and supplies twenty distinct usable movements', () => {
  expect(exercises.slice(0, 203)).toEqual(release1230);
  const added = exercises.slice(203);
  expect(added).toHaveLength(20);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
  expect(new Set(exercises.map((e) => e.name.toLowerCase())).size).toBe(exercises.length);
  expect(added.filter((e) => metadataFor(e)?.equipment.length === 0).length).toBeGreaterThanOrEqual(
    12,
  );
  for (const e of added) {
    const m = metadataFor(e);
    expect(e.description?.length).toBeGreaterThan(30);
    expect(e.description?.length).toBeLessThanOrEqual(240);
    expect(m?.intensity).toBeDefined();
    expect(m?.trainingType).toBeDefined();
    expect(m?.targetAreas?.some((area) => area === 'core' || area === 'whole-body')).toBe(true);
    expect(e.supportedUnits).toContain(defaultEmomTarget(e).unit);
    for (const alias of m?.aliases ?? []) expect(matchesExercise(e, alias)).toBe(true);
  }
});
