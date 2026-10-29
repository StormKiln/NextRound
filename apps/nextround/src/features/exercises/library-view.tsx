import { type ExerciseEntry, formatTarget } from '@nextround/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { metadataFor } from '@/data/equipment';
import { exercises } from '@/data/exercises';
import { matchesPhase, type Phase, phaseLabels, phasesFor } from '@/data/phases';
import { matchesExercise } from '../setup/exercise-suggestions';
import { ExerciseForm, newPersonal } from './exercise-form';
import { personalQueryKey, useExerciseLibrary } from './library';
import { mutatePersonalExercises, type PersonalExercise } from './repository';
export function copyExercise(entry: ExerciseEntry): PersonalExercise {
  const metadata = metadataFor(entry);
  return {
    ...newPersonal(),
    name: entry.name,
    description: entry.description ?? '',
    category: metadata?.category ?? 'Uncategorized',
    equipment: [...(metadata?.equipment ?? [])],
    targetAreas: [...(metadata?.targetAreas ?? [])],
    ...(phasesFor(entry).length ? { phases: phasesFor(entry) } : {}),
    supportedUnits: [...(entry.supportedUnits ?? ['reps', 'seconds', 'metres', 'calories'])],
    ...(entry.target ? { defaultTarget: { ...entry.target } } : {}),
    sourceId: entry.catalogId ?? entry.id,
  };
}
export function ExerciseLibrary({ onClose }: { onClose?: () => void }) {
  const { personal } = useExerciseLibrary();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [archived, setArchived] = useState(false);
  const [bundled, setBundled] = useState(false);
  const [phase, setPhase] = useState<Phase | ''>('');
  const [feedback, setFeedback] = useState<{
    text: string;
    saved?: PersonalExercise;
    archived?: boolean;
  } | null>(null);
  const revealRef = useRef<string | null>(null);
  useEffect(() => {
    if (!revealRef.current) return;
    (document.getElementById(`personal-edit-${revealRef.current}`) ?? searchRef.current)?.focus();
    revealRef.current = null;
  });
  const savedHidden =
    feedback?.saved &&
    (bundled ||
      (!archived && feedback.saved.archived) ||
      !matchesExercise(feedback.saved, search) ||
      (!!phase && !feedback.saved.phases?.includes(phase)));
  const [editing, setEditing] = useState<{
    initial: PersonalExercise;
    expected?: PersonalExercise;
  } | null>(null);
  const editorOrigin = useRef<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing || !editorOrigin.current) return;
    // Restore after the replacement DOM commits without waiting for a WebKit animation frame.
    (document.getElementById(editorOrigin.current) ?? searchRef.current)?.focus();
    editorOrigin.current = null;
  }, [editing]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const archiveOrigin = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (busy || !archiveOrigin.current) return;
    const origin = archiveOrigin.current;
    archiveOrigin.current = null;
    // A disabled or removed action can lose focus while the native write completes.
    // Do not override navigation the user performed during that write.
    if (document.activeElement === document.body || document.activeElement === origin)
      (document.getElementById(origin.id) ?? searchRef.current)?.focus();
  }, [busy]);
  const ready = !personal.isPending && !personal.isError;
  const entries = (ready ? (personal.data?.exercises ?? []) : []).filter(
    (e) =>
      (archived || !e.archived) &&
      matchesExercise(e, search) &&
      (!phase || e.phases?.includes(phase)),
  );
  const bundledEntries = exercises.filter(
    (e) => matchesExercise(e, search) && (!phase || matchesPhase(e, phase)),
  );
  const archive = async (entry: PersonalExercise, origin: HTMLButtonElement) => {
    if (busy) return;
    archiveOrigin.current = document.activeElement === origin ? origin : null;
    setBusy(true);
    setError('');
    setFeedback(null);
    try {
      const document = await mutatePersonalExercises({
        action: 'save',
        expected: entry,
        exercise: { ...entry, archived: !entry.archived },
      });
      client.setQueryData(personalQueryKey, document);
      setFeedback({
        text: `${entry.archived ? 'Restored' : 'Archived'} “${entry.name}”.${entry.archived ? '' : ' Saved workouts and history keep their existing copies.'}`,
        archived: !entry.archived,
      });
      void client.invalidateQueries({ queryKey: personalQueryKey });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await client.invalidateQueries({ queryKey: personalQueryKey });
    } finally {
      setBusy(false);
    }
  };
  const content = (
    <>
      <p className="muted">
        Your movements, saved on this Mac. Editing or archiving preserves existing workout copies.
      </p>
      <div className="dialog-actions">
        <Button
          id="personal-create"
          disabled={!ready || busy}
          onClick={() => {
            editorOrigin.current = 'personal-create';
            setEditing({ initial: newPersonal() });
          }}
        >
          Create exercise
        </Button>
        <Button variant="secondary" disabled={!ready || busy} onClick={() => setBundled(!bundled)}>
          {bundled ? 'Show personal exercises' : 'Copy a bundled exercise'}
        </Button>
      </div>
      <Input
        ref={searchRef}
        aria-label="Search my exercise library"
        placeholder="Find an exercise…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="phase-filter">
        <label htmlFor="library-phase">Workout phase</label>
        <select
          id="library-phase"
          value={phase}
          onChange={(e) => setPhase(e.target.value as Phase | '')}
        >
          <option value="">All exercises</option>
          {Object.entries(phaseLabels).map(([id, label]) => (
            <option key={id} value={id}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {!bundled && (
        <label className="personal-check">
          <input
            type="checkbox"
            checked={archived}
            onChange={(e) => setArchived(e.target.checked)}
          />
          Show archived exercises
        </label>
      )}
      {personal.isPending && <p role="status">Loading personal exercises…</p>}
      {personal.isError && (
        <div role="alert">
          <p>Personal exercises could not be loaded. Existing data is preserved.</p>
          <Button onClick={() => void personal.refetch()}>Retry personal library</Button>
        </div>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {feedback && (
        <div role="status" aria-label="Exercise library update" className="personal-feedback">
          <p>
            {feedback.text}
            {savedHidden ? ' This exercise is hidden by your current view or filters.' : ''}
          </p>
          {savedHidden && (
            <Button
              variant="secondary"
              onClick={() => {
                const entry = feedback.saved;
                if (!entry) return;
                setBundled(false);
                if (!matchesExercise(entry, search)) setSearch('');
                if (phase && !entry.phases?.includes(phase)) setPhase('');
                if (entry.archived) setArchived(true);
                editorOrigin.current = null;
                revealRef.current = entry.id;
                setFeedback(null);
              }}
            >
              Show saved exercise
            </Button>
          )}
          {feedback.archived && !archived && (
            <Button
              variant="secondary"
              onClick={() => {
                setArchived(true);
                setFeedback(null);
                searchRef.current?.focus();
              }}
            >
              Show archived exercises
            </Button>
          )}
        </div>
      )}
      <div className="personal-list">
        {bundled
          ? bundledEntries.map((e) => (
              <section key={e.id}>
                <div>
                  <span className="eyebrow">Bundled · read-only</span>
                  <h3>{e.name}</h3>
                  <p>{e.description}</p>
                  {phasesFor(e).length > 0 && (
                    <small>
                      Phase:{' '}
                      {phasesFor(e)
                        .map((p) => phaseLabels[p])
                        .join(', ')}
                    </small>
                  )}
                </div>
                <Button
                  variant="secondary"
                  disabled={!ready || busy}
                  id={`personal-copy-${e.id}`}
                  aria-label={`Copy ${e.name}`}
                  onClick={() => {
                    editorOrigin.current = `personal-copy-${e.id}`;
                    setEditing({ initial: copyExercise(e) });
                  }}
                >
                  Copy to my exercises
                </Button>
              </section>
            ))
          : entries.map((e) => (
              <section key={e.id}>
                <div>
                  <span className="eyebrow">Personal{e.archived ? ' · Archived' : ''}</span>
                  <h3>{e.name}</h3>
                  <p>{e.description || 'No description'}</p>
                  <small>
                    {e.category}
                    <span className="personal-detail">
                      Supported targets:{' '}
                      {e.supportedUnits
                        .map(
                          (u) =>
                            ({
                              reps: 'Reps',
                              seconds: 'Seconds',
                              metres: 'Metres',
                              calories: 'Calories',
                            })[u],
                        )
                        .join(', ')}
                    </span>
                    {!!e.phases?.length && (
                      <span className="personal-detail">
                        Phase: {e.phases.map((p) => phaseLabels[p]).join(', ')}
                      </span>
                    )}
                    <span className="personal-detail">
                      {e.defaultTarget
                        ? `Default target: ${formatTarget(e.defaultTarget)}`
                        : 'No default target'}
                    </span>
                  </small>
                </div>
                <div className="dialog-actions">
                  <Button
                    variant="secondary"
                    disabled={busy}
                    id={`personal-edit-${e.id}`}
                    aria-label={`Edit ${e.name}`}
                    onClick={() => {
                      editorOrigin.current = `personal-edit-${e.id}`;
                      setEditing({ initial: e, expected: e });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    id={`personal-archive-${e.id}`}
                    aria-label={`${e.archived ? 'Restore' : 'Archive'} ${e.name}`}
                    onClick={(event) => void archive(e, event.currentTarget)}
                  >
                    {e.archived ? 'Restore' : 'Archive'}
                  </Button>
                </div>
              </section>
            ))}
        {ready && bundled && !bundledEntries.length && (
          <div role="status">
            <p>No bundled exercises match.</p>
            <Button
              variant="secondary"
              onClick={() => {
                setSearch('');
                searchRef.current?.focus();
              }}
            >
              Clear exercise search
            </Button>
            {phase && (
              <Button variant="secondary" onClick={() => setPhase('')}>
                Show all phases
              </Button>
            )}
          </div>
        )}
        {ready && !bundled && !entries.length && (
          <div role="status">
            <p>
              {search.trim()
                ? 'No personal exercises match your search.'
                : phase
                  ? `No personal exercises are tagged ${phaseLabels[phase]}.`
                  : 'No personal exercises to show. Create one, copy a bundled movement, or show archived exercises.'}
            </p>
            {search.trim() && (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('');
                  searchRef.current?.focus();
                }}
              >
                Clear exercise search
              </Button>
            )}
            {phase && (
              <Button variant="secondary" onClick={() => setPhase('')}>
                Show all phases
              </Button>
            )}
          </div>
        )}
      </div>
      {onClose && (
        <div className="dialog-actions">
          <Button variant="ghost" disabled={busy} onClick={onClose}>
            Back to picker
          </Button>
        </div>
      )}
    </>
  );
  return (
    <>
      {editing ? (
        <ExerciseForm
          initial={editing.initial}
          expected={editing.expected}
          onClose={() => setEditing(null)}
          onSaved={(exercise) => {
            setFeedback({ text: `Saved “${exercise.name}”.`, saved: exercise });
            setEditing(null);
          }}
        />
      ) : onClose ? (
        <Dialog
          title="My exercises"
          className="personal-library-dialog"
          onClose={() => {
            if (!busy) onClose();
          }}
        >
          {content}
        </Dialog>
      ) : (
        <main className="page personal-library">
          <h1>My exercises</h1>
          {content}
        </main>
      )}
    </>
  );
}
