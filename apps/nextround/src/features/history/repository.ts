import {
  type AmrapProgress,
  durationSeconds,
  validAmrapProgress,
  type WorkoutConfig,
} from '@nextround/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { copyValidatedConfig, type TemplateStorage } from '../templates/repository';
export type WorkoutResult = {
  id: string;
  completedAt: number;
  elapsedMs: number;
  config: WorkoutConfig;
  checkedExerciseIds: string[];
  amrapProgress?: AmrapProgress;
};
export type HistoryDocument = { version: 1; results: WorkoutResult[] };
export type HistoryMutation =
  | { action: 'save'; result: WorkoutResult }
  | { action: 'delete'; id: string };
export const HISTORY_STORAGE_KEY = 'nextround.workout-history.v1';
const invalid = 'Workout history could not be read. Existing data has been preserved.';
export function copyResult(value: unknown): WorkoutResult {
  if (!value || typeof value !== 'object') throw new Error(invalid);
  if (
    Object.keys(value).some(
      (key) =>
        ![
          'id',
          'completedAt',
          'elapsedMs',
          'config',
          'checkedExerciseIds',
          'amrapProgress',
        ].includes(key),
    )
  )
    throw new Error(invalid);
  const entry = value as WorkoutResult;
  const config = copyValidatedConfig(entry.config);
  if (
    typeof entry.id !== 'string' ||
    !entry.id.trim() ||
    entry.id.length > 120 ||
    !Number.isSafeInteger(entry.completedAt) ||
    entry.completedAt <= 0 ||
    entry.completedAt > 8640000000000000 ||
    !Number.isSafeInteger(entry.elapsedMs) ||
    entry.elapsedMs !== durationSeconds(config) * 1000 ||
    !Array.isArray(entry.checkedExerciseIds) ||
    new Set(entry.checkedExerciseIds).size !== entry.checkedExerciseIds.length ||
    entry.checkedExerciseIds.some(
      (id) =>
        typeof id !== 'string' ||
        config.type !== 'countdown' ||
        config.showChecklist === false ||
        !config.exercises?.some((e) => e.id === id),
    )
  )
    throw new Error(invalid);
  if (config.type === 'amrap') {
    if (!entry.amrapProgress || !validAmrapProgress(config, entry.amrapProgress))
      throw new Error(invalid);
  } else if (entry.amrapProgress !== undefined) throw new Error(invalid);
  return {
    ...(entry.amrapProgress ? { amrapProgress: { ...entry.amrapProgress } } : {}),
    id: entry.id,
    completedAt: entry.completedAt,
    elapsedMs: entry.elapsedMs,
    config,
    checkedExerciseIds: [...entry.checkedExerciseIds],
  };
}
export function parseHistoryDocument(value: unknown): HistoryDocument {
  if (!value || typeof value !== 'object') throw new Error(invalid);
  if (Object.keys(value).some((key) => !['version', 'results'].includes(key)))
    throw new Error(invalid);
  const document = value as HistoryDocument;
  if (document.version !== 1)
    throw new Error(
      'This workout history version is unsupported. Existing data has been preserved.',
    );
  if (!Array.isArray(document.results)) throw new Error(invalid);
  const results = document.results.map(copyResult);
  if (new Set(results.map((result) => result.id)).size !== results.length) throw new Error(invalid);
  return { version: 1, results };
}
export function createHistoryRepository(storage: TemplateStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  async function read(): Promise<HistoryDocument> {
    const raw = storage.getItem(HISTORY_STORAGE_KEY);
    if (raw === null) return { version: 1, results: [] };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(invalid);
    }
    return parseHistoryDocument(value);
  }
  function mutate(mutation: HistoryMutation): Promise<HistoryDocument> {
    const input = structuredClone(mutation);
    const operation = pending.then(async () => {
      const document = await read();
      if (input.action === 'save') {
        const result = copyResult(input.result);
        const existing = document.results.find((entry) => entry.id === result.id);
        if (existing) {
          if (JSON.stringify(existing) !== JSON.stringify(result))
            throw new Error('This session is already saved with different data.');
          return document;
        }
        document.results.push(result);
      } else {
        const index = document.results.findIndex((entry) => entry.id === input.id);
        if (index < 0) throw new Error('This result no longer exists. Refresh and try again.');
        document.results.splice(index, 1);
      }
      storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(document));
      return structuredClone(document);
    });
    pending = operation.catch(() => undefined);
    return operation;
  }
  return { read, mutate };
}
let browserRepository: ReturnType<typeof createHistoryRepository> | undefined;
function browser() {
  browserRepository ??= createHistoryRepository(window.localStorage);
  return browserRepository;
}
export async function readHistory(): Promise<HistoryDocument> {
  return isTauri() ? parseHistoryDocument(await invoke('read_workout_history')) : browser().read();
}
export async function mutateHistory(mutation: HistoryMutation): Promise<HistoryDocument> {
  return isTauri()
    ? parseHistoryDocument(await invoke('mutate_workout_history', { mutation }))
    : browser().mutate(mutation);
}
