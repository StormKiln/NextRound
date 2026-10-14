import type { ExerciseEntry } from '@nextround/core';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { metadataFor } from '@/data/equipment';
import { exercises } from '@/data/exercises';
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
    (e) => (archived || !e.archived) && matchesExercise(e, search),
  );
  const archive = async (entry: PersonalExercise, origin: HTMLButtonElement) => {
    if (busy) return;
    archiveOrigin.current = document.activeElement === origin ? origin : null;
    setBusy(true);
    setError('');
    try {
      const document = await mutatePersonalExercises({
        action: 'save',
        expected: entry,
        exercise: { ...entry, archived: !entry.archived },
      });
      client.setQueryData(personalQueryKey, document);
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
      <div className="personal-list">
        {bundled
          ? exercises
              .filter((e) => matchesExercise(e, search))
              .map((e) => (
                <section key={e.id}>
                  <div>
                    <span className="eyebrow">Bundled · read-only</span>
                    <h3>{e.name}</h3>
                    <p>{e.description}</p>
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
                    {e.category} · {e.supportedUnits.join(', ')}
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
        {ready && bundled && !exercises.some((e) => matchesExercise(e, search)) && (
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
          </div>
        )}
        {ready && !bundled && !entries.length && (
          <div role="status">
            <p>
              {search.trim()
                ? 'No personal exercises match your search.'
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
          onSaved={() => setEditing(null)}
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
