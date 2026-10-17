import { useBlocker } from '@tanstack/react-router';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { setNativeNoteGuard, useNoteGuard } from '@/features/history/note-guard';

const guards = new Map<symbol, () => void>();
function syncGuards() {
  const onQuit = [...guards.values()].at(-1) ?? null;
  useNoteGuard.setState({ onQuit });
  return setNativeNoteGuard(!!onQuit);
}
export function useUnsavedChanges(dirty: boolean, busy: boolean) {
  const [intent, setIntent] = useState<(() => void) | null>(null);
  const [error, setError] = useState('');
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || busyRef.current,
    enableBeforeUnload: dirty || busy,
    withResolver: true,
  });
  useEffect(() => {
    if (!dirty && !busy) return;
    const key = Symbol();
    const onQuit = () =>
      setIntent(() => () => {
        void setNativeNoteGuard(false)
          .then(() => (isTauri() ? invoke('quit_app') : undefined))
          .catch((e) => setError(String(e)));
      });
    guards.set(key, onQuit);
    void syncGuards().catch((e) => setError(String(e)));
    return () => {
      guards.delete(key);
      void syncGuards().catch(() => {});
    };
  }, [dirty, busy]);
  const cancel = () => {
    if (busy) return;
    setIntent(null);
    if (blocker.status === 'blocked') blocker.reset();
  };
  return {
    request: (action: () => void) => {
      if (busy) return;
      if (dirty) setIntent(() => action);
      else action();
    },
    confirmation: (intent || blocker.status === 'blocked') && (
      <Dialog title="Unsaved changes" onClose={cancel}>
        <p>Your changes have not been saved. Keep editing, or discard them to continue.</p>
        {error && <p role="alert">{error}</p>}
        <div className="dialog-actions">
          <Button variant="secondary" disabled={busy} onClick={cancel}>
            Keep editing
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => {
              const action = intent;
              setIntent(null);
              if (blocker.status === 'blocked') blocker.proceed();
              else action?.();
            }}
          >
            Discard changes
          </Button>
        </div>
      </Dialog>
    ),
  };
}
