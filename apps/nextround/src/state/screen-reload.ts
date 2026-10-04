import type { SessionSnapshot } from '@nextround/core';
import { copyResult, type WorkoutResult } from '@/features/history/repository';
import { copyValidatedConfig, parseTemplateDocument } from '@/features/templates/repository';
import { useTemplateSources } from './template-source';
import { useWorkout } from './workout';

type Resolution = { status: 'saved' | 'discarded'; result: WorkoutResult };
let resolution: Resolution | undefined;
const key = 'nextround.screen-reload-drafts.v1';
const names = [
  'draft',
  'countdownDraft',
  'amrapDraft',
  'intervalsDraft',
  'forTimeDraft',
  'ladderDraft',
] as const;
export function prepareScreenReload(storage: Storage) {
  const state = useWorkout.getState();
  if (
    state.busy ||
    state.pendingResult ||
    (state.snapshot && ['running', 'leadIn'].includes(state.snapshot.phase))
  )
    throw new Error('Finish your active workout and resolve its result before reloading.');
  let resolved: Resolution | undefined;
  if (state.snapshot?.phase === 'completed') {
    if (!state.sessionId || !['saved', 'discarded'].includes(state.resultStatus))
      throw new Error('Resolve the completed result before reloading.');
    resolved = {
      status: state.resultStatus as Resolution['status'],
      result: copyResult({
        id: state.sessionId,
        completedAt: Date.now(),
        elapsedMs: state.snapshot.elapsedMs,
        config: state.snapshot.config,
        checkedExerciseIds: state.checkedExerciseIds,
        ...(state.snapshot.config.type === 'ladder'
          ? { ladderCompletedMovements: state.snapshot.ladderCompletedMovements }
          : {}),
        ...(state.snapshot.outcome ? { outcome: state.snapshot.outcome } : {}),
        ...(state.snapshot.config.type === 'amrap' ? { amrapProgress: state.amrapProgress } : {}),
      }),
    };
  }
  storage.setItem(
    key,
    JSON.stringify({
      drafts: Object.fromEntries(names.map((name) => [name, state[name]])),
      sources: useTemplateSources.getState().sources,
      resolved,
    }),
  );
}
export function restoreScreenDrafts(storage: Storage) {
  resolution = undefined;
  const raw = storage.getItem(key);
  if (raw === null) return;
  try {
    const document = JSON.parse(raw);
    const parsed = document.drafts;
    let receipt: Resolution | undefined;
    if (document.resolved !== undefined) {
      if (!['saved', 'discarded'].includes(document.resolved?.status))
        throw new Error('Invalid result resolution');
      receipt = { status: document.resolved.status, result: copyResult(document.resolved.result) };
    }
    const sources = document.sources ?? {};
    if (!sources || typeof sources !== 'object' || Array.isArray(sources))
      throw new Error('Invalid saved workout sources');
    for (const [mode, source] of Object.entries(sources)) {
      const validated = parseTemplateDocument({ version: 1, templates: [source] }).templates[0];
      if ((validated.config.type ?? 'emom') !== mode)
        throw new Error('Invalid saved workout source mode');
    }
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
    useTemplateSources.setState({ sources });
    resolution = receipt;
  } finally {
    storage.removeItem(key);
  }
}

// The native session survives webview reload. Apply its prior decision only after
// startup reads back the exact same completed configuration, time and outcome.
export function restoreScreenResolution(snapshot: SessionSnapshot | null) {
  const receipt = resolution;
  resolution = undefined;
  if (
    !receipt ||
    snapshot?.phase !== 'completed' ||
    snapshot.elapsedMs !== receipt.result.elapsedMs ||
    snapshot.outcome !== receipt.result.outcome ||
    snapshot.ladderCompletedMovements !== receipt.result.ladderCompletedMovements ||
    JSON.stringify(copyValidatedConfig(snapshot.config)) !== JSON.stringify(receipt.result.config)
  )
    return;
  useWorkout.setState({
    sessionId: receipt.result.id,
    resultStatus: receipt.status,
    pendingResult: null,
    checkedExerciseIds: [...receipt.result.checkedExerciseIds],
    amrapProgress: receipt.result.amrapProgress ?? { completedMovements: 0, partialValue: 0 },
    scoreLocked: true,
  });
}
