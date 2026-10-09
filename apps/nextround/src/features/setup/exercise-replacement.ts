import { type ExerciseEntry, formatTarget, type WorkoutConfig } from '@nextround/core';
import { toWorkoutEntry } from '@/features/exercises/library';
import { generatedEntry } from './workout-generator';

export function replaceExercise(
  previous: ExerciseEntry,
  selected: ExerciseEntry,
  mode: NonNullable<WorkoutConfig['type']>,
  workSeconds?: number,
): { entry: ExerciseEntry; notice: string } {
  let snapshot = toWorkoutEntry(selected, mode);
  const target = previous.target;
  const compatible =
    target && (!snapshot.supportedUnits || snapshot.supportedUnits.includes(target.unit));
  let notice = `${previous.name} replaced with ${selected.name}.`;
  if (mode === 'ladder') {
    notice += ' Targets follow your ladder schedule.';
  } else if (compatible) {
    snapshot.target = { ...target };
    notice += ` Target kept: ${formatTarget(target)}.`;
  } else {
    if (target || mode === 'emom' || mode === 'amrap')
      snapshot = generatedEntry(selected, mode, workSeconds);
    // Personal defaults, as well as bundled suggestions, must fit an interval work phase.
    if (
      mode === 'intervals' &&
      snapshot.target?.unit === 'seconds' &&
      workSeconds !== undefined &&
      Number.isInteger(workSeconds) &&
      workSeconds > 0
    ) {
      snapshot.target = { ...snapshot.target, value: Math.min(snapshot.target.value, workSeconds) };
    }
    if (target && snapshot.target)
      notice += ` Target changed from ${formatTarget(target)} to ${formatTarget(snapshot.target)} because the previous unit is not supported. Review it before starting.`;
    else if (snapshot.target)
      notice += ` Suggested target: ${formatTarget(snapshot.target)}. Review it before starting.`;
  }
  return { entry: { ...snapshot, id: previous.id }, notice };
}
