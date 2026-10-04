import { expect, it } from 'vitest';
import {
  copyResult,
  createHistoryRepository,
  parseHistoryDocument,
  type WorkoutResult,
} from './repository';

const result: WorkoutResult = {
  id: 'session-1',
  completedAt: 1780000000000,
  elapsedMs: 30000,
  config: {
    type: 'countdown',
    durationSeconds: 30,
    leadInSeconds: 5,
    warningSeconds: 3,
    showChecklist: true,
    exercises: [
      { id: 'entry-1', catalogId: 'push-up', name: 'Push-up', target: { unit: 'reps', value: 10 } },
    ],
  },
  checkedExerciseIds: ['entry-1'],
};
function fixture() {
  let raw: string | null = null;
  let fail = false;
  const storage = {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      if (fail) throw new Error('Disk full');
      raw = value;
    },
  };
  return {
    repo: createHistoryRepository(storage),
    storage,
    raw: () => raw,
    put: (v: string) => {
      raw = v;
    },
    fail: (v: boolean) => {
      fail = v;
    },
  };
}
it('saves an immutable snapshot once per session, preserves identity and survives restart', async () => {
  const f = fixture();
  const input = structuredClone(result);
  await Promise.all([
    f.repo.mutate({ action: 'save', result: input }),
    f.repo.mutate({ action: 'save', result: input }),
  ]);
  if (!input.config.exercises) throw new Error('Fixture needs exercises');
  input.config.exercises[0].name = 'Edited';
  const saved = await createHistoryRepository(f.storage).read();
  expect(saved.results).toEqual([result]);
  await expect(f.repo.mutate({ action: 'save', result: input })).rejects.toThrow(/already saved/);
  expect((await f.repo.read()).results).toEqual([result]);
  await f.repo.mutate({ action: 'delete', id: result.id });
  expect((await f.repo.read()).results).toEqual([]);
});
it('failed writes are retryable and preserve previous records', async () => {
  const f = fixture();
  await f.repo.mutate({ action: 'save', result });
  f.fail(true);
  await expect(
    f.repo.mutate({ action: 'save', result: { ...result, id: 'next' } }),
  ).rejects.toThrow('Disk full');
  expect((await f.repo.read()).results).toEqual([result]);
  f.fail(false);
  await f.repo.mutate({ action: 'save', result: { ...result, id: 'next' } });
  expect((await f.repo.read()).results).toHaveLength(2);
});
it('preserves corrupt/future data and rejects malformed results', async () => {
  for (const raw of ['{bad', '{"version":2,"results":[]}']) {
    const f = fixture();
    f.put(raw);
    await expect(f.repo.mutate({ action: 'save', result })).rejects.toThrow();
    expect(f.raw()).toBe(raw);
  }
  for (const patch of [
    { elapsedMs: -1 },
    { elapsedMs: 1 },
    { completedAt: 'yesterday' },
    { checkedExerciseIds: ['missing'] },
    { checkedExerciseIds: ['entry-1', 'entry-1'] },
  ]) {
    expect(() =>
      parseHistoryDocument({ version: 1, results: [{ ...result, ...patch }] }),
    ).toThrow();
  }
});
it('accepts legacy exercise identities and snapshots of all three modes', async () => {
  const f = fixture();
  for (const config of [
    {
      minutes: 1,
      leadInSeconds: 3,
      warningSeconds: 3,
      exercises: [{ id: 'legacy', name: 'Squat' }],
    },
    {
      type: 'intervals' as const,
      workSeconds: 10,
      restSeconds: 5,
      rounds: 2,
      leadInSeconds: 3,
      warningSeconds: 3,
      exercises: [{ id: 'entry', name: 'Custom' }],
    },
  ]) {
    const elapsedMs = 'minutes' in config ? 60000 : 25000;
    await f.repo.mutate({
      action: 'save',
      result: { ...result, id: String(elapsedMs), config, elapsedMs, checkedExerciseIds: [] },
    });
  }
  expect((await f.repo.read()).results).toHaveLength(2);
});

it('rejects extra history fields without overwriting them, matching native storage', async () => {
  for (const value of [
    { version: 1, results: [result], extra: 'preserve me' },
    { version: 1, results: [{ ...result, extra: 'preserve me' }] },
  ]) {
    const f = fixture();
    const raw = JSON.stringify(value);
    f.put(raw);
    await expect(f.repo.mutate({ action: 'delete', id: result.id })).rejects.toThrow();
    expect(f.raw()).toBe(raw);
  }
});
it('treats explicit null catalog identity as absent, matching native optional fields', () => {
  const input = structuredClone(result);
  const value = JSON.parse(JSON.stringify(input));
  value.config.exercises[0].catalogId = null;
  const parsed = parseHistoryDocument({ version: 1, results: [value] });
  expect(parsed.results[0].config.exercises?.[0].catalogId).toBeUndefined();
});

it('roundtrips mixed-unit AMRAP progress and rejects invalid scores', () => {
  const raw = {
    id: 'amrap-result',
    completedAt: 1780000000000,
    elapsedMs: 60000,
    checkedExerciseIds: [],
    config: {
      type: 'amrap',
      durationSeconds: 60,
      leadInSeconds: 0,
      warningSeconds: 3,
      exercises: [
        { id: 'a', name: 'Squat', target: { unit: 'reps', value: 10 } },
        { id: 'b', name: 'Row', target: { unit: 'metres', value: 100 } },
      ],
    },
    amrapProgress: { completedMovements: 3, partialValue: 40 },
  };
  expect(copyResult(raw)).toEqual(raw);
  expect(() =>
    copyResult({ ...raw, amrapProgress: { completedMovements: 3, partialValue: 100 } }),
  ).toThrow();
  expect(() =>
    copyResult({ ...raw, amrapProgress: { completedMovements: -1, partialValue: 0 } }),
  ).toThrow();
  expect(() => copyResult({ ...raw, amrapProgress: undefined })).toThrow();
});

it('preserves For Time outcomes and validates manual elapsed separately from a cap', () => {
  const entry = {
    ...result,
    config: {
      type: 'forTime' as const,
      leadInSeconds: 2,
      warningSeconds: 3,
      timeCapSeconds: 30,
      exercises: result.config.exercises,
    },
    elapsedMs: 1234,
    outcome: 'finished' as const,
  };
  expect(copyResult(entry)).toEqual(entry);
  expect(copyResult({ ...entry, elapsedMs: 30000, outcome: 'timeCapReached' }).outcome).toBe(
    'timeCapReached',
  );
  for (const patch of [
    { elapsedMs: -1 },
    { elapsedMs: 1.5 },
    { elapsedMs: 30000 },
    { outcome: undefined },
    { outcome: 'timeCapReached' },
    { config: { ...entry.config, timeCapSeconds: undefined }, outcome: 'timeCapReached' },
  ])
    expect(() => copyResult({ ...entry, ...patch })).toThrow();
  expect(() => copyResult({ ...result, outcome: 'finished' })).toThrow();
  expect(
    copyResult({
      ...entry,
      config: { ...entry.config, timeCapSeconds: undefined },
      elapsedMs: 90000000,
    }).elapsedMs,
  ).toBe(90000000);
});
it('preserves Ladder progress and rejects incomplete success or unrelated progress', () => {
  const entry = {
    id: 'ladder-result',
    completedAt: 1780000000000,
    elapsedMs: 1234,
    checkedExerciseIds: [],
    outcome: 'finished',
    ladderCompletedMovements: 2,
    config: {
      type: 'ladder',
      ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 2 },
      leadInSeconds: 0,
      warningSeconds: 0,
      exercises: [{ id: 'a', name: 'Squat' }],
    },
  };
  expect(copyResult(entry)).toMatchObject({ ladderCompletedMovements: 2, outcome: 'finished' });
  expect(() => copyResult({ ...entry, ladderCompletedMovements: 1 })).toThrow();
  expect(() => copyResult({ ...entry, ladderCompletedMovements: 3 })).toThrow();
  expect(
    copyResult({
      ...entry,
      elapsedMs: 5000,
      outcome: 'timeCapReached',
      ladderCompletedMovements: 1,
      config: { ...entry.config, timeCapSeconds: 5 },
    }),
  ).toMatchObject({ ladderCompletedMovements: 1 });
  expect(() => copyResult({ ...result, ladderCompletedMovements: 1 })).toThrow();
});
