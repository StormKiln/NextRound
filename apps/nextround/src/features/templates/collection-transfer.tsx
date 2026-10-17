import { useQueryClient } from '@tanstack/react-query';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeSearch } from '@/lib/search';
import { collectionFailure } from './collection-errors';
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
      const used = doc.templates.map((t) => t.name);
      const suggested = parsed.workouts.map((w) => {
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
      const doc = await mutateTemplates({
        action: 'collectionimport',
        name,
        workouts: preview.workouts.map((w, i) => ({
          name: names[i],
          config: importedConfig(w.config),
        })),
      });
      await client.cancelQueries({ queryKey: ['workout-templates'] });
      client.setQueryData(['workout-templates'], doc);
      if (mounted.current) onImported(doc.collections[doc.collections.length - 1].name);
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const duplicate = new Set(names.map(normalizeSearch)).size !== names.length;
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
              maxLength={80}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
            <p>
              {preview.workouts.length} workouts will be added. Suggested copy names avoid existing
              names; review or edit them before adding. Nothing will be overwritten.
            </p>
            {duplicate && <p role="alert">Each imported workout needs a distinct name.</p>}
            {preview.workouts.map((w, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: Imported preview order is immutable; editable names are separate state.
              <section className="template-review" key={i}>
                <label htmlFor={`collection-workout-${i}`}>Workout {i + 1} name</label>
                <Input
                  id={`collection-workout-${i}`}
                  maxLength={120}
                  value={names[i]}
                  disabled={busy}
                  onChange={(e) =>
                    setNames((current) => current.map((n, j) => (i === j ? e.target.value : n)))
                  }
                />
                <WorkoutDetails config={w.config} />
              </section>
            ))}
          </>
        )}
      </div>
      <div className="template-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={
            busy ||
            !preview ||
            retained ||
            !name.trim() ||
            names.some((n) => !n.trim()) ||
            duplicate
          }
          onClick={() => void add()}
        >
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
  useEffect(() => {
    mounted.current = true;
    void readTemplates()
      .then((doc) => {
        if (mounted.current) setPreview(collectionFromDocument(doc, id));
      })
      .catch((e) => {
        if (mounted.current) setError(errorMessage(e));
      });
    return () => {
      mounted.current = false;
    };
  }, [id]);
  async function save() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const doc: TemplateDocument = await readTemplates();
      if (!mounted.current) return;
      const collection = collectionFromDocument(doc, id),
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
              {preview.workouts.length} saved workouts. The latest saved collection will be read
              when you save.
            </p>
            <ol>
              {preview.workouts.map((w, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: Export preview order is immutable.
                <li key={i}>{w.name}</li>
              ))}
            </ol>
          </>
        )}
        {error && <p role="alert">{error}</p>}
      </div>
      <div className="template-actions">
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
