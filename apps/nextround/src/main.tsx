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
import { getCurrentWindow } from '@tauri-apps/api/window';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Setup } from '@/features/setup/setup';
import { Completion, Runner } from '@/features/workout/runner';
import { native } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import splash from '../../../assets/brand/nextround-splash.png';
import icon from '../../../assets/icons/ios/AppIcon.appiconset/AppIcon.png';
import './styles.css';

const queryClient = new QueryClient();
function Shell() {
  const s = useWorkout((state) => state.snapshot);
  const control = useWorkout((state) => state.control);
  const active = !!s && (s.phase === 'leadIn' || s.phase === 'running');
  const navigate = useNavigate();
  const [close, setClose] = useState(false);
  const [booting, setBooting] = useState(true);
  useBlocker({
    shouldBlockFn: ({ next }) => active && next.pathname !== '/workout',
    enableBeforeUnload: active,
  });
  useEffect(() => {
    const timer = setInterval(() => void useWorkout.getState().poll(), 100);
    const boot = setTimeout(() => setBooting(false), 450);
    let unlisten: (() => void) | undefined;
    let disposed = false;
    if (native)
      void getCurrentWindow()
        .onCloseRequested((event) => {
          const session = useWorkout.getState().snapshot;
          if (session && ['running', 'leadIn'].includes(session.phase)) {
            event.preventDefault();
            setClose(true);
          }
        })
        .then((fn) => {
          if (disposed) fn();
          else unlisten = fn;
        });
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && native) void getCurrentWindow().setFullscreen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      clearInterval(timer);
      clearTimeout(boot);
      disposed = true;
      unlisten?.();
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
        <span className="version">0.1.0</span>
      </header>
      <Outlet />
      {booting && (
        <div className="splash" aria-hidden="true">
          <img src={splash} alt="" />
        </div>
      )}
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
                await getCurrentWindow().close();
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
const setupRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: Setup });
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
  routeTree: rootRoute.addChildren([setupRoute, workoutRoute, completeRoute]),
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
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
