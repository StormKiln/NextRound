// @vitest-environment jsdom

import { snapshotAt } from '@nextround/core';
import { beforeEach, expect, it, vi } from 'vitest';
import { prepareScreenReload, restoreScreenDrafts, restoreScreenResolution } from './screen-reload';
import { useWorkout } from './workout';

beforeEach(() => {
  sessionStorage.clear();
  useWorkout.setState(useWorkout.getInitialState());
});
it('preserves all drafts including unfinished numeric input and custom text through a screen reload', () => {
  useWorkout.getState().setForTimeDraft({
    minutes: '',
    capped: true,
    exercises: [
      {
        id: 'custom',
        name: 'A long custom movement',
        description: 'Notes',
        target: { unit: 'reps', value: 7 },
      },
    ],
  });
  useWorkout.getState().setDraft({ minutes: '3' });
  const draft = structuredClone(useWorkout.getState().forTimeDraft);
  prepareScreenReload(sessionStorage);
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  expect(useWorkout.getState().forTimeDraft).toEqual(draft);
  expect(useWorkout.getState().draft.minutes).toBe('3');
  expect(sessionStorage.length).toBe(0);
});
it('refuses active-session reload and rejects malformed recovery data without replacing drafts', () => {
  useWorkout.setState({
    snapshot: snapshotAt({ type: 'forTime', leadInSeconds: 0, warningSeconds: 0 }, 1),
  });
  expect(() => prepareScreenReload(sessionStorage)).toThrow(/active workout/);
  useWorkout.setState({ snapshot: null });
  prepareScreenReload(sessionStorage);
  const key = sessionStorage.key(0) ?? 'missing';
  const data = JSON.parse(sessionStorage.getItem(key) ?? 'null');
  data.drafts.draft.exercises = [{ id: 'a', name: 15 }];
  sessionStorage.setItem(key, JSON.stringify(data));
  expect(() => restoreScreenDrafts(sessionStorage)).toThrow();
  expect(useWorkout.getState().draft).toEqual(useWorkout.getInitialState().draft);
});

vi.mock('@/native/adapter', () => ({ readWorkout: vi.fn() }));
it.each(['saved', 'discarded'] as const)(
  'does not resurrect a %s native result on retry',
  async (status) => {
    const adapter = await import('@/native/adapter');
    const config = {
      type: 'countdown' as const,
      durationSeconds: 1,
      leadInSeconds: 0,
      warningSeconds: 0,
      exercises: [{ id: 'a', name: 'Squat' }],
    };
    const snapshot = snapshotAt(config, 1000);
    useWorkout.setState({
      snapshot,
      resultStatus: status,
      sessionId: 'original-session',
      checkedExerciseIds: ['a'],
      pendingResult: null,
    });
    prepareScreenReload(sessionStorage);
    useWorkout.setState(useWorkout.getInitialState());
    restoreScreenDrafts(sessionStorage);
    restoreScreenResolution(snapshot);
    vi.mocked(adapter.readWorkout).mockResolvedValue(snapshot);
    await useWorkout.getState().poll();
    expect(useWorkout.getState()).toMatchObject({
      resultStatus: status,
      sessionId: 'original-session',
      checkedExerciseIds: ['a'],
      pendingResult: null,
    });
  },
);

it('restores AMRAP progress and never applies a receipt to a different native completion', async () => {
  const config = {
    type: 'amrap' as const,
    durationSeconds: 1,
    leadInSeconds: 0,
    warningSeconds: 0,
    exercises: [{ id: 'a', name: 'Squat', target: { unit: 'reps' as const, value: 10 } }],
  };
  const snapshot = snapshotAt(config, 1000);
  useWorkout.setState({
    snapshot,
    resultStatus: 'saved',
    sessionId: 'amrap-session',
    amrapProgress: { completedMovements: 2, partialValue: 3 },
  });
  prepareScreenReload(sessionStorage);
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  restoreScreenResolution(snapshot);
  expect(useWorkout.getState().amrapProgress).toEqual({ completedMovements: 2, partialValue: 3 });
  useWorkout.setState({ snapshot });
  prepareScreenReload(sessionStorage);
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  restoreScreenResolution({
    ...snapshot,
    config: { ...config, durationSeconds: 2 },
    elapsedMs: 2000,
  });
  expect(useWorkout.getState()).toMatchObject({ resultStatus: 'none', sessionId: null });
});

it('preserves saved-workout source per mode through reload and clears only the repeated mode', async () => {
  const { useTemplateSources } = await import('./template-source');
  const source = {
    id: 'saved',
    name: 'Original',
    config: {
      type: 'countdown' as const,
      durationSeconds: 30,
      leadInSeconds: 0,
      warningSeconds: 0,
    },
  };
  useTemplateSources.getState().setSource('countdown', source);
  useWorkout.getState().setCountdownDraft({ minutes: '2' });
  prepareScreenReload(sessionStorage);
  useTemplateSources.setState({ sources: {} });
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  expect(useTemplateSources.getState().sources.countdown).toEqual(source);
  expect(useWorkout.getState().countdownDraft.minutes).toBe('2');
  useWorkout.getState().loadConfig({ type: 'forTime', leadInSeconds: 0, warningSeconds: 0 });
  expect(useTemplateSources.getState().sources.countdown).toEqual(source);
  useWorkout.getState().loadConfig(source.config);
  expect(useTemplateSources.getState().sources.countdown).toBeUndefined();
});
it('Ladder completion receipt matches native progress before suppressing a resolved result', () => {
  const config = {
    type: 'ladder' as const,
    ladder: { direction: 'ascending' as const, startReps: 2, increment: 2, rungs: 2 },
    leadInSeconds: 0,
    warningSeconds: 0,
    timeCapSeconds: 1,
    exercises: [{ id: 'a', name: 'Squat' }],
  };
  const snapshot = { ...snapshotAt(config, 1000), ladderCompletedMovements: 1 };
  useWorkout.setState({ snapshot, resultStatus: 'saved', sessionId: 'ladder-resolved' });
  prepareScreenReload(sessionStorage);
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  restoreScreenResolution({ ...snapshot, ladderCompletedMovements: 0 });
  expect(useWorkout.getState().resultStatus).toBe('none');
  useWorkout.setState({ snapshot, resultStatus: 'saved', sessionId: 'ladder-resolved' });
  prepareScreenReload(sessionStorage);
  useWorkout.setState(useWorkout.getInitialState());
  restoreScreenDrafts(sessionStorage);
  restoreScreenResolution(snapshot);
  expect(useWorkout.getState()).toMatchObject({
    resultStatus: 'saved',
    sessionId: 'ladder-resolved',
  });
});
