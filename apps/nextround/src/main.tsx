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
import { History as HistoryIcon, Home as HomeIcon, Settings2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { deferredScreen } from '@/components/deferred-screen';
import { Dialog } from '@/components/dialog';
import { Startup } from '@/components/startup';
import { Button } from '@/components/ui/button';

const ExerciseLibrary = deferredScreen(() =>
  import('@/features/exercises/library-view').then((module) => module.ExerciseLibrary),
);
const History = deferredScreen(() => import('@/features/history').then((module) => module.History));

import { Home } from '@/features/home/home';
import { scheduleAutomaticUpdates } from '@/features/settings/automatic-updates';
import { Settings } from '@/features/settings/settings';
import { useUpdates } from '@/features/settings/updates';
import { Completion, Runner } from '@/features/workout/runner';
import { native } from '@/native/adapter';
import { restoreScreenDrafts } from '@/state/screen-reload';
import { useWorkout } from '@/state/workout';
import icon from '../../../assets/icons/ios/AppIcon.appiconset/AppIcon.png';
import { version } from '../package.json';
import './styles.css';

const AmrapSetup = deferredScreen(() =>
  import('@/features/amrap/setup').then((module) => module.AmrapSetup),
);
const CountdownSetup = deferredScreen(() =>
  import('@/features/countdown/setup').then((module) => module.CountdownSetup),
);
const LadderSetup = deferredScreen(() =>
  import('@/features/ladder/setup').then((module) => module.LadderSetup),
);
const ForTimeSetup = deferredScreen(() =>
  import('@/features/for-time/setup').then((module) => module.ForTimeSetup),
);
const IntervalsSetup = deferredScreen(() =>
  import('@/features/intervals/setup').then((module) => module.IntervalsSetup),
);
const Setup = deferredScreen(() => import('@/features/setup/setup').then((module) => module.Setup));
try {
  restoreScreenDrafts(window.sessionStorage);
} catch {
  /* Invalid transient recovery data never replaces drafts. */
}
const queryClient = new QueryClient();
function Shell() {
  const s = useWorkout((state) => state.snapshot);
  const control = useWorkout((state) => state.control);
  const pendingResult = useWorkout((state) => state.pendingResult);
  const resultBusy = useWorkout((state) => state.busy);
  const resultError = useWorkout((state) => state.error);
  const active = !!s && (s.phase === 'leadIn' || s.phase === 'running');
  const navigate = useNavigate();
  const [close, setClose] = useState(false);
  const [windowError, setWindowError] = useState<string | null>(null);
  const [settings, setSettings] = useState<'general' | 'updates' | null>(null);
  const updates = useUpdates();
  const installing = ['downloading', 'installing'].includes(updates.status);
  useEffect(() => {
    void useUpdates.getState().initialize();
  }, []);
  useEffect(() => {
    if (updates.channel !== 'direct' || !updates.preferences.automatic) return;
    const check = () => void useUpdates.getState().check(true);
    const stop = scheduleAutomaticUpdates(check, {
      window,
      document,
      visible: () => document.visibilityState === 'visible',
    });
    let disposed = false;
    let unlisten: (() => void) | undefined;
    if (native)
      void getCurrentWindow()
        .onFocusChanged(({ payload }) => {
          if (payload) check();
        })
        .then((fn) => {
          if (disposed) fn();
          else unlisten = fn;
        })
        .catch(() => {});
    return () => {
      disposed = true;
      stop();
      unlisten?.();
    };
  }, [updates.channel, updates.preferences.automatic]);
  useBlocker({
    shouldBlockFn: ({ next }) => installing || (active && next.pathname !== '/workout'),
    enableBeforeUnload: active || installing,
  });
  const resultBlocker = useBlocker({
    shouldBlockFn: ({ next }) =>
      !!useWorkout.getState().pendingResult && next.pathname !== '/complete',
    enableBeforeUnload: !!pendingResult,
    withResolver: true,
  });
  useEffect(() => {
    const timer = setInterval(() => void useWorkout.getState().poll(), 100);

    let unlisten: (() => void) | undefined;
    let disposed = false;
    let unlistenSettings: (() => void) | undefined;
    if (native)
      void listen('open-settings', () => setSettings('general')).then((fn) => {
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
        <Button
          variant="ghost"
          size="icon"
          aria-label="Workout history"
          disabled={active || installing}
          onClick={() => void navigate({ to: '/history' })}
        >
          <HistoryIcon size={18} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          onClick={() => setSettings('general')}
        >
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
            <Button variant="secondary" onClick={() => setSettings('updates')}>
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
      {settings && <Settings initialSection={settings} onClose={() => setSettings(null)} />}
      {resultBlocker.status === 'blocked' && (
        <Dialog
          title="Unsaved workout result"
          onClose={() => {
            if (!resultBusy) resultBlocker.reset();
          }}
        >
          <p>Save your result on the completion screen, or discard it before leaving.</p>
          {resultError && <p role="alert">{resultError}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={resultBusy} onClick={() => resultBlocker.reset()}>
              Keep result
            </Button>
            <Button
              variant="destructive"
              disabled={resultBusy}
              onClick={async () => {
                if (await useWorkout.getState().discardResult()) resultBlocker.proceed();
              }}
            >
              Discard and continue
            </Button>
          </div>
        </Dialog>
      )}
      {close && (
        <Dialog title="Close NextRound?" onClose={() => setClose(false)}>
          <p>
            {pendingResult
              ? 'Your completed result has not been saved. Return to it to save, or discard it and quit.'
              : 'This will stop your active workout. Partial sessions are not saved to history.'}
          </p>
          {resultError && <p role="alert">{resultError}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setClose(false)}>
              {pendingResult ? 'Keep result' : 'Keep working out'}
            </Button>
            <Button
              variant="destructive"
              disabled={resultBusy}
              onClick={async () => {
                if (pendingResult) {
                  if (await useWorkout.getState().discardResult()) {
                    setClose(false);
                    await invoke('quit_app');
                  }
                  return;
                }
                await control('stop');
                setClose(false);
                const session = useWorkout.getState().snapshot;
                if (session?.phase === 'cancelled') await invoke('quit_app');
              }}
            >
              {pendingResult ? 'Discard and quit' : 'Stop and close'}
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
const exercisesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/exercises',
  component: ExerciseLibrary,
});
const historyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/history',
  component: History,
});
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
const intervalsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/intervals',
  component: IntervalsSetup,
});
const amrapRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/amrap',
  component: AmrapSetup,
});
const forTimeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/for-time',
  component: ForTimeSetup,
});
const ladderRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/ladder',
  component: LadderSetup,
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
    exercisesRoute,
    historyRoute,
    setupRoute,
    countdownRoute,
    intervalsRoute,
    amrapRoute,
    forTimeRoute,
    ladderRoute,
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
