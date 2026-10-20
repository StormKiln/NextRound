import { snapshotAt } from '@nextround/core';
import { beforeEach, expect, it } from 'vitest';
import { useWorkout } from '@/state/workout';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { applySessionRecovery, openSession, useSessionEditor } from './editor';
import { useTraining } from './state';

beforeEach(() => {
  useTraining.setState({ run: null, busy: false });
  useWorkout.setState({ snapshot: null, pendingResult: null, busy: false });
  openSession(result220().session);
});
it('applies recovery as one undoable edit without changing saved source', () => {
  const before = useSessionEditor.getState();
  const id = applySessionRecovery(before.draft, [before.draft.blocks[0].id], 30, 'ready');
  const after = useSessionEditor.getState();
  expect(after.draft.blocks[0].restSeconds).toBe(30);
  expect(after.undo).toEqual(before.draft);
  expect(after.source).toEqual(before.source);
  expect(after.undoFocus).toBe(id);
});
it('refuses pending, active, starting and stale drafts without changing undo', () => {
  const expected = useSessionEditor.getState().draft;
  for (const lock of ['busy', 'pending', 'active', 'training', 'editing']) {
    if (lock === 'busy') useWorkout.setState({ busy: true });
    if (lock === 'pending') useWorkout.setState({ pendingResult: {} as never });
    if (lock === 'active')
      useWorkout.setState({ snapshot: snapshotAt(expected.blocks[0].config, 0) });
    if (lock === 'training') useTraining.setState({ busy: true });
    if (lock === 'editing') useSessionEditor.setState({ editing: { id: 'edit', mode: 'emom' } });
    const before = useSessionEditor.getState();
    expect(() => applySessionRecovery(expected, [expected.blocks[0].id], 30, 'ready')).toThrow(
      'active workout',
    );
    expect(useSessionEditor.getState()).toBe(before);
    useWorkout.setState({ busy: false, pendingResult: null, snapshot: null });
    useTraining.setState({ busy: false });
    useSessionEditor.setState({ editing: null });
  }
  useSessionEditor.setState({ draft: { ...expected, name: 'New' } });
  expect(() => applySessionRecovery(expected, [expected.blocks[0].id], 30, 'ready')).toThrow(
    'changed',
  );
});

it('guards general edits and undo while allowing normal block capture', async () => {
  const { changeSessionDraft, undoSessionDraft } = await import('./editor');
  const before = useSessionEditor.getState();
  useWorkout.setState({ busy: true });
  expect(() =>
    changeSessionDraft((d) => {
      d.name = 'Blocked';
    }),
  ).toThrow('active workout');
  expect(() => undoSessionDraft()).toThrow('active workout');
  expect(useSessionEditor.getState()).toBe(before);
  useWorkout.setState({ busy: false });
  useSessionEditor.setState({ editing: { id: 'edit', mode: 'emom' } });
  changeSessionDraft((d) => {
    d.name = 'Legitimate block capture';
  });
  expect(useSessionEditor.getState().draft.name).toBe('Legitimate block capture');
  useSessionEditor.setState({ editing: null });
  undoSessionDraft();
  expect(useSessionEditor.getState().draft).toEqual(before.draft);
});
