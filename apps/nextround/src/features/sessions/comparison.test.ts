import { expect, it } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { compareSessionRows, comparisonEligibility } from './comparison';

it('aligns snapshot positions and occurrences despite regenerated IDs', () => {
  const a = result220(),
    b = result220('b', 1);
  expect(comparisonEligibility(a, b)).toBeNull();
  const rows = compareSessionRows(a, b);
  expect(rows).toHaveLength(1);
  expect(rows[0].left?.reps).toBe(12);
  expect(rows[0].right?.reps).toBe(10);
});
it('refuses alignment for reordered/changed prescriptions or partial work', () => {
  const a = result220(),
    b = result220('b', 1);
  b.session.blocks[0].config.exercises![0].target!.value = 9;
  expect(comparisonEligibility(a, b)).toContain('prescriptions');
  expect(compareSessionRows(a, b)).toEqual([]);
  b.session = structuredClone(a.session);
  b.blocks[0].blockId = a.blocks[0].blockId;
  b.blocks[0].status = 'partial';
  expect(comparisonEligibility(a, b)).toContain('Partial');
  expect(compareSessionRows(a, b)).toEqual([]);
});
it('keeps duplicate names in different slots and missing values distinct from zero', () => {
  const a = result220(),
    b = result220('b', 1);
  for (const r of [a, b]) {
    r.session.blocks[0].config.exercises!.push({
      ...r.session.blocks[0].config.exercises![0],
      id: 'second-' + r.id,
    });
    r.blocks[0].actuals.push({ exerciseId: 'second-' + r.id, occurrence: 0, reps: 0 });
  }
  b.blocks[0].actuals.pop();
  const rows = compareSessionRows(a, b);
  expect(rows).toHaveLength(2);
  expect(rows[1].left?.reps).toBe(0);
  expect(rows[1].right).toBeUndefined();
});
it('does not join block totals with round/rung entries', () => {
  const a = result220(),
    b = result220('b', 1);
  for (const r of [a, b])
    r.session.blocks[0].config = {
      type: 'emom',
      minutes: 2,
      leadInSeconds: 0,
      warningSeconds: 3,
      exercises: r.session.blocks[0].config.exercises!,
    };
  b.blocks[0].actuals[0].occurrence = 1;
  const rows = compareSessionRows(a, b);
  expect(rows.map((r) => r.occurrence)).toEqual([0, 1]);
  expect(rows[0].right).toBeUndefined();
  expect(rows[1].left).toBeUndefined();
});

it('compares all six workout modes and rejects changed exercise identity and order', () => {
  for (const type of ['emom', 'countdown', 'intervals', 'amrap', 'forTime', 'ladder'] as const) {
    const a = result220(),
      b = result220('b', 2);
    for (const r of [a, b]) {
      const base = {
        exercises: r.session.blocks[0].config.exercises!,
        leadInSeconds: 0,
        warningSeconds: 3,
      };
      r.session.blocks[0].config =
        type === 'emom'
          ? { ...base, type, minutes: 2 }
          : type === 'intervals'
            ? { ...base, type, workSeconds: 30, restSeconds: 10, rounds: 2 }
            : type === 'ladder'
              ? {
                  ...base,
                  type,
                  ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 3 },
                }
              : type === 'forTime'
                ? { ...base, type, timeCapSeconds: 120 }
                : { ...base, type, durationSeconds: 120 };
    }
    expect(comparisonEligibility(a, b)).toBeNull();
    expect(compareSessionRows(a, b)).toHaveLength(1);
    b.session.blocks[0].config.exercises![0].catalogId = 'different-movement';
    expect(compareSessionRows(a, b)).toEqual([]);
  }
  const a = result220(),
    b = result220('b', 2);
  for (const r of [a, b])
    r.session.blocks[0].config.exercises!.push({
      ...r.session.blocks[0].config.exercises![0],
      id: 'second',
      catalogId: 'squat',
      name: 'Squat',
    });
  b.session.blocks[0].config.exercises!.reverse();
  expect(compareSessionRows(a, b)).toEqual([]);
  expect(comparisonEligibility(a, a)).toContain('different attempts');
});
