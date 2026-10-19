import { copyValidatedConfig, type WorkoutTemplate } from '../templates/repository';
import type { TrainingBlock } from './model';

export function validateSelection(
  selected: WorkoutTemplate[],
  current: WorkoutTemplate[],
  capacity: number,
): TrainingBlock[] {
  if (!selected.length) throw new Error('Select at least one saved workout.');
  if (new Set(selected.map((item) => item.id)).size !== selected.length)
    throw new Error('Select each saved workout only once.');
  if (selected.length > capacity)
    throw new Error('This selection exceeds the remaining session capacity.');
  return selected.map((expected) => {
    const found = current.find((item) => item.id === expected.id);
    if (!found)
      throw new Error('A selected workout was removed. Refresh and review your selection.');
    if (JSON.stringify(found) !== JSON.stringify(expected))
      throw new Error('A selected workout changed. Refresh and review your selection.');
    return {
      id: crypto.randomUUID(),
      name: found.name,
      config: copyValidatedConfig(found.config),
      restSeconds: 0,
      advance: 'automatic',
    };
  });
}
