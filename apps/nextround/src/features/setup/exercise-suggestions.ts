import type { ExerciseEntry } from '@nextround/core';
import { metadataFor } from '@/data/equipment';
import type { HistoryDocument } from '../history/repository';
export type SuggestionPreset = 'favorites' | 'new' | 'mix';
export const normalizeSearch = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
const searchAlias = (value: string) =>
  normalizeSearch(value)
    .replace(/\bpush[ -]?ups?\b/g, 'pushup')
    .replace(/\bkettle[ -]?bells?\b/g, 'kettlebell');
export const matchesExercise = (entry: ExerciseEntry, search: string) =>
  normalizeSearch(entry.name).includes(normalizeSearch(search)) ||
  searchAlias(entry.name).includes(searchAlias(search)) ||
  (metadataFor(entry)?.aliases.some((alias) => searchAlias(alias).includes(searchAlias(search))) ??
    false);
export function deriveUsage(document: HistoryDocument) {
  const counts = new Map<string, number>();
  let unattributedEntries = 0;
  for (const result of document.results) {
    const ids = new Set<string>();
    for (const entry of result.config.exercises ?? []) {
      if (entry.catalogId) ids.add(entry.catalogId);
      else unattributedEntries++;
    }
    for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return { counts, unattributedEntries };
}
export function suggestExercises(
  library: ExerciseEntry[],
  counts: Map<string, number>,
  preset: SuggestionPreset,
): ExerciseEntry[] {
  const unique = [...new Map(library.map((entry) => [entry.id, entry])).values()];
  const alphabetical = (a: ExerciseEntry, b: ExerciseEntry) =>
    a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en');
  const count = (entry: ExerciseEntry) => counts.get(entry.id) ?? 0;
  const rare = [...unique].sort((a, b) => count(a) - count(b) || alphabetical(a, b));
  const frequent = [...unique].sort((a, b) => count(b) - count(a) || alphabetical(a, b));
  if (preset === 'favorites') return frequent.slice(0, 3);
  if (preset === 'new' || !unique.some((entry) => count(entry) > 0)) return rare.slice(0, 3);
  const rareIds = new Set(rare.slice(0, Math.ceil(rare.length / 2)).map((e) => e.id));
  const high = frequent.filter((e) => !rareIds.has(e.id));
  const low = rare.filter((e) => rareIds.has(e.id));
  const mixed: ExerciseEntry[] = [];
  while (mixed.length < 3 && (high.length || low.length)) {
    const pool = mixed.length % 2 === 0 ? high : low;
    const fallback = pool === high ? low : high;
    const entry = pool.shift() ?? fallback.shift();
    if (entry) mixed.push(entry);
  }
  return mixed;
}
