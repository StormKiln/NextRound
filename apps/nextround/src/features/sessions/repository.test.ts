import { expect, it } from 'vitest';
import { emptyTraining } from './model';
import { createTrainingRepository, TRAINING_KEY } from './repository';

it('preserves unreadable data instead of replacing it on mutation', async () => {
  const data = new Map([[TRAINING_KEY, '{"version":99}']]);
  const repo = createTrainingRepository({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v);
    },
  });
  await expect(
    repo.mutate((d) => {
      d.recovery = null;
    }),
  ).rejects.toThrow();
  expect(data.get(TRAINING_KEY)).toBe('{"version":99}');
});
it('serializes writes and preserves prior data when a write fails', async () => {
  const data = new Map<string, string>();
  let fail = true;
  const repo = createTrainingRepository({
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (fail) throw new Error('Disk full');
      data.set(k, v);
    },
  });
  await expect(
    repo.mutate((d) => {
      d.actuals.one = [];
    }),
  ).rejects.toThrow('Disk full');
  expect(await repo.read()).toEqual(emptyTraining());
  fail = false;
  await Promise.all([
    repo.mutate((d) => {
      d.actuals.one = [];
    }),
    repo.mutate((d) => {
      d.actuals.two = [];
    }),
  ]);
  expect(Object.keys((await repo.read()).actuals)).toEqual(['one', 'two']);
});
