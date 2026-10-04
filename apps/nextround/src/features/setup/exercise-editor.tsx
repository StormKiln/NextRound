import { type ExerciseEntry, formatTarget } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { eligibleExercise, equipmentNote } from '@/data/equipment';
import { listExercises } from '@/data/exercises';
import { type FocusArea, focusAreas, matchesFocus, type PickerView } from '@/data/focus';
import { useEquipment } from '@/features/settings/equipment-store';
import { Settings } from '@/features/settings/settings';
import { defaultEmomTarget, rotationNotice } from './emom-defaults';
import { ExerciseRecommendations } from './exercise-recommendations';
import type { SuggestionPreset } from './exercise-suggestions';
import { normalizeSearch } from './exercise-suggestions';
import { FocusControls } from './focus-controls';
import { TargetDialog } from './target-dialog';

export function ExerciseEditor({
  exercises,
  onChange,
  title = 'Your exercise order',
  description: introduction = 'One movement per minute. Repeat until the clock runs out.',
  rounds,
  workSeconds,
  emomDefaults = false,
  requireTargets = false,
  forTime = false,
  repLadder = false,
  validationError,
}: {
  exercises: ExerciseEntry[];
  onChange: (entries: ExerciseEntry[]) => void;
  title?: string;
  description?: string;
  rounds?: number;
  workSeconds?: number;
  emomDefaults?: boolean;
  requireTargets?: boolean;
  forTime?: boolean;
  repLadder?: boolean;
  validationError?: string;
}) {
  const {
    data: library = [],
    isError,
    isPending,
    refetch,
  } = useQuery({ queryKey: ['exercises'], queryFn: listExercises, retry: false });
  const equipment = useEquipment();
  const [preset, setPreset] = useState<SuggestionPreset | null>(null);
  const [view, setView] = useState<PickerView>('type');
  const [areas, setAreas] = useState<FocusArea[]>([]);
  const [equipmentSettings, setEquipmentSettings] = useState(false);
  const [showAllEquipment, setShowAllEquipment] = useState(false);
  const effectiveSelection = equipment.loaded ? equipment.selection : null;
  const equipmentLibrary = showAllEquipment
    ? library
    : library.filter((entry) => eligibleExercise(entry, effectiveSelection));
  const availableLibrary = equipmentLibrary.filter(
    (entry) => !repLadder || !entry.supportedUnits || entry.supportedUnits.includes('reps'),
  );
  const [custom, setCustom] = useState(false);
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    if (picker) equipment.load();
    else {
      setShowAllEquipment(false);
      setPreset(null);
      setView('type');
      setAreas([]);
    }
  }, [picker, equipment.load]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customError, setCustomError] = useState('');
  const [search, setSearch] = useState('');

  const listRef = useRef<HTMLOListElement>(null);
  const previousLength = useRef(exercises.length);
  useEffect(() => {
    if (exercises.length > previousLength.current)
      listRef.current?.lastElementChild?.scrollIntoView({ block: 'nearest' });
    previousLength.current = exercises.length;
  }, [exercises.length]);
  useEffect(() => {
    if (dragId && !pointerActive.current)
      listRef.current
        ?.querySelector(`[data-entry-id="${CSS.escape(dragId)}"]`)
        ?.scrollIntoView({ block: 'nearest' });
  });
  const headingId = useId();
  const helpId = useId();
  const errorId = useId();
  const [announcement, setAnnouncement] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const originalOrder = useRef<string[] | null>(null);
  const pointerActive = useRef(false);
  useEffect(() => {
    if (dragId && !exercises.some((entry) => entry.id === dragId)) {
      originalOrder.current = null;
      pointerActive.current = false;
      setDragId(null);
      setAnnouncement('Reordering ended. Movement removed.');
    }
  }, [dragId, exercises]);
  const minutes = rounds ?? 0;
  const validDuration = Number.isInteger(minutes) && minutes > 0 && minutes <= 1440;
  const targetIndex = exercises.findIndex((entry) => entry.id === targetId);
  const roundCount = (index: number) =>
    Math.floor(minutes / exercises.length) + (index < minutes % exercises.length ? 1 : 0);
  const move = (id: string, to: number) => {
    const from = exercises.findIndex((entry) => entry.id === id);
    if (from < 0 || to < 0 || to >= exercises.length || from === to) return;
    const next = [...exercises];
    const [entry] = next.splice(from, 1);
    next.splice(to, 0, entry);
    onChange(next);
    setAnnouncement(`${entry.name}, position ${to + 1} of ${next.length}`);
  };
  const pickup = (id: string) => {
    originalOrder.current = exercises.map((entry) => entry.id);
    setDragId(id);
    setAnnouncement('Movement picked up. Use arrow keys to move, Space to drop, Escape to cancel.');
  };
  const finish = (cancel = false) => {
    if (cancel && originalOrder.current) {
      const order = originalOrder.current;
      const current = new Map(exercises.map((entry) => [entry.id, entry]));
      onChange([
        ...order.flatMap((id) => {
          const entry = current.get(id);
          return entry ? [entry] : [];
        }),
        ...exercises.filter((entry) => !order.includes(entry.id)),
      ]);
    }
    originalOrder.current = null;
    pointerActive.current = false;
    setDragId(null);
    setAnnouncement(cancel ? 'Reordering cancelled.' : 'Movement dropped.');
  };
  return (
    <>
      <section className="sequence" aria-labelledby={headingId}>
        <div className="section-title">
          <div>
            <h2 id={headingId}>{title}</h2>
            <p className="muted">{introduction}</p>
          </div>
          <span className="count">{exercises.length}</span>
        </div>
        <p id={helpId} className="sr-only">
          Drag a handle to reorder. With keyboard, press Space to pick up, arrow keys to move, Space
          to drop, or Escape to cancel.
        </p>
        <p role="status" className="sr-only">
          {announcement}
        </p>
        {emomDefaults && (
          <p className="hint">
            Targets are editable starting suggestions. Adjust the work and load to leave time to
            recover. For a custom movement, the starting suggestion is 30 seconds.
          </p>
        )}
        {emomDefaults && rotationNotice(minutes, exercises) && (
          <p role="status" className="rotation-notice">
            {rotationNotice(minutes, exercises)}
          </p>
        )}
        <ol
          ref={listRef}
          aria-label="Ordered exercises"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: The bounded scroll region must be keyboard scrollable.
          tabIndex={0}
          className="exercise-list"
          onPointerMove={(event) => {
            if (!pointerActive.current || !dragId) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientY < bounds.top + 45) event.currentTarget.scrollTop -= 16;
            else if (event.clientY > bounds.bottom - 45) event.currentTarget.scrollTop += 16;
            const rows = event.currentTarget.querySelectorAll('li');
            const target = Array.from(rows).findIndex((row) => {
              const rect = row.getBoundingClientRect();
              return event.clientY >= rect.top && event.clientY <= rect.bottom;
            });
            if (target >= 0) move(dragId, target);
          }}
          onPointerUp={() => {
            if (pointerActive.current) finish();
          }}
          onPointerCancel={() => {
            if (pointerActive.current) finish(true);
          }}
          onLostPointerCapture={() => {
            if (pointerActive.current) finish(true);
          }}
        >
          {exercises.map((exercise, index) => (
            <li
              key={exercise.id}
              data-testid="exercise-entry"
              className={`exercise-entry${dragId === exercise.id ? ' is-dragging' : ''}`}
              data-entry-id={exercise.id}
            >
              <Button
                variant="ghost"
                size="icon"
                className="drag-handle"
                aria-label={`Reorder ${exercise.name}`}
                aria-describedby={helpId}
                aria-pressed={dragId === exercise.id}
                onKeyDown={(event) => {
                  if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();
                    if (dragId === exercise.id) finish();
                    else pickup(exercise.id);
                  } else if (
                    dragId === exercise.id &&
                    ['ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)
                  ) {
                    event.preventDefault();
                    if (event.key === 'Escape') finish(true);
                    else move(exercise.id, index + (event.key === 'ArrowUp' ? -1 : 1));
                  }
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.currentTarget.focus();
                  event.currentTarget.closest('ol')?.setPointerCapture(event.pointerId);
                  pointerActive.current = true;
                  pickup(exercise.id);
                }}
              >
                <GripVertical size={18} />
              </Button>
              <span className="order-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="exercise-copy">
                <h3>{exercise.name}</h3>
                <p>{exercise.description || 'Your custom movement'}</p>
                {!repLadder && (
                  <div className="exercise-target">
                    {exercise.target && (
                      <strong>
                        {exercise.target.unit === 'reps'
                          ? `${exercise.target.value} Reps`
                          : formatTarget(exercise.target)}
                      </strong>
                    )}
                    <Button
                      variant="ghost"
                      aria-label={`${exercise.target ? 'Edit' : 'Set'} target for ${exercise.name}`}
                      onClick={() => setTargetId(exercise.id)}
                    >
                      {exercise.target ? 'Edit target' : 'Set target'}
                    </Button>
                  </div>
                )}
                {validDuration && (
                  <span className="round-count">
                    {roundCount(index)} {roundCount(index) === 1 ? 'round' : 'rounds'}
                  </span>
                )}
              </div>
              <div className="exercise-actions">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${exercise.name}`}
                  onClick={() => onChange(exercises.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </li>
          ))}
        </ol>
        {!exercises.length && (
          <div className="empty">
            <h3>Your first movement goes here</h3>
            <p>Pick an exercise or add one of your own.</p>
          </div>
        )}
        {validationError && (
          <p id={errorId} className="error" role="alert">
            {validationError}
          </p>
        )}
        <div className="add-actions">
          <Button
            variant="secondary"
            aria-invalid={!!validationError}
            aria-describedby={validationError ? errorId : undefined}
            onClick={() => setPicker(true)}
            disabled={exercises.length >= 100}
          >
            <Plus size={17} />
            Add exercise
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setCustom(true);
              setCustomError('');
            }}
            disabled={exercises.length >= 100}
          >
            Custom exercise
          </Button>
        </div>
        {validDuration && exercises.length > 0 && (
          <div className="rotation-preview">
            <span>Round preview</span>
            <p>
              {Array.from(
                { length: Math.min(minutes, 6) },
                (_, i) => exercises[i % exercises.length].name,
              ).join(' → ')}
              {minutes > 6 ? ' → …' : ''}
            </p>
          </div>
        )}
      </section>
      {targetIndex >= 0 && exercises[targetIndex] && (
        <TargetDialog
          mode={
            forTime
              ? 'forTime'
              : requireTargets
                ? 'amrap'
                : workSeconds !== undefined
                  ? 'intervals'
                  : rounds === undefined
                    ? 'countdown'
                    : 'emom'
          }
          workSeconds={workSeconds}
          exercise={exercises[targetIndex]}
          onClose={() => setTargetId(null)}
          onSave={(target) => {
            onChange(
              exercises.map((entry) => (entry.id === targetId ? { ...entry, target } : entry)),
            );
            setTargetId(null);
          }}
        />
      )}
      {custom && (
        <Dialog title="Add a custom exercise" onClose={() => setCustom(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) {
                setCustomError('Give your exercise a name.');
                return;
              }
              onChange([
                ...exercises,
                {
                  id: crypto.randomUUID(),
                  name: name.trim(),
                  ...(emomDefaults || requireTargets
                    ? { target: { unit: 'seconds' as const, value: 30 } }
                    : {}),
                  description: description.trim() || undefined,
                },
              ]);
              setCustom(false);
              setName('');
              setDescription('');
            }}
          >
            <label htmlFor="custom-name">Exercise name</label>
            <Input
              id="custom-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
            />
            <label htmlFor="custom-description">Description (optional)</label>
            <textarea
              id="custom-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Reps, technique, or a reminder for this round"
            />
            {customError && (
              <p role="alert" className="error">
                {customError}
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="ghost" type="button" onClick={() => setCustom(false)}>
                Cancel
              </Button>
              <Button type="submit">Add custom exercise</Button>
            </div>
          </form>
        </Dialog>
      )}
      {equipmentSettings && (
        <Settings initialSection="equipment" onClose={() => setEquipmentSettings(false)} />
      )}
      {picker && !equipmentSettings && (
        <Dialog
          title="Choose an exercise"
          className="picker-dialog"
          onClose={() => setPicker(false)}
        >
          {repLadder && (
            <p className="hint">
              Ladder uses reps. Time-only and distance/calorie-only movements are hidden; units are
              never converted.
            </p>
          )}
          <Input
            aria-label="Search exercises"
            placeholder="Find a movement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="picker-body">
            <FocusControls view={view} onView={setView} selected={areas} onChange={setAreas} />
            <div className="equipment-filter">
              <p>
                {effectiveSelection === null
                  ? 'Equipment is not configured. All equipment is shown.'
                  : 'Showing movements for your saved equipment.'}
              </p>
              {equipment.error && (
                <div role="alert">
                  <p>{equipment.error}</p>
                  <Button onClick={equipment.load}>Retry equipment settings</Button>
                </div>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={showAllEquipment}
                  onChange={(event) => setShowAllEquipment(event.target.checked)}
                />{' '}
                Show all equipment
              </label>
              <Button variant="secondary" onClick={() => setEquipmentSettings(true)}>
                Change equipment settings
              </Button>
              <p className="hint">
                This override lasts until you close the picker. Custom exercise requirements are
                unknown and are not filtered.
              </p>
              {!showAllEquipment && equipmentLibrary.length < library.length && (
                <p>
                  {library.length - equipmentLibrary.length} exercises hidden by equipment settings.
                  Show all equipment to include them.
                </p>
              )}
            </div>
            {isPending && <p role="status">Loading exercises…</p>}
            {isError && (
              <div role="alert">
                <p>Exercises could not be loaded.</p>
                <Button onClick={() => void refetch()}>Retry loading exercises</Button>
              </div>
            )}
            <div className="library-list">
              {!isPending && !isError && (
                <ExerciseRecommendations
                  emptyState={
                    <section className="picker-empty" aria-label="No matching exercises">
                      <h3>No matching exercises.</h3>
                      <p>
                        {library.length === 0
                          ? 'The exercise library is empty. You can add a custom exercise.'
                          : 'No exercises match the current search and filters.'}
                      </p>
                      {normalizeSearch(search) && <p>Search: “{search.trim()}”</p>}
                      {!!areas.length && (
                        <p>Focus: {areas.map((area) => focusAreas[area]).join(', ')}</p>
                      )}
                      {effectiveSelection !== null && !showAllEquipment && (
                        <p>Equipment: only movements for your saved equipment are included.</p>
                      )}
                      <div className="empty-actions">
                        {normalizeSearch(search) && (
                          <Button variant="secondary" onClick={() => setSearch('')}>
                            Clear search
                          </Button>
                        )}
                        {!!areas.length && (
                          <Button variant="secondary" onClick={() => setAreas([])}>
                            Clear focus filters
                          </Button>
                        )}
                        {effectiveSelection !== null && !showAllEquipment && (
                          <Button variant="secondary" onClick={() => setShowAllEquipment(true)}>
                            Show all equipment temporarily
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setPicker(false);
                            setCustom(true);
                          }}
                        >
                          Add a custom exercise
                        </Button>
                      </div>
                    </section>
                  }
                  selected={exercises}
                  preset={preset}
                  onPreset={setPreset}
                  view={view}
                  library={availableLibrary.filter((entry) => matchesFocus(entry, areas))}
                  note={(entry) => equipmentNote(entry, effectiveSelection)}
                  search={search}
                  onSelect={(entry) => {
                    onChange([
                      ...exercises,
                      {
                        ...entry,
                        catalogId: entry.id,
                        id: crypto.randomUUID(),
                        ...((emomDefaults || requireTargets) && !entry.target
                          ? { target: defaultEmomTarget(entry) }
                          : {}),
                      },
                    ]);
                    setPicker(false);
                    setSearch('');
                  }}
                />
              )}
            </div>
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setPicker(false)}>
              Cancel
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
