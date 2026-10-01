import { expect, test } from 'vitest';
import { cueAt, type IntervalsConfig, snapshotAt, validateConfig } from './index';

const config = {
  type: 'intervals',
  workSeconds: 4,
  restSeconds: 2,
  rounds: 2,
  leadInSeconds: 2,
  warningSeconds: 1,
  exercises: [
    { id: 'a', name: 'Squat' },
    { id: 'b', name: 'Push-up' },
  ],
} as IntervalsConfig;
test('intervals exclude final rest and rotate on work starts', () => {
  expect(validateConfig(config)).toEqual({});
  expect(snapshotAt(config, 0)).toMatchObject({ phase: 'leadIn', remainingMs: 10000 });
  expect(snapshotAt(config, 2000)).toMatchObject({
    phase: 'running',
    intervalPhase: 'work',
    roundIndex: 0,
    roundRemainingMs: 4000,
  });
  expect(snapshotAt(config, 6000)).toMatchObject({
    intervalPhase: 'rest',
    exerciseIndex: 0,
    roundRemainingMs: 2000,
    remainingMs: 6000,
  });
  expect(snapshotAt(config, 8000)).toMatchObject({
    intervalPhase: 'work',
    exerciseIndex: 1,
    roundIndex: 1,
    roundRemainingMs: 4000,
  });
  expect(snapshotAt(config, 12000)).toMatchObject({
    phase: 'completed',
    remainingMs: 0,
    elapsedMs: 10000,
    roundIndex: 1,
  });
  expect(Array.from({ length: 14 }, (_, s) => cueAt(config, s * 1000))).toEqual([
    null,
    'tock',
    'beep',
    null,
    null,
    'tock',
    'rest',
    'tock',
    'beep',
    null,
    null,
    'tock',
    'complete',
    null,
  ]);
});
test('zero rest and single round have no phantom rest', () => {
  const zero = { ...config, restSeconds: 0, leadInSeconds: 0 };
  expect(snapshotAt(zero, 4000)).toMatchObject({ intervalPhase: 'work', roundIndex: 1 });
  expect(cueAt(zero, 4000)).toBe('beep');
  expect(cueAt(zero, 8000)).toBe('complete');
  const one = { ...config, rounds: 1 };
  expect(cueAt(one, 6000)).toBe('complete');
});
test('interval input bounds reject unsafe or missing fields', () => {
  for (const patch of [
    { workSeconds: 0 },
    { restSeconds: -1 },
    { rounds: 0 },
    { rounds: 1.5 },
    { workSeconds: 86401 },
    { workSeconds: 86400, rounds: 2 },
    { workSeconds: NaN },
    { restSeconds: undefined },
    { rounds: 1441 },
  ])
    expect(
      Object.keys(validateConfig({ ...config, ...patch } as IntervalsConfig)).length,
    ).toBeGreaterThan(0);
  expect(validateConfig({ ...config, workSeconds: 86400, rounds: 1, restSeconds: 86400 })).toEqual(
    {},
  );
});
