import type { Actual, TrainingResult } from './model';
import { trainingComparisonKey } from './performance';

export function comparisonEligibility(a: TrainingResult, b: TrainingResult): string | null {
  if (a.id === b.id) return 'Choose two different attempts.';
  if (trainingComparisonKey(a.session) !== trainingComparisonKey(b.session))
    return 'Different prescriptions. Inspect each snapshot independently; no deltas are calculated.';
  if ([...a.blocks, ...b.blocks].some((block) => block.status !== 'complete'))
    return 'Partial or skipped work. Snapshots are shown without deltas.';
  return null;
}
export type SessionComparisonRow = {
  blockIndex: number;
  exerciseIndex: number;
  occurrence: number;
  left?: Actual;
  right?: Actual;
};
export function compareSessionRows(a: TrainingResult, b: TrainingResult): SessionComparisonRow[] {
  if (comparisonEligibility(a, b)) return [];
  return a.session.blocks.flatMap((block, blockIndex) => {
    const other = b.session.blocks[blockIndex];
    const left = a.blocks.find((v) => v.blockId === block.id)?.actuals ?? [];
    const right = b.blocks.find((v) => v.blockId === other.id)?.actuals ?? [];
    return (block.config.exercises ?? []).flatMap((exercise, exerciseIndex) => {
      const otherExercise = other.config.exercises?.[exerciseIndex];
      const av = left.filter((v) => v.exerciseId === exercise.id);
      const bv = right.filter((v) => v.exerciseId === otherExercise?.id);
      const occurrences = [...new Set([...av, ...bv].map((v) => v.occurrence))].sort(
        (a, b) => a - b,
      );
      if (!occurrences.length) occurrences.push(0);
      return occurrences.map((occurrence) => ({
        blockIndex,
        exerciseIndex,
        occurrence,
        left: av.find((v) => v.occurrence === occurrence),
        right: bv.find((v) => v.occurrence === occurrence),
      }));
    });
  });
}
