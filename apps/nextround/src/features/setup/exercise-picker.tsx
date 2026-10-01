import type { ExerciseEntry } from '@nextround/core';
import { Plus } from 'lucide-react';

export const normalizeSearch = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
export const matchesExercise = (entry: ExerciseEntry, search: string) =>
  normalizeSearch(entry.name).includes(normalizeSearch(search));
const groups = [
  'Kettlebell',
  'Push-ups',
  'Planks',
  'Squats',
  'Cardio',
  'Other bodyweight',
] as const;
function groupFor(entry: ExerciseEntry) {
  const name = entry.name.toLowerCase();
  if (name.includes('kettlebell')) return 'Kettlebell';
  if (name.includes('push-up')) return 'Push-ups';
  if (name.includes('plank')) return 'Planks';
  if (name.includes('squat')) return 'Squats';
  if (['Burpee', 'Jump rope', 'Rowing machine'].includes(entry.name)) return 'Cardio';
  return 'Other bodyweight';
}
export function ExerciseGroups({
  library,
  search,
  onSelect,
}: {
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
            </span>
            <Plus size={20} />
          </button>
        ))}
      </details>
    );
  });
}
