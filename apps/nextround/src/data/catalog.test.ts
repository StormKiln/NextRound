import { expect, it } from 'vitest';
import baseline from './catalog-baseline.json';
import { exercises } from './exercises';

it('adds twenty distinct exercises without changing the original catalog identities', () => {
  expect(exercises).toHaveLength(103);
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
  expect(exercises).toHaveLength(103);
  expect(exercises.slice(0, 83)).toEqual(fullBaseline);
  const additions = exercises.slice(83);
  expect(new Set(exercises.map((e) => e.id)).size).toBe(103);
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
  exercises.slice(83).forEach((entry, index) => {
    expect(matchesExercise(entry, names[index]), names[index]).toBe(true);
  });
});
