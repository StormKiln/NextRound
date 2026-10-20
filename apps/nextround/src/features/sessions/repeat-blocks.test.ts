import type { WorkoutConfig } from '@nextround/core';
import { expect, it } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { repeatSessionBlocks } from './repeat-blocks';

const base = () => {
  const s = result220().session;
  s.blocks.push(
    { ...structuredClone(s.blocks[0]), id: 'second', name: 'Second' },
    { ...structuredClone(s.blocks[0]), id: 'third', name: 'Third' },
  );
  return s;
};
it('appends complete sequences in source order with independent identities and one unchanged original', () => {
  const s = base(),
    before = structuredClone(s);
  let i = 0;
  const copy = repeatSessionBlocks(s, s, [s.blocks[2].id, s.blocks[0].id], 2, () => `copy-${++i}`);
  expect(copy.blocks.map((b) => b.name)).toEqual([
    ...s.blocks.map((b) => b.name),
    s.blocks[0].name,
    s.blocks[2].name,
    s.blocks[0].name,
    s.blocks[2].name,
  ]);
  expect(new Set(copy.blocks.map((b) => b.id)).size).toBe(7);
  expect(copy.blocks[3].config).toEqual(s.blocks[0].config);
  expect(copy.blocks[3].restSeconds).toBe(s.blocks[0].restSeconds);
  expect(copy.blocks[3].advance).toBe(s.blocks[0].advance);
  copy.blocks[3].config.exercises![0].name = 'Changed';
  expect(s).toEqual(before);
  expect(copy.blocks[5].config).toEqual(before.blocks[0].config);
  expect(copy.blocks.slice(0, 3)).toEqual(before.blocks);
});
it.each([0, -1, 1.5, NaN, Infinity, 20])(
  'rejects invalid/excessive copies %s without mutation',
  (copies) => {
    const s = base(),
      before = structuredClone(s);
    expect(() => repeatSessionBlocks(s, s, [s.blocks[0].id], copies)).toThrow();
    expect(s).toEqual(before);
  },
);
it('rejects empty, duplicate and missing selections and stale drafts', () => {
  const s = base();
  for (const ids of [[], ['missing'], [s.blocks[0].id, s.blocks[0].id]])
    expect(() => repeatSessionBlocks(s, s, ids, 1)).toThrow();
  const current = structuredClone(s);
  current.blocks[0].name = 'Edited';
  expect(() => repeatSessionBlocks(s, current, [s.blocks[0].id], 1)).toThrow(/changed/);
});
it('allows exactly20 blocks and rejects21 or reused identities', () => {
  const s = base();
  s.blocks = s.blocks.slice(0, 1);
  expect(repeatSessionBlocks(s, s, [s.blocks[0].id], 19).blocks).toHaveLength(20);
  expect(() => repeatSessionBlocks(s, s, [s.blocks[0].id], 20)).toThrow(/20/);
  expect(() => repeatSessionBlocks(s, s, [s.blocks[0].id], 1, () => s.blocks[0].id)).toThrow();
});
const common = {
  leadInSeconds: 5,
  warningSeconds: 3,
  exercises: [
    {
      id: 'slot',
      name: 'Custom',
      description: 'Notes',
      supportedUnits: ['reps' as const],
      target: { unit: 'reps' as const, value: 8 },
    },
  ],
};
it.each<WorkoutConfig>([
  { ...common, type: 'emom', minutes: 4 },
  { ...common, type: 'countdown', durationSeconds: 90, showChecklist: true },
  { ...common, type: 'intervals', workSeconds: 25, restSeconds: 10, rounds: 3 },
  { ...common, type: 'amrap', durationSeconds: 180 },
  { ...common, type: 'forTime', timeCapSeconds: 240, showChecklist: false },
  {
    ...common,
    type: 'ladder',
    timeCapSeconds: 300,
    ladder: { direction: 'pyramid', startReps: 2, increment: 2, rungs: 3 },
    exercises: [{ ...common.exercises[0], target: undefined }],
  },
])('preserves all $type configuration and block-local slot identity', (config) => {
  const s = base();
  s.blocks = [{ ...s.blocks[0], config, restSeconds: 27, advance: 'ready' }];
  const copy = repeatSessionBlocks(s, s, [s.blocks[0].id], 1);
  expect(copy.blocks[1]).toEqual({ ...s.blocks[0], id: copy.blocks[1].id });
  expect(copy.blocks[1].id).not.toBe(s.blocks[0].id);
  expect(copy.blocks[1].config).not.toBe(config);
});
