import { Button } from '@/components/ui/button';
import { useNoteGuard } from '@/features/history/note-guard';
import { useWorkout } from '@/state/workout';
import { useUpdates } from './updates';

export function UpdatePanel() {
  const u = useUpdates();
  const editingNote = useNoteGuard((s) => !!s.onQuit);
  const session = useWorkout((s) => s.snapshot);
  const active = !!session && ['running', 'leadIn'].includes(session.phase);
  const pendingResult = useWorkout((s) => s.pendingResult);
  const busy = ['downloading', 'installing'].includes(u.status);
  return (
    <>
      <h3>Software updates</h3>
      {u.channel === 'direct' ? (
        <>
          <p>Keep NextRound up to date. You choose when to install and restart.</p>
          <div className="settings-group">
            <label>
              Automatically check for updates
              <input
                type="checkbox"
                checked={u.preferences.automatic}
                onChange={(e) => u.setPreferences({ automatic: e.target.checked })}
              />
            </label>
          </div>
          <p className="muted">
            Automatic checks run when you return and every 15 minutes while the app is visible.
          </p>
          {u.lastCheckedAt !== null && (
            <p className="muted">Last checked: {new Date(u.lastCheckedAt).toLocaleString()}</p>
          )}
          {u.storageError && (
            <p role="alert">Your preference could not be saved. It applies until the app closes.</p>
          )}
          <p role="status">
            {u.status === 'checking'
              ? 'Checking for updates…'
              : u.status === 'current'
                ? 'You’re up to date.'
                : u.status === 'downloading'
                  ? `Downloading${u.total ? ` — ${Math.min(100, Math.round((u.downloaded / u.total) * 100))}%` : '…'}`
                  : u.status === 'installing'
                    ? 'Installing. NextRound will restart…'
                    : u.available
                      ? `NextRound ${u.available.version} is available.`
                      : 'Check for a newer version of NextRound.'}
          </p>
          {u.available?.notes && (
            <details>
              <summary>What’s new</summary>
              <p className="update-notes">{u.available.notes}</p>
            </details>
          )}
          {u.error && (
            <p role="alert" className="error">
              {u.error}
            </p>
          )}
          {active && <p>Updates can be installed after you finish or stop your workout.</p>}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              disabled={busy || u.status === 'checking'}
              onClick={() => void u.check()}
            >
              Check for Updates
            </Button>
            {u.available && (
              <Button
                disabled={
                  busy || active || !!pendingResult || editingNote || u.status === 'checking'
                }
                onClick={() => void u.install()}
              >
                Install and Restart
              </Button>
            )}
          </div>
        </>
      ) : (
        <p>
          {u.channel === 'loading'
            ? 'Checking distribution channel…'
            : u.channel === 'app-store'
              ? 'This copy is updated through TestFlight or the App Store. Open the app you used to install NextRound to get updates.'
              : 'Update checking is available in the installed macOS app.'}
        </p>
      )}
    </>
  );
}
