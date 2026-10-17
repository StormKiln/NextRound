import { useQueryClient } from '@tanstack/react-query';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { importMixedCollection } from '../sessions/collection-import';
import { sessionTimeLabel } from '../sessions/model';
import { readTraining, trainingKey } from '../sessions/repository';
import { collectionFailure } from './collection-errors';
import { validateImportNames } from './collection-name-errors';
import { workoutFilename } from './filename';
import { importedConfig, MAX_WORKOUT_BYTES } from './portable';
import {
  availableTransferName,
  collectionFromDocument,
  encodeCollection,
  type PortableCollection,
  parseCollection,
} from './portable-collection';
import { mutateTemplates, readTemplates, type TemplateDocument } from './repository';
import { WorkoutDetails } from './workout-details';

const errorMessage = (e: unknown) => collectionFailure(e).message;

export function CollectionImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (name: string) => void;
}) {
  const [preview, setPreview] = useState<PortableCollection | null>(null);
  const [name, setName] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [error, setError] = useState('');
  const errorNode = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) {
      errorNode.current?.focus();
      errorNode.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [error]);
  const [retained, setRetained] = useState(false);
  const [busy, setBusy] = useState(false);
  const gate = useRef(false),
    mounted = useRef(true);
  const client = useQueryClient();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function choose(read: () => Promise<string | null>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const raw = await read();
      if (!mounted.current || raw === null) return;
      const parsed = parseCollection(raw),
        doc = await readTemplates();
      if (!mounted.current) return;
      const sessions = await readTraining();
      const used = [...doc.templates.map((t) => t.name), ...sessions.sessions.map((s) => s.name)];
      const suggested = [...parsed.workouts, ...(parsed.sessions ?? [])].map((w) => {
        const name = availableTransferName(w.name, used, 120);
        used.push(name);
        return name;
      });
      setName(
        availableTransferName(
          parsed.name,
          doc.collections.map((c) => c.name),
          80,
        ),
      );
      setNames(suggested);
      setPreview(parsed);
      setRetained(false);
    } catch (e) {
      if (mounted.current) {
        setError(errorMessage(e));
        if (preview) setRetained(true);
      }
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function add() {
    if (gate.current || !preview || retained) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      await client.cancelQueries({ queryKey: ['workout-templates'] });
      const doc = preview.sessions?.length
        ? await importMixedCollection(preview, name, names)
        : await mutateTemplates({
            action: 'collectionimport',
            name,
            workouts: preview.workouts.map((w, i) => ({
              name: names[i],
              config: importedConfig(w.config),
            })),
          });
      await client.cancelQueries({ queryKey: ['workout-templates'] });
      client.setQueryData(['workout-templates'], doc);
      await client.invalidateQueries({ queryKey: trainingKey });
      if (mounted.current) onImported(doc.collections[doc.collections.length - 1].name);
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const validation = validateImportNames(name, names);
  const invalid = !!validation.collection || validation.workouts.some(Boolean);
  const firstInvalid = validation.collection
    ? 'import-collection-name'
    : `collection-workout-${validation.workouts.findIndex(Boolean)}`;
  return (
    <Dialog
      title="Import workout collection"
      className="template-preview"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <div className="template-preview-body collection-body" aria-busy={busy}>
        <p>
          Preview a collection and add independent copies of all its workouts. Existing workouts and
          your current setup stay as they are. Files must be at most 1 MiB.
        </p>
        {isTauri() ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void choose(() => invoke<string | null>('open_workout_file'))}
          >
            Choose collection file
          </Button>
        ) : (
          <label className="collection-file-field">
            Collection file
            <input
              type="file"
              accept=".json,application/json"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file)
                  void choose(async () => {
                    if (file.size > MAX_WORKOUT_BYTES)
                      throw Error('Collection files must be at most 1 MiB.');
                    return file.text();
                  });
              }}
            />
          </label>
        )}
        {busy && <p role="status">Working…</p>}
        {error && (
          <p ref={errorNode} role="alert" tabIndex={-1}>
            {error}
          </p>
        )}
        {retained && preview && (
          <div role="status">
            <p>
              The previous collection “{preview.name}” is still shown. The replacement file was not
              loaded.
            </p>
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => {
                setRetained(false);
                setError('');
              }}
            >
              Use previous collection
            </Button>
          </div>
        )}
        {preview && (
          <>
            <label htmlFor="import-collection-name">Imported collection name</label>
            <Input
              id="import-collection-name"
              aria-invalid={!!validation.collection}
              aria-describedby={validation.collection ? 'import-collection-name-error' : undefined}
              maxLength={80}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
            {validation.collection && (
              <p id="import-collection-name-error">{validation.collection}</p>
            )}
            <p>
              {preview.workouts.length} workouts and {preview.sessions?.length ?? 0} sessions will
              be added. Suggested copy names avoid existing names; review or edit them before
              adding. Nothing will be overwritten.
            </p>
            {preview.workouts.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Imported preview order is immutable; editable names are separate state.
              <section className="template-review" key={i}>
                <label htmlFor={`collection-workout-${i}`}>Workout {i + 1} name</label>
                <Input
                  id={`collection-workout-${i}`}
                  aria-invalid={!!validation.workouts[i]}
                  aria-describedby={
                    validation.workouts[i] ? `collection-workout-error-${i}` : undefined
                  }
                  maxLength={120}
                  value={names[i]}
                  disabled={busy}
                  onChange={(e) =>
                    setNames((current) => current.map((n, j) => (i === j ? e.target.value : n)))
                  }
                />
                {validation.workouts[i] && (
                  <p id={`collection-workout-error-${i}`}>{validation.workouts[i]}</p>
                )}
                <WorkoutDetails config={w.config} />
              </section>
            ))}
            {preview.sessions?.map((session, index) => {
              const i = preview.workouts.length + index;
              return (
                <section className="template-review" key={session.id}>
                  <label htmlFor={`collection-workout-${i}`}>Session {index + 1} name</label>
                  <Input
                    id={`collection-workout-${i}`}
                    aria-invalid={!!validation.workouts[i]}
                    aria-describedby={
                      validation.workouts[i] ? `collection-workout-error-${i}` : undefined
                    }
                    maxLength={120}
                    value={names[i]}
                    disabled={busy}
                    onChange={(e) =>
                      setNames((current) => current.map((n, j) => (i === j ? e.target.value : n)))
                    }
                  />
                  {validation.workouts[i] && (
                    <p id={`collection-workout-error-${i}`}>{validation.workouts[i]}</p>
                  )}
                  <p>{sessionTimeLabel(session)}</p>
                  <ol>
                    {session.blocks.map((b) => (
                      <li key={b.id}>{b.name}</li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </>
        )}
      </div>
      <div className="template-actions">
        {preview && invalid && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              const field = document.getElementById(firstInvalid);
              field?.focus();
              field?.scrollIntoView({ block: 'center' });
            }}
          >
            Review invalid names
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || !preview || retained || invalid} onClick={() => void add()}>
          Add collection and workouts
        </Button>
      </div>
    </Dialog>
  );
}

export function CollectionExport({
  id,
  onClose,
  onSaved,
}: {
  id: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const gate = useRef(false),
    mounted = useRef(true);
  const [preview, setPreview] = useState<PortableCollection | null>(null);
  const errorNode = useRef<HTMLParagraphElement>(null);
  const [readAttempt, setReadAttempt] = useState(0);
  useEffect(() => {
    if (error) {
      errorNode.current?.focus();
      errorNode.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [error]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: readAttempt explicitly triggers a retry of the same collection.
  useEffect(() => {
    let active = true;
    mounted.current = true;
    setError('');
    setPreview(null);
    setBusy(true);
    void readTemplates()
      .then(async (doc) => {
        const training = await readTraining();
        if (active) setPreview(collectionFromDocument(doc, id, training.sessions));
      })
      .catch((e) => {
        if (active) setError(errorMessage(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [id, readAttempt]);
  async function save() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const doc: TemplateDocument = await readTemplates();
      if (!mounted.current) return;
      const training = await readTraining();
      const collection = collectionFromDocument(doc, id, training.sessions),
        raw = encodeCollection(collection);
      if (isTauri()) {
        if (
          await invoke<boolean>('save_workout_file', {
            raw,
            suggestedName: workoutFilename(collection.name),
          })
        )
          if (mounted.current) onSaved();
      } else {
        const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = workoutFilename(collection.name);
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        if (mounted.current) onSaved();
      }
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Export workout collection"
      className="template-preview"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <div className="template-preview-body collection-body">
        <p>
          Export this entire collection, including workouts hidden by Home filters. History, notes,
          favourites and preferences stay on this Mac.
        </p>
        {preview && (
          <>
            <h3>{preview.name}</h3>
            <p>
              {preview.workouts.length} saved workouts and {preview.sessions?.length ?? 0} sessions.
              The latest saved collection will be read when you save.
            </p>
            <ol>
              {preview.workouts.map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Export preview order is immutable.
                <li key={i}>{w.name}</li>
              ))}
              {preview.sessions?.map((session) => (
                <li key={session.id}>
                  {session.name} — {session.blocks.length} blocks
                </li>
              ))}
            </ol>
          </>
        )}
        {error && (
          <p ref={errorNode} role="alert" tabIndex={-1}>
            {error}
          </p>
        )}
      </div>
      <div className="template-actions">
        {error && !preview && (
          <Button variant="secondary" disabled={busy} onClick={() => setReadAttempt((n) => n + 1)}>
            Retry collection
          </Button>
        )}
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || !preview} onClick={() => void save()}>
          Save collection file
        </Button>
      </div>
    </Dialog>
  );
}
