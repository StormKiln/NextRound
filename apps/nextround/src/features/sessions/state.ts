import type { SessionSnapshot, WorkoutConfig } from '@nextround/core';
import { create } from 'zustand';
import * as adapter from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import {
  type Actual,
  parseRecovery,
  parseResult,
  type Recovery,
  type TrainingResult,
  type TrainingSession,
} from './model';
import { useTrainingOwnership } from './ownership';
import { beginRun, blankBlock, elapsedWithLead, finishBlock, recoveryPaused } from './progress';
import { mutateTraining, readTraining } from './repository';

type State = {
  run: Recovery | null;
  initialized: boolean;
  recovered: boolean;
  paused: boolean;
  busy: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  start: (session: TrainingSession) => Promise<boolean>;
  resumeRecovery: () => Promise<boolean>;
  tick: () => Promise<void>;
  pause: (pause: boolean) => Promise<void>;
  next: () => Promise<void>;
  end: (skip?: boolean) => Promise<void>;
  save: () => Promise<boolean>;
  discard: () => Promise<boolean>;
  setActuals: (blockId: string, actuals: Actual[]) => Promise<void>;
};
let initialized: Promise<void> | undefined;
let polling = false;
let generation = 0;
let lastCheckpoint = 0;
const restConfig = (ms: number): WorkoutConfig => ({
  type: 'countdown',
  durationSeconds: Math.max(1, Math.ceil(ms / 1000)),
  leadInSeconds: 0,
  warningSeconds: 0,
  exercises: [],
});
function cleanSnapshot(snapshot: SessionSnapshot): SessionSnapshot {
  const s = structuredClone(snapshot);
  for (const key of ['elapsedMs', 'remainingMs', 'roundRemainingMs'] as const)
    s[key] = Math.floor(s[key]);
  return s;
}
async function persist(run: Recovery | null) {
  const copy = run ? parseRecovery({ ...structuredClone(run), updatedAt: Date.now() }) : null;
  await mutateTraining((doc) => {
    doc.recovery = copy;
  });
  lastCheckpoint = performance.now();
}
async function context(run: Recovery, awake = true) {
  await adapter.setTrainingGuard(
    true,
    awake && run.stage !== 'review',
    run.index === run.session.blocks.length - 1,
    run.stage === 'rest',
  );
}
async function releaseClock() {
  const snapshot = await adapter.readWorkout();
  if (snapshot?.phase === 'completed') await adapter.resolveResult();
  else if (snapshot && ['leadIn', 'running'].includes(snapshot.phase))
    await adapter.controlWorkout('stop');
  useWorkout.setState({
    snapshot: null,
    pendingResult: null,
    resultStatus: 'discarded',
    sessionId: null,
    finishConfirmation: false,
    stopConfirmation: false,
  });
}
function expose(snapshot: SessionSnapshot, run: Recovery) {
  useWorkout.setState({
    snapshot,
    checkedExerciseIds: run.current.checkedIds,
    amrapProgress: {
      completedMovements: run.current.completedMovements,
      partialValue: run.current.partialValue,
    },
    scoreLocked: false,
    pendingResult: null,
    resultStatus: 'none',
  });
}
export const useTraining = create<State>((set, get) => ({
  run: null,
  initialized: false,
  recovered: false,
  paused: false,
  busy: false,
  error: null,
  initialize: () => {
    initialized ??= (async () => {
      try {
        const doc = await readTraining();
        if (doc.recovery) {
          await adapter.setTrainingGuard(true);
          useTrainingOwnership.setState({ owned: true });
          set({ run: recoveryPaused(doc.recovery), recovered: true, paused: true });
        }
        set({ initialized: true, error: null });
      } catch (error) {
        set({ error: String(error) });
        initialized = undefined;
      }
    })();
    return initialized;
  },
  start: async (session) => {
    if (get().busy || get().run || useWorkout.getState().pendingResult) return false;
    const existing = useWorkout.getState().snapshot;
    if (existing && ['running', 'leadIn'].includes(existing.phase)) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      const run = beginRun(session);
      await adapter.setTrainingGuard(true);
      useTrainingOwnership.setState({ owned: true });
      await persist(run);
      set({ run, recovered: false, paused: false });
      await context(run);
      const snapshot = await adapter.startWorkout(run.session.blocks[0].config);
      run.snapshot = cleanSnapshot(snapshot);
      run.session.blocks[0].config = snapshot.config;
      await persist(run);
      set({ run });
      expose(snapshot, run);
      await adapter
        .fullscreen(true)
        .catch((error) =>
          set({ error: `Workout started, but fullscreen was unavailable: ${String(error)}` }),
        );
      return true;
    } catch (error) {
      if (!get().run) {
        await adapter.setTrainingGuard(false);
        useTrainingOwnership.setState({ owned: false });
      }

      await adapter.controlWorkout('pause').catch(() => {});
      const retained = get().run;
      if (retained) await context(retained, false).catch(() => {});
      set({ error: String(error), paused: true, recovered: !!retained });
      return !!retained;
    } finally {
      set({ busy: false });
    }
  },
  resumeRecovery: async () => {
    const current = get().run;
    if (!current || get().busy) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      const run = recoveryPaused(current);
      await context(run, false);
      await releaseClock();
      if (run.stage === 'work') {
        const config = run.session.blocks[run.index].config;
        const snapshot = await adapter.restoreWorkout(
          config,
          run.snapshot ? elapsedWithLead(run.snapshot) : 0,
          run.snapshot?.ladderCompletedMovements ?? 0,
        );
        run.snapshot = cleanSnapshot(snapshot);
        run.session.blocks[run.index].config = snapshot.config;
        expose(snapshot, run);
      } else if (run.stage === 'rest' && run.restRemainingMs > 0)
        await adapter.restoreWorkout(restConfig(run.restRemainingMs), 0);
      await persist(run);
      set({ run, recovered: false, paused: true });
      return true;
    } catch (error) {
      set({ error: String(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  tick: async () => {
    const state = get();
    if (
      !state.run ||
      state.busy ||
      state.recovered ||
      polling ||
      state.run.stage === 'review' ||
      state.run.stage === 'ready'
    )
      return;
    polling = true;
    const ticket = generation;
    try {
      const snapshot = await adapter.readWorkout();
      if (!snapshot || ticket !== generation) return;
      const run = structuredClone(get().run as Recovery);
      await context(run, !snapshot.paused);
      if (ticket !== generation) return;
      if (run.stage === 'rest') {
        run.restRemainingMs = Math.floor(snapshot.remainingMs);
        set({ run, paused: snapshot.paused });
        if (snapshot.phase === 'completed') {
          await adapter.resolveResult();
          if (ticket !== generation) return;
          run.stage = 'ready';
          await persist(run);
          if (ticket !== generation) return;
          set({ run });
          if (run.session.blocks[run.index].advance === 'automatic') await get().next();
        }
      } else {
        run.snapshot = cleanSnapshot(snapshot);
        run.current.elapsedMs = Math.floor(snapshot.elapsedMs);
        const workout = useWorkout.getState();
        run.current.checkedIds = workout.checkedExerciseIds;
        run.current.completedMovements =
          snapshot.config.type === 'ladder'
            ? (snapshot.ladderCompletedMovements ?? 0)
            : workout.amrapProgress.completedMovements;
        run.current.partialValue = workout.amrapProgress.partialValue;
        useWorkout.setState({ snapshot });
        set({ run, paused: snapshot.paused });
        if (snapshot.phase === 'completed') {
          await adapter.resolveResult();
          if (ticket !== generation) return;
          const done = finishBlock(
            run,
            snapshot.outcome === 'timeCapReached' ? 'partial' : 'complete',
          );
          await persist(done);
          if (ticket !== generation) return;
          set({ run: done });
          await context(done);
          if (ticket !== generation) return;
          if (done.stage === 'rest') await adapter.startWorkout(restConfig(done.restRemainingMs));
          else if (
            done.stage === 'ready' &&
            done.session.blocks[done.index].advance === 'automatic'
          )
            await get().next();
        }
      }
      if (ticket === generation && performance.now() - lastCheckpoint >= 1000)
        await persist(get().run);
    } catch (error) {
      if (ticket !== generation) return;
      await adapter.controlWorkout('pause').catch(() => {});
      if (ticket !== generation) return;
      const retained = get().run;
      if (retained) await context(retained, false).catch(() => {});
      if (ticket !== generation) return;
      set({
        error: `Session paused: ${String(error)}. Recover the session before resuming.`,
        paused: true,
        recovered: true,
      });
    } finally {
      polling = false;
    }
  },
  pause: async (pause) => {
    if (get().busy || get().recovered) return;
    generation++;
    set({ busy: true, error: null });
    try {
      await persist(get().run);
      const run = get().run;
      if (run) await context(run, !pause);
      if (run && ['work', 'rest'].includes(run.stage)) {
        const snapshot = await adapter.controlWorkout(pause ? 'pause' : 'resume');
        if (run.stage === 'work') {
          const next = { ...run, snapshot: cleanSnapshot(snapshot) };
          set({ run: next });
          expose(snapshot, next);
        }
      }
      set({ paused: pause });
      await persist(get().run);
    } catch (error) {
      await adapter.controlWorkout('pause').catch(() => {});
      const retained = get().run;
      if (retained) await context(retained, false).catch(() => {});
      set({ error: String(error), paused: true, recovered: !!retained });
    } finally {
      set({ busy: false });
    }
  },
  next: async () => {
    const current = get().run;
    if (
      !current ||
      get().busy ||
      current.stage !== 'ready' ||
      current.index >= current.session.blocks.length - 1
    )
      return;
    generation++;
    set({ busy: true, error: null });
    try {
      const run = structuredClone(current);
      run.index++;
      run.stage = 'work';
      run.restRemainingMs = 0;
      run.snapshot = null;
      run.current = blankBlock(run.session.blocks[run.index].id);
      await persist(run);
      set({ run, paused: false });
      await context(run);
      const snapshot = await adapter.startWorkout(run.session.blocks[run.index].config);
      run.snapshot = cleanSnapshot(snapshot);
      run.session.blocks[run.index].config = snapshot.config;
      await persist(run);
      set({ run });
      expose(snapshot, run);
    } catch (error) {
      await adapter.controlWorkout('pause').catch(() => {});
      const retained = get().run;
      if (retained) await context(retained, false).catch(() => {});
      set({ error: String(error), paused: true, recovered: !!retained });
    } finally {
      set({ busy: false });
    }
  },
  end: async (skip = false) => {
    const current = get().run;
    if (!current || get().busy) return;
    generation++;
    set({ busy: true, error: null });
    try {
      await releaseClock();
      let run = structuredClone(current);
      if (run.stage === 'work') run = finishBlock(run, skip ? 'skipped' : 'partial');
      if (skip && run.index < run.session.blocks.length - 1) {
        run.stage = 'ready';
        run.restRemainingMs = 0;
      } else {
        run.stage = 'review';
        for (const block of run.session.blocks)
          if (!run.blocks.some((b) => b.blockId === block.id))
            run.blocks.push({ ...blankBlock(block.id), status: 'skipped' });
      }
      await persist(run);
      set({ run, paused: true, recovered: false });
      await context(run, false);
    } catch (error) {
      set({ error: String(error) });
    } finally {
      set({ busy: false });
    }
  },
  save: async () => {
    const run = get().run;
    if (!run || run.stage !== 'review' || get().busy) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      const result: TrainingResult = parseResult({
        id: run.id,
        session: run.session,
        completedAt: run.updatedAt,
        blocks: run.blocks,
        note: '',
      });
      await mutateTraining((doc) => {
        const existing = doc.results.find((r) => r.id === result.id);
        if (existing && JSON.stringify(existing) !== JSON.stringify(result))
          throw new Error('This result is already saved with different data.');
        if (!existing) doc.results.push(result);
        doc.recovery = null;
      });
      await releaseClock();
      await adapter.setTrainingGuard(false);
      useTrainingOwnership.setState({ owned: false });
      set({ run: null, recovered: false });
      await adapter.fullscreen(false).catch(() => {});
      return true;
    } catch (error) {
      set({ error: String(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  discard: async () => {
    if (get().busy) return false;
    generation++;
    set({ busy: true, error: null });
    try {
      await releaseClock();
      await persist(null);
      await adapter.setTrainingGuard(false);
      useTrainingOwnership.setState({ owned: false });
      set({ run: null, recovered: false });
      await adapter.fullscreen(false).catch(() => {});
      return true;
    } catch (error) {
      set({ error: String(error) });
      return false;
    } finally {
      set({ busy: false });
    }
  },
  setActuals: async (blockId, actuals) => {
    const current = get().run;
    if (!current || get().busy) return;
    generation++;
    set({ busy: true, error: null });
    try {
      const run = structuredClone(current);
      if (run.current.blockId === blockId) run.current.actuals = actuals;
      for (const block of run.blocks) if (block.blockId === blockId) block.actuals = actuals;
      await persist(run);
      set({ run });
    } catch (error) {
      set({ error: String(error) });
      throw error;
    } finally {
      set({ busy: false });
    }
  },
}));
