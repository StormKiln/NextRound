import { normalizeSearch } from '@/lib/search';
import type { TemplateDocument, WorkoutTemplate } from './repository';
import { totalScheduledSeconds } from './time-budget';
export type TemplateFilters = {
  search: string;
  workoutType: string;
  favouritesOnly: boolean;
  collection: string;
  budgetMinutes?: number | null;
};
export function matchesTemplate(
  t: WorkoutTemplate,
  filters: TemplateFilters,
  document: TemplateDocument,
): boolean {
  const needle = normalizeSearch(filters.search);
  const text = [
    t.name,
    ...(t.config.exercises ?? []).flatMap((e) => [e.name, e.description ?? '']),
  ];
  return (
    (filters.budgetMinutes == null ||
      totalScheduledSeconds(t.config) <= filters.budgetMinutes * 60) &&
    text.some((value) => normalizeSearch(value).includes(needle)) &&
    (!filters.favouritesOnly || t.favourite === true) &&
    (filters.workoutType === 'all' || (t.config.type ?? 'emom') === filters.workoutType) &&
    (filters.collection === 'all' ||
      (filters.collection === 'unfiled'
        ? !document.collections.some((c) => c.workoutIds.includes(t.id))
        : document.collections.some(
            (c) => c.id === filters.collection && c.workoutIds.includes(t.id),
          )))
  );
}
