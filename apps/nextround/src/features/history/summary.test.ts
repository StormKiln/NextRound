import { expect, it } from 'vitest';
import { copyResult, type WorkoutResult } from './repository';
import { formatWorkoutTime, summarizeHistory } from './summary';

const movement = { id: 'e', name: 'Squat', target: { unit: 'reps' as const, value: 5 } };
const base = { id: 'one', completedAt: new Date(2026, 2, 8, 12).getTime(), checkedExerciseIds: [] };
const timing = { leadInSeconds: 10, warningSeconds: 3 };
const results: WorkoutResult[] = [
  { ...base, elapsedMs: 60000, config: { ...timing, minutes: 1, exercises: [movement] } },
  { ...base, elapsedMs: 30000, config: { ...timing, type: 'countdown', durationSeconds: 30 } },
  {
    ...base,
    elapsedMs: 25000,
    config: {
      ...timing,
      type: 'intervals',
      workSeconds: 10,
      restSeconds: 5,
      rounds: 2,
      exercises: [movement],
    },
  },
  {
    ...base,
    elapsedMs: 60000,
    config: { ...timing, type: 'amrap', durationSeconds: 60, exercises: [movement] },
    amrapProgress: { completedMovements: 2, partialValue: 0 },
  },
  {
    ...base,
    elapsedMs: 1,
    outcome: 'finished',
    config: { ...timing, type: 'forTime', exercises: [movement] },
  },
  {
    ...base,
    elapsedMs: 1000,
    outcome: 'timeCapReached',
    ladderCompletedMovements: 0,
    config: {
      ...timing,
      type: 'ladder',
      timeCapSeconds: 1,
      exercises: [{ id: 'e', name: 'Squat' }],
      ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 2 },
    },
  },
].map((r, i) => copyResult({ ...r, id: String(i) }));
it('summarizes six modes including configured rest and capped results without using targets or lead-in', () => {
  expect(summarizeHistory(results)).toEqual({ sessions: 6, elapsedMs: 176001n, activeDays: 1 });
  expect(summarizeHistory([])).toEqual({ sessions: 0, elapsedMs: 0n, activeDays: 0 });
});
it('counts local completion days across DST rather than 24-hour buckets', () => {
  const old = process.env.TZ;
  process.env.TZ = 'America/Toronto';
  try {
    const times = [
      '2026-03-08T04:59:59Z',
      '2026-03-08T05:00:00Z',
      '2026-03-09T03:59:59Z',
      '2026-03-09T04:00:00Z',
    ];
    expect(
      summarizeHistory(times.map((time) => ({ ...results[0], completedAt: Date.parse(time) })))
        .activeDays,
    ).toBe(3);
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
it('rounds total positive milliseconds up once and never wraps at 24 hours', () => {
  expect(formatWorkoutTime(0n)).toBe('0 sec');
  expect(formatWorkoutTime(1n)).toBe('1 sec');
  expect(formatWorkoutTime(1001n)).toBe('2 sec');
  expect(formatWorkoutTime(90061001n)).toBe('1 day 1 hr 1 min 2 sec');
  expect(formatWorkoutTime(172800000n)).toBe('2 days');
  const large = summarizeHistory([
    { ...results[4], elapsedMs: Number.MAX_SAFE_INTEGER },
    { ...results[4], elapsedMs: Number.MAX_SAFE_INTEGER },
  ]);
  expect(large.elapsedMs).toBe(BigInt(Number.MAX_SAFE_INTEGER) * 2n);
  expect(formatWorkoutTime(large.elapsedMs)).not.toMatch(/Infinity|NaN/);
});
