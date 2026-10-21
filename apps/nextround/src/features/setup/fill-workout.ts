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

/** Keep pinned snapshots in place; sample only the remaining positions. */
export function reshuffleFill(
  candidates: ExerciseEntry[],
  preview: ExerciseEntry[],
  pinnedIds: readonly string[],
  random: () => number = Math.random,
): ExerciseEntry[] {
  if (pinnedIds.some((id) => !preview.some((entry) => entry.id === id)))
    throw new Error('Pinned additions changed. Create a new preview.');
  const pinned = preview.filter((entry) => pinnedIds.includes(entry.id));
  const ids = new Set(pinned.map((entry) => entry.catalogId ?? entry.id));
  const names = new Set(pinned.map((entry) => normalizeSearch(entry.name)));
  const pool = candidates.filter((entry) => {
    const id = entry.catalogId ?? entry.id;
    const name = normalizeSearch(entry.name);
    if (ids.has(id) || names.has(name)) return false;
    ids.add(id);
    names.add(name);
    return true;
  });
  if (pinned.length === preview.length) return structuredClone(preview);
  const additions = sampleFill(pool, pinned.length, preview.length, random);
  let next = 0;
  return preview.map((entry) =>
    pinnedIds.includes(entry.id) ? structuredClone(entry) : additions[next++],
  );
}

/** Select a different movement for one unpinned slot without touching any snapshots. */
export function swapFill(
  candidates: ExerciseEntry[],
  preview: ExerciseEntry[],
  index: number,
  pinnedIds: readonly string[],
  random: () => number = Math.random,
): ExerciseEntry {
  const current = preview[index];
  if (!Number.isInteger(index) || !current)
    throw new Error('This suggestion changed. Preview additions again.');
  if (pinnedIds.includes(current.id)) throw new Error('Unpin this suggestion before swapping it.');
  const ids = new Set(preview.map((entry) => entry.catalogId ?? entry.id));
  const names = new Set(preview.map((entry) => normalizeSearch(entry.name)));
  const pool = candidates.filter(
    (entry) => !ids.has(entry.catalogId ?? entry.id) && !names.has(normalizeSearch(entry.name)),
  );
  if (!pool.length)
    throw new Error(
      'No different eligible movement is available. Your preview is unchanged. Change filters or keep this suggestion.',
    );
  return structuredClone(pool[Math.floor(random() * pool.length)]);
}
