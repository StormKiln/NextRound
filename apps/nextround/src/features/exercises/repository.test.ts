import { expect, it } from 'vitest';
import {
  createPersonalRepository,
  type PersonalExercise,
  parsePersonalDocument,
} from './repository';

const entry: PersonalExercise = {
  id: 'personal:test',
  name: 'My squat',
  description: '',
  category: 'Squats',
  equipment: [],
  targetAreas: ['legs'],
  supportedUnits: ['reps'],
  archived: false,
};
function fixture() {
  let raw: string | null = null;
  let fail = false;
  const storage = {
    getItem: () => raw,
    setItem: (_k: string, v: string) => {
      if (fail) throw Error('Disk full');
      raw = v;
    },
  };
  return {
    repo: createPersonalRepository(storage),
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
it('persists namespaced identity, duplicate names, edits and archive/restore without mutating snapshots', async () => {
  const f = fixture();
  await f.repo.mutate({ action: 'save', exercise: entry });
  await f.repo.mutate({ action: 'save', exercise: { ...entry, id: 'personal:second' } });
  const before = (await f.repo.read()).exercises[0];
  const snapshot = structuredClone(before);
  await f.repo.mutate({
    action: 'save',
    expected: before,
    exercise: { ...before, name: 'Renamed', archived: true },
  });
  expect((await createPersonalRepository(f.storage).read()).exercises).toHaveLength(2);
  expect(before).toEqual(snapshot);
  const archived = (await f.repo.read()).exercises[0];
  await f.repo.mutate({
    action: 'save',
    expected: archived,
    exercise: { ...archived, archived: false },
  });
  expect((await f.repo.read()).exercises[0].archived).toBe(false);
  const raw = f.raw();
  await expect(
    f.repo.mutate({ action: 'save', expected: before, exercise: { ...before, name: 'stale' } }),
  ).rejects.toThrow(/changed/);
  expect(f.raw()).toBe(raw);
});
it('retries failed saves without duplicates and serializes parallel creates', async () => {
  const f = fixture();
  f.fail(true);
  await expect(f.repo.mutate({ action: 'save', exercise: entry })).rejects.toThrow('Disk full');
  expect(f.raw()).toBeNull();
  f.fail(false);
  await f.repo.mutate({ action: 'save', exercise: entry });
  await f.repo.mutate({ action: 'save', exercise: entry });
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      f.repo.mutate({ action: 'save', exercise: { ...entry, id: `personal:${i}` } }),
    ),
  );
  expect((await f.repo.read()).exercises).toHaveLength(11);
});
it('preserves corrupt and future data, including unknown nested fields', async () => {
  for (const raw of [
    '{broken',
    JSON.stringify({ version: 2, exercises: [] }),
    JSON.stringify({ version: 1, exercises: [{ ...entry, future: true }] }),
    JSON.stringify({
      version: 1,
      exercises: [{ ...entry, defaultTarget: { unit: 'reps', value: 5, future: true } }],
    }),
  ]) {
    const f = fixture();
    f.put(raw);
    await expect(f.repo.read()).rejects.toThrow();
    await expect(f.repo.mutate({ action: 'save', exercise: entry })).rejects.toThrow();
    expect(f.raw()).toBe(raw);
  }
});
it('validates IDs, taxonomy, compatible targets and cap including archived', () => {
  for (const patch of [
    { id: 'squat' },
    { name: ' ' },
    { description: 'a'.repeat(2001) },
    { equipment: ['unknown'] },
    { targetAreas: ['unknown'] },
    { category: 'unknown' },
    { supportedUnits: [] },
    { supportedUnits: ['reps', 'reps'] },
    { defaultTarget: { unit: 'seconds', value: 30 } },
    { defaultTarget: { unit: 'reps', value: 0 } },
  ])
    expect(() =>
      parsePersonalDocument({ version: 1, exercises: [{ ...entry, ...patch }] }),
    ).toThrow();
  const items = Array.from({ length: 501 }, (_, i) => ({
    ...entry,
    id: `personal:${i}`,
    archived: true,
  }));
  expect(() => parsePersonalDocument({ version: 1, exercises: items })).toThrow();
});
it('rejects a new entry when 500 archived records already exist', async () => {
  const f = fixture();
  f.put(
    JSON.stringify({
      version: 1,
      exercises: Array.from({ length: 500 }, (_, i) => ({
        ...entry,
        id: `personal:${i}`,
        archived: true,
      })),
    }),
  );
  const raw = f.raw();
  await expect(f.repo.mutate({ action: 'save', exercise: entry })).rejects.toThrow(/500/);
  expect(f.raw()).toBe(raw);
});
