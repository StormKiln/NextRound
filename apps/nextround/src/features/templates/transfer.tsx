import { useQueryClient } from '@tanstack/react-query';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  availableName,
  encodeWorkout,
  importedConfig,
  MAX_WORKOUT_BYTES,
  type PortableWorkout,
  parseWorkout,
} from './portable';
import { mutateTemplates, readTemplates, type WorkoutTemplate } from './repository';
import { WorkoutDetails } from './workout-details';

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export function WorkoutImport({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: (entry: WorkoutTemplate) => void;
}) {
  const [workout, setWorkout] = useState<PortableWorkout | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
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
      const parsed = parseWorkout(raw);
      const current = await readTemplates();
      if (!mounted.current) return;
      setName(
        availableName(
          parsed.name,
          current.templates.map((t) => t.name),
        ),
      );
      setWorkout(parsed);
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function add() {
    if (gate.current || !workout) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      await client.cancelQueries({ queryKey: ['workout-templates'] });
      const doc = await mutateTemplates({
        action: 'import',
        name,
        config: importedConfig(workout.config),
      });
      await client.cancelQueries({ queryKey: ['workout-templates'] });
      client.setQueryData(['workout-templates'], doc);
      if (mounted.current) onImported(doc.templates[doc.templates.length - 1]);
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Import saved workout"
      className="template-preview"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <div className="template-preview-body" aria-busy={busy}>
        <p>
          Preview one workout file, then add an independent copy. Your current setup, history and
          personal library stay as they are.
        </p>
        {isTauri() ? (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void choose(() => invoke<string | null>('open_workout_file'))}
          >
            Choose workout file
          </Button>
        ) : (
          <label>
            Workout file
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
                      throw new Error('Workout files must be at most 1 MiB.');
                    return file.text();
                  });
              }}
            />
          </label>
        )}
        {busy && <p role="status">Working…</p>}
        {error && <p role="alert">{error}</p>}
        {workout && (
          <>
            <label htmlFor="import-workout-name">Workout name</label>
            <Input
              id="import-workout-name"
              value={name}
              maxLength={120}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
            />
            <WorkoutDetails config={workout.config} />
          </>
        )}
      </div>
      <div className="template-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy || !workout || !name.trim()} onClick={() => void add()}>
          Add to saved workouts
        </Button>
      </div>
    </Dialog>
  );
}

export function WorkoutExport({
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
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function save() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError('');
    try {
      const doc = await readTemplates();
      if (!mounted.current) return;
      const entry = doc.templates.find((t) => t.id === id);
      if (!entry) throw new Error('This workout no longer exists. Refresh the library.');
      const raw = encodeWorkout(entry);
      if (isTauri()) {
        if ((await invoke<boolean>('save_workout_file', { raw })) && mounted.current) onSaved();
      } else {
        const url = URL.createObjectURL(new Blob([raw], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'NextRound-workout.json';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onSaved();
      }
    } catch (e) {
      if (mounted.current) setError(message(e));
    } finally {
      gate.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Export saved workout"
      onClose={() => {
        if (!gate.current) onClose();
      }}
    >
      <p>
        Export the latest saved version, including its workout name, exercise names, descriptions,
        targets and timing. Custom descriptions may contain personal information.
      </p>
      <p>
        This portable workout file excludes history, workout notes, preferences and favourites. It
        is not a full backup or a history CSV report.
      </p>
      {error && <p role="alert">{error}</p>}
      <div className="template-actions">
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={busy} onClick={() => void save()}>
          {busy ? 'Saving…' : 'Save workout file'}
        </Button>
      </div>
    </Dialog>
  );
}
