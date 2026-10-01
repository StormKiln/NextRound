import { expect, it } from 'vitest';
import { createHistoryRepository, parseHistoryDocument, type WorkoutResult } from './repository';

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
