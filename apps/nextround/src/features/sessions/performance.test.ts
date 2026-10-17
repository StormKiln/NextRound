import { expect, it } from 'vitest';
import type { TrainingSession } from './model';
import { parseActuals } from './model';
import { compareActual, trainingComparisonKey } from './performance';

it('retains an explicit zero without filling missing performance from targets', () => {
  expect(parseActuals([{ exerciseId: 'e', occurrence: 0, reps: 0 }])).toEqual([
    { exerciseId: 'e', occurrence: 0, reps: 0 },
  ]);
  expect(parseActuals([{ exerciseId: 'e', occurrence: 0 }])[0].seconds).toBeUndefined();
  expect(() => parseActuals([{ exerciseId: 'e', occurrence: 0, reps: 1.2 }])).toThrow();
  expect(() => parseActuals([{ exerciseId: 'e', occurrence: 0, load: 10 }])).toThrow();
});
it('compares reps at equivalent loads but refuses different loads or missing values', () => {
  const a = { exerciseId: 'e', occurrence: 0, reps: 12, load: 10, loadUnit: 'kg' as const };
  expect(compareActual(a, { ...a, reps: 10 }, 'reps')).toBe(2);
  expect(compareActual(a, { ...a, load: 12, reps: 10 }, 'reps')).toBeNull();
  expect(compareActual(a, { ...a, reps: undefined }, 'reps')).toBeNull();
});
it('ignores generated identities but distinguishes order, timing and prescribed targets', () => {
  const s: TrainingSession = {
    id: 's',
    name: 'One',
    blocks: [
      {
        id: 'b',
        name: 'Block',
        config: {
          type: 'countdown',
          durationSeconds: 30,
          leadInSeconds: 5,
          warningSeconds: 3,
          exercises: [{ id: 'e', name: 'Push-up', target: { unit: 'reps', value: 5 } }],
        },
        restSeconds: 0,
        advance: 'automatic',
      },
    ],
  };
  const copy = structuredClone(s);
  copy.id = 'copy';
  copy.blocks[0].id = 'other';
  copy.blocks[0].config.exercises![0].id = 'other';
  expect(trainingComparisonKey(copy)).toBe(trainingComparisonKey(s));
  copy.blocks[0].config.exercises![0].target!.value = 10;
  expect(trainingComparisonKey(copy)).not.toBe(trainingComparisonKey(s));
});
it('counts a movement once per parent session and excludes untouched/skipped blocks', async () => {
  const { deriveUsage } = await import('../setup/exercise-suggestions');
  const block = {
    id: 'a',
    name: 'A',
    config: {
      type: 'countdown' as const,
      durationSeconds: 10,
      leadInSeconds: 0,
      warningSeconds: 1,
      exercises: [{ id: 'e', catalogId: 'push-up', name: 'Push-up' }],
    },
    restSeconds: 0,
    advance: 'automatic' as const,
  };
  const result = {
    id: 'r',
    session: {
      id: 's',
      name: 'S',
      blocks: [
        block,
        { ...block, id: 'b' },
        {
          ...block,
          id: 'c',
          config: { ...block.config, exercises: [{ id: 'e', catalogId: 'squat', name: 'Squat' }] },
        },
      ],
    },
    completedAt: 1,
    note: '',
    blocks: ['a', 'b', 'c'].map((id, i) => ({
      blockId: id,
      status: i === 2 ? ('skipped' as const) : ('complete' as const),
      elapsedMs: i === 2 ? 0 : 10000,
      actuals: [],
      checkedIds: [],
      completedMovements: 0,
      partialValue: 0,
    })),
  };
  const usage = deriveUsage({ version: 1, results: [] }, [result]);
  expect(usage.counts.get('push-up')).toBe(1);
  expect(usage.counts.has('squat')).toBe(false);
});
it('only awards a recorded rep best with a prior comparable complete attempt', async () => {
  const { actualHighlights } = await import('./performance');
  const s: TrainingSession = {
    id: 's',
    name: 'Flow',
    blocks: [
      {
        id: 'b',
        name: 'Block',
        config: {
          type: 'countdown',
          durationSeconds: 30,
          leadInSeconds: 0,
          warningSeconds: 3,
          exercises: [{ id: 'e', name: 'Push-up' }],
        },
        restSeconds: 0,
        advance: 'automatic',
      },
    ],
  };
  const result = {
    id: 'r',
    session: s,
    completedAt: 2,
    note: '',
    blocks: [
      {
        blockId: 'b',
        status: 'complete' as const,
        elapsedMs: 30000,
        actuals: [{ exerciseId: 'e', occurrence: 0, reps: 12 }],
        checkedIds: [],
        completedMovements: 0,
        partialValue: 0,
      },
    ],
  };
  expect(actualHighlights(result, [], 'b')).toEqual([]);
  const previous = structuredClone(result);
  previous.id = 'old';
  previous.completedAt = 1;
  previous.blocks[0].actuals[0].reps = 10;
  expect(actualHighlights(result, [previous], 'b').join(' ')).toContain('best');
  previous.blocks[0].status = 'partial' as 'complete';
  expect(actualHighlights(result, [previous], 'b')).toEqual([]);
});
it('rejects double-counted totals and out-of-range or unsupported occurrence entries', async () => {
  const { validateActualsForConfig } = await import('./model');
  const config = {
    type: 'countdown' as const,
    durationSeconds: 30,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: [
      { id: 'e', name: 'Push-up', supportedUnits: ['reps' as const, 'seconds' as const] },
    ],
  };
  expect(() =>
    validateActualsForConfig(config, [{ exerciseId: 'e', occurrence: 1, reps: 2 }]),
  ).toThrow();
  expect(() =>
    validateActualsForConfig(config, [{ exerciseId: 'e', occurrence: 0, metres: 2 }]),
  ).toThrow();
  const emom = { minutes: 3, leadInSeconds: 0, warningSeconds: 0, exercises: config.exercises };
  expect(() =>
    validateActualsForConfig(emom, [
      { exerciseId: 'e', occurrence: 0, reps: 2 },
      { exerciseId: 'e', occurrence: 1, reps: 1 },
    ]),
  ).toThrow();
  expect(() =>
    validateActualsForConfig(emom, [{ exerciseId: 'e', occurrence: 4, reps: 1 }]),
  ).toThrow();
  expect(
    validateActualsForConfig(emom, [{ exerciseId: 'e', occurrence: 3, reps: 0 }]),
  ).toHaveLength(1);
});
