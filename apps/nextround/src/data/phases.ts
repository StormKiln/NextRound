import type { ExerciseEntry } from '@nextround/core';
import { metadataFor } from './equipment';

export const phaseLabels = {
  warmup: 'Warm-up',
  cooldown: 'Cool-down',
} as const;
export type Phase = keyof typeof phaseLabels;
// Tolerant for persisted or catalog data: unknown values and repeats are dropped, order is kept.
export function parsePhases(value: unknown): Phase[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (phase): phase is Phase => typeof phase === 'string' && Object.hasOwn(phaseLabels, phase),
      ),
    ),
  ];
}
export function phasesFor(entry: ExerciseEntry): Phase[] {
  return parsePhases(metadataFor(entry)?.phases);
}
export function matchesPhase(entry: ExerciseEntry, phase: Phase) {
  return phasesFor(entry).includes(phase);
}
