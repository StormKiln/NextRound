import { type ReactNode, useEffect, useState } from 'react';
import { readWorkout } from '@/native/adapter';
import { restoreScreenResolution } from '@/state/screen-reload';
import { useWorkout } from '@/state/workout';
import splash from '../../../../assets/brand/nextround-splash.png';
import { Button } from './ui/button';

export function Startup({ children }: { children: ReactNode }) {
  const [imageReady, setImageReady] = useState(false);
  const [minimum, setMinimum] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    let disposed = false;
    const timeout = setTimeout(() => {
      if (!disposed) setError(true);
    }, 10000);
    void readWorkout()
      .then((snapshot) => {
        if (disposed) return;
        restoreScreenResolution(snapshot);
        useWorkout.setState({ snapshot });
        setReady(true);
        clearTimeout(timeout);
      })
      .catch(() => {
        if (!disposed) {
          setError(true);
          clearTimeout(timeout);
        }
      });
    return () => {
      disposed = true;
      clearTimeout(timeout);
    };
  }, []);
  useEffect(() => {
    if (!imageReady) return;
    const timer = setTimeout(() => setMinimum(true), 3000);
    return () => clearTimeout(timer);
  }, [imageReady]);
  // A failed image must not strand startup: the textual fallback remains visible.
  useEffect(() => {
    const timer = setTimeout(() => setImageReady(true), 5000);
    return () => clearTimeout(timer);
  }, []);
  if (ready && minimum && !error) return children;
  return (
    <div className="splash" role="status" aria-label="Starting NextRound">
      <img
        src={splash}
        alt="NextRound"
        onLoad={() => setImageReady(true)}
        onError={() => setImageReady(true)}
      />
      <div className="startup-status">
        {error ? (
          <>
            <p>NextRound could not finish starting.</p>
            <Button onClick={() => location.reload()}>Try again</Button>
          </>
        ) : (
          <p>Getting ready for your next round…</p>
        )}
      </div>
    </div>
  );
}
