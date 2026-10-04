import { type CountdownConfig, snapshotAt } from '@nextround/core';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/native/adapter', () => ({
  startWorkout: vi.fn(async (config) => snapshotAt(config, 0)),
  fullscreen: vi.fn(async () => {}),
  controlWorkout: vi.fn(),
  readWorkout: vi.fn(),
  resolveResult: vi.fn(async () => {}),
}));

import { useWorkout } from './workout';

const config: CountdownConfig = {
  type: 'countdown',
  durationSeconds: 125,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'a', name: 'Squat', target: { unit: 'reps', value: 5 } }],
  showChecklist: true,
};
beforeEach(() => useWorkout.setState({ snapshot: null, busy: false }));
it('loads isolated validated drafts and refuses replacement during active or busy sessions', () => {
  const source = structuredClone(config);
  expect(useWorkout.getState().loadConfig(source)).toBe(true);
  if (source.exercises) source.exercises[0].name = 'Changed';
  const exported = useWorkout.getState().getDraftConfig('countdown');
  expect(exported).toEqual(config);
  if (exported.exercises) exported.exercises[0].name = 'Changed again';
  expect(useWorkout.getState().getDraftConfig('countdown')).toEqual(config);
  expect(useWorkout.getState().loadConfig({ ...config, durationSeconds: 0 })).toBe(false);
  useWorkout.setState({ busy: true });
  expect(useWorkout.getState().loadConfig(config)).toBe(false);
  useWorkout.setState({ busy: false, snapshot: snapshotAt(config, 0) });
  expect(useWorkout.getState().loadConfig(config)).toBe(false);
});
it('keeps checks independent from snapshots and clears them on each successful start and repeat', async () => {
  useWorkout.getState().loadConfig(config);
  await useWorkout.getState().start(false, 'countdown');
  useWorkout.getState().toggleChecked('a');
  expect(useWorkout.getState().checkedExerciseIds).toEqual(['a']);
  expect(useWorkout.getState().snapshot?.phase).toBe('running');
  useWorkout.setState({ snapshot: { ...snapshotAt(config, 1000), paused: true } });
  expect(useWorkout.getState().checkedExerciseIds).toEqual(['a']);
  await useWorkout.getState().start(true);
  expect(useWorkout.getState().checkedExerciseIds).toEqual([]);
});

it('freezes a completed result and blocks repeat/loading until explicitly discarded', async () => {
  const adapter = await import('@/native/adapter');
  useWorkout.getState().loadConfig(config);
  await useWorkout.getState().start(false, 'countdown');
  useWorkout.getState().toggleChecked('a');
  vi.mocked(adapter.readWorkout).mockResolvedValue(snapshotAt(config, 125000));
  await useWorkout.getState().poll();
  const result = structuredClone(useWorkout.getState().pendingResult);
  expect(result).toMatchObject({ elapsedMs: 125000, checkedExerciseIds: ['a'], config });
  expect(useWorkout.getState().loadConfig(config)).toBe(false);
  expect(await useWorkout.getState().start(true)).toBe(false);
  await useWorkout.getState().poll();
  expect(useWorkout.getState().pendingResult).toEqual(result);
  expect(await useWorkout.getState().discardResult()).toBe(true);
  expect(useWorkout.getState().pendingResult).toBeNull();
  expect(await useWorkout.getState().start(true)).toBe(true);
});

it('pauses before Stop confirmation and restores only a previously running session', async () => {
  const adapter = await import('@/native/adapter');
  let nativeSnapshot = snapshotAt(config, 120000);
  vi.mocked(adapter.controlWorkout).mockImplementation(async (action) => {
    nativeSnapshot = {
      ...nativeSnapshot,
      paused: action === 'pause',
      phase: action === 'stop' ? 'cancelled' : nativeSnapshot.phase,
    };
    return nativeSnapshot;
  });
  useWorkout.setState({ snapshot: nativeSnapshot, pendingResult: null });
  await useWorkout.getState().requestStop();
  expect(useWorkout.getState().stopConfirmation).toBe(true);
  expect(useWorkout.getState().snapshot).toMatchObject({ paused: true, remainingMs: 5000 });
  await useWorkout.getState().cancelStop();
  expect(useWorkout.getState().snapshot?.paused).toBe(false);
  nativeSnapshot = { ...nativeSnapshot, paused: true };
  useWorkout.setState({ snapshot: nativeSnapshot });
  await useWorkout.getState().requestStop();
  await useWorkout.getState().cancelStop();
  expect(useWorkout.getState().snapshot?.paused).toBe(true);
});
it('does not open Stop confirmation if pausing fails or completion wins the race', async () => {
  const adapter = await import('@/native/adapter');
  useWorkout.setState({ snapshot: snapshotAt(config, 0), stopConfirmation: false });
  vi.mocked(adapter.controlWorkout).mockRejectedValueOnce(new Error('Unavailable'));
  await useWorkout.getState().requestStop();
  expect(useWorkout.getState().stopConfirmation).toBe(false);
  expect(useWorkout.getState().controlError).toContain('Unavailable');
  vi.mocked(adapter.controlWorkout).mockResolvedValueOnce(snapshotAt(config, 125000));
  await useWorkout.getState().requestStop();
  expect(useWorkout.getState().stopConfirmation).toBe(false);
});

it('tracks explicit AMRAP movements and corrections without conflating mixed target units', async () => {
  const adapter = await import('@/native/adapter');
  const amrap = {
    type: 'amrap' as const,
    durationSeconds: 60,
    leadInSeconds: 0,
    warningSeconds: 3,
    exercises: [
      { id: 'a', name: 'Squat', target: { unit: 'reps' as const, value: 10 } },
      { id: 'b', name: 'Row', target: { unit: 'metres' as const, value: 100 } },
    ],
  };
  useWorkout.setState({ pendingResult: null, snapshot: null });
  expect(useWorkout.getState().loadConfig(amrap)).toBe(true);
  await useWorkout.getState().start(false, 'amrap');
  useWorkout.getState().setAmrapProgress({ completedMovements: 3, partialValue: 40 });
  expect(useWorkout.getState().amrapProgress).toEqual({ completedMovements: 3, partialValue: 40 });
  useWorkout.getState().setAmrapProgress({ completedMovements: 2, partialValue: 40 });
  expect(useWorkout.getState().amrapProgress.completedMovements).toBe(3);
  vi.mocked(adapter.readWorkout).mockResolvedValue(snapshotAt(amrap, 60000));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().pendingResult?.amrapProgress).toEqual({
    completedMovements: 3,
    partialValue: 40,
  });
  useWorkout.getState().setAmrapProgress({ completedMovements: 2, partialValue: 5 });
  expect(useWorkout.getState().pendingResult?.amrapProgress).toEqual({
    completedMovements: 2,
    partialValue: 5,
  });
  await useWorkout.getState().discardResult();
  await useWorkout.getState().start(true);
  expect(useWorkout.getState().amrapProgress).toEqual({ completedMovements: 0, partialValue: 0 });
});

it('clears recovered timer errors independently and preserves unrelated operation errors', async () => {
  const adapter = await import('@/native/adapter');
  useWorkout.setState({ error: 'Could not save a result', pendingResult: null, busy: false });
  vi.mocked(adapter.controlWorkout).mockRejectedValueOnce(new Error('Pause unavailable'));
  await useWorkout.getState().control('pause');
  expect(useWorkout.getState().controlError).toContain('Pause unavailable');
  vi.mocked(adapter.readWorkout).mockRejectedValueOnce(new Error('Read unavailable'));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().readError).toContain('Read unavailable');
  vi.mocked(adapter.readWorkout).mockResolvedValue(snapshotAt(config, 1000));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().readError).toBeNull();
  expect(useWorkout.getState().controlError).toContain('Pause unavailable');
  vi.mocked(adapter.controlWorkout).mockResolvedValue(snapshotAt(config, 1000));
  await useWorkout.getState().control('pause');
  expect(useWorkout.getState().controlError).toBeNull();
  expect(useWorkout.getState().error).toBe('Could not save a result');
});
it('ignores an obsolete read success after a control advances the session generation', async () => {
  const adapter = await import('@/native/adapter');
  let finish!: (value: ReturnType<typeof snapshotAt>) => void;
  vi.mocked(adapter.readWorkout).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  useWorkout.setState({ readError: 'Existing read failure', busy: false });
  const pending = useWorkout.getState().poll();
  vi.mocked(adapter.controlWorkout).mockResolvedValue({
    ...snapshotAt(config, 1000),
    paused: true,
  });
  await useWorkout.getState().control('pause');
  finish(snapshotAt(config, 0));
  await pending;
  expect(useWorkout.getState().snapshot?.paused).toBe(true);
  expect(useWorkout.getState().readError).toBe('Existing read failure');
});
it('For Time finish confirmation pauses, restores state, freezes checks and saves its outcome', async () => {
  const adapter = await import('@/native/adapter');
  const c = {
    type: 'forTime' as const,
    leadInSeconds: 0,
    warningSeconds: 3,
    exercises: config.exercises,
  };
  useWorkout.setState({
    snapshot: null,
    pendingResult: null,
    resultStatus: 'none',
    stopConfirmation: false,
  });
  expect(useWorkout.getState().loadConfig(c)).toBe(true);
  expect(useWorkout.getState().getDraftConfig('forTime')).toMatchObject(c);
  let current = snapshotAt(c, 1234);
  vi.mocked(adapter.controlWorkout).mockImplementation(
    async (action) =>
      (current = {
        ...current,
        paused: action === 'pause',
        ...(action === 'finish' ? { phase: 'completed', outcome: 'finished' } : {}),
      }),
  );
  useWorkout.setState({ snapshot: current, checkedExerciseIds: [] });
  await useWorkout.getState().requestFinish();
  expect(useWorkout.getState().finishConfirmation).toBe(true);
  expect(useWorkout.getState().snapshot?.paused).toBe(true);
  useWorkout.getState().toggleChecked('a');
  expect(useWorkout.getState().checkedExerciseIds).toEqual([]);
  await useWorkout.getState().cancelFinish();
  expect(useWorkout.getState().snapshot?.paused).toBe(false);
  current = { ...current, paused: true };
  useWorkout.setState({ snapshot: current });
  await useWorkout.getState().requestFinish();
  await useWorkout.getState().cancelFinish();
  expect(useWorkout.getState().snapshot?.paused).toBe(true);
  await useWorkout.getState().requestFinish();
  await useWorkout.getState().control('finish');
  expect(useWorkout.getState().pendingResult).toMatchObject({
    outcome: 'finished',
    elapsedMs: 1234,
  });
  vi.mocked(adapter.readWorkout).mockResolvedValue(current);
  await useWorkout.getState().poll();
  expect(useWorkout.getState().pendingResult).toMatchObject({
    elapsedMs: 1234,
    outcome: 'finished',
  });
  useWorkout.setState({ pendingResult: null, resultStatus: 'none', finishConfirmation: false });
});
