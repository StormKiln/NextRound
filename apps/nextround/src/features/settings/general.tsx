import { invoke } from '@tauri-apps/api/core';
import { useEffect, useState } from 'react';
import { native } from '@/native/adapter';

type CloseBehavior = 'minimize' | 'quit';
export function GeneralSettings() {
  const [behavior, setBehavior] = useState<CloseBehavior | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    if (!native) {
      setBehavior('minimize');
      return;
    }
    void invoke<CloseBehavior>('get_close_behavior')
      .then((value) => {
        if (!disposed) setBehavior(value);
      })
      .catch((error) => {
        if (!disposed) setError(String(error));
      });
    return () => {
      disposed = true;
    };
  }, []);
  return (
    <>
      <h3>General</h3>
      <p>Choose what happens when you close the main window.</p>
      <div className="settings-group">
        <label htmlFor="close-behavior">Red close button</label>
        <select
          id="close-behavior"
          value={behavior ?? 'minimize'}
          disabled={!native || behavior === null || saving}
          onChange={async (event) => {
            const next = event.target.value as CloseBehavior;
            setSaving(true);
            setError(null);
            try {
              await invoke('set_close_behavior', { behavior: next });
              setBehavior(next);
            } catch (error) {
              setError(`Your preference could not be saved: ${String(error)}`);
            } finally {
              setSaving(false);
            }
          }}
        >
          <option value="minimize">Minimize to Dock</option>
          <option value="quit">Quit NextRound</option>
        </select>
      </div>
      <p>
        {behavior === 'quit'
          ? 'Ask before quitting an active or paused workout.'
          : 'Your workout keeps running while minimized. Click the Dock icon to return.'}
      </p>
      <p className="muted">
        Command-Q always quits, with confirmation if a workout is active. Closing is temporarily
        blocked while an update installs.
      </p>
      {!native && <p className="muted">This preference is available in the installed macOS app.</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
