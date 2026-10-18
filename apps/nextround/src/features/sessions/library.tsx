import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { useTemplateFilters } from '@/features/templates/filter-state';
import { sortLibrary } from '@/features/templates/library-sort';
import { availableTransferName } from '@/features/templates/portable-collection';
import { readTemplates } from '@/features/templates/repository';
import { normalizeSearch } from '@/lib/search';
import { useWorkout } from '@/state/workout';
import { hasSessionDraft, openSession } from './editor';
import { JsonPicker, saveJson } from './files';
import { parseSession, sessionSeconds, sessionTimeLabel, type TrainingSession } from './model';
import { encodeSession, independentSession, parseSessionFile } from './portable';
import { readSavedSession, SessionPreview } from './preview';
import { mutateTraining, readTraining, trainingKey } from './repository';
import { useTraining } from './state';
export function SessionLibrary() {
  const query = useQuery({ queryKey: trainingKey, queryFn: readTraining, retry: false });
  const templates = useQuery({
    queryKey: ['workout-templates'],
    queryFn: readTemplates,
    retry: false,
  });
  const client = useQueryClient();
  const navigate = useNavigate();
  const filters = useTemplateFilters();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const origin = useRef<HTMLElement | null>(null);
  const activeRun = useTraining((s) => s.run);
  const activeWorkout = useWorkout((s) => s.snapshot);
  const fresh = query.isSuccess && !query.isFetching;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const affectedMutation = useRef<string | null>(null);
  const [affectedId, setAffectedId] = useState<string | null>(null);
  const [revealId, setRevealId] = useState<string | null>(null);
  const cards = useRef(new Map<string, HTMLElement>());
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<{
    kind: 'rename' | 'delete' | 'collections';
    session: TrainingSession;
  } | null>(null);
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<TrainingSession | null>(null);
  const collectionsReady = templates.isSuccess && !templates.isFetching;
  const all = query.data?.sessions ?? [];
  const sessions = sortLibrary(
    all.filter((s) => {
      const seconds = sessionSeconds(s);
      return (
        (!filters.favouritesOnly || s.favourite) &&
        (!filters.search ||
          normalizeSearch(
            [
              s.name,
              ...s.blocks.flatMap((b) => [
                b.name,
                ...(b.config.exercises ?? []).map((e) => e.name + ' ' + (e.description ?? '')),
              ]),
            ].join(' '),
          ).includes(normalizeSearch(filters.search))) &&
        (filters.workoutType === 'all' ||
          s.blocks.some((b) => (b.config.type ?? 'emom') === filters.workoutType)) &&
        (filters.collection === 'all' ||
          (filters.collection === 'unfiled'
            ? collectionsReady &&
              !s.collections?.some((id) => templates.data?.collections.some((c) => c.id === id))
            : s.collections?.includes(filters.collection))) &&
        (filters.budgetMinutes === null ||
          (seconds !== null && seconds <= filters.budgetMinutes * 60))
      );
    }),
    filters.sort,
    sessionSeconds,
  );
  const affected = all.find((s) => s.id === affectedId);
  const hidden = !!affected && !sessions.some((s) => s.id === affected.id);
  useEffect(() => {
    if (!revealId || !fresh) return;
    const card = cards.current.get(revealId);
    if (card) {
      card.focus();
      card.scrollIntoView({ block: 'nearest' });
      setRevealId(null);
    }
  }, [revealId, fresh]);
  function remember(event: React.MouseEvent<HTMLButtonElement>) {
    origin.current = event.currentTarget;
    event.currentTarget.focus();
  }
  function closePreview() {
    setPreviewId(null);
    origin.current?.focus();
  }
  async function perform(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    setNotice('');
    setAffectedId(null);
    affectedMutation.current = null;
    try {
      if ((await fn()) === false) return false;
      await client.invalidateQueries({ queryKey: trainingKey });
      setAffectedId(affectedMutation.current);
      setNotice(message);
      setAction(null);
      return true;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function mutate(session: TrainingSession, change: (s: TrainingSession) => void) {
    await mutateTraining((d) => {
      const current = d.sessions.find((s) => s.id === session.id);
      if (!current || JSON.stringify(current) !== JSON.stringify(session))
        throw new Error('This session changed. Refresh and try again.');
      change(current);
    });
    affectedMutation.current = session.id;
  }
  return (
    <section className="session-library" aria-label="Saved training sessions">
      <div className="block-heading">
        <h2>Saved training sessions</h2>
        <Button
          variant="secondary"
          disabled={busy || !fresh}
          onClick={() => {
            setImporting(true);
            setError('');
            setPreview(null);
          }}
        >
          Import session
        </Button>
      </div>
      <p className="muted">
        Filters above apply to workouts and sessions. A workout type matches sessions containing
        that type.
      </p>
      <div className="library-filter-summary">
        {fresh && (filters.collection === 'all' || collectionsReady) && (
          <p role="status">
            {sessions.length} of {all.length} sessions
          </p>
        )}
        {(filters.search ||
          filters.favouritesOnly ||
          filters.workoutType !== 'all' ||
          filters.collection !== 'all' ||
          filters.budgetMinutes !== null ||
          filters.budgetDraft ||
          filters.budgetError) && (
          <Button variant="secondary" onClick={filters.reset}>
            Clear library filters
          </Button>
        )}
      </div>
      {query.isPending && <p role="status">Loading sessions…</p>}
      {!fresh && all.length > 0 && (
        <p role="status">
          Cached sessions may be out of date. Refresh successfully before using library actions.
        </p>
      )}
      {query.error && (
        <p role="alert">
          {String(query.error)}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry sessions
          </Button>
        </p>
      )}
      {error && !action && !importing && <p role="alert">{error}</p>}
      {notice && (
        <div className="library-filter-summary">
          <p role="status">
            {notice}
            {affected ? ` “${affected.name}”` : ''}
            {fresh && (filters.collection === 'all' || collectionsReady) && hidden
              ? ' is hidden by your current library filters.'
              : ''}
          </p>
          {fresh && hidden && (filters.collection === 'all' || collectionsReady) && (
            <Button
              variant="secondary"
              onClick={() => {
                filters.reset();
                setRevealId(affected!.id);
              }}
            >
              Show session — clear library filters
            </Button>
          )}
        </div>
      )}
      {!collectionsReady && (
        <div role={templates.isError ? 'alert' : 'status'}>
          <p>
            {templates.isError
              ? 'Collection information could not be loaded.'
              : 'Loading collections…'}{' '}
            Collection filters and editing need a successful read.
          </p>
          {templates.isError && (
            <Button onClick={() => void templates.refetch()}>Retry collections</Button>
          )}
        </div>
      )}
      {fresh && (filters.collection === 'all' || collectionsReady) && !sessions.length && (
        <p>
          {all.length
            ? 'No sessions match your filters.'
            : 'Build a session to save your complete routine here.'}
        </p>
      )}
      <div className="session-cards">
        {sessions.map((s) => (
          <article
            key={s.id}
            className="session-card"
            tabIndex={-1}
            ref={(node) => {
              if (node) cards.current.set(s.id, node);
              else cards.current.delete(s.id);
            }}
          >
            <h3>{s.name}</h3>
            <p>
              {s.blocks.length} workout {s.blocks.length === 1 ? 'block' : 'blocks'}
            </p>
            <p>{sessionTimeLabel(s)}</p>
            <p>{s.blocks.map((b) => b.name).join(' → ')}</p>
            <p>
              {!collectionsReady
                ? templates.isError
                  ? 'Collections unavailable'
                  : 'Loading collections…'
                : s.collections
                    ?.map((id) => templates.data?.collections.find((c) => c.id === id)?.name)
                    .filter(Boolean)
                    .join(', ') || 'Unfiled'}
            </p>
            <div className="library-card-actions">
              <fieldset className="library-primary-actions" aria-label={`Use ${s.name}`}>
                <Button
                  variant="secondary"
                  disabled={busy || !fresh}
                  onClick={(event) => {
                    remember(event);
                    setPreviewId(s.id);
                  }}
                  aria-label={`Preview ${s.name}`}
                >
                  Preview
                </Button>
                <Button
                  aria-label={`Open ${s.name}`}
                  disabled={busy || !fresh || !!activeRun || !!activeWorkout}
                  onClick={(event) => {
                    remember(event);
                    void perform(async () => {
                      const current = await readSavedSession(s.id, s);
                      if (useTraining.getState().run || useWorkout.getState().snapshot)
                        throw new Error('Finish the active workout before opening a session.');
                      if (hasSessionDraft()) setPreviewId(s.id);
                      else {
                        openSession(current);
                        void navigate({ to: '/sessions' });
                      }
                    }, '');
                  }}
                >
                  Open
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || !fresh}
                  aria-pressed={!!s.favourite}
                  onClick={() =>
                    void perform(
                      () =>
                        mutate(s, (current) => {
                          current.favourite = !current.favourite;
                        }),
                      'Session favourite updated.',
                    )
                  }
                >
                  {s.favourite ? '★ Favourite' : '☆ Favourite'}
                </Button>
              </fieldset>
              <fieldset className="library-secondary-actions" aria-label={`Manage ${s.name}`}>
                <Button
                  variant="ghost"
                  disabled={busy || !fresh}
                  onClick={() =>
                    void perform(
                      () =>
                        mutateTraining((d) => {
                          const current = d.sessions.find((item) => item.id === s.id);
                          if (!current)
                            throw new Error('This session no longer exists. Refresh the library.');
                          if (JSON.stringify(current) !== JSON.stringify(s))
                            throw new Error(
                              'This session changed. Refresh and review it before trying again.',
                            );
                          const copy = independentSession(current);
                          copy.name = availableTransferName(
                            s.name,
                            d.sessions.map((s) => s.name),
                            120,
                          );
                          copy.collections = s.collections;
                          d.sessions.push(copy);
                          affectedMutation.current = copy.id;
                        }),
                      'Independent session copy saved.',
                    )
                  }
                >
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !fresh}
                  onClick={(event) => {
                    remember(event);
                    setAction({ kind: 'rename', session: s });
                    setName(s.name);
                    setError('');
                  }}
                >
                  Rename
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !fresh}
                  onClick={(event) => {
                    remember(event);
                    setAction({ kind: 'collections', session: s });
                    setGroups(s.collections ?? []);
                    setError('');
                  }}
                >
                  Collections
                </Button>
                <Button
                  variant="ghost"
                  disabled={busy || !fresh}
                  onClick={() =>
                    void perform(async () => {
                      const current = await readSavedSession(s.id, s);
                      const saved = await saveJson(
                        encodeSession(current),
                        'NextRound-session.json',
                      );
                      return saved;
                    }, 'Session exported.')
                  }
                >
                  Export session
                </Button>
                <Button
                  variant="destructive"
                  disabled={busy || !fresh}
                  onClick={(event) => {
                    remember(event);
                    setAction({ kind: 'delete', session: s });
                    setError('');
                  }}
                >
                  Delete
                </Button>
              </fieldset>
            </div>
          </article>
        ))}
      </div>
      {previewId && (
        <SessionPreview
          id={previewId}
          onClose={closePreview}
          onLoad={(current) => {
            openSession(current);
            void navigate({ to: '/sessions' });
          }}
        />
      )}
      {action && (
        <Dialog
          title={
            action.kind === 'delete'
              ? 'Delete session?'
              : action.kind === 'rename'
                ? 'Rename session'
                : 'Session collections'
          }
          className="session-management"
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
          <div className="dialog-scroll-body">
            {action.kind === 'delete' ? (
              <p>Remove {action.session.name} from the saved library? Saved results are kept.</p>
            ) : action.kind === 'rename' ? (
              <label>
                Session name
                <input
                  className="input"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            ) : (
              <>
                {!collectionsReady ? (
                  <div role={templates.isError ? 'alert' : 'status'}>
                    <p>
                      {templates.isError
                        ? 'Collections unavailable. Retry before editing membership.'
                        : 'Loading collections…'}
                    </p>
                    {templates.isError && (
                      <Button onClick={() => void templates.refetch()}>Retry collections</Button>
                    )}
                  </div>
                ) : templates.data?.collections.length ? (
                  templates.data.collections.map((c) => (
                    <label className="membership-option" key={c.id}>
                      <input
                        type="checkbox"
                        checked={groups.includes(c.id)}
                        onChange={(e) =>
                          setGroups(
                            e.target.checked
                              ? [...groups, c.id]
                              : groups.filter((id) => id !== c.id),
                          )
                        }
                      />
                      {c.name}
                    </label>
                  ))
                ) : (
                  <p>Create a collection using Manage collections in the saved-workout library.</p>
                )}
              </>
            )}
            {action.kind === 'collections' &&
              collectionsReady &&
              groups.some((id) => !templates.data?.collections.some((c) => c.id === id)) && (
                <div role="alert">
                  <p>
                    Some saved collections no longer exist. Remove their unavailable memberships
                    before saving.
                  </p>
                  <Button
                    disabled={busy}
                    variant="secondary"
                    onClick={() =>
                      setGroups(
                        groups.filter((id) => templates.data?.collections.some((c) => c.id === id)),
                      )
                    }
                  >
                    Remove unavailable memberships
                  </Button>
                </div>
              )}
            {error && <p role="alert">{error}</p>}
          </div>
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy || (action.kind === 'collections' && !collectionsReady)}
              onClick={() =>
                void perform(
                  async () => {
                    if (action.kind === 'collections') {
                      const latest = await readTemplates();
                      if (
                        !collectionsReady ||
                        JSON.stringify(latest.collections) !==
                          JSON.stringify(templates.data?.collections) ||
                        groups.some((id) => !latest.collections.some((c) => c.id === id))
                      ) {
                        await client.invalidateQueries({ queryKey: ['workout-templates'] });
                        throw new Error(
                          'Collections changed. Review the current choices and retry.',
                        );
                      }
                    }
                    if (action.kind === 'delete')
                      await mutateTraining((d) => {
                        const current = d.sessions.find((s) => s.id === action.session.id);
                        if (JSON.stringify(current) !== JSON.stringify(action.session))
                          throw new Error('Session changed. Refresh before deleting.');
                        d.sessions = d.sessions.filter((s) => s.id !== action.session.id);
                      });
                    else
                      await mutate(action.session, (current) => {
                        if (action.kind === 'rename')
                          current.name = parseSession({ ...current, name }).name;
                        else current.collections = groups;
                      });
                  },
                  action.kind === 'delete' ? 'Session deleted.' : 'Session updated.',
                )
              }
            >
              {action.kind === 'delete' ? 'Delete session' : 'Save changes'}
            </Button>
          </div>
        </Dialog>
      )}
      {importing && (
        <Dialog
          title="Import training session"
          className="session-dialog"
          onClose={() => {
            if (!busy) setImporting(false);
          }}
        >
          <JsonPicker
            onError={setError}
            onRead={(raw) => {
              try {
                const s = parseSessionFile(raw);
                setPreview(s);
                setName(
                  availableTransferName(
                    s.name,
                    all.map((s) => s.name),
                    120,
                  ),
                );
                setError('');
              } catch (e) {
                setPreview(null);
                setError(String(e));
              }
            }}
          />
          {preview && (
            <>
              <label>
                Imported session name
                <input
                  className="input"
                  value={name}
                  maxLength={120}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <p>{sessionTimeLabel(preview)}</p>
              <ol>
                {preview.blocks.map((b) => (
                  <li key={b.id}>
                    {b.name} · {b.config.type ?? 'EMOM'} ·{' '}
                    {b.config.exercises?.map((e) => e.name).join(', ') || 'No exercise list'}
                  </li>
                ))}
              </ol>
              <p>Adds an independent copy. History, actuals and preferences are not included.</p>
            </>
          )}
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => setImporting(false)}>
              Cancel
            </Button>
            <Button
              disabled={!preview || busy}
              onClick={async () => {
                if (
                  await perform(
                    () =>
                      mutateTraining((d) => {
                        if (
                          d.sessions.some((s) => normalizeSearch(s.name) === normalizeSearch(name))
                        )
                          throw new Error('A session with this name already exists.');
                        const copy = independentSession({ ...preview!, name });
                        d.sessions.push(copy);
                        affectedMutation.current = copy.id;
                      }),
                    'Session imported.',
                  )
                )
                  setImporting(false);
              }}
            >
              Add session
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
