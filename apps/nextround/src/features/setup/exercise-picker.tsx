import type { ExerciseEntry } from '@nextround/core';
import { countLabel } from '@nextround/core';
import { Plus } from 'lucide-react';
import { expandedAreasFor, focusAreas, type PickerView } from '@/data/focus';

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
  view = 'type',
}: {
  view?: PickerView;
  counts?: Map<string, number>;
  note?: (entry: ExerciseEntry) => string;
  library: ExerciseEntry[];
  search: string;
  onSelect: (entry: ExerciseEntry) => void;
}) {
  const groupLabels = view === 'focus' ? [...Object.values(focusAreas), 'Unspecified'] : groups;
  return groupLabels.map((group) => {
    const entries = library.filter((entry) => {
      const areas = expandedAreasFor(entry);
      const inGroup =
        view === 'type'
          ? groupFor(entry) === group
          : areas.length
            ? areas.some((area) => focusAreas[area] === group)
            : group === 'Unspecified';
      return inGroup && matchesExercise(entry, search);
    });
    if (!entries.length) return null;
    return (
      <details
        className="exercise-group"
        key={`${view}-${group}-${normalizeSearch(search)}`}
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
                  ? `Used in ${countLabel(counts.get(entry.id) ?? 0, 'saved workout')}`
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
