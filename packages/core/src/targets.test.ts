import { expect, it } from 'vitest';
import { type ExerciseEntry, formatTarget, snapshotAt, validateConfig } from './index';

const config = (exercise: ExerciseEntry) => ({
  minutes: 1,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [exercise],
});
it('validates and retains target prescriptions without changing round timing', () => {
  const exercise: ExerciseEntry = {
    id: 'a',
    name: 'Row',
    target: { unit: 'metres', value: 500 },
    supportedUnits: ['metres', 'calories', 'seconds'],
  };
  expect(validateConfig(config(exercise))).toEqual({});
  expect(snapshotAt(config(exercise), 0)).toMatchObject({
    roundRemainingMs: 60000,
    config: { exercises: [exercise] },
  });
  expect(formatTarget({ unit: 'metres', value: 500 })).toBe('500 m');
  expect(formatTarget({ unit: 'reps', value: 10 })).toBe('10 reps');
  expect(formatTarget({ unit: 'seconds', value: 30 })).toBe('30 sec');
  expect(formatTarget({ unit: 'calories', value: 10 })).toBe('10 cal');
});
it('rejects invalid and unsupported targets', () => {
  for (const value of [0, -1, 1.5, NaN, Infinity, 1000000])
    expect(
      validateConfig(config({ id: 'a', name: 'Push-up', target: { unit: 'reps', value } })),
    ).toHaveProperty('exercises');
  expect(
    validateConfig(config({ id: 'a', name: 'Push-up', target: { unit: 'seconds', value: 86401 } })),
  ).toHaveProperty('exercises');
  expect(
    validateConfig(
      config({
        id: 'a',
        name: 'Push-up',
        target: { unit: 'metres', value: 5 },
        supportedUnits: ['reps', 'seconds'],
      }),
    ),
  ).toHaveProperty('exercises');
});

it('rejects unknown units and accepts upper bounds', () => {
  const unknown = JSON.parse(
    '{"id":"a","name":"Move","target":{"unit":"yards","value":10}}',
  ) as ExerciseEntry;
  expect(validateConfig(config(unknown))).toHaveProperty('exercises');
  for (const unit of ['reps', 'metres', 'calories'] as const)
    expect(
      validateConfig(config({ id: 'a', name: 'Move', target: { unit, value: 999999 } })),
    ).toEqual({});
  expect(
    validateConfig(config({ id: 'a', name: 'Move', target: { unit: 'seconds', value: 86400 } })),
  ).toEqual({});
});
