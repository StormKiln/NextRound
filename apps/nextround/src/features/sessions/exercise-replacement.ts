import { type ExerciseEntry, validateConfig } from '@nextround/core';
import { replaceExercise } from '../setup/exercise-replacement';
import type { TrainingSession } from './model';

export function sessionOccurrences(session: TrainingSession) {
  return session.blocks.flatMap((block) =>
    (block.config.exercises ?? []).map((entry) => {
      const key = JSON.stringify([block.id, entry.id]);
      return { key, identity: entry.catalogId ? `catalog:${entry.catalogId}` : key, block, entry };
    }),
  );
}
export type ReplacementChange = { key: string; entry: ExerciseEntry; notice: string };
export function previewReplacements(
  session: TrainingSession,
  keys: string[],
  replacement: ExerciseEntry,
): ReplacementChange[] {
  if (!keys.length || new Set(keys).size !== keys.length)
    throw new Error('Choose at least one unique occurrence.');
  const rows = sessionOccurrences(session);
  return keys.map((key) => {
    const row = rows.find((r) => r.key === key);
    if (!row) throw new Error('An exercise occurrence changed. Review the session again.');
    return {
      key,
      ...replaceExercise(
        row.entry,
        replacement,
        row.block.config.type ?? 'emom',
        row.block.config.type === 'intervals' ? row.block.config.workSeconds : undefined,
      ),
    };
  });
}
export function applyReplacements(
  expected: TrainingSession,
  current: TrainingSession,
  changes: ReplacementChange[],
): TrainingSession {
  if (JSON.stringify(expected) !== JSON.stringify(current))
    throw new Error('Your session changed. Close and review the session before replacing.');
  if (!changes.length || new Set(changes.map((c) => c.key)).size !== changes.length)
    throw new Error('Choose at least one unique occurrence.');
  const draft = structuredClone(current);
  const rows = sessionOccurrences(draft);
  for (const change of changes) {
    const row = rows.find((r) => r.key === change.key);
    if (!row || row.entry.id !== change.entry.id)
      throw new Error('An exercise occurrence changed.');
    const index = row.block.config.exercises!.findIndex((e) => e.id === row.entry.id);
    row.block.config.exercises![index] = structuredClone(change.entry);
  }
  for (const block of draft.blocks) {
    const errors = validateConfig(block.config);
    if (Object.keys(errors).length)
      throw new Error(`${block.name}: ${Object.values(errors).join(' ')}`);
  }
  return draft;
}
