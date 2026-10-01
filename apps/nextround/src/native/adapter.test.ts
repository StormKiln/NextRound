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
