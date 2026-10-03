import type { ExerciseEntry } from '@nextround/core';
import { metadataFor } from './equipment';

export const focusAreas = {
  legs: 'Legs',
  glutes: 'Glutes',
  core: 'Core / abs',
  arms: 'Arms',
  shoulders: 'Shoulders',
  chest: 'Chest / pecs',
  back: 'Back',
  lats: 'Lats',
  'whole-body': 'Whole body',
} as const;
export type FocusArea = keyof typeof focusAreas;
export type PickerView = 'type' | 'focus';
export function parseTargetAreas(value: unknown): FocusArea[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    value.some((area) => typeof area !== 'string' || !Object.hasOwn(focusAreas, area)) ||
    new Set(value).size !== value.length
  )
    throw new Error('Invalid exercise focus areas');
  return value as FocusArea[];
}
export function areasFor(entry: ExerciseEntry): FocusArea[] {
  return parseTargetAreas(metadataFor(entry)?.targetAreas);
}
// Lats are part of Back. Whole body is an explicit tag, never a wildcard.
export function expandedAreasFor(entry: ExerciseEntry): FocusArea[] {
  const areas = areasFor(entry);
  return areas.includes('lats') ? [...new Set<FocusArea>([...areas, 'back'])] : areas;
}
export function matchesFocus(entry: ExerciseEntry, selected: FocusArea[]) {
  return !selected.length || selected.some((area) => expandedAreasFor(entry).includes(area));
}
