import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false, invoke: vi.fn() }));

import { controlWorkout, readWorkout, startWorkout } from './adapter';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it('stop arriving at completion preserves the result for an explicit decision', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'Audio',
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    },
  );
  const now = vi.spyOn(performance, 'now').mockReturnValue(0);
  await startWorkout({
    type: 'countdown',
    durationSeconds: 1,
    leadInSeconds: 0,
    warningSeconds: 0,
  });
  now.mockReturnValue(1000);
  await expect(controlWorkout('stop')).rejects.toThrow(/completed/);
  expect((await readWorkout())?.phase).toBe('completed');
});
it('For Time finish freezes active elapsed and a cap wins a simultaneous finish', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'Audio',
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    },
  );
  const now = vi.spyOn(performance, 'now').mockReturnValue(0);
  const config = { type: 'forTime' as const, leadInSeconds: 1, warningSeconds: 0 };
  await startWorkout(config);
  await expect(controlWorkout('finish')).rejects.toThrow();
  now.mockReturnValue(1000);
  await controlWorkout('pause');
  now.mockReturnValue(5000);
  await controlWorkout('resume');
  now.mockReturnValue(6234);
  expect(await controlWorkout('finish')).toMatchObject({
    phase: 'completed',
    elapsedMs: 1234,
    outcome: 'finished',
  });
  await expect(controlWorkout('finish')).rejects.toThrow();
  await startWorkout({ ...config, leadInSeconds: 0, timeCapSeconds: 1 });
  now.mockReturnValue(7234);
  await expect(controlWorkout('finish')).rejects.toThrow();
  expect(await readWorkout()).toMatchObject({
    phase: 'completed',
    elapsedMs: 1000,
    outcome: 'timeCapReached',
  });
});
it('Ladder advances only by command, pauses on the last movement, and cap wins', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'Audio',
    class {
      play() {
        return Promise.resolve();
      }
      pause() {}
    },
  );
  const now = vi.spyOn(performance, 'now').mockReturnValue(0);
  const config = {
    type: 'ladder' as const,
    ladder: { direction: 'ascending' as const, startReps: 2, increment: 2, rungs: 2 },
    leadInSeconds: 1,
    warningSeconds: 0,
    exercises: [{ id: 'a', name: 'Squat' }],
  };
  await startWorkout(config);
  await expect(controlWorkout('advance')).rejects.toThrow();
  now.mockReturnValue(1000);
  expect(await controlWorkout('advance')).toMatchObject({
    ladderCompletedMovements: 1,
    roundIndex: 1,
    exerciseIndex: 0,
    paused: false,
  });
  expect(await controlWorkout('undo')).toMatchObject({ ladderCompletedMovements: 0 });
  await controlWorkout('advance');
  expect(await controlWorkout('advance')).toMatchObject({
    ladderCompletedMovements: 2,
    paused: true,
    phase: 'running',
  });
  await expect(controlWorkout('advance')).rejects.toThrow();
  expect(await controlWorkout('finish')).toMatchObject({
    phase: 'completed',
    outcome: 'finished',
    ladderCompletedMovements: 2,
  });
  await expect(controlWorkout('undo')).rejects.toThrow();
  await startWorkout({ ...config, leadInSeconds: 0, timeCapSeconds: 1 });
  now.mockReturnValue(2000);
  await expect(controlWorkout('advance')).rejects.toThrow();
  expect(await readWorkout()).toMatchObject({
    outcome: 'timeCapReached',
    ladderCompletedMovements: 0,
  });
});
