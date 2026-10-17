import { validateConfig } from '@nextround/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { create } from 'zustand';
import { Button } from '@/components/ui/button';
import { readTemplates } from '@/features/templates/repository';
import { WorkoutDetails } from '@/features/templates/workout-details';
import { useWorkout, type WorkoutMode } from '@/state/workout';
import { parseSession, sessionTimeLabel, type TrainingBlock, type TrainingSession } from './model';
import { useTrainingOwnership } from './ownership';
import { mutateTraining, trainingKey } from './repository';
import { useTraining } from './state';
import './session.css';
export const modes: {
  mode: WorkoutMode;
  label: string;
  path: '/emom' | '/countdown' | '/intervals' | '/amrap' | '/for-time' | '/ladder';
}[] = [
  { mode: 'emom', label: 'EMOM', path: '/emom' },
  { mode: 'countdown', label: 'Countdown', path: '/countdown' },
  { mode: 'intervals', label: 'Intervals', path: '/intervals' },
  { mode: 'amrap', label: 'AMRAP', path: '/amrap' },
  { mode: 'forTime', label: 'For Time', path: '/for-time' },
  { mode: 'ladder', label: 'Ladder', path: '/ladder' },
];
const fresh = (): TrainingSession => ({
  id: crypto.randomUUID(),
  name: 'My training session',
  blocks: [],
});
export const useSessionEditor = create<{
  draft: TrainingSession;
  editing: { id: string; mode: WorkoutMode } | null;
  source: TrainingSession | null;
  undo: TrainingSession | null;
}>(() => ({ draft: fresh(), editing: null, source: null, undo: null }));
export function openSession(session?: TrainingSession) {
  useTrainingOwnership.setState({ editing: false });
  useSessionEditor.setState({
    draft: session ? structuredClone(session) : fresh(),
    source: session ? structuredClone(session) : null,
    editing: null,
    undo: null,
  });
}
function change(update: (session: TrainingSession) => void) {
  const draft = structuredClone(useSessionEditor.getState().draft);
  update(draft);
  useSessionEditor.setState({ undo: useSessionEditor.getState().draft, draft });
}
export function BlockCapture() {
  const edit = useSessionEditor((s) => s.editing);
  const navigate = useNavigate();
  const pathname = useLocation({ select: (l) => l.pathname });
  const [error, setError] = useState('');
  if (!edit) return null;
  const mode = modes.find((m) => m.mode === edit.mode)!;
  return (
    <aside className="block-capture" aria-label="Session block editor">
      <strong>Editing a {mode.label} block</strong>
      <p>Adjust the workout below, then add it to your session.</p>
      {error && <p role="alert">{error}</p>}
      <div className="dialog-actions">
        <Button
          variant="secondary"
          onClick={() => {
            useSessionEditor.setState({ editing: null });
            useTrainingOwnership.setState({ editing: false });
            void navigate({ to: '/sessions' });
          }}
        >
          Cancel block edit
        </Button>
        <Button
          disabled={pathname !== mode.path}
          onClick={() => {
            try {
              const config = useWorkout.getState().getDraftConfig(edit.mode);
              const errors = validateConfig(config);
              if (Object.keys(errors).length) throw new Error(Object.values(errors).join(' '));
              change((d) => {
                const old = d.blocks.find((b) => b.id === edit.id);
                if (old) old.config = structuredClone(config);
                else
                  d.blocks.push({
                    id: edit.id,
                    name: mode.label,
                    config: structuredClone(config),
                    restSeconds: 0,
                    advance: 'automatic',
                  });
              });
              useSessionEditor.setState({ editing: null });
              useTrainingOwnership.setState({ editing: false });
              setError('');
              void navigate({ to: '/sessions' });
            } catch (e) {
              setError(String(e));
            }
          }}
        >
          Use this block
        </Button>
      </div>
    </aside>
  );
}
export function SessionEditor() {
  const { draft, source, undo } = useSessionEditor();
  const dragging = useRef<string | null>(null);
  const focusInvalid = () => {
    const input = document.querySelector<HTMLInputElement>(
      '.session-editor input[aria-invalid="true"]',
    );
    input?.focus();
    input?.scrollIntoView({ block: 'center' });
  };
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const training = useTraining();
  const templates = useQuery({
    queryKey: ['workout-templates'],
    queryFn: readTemplates,
    retry: false,
  });
  const edit = (mode: WorkoutMode, block?: TrainingBlock) => {
    if (block && !useWorkout.getState().loadConfig(block.config)) return;
    useSessionEditor.setState({ editing: { id: block?.id ?? crypto.randomUUID(), mode } });
    useTrainingOwnership.setState({ editing: true });
    void navigate({ to: modes.find((m) => m.mode === mode)!.path });
  };
  const move = (i: number, delta: number) =>
    change((d) => {
      [d.blocks[i], d.blocks[i + delta]] = [d.blocks[i + delta], d.blocks[i]];
    });
  return (
    <main className="page session-editor">
      <div className="page-heading">
        <div>
          <h1>Build your training session</h1>
          <p>Warm up, work, recover. Put the whole session in order.</p>
        </div>
        <Button variant="ghost" onClick={() => void navigate({ to: '/' })}>
          Home
        </Button>
      </div>
      <label>
        Session name
        <input
          className="input"
          aria-invalid={!draft.name.trim()}
          value={draft.name}
          maxLength={120}
          onChange={(e) =>
            change((d) => {
              d.name = e.target.value;
            })
          }
        />
      </label>
      {draft.blocks.length > 0 && <p>{sessionTimeLabel(draft)}</p>}
      <ol className="session-blocks" aria-label="Session blocks">
        {draft.blocks.map((b, i) => (
          <li key={b.id}>
            <div className="block-heading">
              <span className="block-number">{i + 1}</span>
              <Button
                variant="ghost"
                draggable
                aria-label={`Drag block ${i + 1}`}
                onDragStart={(event) => {
                  dragging.current = b.id;
                  event.dataTransfer.setData('text/plain', b.id);
                  event.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  dragging.current = null;
                }}
                onDragOver={(event) => {
                  if (dragging.current) {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = draft.blocks.findIndex((block) => block.id === dragging.current);
                  if (from >= 0 && from !== i) {
                    change((d) => {
                      const [block] = d.blocks.splice(from, 1);
                      d.blocks.splice(i, 0, block);
                    });
                    setNotice(`Moved block to position ${i + 1}`);
                  }
                  dragging.current = null;
                }}
              >
                Drag to reorder
              </Button>
              <h2>{b.name}</h2>
              <span className="muted">
                {modes.find((m) => m.mode === (b.config.type ?? 'emom'))?.label}
              </span>
            </div>
            <label>
              Block {i + 1} name
              <input
                className="input"
                aria-invalid={!b.name.trim()}
                value={b.name}
                maxLength={120}
                onChange={(e) =>
                  change((d) => {
                    d.blocks[i].name = e.target.value;
                  })
                }
              />
            </label>
            <details>
              <summary>Preview exercises, targets and timing</summary>
              <WorkoutDetails config={b.config} />
            </details>
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => edit(b.config.type ?? 'emom', b)}>
                Edit block {i + 1}
              </Button>
              <Button
                variant="ghost"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                aria-label={`Move block ${i + 1} up`}
              >
                Move up
              </Button>
              <Button
                variant="ghost"
                disabled={i === draft.blocks.length - 1}
                onClick={() => move(i, 1)}
                aria-label={`Move block ${i + 1} down`}
              >
                Move down
              </Button>
              <Button
                variant="ghost"
                disabled={draft.blocks.length >= 20}
                onClick={() =>
                  change((d) => {
                    d.blocks.splice(i + 1, 0, {
                      ...structuredClone(b),
                      id: crypto.randomUUID(),
                      name: `${b.name.slice(0, 110)} copy`,
                    });
                  })
                }
              >
                Duplicate block {i + 1}
              </Button>
              <Button
                variant="ghost"
                onClick={() =>
                  change((d) => {
                    d.blocks.splice(i, 1);
                  })
                }
              >
                Remove block {i + 1}
              </Button>
            </div>
            {i < draft.blocks.length - 1 && (
              <div className="block-transition">
                <label>
                  Rest after block {i + 1} (seconds)
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="3600"
                    aria-invalid={
                      !Number.isInteger(b.restSeconds) || b.restSeconds < 0 || b.restSeconds > 3600
                    }
                    value={Number.isNaN(b.restSeconds) ? '' : b.restSeconds}
                    onChange={(e) =>
                      change((d) => {
                        d.blocks[i].restSeconds =
                          e.target.value === '' ? Number.NaN : Number(e.target.value);
                      })
                    }
                  />
                </label>
                <label>
                  After rest
                  <select
                    value={b.advance}
                    onChange={(e) =>
                      change((d) => {
                        d.blocks[i].advance = e.target.value as TrainingBlock['advance'];
                      })
                    }
                  >
                    <option value="automatic">Start next block automatically</option>
                    <option value="ready">Wait until I am ready</option>
                  </select>
                </label>
              </div>
            )}
          </li>
        ))}
      </ol>
      <section className="session-add">
        <h2>Add a workout block</h2>
        <div className="dialog-actions">
          {modes.map((m) => (
            <Button
              key={m.mode}
              variant="secondary"
              disabled={draft.blocks.length >= 20}
              onClick={() => edit(m.mode)}
            >
              Add {m.label} block
            </Button>
          ))}
        </div>
        {templates.error && (
          <p role="alert">
            Saved workouts unavailable.{' '}
            <Button variant="ghost" onClick={() => void templates.refetch()}>
              Retry saved workouts
            </Button>
          </p>
        )}
        {!!templates.data?.templates.length && (
          <label>
            Or use a saved workout
            <select
              value=""
              disabled={draft.blocks.length >= 20}
              onChange={(e) => {
                const t = templates.data.templates.find((t) => t.id === e.target.value);
                if (t)
                  change((d) => {
                    d.blocks.push({
                      id: crypto.randomUUID(),
                      name: t.name,
                      config: structuredClone(t.config),
                      restSeconds: 0,
                      advance: 'automatic',
                    });
                  });
              }}
            >
              <option value="">Choose a saved workout</option>
              {templates.data.templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="muted">
          Up to 20 blocks. Saved workouts are copied; editing the original will not change this
          session.
        </p>
      </section>
      <footer className="session-footer">
        {(error || training.error) && <p role="alert">{error || training.error}</p>}
        {notice && <p role="status">{notice}</p>}
        <div className="dialog-actions">
          <Button
            variant="ghost"
            disabled={!undo}
            onClick={() => useSessionEditor.setState({ draft: undo!, undo: null })}
          >
            Undo last edit
          </Button>
          <Button
            variant="secondary"
            disabled={busy || !draft.blocks.length}
            onClick={async () => {
              setBusy(true);
              setError('');
              try {
                const parsed = parseSession(draft);
                await mutateTraining((doc) => {
                  const i = doc.sessions.findIndex((s) => s.id === parsed.id);
                  if (i >= 0) {
                    if (JSON.stringify(doc.sessions[i]) !== JSON.stringify(source))
                      throw new Error('This session changed. Reopen it before saving.');
                    doc.sessions[i] = parsed;
                  } else doc.sessions.push(parsed);
                });
                useSessionEditor.setState({ draft: parsed, source: parsed });
                await queryClient.invalidateQueries({ queryKey: trainingKey });
                setNotice('Session saved');
              } catch (e) {
                setError(String(e));
                focusInvalid();
              } finally {
                setBusy(false);
              }
            }}
          >
            Save session
          </Button>
          <Button
            disabled={busy || training.busy || !!training.run || !draft.blocks.length}
            onClick={async () => {
              setError('');
              try {
                const parsed = parseSession(draft);
                if (await training.start(parsed)) void navigate({ to: '/session-run' });
              } catch (e) {
                setError(String(e));
                focusInvalid();
              }
            }}
          >
            Start session
          </Button>
        </div>
      </footer>
    </main>
  );
}
