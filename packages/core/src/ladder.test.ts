import { describe, expect, it } from 'vitest';
import { cueAt, snapshotAt, validateConfig, type WorkoutConfig } from './index';
import { ladderReps, ladderTotalMovements } from './ladder';

const config = (direction = 'ascending', startReps = 2, increment = 2, rungs = 3) =>
  ({
    type: 'ladder',
    ladder: { direction, startReps, increment, rungs },
    leadInSeconds: 2,
    warningSeconds: 3,
    exercises: [
      { id: 'a', name: 'Squat', supportedUnits: ['reps'] },
      { id: 'b', name: 'Push-up' },
    ],
  }) as WorkoutConfig;
describe('Ladder progression', () => {
  it('generates exact ascending, descending and single-peak pyramids', () => {
    expect(ladderReps(config())).toEqual([2, 4, 6]);
    expect(ladderReps(config('descending', 6))).toEqual([6, 4, 2]);
    expect(ladderReps(config('pyramid'))).toEqual([2, 4, 6, 4, 2]);
    expect(ladderReps(config('pyramid', 3, 1, 1))).toEqual([3]);
    expect(ladderTotalMovements(config('pyramid'))).toBe(10);
  });
  it('rejects nonpositive descending targets, invalid bounds and incompatible exercise units', () => {
    for (const c of [
      config('descending', 2),
      config('ascending', 0),
      config('ascending', 2, 0),
      config('ascending', 2, 1, 51),
      config('bogus'),
    ])
      expect(Object.keys(validateConfig(c)).length).toBeGreaterThan(0);
    expect(
      validateConfig({
        ...config(),
        exercises: [{ id: 'a', name: 'Hold', supportedUnits: ['seconds'] }],
      } as WorkoutConfig).exercises,
    ).toBeTruthy();
    expect(validateConfig({ ...config(), exercises: [] } as WorkoutConfig).exercises).toBeTruthy();
    expect(validateConfig(config())).toEqual({});
    const extra = config() as import('./ladder').LadderConfig;
    expect(
      ladderReps({
        ...extra,
        ladder: { ...extra.ladder, future: true },
      } as unknown as WorkoutConfig),
    ).toEqual([]);
  });
  it('counts active elapsed with an optional cap and no clock-driven rung cues', () => {
    expect(snapshotAt(config(), 62000)).toMatchObject({
      phase: 'running',
      elapsedMs: 60000,
      remainingMs: 0,
      ladderCompletedMovements: 0,
    });
    expect(cueAt(config(), 62000)).toBeNull();
    const capped = { ...config(), timeCapSeconds: 5 } as WorkoutConfig;
    expect(snapshotAt(capped, 7000)).toMatchObject({
      phase: 'completed',
      outcome: 'timeCapReached',
      elapsedMs: 5000,
    });
    expect(cueAt(capped, 7000)).toBe('complete');
  });
});
