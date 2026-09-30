import { snapshotAt } from '@nextround/core';
import { invoke } from '@tauri-apps/api/core';
import { beforeEach, expect, test, vi } from 'vitest';
import { useWorkout } from '@/state/workout';
import { useUpdates } from './updates';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
beforeEach(() => {
  vi.mocked(invoke).mockReset();
  useUpdates.setState({ channel: 'direct', status: 'idle', available: null, error: null });
  useWorkout.setState({ snapshot: null });
});
test('offline checks surface an actionable error and permit retry', async () => {
  vi.mocked(invoke).mockRejectedValueOnce(Error('Network unavailable'));
  await useUpdates.getState().check();
  expect(useUpdates.getState().status).toBe('error');
  expect(useUpdates.getState().error).toContain('Network unavailable');
  vi.mocked(invoke).mockResolvedValueOnce(null);
  await useUpdates.getState().check();
  expect(useUpdates.getState().status).toBe('current');
});
test('failed signature installation stays in error rather than success', async () => {
  useUpdates.setState({ available: { version: '0.3.0', notes: null }, status: 'available' });
  vi.mocked(invoke).mockRejectedValueOnce(Error('Signature verification failed'));
  await useUpdates.getState().install();
  expect(useUpdates.getState().status).toBe('error');
  expect(useUpdates.getState().error).toContain('Signature');
});
test('running and paused workouts both prevent installation', async () => {
  const snapshot = snapshotAt(
    {
      minutes: 15,
      leadInSeconds: 10,
      warningSeconds: 3,
      exercises: [{ id: 'a', name: 'Air squat', description: '' }],
    },
    12000,
  );
  for (const paused of [false, true]) {
    useWorkout.setState({ snapshot: { ...snapshot, paused } });
    useUpdates.setState({ available: { version: '0.3.0', notes: null }, status: 'available' });
    await useUpdates.getState().install();
    expect(useUpdates.getState().status).toBe('available');
    expect(useUpdates.getState().error).toContain('workout');
  }
  expect(invoke).not.toHaveBeenCalled();
});
test('Apple distribution never queries the direct updater', async () => {
  useUpdates.setState({ channel: 'app-store' });
  await useUpdates.getState().check();
  expect(useUpdates.getState().status).toBe('idle');
  expect(invoke).not.toHaveBeenCalled();
});
