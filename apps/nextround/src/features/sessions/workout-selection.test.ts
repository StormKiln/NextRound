import { expect, it } from 'vitest';
import type { WorkoutTemplate } from '../templates/repository';
import { validateSelection } from './workout-selection';

const a: WorkoutTemplate = {
  id: 'a',
  name: 'Warm up',
  config: {
    type: 'countdown',
    durationSeconds: 60,
    leadInSeconds: 0,
    warningSeconds: 3,
    exercises: [],
  },
};
const b: WorkoutTemplate = { ...a, id: 'b', name: 'Main work' };
it('builds an ordered independent batch with fresh block IDs and default transitions', () => {
  const result = validateSelection([b, a], [a, b], 2);
  expect(result.map((x) => x.name)).toEqual(['Main work', 'Warm up']);
  expect(new Set(result.map((x) => x.id)).size).toBe(2);
  expect(
    result.every(
      (x) => x.id !== a.id && x.id !== b.id && x.restSeconds === 0 && x.advance === 'automatic',
    ),
  ).toBe(true);
  result[0].config.leadInSeconds = 10;
  expect(b.config.leadInSeconds).toBe(0);
  expect(validateSelection([a], [a], 1)[0].id).not.toBe(result[1].id);
});
it('rejects empty, duplicate and over-capacity batches without changing inputs', () => {
  const before = structuredClone([a, b]);
  expect(() => validateSelection([], before, 2)).toThrow(/Select/);
  expect(() => validateSelection([a, a], before, 2)).toThrow(/once/);
  expect(() => validateSelection([a, b], before, 1)).toThrow(/capacity/);
  expect([a, b]).toEqual(before);
});
it('requires review after changes or deletion and rejects invalid configurations', () => {
  expect(() => validateSelection([a], [{ ...a, name: 'Changed' }], 1)).toThrow(/changed/);
  expect(() => validateSelection([a], [], 1)).toThrow(/removed/);
  const invalid = { ...a, config: { ...a.config, leadInSeconds: -1 } };
  expect(() => validateSelection([invalid], [invalid], 1)).toThrow();
});

it('preserves a six-mode batch including exercise targets and ladder settings', () => {
  const common = {
    leadInSeconds: 5,
    warningSeconds: 3,
    exercises: [
      {
        id: 'e',
        catalogId: 'pushup',
        name: 'Push-up',
        supportedUnits: ['reps', 'seconds'] as ('reps' | 'seconds')[],
        target: { unit: 'reps' as const, value: 8 },
      },
    ],
  };
  const configs: import('@nextround/core').WorkoutConfig[] = [
    { ...common, type: 'emom', minutes: 3 },
    { ...common, type: 'countdown', durationSeconds: 90, showChecklist: false },
    { ...common, type: 'intervals', workSeconds: 30, restSeconds: 10, rounds: 3 },
    { ...common, type: 'amrap', durationSeconds: 90 },
    { ...common, type: 'forTime', timeCapSeconds: 90, showChecklist: false },
    {
      ...common,
      type: 'ladder',
      timeCapSeconds: 90,
      exercises: common.exercises.map(({ target, ...e }) => e),
      ladder: { direction: 'pyramid', startReps: 2, increment: 2, rungs: 3 },
    },
  ];
  const originals = configs.map((config, i) => ({ id: `mode-${i}`, name: `Mode ${i}`, config }));
  const blocks = validateSelection(originals, originals, 6);
  expect(blocks.map((b) => b.config)).toEqual(configs);
  blocks[0].config.exercises![0].name = 'Changed';
  expect(originals[0].config.exercises![0].name).toBe('Push-up');
});
