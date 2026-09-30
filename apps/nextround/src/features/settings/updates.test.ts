import { snapshotAt } from '@nextround/core';
import { invoke } from '@tauri-apps/api/core';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useWorkout } from '@/state/workout';
import { useUpdates } from './updates';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn(), isTauri: () => true }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn(async () => () => {}) }));
afterEach(() => vi.useRealTimers());
beforeEach(() => {
  vi.mocked(invoke).mockReset();
  useUpdates.setState({
    channel: 'direct',
    status: 'idle',
    available: null,
    error: null,
    lastAttemptAt: null,
    lastCheckedAt: null,
    preferences: { automatic: true, dismissed: null },
  });
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

test('automatic checks discover a new release on return and throttle repeated focus events', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T10:00:00Z'));
  useUpdates.setState({ preferences: { automatic: true, dismissed: null }, lastAttemptAt: null });
  vi.mocked(invoke).mockResolvedValueOnce(null);
  await useUpdates.getState().check(true);
  vi.mocked(invoke).mockResolvedValue({ version: '0.4.0', notes: 'New release' });
  await useUpdates.getState().check(true);
  expect(useUpdates.getState().available).toBeNull();
  vi.advanceTimersByTime(60_000);
  await useUpdates.getState().check(true);
  expect(useUpdates.getState().available?.version).toBe('0.4.0');
  vi.useRealTimers();
});
test('automatic opt-out prevents discovery while manual checks still work', async () => {
  useUpdates.setState({ preferences: { automatic: false, dismissed: null }, lastAttemptAt: null });
  vi.mocked(invoke).mockResolvedValue({ version: '0.4.0', notes: null });
  await useUpdates.getState().check(true);
  expect(useUpdates.getState().available).toBeNull();
  await useUpdates.getState().check();
  expect(useUpdates.getState().available?.version).toBe('0.4.0');
});
test('failed refresh retains a known update and permits a later automatic retry', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-30T11:00:00Z'));
  useUpdates.setState({
    preferences: { automatic: true, dismissed: null },
    lastAttemptAt: null,
    available: { version: '0.4.0', notes: null },
  });
  vi.mocked(invoke).mockRejectedValueOnce(Error('Offline'));
  await useUpdates.getState().check(true);
  expect(useUpdates.getState().available?.version).toBe('0.4.0');
  vi.advanceTimersByTime(60_000);
  vi.mocked(invoke).mockResolvedValueOnce({ version: '0.4.0', notes: null });
  await useUpdates.getState().check(true);
  expect(useUpdates.getState().status).toBe('available');
  expect(useUpdates.getState().lastCheckedAt).toBe(Date.now());
  vi.useRealTimers();
});
test('checks cannot overwrite an in-progress installation or overlap another check', async () => {
  for (const status of ['checking', 'downloading', 'installing'] as const) {
    useUpdates.setState({ status });
    await useUpdates.getState().check();
    expect(useUpdates.getState().status).toBe(status);
  }
  expect(invoke).not.toHaveBeenCalled();
});

test('installation waits for an in-flight check instead of racing its response', async () => {
  useUpdates.setState({ status: 'checking', available: { version: '0.4.0', notes: null } });
  await useUpdates.getState().install();
  expect(useUpdates.getState().status).toBe('checking');
  expect(invoke).not.toHaveBeenCalled();
});
