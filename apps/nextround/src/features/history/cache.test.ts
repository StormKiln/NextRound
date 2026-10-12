import { QueryClient } from '@tanstack/react-query';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ read: vi.fn(), mutate: vi.fn() }));
vi.mock('./repository', () => ({
  historyKey: ['workout-history'],
  readHistory: mocks.read,
  mutateHistory: mocks.mutate,
}));

import { mutateHistoryIntoCache, readHistoryIntoCache } from './cache';
import { type HistoryDocument, historyKey } from './repository';

const old: HistoryDocument = { version: 1, results: [] };
const fresh: HistoryDocument = {
  version: 1,
  results: [
    {
      id: 'one',
      completedAt: 1700000000000,
      elapsedMs: 1000,
      checkedExerciseIds: [],
      note: 'New note',
      config: { type: 'countdown', durationSeconds: 1, leadInSeconds: 0, warningSeconds: 0 },
    },
  ],
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
beforeEach(() => vi.resetAllMocks());
it.each(['note', 'delete'] as const)(
  'keeps authoritative %s result when older queries resolve before/after the write',
  async (action) => {
    const client = new QueryClient();
    client.setQueryData(historyKey, old);
    const early = deferred<HistoryDocument>();
    const before = client
      .fetchQuery({ queryKey: historyKey, queryFn: () => early.promise })
      .catch(() => {});
    const write = deferred<HistoryDocument>();
    mocks.mutate.mockReturnValue(write.promise);
    const result = action === 'note' ? fresh : old;
    const operation = mutateHistoryIntoCache(
      client,
      action === 'note'
        ? { action, id: 'one', expectedNote: '', note: 'New note' }
        : { action, id: 'one', expected: fresh.results[0] },
    );
    await vi.waitFor(() => expect(mocks.mutate).toHaveBeenCalled());
    const during = deferred<HistoryDocument>();
    const late = client
      .fetchQuery({ queryKey: historyKey, queryFn: () => during.promise })
      .catch(() => {});
    write.resolve(result);
    await operation;
    early.resolve(fresh);
    during.resolve(action === 'note' ? old : fresh);
    await Promise.all([before, late]);
    expect(client.getQueryData(historyKey)).toEqual(result);
    await client.fetchQuery({ queryKey: historyKey, queryFn: async () => fresh });
    expect(client.getQueryData(historyKey)).toEqual(fresh);
    client.clear();
  },
);
it('orders explicit refreshes with writes and preserves cache on failed writes', async () => {
  const client = new QueryClient();
  client.setQueryData(historyKey, fresh);
  const read = deferred<HistoryDocument>();
  mocks.read.mockReturnValue(read.promise);
  mocks.mutate.mockResolvedValue(fresh);
  const refresh = readHistoryIntoCache(client, () => true);
  const write = mutateHistoryIntoCache(client, {
    action: 'note',
    id: 'one',
    expectedNote: '',
    note: 'New note',
  });
  await vi.waitFor(() => expect(mocks.read).toHaveBeenCalled());
  expect(mocks.mutate).not.toHaveBeenCalled();
  read.resolve(old);
  await Promise.all([refresh, write]);
  expect(client.getQueryData(historyKey)).toEqual(fresh);
  mocks.mutate.mockRejectedValue(new Error('Disk full'));
  await expect(
    mutateHistoryIntoCache(client, { action: 'delete', id: 'one', expected: fresh.results[0] }),
  ).rejects.toThrow('Disk full');
  expect(client.getQueryData(historyKey)).toEqual(fresh);
  client.clear();
});
it('an unmounted refresh does not cancel or replace a new route query', async () => {
  const client = new QueryClient();
  let active = true;
  const read = deferred<HistoryDocument>();
  mocks.read.mockReturnValue(read.promise);
  const refresh = readHistoryIntoCache(client, () => active);
  await vi.waitFor(() => expect(mocks.read).toHaveBeenCalled());
  active = false;
  const newer = deferred<HistoryDocument>();
  const query = client.fetchQuery({ queryKey: historyKey, queryFn: () => newer.promise });
  read.resolve(old);
  await refresh;
  newer.resolve(fresh);
  await query;
  expect(client.getQueryData(historyKey)).toEqual(fresh);
  client.clear();
});
