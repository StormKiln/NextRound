import type { ExerciseEntry, ForTimeConfig, WorkoutConfig } from '@nextround/core';
import { expect, it } from 'vitest';
import { comparableAttempts, compareAttempts, comparisonKey } from './comparisons';
import type { WorkoutResult } from './repository';

const base: ForTimeConfig & { exercises: ExerciseEntry[] } = {
  type: 'forTime' as const,
  timeCapSeconds: 600,
  leadInSeconds: 10,
  warningSeconds: 3,
  exercises: [
    { id: 'a', catalogId: 'pushup', name: 'Push-up', target: { unit: 'reps' as const, value: 10 } },
  ],
};
const result = (
  id: string,
  at: number,
  elapsed = 60000,
  config: WorkoutConfig = base,
): WorkoutResult => ({
  id,
  completedAt: at,
  elapsedMs: elapsed,
  config,
  checkedExerciseIds: [],
  outcome: 'finished',
});
it('matches fresh snapshot IDs and presentation changes without mutating history', () => {
  const copy = structuredClone(base);
  copy.leadInSeconds = 0;
  copy.warningSeconds = 0;
  copy.exercises[0].id = 'new';
  const data = [
    result('old', 1),
    result('new', 2, 50000, copy),
    result('other', 3, 50000, { ...base, timeCapSeconds: 300 }),
  ];
  expect(comparableAttempts(data, data[1]).map((r) => r.id)).toEqual(['new', 'old']);
  expect(data.map((r) => r.id)).toEqual(['old', 'new', 'other']);
  expect(comparisonKey({ ...base, showChecklist: false })).toBe(comparisonKey(base));
});
it('separates changed targets, order, custom content and personal descriptions', () => {
  for (const change of [
    { target: { unit: 'reps' as const, value: 11 } },
    { catalogId: 'squat' },
    { description: 'Weighted variation' },
  ]) {
    const copy = structuredClone(base);
    Object.assign(copy.exercises[0], change);
    expect(comparisonKey(copy)).not.toBe(comparisonKey(base));
  }
  const custom = structuredClone(base);
  delete custom.exercises[0].catalogId;
  const changed = structuredClone(custom);
  changed.exercises[0].description = 'Different movement';
  expect(comparisonKey(custom)).not.toBe(comparisonKey(changed));
  const two = structuredClone(base);
  two.exercises.push({ id: 'b', catalogId: 'squat', name: 'Squat' });
  expect(comparisonKey(two)).not.toBe(
    comparisonKey({ ...two, exercises: [...two.exercises].reverse() }),
  );
});
it('normalizes legacy EMOM and separates all mode-specific timing and ladder rules', () => {
  const emom = { minutes: 5, leadInSeconds: 0, warningSeconds: 0, exercises: base.exercises };
  expect(comparisonKey(emom)).toBe(comparisonKey({ ...emom, type: 'emom' }));
  const variants: WorkoutConfig[] = [
    emom,
    { ...emom, minutes: 6 },
    { ...emom, type: 'countdown', durationSeconds: 300 },
    { ...emom, type: 'countdown', durationSeconds: 301 },
    { ...emom, type: 'amrap', durationSeconds: 300 },
    { ...emom, type: 'intervals', rounds: 5, workSeconds: 30, restSeconds: 10 },
    { ...emom, type: 'intervals', rounds: 5, workSeconds: 30, restSeconds: 0 },
    {
      ...emom,
      type: 'ladder',
      ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 3 },
    },
    {
      ...emom,
      type: 'ladder',
      ladder: { direction: 'descending', startReps: 3, increment: 1, rungs: 3 },
    },
  ];
  expect(new Set(variants.map(comparisonKey)).size).toBe(variants.length);
});
it('compares completed active time, ties and capped outcomes without ranking caps as faster', () => {
  expect(compareAttempts(result('a', 2, 50000), result('b', 1, 60000))).toContain(
    '10.0 seconds faster',
  );
  expect(compareAttempts(result('a', 2), result('b', 1))).toContain('Same active time');
  expect(
    compareAttempts({ ...result('a', 2), outcome: 'timeCapReached' }, result('b', 1)),
  ).toContain('not ranked');
  expect(
    compareAttempts(result('a', 2), result('b', 1, 60000, { ...base, timeCapSeconds: 300 })),
  ).toContain('Different workout');
});
it('compares AMRAP recorded progress and avoids treating fixed clocks as performance', () => {
  const config: WorkoutConfig = {
    type: 'amrap',
    durationSeconds: 300,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: base.exercises,
  };
  const a = {
    ...result('a', 2, 300000, config),
    outcome: undefined,
    amrapProgress: { completedMovements: 2, partialValue: 3 },
  };
  expect(
    compareAttempts(a, {
      ...a,
      id: 'b',
      amrapProgress: { completedMovements: 2, partialValue: 1 },
    }),
  ).toContain('Further recorded progress');
  expect(compareAttempts(a, { ...a, id: 'b' })).toContain('Same recorded progress');
  for (const type of ['emom', 'countdown', 'intervals'] as const) {
    const c = { ...config, type, minutes: 5, rounds: 5, workSeconds: 30, restSeconds: 0 };
    expect(compareAttempts({ ...a, config: c }, { ...a, config: c })).toContain('Scheduled time');
  }
});

it('does not rank unspecified For Time work and preserves sub-tenth timing differences', () => {
  const empty = { ...base, exercises: [] };
  expect(compareAttempts(result('a', 2, 50000, empty), result('b', 1, 60000, empty))).toContain(
    'No movements',
  );
  expect(compareAttempts(result('a', 2, 59999), result('b', 1, 60000))).toContain(
    '0.001 seconds faster',
  );
});

it('keeps annotation changes out of comparison matching and progress', () => {
  const first = result('first', 1, 60000);
  const later = result('later', 2, 50000);
  const annotated = { ...later, note: 'Different observations' };
  expect(compareAttempts(annotated, first)).toBe(compareAttempts(later, first));
  expect(comparableAttempts([first, annotated], annotated).map((r) => r.id)).toEqual([
    'later',
    'first',
  ]);
});
