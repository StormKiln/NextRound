import { invoke, isTauri } from '@tauri-apps/api/core';
import { assertStorageReady } from '../backup/gate';
import { emptyTraining, parseTrainingDocument, type TrainingDocument } from './model';
export const TRAINING_KEY = 'nextround.training.v1';
export const trainingKey = ['training'];
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export function createTrainingRepository(storage: StorageLike) {
  let pending: Promise<unknown> = Promise.resolve();
  const read = async () => {
    assertStorageReady(storage);
    const raw = storage.getItem(TRAINING_KEY);
    return raw === null ? emptyTraining() : parseTrainingDocument(JSON.parse(raw));
  };
  const mutate = (change: (document: TrainingDocument) => void) => {
    const task = pending.then(async () => {
      const document = await read();
      change(document);
      const next = parseTrainingDocument(document);
      assertStorageReady(storage);
      storage.setItem(TRAINING_KEY, JSON.stringify(next));
      return next;
    });
    pending = task.catch(() => undefined);
    return task;
  };
  return { read, mutate };
}
let browser: ReturnType<typeof createTrainingRepository> | undefined;
let pending: Promise<unknown> = Promise.resolve();
export async function readTraining(): Promise<TrainingDocument> {
  if (isTauri()) return parseTrainingDocument(await invoke('read_training'));
  browser ??= createTrainingRepository(window.localStorage);
  return browser.read();
}
export function mutateTraining(
  change: (document: TrainingDocument) => void,
): Promise<TrainingDocument> {
  const task = pending.then(async () => {
    if (!isTauri()) {
      browser ??= createTrainingRepository(window.localStorage);
      return browser.mutate(change);
    }
    const previous = await readTraining();
    const next = structuredClone(previous);
    change(next);
    return parseTrainingDocument(
      await invoke('write_training', { expected: previous, next: parseTrainingDocument(next) }),
    );
  });
  pending = task.catch(() => undefined);
  return task;
}
