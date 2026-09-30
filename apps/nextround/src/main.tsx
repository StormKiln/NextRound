import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  useBlocker,
  useNavigate,
} from '@tanstack/react-router';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Home as HomeIcon, Settings2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Dialog } from '@/components/dialog';
import { Startup } from '@/components/startup';
import { Button } from '@/components/ui/button';
import { CountdownSetup } from '@/features/countdown/setup';
import { Home } from '@/features/home/home';
import { Settings } from '@/features/settings/settings';
import { useUpdates } from '@/features/settings/updates';
import { Setup } from '@/features/setup/setup';
import { Completion, Runner } from '@/features/workout/runner';
import { native } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import icon from '../../../assets/icons/ios/AppIcon.appiconset/AppIcon.png';
import { version } from '../package.json';
import './styles.css';

const queryClient = new QueryClient();
function Shell() {
  const s = useWorkout((state) => state.snapshot);
  const control = useWorkout((state) => state.control);
  const active = !!s && (s.phase === 'leadIn' || s.phase === 'running');
  const navigate = useNavigate();
  const [close, setClose] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [settings, setSettings] = useState(false);
  const updates = useUpdates();
  const installing = ['downloading', 'installing'].includes(updates.status);
  useEffect(() => {
    void useUpdates.getState().initialize();
  }, []);
  useEffect(() => {
    if (updates.channel !== 'direct' || !updates.preferences.automatic) return;
    void useUpdates.getState().check();
    const timer = setInterval(() => void useUpdates.getState().check(), 6 * 60 * 60 * 1000);
    return () => clearInterval(timer);
  }, [updates.channel, updates.preferences.automatic]);
  useBlocker({
    shouldBlockFn: ({ next }) => installing || (active && next.pathname !== '/workout'),
    enableBeforeUnload: active || installing,
  });
  useEffect(() => {
    const timer = setInterval(() => void useWorkout.getState().poll(), 100);

    let unlisten: (() => void) | undefined;
    let disposed = false;
    let unlistenSettings: (() => void) | undefined;
    if (native)
      void listen('open-settings', () => setSettings(true)).then((fn) => {
        if (disposed) fn();
        else unlistenSettings = fn;
      });
    let unlistenQuit: (() => void) | undefined;
    if (native)
      void listen('quit-requested', () => setClose(true)).then((fn) => {
        if (disposed) fn();
        else unlistenQuit = fn;
      });
    if (native)
      void listen<string>('window-error', (event) => setWindowError(event.payload)).then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && native && !document.querySelector('dialog[open]'))
        void getCurrentWindow().setFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      clearInterval(timer);
      unlistenSettings?.();
      disposed = true;
      unlisten?.();
      unlistenQuit?.();
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);
  useEffect(() => {
    if (active && location.pathname !== '/workout') void navigate({ to: '/workout' });
  }, [active, navigate]);
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <img src={icon} alt="" />
          <span>NextRound</span>
        </div>
        <span className="header-note">
          {active ? 'Stay with it.' : 'Your next round starts here.'}
        </span>
        <span className="version">{version}</span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Home"
          disabled={active || installing}
          onClick={() => void navigate({ to: '/' })}
        >
          <HomeIcon size={18} />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Settings" onClick={() => setSettings(true)}>
          <Settings2 size={18} />
        </Button>
      </header>
      {windowError && (
        <p className="error page" role="alert">
          {windowError}
        </p>
      )}
      <div inert={installing}>
        <Outlet />
      </div>
      {updates.available &&
        !active &&
        !settings &&
        updates.preferences.dismissed !== updates.available.version &&
        !installing && (
          <aside className="update-banner" aria-label="Update available">
            <span>NextRound {updates.available.version} is available.</span>
            <Button variant="secondary" onClick={() => setSettings(true)}>
              View update
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                updates.setPreferences({ dismissed: updates.available?.version ?? null })
              }
            >
              Not now
            </Button>
          </aside>
        )}
      {settings && <Settings onClose={() => setSettings(false)} />}
      {close && (
        <Dialog title="Close NextRound?" onClose={() => setClose(false)}>
          <p>
            This will stop your active workout. Completed workout history is not saved in this
            version.
          </p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setClose(false)}>
              Keep working out
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await control('stop');
                setClose(false);
                const session = useWorkout.getState().snapshot;
                if (session?.phase === 'cancelled') await invoke('quit_app');
              }}
            >
              Stop and close
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
const rootRoute = createRootRoute({
  component: Shell,
  errorComponent: ({ error }) => (
    <main className="complete">
      <h1>NextRound could not load</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <Button onClick={() => location.reload()}>Try again</Button>
    </main>
  ),
});
const homeRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Home });
const setupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/emom',
  component: Setup,
});
const countdownRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/countdown',
  component: CountdownSetup,
});
const workoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/workout',
  component: Runner,
});
const completeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/complete',
  component: Completion,
});
const router = createRouter({
  routeTree: rootRoute.addChildren([
    homeRoute,
    setupRoute,
    countdownRoute,
    workoutRoute,
    completeRoute,
  ]),
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
const root = document.getElementById('root');
if (root)
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <Startup>
          <RouterProvider router={router} />
        </Startup>
      </QueryClientProvider>
    </React.StrictMode>,
  );
