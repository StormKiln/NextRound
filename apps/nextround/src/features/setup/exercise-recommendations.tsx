import type { ExerciseEntry } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import type { PickerView } from '@/data/focus';
import { readHistory } from '../history/repository';
import { ExerciseGroups } from './exercise-picker';
import {
  deriveUsage,
  matchesExercise,
  normalizeSearch,
  type SuggestionPreset,
  suggestExercises,
} from './exercise-suggestions';

const presets: { id: SuggestionPreset; label: string; description: string }[] = [
  {
    id: 'favorites',
    label: 'My favorites',
    description: 'Your most-used exercises, based on saved workouts.',
  },
  {
    id: 'new',
    label: 'Try something new',
    description: 'Your least-used exercises, including movements you have never saved.',
  },
  { id: 'mix', label: 'Mix it up', description: 'A mix of more-used and less-used exercises.' },
];
export function ExerciseRecommendations({
  library,
  search,
  selected,
  onSelect,
  note,
  preset,
  onPreset,
  view,
  emptyState,
}: {
  emptyState?: ReactNode;
  preset: SuggestionPreset | null;
  onPreset: (preset: SuggestionPreset) => void;
  view: PickerView;
  library: ExerciseEntry[];
  note?: (entry: ExerciseEntry) => string;
  search: string;
  selected: ExerciseEntry[];
  onSelect: (entry: ExerciseEntry) => void;
}) {
  const query = useQuery({ queryKey: ['workout-history'], queryFn: readHistory, retry: false });
  const usage = query.data ? deriveUsage(query.data) : undefined;
  // Never present stale successful data as current statistics after a failed refresh.
  const counts = !query.isError && !query.isPending ? usage?.counts : undefined;
  const selectedIds = new Set(selected.map((entry) => entry.catalogId).filter(Boolean));
  const candidates = library.filter(
    (entry) => !selectedIds.has(entry.id) && matchesExercise(entry, search),
  );
  const suggestions = preset && counts ? suggestExercises(candidates, counts, preset) : [];
  const hasUsage = !!counts && [...counts.values()].some((count) => count > 0);
  const hasEligibleUsage = !!counts && candidates.some((entry) => (counts.get(entry.id) ?? 0) > 0);
  const searching = !!normalizeSearch(search);
  const groups = (
    <ExerciseGroups
      view={view}
      library={library}
      search={search}
      counts={counts}
      onSelect={onSelect}
      note={note}
    />
  );
  const noMatches =
    !library.some((entry) => matchesExercise(entry, search)) &&
    (emptyState ?? <p>No matching exercises. Try another search or add a Custom exercise.</p>);
  return (
    <>
      {searching && (
        <>
          {groups}
          {noMatches}
        </>
      )}
      {query.isPending && <p role="status">Loading exercise usage…</p>}
      {query.isError && (
        <div role="alert">
          <p>Exercise usage could not be loaded. You can still choose exercises manually.</p>
          <Button onClick={() => void query.refetch()}>Retry exercise usage</Button>
        </div>
      )}
      {counts && (
        <section className="exercise-suggestions" aria-label="Exercise suggestions">
          <p>Suggestions from your saved workouts</p>
          <div className="suggestion-presets">
            {presets.map((item) => (
              <Button
                key={item.id}
                variant="secondary"
                aria-pressed={preset === item.id}
                onClick={() => onPreset(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          {!hasUsage && (
            <p>
              No attributed exercise history yet. Suggestions are alphabetical until you save
              catalog exercises.
            </p>
          )}
          {hasUsage && candidates.length > 0 && !hasEligibleUsage && (
            <p>
              None of the eligible exercises have saved usage. Suggestions are alphabetical within
              the current filters.
            </p>
          )}
          {preset && (
            <>
              <p>
                {presets.find((item) => item.id === preset)?.description} Review a suggestion to add
                it; your existing order stays unchanged.
              </p>
              <ul className="suggestion-list">
                {suggestions.map((entry) => (
                  <li key={entry.id}>
                    <Button
                      variant="secondary"
                      onClick={() => onSelect(entry)}
                      aria-label={`Add suggested ${entry.name}`}
                    >
                      <span>
                        <strong>{entry.name}</strong>
                        <small>Used in {counts.get(entry.id) ?? 0} saved workouts</small>
                        {note && <small>{note(entry)}</small>}
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
              {suggestions.length < 3 && (
                <p>
                  {suggestions.length
                    ? 'Fewer than three eligible exercises match.'
                    : 'No eligible suggestions.'}{' '}
                  Search, focus areas, equipment settings and exercises already in your workout
                  limit these choices. You can still add repeats from the exercise list.
                </p>
              )}
              <p className="muted">
                Suggestions offer variety, not a balanced training plan or personalized coaching.
              </p>
            </>
          )}
          <details className="usage-explanation">
            <summary>How usage is counted</summary>
            <p className="muted">
              Counts mean inclusion in a saved workout, not measured reps or completed movements.
              Custom and older entries without a catalog link are not counted.
            </p>
            {!!usage?.unattributedEntries && (
              <p>{usage.unattributedEntries} saved exercise entries have no catalog link.</p>
            )}
          </details>
        </section>
      )}
      {!searching && (
        <>
          {groups}
          {noMatches}
        </>
      )}
    </>
  );
}
