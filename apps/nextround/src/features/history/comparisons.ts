import {
  formatAmrapProgress,
  formatElapsed,
  formatLadderProgress,
  formatTime,
  type WorkoutConfig,
} from '@nextround/core';
import type { WorkoutResult } from './repository';

// Derive from performed snapshots only. Never use current library/template data or entry UUIDs.
export function comparisonKey(config: WorkoutConfig): string {
  const type = config.type ?? 'emom';
  const timing =
    config.type === 'ladder'
      ? [
          config.timeCapSeconds ?? null,
          config.ladder.direction,
          config.ladder.startReps,
          config.ladder.increment,
          config.ladder.rungs,
        ]
      : config.type === 'forTime'
        ? [config.timeCapSeconds ?? null]
        : config.type === 'intervals'
          ? [config.rounds, config.workSeconds, config.restSeconds]
          : config.type === 'amrap' || config.type === 'countdown'
            ? [config.durationSeconds]
            : [config.minutes];
  const movements = (config.exercises ?? []).map((e) => [
    e.catalogId ?? null,
    e.name.normalize('NFC').trim(),
    (e.description ?? '').normalize('NFC').trim(),
    e.target ? [e.target.unit, e.target.value] : null,
  ]);
  return JSON.stringify([type, timing, movements]);
}
export function comparableAttempts(
  results: WorkoutResult[],
  selected: WorkoutResult,
): WorkoutResult[] {
  const key = comparisonKey(selected.config);
  return results
    .filter((r) => comparisonKey(r.config) === key)
    .sort((a, b) => b.completedAt - a.completedAt || a.id.localeCompare(b.id));
}
export function compareAttempts(current: WorkoutResult, previous: WorkoutResult): string {
  if (comparisonKey(current.config) !== comparisonKey(previous.config))
    return 'Different workout prescriptions; not compared.';
  if (current.config.type === 'forTime' && !current.config.exercises?.length)
    return 'No movements were specified; active times are not ranked as equivalent work.';
  if (current.config.type === 'forTime' || current.config.type === 'ladder') {
    if (current.outcome !== 'finished' || previous.outcome !== 'finished')
      return 'A time cap was reached; these attempts are not ranked by completion time.';
    const delta = current.elapsedMs - previous.elapsedMs;
    return delta === 0
      ? 'Same active time as the previous attempt.'
      : `${(Math.abs(delta) / 1000)
          .toFixed(3)
          .replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1')
          .replace(
            /^(\d+)$/,
            '$1.0',
          )} seconds ${delta < 0 ? 'faster' : 'slower'} than the previous attempt.`;
  }
  if (current.config.type === 'amrap') {
    const a = current.amrapProgress,
      b = previous.amrapProgress;
    if (!a || !b) return 'Recorded progress is unavailable for comparison.';
    const delta = a.completedMovements - b.completedMovements || a.partialValue - b.partialValue;
    return delta === 0
      ? 'Same recorded progress as the previous attempt.'
      : `${delta > 0 ? 'Further' : 'Less'} recorded progress than the previous attempt.`;
  }
  return 'Scheduled time is fixed; it does not measure performance improvement.';
}
export function attemptSummary(result: WorkoutResult): string {
  const config = result.config;
  if (config.type === 'amrap' && result.amrapProgress)
    return formatAmrapProgress(config, result.amrapProgress);
  if (config.type === 'ladder')
    return `${result.outcome === 'finished' ? 'Finished' : 'Time cap reached'} · ${formatElapsed(result.elapsedMs)} active time · ${formatLadderProgress(config, result.ladderCompletedMovements ?? 0)}`;
  if (config.type === 'forTime')
    return `${result.outcome === 'finished' ? 'Finished' : 'Time cap reached'} · ${formatElapsed(result.elapsedMs)} active time`;
  return `${formatTime(result.elapsedMs)} scheduled active time`;
}
