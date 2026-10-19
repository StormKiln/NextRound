import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { normalizeSearch } from '@/lib/search';
import { readTemplates, type WorkoutTemplate } from '../templates/repository';
import { WorkoutDetails, workoutSummary } from '../templates/workout-details';
import type { TrainingBlock } from './model';
import { validateSelection } from './workout-selection';

export function SavedWorkoutChooser({
  capacity,
  onClose,
  onAdd,
}: {
  capacity: number;
  onClose: () => void;
  onAdd: (blocks: TrainingBlock[]) => void;
}) {
  const [items, setItems] = useState<WorkoutTemplate[]>([]);
  const [selected, setSelected] = useState<WorkoutTemplate[]>([]);
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('all');
  const [favourites, setFavourites] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [fresh, setFresh] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const searchInput = useRef<HTMLInputElement>(null);
  const mounted = useRef(false);
  const request = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  const selectedControls = useRef(new Map<string, HTMLButtonElement>());
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (focusId === null) return;
    (selectedControls.current.get(focusId) ?? searchInput.current)?.focus();
    setFocusId(null);
  }, [focusId]);
  const refresh = useCallback(async () => {
    const ticket = ++request.current;
    setBusy(true);
    setFresh(false);
    setError('');
    setSelected([]);
    setPreview(null);
    try {
      const data = await readTemplates();
      if (!mounted.current || ticket !== request.current) return;
      setItems(data.templates);
      setFresh(true);
      setNotice('Saved workouts refreshed. Select and review workouts before adding.');
    } catch (e) {
      if (mounted.current && ticket === request.current) setError(String(e));
    } finally {
      if (mounted.current && ticket === request.current) setBusy(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      request.current++;
    };
  }, [refresh]);
  async function add() {
    if (busy || !fresh || !selected.length) return;
    setBusy(true);
    setError('');
    try {
      const current = await readTemplates();
      if (!mounted.current) return;
      const blocks = validateSelection(selected, current.templates, capacity);
      onAdd(blocks);
    } catch (e) {
      if (mounted.current) {
        setFresh(false);
        setError(String(e));
        setNotice('');
        body.current?.scrollTo(0, 0);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  const term = normalizeSearch(search);
  const matches = items.filter(
    (item) =>
      (mode === 'all' || (item.config.type ?? 'emom') === mode) &&
      (!favourites || item.favourite) &&
      normalizeSearch(
        [
          item.name,
          ...(item.config.exercises ?? []).flatMap((e) => [e.name, e.description ?? '']),
        ].join(' '),
      ).includes(term),
  );
  const details = items.find((item) => item.id === preview);
  function move(index: number, delta: number) {
    const next = [...selected];
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    setSelected(next);
    setFocusId(selected[index].id);
    setNotice(
      `Moved ${selected[index].name} to position ${index + delta + 1} of ${selected.length}.`,
    );
  }
  return (
    <Dialog
      title="Choose saved workouts"
      className="workout-chooser"
      onClose={onClose}
      initialFocus={searchInput}
    >
      <p>Add independent copies in your selected order. Your saved workouts stay unchanged.</p>
      <div className="workout-chooser-body" ref={body}>
        {error && <p role="alert">{error}</p>}
        <Button variant="ghost" disabled={busy} onClick={() => void refresh()}>
          Refresh saved workouts
        </Button>
        <label>
          Find a saved workout
          <input
            className="input"
            ref={searchInput}
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="chooser-filters">
          <label>
            Workout type
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="all">All types</option>
              {Object.entries({
                emom: 'EMOM',
                countdown: 'Countdown',
                intervals: 'Intervals',
                amrap: 'AMRAP',
                forTime: 'For Time',
                ladder: 'Ladder',
              }).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="membership-option">
            <input
              type="checkbox"
              checked={favourites}
              onChange={(e) => setFavourites(e.target.checked)}
            />
            Favourites only
          </label>
        </div>
        {busy && <p role="status">Reading saved workouts…</p>}
        {fresh && !items.length && (
          <p>No saved workouts yet. Save a workout from its setup page first.</p>
        )}
        {fresh && !!items.length && !matches.length && (
          <p>No workouts match these chooser filters.</p>
        )}
        <ul className="chooser-results" aria-label="Saved workouts to choose">
          {matches.map((item) => (
            <li key={item.id}>
              <label className="membership-option">
                <input
                  type="checkbox"
                  aria-label={`Select ${item.name}`}
                  checked={selected.some((s) => s.id === item.id)}
                  disabled={
                    busy ||
                    !fresh ||
                    (selected.length >= capacity && !selected.some((s) => s.id === item.id))
                  }
                  onChange={(e) => {
                    setSelected(
                      e.target.checked
                        ? [...selected, structuredClone(item)]
                        : selected.filter((s) => s.id !== item.id),
                    );
                  }}
                />
                <span>
                  <strong>{item.name}</strong>
                  <small>{workoutSummary(item.config)}</small>
                </span>
              </label>
              <Button variant="ghost" disabled={!fresh || busy} onClick={() => setPreview(item.id)}>
                Preview {item.name}
              </Button>
            </li>
          ))}
        </ul>
        {details && fresh && (
          <section className="chooser-preview" aria-label={`Preview ${details.name}`}>
            <h3>{details.name}</h3>
            <WorkoutDetails config={details.config} />
          </section>
        )}
        <h3>Selected order</h3>
        {!selected.length && <p>Select workouts above to build your batch.</p>}
        <ol className="chooser-selected" aria-label="Selected workout order">
          {selected.map((item, index) => (
            <li key={item.id}>
              <strong>{item.name}</strong>
              <div className="dialog-actions">
                <Button
                  variant="ghost"
                  disabled={busy || index === 0}
                  aria-label={`Move selected workout ${index + 1} up`}
                  onClick={() => move(index, -1)}
                >
                  Move up
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || index === selected.length - 1}
                  aria-label={`Move selected workout ${index + 1} down`}
                  onClick={() => move(index, 1)}
                >
                  Move down
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy}
                  ref={(node) => {
                    if (node) selectedControls.current.set(item.id, node);
                    else selectedControls.current.delete(item.id);
                  }}
                  aria-label={`Remove selected workout ${index + 1}`}
                  onClick={() => {
                    setSelected(selected.filter((s) => s.id !== item.id));
                    setFocusId(selected[index + 1]?.id ?? selected[index - 1]?.id ?? '');
                    setNotice(`Removed ${item.name} from selection.`);
                  }}
                >
                  Remove from selection
                </Button>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <footer className="chooser-footer">
        <p>
          {selected.length} selected · {capacity} available block slots (20 maximum)
        </p>
        {notice && <p role="status">{notice}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={busy || !fresh || !selected.length || selected.length > capacity}
            onClick={() => void add()}
          >
            Add selected workouts
          </Button>
        </div>
      </footer>
    </Dialog>
  );
}
