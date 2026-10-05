import type { ExerciseEntry, WorkoutConfig } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import type { CatalogMetadata } from '@/data/equipment';
import { exercises, listExercises } from '@/data/exercises';
import { defaultEmomTarget } from '@/features/setup/emom-defaults';
import { type PersonalExercise, readPersonalExercises } from './repository';
export type LibraryExercise = ExerciseEntry & { metadata?: CatalogMetadata };
export const personalQueryKey = ['personal-exercises'];
export function mergeLibrary(
  personal: PersonalExercise[],
  bundled: ExerciseEntry[] = exercises,
): LibraryExercise[] {
  return [
    ...bundled,
    ...personal
      .filter((e) => !e.archived)
      .map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description,
        supportedUnits: [...e.supportedUnits],
        ...(e.defaultTarget ? { target: { ...e.defaultTarget } } : {}),
        metadata: {
          category: e.category,
          equipment: [...e.equipment],
          targetAreas: [...e.targetAreas],
          aliases: [],
        },
      })),
  ];
}
export function toWorkoutEntry(
  entry: ExerciseEntry,
  mode: NonNullable<WorkoutConfig['type']>,
): ExerciseEntry {
  if (mode === 'ladder' && entry.supportedUnits && !entry.supportedUnits.includes('reps'))
    throw Error('Ladder requires reps-compatible exercises.');
  let target = mode === 'ladder' ? undefined : entry.target;
  if (!target && (mode === 'emom' || mode === 'amrap') && !entry.id.startsWith('personal:')) {
    const suggested = defaultEmomTarget(entry);
    if (!entry.supportedUnits || entry.supportedUnits.includes(suggested.unit)) target = suggested;
  }
  return {
    id: crypto.randomUUID(),
    catalogId: entry.id,
    name: entry.name,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.supportedUnits ? { supportedUnits: [...entry.supportedUnits] } : {}),
    ...(target ? { target: { ...target } } : {}),
  };
}
export function useExerciseLibrary() {
  const bundled = useQuery({ queryKey: ['exercises'], queryFn: listExercises, retry: false });
  const personal = useQuery({
    queryKey: personalQueryKey,
    queryFn: readPersonalExercises,
    retry: false,
  });
  return {
    personal,
    bundled,
    library: mergeLibrary(
      personal.isError ? [] : (personal.data?.exercises ?? []),
      bundled.data ?? [],
    ),
  };
}
