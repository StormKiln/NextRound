import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { create } from 'zustand';
import { native } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import { type Preferences, readPreferences, savePreferences } from './preferences';

type Available = { version: string; notes: string | null };
type Status =
  | 'idle'
  | 'checking'
  | 'available'
  | 'current'
  | 'downloading'
  | 'installing'
  | 'error';
type State = {
  channel: 'loading' | 'direct' | 'app-store' | 'browser';
  status: Status;
  available: Available | null;
  downloaded: number;
  total: number | null;
  error: string | null;
  storageError: boolean;
  preferences: Preferences;
  initialize: () => Promise<void>;
  check: () => Promise<void>;
  install: () => Promise<void>;
  setPreferences: (patch: Partial<Preferences>) => void;
};
function preferences() {
  try {
    return readPreferences(localStorage);
  } catch {
    return { automatic: true, dismissed: null };
  }
}
export const useUpdates = create<State>((set, get) => ({
  channel: 'loading',
  status: 'idle',
  available: null,
  downloaded: 0,
  total: null,
  error: null,
  storageError: false,
  preferences: preferences(),
  initialize: async () => {
    try {
      set({ channel: native ? await invoke('distribution_channel') : 'browser' });
    } catch (error) {
      set({ channel: 'browser', error: String(error) });
    }
  },
  setPreferences: (patch) => {
    const value = { ...get().preferences, ...patch };
    let saved = false;
    try {
      saved = savePreferences(localStorage, value);
    } catch {}
    set({ preferences: value, storageError: !saved });
  },
  check: async () => {
    if (
      get().channel !== 'direct' ||
      ['checking', 'downloading', 'installing'].includes(get().status)
    )
      return;
    set({ status: 'checking', error: null });
    try {
      const available = await invoke<Available | null>('check_app_update');
      set({ available, status: available ? 'available' : 'current' });
    } catch (error) {
      set({ status: 'error', error: String(error) });
    }
  },
  install: async () => {
    const state = get();
    const session = useWorkout.getState().snapshot;
    if (
      !state.available ||
      state.channel !== 'direct' ||
      ['downloading', 'installing'].includes(state.status)
    )
      return;
    if (session && ['running', 'leadIn'].includes(session.phase)) {
      set({ error: 'Finish or stop your workout before installing an update.' });
      return;
    }
    set({ status: 'downloading', error: null, downloaded: 0, total: null });
    const cleanups: Array<() => void> = [];
    try {
      cleanups.push(
        await listen<{ downloaded: number; total: number | null }>('update-progress', (event) =>
          set(event.payload),
        ),
      );
      cleanups.push(await listen('update-installing', () => set({ status: 'installing' })));
      await invoke('install_app_update', { version: state.available.version });
    } catch (error) {
      set({ status: 'error', error: String(error) });
    } finally {
      for (const cleanup of cleanups) cleanup();
    }
  },
}));
