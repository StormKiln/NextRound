import type { WorkoutConfig } from '@nextround/core';
import type { WorkoutResult } from './repository';
export type HistoryMode = NonNullable<WorkoutConfig['type']> | 'all';
const normalized = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
export function filterHistory(results: WorkoutResult[], mode: HistoryMode, query: string) {
  const needle = normalized(query);
  return results
    .filter(
      (result) =>
        (mode === 'all' || (result.config.type ?? 'emom') === mode) &&
        (!needle ||
          result.config.exercises?.some((exercise) =>
            normalized(`${exercise.name} ${exercise.description ?? ''}`).includes(needle),
          )),
    )
    .sort((a, b) => b.completedAt - a.completedAt);
}
