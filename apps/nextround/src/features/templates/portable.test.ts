import type { WorkoutConfig } from '@nextround/core';
import { describe, expect, it } from 'vitest';
import { availableName, encodeWorkout, importedConfig, parseWorkout } from './portable';

const exercise = {
  id: 'foreign',
  catalogId: 'personal:foreign',
  name: 'My movement',
  description: 'My cue',
  supportedUnits: ['reps'],
  target: { unit: 'reps', value: 8 },
};
const common = { leadInSeconds: 10, warningSeconds: 3, exercises: [exercise] };
const modes = [
  { ...common, type: 'emom', minutes: 12 },
  { ...common, type: 'countdown', durationSeconds: 75, showChecklist: false },
  { ...common, type: 'intervals', workSeconds: 30, restSeconds: 15, rounds: 5 },
  { ...common, type: 'amrap', durationSeconds: 600 },
  { ...common, type: 'forTime', timeCapSeconds: undefined },
  {
    ...common,
    type: 'ladder',
    timeCapSeconds: undefined,
    exercises: [{ ...exercise, target: undefined }],
    ladder: { startReps: 2, increment: 2, rungs: 5, direction: 'ascending' },
  },
] as WorkoutConfig[];
describe('portable workouts', () => {
  for (const config of modes)
    it(`round trips ${config.type} snapshots without private fields`, () => {
      const raw = encodeWorkout({ name: 'Sample', config });
      expect(parseWorkout(raw)).toEqual({
        name: 'Sample',
        config: JSON.parse(JSON.stringify(config)),
      });
      expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['config', 'format', 'name', 'version']);
    });
  it('detaches foreign identities and retains only known bundled references', () => {
    const config = {
      ...modes[0],
      exercises: [
        exercise,
        { ...exercise, id: 'b', catalogId: 'pushup' },
        { ...exercise, id: 'c', catalogId: 'unknown' },
      ],
    } as WorkoutConfig;
    const first = importedConfig(config),
      second = importedConfig(config);
    expect(first.exercises?.map((e) => e.catalogId)).toEqual([undefined, 'pushup', undefined]);
    expect(new Set([...first.exercises!, ...second.exercises!].map((e) => e.id)).size).toBe(6);
    expect(first.exercises?.[0].description).toBe('My cue');
    expect(config.exercises?.[0].id).toBe('foreign');
  });
  it('rejects malformed, oversized, unknown, invalid and future input', () => {
    const good = JSON.parse(encodeWorkout({ name: 'Sample', config: modes[0] }));
    for (const raw of [
      '{}',
      'not JSON',
      'x'.repeat(1048577),
      JSON.stringify({ ...good, version: 2 }),
      JSON.stringify({ ...good, history: [] }),
      JSON.stringify({ ...good, name: 'x'.repeat(121) }),
      JSON.stringify({ ...good, config: { ...good.config, minutes: -1 } }),
      JSON.stringify({
        ...good,
        config: { ...good.config, exercises: [{ ...exercise, id: 'x'.repeat(121) }] },
      }),
    ])
      expect(() => parseWorkout(raw)).toThrow();
  });
  it('suggests bounded names without case-insensitive collisions', () => {
    expect(availableName('Sample', [' sample ', 'Sample (copy)'])).toBe('Sample (copy 2)');
    expect(availableName('x'.repeat(120), ['x'.repeat(120)]).length).toBeLessThanOrEqual(120);
  });
});

it('rejects invalid inactive fields before preview', () => {
  const raw = encodeWorkout({ name: 'Sample', config: modes[1] });
  for (const extra of [
    '"minutes":1e400',
    '"minutes":-1',
    '"ladder":{"secret":"unvalidated"}',
    '"restSeconds":"30"',
  ]) {
    expect(() =>
      parseWorkout(raw.replace('"durationSeconds": 75', '"durationSeconds": 75,' + extra)),
    ).toThrow();
  }
});
