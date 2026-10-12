import { copyResult, type WorkoutResult } from './repository';
import { formatWorkoutTime } from './summary';

// Quoting alone does not stop spreadsheet formulas. Prefix dangerous text after
// accounting for leading Unicode whitespace/control/format characters.
export function csvCell(value: string | number): string {
  let text = String(value).replaceAll('\0', '\uFFFD');
  if (typeof value === 'string' && /^[\s\p{Cc}\p{Cf}]*[=+@-]/u.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
export function historyCsv(results: WorkoutResult[], includeNotes: boolean): string {
  const headers = [
    'session_id',
    'completed_at_utc',
    'workout_type',
    'outcome',
    'elapsed_ms',
    'workout_time',
    'checked_movements',
    'amrap_completed_movements',
    'amrap_partial_value',
    'amrap_partial_unit',
    'amrap_partial_movement_number',
    'ladder_completed_movements',
  ];
  if (includeNotes) headers.push('workout_note');
  const rows = results.map((input) => {
    const r = copyResult(input);
    const c = r.config;
    const partial =
      c.type === 'amrap' && r.amrapProgress
        ? r.amrapProgress.completedMovements % c.exercises.length
        : undefined;
    const checklist =
      (c.type === 'countdown' || c.type === 'forTime') &&
      c.showChecklist !== false &&
      !!c.exercises?.length;
    const cells: (string | number)[] = [
      r.id,
      new Date(r.completedAt).toISOString(),
      c.type ?? 'emom',
      r.outcome ?? 'completed',
      r.elapsedMs,
      formatWorkoutTime(BigInt(r.elapsedMs)),
      checklist ? r.checkedExerciseIds.length : '',
      r.amrapProgress?.completedMovements ?? '',
      r.amrapProgress?.partialValue ?? '',
      c.type === 'amrap' && partial !== undefined ? (c.exercises[partial].target?.unit ?? '') : '',
      partial === undefined ? '' : partial + 1,
      r.ladderCompletedMovements ?? '',
    ];
    if (includeNotes) cells.push(r.note ?? '');
    return cells.map(csvCell).join(',');
  });
  return `\uFEFF${[headers.join(','), ...rows].join('\r\n')}\r\n`;
}
