import { Music } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  type SpotifyNowPlaying,
  spotifyNowPlaying,
  spotifyPollMs,
  spotifySettings,
} from '@/native/spotify';

// Polls only while a runner is mounted and the opt-in setting is on.
export function NowPlaying() {
  const [state, setState] = useState<SpotifyNowPlaying>({ track: null, notice: null });
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const poll = () =>
      void spotifyNowPlaying()
        .then((next) => !disposed && setState(next))
        .catch(() => {});
    void spotifySettings()
      .then(({ enabled }) => {
        if (disposed || !enabled) return;
        poll();
        timer = setInterval(poll, spotifyPollMs);
      })
      .catch(() => {});
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);
  const { track, notice } = state;
  if (!track && !notice) return null;
  return (
    <section className="now-playing" aria-label="Spotify now playing">
      {track && (
        <p>
          {track.artworkUrl ? <img src={track.artworkUrl} alt="" /> : <Music size={16} />}
          <span>
            <strong>{track.name}</strong>
            {track.artist && ` · ${track.artist}`}
          </span>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
    </section>
  );
}
