import { countLabel, type ExerciseEntry, type WorkoutConfig } from './index';
export type LadderPattern = {
  direction: 'ascending' | 'descending' | 'pyramid';
  startReps: number;
  increment: number;
  rungs: number;
};
export type LadderConfig = {
  type: 'ladder';
  ladder: LadderPattern;
  timeCapSeconds?: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises: ExerciseEntry[];
};
export function ladderReps(config: WorkoutConfig): number[] {
  if (config.type !== 'ladder') return [];
  const p = config.ladder;
  if (
    !p ||
    Object.keys(p).some((key) => !['direction', 'startReps', 'increment', 'rungs'].includes(key)) ||
    !['ascending', 'descending', 'pyramid'].includes(p.direction) ||
    !Number.isInteger(p.startReps) ||
    p.startReps < 1 ||
    p.startReps > 1000 ||
    !Number.isInteger(p.increment) ||
    p.increment < 1 ||
    p.increment > 1000 ||
    !Number.isInteger(p.rungs) ||
    p.rungs < 1 ||
    p.rungs > 50
  )
    return [];
  const up = Array.from(
    { length: p.rungs },
    (_, i) => p.startReps + (p.direction === 'descending' ? -1 : 1) * i * p.increment,
  );
  if (up.some((n) => n < 1)) return [];
  return p.direction === 'pyramid' ? [...up, ...up.slice(0, -1).reverse()] : up;
}
export function ladderTotalMovements(config: WorkoutConfig): number {
  return ladderReps(config).length * (config.exercises?.length ?? 0);
}
export function validLadderProgress(config: LadderConfig, completed: unknown): completed is number {
  return (
    Number.isSafeInteger(completed) &&
    (completed as number) >= 0 &&
    (completed as number) <= ladderTotalMovements(config)
  );
}
export function formatLadderProgress(config: LadderConfig, completed: number): string {
  return `${Math.floor(completed / config.exercises.length)} of ${countLabel(ladderReps(config).length, 'rung')} completed · ${completed} of ${countLabel(ladderTotalMovements(config), 'movement')}`;
}
