import { type CountdownConfig, snapshotAt } from '@nextround/core';
import { beforeEach, expect, it, vi } from 'vitest';

vi.mock('@/native/adapter', () => ({
  startWorkout: vi.fn(async (config) => snapshotAt(config, 0)),
  fullscreen: vi.fn(async () => {}),
  controlWorkout: vi.fn(),
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
