import {
  type AmrapProgress,
  type ExerciseEntry,
  type SessionSnapshot,
  validAmrapProgress,
  validateConfig,
  type WorkoutConfig,
} from '@nextround/core';
import { create } from 'zustand';
import { exercises } from '@/data/exercises';
import { copyResult, mutateHistory, type WorkoutResult } from '@/features/history/repository';
import { defaultEmomTarget } from '@/features/setup/emom-defaults';
import * as adapter from '@/native/adapter';

type WorkoutMode = 'forTime' | 'emom' | 'countdown' | 'intervals' | 'amrap';
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
type ForTimeDraft = CountdownDraft & { capped: boolean };
type State = {
  forTimeDraft: ForTimeDraft;
  setForTimeDraft: (patch: Partial<ForTimeDraft>) => void;
  finishConfirmation: boolean;
  resumeAfterFinish: boolean;
  requestFinish: () => Promise<void>;
  cancelFinish: () => Promise<void>;
  amrapDraft: CountdownDraft;
  setAmrapDraft: (patch: Partial<CountdownDraft>) => void;
  amrapProgress: AmrapProgress;
  scoreLocked: boolean;
  setAmrapProgress: (score: AmrapProgress) => void;
  stopConfirmation: boolean;
  resumeAfterStop: boolean;
  requestStop: () => Promise<void>;
  cancelStop: () => Promise<void>;
  sessionId: string | null;
  pendingResult: WorkoutResult | null;
  resultStatus: 'none' | 'pending' | 'saved' | 'discarded';
  saveResult: () => Promise<boolean>;
  discardResult: () => Promise<boolean>;
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
  controlError: string | null;
  readError: string | null;
  setDraft: (patch: Partial<Draft>) => void;
  start: (repeat?: boolean, mode?: WorkoutMode) => Promise<boolean>;
  control: (action: 'pause' | 'resume' | 'stop' | 'finish') => Promise<boolean>;
  poll: () => Promise<void>;
};
let generation = 0;
let polling = false;
export const useWorkout = create<State>((set, get) => ({
  forTimeDraft: {
    minutes: '10',
    seconds: '0',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: [],
    showChecklist: true,
    capped: false,
  },
  setForTimeDraft: (patch) =>
    set((s) => ({ forTimeDraft: { ...s.forTimeDraft, ...patch }, errors: {} })),
  finishConfirmation: false,
  resumeAfterFinish: false,
  requestFinish: async () => {
    const { snapshot, busy, finishConfirmation, stopConfirmation } = get();
    if (
      busy ||
      finishConfirmation ||
      stopConfirmation ||
      snapshot?.config.type !== 'forTime' ||
      snapshot.phase !== 'running'
    )
      return;
    const resumeAfterFinish = !snapshot.paused;
    if (resumeAfterFinish && !(await get().control('pause'))) return;
    if (get().snapshot?.phase === 'running') set({ finishConfirmation: true, resumeAfterFinish });
  },
  cancelFinish: async () => {
    if (get().busy || !get().finishConfirmation) return;
    if (get().resumeAfterFinish && !(await get().control('resume'))) return;
    set({ finishConfirmation: false, resumeAfterFinish: false });
  },
  amrapDraft: {
    minutes: '10',
    seconds: '0',
    leadInSeconds: '10',
    warningSeconds: '3',
    showChecklist: false,
    exercises: exercises
      .slice(0, 3)
      .map((entry) => ({ ...entry, catalogId: entry.id, target: defaultEmomTarget(entry) })),
  },
  setAmrapDraft: (patch) => set((s) => ({ amrapDraft: { ...s.amrapDraft, ...patch }, errors: {} })),
  amrapProgress: { completedMovements: 0, partialValue: 0 },
  scoreLocked: false,
  setAmrapProgress: (score) => {
    const { snapshot, busy, pendingResult, resultStatus, scoreLocked, stopConfirmation } = get();
    if (
      busy ||
      scoreLocked ||
      stopConfirmation ||
      snapshot?.config.type !== 'amrap' ||
      !(
        snapshot.phase === 'running' ||
        (snapshot.phase === 'completed' && resultStatus === 'pending')
      ) ||
      !validAmrapProgress(snapshot.config, score)
    )
      return;
    set({
      amrapProgress: { ...score },
      ...(pendingResult
        ? { pendingResult: { ...pendingResult, amrapProgress: { ...score } } }
        : {}),
    });
  },
  stopConfirmation: false,
  resumeAfterStop: false,
  requestStop: async () => {
    const { snapshot, busy, stopConfirmation } = get();
    if (
      busy ||
      stopConfirmation ||
      get().finishConfirmation ||
      !snapshot ||
      !['running', 'leadIn'].includes(snapshot.phase)
    )
      return;
    const resumeAfterStop = !snapshot.paused;
    if (resumeAfterStop && !(await get().control('pause'))) return;
    const current = get().snapshot;
    if (current && ['running', 'leadIn'].includes(current.phase))
      set({ stopConfirmation: true, resumeAfterStop });
  },
  cancelStop: async () => {
    if (get().busy || !get().stopConfirmation) return;
    if (get().resumeAfterStop && !(await get().control('resume'))) return;
    set({ stopConfirmation: false, resumeAfterStop: false });
  },
  sessionId: null,
  pendingResult: null,
  resultStatus: 'none',
  saveResult: async () => {
    const { pendingResult, busy } = get();
    if (!pendingResult || busy) return false;
    set({ busy: true, error: null, scoreLocked: true });
    try {
      await mutateHistory({ action: 'save', result: pendingResult });
      await adapter.resolveResult();
      set({ pendingResult: null, resultStatus: 'saved' });
      return true;
    } catch (error) {
      set({ error: `Could not save the result: ${String(error)}` });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  discardResult: async () => {
    if (get().busy) return false;
    if (!get().pendingResult) return true;
    set({ busy: true, error: null });
    try {
      await adapter.resolveResult();
      set({ pendingResult: null, resultStatus: 'discarded' });
      return true;
    } catch (error) {
      set({ error: String(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  draft: {
    minutes: '15',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: exercises
      .slice(0, 3)
      .map((entry) => ({ ...entry, catalogId: entry.id, target: defaultEmomTarget(entry) })),
  },
  intervalsDraft: {
    workSeconds: '40',
    restSeconds: '20',
    rounds: '8',
    leadInSeconds: '10',
    warningSeconds: '3',
    exercises: exercises.slice(0, 3).map((entry) => ({ ...entry, catalogId: entry.id })),
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
  controlError: null,
  readError: null,
  setDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch }, errors: {} })),
  checkedExerciseIds: [],
  toggleChecked: (id) => {
    const { snapshot, checkedExerciseIds } = get();
    if (
      get().busy ||
      get().stopConfirmation ||
      get().finishConfirmation ||
      snapshot?.phase !== 'running' ||
      (snapshot?.config.type !== 'countdown' && snapshot?.config.type !== 'forTime') ||
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
    const { draft, countdownDraft, intervalsDraft, amrapDraft, forTimeDraft } = get();
    if (mode === 'forTime')
      return {
        type: 'forTime',
        ...(forTimeDraft.capped ? { timeCapSeconds: countdownDuration(forTimeDraft) } : {}),
        leadInSeconds: numeric(forTimeDraft.leadInSeconds),
        warningSeconds: numeric(forTimeDraft.warningSeconds),
        exercises: structuredClone(forTimeDraft.exercises),
        showChecklist: forTimeDraft.showChecklist,
      };
    if (mode === 'amrap')
      return {
        type: 'amrap',
        durationSeconds: countdownDuration(amrapDraft),
        leadInSeconds: numeric(amrapDraft.leadInSeconds),
        warningSeconds: numeric(amrapDraft.warningSeconds),
        exercises: structuredClone(amrapDraft.exercises),
      };
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
    if (get().pendingResult || busy || (snapshot && ['leadIn', 'running'].includes(snapshot.phase)))
      return false;
    try {
      const errors = validateConfig(config);
      if (Object.keys(errors).length) {
        set({ errors });
        return false;
      }
      const copy = structuredClone(config);
      if (copy.type === 'forTime') {
        set({
          forTimeDraft: {
            minutes: String(Math.floor((copy.timeCapSeconds ?? 600) / 60)),
            seconds: String((copy.timeCapSeconds ?? 600) % 60),
            capped: copy.timeCapSeconds !== undefined,
            leadInSeconds: String(copy.leadInSeconds),
            warningSeconds: String(copy.warningSeconds),
            exercises: copy.exercises ?? [],
            showChecklist: copy.showChecklist ?? true,
          },
          errors: {},
          error: null,
        });
      } else if (copy.type === 'amrap') {
        set({
          amrapDraft: {
            minutes: String(Math.floor(copy.durationSeconds / 60)),
            seconds: String(copy.durationSeconds % 60),
            leadInSeconds: String(copy.leadInSeconds),
            warningSeconds: String(copy.warningSeconds),
            exercises: copy.exercises,
            showChecklist: false,
          },
          errors: {},
          error: null,
        });
      } else if (copy.type === 'intervals') {
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
    if (get().busy || get().pendingResult) return false;
    const previous = get().snapshot;
    const config =
      repeat && previous ? structuredClone(previous.config) : get().getDraftConfig(mode);
    const errors = validateConfig(config);
    set({ errors });
    if (Object.keys(errors).length) return false;
    generation++;
    set({ busy: true, error: null, controlError: null, readError: null });
    try {
      const snapshot = await adapter.startWorkout(config);
      set({
        snapshot,
        checkedExerciseIds: [],
        amrapProgress: { completedMovements: 0, partialValue: 0 },
        scoreLocked: false,
        finishConfirmation: false,
        resumeAfterFinish: false,
        stopConfirmation: false,
        sessionId: crypto.randomUUID(),
        pendingResult: null,
        resultStatus: 'none',
      });
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
    if (get().busy) return false;
    generation++;
    set({ busy: true });
    try {
      const snapshot = await adapter.controlWorkout(action);
      set({
        snapshot,
        controlError: null,
        ...(snapshot.phase === 'completed' && get().resultStatus === 'none'
          ? { pendingResult: resultFromSnapshot(snapshot, get()), resultStatus: 'pending' as const }
          : {}),
      });
      if (action === 'finish') set({ finishConfirmation: false, resumeAfterFinish: false });
      if (action === 'stop') {
        set({ stopConfirmation: false, resumeAfterStop: false });
        try {
          await adapter.fullscreen(false);
        } catch {
          set({ error: 'Could not leave full screen. The workout has stopped.' });
        }
      }
      return true;
    } catch (error) {
      set({ controlError: String(error) });
      return false;
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
      if (ticket === generation && snapshot) {
        set({ readError: null });
        const state = get();
        if (snapshot.phase === 'completed' && state.resultStatus === 'none') {
          const result = resultFromSnapshot(snapshot, state);
          set({ snapshot, pendingResult: result, resultStatus: 'pending' });
        } else set({ snapshot });
      }
    } catch (error) {
      if (ticket === generation)
        set({ readError: `The timer could not be read: ${String(error)}` });
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

// Keep failures from independent operations visible until their own retry succeeds.
export function workoutError(state: Pick<State, 'error' | 'controlError' | 'readError'>) {
  return [state.error, state.controlError, state.readError].filter(Boolean).join(' ') || null;
}

function resultFromSnapshot(
  snapshot: SessionSnapshot,
  state: Pick<State, 'sessionId' | 'checkedExerciseIds' | 'amrapProgress'>,
): WorkoutResult {
  return copyResult({
    id: state.sessionId ?? crypto.randomUUID(),
    completedAt: Date.now(),
    elapsedMs: snapshot.elapsedMs,
    ...(snapshot.outcome ? { outcome: snapshot.outcome } : {}),
    config: snapshot.config,
    checkedExerciseIds: state.checkedExerciseIds,
    ...(snapshot.config.type === 'amrap' ? { amrapProgress: state.amrapProgress } : {}),
  });
}
