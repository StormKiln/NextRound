import { copyValidatedConfig } from '@/features/templates/repository';
import { useWorkout } from './workout';

const key = 'nextround.screen-reload-drafts.v1';
const names = ['draft', 'countdownDraft', 'amrapDraft', 'intervalsDraft', 'forTimeDraft'] as const;
export function prepareScreenReload(storage: Storage) {
  const state = useWorkout.getState();
  if (
    state.busy ||
    state.pendingResult ||
    (state.snapshot && ['running', 'leadIn'].includes(state.snapshot.phase))
  )
    throw new Error('Finish your active workout and resolve its result before reloading.');
  storage.setItem(
    key,
    JSON.stringify(Object.fromEntries(names.map((name) => [name, state[name]]))),
  );
}
export function restoreScreenDrafts(storage: Storage) {
  const raw = storage.getItem(key);
  if (raw === null) return;
  try {
    const parsed = JSON.parse(raw);
    const defaults = useWorkout.getInitialState();
    for (const name of names) {
      const draft = parsed?.[name];
      const shape = defaults[name];
      if (
        !draft ||
        typeof draft !== 'object' ||
        Object.keys(draft).length !== Object.keys(shape).length
      )
        throw new Error('Invalid draft');
      for (const [field, value] of Object.entries(shape)) {
        if (field === 'exercises')
          copyValidatedConfig({
            type: 'countdown',
            durationSeconds: 1,
            leadInSeconds: 0,
            warningSeconds: 0,
            exercises: draft.exercises,
          });
        else if (typeof draft[field] !== typeof value) throw new Error('Invalid draft field');
      }
    }
    useWorkout.setState(Object.fromEntries(names.map((name) => [name, parsed[name]])));
  } finally {
    storage.removeItem(key);
  }
}
