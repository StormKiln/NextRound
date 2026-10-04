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
