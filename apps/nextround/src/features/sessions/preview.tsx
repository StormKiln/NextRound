import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutDetails } from '@/features/templates/workout-details';
import { useWorkout } from '@/state/workout';
import { useSessionEditor } from './editor';
import { sessionTimeLabel, type TrainingSession } from './model';
import { readTraining } from './repository';
import { useTraining } from './state';

export async function readSavedSession(id: string, expected?: TrainingSession) {
  const current = (await readTraining()).sessions.find((s) => s.id === id);
  if (!current) throw new Error('This session no longer exists. Refresh the library.');
  if (expected && JSON.stringify(current) !== JSON.stringify(expected))
    throw new Error('This session changed. Refresh and review it before trying again.');
  return structuredClone(current);
}
export function SessionPreview({
  id,
  onClose,
  onLoad,
}: {
  id: string;
  onClose: () => void;
  onLoad: (session: TrainingSession) => void;
}) {
  const [entry, setEntry] = useState<TrainingSession | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(false);
  const mounted = useRef(false);
  const ticket = useRef(0);
  const body = useRef<HTMLDivElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const run = useTraining((s) => s.run);
  const snapshot = useWorkout((s) => s.snapshot);
  const blocked = !!run || !!snapshot;
  const refresh = useCallback(async () => {
    const request = ++ticket.current;
    setBusy(true);
    setError('');
    setNotice('');
    setConfirm(false);
    setEntry(null);
    try {
      const current = await readSavedSession(id);
      if (mounted.current && request === ticket.current) setEntry(current);
    } catch (e) {
      if (mounted.current && request === ticket.current) setError(String(e));
    } finally {
      if (mounted.current && request === ticket.current) setBusy(false);
    }
  }, [id]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
      ticket.current++;
    };
  }, [refresh]);
  async function load() {
    if (!entry || busy || blocked) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const current = await readSavedSession(id);
      if (!mounted.current) return;
      if (JSON.stringify(current) !== JSON.stringify(entry)) {
        setEntry(current);
        setConfirm(false);
        setNotice('This session changed. Review the updated details before opening it.');
        body.current?.scrollTo(0, 0);
        return;
      }
      if (useTraining.getState().run || useWorkout.getState().snapshot)
        throw new Error('Finish the active workout before opening a session.');
      if (useSessionEditor.getState().draft.blocks.length && !confirm) {
        setConfirm(true);
        return;
      }
      onLoad(current);
      onClose();
    } catch (e) {
      if (mounted.current) {
        setError(String(e));
        setConfirm(false);
        body.current?.scrollTo(0, 0);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <Dialog
      title="Preview saved session"
      className="session-preview"
      onClose={onClose}
      initialFocus={close}
    >
      <div className="session-preview-body" ref={body} aria-busy={busy}>
        {busy && <p role="status">Reading saved session…</p>}
        {notice && <p role="status">{notice}</p>}
        {error && (
          <div role="alert">
            <p>{error}</p>
            <Button variant="secondary" onClick={() => void refresh()}>
              Retry preview
            </Button>
          </div>
        )}
        {entry && (
          <>
            <h3>{entry.name}</h3>
            <p>{sessionTimeLabel(entry)}</p>
            <p>Planned work only. Targets are not recorded performance.</p>
            {entry.blocks.map((block, index) => (
              <section
                key={block.id}
                className="session-preview-block"
                aria-label={`Block ${index + 1}: ${block.name}`}
              >
                <h3>
                  {index + 1}. {block.name}
                </h3>
                <WorkoutDetails config={block.config} />
                {index < entry.blocks.length - 1 ? (
                  <p>
                    After this block: {block.restSeconds}s recovery ·{' '}
                    {block.advance === 'ready' ? 'Wait until ready' : 'Advance automatically'}
                  </p>
                ) : (
                  <p>Final block — no transition recovery.</p>
                )}
              </section>
            ))}
          </>
        )}
      </div>
      {blocked && <p role="status">Finish the active workout before opening a session.</p>}
      {confirm && <p role="status">Opening this session replaces your current session draft.</p>}
      <div className="dialog-actions">
        <Button ref={close} variant="secondary" onClick={onClose}>
          Close preview
        </Button>
        {confirm && (
          <Button variant="secondary" onClick={() => setConfirm(false)}>
            Keep current draft
          </Button>
        )}
        <Button disabled={busy || !entry || !!error || blocked} onClick={() => void load()}>
          {confirm ? 'Replace current draft' : 'Open in editor'}
        </Button>
      </div>
    </Dialog>
  );
}
