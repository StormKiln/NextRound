import type { WorkoutConfig } from '@nextround/core';
import { matchesExercise } from '../setup/exercise-suggestions';
import type { DateBounds } from './date-filters';
import type { WorkoutResult } from './repository';
export type HistoryMode = NonNullable<WorkoutConfig['type']> | 'all';

import { normalizeSearch as normalized } from '@/lib/search';
export function filterHistory(
  results: WorkoutResult[],
  mode: HistoryMode,
  query: string,
  dates: DateBounds | null = null,
) {
  const needle = normalized(query);
  return results
    .filter(
      (result) =>
        (!dates || (result.completedAt >= dates.start && result.completedAt < dates.end)) &&
        (mode === 'all' || (result.config.type ?? 'emom') === mode) &&
        (!needle ||
          normalized(result.note ?? '').includes(needle) ||
          result.config.exercises?.some(
            (exercise) =>
              matchesExercise({ ...exercise, id: exercise.catalogId ?? exercise.id }, query) ||
              normalized(`${exercise.name} ${exercise.description ?? ''}`).includes(needle),
          )),
    )
    .sort((a, b) => b.completedAt - a.completedAt);
}
