import { durationSeconds, formatTime, type WorkoutConfig } from '@nextround/core';

export function totalScheduledSeconds(config: WorkoutConfig): number {
  return durationSeconds(config) + config.leadInSeconds;
}
export function budgetTimeLabel(config: WorkoutConfig): string {
  const total = totalScheduledSeconds(config);
  if (!Number.isFinite(total)) return 'No time cap — duration unknown';
  const capped = config.type === 'forTime' || config.type === 'ladder';
  return `${capped ? 'Time cap + lead-in' : 'Duration + lead-in'}: ${formatTime(total * 1000)}`;
}
export function parseBudgetMinutes(draft: string): number | null {
  if (!/^\d+$/.test(draft.trim())) return null;
  const minutes = Number(draft);
  return Number.isSafeInteger(minutes) && minutes > 0 && Number.isSafeInteger(minutes * 60)
    ? minutes
    : null;
}
