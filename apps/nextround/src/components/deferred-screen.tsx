import { type ComponentType, useEffect, useState } from 'react';
import { prepareScreenReload } from '@/state/screen-reload';
import { Button } from './ui/button';

// Cache successful local modules. Browsers cache failed imports, so retry reloads
// with draft preservation. Active runner/completion components stay eager.
export function deferredScreen(load: () => Promise<ComponentType>) {
  let cached: ComponentType | undefined;
  return function DeferredScreen() {
    const [component, setComponent] = useState<ComponentType | undefined>(() => cached);
    const [error, setError] = useState(false);
    const [reloadError, setReloadError] = useState<string | null>(null);
    useEffect(() => {
      if (cached) {
        setComponent(() => cached);
        return;
      }
      let mounted = true;
      setError(false);
      void load()
        .then((screen) => {
          cached = screen;
          if (mounted) setComponent(() => screen);
        })
        .catch(() => {
          if (mounted) setError(true);
        });
      return () => {
        mounted = false;
      };
    }, []);
    if (component) {
      const Screen = component;
      return <Screen />;
    }
    return (
      <main className="page">
        {error ? (
          <div role="alert">
            <p>This screen could not be loaded. Your workout drafts are preserved.</p>
            {reloadError && <p>{reloadError}</p>}
            <Button
              onClick={() => {
                try {
                  prepareScreenReload(window.sessionStorage);
                  window.location.reload();
                } catch (error) {
                  setReloadError(String(error));
                }
              }}
            >
              Retry loading screen
            </Button>
          </div>
        ) : (
          <p role="status">Loading screen…</p>
        )}
      </main>
    );
  };
}
