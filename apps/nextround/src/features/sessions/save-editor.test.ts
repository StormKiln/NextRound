import { beforeEach, expect, it, vi } from 'vitest';
import { useWorkout } from '@/state/workout';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { changeSessionDraft, openSession, saveSessionDraft, useSessionEditor } from './editor';
import { emptyTraining, type TrainingDocument } from './model';
import { useTraining } from './state';

const storage = vi.hoisted(() => ({
  doc: null as TrainingDocument | null,
  release: null as (() => void) | null,
  delay: false,
}));
vi.mock('./repository', () => ({
  trainingKey: ['training'],
  mutateTraining: async (change: (doc: TrainingDocument) => void) => {
    const next = structuredClone(storage.doc!);
    change(next);
    if (storage.delay)
      await new Promise<void>((resolve) => {
        storage.release = resolve;
      });
    storage.doc = next;
    return next;
  },
}));
beforeEach(() => {
  useWorkout.setState({ snapshot: null, pendingResult: null, busy: false });
  useTraining.setState({ run: null, busy: false });
  const s = result220().session;
  storage.doc = { ...emptyTraining(), sessions: [structuredClone(s)] };
  storage.delay = false;
  storage.release = null;
  openSession(s);
});
it('preserves newer edits and advances baseline after deferred native save', async () => {
  changeSessionDraft((d) => {
    d.name = 'First save';
  });
  storage.delay = true;
  const pending = saveSessionDraft();
  await vi.waitFor(() => expect(storage.release).not.toBeNull());
  changeSessionDraft((d) => {
    d.name = 'Newer edit';
  });
  storage.release!();
  await pending;
  expect(useSessionEditor.getState().draft.name).toBe('Newer edit');
  expect(useSessionEditor.getState().source?.name).toBe('First save');
  storage.delay = false;
  await saveSessionDraft();
  expect(storage.doc!.sessions[0].name).toBe('Newer edit');
});
it('does not replace an independently opened editor after save completes', async () => {
  changeSessionDraft((d) => {
    d.name = 'Saving';
  });
  storage.delay = true;
  const pending = saveSessionDraft();
  await vi.waitFor(() => expect(storage.release).not.toBeNull());
  openSession();
  const before = useSessionEditor.getState();
  storage.release!();
  await pending;
  expect(useSessionEditor.getState()).toBe(before);
});
