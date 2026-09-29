import {
  type EmomConfig,
  type ExerciseEntry,
  type SessionSnapshot,
  validateConfig,
} from '@nextround/core';
import { create } from 'zustand';
import { exercises } from '@/data/exercises';
import * as adapter from '@/native/adapter';

type Draft = {
  minutes: string;
  leadInSeconds: string;
  warningSeconds: string;
  exercises: ExerciseEntry[];
};
type State = {
  draft: Draft;
  snapshot: SessionSnapshot | null;
  errors: Record<string, string>;
  busy: boolean;
  error: string | null;
  setDraft: (patch: Partial<Draft>) => void;
  start: (repeat?: boolean) => Promise<boolean>;
  control: (action: 'pause' | 'resume' | 'stop') => Promise<void>;
  poll: () => Promise<void>;
};
let generation = 0;
let polling = false;
export const useWorkout = create<State>((set, get) => ({
  draft: {
    minutes: '15',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: exercises.slice(0, 3),
  },
  snapshot: null,
  errors: {},
  busy: false,
  error: null,
  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch }, errors: {} })),
  start: async (repeat) => {
    if (get().busy) return false;
    const { draft, snapshot: previous } = get();
    const config: EmomConfig =
      repeat && previous
        ? structuredClone(previous.config)
        : {
            minutes: draft.minutes.trim() === '' ? Number.NaN : Number(draft.minutes),
            leadInSeconds:
              draft.leadInSeconds.trim() === '' ? Number.NaN : Number(draft.leadInSeconds),
            warningSeconds:
              draft.warningSeconds.trim() === '' ? Number.NaN : Number(draft.warningSeconds),
            exercises: structuredClone(draft.exercises),
          };
    const errors = validateConfig(config);
    set({ errors });
    if (Object.keys(errors).length) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      const snapshot = await adapter.startWorkout(config);
      set({ snapshot });
      try {
        await adapter.fullscreen(true);
      } catch {
        set({ error: 'Full screen is unavailable. Your workout is running in this window.' });
      }
      return true;
    } catch (error) {
      set({ error: String(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  control: async (action) => {
    if (get().busy) return;
    generation++;
    set({ busy: true });
    try {
      const snapshot = await adapter.controlWorkout(action);
      set({ snapshot });
      if (action === 'stop') await adapter.fullscreen(false);
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  poll: async () => {
    if (get().busy || polling) return;
    polling = true;
    const ticket = generation;
    try {
      const snapshot = await adapter.readWorkout();
      if (ticket === generation && snapshot) set({ snapshot });
    } catch (error) {
      if (ticket === generation) set({ error: `The timer could not be read: ${String(error)}` });
    } finally {
      polling = false;
    }
  },
}));
