import type { ExerciseEntry, WorkoutConfig } from '@nextround/core';
import {
  type CatalogMetadata,
  type EquipmentId,
  eligibleExercise,
  metadataFor,
} from '@/data/equipment';
import { type FocusArea, matchesFocus } from '@/data/focus';
import { normalizeSearch } from './exercise-suggestions';

export type FillFilters = {
  equipment: EquipmentId[] | null;
  areas: FocusArea[];
  category: CatalogMetadata['category'] | '';
  intensity: NonNullable<CatalogMetadata['intensity']> | '';
  favoritesOnly: boolean;
  favoriteIds: readonly string[];
};
export function fillCandidates(
  library: ExerciseEntry[],
  retained: ExerciseEntry[],
  mode: NonNullable<WorkoutConfig['type']>,
  filters: FillFilters,
): ExerciseEntry[] {
  const ids = new Set(retained.map((e) => e.catalogId ?? e.id));
  const names = new Set(retained.map((e) => normalizeSearch(e.name)));
  return library.filter((entry) => {
    const metadata = metadataFor(entry);
    const name = normalizeSearch(entry.name);
    const id = entry.catalogId ?? entry.id;
    if (
      ids.has(id) ||
      names.has(name) ||
      !eligibleExercise(entry, filters.equipment) ||
      !matchesFocus(entry, filters.areas) ||
      (filters.category && metadata?.category !== filters.category) ||
      (filters.intensity && metadata?.intensity !== filters.intensity) ||
      (filters.favoritesOnly && !filters.favoriteIds.includes(entry.id)) ||
      (mode === 'ladder' && entry.supportedUnits && !entry.supportedUnits.includes('reps'))
    )
      return false;
    ids.add(id);
    names.add(name);
    return true;
  });
}

/** Samples only additions; retained entries never pass through target conversion. */
export function sampleFill(
  candidates: ExerciseEntry[],
  retainedCount: number,
  total: number,
  random: () => number = Math.random,
): ExerciseEntry[] {
  if (!Number.isInteger(total) || total <= retainedCount || total > 100)
    throw new Error(`Choose a whole-number total greater than ${retainedCount} and at most 100.`);
  const needed = total - retainedCount;
  if (candidates.length < needed)
    throw new Error(
      `Only ${candidates.length} eligible additions are available; you need ${needed}. Lower the total or change your filters.`,
    );
  const pool = [...candidates];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, needed);
}
