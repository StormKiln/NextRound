import { expect, test } from 'vitest';
import { cueAt, type ExerciseEntry, type TargetUnit, type WorkoutConfig } from './index';

const hold = (id: string, unit: TargetUnit, value: number): ExerciseEntry => ({
  id,
  name: id,
  target: { unit, value },
});
const doneSeconds = (config: WorkoutConfig) =>
  Array.from({ length: 401 }, (_, s) => s).filter((s) => cueAt(config, s * 1000) === 'done');

test('timed targets cue done inside their EMOM minute', () => {
  const config = {
    type: 'emom',
    minutes: 4,
    leadInSeconds: 10,
    warningSeconds: 3,
    exercises: [
      hold('plank', 'seconds', 40),
      hold('squat', 'reps', 40),
      hold('hang', 'seconds', 58),
      hold('wall', 'seconds', 60),
    ],
  } as WorkoutConfig;
  expect(cueAt(config, 50000)).toBe('done');
  expect(cueAt(config, 110000)).toBeNull();
  expect([187000, 188000, 189000].map((ms) => cueAt(config, ms))).toEqual(['tock', 'done', 'tock']);
  expect(cueAt(config, 250000)).toBe('complete');
  expect(doneSeconds(config)).toEqual([50, 188]);
});

test('timed targets cue done inside interval work only', () => {
  expect(
    doneSeconds({
      type: 'intervals',
      workSeconds: 30,
      restSeconds: 10,
      rounds: 3,
      leadInSeconds: 5,
      warningSeconds: 0,
      exercises: [hold('plank', 'seconds', 20), hold('hang', 'seconds', 30)],
    }),
  ).toEqual([25, 105]);
});

test('athlete-paced modes ignore timed targets', () => {
  expect(
    doneSeconds({
      type: 'countdown',
      durationSeconds: 120,
      leadInSeconds: 0,
      warningSeconds: 0,
      exercises: [hold('plank', 'seconds', 40)],
    }),
  ).toEqual([]);
});
