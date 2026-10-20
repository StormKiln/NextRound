import { snapshotAt } from '@nextround/core';
import { beforeEach, expect, it } from 'vitest';
import { useWorkout } from '@/state/workout';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { applyRepeatedBlocks, openSession, useSessionEditor } from './editor';
import { useTraining } from './state';

beforeEach(() => {
  useTraining.setState({ run: null, busy: false });
  useWorkout.setState({ snapshot: null, pendingResult: null, busy: false });
  openSession(result220().session);
});
it('commits one independent draft edit with undo while preserving source', () => {
  const before = useSessionEditor.getState();
  const id = applyRepeatedBlocks(structuredClone(before.draft), [before.draft.blocks[0].id], 2);
  const after = useSessionEditor.getState();
  expect(after.draft.blocks).toHaveLength(3);
  expect(after.draft.blocks[1].id).toBe(id);
  expect(after.undo).toEqual(before.draft);
  expect(after.source).toEqual(before.source);
  expect(after.undoFocus).toBe(before.draft.blocks[0].id);
});
it('rejects a stale snapshot without replacing the draft or undo', () => {
  const expected = structuredClone(useSessionEditor.getState().draft);
  useSessionEditor.setState({ draft: { ...expected, name: 'Changed' } });
  const before = useSessionEditor.getState();
  expect(() => applyRepeatedBlocks(expected, [expected.blocks[0].id], 1)).toThrow('changed');
  expect(useSessionEditor.getState()).toBe(before);
});
it('rejects active ownership and block editing at commit time', () => {
  const expected = structuredClone(useSessionEditor.getState().draft);
  for (const lock of ['training', 'workout', 'pending', 'editing', 'starting'] as const) {
    if (lock === 'training') useTraining.setState({ busy: true });
    if (lock === 'workout')
      useWorkout.setState({ snapshot: snapshotAt(expected.blocks[0].config, 0) });
    if (lock === 'starting') useWorkout.setState({ busy: true });
    if (lock === 'pending') useWorkout.setState({ pendingResult: {} as never });
    if (lock === 'editing')
      useSessionEditor.setState({ editing: { id: expected.blocks[0].id, mode: 'emom' } });
    const before = useSessionEditor.getState();
    expect(() => applyRepeatedBlocks(expected, [expected.blocks[0].id], 1)).toThrow(
      'active workout',
    );
    expect(useSessionEditor.getState()).toBe(before);
    useTraining.setState({ busy: false });
    useWorkout.setState({ snapshot: null, pendingResult: null, busy: false });
    useSessionEditor.setState({ editing: null });
  }
});

it.each(['completed', 'cancelled'] as const)(
  'allows editing after a %s result has been handled',
  (phase) => {
    const before = useSessionEditor.getState();
    useWorkout.setState({ snapshot: { ...snapshotAt(before.draft.blocks[0].config, 0), phase } });
    expect(() => applyRepeatedBlocks(before.draft, [before.draft.blocks[0].id], 1)).not.toThrow();
    expect(useSessionEditor.getState().draft.blocks).toHaveLength(2);
  },
);
