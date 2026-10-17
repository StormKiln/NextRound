import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { useTemplateFilters } from '@/features/templates/filter-state';
import { availableTransferName } from '@/features/templates/portable-collection';
import { readTemplates } from '@/features/templates/repository';
import { normalizeSearch } from '@/lib/search';
import { openSession } from './editor';
import { JsonPicker, saveJson } from './files';
import { parseSession, sessionSeconds, sessionTimeLabel, type TrainingSession } from './model';
import { encodeSession, independentSession, parseSessionFile } from './portable';
import { mutateTraining, readTraining, trainingKey } from './repository';
export function SessionLibrary() {
  const query = useQuery({ queryKey: trainingKey, queryFn: readTraining, retry: false });
  const templates = useQuery({ queryKey: ['workout-templates'], queryFn: readTemplates });
  const client = useQueryClient();
  const navigate = useNavigate();
  const filters = useTemplateFilters();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<{
    kind: 'rename' | 'delete' | 'collections';
    session: TrainingSession;
  } | null>(null);
  const [name, setName] = useState('');
  const [groups, setGroups] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<TrainingSession | null>(null);
  const all = query.data?.sessions ?? [];
  const sessions = all.filter((s) => {
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
          ? !s.collections?.some((id) => templates.data?.collections.some((c) => c.id === id))
          : s.collections?.includes(filters.collection))) &&
      (filters.budgetMinutes === null ||
        (seconds !== null && seconds <= filters.budgetMinutes * 60))
    );
  });
  async function perform(fn: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await client.invalidateQueries({ queryKey: trainingKey });
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
  }
  return (
    <section className="session-library" aria-label="Saved training sessions">
      <div className="block-heading">
        <h2>Saved training sessions</h2>
        <Button
          variant="secondary"
          disabled={busy}
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
        Sessions follow the saved-workout filters above. A workout type matches sessions containing
        that type.
      </p>
      {query.isPending && <p role="status">Loading sessions…</p>}
      {query.error && (
        <p role="alert">
          {String(query.error)}
          <Button variant="ghost" onClick={() => void query.refetch()}>
            Retry sessions
          </Button>
        </p>
      )}
      {error && !action && !importing && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!query.isPending && !query.error && !sessions.length && (
        <p>
          {all.length
            ? 'No sessions match your filters.'
            : 'Build a session to save your complete routine here.'}
        </p>
      )}
      <div className="session-cards">
        {sessions.map((s) => (
          <article key={s.id} className="session-card">
            <h3>{s.name}</h3>
            <p>{s.blocks.length} workout blocks</p>
            <p>{sessionTimeLabel(s)}</p>
            <p>{s.blocks.map((b) => b.name).join(' → ')}</p>
            <p>
              {s.collections
                ?.map((id) => templates.data?.collections.find((c) => c.id === id)?.name)
                .filter(Boolean)
                .join(', ') || 'Unfiled'}
            </p>
            <div className="dialog-actions">
              <Button
                disabled={busy}
                onClick={() => {
                  openSession(s);
                  void navigate({ to: '/sessions' });
                }}
              >
                Open {s.name}
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
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
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void perform(
                    () =>
                      mutateTraining((d) => {
                        const copy = independentSession(s);
                        copy.name = availableTransferName(
                          s.name,
                          d.sessions.map((s) => s.name),
                          120,
                        );
                        copy.collections = s.collections;
                        d.sessions.push(copy);
                      }),
                    'Independent session copy saved.',
                  )
                }
              >
                Duplicate
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAction({ kind: 'rename', session: s });
                  setName(s.name);
                  setError('');
                }}
              >
                Rename
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAction({ kind: 'collections', session: s });
                  setGroups(s.collections ?? []);
                  setError('');
                }}
              >
                Collections
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const saved = await saveJson(encodeSession(s), 'NextRound-session.json');
                    if (!saved) throw new Error('Export cancelled. Your session is unchanged.');
                  }, 'Session exported.')
                }
              >
                Export session
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  setAction({ kind: 'delete', session: s });
                  setError('');
                }}
              >
                Delete
              </Button>
            </div>
          </article>
        ))}
      </div>
      {action && (
        <Dialog
          title={
            action.kind === 'delete'
              ? 'Delete session?'
              : action.kind === 'rename'
                ? 'Rename session'
                : 'Session collections'
          }
          onClose={() => {
            if (!busy) setAction(null);
          }}
        >
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
              {templates.data?.collections.length ? (
                templates.data.collections.map((c) => (
                  <label key={c.id}>
                    <input
                      type="checkbox"
                      checked={groups.includes(c.id)}
                      onChange={(e) =>
                        setGroups(
                          e.target.checked ? [...groups, c.id] : groups.filter((id) => id !== c.id),
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
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                void perform(
                  async () => {
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
                        d.sessions.push(independentSession({ ...preview!, name }));
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
