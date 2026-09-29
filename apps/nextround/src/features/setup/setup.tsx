import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ArrowDown, ArrowUp, Clock3, Play, Plus, RotateCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { listExercises } from '@/data/exercises';
import { useWorkout } from '@/state/workout';

export function Setup() {
  const { draft, setDraft, errors, busy, start, error } = useWorkout();
  const {
    data: library = [],
    isError,
    refetch,
  } = useQuery({ queryKey: ['exercises'], queryFn: listExercises });
  const navigate = useNavigate();
  const [custom, setCustom] = useState(false);
  const [picker, setPicker] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customError, setCustomError] = useState('');
  const [search, setSearch] = useState('');
  const move = (index: number, change: number) => {
    const next = [...draft.exercises];
    const other = index + change;
    if (other < 0 || other >= next.length) return;
    [next[index], next[other]] = [next[other], next[index]];
    setDraft({ exercises: next });
  };
  const minutes = Number(draft.minutes);
  const validDuration = Number.isInteger(minutes) && minutes > 0 && minutes <= 1440;
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Every minute on the minute</p>
          <h1>Make this round count.</h1>
          <p className="subtitle">Choose your movements. Set the clock. Get to work.</p>
        </div>
        <span className="mode-pill">
          <Clock3 size={17} /> EMOM
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="timing-heading">
          <h2 id="timing-heading">Set your pace</h2>
          <p className="muted">
            A new exercise starts every 60 seconds. Finish your reps, then recover until the next
            beep.
          </p>
          <div className="duration-input">
            <label htmlFor="minutes">Total minutes</label>
            <Input
              id="minutes"
              type="number"
              min="1"
              max="1440"
              step="1"
              value={draft.minutes}
              onChange={(e) => setDraft({ minutes: e.target.value })}
              aria-invalid={!!errors.minutes}
              aria-describedby={errors.minutes ? 'minutes-error' : undefined}
            />
            <span>one round per minute</span>
          </div>
          {errors.minutes && (
            <p id="minutes-error" className="error" role="alert">
              {errors.minutes}
            </p>
          )}
          <div className="timing-fields">
            <div>
              <label htmlFor="lead">Lead-in seconds</label>
              <Input
                id="lead"
                type="number"
                min="0"
                max="3600"
                step="1"
                value={draft.leadInSeconds}
                onChange={(e) => setDraft({ leadInSeconds: e.target.value })}
                aria-invalid={!!errors.leadInSeconds}
              />
              <p className="hint">Time to get into position</p>
              {errors.leadInSeconds && (
                <p className="error" role="alert">
                  {errors.leadInSeconds}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="warning">Warning seconds</label>
              <Input
                id="warning"
                type="number"
                min="0"
                max="59"
                step="1"
                value={draft.warningSeconds}
                onChange={(e) => setDraft({ warningSeconds: e.target.value })}
                aria-invalid={!!errors.warningSeconds}
              />
              <p className="hint">A tock each second, then a beep</p>
              {errors.warningSeconds && (
                <p className="error" role="alert">
                  {errors.warningSeconds}
                </p>
              )}
            </div>
          </div>
          <div className="clock-note">
            <RotateCw size={18} />
            <p>
              {validDuration ? `${minutes} rounds` : 'Set a duration'}
              {draft.exercises.length
                ? `, cycling through ${draft.exercises.length} movements in order.`
                : '. Add a movement to begin.'}
              <span>Your lead-in is extra; it does not use workout time.</span>
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (await start()) void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start workout'}
          </Button>
        </section>
        <section className="sequence" aria-labelledby="sequence-heading">
          <div className="section-title">
            <div>
              <h2 id="sequence-heading">Your exercise order</h2>
              <p className="muted">One movement per minute. Repeat until the clock runs out.</p>
            </div>
            <span className="count">{draft.exercises.length}</span>
          </div>
          <ol className="exercise-list">
            {draft.exercises.map((exercise, index) => (
              <li key={exercise.id} data-testid="exercise-entry" className="exercise-entry">
                <span className="order-number">{String(index + 1).padStart(2, '0')}</span>
                <div className="exercise-copy">
                  <h3>{exercise.name}</h3>
                  <p>{exercise.description || 'Your custom movement'}</p>
                  {validDuration && (
                    <span className="turn-count">
                      {Math.floor(minutes / draft.exercises.length) +
                        (index < minutes % draft.exercises.length ? 1 : 0)}{' '}
                      turns
                    </span>
                  )}
                </div>
                <div className="exercise-actions">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${exercise.name} up`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Move ${exercise.name} down`}
                    disabled={index === draft.exercises.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${exercise.name}`}
                    onClick={() =>
                      setDraft({ exercises: draft.exercises.filter((_, i) => i !== index) })
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
          {!draft.exercises.length && (
            <div className="empty">
              <h3>Your first movement goes here</h3>
              <p>Pick an exercise or add one of your own.</p>
            </div>
          )}
          {errors.exercises && (
            <p className="error" role="alert">
              {errors.exercises}
            </p>
          )}
          <div className="add-actions">
            <Button
              variant="secondary"
              onClick={() => setPicker(true)}
              disabled={draft.exercises.length >= 100}
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
              disabled={draft.exercises.length >= 100}
            >
              Custom exercise
            </Button>
          </div>
          {validDuration && draft.exercises.length > 0 && (
            <div className="rotation-preview">
              <span>Round preview</span>
              <p>
                {Array.from(
                  { length: Math.min(minutes, 6) },
                  (_, i) => draft.exercises[i % draft.exercises.length].name,
                ).join(' → ')}
                {minutes > 6 ? ' → …' : ''}
              </p>
            </div>
          )}
        </section>
      </div>
      {custom && (
        <Dialog title="Add a custom exercise" onClose={() => setCustom(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!name.trim()) {
                setCustomError('Give your exercise a name.');
                return;
              }
              setDraft({
                exercises: [
                  ...draft.exercises,
                  {
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    description: description.trim() || undefined,
                  },
                ],
              });
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
            {library
              .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
              .map((e) => (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => {
                    setDraft({
                      exercises: [...draft.exercises, { ...e, id: crypto.randomUUID() }],
                    });
                    setPicker(false);
                    setSearch('');
                  }}
                >
                  <span>
                    <strong>{e.name}</strong>
                    <small>{e.description}</small>
                  </span>
                  <Plus size={20} />
                </button>
              ))}
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
    </main>
  );
}
