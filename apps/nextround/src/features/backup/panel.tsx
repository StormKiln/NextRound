import { type ReactNode, useEffect, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { JsonPicker, saveJson } from '../sessions/files';
import { type Backup, parseBackup } from './model';
import { exportBackup, recoverRestore, restoreBackup, rollbackBackup } from './repository';
export function BackupPanel() {
  const [preview, setPreview] = useState<Backup | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="actual-editor">
      <h3>Backup and restore</h3>
      <p>
        Keep a complete local copy of your saved workouts, sessions, exercises, history, actuals,
        collections and preferences.
      </p>
      <p>
        Backup files contain private training data and notes. They are not encrypted; store them
        somewhere you trust.
      </p>
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const backup = await exportBackup();
            const saved = await saveJson(
              JSON.stringify(backup, null, 2),
              'NextRound-backup.json',
              true,
            );
            setNotice(saved ? 'Backup exported.' : 'Export cancelled. No data changed.');
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Export full backup
      </Button>
      <h4>Restore a backup</h4>
      <p>
        Review the file before replacing local data. The app keeps a rollback copy of the data
        present before each restore.
      </p>
      <JsonPicker
        backup
        onError={setError}
        onRead={(raw) => {
          try {
            setPreview(parseBackup(raw));
            setError('');
          } catch (e) {
            setPreview(null);
            setError(String(e));
          }
        }}
      />
      <Button
        variant="secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            setPreview(await rollbackBackup());
          } catch (e) {
            setError(String(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Review previous restore copy
      </Button>
      {error && !preview && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {preview && (
        <Dialog
          title="Replace local training data?"
          className="session-dialog"
          onClose={() => {
            if (!busy) setPreview(null);
          }}
        >
          <div className="actual-editor">
            <p>Backup created {new Date(preview.createdAt).toLocaleString()}.</p>
            <ul>
              <li>
                {preview.data.templates.templates.length} saved workouts and{' '}
                {preview.data.training.sessions.length} saved sessions
              </li>
              <li>{preview.data.templates.collections.length} collections</li>
              <li>
                {preview.data.personal.exercises.length} personal exercises (including archived)
              </li>
              <li>
                {preview.data.history.results.length} single-workout results and{' '}
                {preview.data.training.results.length} session results
              </li>
              <li>Actual performance, favourites, equipment and preferences</li>
            </ul>
            <p>
              This replaces the supported local dataset, including newer results and notes. A
              rollback copy is kept. NextRound reloads after the restore.
            </p>
            {error && <p role="alert">{error}</p>}
            <div className="dialog-actions">
              <Button variant="ghost" disabled={busy} onClick={() => setPreview(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError('');
                  try {
                    await restoreBackup(preview);
                  } catch (e) {
                    setError(String(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Replace data and reload
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </section>
  );
}
let recovery: Promise<void> | undefined;
export function BackupBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    void retry;
    let active = true;
    recovery ??= recoverRestore();
    void recovery
      .then(() => {
        if (active) setReady(true);
      })
      .catch((e) => {
        recovery = undefined;
        if (active) setError(String(e));
      });
    return () => {
      active = false;
    };
  }, [retry]);
  if (!ready)
    return (
      <main className="page">
        <h1>{error ? 'Restore needs attention' : 'Opening your training data…'}</h1>
        {error && (
          <>
            <p role="alert">{error}</p>
            <p>
              Your saved files have been preserved. Resolve the storage problem, then retry
              recovery.
            </p>
            <Button
              onClick={() => {
                setError('');
                setRetry((n) => n + 1);
              }}
            >
              Retry restore recovery
            </Button>
          </>
        )}
      </main>
    );
  return children;
}
