import type { ExerciseEntry } from '@nextround/core';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { metadataFor } from '@/data/equipment';
import { exercises } from '@/data/exercises';
import { normalizeSearch } from '@/lib/search';
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = !personal.isPending && !personal.isError;
  const entries = (ready ? (personal.data?.exercises ?? []) : []).filter(
    (e) => (archived || !e.archived) && normalizeSearch(e.name).includes(normalizeSearch(search)),
  );
  const archive = async (entry: PersonalExercise) => {
    if (busy) return;
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
        <Button disabled={!ready || busy} onClick={() => setEditing({ initial: newPersonal() })}>
          Create exercise
        </Button>
        <Button variant="secondary" disabled={!ready || busy} onClick={() => setBundled(!bundled)}>
          {bundled ? 'Show personal exercises' : 'Copy a bundled exercise'}
        </Button>
      </div>
      <Input
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
              .filter((e) => normalizeSearch(e.name).includes(normalizeSearch(search)))
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
                    aria-label={`Copy ${e.name}`}
                    onClick={() => setEditing({ initial: copyExercise(e) })}
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
                    aria-label={`Edit ${e.name}`}
                    onClick={() => setEditing({ initial: e, expected: e })}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={busy}
                    aria-label={`${e.archived ? 'Restore' : 'Archive'} ${e.name}`}
                    onClick={() => void archive(e)}
                  >
                    {e.archived ? 'Restore' : 'Archive'}
                  </Button>
                </div>
              </section>
            ))}
        {ready && !bundled && !entries.length && (
          <p>
            No personal exercises match. Create one, copy a bundled movement, or show archived
            exercises.
          </p>
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
