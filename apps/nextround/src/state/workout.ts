import {
  type ExerciseEntry,
  type SessionSnapshot,
  validateConfig,
  type WorkoutConfig,
} from '@nextround/core';
import { create } from 'zustand';
import { exercises } from '@/data/exercises';
import * as adapter from '@/native/adapter';

type WorkoutMode = 'emom' | 'countdown' | 'intervals';
type IntervalsDraft = {
  workSeconds: string;
  restSeconds: string;
  rounds: string;
  leadInSeconds: string;
  warningSeconds: string;
  exercises: ExerciseEntry[];
};
type Draft = {
  minutes: string;
  leadInSeconds: string;
  warningSeconds: string;
  exercises: ExerciseEntry[];
};
type CountdownDraft = {
  minutes: string;
  seconds: string;
  exercises: ExerciseEntry[];
  showChecklist: boolean;
  leadInSeconds: string;
  warningSeconds: string;
};
type State = {
  getDraftConfig: (mode: WorkoutMode) => WorkoutConfig;
  loadConfig: (config: WorkoutConfig) => boolean;
  checkedExerciseIds: string[];
  toggleChecked: (id: string) => void;
  intervalsDraft: IntervalsDraft;
  setIntervalsDraft: (patch: Partial<IntervalsDraft>) => void;
  countdownDraft: CountdownDraft;
  setCountdownDraft: (patch: Partial<CountdownDraft>) => void;
  draft: Draft;
  snapshot: SessionSnapshot | null;
  errors: Record<string, string>;
  busy: boolean;
  error: string | null;
  setDraft: (patch: Partial<Draft>) => void;
  start: (repeat?: boolean, mode?: WorkoutMode) => Promise<boolean>;
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
  intervalsDraft: {
    workSeconds: '40',
    restSeconds: '20',
    rounds: '8',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: exercises.slice(0, 3),
  },
  setIntervalsDraft: (patch) =>
    set((s) => ({ intervalsDraft: { ...s.intervalsDraft, ...patch }, errors: {} })),
  countdownDraft: {
    minutes: '5',
    seconds: '0',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: [],
    showChecklist: true,
  },
  setCountdownDraft: (patch) =>
    set((state) => ({ countdownDraft: { ...state.countdownDraft, ...patch }, errors: {} })),
  snapshot: null,
  errors: {},
  busy: false,
  error: null,
  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch }, errors: {} })),
  checkedExerciseIds: [],
  toggleChecked: (id) => {
    const { snapshot, checkedExerciseIds } = get();
    if (
      snapshot?.config.type !== 'countdown' ||
      snapshot.config.showChecklist === false ||
      !snapshot.config.exercises?.some((exercise) => exercise.id === id)
    )
      return;
    set({
      checkedExerciseIds: checkedExerciseIds.includes(id)
        ? checkedExerciseIds.filter((checked) => checked !== id)
        : [...checkedExerciseIds, id],
    });
  },
  getDraftConfig: (mode) => {
    const { draft, countdownDraft, intervalsDraft } = get();
    if (mode === 'intervals')
      return {
        type: 'intervals',
        workSeconds: numeric(intervalsDraft.workSeconds),
        restSeconds: numeric(intervalsDraft.restSeconds),
        rounds: numeric(intervalsDraft.rounds),
        leadInSeconds: numeric(intervalsDraft.leadInSeconds),
        warningSeconds: numeric(intervalsDraft.warningSeconds),
        exercises: structuredClone(intervalsDraft.exercises),
      };
    return mode === 'countdown'
      ? {
          type: 'countdown',
          durationSeconds: countdownDuration(countdownDraft),
          leadInSeconds: numeric(countdownDraft.leadInSeconds),
          warningSeconds: numeric(countdownDraft.warningSeconds),
          exercises: structuredClone(countdownDraft.exercises),
          showChecklist: countdownDraft.showChecklist,
        }
      : {
          type: 'emom',
          minutes: numeric(draft.minutes),
          leadInSeconds: numeric(draft.leadInSeconds),
          warningSeconds: numeric(draft.warningSeconds),
          exercises: structuredClone(draft.exercises),
        };
  },
  loadConfig: (config) => {
    const { busy, snapshot } = get();
    if (busy || (snapshot && ['leadIn', 'running'].includes(snapshot.phase))) return false;
    try {
      const errors = validateConfig(config);
      if (Object.keys(errors).length) {
        set({ errors });
        return false;
      }
      const copy = structuredClone(config);
      if (copy.type === 'intervals') {
        set({
          intervalsDraft: {
            workSeconds: String(copy.workSeconds),
            restSeconds: String(copy.restSeconds),
            rounds: String(copy.rounds),
            leadInSeconds: String(copy.leadInSeconds),
            warningSeconds: String(copy.warningSeconds),
            exercises: copy.exercises,
          },
          errors: {},
          error: null,
        });
      } else if (copy.type === 'countdown') {
        set({
          countdownDraft: {
            minutes: String(Math.floor(copy.durationSeconds / 60)),
            seconds: String(copy.durationSeconds % 60),
            leadInSeconds: String(copy.leadInSeconds),
            warningSeconds: String(copy.warningSeconds),
            exercises: copy.exercises ?? [],
            showChecklist: copy.showChecklist ?? true,
          },
          errors: {},
          error: null,
        });
      } else {
        set({
          draft: {
            minutes: String(copy.minutes),
            leadInSeconds: String(copy.leadInSeconds),
            warningSeconds: String(copy.warningSeconds),
            exercises: copy.exercises,
          },
          errors: {},
          error: null,
        });
      }
      return true;
    } catch {
      return false;
    }
  },
  start: async (repeat, mode = 'emom') => {
    if (get().busy) return false;
    const previous = get().snapshot;
    const config =
      repeat && previous ? structuredClone(previous.config) : get().getDraftConfig(mode);
    const errors = validateConfig(config);
    set({ errors });
    if (Object.keys(errors).length) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      const snapshot = await adapter.startWorkout(config);
      set({ snapshot, checkedExerciseIds: [] });
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

function numeric(value: string) {
  return value.trim() === '' ? Number.NaN : Number(value);
}
function countdownDuration(draft: CountdownDraft) {
  const minutes = numeric(draft.minutes);
  const seconds = numeric(draft.seconds);
  return Number.isInteger(minutes) &&
    minutes >= 0 &&
    Number.isInteger(seconds) &&
    seconds >= 0 &&
    seconds <= 59
    ? minutes * 60 + seconds
    : Number.NaN;
}
