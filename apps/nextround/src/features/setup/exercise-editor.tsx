import { type ExerciseEntry, formatTarget } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listExercises } from '@/data/exercises';
import { ExerciseGroups } from './exercise-picker';
import { TargetDialog } from './target-dialog';

export function ExerciseEditor({
  exercises,
  onChange,
  title = 'Your exercise order',
  description: introduction = 'One movement per minute. Repeat until the clock runs out.',
  rounds,
}: {
  exercises: ExerciseEntry[];
  onChange: (entries: ExerciseEntry[]) => void;
  title?: string;
  description?: string;
  rounds?: number;
}) {
  const {
    data: library = [],
    isError,
    refetch,
  } = useQuery({ queryKey: ['exercises'], queryFn: listExercises });
  const [custom, setCustom] = useState(false);
  const [picker, setPicker] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customError, setCustomError] = useState('');
  const [search, setSearch] = useState('');

  const headingId = useId();
  const helpId = useId();
  const [announcement, setAnnouncement] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const originalOrder = useRef<ExerciseEntry[] | null>(null);
  const pointerActive = useRef(false);
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
    originalOrder.current = [...exercises];
    setDragId(id);
    setAnnouncement('Movement picked up. Use arrow keys to move, Space to drop, Escape to cancel.');
  };
  const finish = (cancel = false) => {
    if (cancel && originalOrder.current) onChange(originalOrder.current);
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
        <ol className="exercise-list">
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
                  event.currentTarget.setPointerCapture(event.pointerId);
                  pointerActive.current = true;
                  pickup(exercise.id);
                }}
                onPointerMove={(event) => {
                  if (!pointerActive.current || dragId !== exercise.id) return;
                  const rows = event.currentTarget.closest('ol')?.querySelectorAll('li');
                  if (!rows) return;
                  const target = Array.from(rows).findIndex((row) => {
                    const rect = row.getBoundingClientRect();
                    return event.clientY >= rect.top && event.clientY <= rect.bottom;
                  });
                  if (target >= 0) move(exercise.id, target);
                }}
                onPointerUp={() => {
                  if (pointerActive.current) finish();
                }}
                onPointerCancel={() => finish(true)}
              >
                <GripVertical size={18} />
              </Button>
              <span className="order-number">{String(index + 1).padStart(2, '0')}</span>
              <div className="exercise-copy">
                <h3>{exercise.name}</h3>
                <p>{exercise.description || 'Your custom movement'}</p>
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
        <div className="add-actions">
          <Button
            variant="secondary"
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
          mode={rounds === undefined ? 'countdown' : 'emom'}
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
      {picker && (
        <Dialog title="Choose an exercise" onClose={() => setPicker(false)}>
          <Input
            aria-label="Search exercises"
            placeholder="Find a movement…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {isError && <Button onClick={() => void refetch()}>Retry loading exercises</Button>}
          <div className="library-list">
            <ExerciseGroups
              library={library}
              search={search}
              onSelect={(entry) => {
                onChange([...exercises, { ...entry, id: crypto.randomUUID() }]);
                setPicker(false);
                setSearch('');
              }}
            />
            {!library.some((e) => e.name.toLowerCase().includes(search.toLowerCase())) && (
              <p>No matching exercises. Try another search or add a Custom exercise.</p>
            )}
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
