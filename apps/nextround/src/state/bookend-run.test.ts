import {
  type CountdownConfig,
  type SessionSnapshot,
  snapshotAt,
  type WorkoutConfig,
} from '@nextround/core';
import { beforeEach, expect, it, vi } from 'vitest';

const adapter = vi.hoisted(() => ({
  startWorkout: vi.fn(),
  fullscreen: vi.fn(async () => {}),
  controlWorkout: vi.fn(),
  readWorkout: vi.fn(),
  resolveResult: vi.fn(async () => {}),
  setTrainingGuard: vi.fn(async () => {}),
}));
vi.mock('@/native/adapter', () => adapter);

import { useWorkout } from './workout';

const main: CountdownConfig = {
  type: 'countdown',
  durationSeconds: 120,
  leadInSeconds: 5,
  warningSeconds: 3,
  exercises: [],
  showChecklist: true,
};
const move = (name: string) => ({
  id: crypto.randomUUID(),
  catalogId: name,
  name,
  target: { unit: 'seconds' as const, value: 45 },
});
const done = (config: WorkoutConfig): SessionSnapshot => snapshotAt(config, 10_000_000);
const configAt = (call: number) => adapter.startWorkout.mock.calls[call][0] as WorkoutConfig;
const write = vi.fn(async () => ({ version: 1 as const, results: [] }));

beforeEach(() => {
  vi.clearAllMocks();
  adapter.startWorkout.mockImplementation(async (config) => snapshotAt(config, 0));
  useWorkout.setState({
    snapshot: null,
    busy: false,
    run: null,
    pendingResult: null,
    resultStatus: 'none',
    resultResolved: false,
    bookends: { warmup: { enabled: true, minutes: 2 }, cooldown: { enabled: true, minutes: 1 } },
    bookendPreview: { warmup: [move('circles'), move('swings')], cooldown: [move('pose')] },
  });
  useWorkout.getState().loadConfig(main);
});

it('runs the warm-up, the workout and the cool-down, keeping one main result', async () => {
  expect(await useWorkout.getState().start(false, 'countdown')).toBe(true);
  expect(configAt(0)).toMatchObject({ type: 'emom', minutes: 2, leadInSeconds: 5 });
  expect(adapter.setTrainingGuard).toHaveBeenLastCalledWith(true, true, false, false);
  expect(useWorkout.getState().run?.stage).toBe('warmup');
  expect(useWorkout.getState().snapshot).toBeNull();

  adapter.readWorkout.mockResolvedValueOnce(done(configAt(0)));
  await useWorkout.getState().poll();
  expect(adapter.resolveResult).toHaveBeenCalledTimes(1);
  expect(configAt(1)).toEqual(main);
  expect(useWorkout.getState().run).toMatchObject({ stage: 'main', warmupMs: 120000 });
  // A cool-down follows, so the workout's own end is not the final cue.
  expect(adapter.setTrainingGuard).toHaveBeenLastCalledWith(true, true, false, false);

  adapter.readWorkout.mockResolvedValueOnce(done(main));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().pendingResult).toMatchObject({
    elapsedMs: 120000,
    warmupMs: 120000,
  });
  expect(useWorkout.getState().snapshot?.config).toEqual(main);
  expect(adapter.resolveResult).toHaveBeenCalledTimes(2);
  expect(adapter.setTrainingGuard).toHaveBeenLastCalledWith(true, true, true, false);
  expect(configAt(2)).toMatchObject({ type: 'emom', minutes: 1 });
  expect(useWorkout.getState().run?.stage).toBe('cooldown');

  adapter.readWorkout.mockResolvedValueOnce(done(configAt(2)));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().run).toMatchObject({ stage: 'done', cooldownMs: 60000 });
  expect(useWorkout.getState().pendingResult).toMatchObject({ cooldownMs: 60000 });
  expect(adapter.setTrainingGuard).toHaveBeenLastCalledWith(false);
  expect(adapter.resolveResult).toHaveBeenCalledTimes(3);
  // The timer now holds the cool-down; polling must keep showing the main workout.
  adapter.readWorkout.mockResolvedValueOnce(done(configAt(2)));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().snapshot?.config).toEqual(main);

  expect(await useWorkout.getState().saveResult(write)).toBe(true);
  expect(write).toHaveBeenCalledWith({
    action: 'save',
    result: expect.objectContaining({ warmupMs: 120000, cooldownMs: 60000 }),
  });
  expect(adapter.resolveResult).toHaveBeenCalledTimes(3);
});

it('skips the warm-up into the workout and ends the cool-down early without losing the result', async () => {
  await useWorkout.getState().start(false, 'countdown');
  adapter.controlWorkout.mockResolvedValueOnce({
    ...snapshotAt(configAt(0), 35000),
    phase: 'cancelled',
  });
  expect(await useWorkout.getState().controlBookend('stop')).toBe(true);
  expect(adapter.resolveResult).not.toHaveBeenCalled();
  expect(useWorkout.getState().run).toMatchObject({ stage: 'main', warmupMs: 30000 });

  adapter.controlWorkout.mockResolvedValueOnce(done(main));
  await useWorkout.getState().control('pause');
  expect(useWorkout.getState().run?.stage).toBe('cooldown');
  adapter.controlWorkout.mockResolvedValueOnce({
    ...snapshotAt(configAt(2), 20000),
    phase: 'cancelled',
  });
  await useWorkout.getState().controlBookend('stop');
  expect(useWorkout.getState().run).toMatchObject({ stage: 'done', cooldownMs: 15000 });
  expect(await useWorkout.getState().discardResult()).toBe(true);
  expect(adapter.resolveResult).toHaveBeenCalledTimes(1);
});

it('keeps the main result when the cool-down cannot start', async () => {
  useWorkout.setState({
    bookends: { warmup: { enabled: false, minutes: 5 }, cooldown: { enabled: true, minutes: 1 } },
  });
  await useWorkout.getState().start(false, 'countdown');
  expect(configAt(0)).toEqual(main);
  adapter.startWorkout.mockRejectedValueOnce(new Error('busy'));
  adapter.readWorkout.mockResolvedValueOnce(done(main));
  await useWorkout.getState().poll();
  expect(useWorkout.getState().run?.stage).toBe('done');
  expect(useWorkout.getState().pendingResult).toMatchObject({ elapsedMs: 120000 });
  expect(useWorkout.getState().pendingResult).not.toHaveProperty('warmupMs');
  expect(useWorkout.getState().controlError).toMatch(/cool-down could not start/);
  expect(adapter.setTrainingGuard).toHaveBeenLastCalledWith(false);
});

it('leaves workouts without a warm-up or cool-down unchanged and repeats a bookended run', async () => {
  useWorkout.setState({
    bookends: { warmup: { enabled: false, minutes: 5 }, cooldown: { enabled: false, minutes: 5 } },
  });
  await useWorkout.getState().start(false, 'countdown');
  expect(adapter.setTrainingGuard).not.toHaveBeenCalled();
  expect(configAt(0)).toEqual(main);

  useWorkout.setState({
    run: {
      stage: 'done',
      main,
      plan: { warmup: { minutes: 1, exercises: [move('a')] } },
      snapshot: null,
    },
    snapshot: done(main),
    pendingResult: null,
  });
  await useWorkout.getState().start(true);
  expect(configAt(1)).toMatchObject({ type: 'emom', minutes: 1 });
  expect(useWorkout.getState().run?.main).toEqual(main);
});
