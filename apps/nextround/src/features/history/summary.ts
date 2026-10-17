import type { WorkoutResult } from './repository';

export function summarizeHistory(
  results: readonly Pick<WorkoutResult, 'completedAt' | 'elapsedMs'>[],
) {
  const days = new Set<string>();
  let elapsedMs = 0n;
  for (const result of results) {
    elapsedMs += BigInt(result.elapsedMs);
    const date = new Date(result.completedAt);
    days.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  }
  return { sessions: results.length, elapsedMs, activeDays: days.size };
}

export function formatWorkoutTime(milliseconds: bigint): string {
  let seconds = (milliseconds + 999n) / 1000n;
  const parts: string[] = [];
  for (const [size, label] of [
    [86400n, 'day'],
    [3600n, 'hr'],
    [60n, 'min'],
    [1n, 'sec'],
  ] as const) {
    const value = seconds / size;
    seconds %= size;
    if (value)
      parts.push(`${value.toLocaleString()} ${label}${label === 'day' && value !== 1n ? 's' : ''}`);
  }
  return parts.join(' ') || '0 sec';
}
