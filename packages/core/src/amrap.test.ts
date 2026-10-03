import { expect, it } from 'vitest';
import { cueAt, snapshotAt, validateConfig, type WorkoutConfig } from './index';

const config = {
  type: 'amrap',
  durationSeconds: 125,
  leadInSeconds: 2,
  warningSeconds: 3,
  exercises: [{ id: 'a', name: 'Row', target: { unit: 'metres', value: 100 } }],
} as WorkoutConfig;
it('runs AMRAP as one time cap without advancing exercises or beeping each minute', () => {
  expect(validateConfig(config)).toEqual({});
  expect(snapshotAt(config, 62000)).toMatchObject({
    remainingMs: 65000,
    roundRemainingMs: 65000,
    exerciseIndex: 0,
  });
  expect(cueAt(config, 62000)).toBeNull();
  expect(cueAt(config, 126000)).toBe('tock');
  expect(cueAt(config, 127000)).toBe('complete');
  expect(snapshotAt(config, 128000)).toMatchObject({ phase: 'completed', elapsedMs: 125000 });
});
it('requires a valid cap, nonempty circuit and targets for AMRAP', () => {
  expect(validateConfig({ ...config, exercises: [] }).exercises).toBeTruthy();
  expect(
    validateConfig({ ...config, exercises: [{ id: 'a', name: 'Unknown' }] }).exercises,
  ).toBeTruthy();
  expect(
    validateConfig({ ...config, durationSeconds: 0 } as WorkoutConfig).durationSeconds,
  ).toBeTruthy();
});
