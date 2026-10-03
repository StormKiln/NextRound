import { expect, it } from 'vitest';
import baseline from './catalog-baseline.json';
import { exercises } from './exercises';

it('adds twenty distinct exercises without changing the original catalog identities', () => {
  expect(exercises).toHaveLength(83);
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
