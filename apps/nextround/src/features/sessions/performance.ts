import { comparisonKey } from '@/features/history/comparisons';
import type { Actual, TrainingResult, TrainingSession } from './model';
export function trainingComparisonKey(session: TrainingSession): string {
  return JSON.stringify(
    session.blocks.map((b) => [
      comparisonKey(b.config),
      b.config.leadInSeconds,
      b.restSeconds,
      b.advance,
    ]),
  );
}
export function compareActual(
  a: Actual,
  b: Actual,
  metric: 'reps' | 'seconds' | 'metres' | 'calories' | 'load',
): number | null {
  if (a.occurrence !== b.occurrence || a[metric] === undefined || b[metric] === undefined)
    return null;
  const kg = (v: Actual) =>
    v.load === undefined ? null : v.load * (v.loadUnit === 'lb' ? 0.45359237 : 1);
  if (metric !== 'load' && kg(a) !== kg(b)) return null;
  return metric === 'load' ? kg(a)! - kg(b)! : a[metric]! - b[metric]!;
}

export function actualHighlights(
  selected: TrainingResult,
  history: TrainingResult[],
  blockId: string,
): string[] {
  if (!selected.blocks.every((b) => b.status === 'complete')) return [];
  const index = selected.session.blocks.findIndex((b) => b.id === blockId);
  if (index < 0) return [];
  const block = selected.session.blocks[index];
  const result = selected.blocks.find((b) => b.blockId === blockId);
  if (!result) return [];
  const prior = history.filter(
    (r) =>
      r.id !== selected.id &&
      r.completedAt < selected.completedAt &&
      r.blocks.every((b) => b.status === 'complete') &&
      trainingComparisonKey(r.session) === trainingComparisonKey(selected.session),
  );
  const messages: string[] = [];
  for (const actual of result.actuals) {
    const exerciseIndex =
      block.config.exercises?.findIndex((e) => e.id === actual.exerciseId) ?? -1;
    if (exerciseIndex < 0) continue;
    for (const metric of ['reps', 'metres', 'calories'] as const) {
      if (actual[metric] === undefined) continue;
      const values = prior.flatMap((r) => {
        const oldBlock = r.session.blocks[index];
        const oldId = oldBlock.config.exercises?.[exerciseIndex]?.id;
        const old = r.blocks
          .find((b) => b.blockId === oldBlock.id)
          ?.actuals.find((a) => a.exerciseId === oldId && a.occurrence === actual.occurrence);
        return old && compareActual(actual, old, metric) !== null ? [old[metric] as number] : [];
      });
      if (values.length && actual[metric]! >= Math.max(...values))
        messages.push(
          `${block.config.exercises?.[exerciseIndex]?.name}: ${actual[metric]} ${metric} ${actual[metric] === Math.max(...values) ? 'matches your recorded best' : 'is a new recorded best'} for this prescription and recorded load (${actual.occurrence === 0 ? 'block total' : `round/rung ${actual.occurrence}`}).`,
        );
    }
  }
  return messages;
}
