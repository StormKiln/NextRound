import { useQueryClient } from '@tanstack/react-query';
import { useBlocker } from '@tanstack/react-router';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { setNativeNoteGuard, useNoteGuard } from './note-guard';
import { normalizeNote } from './note-text';
import { historyKey, mutateHistory, readHistory, type WorkoutResult } from './repository';

export function NoteEditor({
  result,
  onClose,
  onSaved,
}: {
  result: WorkoutResult;
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const [text, setText] = useState(result.note ?? '');
  const [expected, setExpected] = useState(result.note ?? '');
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [latest, setLatest] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [intent, setIntent] = useState<'close' | 'quit' | null>(null);
  const dirty = normalizeNote(text) !== expected;
  const count = Array.from(text).length;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || lock.current,
    enableBeforeUnload: dirty,
    withResolver: true,
  });
  useEffect(() => {
    let disposed = false;
    useNoteGuard.setState({ onQuit: () => setIntent('quit') });
    void setNativeNoteGuard(true)
      .then(() => {
        if (!disposed) setReady(true);
      })
      .catch((e) => {
        if (!disposed) setError(String(e));
      });
    return () => {
      disposed = true;
      useNoteGuard.setState({ onQuit: null });
      void setNativeNoteGuard(false).catch(() => {});
    };
  }, []);
  async function finish(quit = false, navigate = false) {
    await setNativeNoteGuard(false);
    useNoteGuard.setState({ onQuit: null });
    if (quit && isTauri()) {
      try {
        await invoke('quit_app');
      } catch (e) {
        useNoteGuard.setState({ onQuit: () => setIntent('quit') });
        await setNativeNoteGuard(true);
        throw e;
      }
    }
    if (navigate && blocker.status === 'blocked') blocker.proceed();
    onClose();
  }
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(String(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    const document = await mutateHistory({
      action: 'note',
      id: result.id,
      expectedNote: expected,
      note: text,
    });
    client.setQueryData(historyKey, document);
    setExpected(normalizeNote(text));
    onSaved();
  }
  function close() {
    if (lock.current) return;
    if (dirty) setIntent('close');
    else void run(() => finish());
  }
  const confirm = intent !== null || blocker.status === 'blocked';
  return (
    <>
      <Dialog title="Workout note" className="history-note-editor" onClose={close}>
        <div className="history-detail-body">
          <p>Keep observations for this saved session. Notes stay on this Mac.</p>
          <label htmlFor="workout-note">Workout note</label>
          <textarea
            id="workout-note"
            rows={7}
            value={text}
            disabled={!ready || busy}
            aria-describedby="note-limit"
            onChange={(e) => setText(e.target.value)}
          />
          <p id="note-limit" role="status">
            {count.toLocaleString()} / 2,000 characters
          </p>
          {count > 2000 && <p role="alert">Shorten your note to 2,000 characters before saving.</p>}
          {missing && (
            <p role="alert">
              This result no longer exists. Your text is kept here so you can copy it before
              closing.
            </p>
          )}
          {latest !== null && (
            <section aria-label="Latest saved note">
              <h3>Latest saved note</h3>
              <p className="history-note">{latest || 'No note saved.'}</p>
              <p>Your draft is unchanged. Save note will replace the note shown above.</p>
            </section>
          )}
          {error && !confirm && <p role="alert">{error}</p>}
        </div>
        <div className="dialog-actions">
          <Button
            variant="secondary"
            disabled={busy || !ready}
            onClick={() =>
              void run(async () => {
                const document = await readHistory();
                client.setQueryData(historyKey, document);
                const current = document.results.find((entry) => entry.id === result.id);
                setMissing(!current);
                if (current) {
                  setExpected(current.note ?? '');
                  setLatest(current.note ?? '');
                }
              })
            }
          >
            Refresh history
          </Button>
          <Button variant="ghost" disabled={busy} onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={busy || !ready || missing || count > 2000}
            onClick={() =>
              void run(async () => {
                await save();
                await finish();
              })
            }
          >
            {busy ? 'Working…' : 'Save note'}
          </Button>
        </div>
      </Dialog>
      {confirm && (
        <Dialog
          title="Unsaved workout note"
          onClose={() => {
            if (!lock.current) {
              setIntent(null);
              if (blocker.status === 'blocked') blocker.reset();
            }
          }}
        >
          <p>
            {dirty
              ? 'Save your note before leaving, discard your changes, or keep editing.'
              : 'Close the note editor before leaving?'}
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                setIntent(null);
                if (blocker.status === 'blocked') blocker.reset();
              }}
            >
              Keep editing
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void run(() => finish(intent === 'quit', blocker.status === 'blocked'))
              }
            >
              {dirty ? 'Discard changes' : 'Close editor'}
            </Button>
            {dirty && (
              <Button
                disabled={busy || !ready || missing || count > 2000}
                onClick={() =>
                  void run(async () => {
                    await save();
                    await finish(intent === 'quit', blocker.status === 'blocked');
                  })
                }
              >
                Save and continue
              </Button>
            )}
          </div>
        </Dialog>
      )}
    </>
  );
}
