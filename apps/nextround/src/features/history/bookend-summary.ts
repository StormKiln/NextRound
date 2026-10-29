import { formatTime } from '@nextround/core';
import type { WorkoutResult } from './repository';

export function bookendSummary(result: Pick<WorkoutResult, 'warmupMs' | 'cooldownMs'>) {
  const parts = [
    result.warmupMs !== undefined && `${formatTime(result.warmupMs)} warm-up`,
    result.cooldownMs !== undefined && `${formatTime(result.cooldownMs)} cool-down`,
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : null;
}
