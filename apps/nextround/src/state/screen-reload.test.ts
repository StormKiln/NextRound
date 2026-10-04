// @vitest-environment jsdom

import { snapshotAt } from '@nextround/core';
import { beforeEach, expect, it } from 'vitest';
import { prepareScreenReload, restoreScreenDrafts } from './screen-reload';
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
  data.draft.exercises = [{ id: 'a', name: 15 }];
  sessionStorage.setItem(key, JSON.stringify(data));
  expect(() => restoreScreenDrafts(sessionStorage)).toThrow();
  expect(useWorkout.getState().draft).toEqual(useWorkout.getInitialState().draft);
});
