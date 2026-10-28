import { useEffect, useState } from 'react';
import { native } from '@/native/adapter';
import { setSpotifyEnabled, spotifySettings } from '@/native/spotify';

export function SpotifySettings() {
  const [settings, setSettings] = useState<{ enabled: boolean; installed: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let disposed = false;
    void spotifySettings()
      .then((value) => !disposed && setSettings(value))
      .catch((error) => !disposed && setError(String(error)));
    return () => {
      disposed = true;
    };
  }, []);
  return (
    <>
      <h3>Spotify</h3>
      <div className="settings-group">
        <label>
          Play and pause Spotify with workouts
          <input
            type="checkbox"
            checked={settings?.enabled ?? false}
            disabled={!native || !settings || saving}
            onChange={async (event) => {
              const enabled = event.target.checked;
              setSaving(true);
              setError(null);
              setNote(null);
              try {
                setNote(await setSpotifyEnabled(enabled));
                setSettings((current) => current && { ...current, enabled });
              } catch (error) {
                setError(String(error));
              } finally {
                setSaving(false);
              }
            }}
          />
        </label>
      </div>
      <p className="muted">
        Controls the Spotify desktop app: starting or resuming a workout plays, and pausing,
        stopping or finishing pauses. The current track appears in the workout. NextRound never
        opens Spotify for you; macOS asks once for permission.
      </p>
      {!native && <p className="muted">This preference is available in the installed macOS app.</p>}
      {native && settings && !settings.installed && !settings.enabled && (
        <p className="muted">Install the Spotify desktop app to use this setting.</p>
      )}
      {saving && <p role="status">Waiting for macOS permission…</p>}
      {note && <p role="status">{note}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
