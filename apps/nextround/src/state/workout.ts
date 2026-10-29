import {
  type AmrapProgress,
  type ExerciseEntry,
  type LadderPattern,
  ladderTotalMovements,
  type SessionSnapshot,
  validAmrapProgress,
  validateConfig,
  type WorkoutConfig,
} from '@nextround/core';
import { create } from 'zustand';
import { exercises } from '@/data/exercises';
import type { Phase } from '@/data/phases';
import { copyResult, mutateHistory, type WorkoutResult } from '@/features/history/repository';
import { useTrainingOwnership } from '@/features/sessions/ownership';
import { defaultEmomTarget } from '@/features/setup/emom-defaults';
import * as adapter from '@/native/adapter';
import {
  type BookendSetting,
  type BookendSettings,
  bookendConfig,
  pickBookend,
  readBookends,
  saveBookends,
} from './bookends';
import { useValidationAttempts } from './setup-validation';
import { useTemplateSources } from './template-source';

export type WorkoutMode = 'ladder' | 'forTime' | 'emom' | 'countdown' | 'intervals' | 'amrap';
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
type LadderDraft = ForTimeDraft & {
  direction: LadderPattern['direction'];
  startReps: string;
  increment: string;
  rungs: string;
};
type BookendPlan = { minutes: number; exercises: ExerciseEntry[] };
// A run is the main workout plus optional warm-up and cool-down timed around it.
export type Run = {
  stage: 'warmup' | 'main' | 'cooldown' | 'done';
  main: WorkoutConfig;
  plan: Partial<Record<Phase, BookendPlan>>;
  snapshot: SessionSnapshot | null;
  warmupMs?: number;
  cooldownMs?: number;
};
type State = {
  bookends: BookendSettings;
  setBookend: (phase: Phase, patch: Partial<BookendSetting>) => void;
  bookendPreview: Record<Phase, ExerciseEntry[]>;
  setBookendPreview: (phase: Phase, exercises: ExerciseEntry[]) => void;
  run: Run | null;
  resultResolved: boolean;
  controlBookend: (action: 'pause' | 'resume' | 'stop') => Promise<boolean>;
  ladderDraft: LadderDraft;
  setLadderDraft: (patch: Partial<LadderDraft>) => void;
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
  saveResult: (write?: typeof mutateHistory) => Promise<boolean>;
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
  control: (
    action: 'pause' | 'resume' | 'stop' | 'finish' | 'advance' | 'undo',
  ) => Promise<boolean>;
  poll: () => Promise<void>;
};
let generation = 0;
let polling = false;
const preferences = () => (typeof window === 'undefined' ? null : window.localStorage);
export const useWorkout = create<State>((set, get) => {
  const fresh = {
    checkedExerciseIds: [],
    amrapProgress: { completedMovements: 0, partialValue: 0 },
    scoreLocked: false,
    finishConfirmation: false,
    resumeAfterFinish: false,
    stopConfirmation: false,
    pendingResult: null,
    resultStatus: 'none' as const,
    resultResolved: false,
  };
  const bookended = (run: Run) => !!(run.plan.warmup || run.plan.cooldown);
  async function launchMain(run: Run) {
    // Only the last timed part plays the completion sound; music keeps going between parts.
    if (bookended(run)) await adapter.setTrainingGuard(!!run.plan.cooldown, true, false, false);
    const snapshot = await adapter.startWorkout(run.main);
    set({
      ...fresh,
      snapshot,
      run: { ...run, stage: 'main', snapshot: null },
      sessionId: crypto.randomUUID(),
    });
  }
  async function startCooldown() {
    const run = get().run;
    const plan = run?.plan.cooldown;
    if (!run || !plan) return;
    try {
      await adapter.resolveResult();
      set({ resultResolved: true });
      await adapter.setTrainingGuard(true, true, true, false);
      const snapshot = await adapter.startWorkout(
        bookendConfig(plan.minutes, plan.exercises, run.main.leadInSeconds),
      );
      set({ run: { ...run, stage: 'cooldown', snapshot } });
    } catch (error) {
      // The main result stays pending even if the cool-down cannot run.
      await adapter.setTrainingGuard(false).catch(() => {});
      set({
        run: { ...run, stage: 'done', snapshot: null },
        controlError: `The cool-down could not start: ${String(error)}`,
      });
    }
  }
  async function finishBookend() {
    const run = get().run;
    if (!run || (run.stage !== 'warmup' && run.stage !== 'cooldown')) return;
    const elapsed = Math.floor(run.snapshot?.elapsedMs ?? 0);
    set({ busy: true });
    try {
      if (run.snapshot?.phase === 'completed') await adapter.resolveResult();
      if (run.stage === 'warmup') await launchMain({ ...run, warmupMs: elapsed });
      else {
        await adapter.setTrainingGuard(false);
        const pending = get().pendingResult;
        set({
          run: { ...run, stage: 'done', snapshot: null, cooldownMs: elapsed },
          ...(pending ? { pendingResult: copyResult({ ...pending, cooldownMs: elapsed }) } : {}),
        });
      }
    } catch (error) {
      set({ controlError: String(error) });
    } finally {
      set({ busy: false });
    }
  }
  function completedMain(snapshot: SessionSnapshot) {
    const run = get().run;
    const cooldown = run?.stage === 'main' && !!run.plan.cooldown;
    set({
      snapshot,
      pendingResult: resultFromSnapshot(snapshot, get()),
      resultStatus: 'pending',
      ...(cooldown && run ? { run: { ...run, stage: 'cooldown' as const, snapshot: null } } : {}),
    });
    return cooldown;
  }
  return {
    bookends: readBookends(preferences() ?? { getItem: () => null }),
    setBookend: (phase, patch) => {
      const bookends = { ...get().bookends, [phase]: { ...get().bookends[phase], ...patch } };
      const storage = preferences();
      if (storage) saveBookends(storage, bookends);
      set({ bookends });
    },
    bookendPreview: { warmup: [], cooldown: [] },
    setBookendPreview: (phase, list) =>
      set((s) => ({ bookendPreview: { ...s.bookendPreview, [phase]: structuredClone(list) } })),
    run: null,
    resultResolved: false,
    controlBookend: async (action) => {
      const run = get().run;
      if (get().busy || !run?.snapshot || (run.stage !== 'warmup' && run.stage !== 'cooldown'))
        return false;
      generation++;
      set({ busy: true });
      let snapshot: SessionSnapshot;
      try {
        snapshot = await adapter.controlWorkout(action);
        set({ run: { ...run, snapshot }, controlError: null });
      } catch (error) {
        set({ controlError: String(error) });
        return false;
      } finally {
        set({ busy: false });
      }
      if (action === 'stop' || snapshot.phase === 'completed') await finishBookend();
      return true;
    },
    ladderDraft: {
      direction: 'ascending',
      startReps: '2',
      increment: '2',
      rungs: '5',
      minutes: '10',
      seconds: '0',
      capped: false,
      leadInSeconds: '10',
      warningSeconds: '3',
      exercises: [],
      showChecklist: false,
    },
    setLadderDraft: (patch) =>
      set((s) => ({ ladderDraft: { ...s.ladderDraft, ...patch }, errors: {} })),
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
        (snapshot?.config.type !== 'forTime' && snapshot?.config.type !== 'ladder') ||
        (snapshot?.config.type === 'ladder' &&
          snapshot.ladderCompletedMovements !== ladderTotalMovements(snapshot.config)) ||
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
    setAmrapDraft: (patch) =>
      set((s) => ({ amrapDraft: { ...s.amrapDraft, ...patch }, errors: {} })),
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
    saveResult: async (write = mutateHistory) => {
      const { pendingResult, busy } = get();
      if (!pendingResult || busy) return false;
      set({ busy: true, error: null, scoreLocked: true });
      try {
        await write({ action: 'save', result: pendingResult });
        if (!get().resultResolved) await adapter.resolveResult();
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
        if (!get().resultResolved) await adapter.resolveResult();
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
      const { draft, countdownDraft, intervalsDraft, amrapDraft, forTimeDraft, ladderDraft } =
        get();
      if (mode === 'ladder')
        return {
          type: 'ladder',
          ladder: {
            direction: ladderDraft.direction,
            startReps: numeric(ladderDraft.startReps),
            increment: numeric(ladderDraft.increment),
            rungs: numeric(ladderDraft.rungs),
          },
          ...(ladderDraft.capped ? { timeCapSeconds: countdownDuration(ladderDraft) } : {}),
          leadInSeconds: numeric(ladderDraft.leadInSeconds),
          warningSeconds: numeric(ladderDraft.warningSeconds),
          exercises: structuredClone(ladderDraft.exercises),
        };
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
      if (
        get().pendingResult ||
        busy ||
        (snapshot && ['leadIn', 'running'].includes(snapshot.phase))
      )
        return false;
      try {
        const errors = validateConfig(config);
        if (Object.keys(errors).length) {
          set({ errors });
          return false;
        }
        const copy = structuredClone(config);
        useValidationAttempts.getState().reset(copy.type ?? 'emom');
        useTemplateSources.getState().setSource(copy.type ?? 'emom');
        if (copy.type === 'ladder') {
          set({
            ladderDraft: {
              direction: copy.ladder.direction,
              startReps: String(copy.ladder.startReps),
              increment: String(copy.ladder.increment),
              rungs: String(copy.ladder.rungs),
              minutes: String(Math.floor((copy.timeCapSeconds ?? 600) / 60)),
              seconds: String((copy.timeCapSeconds ?? 600) % 60),
              capped: copy.timeCapSeconds !== undefined,
              leadInSeconds: String(copy.leadInSeconds),
              warningSeconds: String(copy.warningSeconds),
              exercises: copy.exercises,
              showChecklist: false,
            },
            errors: {},
            error: null,
          });
        } else if (copy.type === 'forTime') {
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
      if (useTrainingOwnership.getState().owned || useTrainingOwnership.getState().editing)
        return false;
      if (get().busy || get().pendingResult) return false;
      const previous = get().snapshot;
      const config =
        repeat && previous ? structuredClone(previous.config) : get().getDraftConfig(mode);
      const errors = validateConfig(config);
      set({ errors });
      if (Object.keys(errors).length) return false;
      const plan: Run['plan'] = {};
      if (repeat && previous) Object.assign(plan, structuredClone(get().run?.plan ?? {}));
      else
        for (const phase of ['warmup', 'cooldown'] as const) {
          const { enabled, minutes } = get().bookends[phase];
          if (!enabled) continue;
          const preview = get().bookendPreview[phase];
          const chosen = preview.length ? preview : pickBookend(exercises, phase, minutes);
          if (chosen.length) plan[phase] = { minutes, exercises: chosen.slice(0, minutes) };
        }
      const run: Run = { stage: 'main', main: config, plan, snapshot: null };
      generation++;
      set({ busy: true, error: null, controlError: null, readError: null });
      try {
        if (plan.warmup) {
          await adapter.setTrainingGuard(true, true, false, false);
          const warmup = await adapter.startWorkout(
            bookendConfig(plan.warmup.minutes, plan.warmup.exercises, config.leadInSeconds),
          );
          set({
            ...fresh,
            snapshot: null,
            run: { ...run, stage: 'warmup', snapshot: warmup },
            sessionId: crypto.randomUUID(),
          });
        } else await launchMain(run);
        try {
          await adapter.fullscreen(true);
        } catch {
          set({ error: 'Full screen is unavailable. Your workout is running in this window.' });
        }
        return true;
      } catch (error) {
        if (bookended(run)) await adapter.setTrainingGuard(false).catch(() => {});
        set({ error: String(error) });
        return false;
      } finally {
        set({ busy: false });
      }
    },
    control: async (action) => {
      if (
        get().busy ||
        ((action === 'advance' || action === 'undo') &&
          (get().stopConfirmation || get().finishConfirmation))
      )
        return false;
      const wasPaused = get().snapshot?.paused ?? false;
      generation++;
      set({ busy: true });
      try {
        const snapshot = await adapter.controlWorkout(action);
        set({ controlError: null });
        if (
          snapshot.phase === 'completed' &&
          get().resultStatus === 'none' &&
          !useTrainingOwnership.getState().owned
        ) {
          if (completedMain(snapshot)) await startCooldown();
        } else set({ snapshot });
        if (snapshot.phase === 'cancelled' && get().run && bookended(get().run as Run)) {
          await adapter.setTrainingGuard(false).catch(() => {});
          set({ run: null });
        }
        if (
          action === 'advance' &&
          snapshot.config.type === 'ladder' &&
          snapshot.phase === 'running' &&
          snapshot.ladderCompletedMovements === ladderTotalMovements(snapshot.config)
        )
          set({ finishConfirmation: true, resumeAfterFinish: !wasPaused });
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
      if (useTrainingOwnership.getState().owned) return;
      if (get().busy || polling) return;
      polling = true;
      const ticket = generation;
      try {
        const snapshot = await adapter.readWorkout();
        if (ticket === generation && snapshot && !useTrainingOwnership.getState().owned) {
          set({ readError: null });
          const state = get();
          const run = state.run;
          // After a cool-down the timer holds that block; the main workout's snapshot stays put.
          if (run?.stage === 'done') return;
          if (run && (run.stage === 'warmup' || run.stage === 'cooldown')) {
            if (!run.snapshot) return;
            set({ run: { ...run, snapshot } });
            if (snapshot.phase === 'completed') await finishBookend();
          } else if (snapshot.phase === 'completed' && state.resultStatus === 'none') {
            if (completedMain(snapshot)) await startCooldown();
          } else set({ snapshot });
        }
      } catch (error) {
        if (ticket === generation)
          set({ readError: `The timer could not be read: ${String(error)}` });
      } finally {
        polling = false;
      }
    },
  };
});

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
  state: Pick<State, 'sessionId' | 'checkedExerciseIds' | 'amrapProgress' | 'run'>,
): WorkoutResult {
  return copyResult({
    ...(state.run?.warmupMs !== undefined ? { warmupMs: state.run.warmupMs } : {}),
    id: state.sessionId ?? crypto.randomUUID(),
    completedAt: Date.now(),
    elapsedMs: snapshot.elapsedMs,
    ...(snapshot.config.type === 'ladder'
      ? { ladderCompletedMovements: snapshot.ladderCompletedMovements }
      : {}),
    ...(snapshot.outcome ? { outcome: snapshot.outcome } : {}),
    config: snapshot.config,
    checkedExerciseIds: state.checkedExerciseIds,
    ...(snapshot.config.type === 'amrap' ? { amrapProgress: state.amrapProgress } : {}),
  });
}
