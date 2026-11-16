import type { ExerciseEntry } from '@nextround/core';
import { countLabel } from '@nextround/core';
import { Plus } from 'lucide-react';
import { expandedAreasFor, focusAreas, type PickerView } from '@/data/focus';
import { phaseLabels, phasesFor } from '@/data/phases';
import { FavoriteButton } from '../exercises/favorite-button';

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
  favoriteIds = [],
  favoritesReady = false,
  onFavorite,
}: {
  view?: PickerView;
  favoriteIds?: readonly string[];
  favoritesReady?: boolean;
  onFavorite?: (id: string) => void;
  counts?: Map<string, number>;
  note?: (entry: ExerciseEntry) => string;
  library: ExerciseEntry[];
  search: string;
  onSelect: (entry: ExerciseEntry) => void;
}) {
  const searchKey = normalizeSearch(search);
  const renderGroup = (group: string, entries: ExerciseEntry[], open?: boolean, className = '') => (
    <details
      className={`exercise-group ${className}`.trim()}
      key={`${view}-${group}-${searchKey}`}
      open={open}
    >
      <summary>
        {group} <span>{entries.length}</span>
      </summary>
      {entries.map((entry) => (
        <div className="exercise-choice" key={entry.id}>
          <button type="button" onClick={() => onSelect(entry)}>
            <span>
              <strong>{entry.name}</strong>
              <small>{entry.description}</small>
              {phasesFor(entry).length > 0 && (
                <small>
                  {phasesFor(entry)
                    .map((phase) => phaseLabels[phase])
                    .join(' · ')}
                </small>
              )}
              {note && <small>{note(entry)}</small>}
              <small>
                {counts
                  ? `Used in ${countLabel(counts.get(entry.id) ?? 0, 'saved workout')}`
                  : 'Usage unavailable'}
              </small>
            </span>
            <Plus size={20} />
          </button>
          {onFavorite && (
            <FavoriteButton
              entry={entry}
              selected={favoriteIds.includes(entry.id)}
              disabled={!favoritesReady}
              onToggle={onFavorite}
            />
          )}
        </div>
      ))}
    </details>
  );
  // Every starred movement that passes the current filters, open by default and never capped.
  const starred = new Set(favoritesReady ? favoriteIds : []);
  const favorites = [...new Map(library.map((entry) => [entry.id, entry])).values()]
    .filter((entry) => starred.has(entry.id) && matchesExercise(entry, search))
    .sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id, 'en'));
  const groupLabels = view === 'focus' ? [...Object.values(focusAreas), 'Unspecified'] : groups;
  return [
    favorites.length ? renderGroup('Favorites', favorites, true, 'favorites-group') : null,
    ...groupLabels.map((group) => {
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
      return entries.length ? renderGroup(group, entries, searchKey ? true : undefined) : null;
    }),
  ];
}
