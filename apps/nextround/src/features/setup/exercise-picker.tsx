import type { ExerciseEntry } from '@nextround/core';
import { Plus } from 'lucide-react';

import { matchesExercise, normalizeSearch } from './exercise-suggestions';

export { matchesExercise } from './exercise-suggestions';

import { categories as groups, metadataFor } from '@/data/equipment';

function groupFor(entry: ExerciseEntry) {
  return metadataFor(entry)?.category ?? 'Uncategorized';
}
export function ExerciseGroups({
  library,
  search,
  onSelect,
  counts,
  note,
}: {
  counts?: Map<string, number>;
  note?: (entry: ExerciseEntry) => string;
  library: ExerciseEntry[];
  search: string;
  onSelect: (entry: ExerciseEntry) => void;
}) {
  return groups.map((group) => {
    const entries = library.filter(
      (entry) => groupFor(entry) === group && matchesExercise(entry, search),
    );
    if (!entries.length) return null;
    return (
      <details
        className="exercise-group"
        key={`${group}-${normalizeSearch(search) ? 'search' : 'browse'}`}
        open={normalizeSearch(search) ? true : undefined}
      >
        <summary>
          {group} <span>{entries.length}</span>
        </summary>
        {entries.map((entry) => (
          <button type="button" key={entry.id} onClick={() => onSelect(entry)}>
            <span>
              <strong>{entry.name}</strong>
              <small>{entry.description}</small>
              {note && <small>{note(entry)}</small>}
              <small>
                {counts
                  ? `Used in ${counts.get(entry.id) ?? 0} saved workouts`
                  : 'Usage unavailable'}
              </small>
            </span>
            <Plus size={20} />
          </button>
        ))}
      </details>
    );
  });
}
