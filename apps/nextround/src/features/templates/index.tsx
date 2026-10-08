import type { WorkoutConfig } from '@nextround/core';
import { countLabel, formatTime } from '@nextround/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { normalizeSearch } from '@/lib/search';
import { useTemplateSources } from '@/state/template-source';
import {
  copyValidatedConfig,
  mutateTemplates,
  readTemplates,
  type TemplateMutation,
  type WorkoutTemplate,
} from './repository';
import './templates.css';

const queryKey = ['workout-templates'];
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
function useTemplateMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (mutation: TemplateMutation) => mutateTemplates(mutation),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
    },
  });
}
export function SaveWorkoutButton({
  getConfig,
  validate,
}: {
  getConfig: () => WorkoutConfig;
  validate?: () => boolean;
}) {
  const [config, setConfig] = useState<WorkoutConfig | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const draft = getConfig();
  const mode = draft.type ?? 'emom';
  const source = useTemplateSources((s) => s.sources[mode]);
  const [expected, setExpected] = useState<WorkoutTemplate | null>(null);
  const currentConfig = JSON.stringify(draft);
  function open(update: boolean) {
    if (validate && !validate()) return;
    try {
      setConfig(copyValidatedConfig(getConfig()));
      setExpected(update && source ? structuredClone(source) : null);
      setName(update && source ? source.name : '');
      setError(null);
      setSaved(null);
    } catch (e) {
      setError(message(e));
    }
  }
  const mutation = useTemplateMutation();
  const inputId = useId();
  return (
    <div className="template-save">
      {source && (
        <Button type="button" variant="secondary" onClick={() => open(true)}>
          Update saved workout
        </Button>
      )}
      <Button type="button" variant="secondary" onClick={() => open(false)}>
        {source ? 'Save as new' : 'Save workout'}
      </Button>
      {saved === currentConfig && <span role="status">Workout saved.</span>}
      {error && !config && <p role="alert">{error}</p>}
      {config && (
        <Dialog
          title={expected ? 'Update saved workout' : 'Save workout'}
          onClose={() => {
            if (!mutation.isPending) setConfig(null);
          }}
        >
          <form
            className="template-form"
            onSubmit={async (event) => {
              event.preventDefault();
              setError(null);
              try {
                if (mutation.isPending) return;
                const document = await mutation.mutateAsync(
                  expected
                    ? { action: 'update', id: expected.id, expected, name, config }
                    : { action: 'save', name, config },
                );
                const updated = expected
                  ? document.templates.find((t) => t.id === expected.id)
                  : document.templates.at(-1);
                if (updated) useTemplateSources.getState().setSource(mode, updated);
                setConfig(null);
                setSaved(JSON.stringify(config));
              } catch (e) {
                setError(message(e));
              }
            }}
          >
            <p>
              {expected
                ? `Replace “${expected.name}” with these settings? Its identity is preserved.`
                : 'Save a copy to use again. You can edit it after loading.'}
            </p>
            <label htmlFor={inputId}>Workout name</label>
            <Input
              id={inputId}
              value={name}
              maxLength={120}
              required
              onChange={(event) => setName(event.target.value)}
              disabled={mutation.isPending}
            />
            {error && <p role="alert">{error}</p>}
            {error && expected && (
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => {
                  setExpected(null);
                  setError(null);
                }}
              >
                Save as new
              </Button>
            )}
            <div className="template-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={mutation.isPending}
                onClick={() => setConfig(null)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || !name.trim()}>
                {mutation.isPending ? 'Saving…' : expected ? 'Update' : 'Save'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </div>
  );
}
export function TemplateLibrary({
  onLoad,
}: {
  onLoad: (config: WorkoutConfig, source: WorkoutTemplate) => void;
}) {
  const query = useQuery({ queryKey, queryFn: readTemplates, retry: false });
  const mutation = useTemplateMutation();
  const [loading, setLoading] = useState(false);
  const busy = mutation.isPending || loading;
  const [search, setSearch] = useState('');
  const [action, setAction] = useState<{
    type: 'rename' | 'delete' | 'load';
    template: WorkoutTemplate;
  } | null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const searchId = useId();
  const nameId = useId();
  const templates =
    query.data?.templates.filter((t) =>
      normalizeSearch(t.name).includes(normalizeSearch(search)),
    ) ?? [];
  async function submit() {
    if (!action || busy) return;
    setLoading(true);
    setError(null);
    try {
      if (action.type === 'load') {
        // Re-read so stale cards never load deleted, corrupted or externally changed records.
        const latest = await readTemplates();
        const entry = latest.templates.find((t) => t.id === action.template.id);
        if (!entry) throw new Error('This saved workout no longer exists. Refresh and try again.');
        onLoad(copyValidatedConfig(entry.config), structuredClone(entry));
      } else
        await mutation.mutateAsync(
          action.type === 'rename'
            ? { action: 'rename', id: action.template.id, name }
            : { action: 'delete', id: action.template.id },
        );
      setAction(null);
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="template-library" aria-labelledby="saved-workouts-title">
      <div>
        <h2 id="saved-workouts-title">Saved workouts</h2>
        <p>Keep your favourites ready for the next round.</p>
      </div>
      {query.isPending && <p role="status">Loading saved workouts…</p>}
      {query.isError ? (
        <div role="alert">
          <p>{message(query.error)}</p>
          <Button variant="secondary" onClick={() => void query.refetch()}>
            Retry saved workouts
          </Button>
        </div>
      ) : (
        <>
          {!!query.data?.templates.length && (
            <div className="template-search">
              <label htmlFor={searchId}>Search saved workouts</label>
              <Input
                id={searchId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
          )}
          {query.data && templates.length === 0 && (
            <p>
              {query.data.templates.length
                ? 'No saved workouts match your search.'
                : 'Save a workout from any workout setup to see it here.'}
            </p>
          )}
          <ul className="template-list">
            {templates.map((template) => (
              <li key={template.id}>
                <div className="template-summary">
                  <h3>{template.name}</h3>
                  <p>
                    {template.config.type === 'ladder'
                      ? `Ladder · ${template.config.ladder.direction} · ${template.config.ladder.startReps} starting reps`
                      : template.config.type === 'forTime'
                        ? `For Time · ${template.config.timeCapSeconds ? `${formatTime(template.config.timeCapSeconds * 1000)} cap` : 'No time cap'}`
                        : template.config.type === 'amrap'
                          ? `AMRAP · ${formatTime(template.config.durationSeconds * 1000)} cap`
                          : template.config.type === 'intervals'
                            ? `Intervals · ${countLabel(template.config.rounds, 'round')} · ${template.config.workSeconds}s work / ${template.config.restSeconds}s rest`
                            : template.config.type === 'countdown'
                              ? `Countdown · ${template.config.durationSeconds} seconds`
                              : `EMOM · ${countLabel(template.config.minutes, 'round')}`}
                  </p>
                </div>
                <div className="template-actions">
                  {(['load', 'rename', 'delete'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={type === 'load' ? 'default' : 'secondary'}
                      disabled={busy}
                      aria-label={`${type[0].toUpperCase() + type.slice(1)} ${template.name}`}
                      onClick={() => {
                        setAction({ type, template });
                        setName(template.name);
                        setError(null);
                      }}
                    >
                      {type[0].toUpperCase() + type.slice(1)}
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {action && (
        <Dialog
          title={`${action.type[0].toUpperCase() + action.type.slice(1)} saved workout`}
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <form
            className="template-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            {action.type === 'rename' ? (
              <>
                <label htmlFor={nameId}>Workout name</label>
                <Input
                  id={nameId}
                  maxLength={120}
                  required
                  value={name}
                  disabled={busy}
                  onChange={(event) => setName(event.target.value)}
                />
              </>
            ) : (
              <p>
                {action.type === 'delete'
                  ? `Delete “${action.template.name}”? This cannot be undone.`
                  : `Load “${action.template.name}”? This replaces the current setup for this workout mode.`}
              </p>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="template-actions">
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => setAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={action.type === 'delete' ? 'destructive' : 'default'}
                disabled={busy || (action.type === 'rename' && !name.trim())}
              >
                {busy
                  ? action.type === 'load'
                    ? 'Loading…'
                    : 'Saving…'
                  : action.type === 'load'
                    ? 'Load workout'
                    : action.type === 'delete'
                      ? 'Delete workout'
                      : 'Save name'}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
    </section>
  );
}
