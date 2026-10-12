import { expect, it } from 'vitest';
import { csvCell, historyCsv } from './csv';
import type { WorkoutResult } from './repository';

const base: WorkoutResult = {
  id: 'one',
  completedAt: Date.parse('2026-10-12T12:00:00Z'),
  elapsedMs: 60000,
  checkedExerciseIds: [],
  note: 'Private note',
  config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 0 },
};
it('exports stable UTF-8 rows in the supplied order with exact timestamps and notes excluded by default', () => {
  const csv = historyCsv([base, { ...base, id: 'two' }], false);
  expect(csv.startsWith('\uFEFFsession_id,completed_at_utc')).toBe(true);
  expect(csv).toContain('one,2026-10-12T12:00:00.000Z,countdown,completed,60000,1 min');
  expect(csv.indexOf('one,')).toBeLessThan(csv.indexOf('two,'));
  expect(csv).not.toContain('Private note');
  expect(csv.split('\r\n')[0]).not.toContain('note');
  expect(historyCsv([base], true)).toContain(',workout_note\r\n');
  expect(historyCsv([base], true)).toContain('Private note');
});
it('quotes CSV text and neutralizes formulas even behind Unicode whitespace or controls', () => {
  expect(csvCell('hello,"world"\nnext')).toBe('"hello,""world""\nnext"');
  for (const s of ['=1+1', ' +SUM(A1:A2)', '\t-2', '\r\n@SUM(1)', '\u200b=2', '\uFEFF=3'])
    expect(csvCell(s)).toContain("'");
  expect(csvCell('Crème brûlée')).toBe('Crème brûlée');
  expect(csvCell('ordinary text')).toBe('ordinary text');
  expect(csvCell('a\0b')).not.toContain('\0');
});
it('rejects invalid results and preserves zero and very large exact elapsed values', () => {
  const r: WorkoutResult = {
    ...base,
    outcome: 'finished',
    config: { type: 'forTime', leadInSeconds: 0, warningSeconds: 0 },
    elapsedMs: 0,
  };
  expect(historyCsv([r], false)).toContain('forTime,finished,0,0 sec');
  expect(historyCsv([{ ...r, elapsedMs: Number.MAX_SAFE_INTEGER }], false)).toContain(
    String(Number.MAX_SAFE_INTEGER),
  );
  expect(() => historyCsv([{ ...base, elapsedMs: -1 }], false)).toThrow();
});
it('exports all six modes with named recorded progress and blank inapplicable fields', () => {
  const timing = { leadInSeconds: 0, warningSeconds: 0 };
  const exercises = [{ id: 'e', name: 'Row', target: { unit: 'metres' as const, value: 100 } }];
  const rows: WorkoutResult[] = [
    base,
    { ...base, config: { ...timing, minutes: 1, exercises } },
    {
      ...base,
      elapsedMs: 25_000,
      config: {
        ...timing,
        type: 'intervals',
        rounds: 2,
        workSeconds: 10,
        restSeconds: 5,
        exercises,
      },
    },
    {
      ...base,
      config: { ...timing, type: 'amrap', durationSeconds: 60, exercises },
      amrapProgress: { completedMovements: 3, partialValue: 10 },
    },
    {
      ...base,
      config: { ...timing, type: 'forTime', timeCapSeconds: 60 },
      outcome: 'timeCapReached',
    },
    {
      ...base,
      config: {
        ...timing,
        type: 'ladder',
        timeCapSeconds: 60,
        exercises: [{ id: 'e', name: 'Squat' }],
        ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 2 },
      },
      outcome: 'timeCapReached',
      ladderCompletedMovements: 1,
    },
  ];
  const lines = historyCsv(rows, false).slice(1).trimEnd().split('\r\n');
  const first = lines.shift();
  if (!first) throw new Error('Missing CSV header');
  const headers = first.split(',');
  const cells = lines.map((line) =>
    Object.fromEntries(line.split(',').map((value, i) => [headers[i], value])),
  );
  expect(cells.map((c) => c.workout_type)).toEqual([
    'countdown',
    'emom',
    'intervals',
    'amrap',
    'forTime',
    'ladder',
  ]);
  expect(cells[0].amrap_completed_movements).toBe('');
  expect(cells[3]).toMatchObject({
    amrap_completed_movements: '3',
    amrap_partial_value: '10',
    amrap_partial_unit: 'metres',
    amrap_partial_movement_number: '1',
  });
  expect(cells[5]).toMatchObject({ outcome: 'timeCapReached', ladder_completed_movements: '1' });
  expect(rows[0].note).toBe('Private note');
});
