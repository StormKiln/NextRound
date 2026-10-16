import { ladderReps, type WorkoutConfig } from '@nextround/core';
import { exercises } from '@/data/exercises';
import { copyValidatedConfig } from './repository';
export type PortableWorkout = { name: string; config: WorkoutConfig };
export const MAX_WORKOUT_BYTES = 1024 * 1024;
const bundled = new Set(exercises.map((e) => e.id));
export function parseWorkout(raw: string): PortableWorkout {
  if (new TextEncoder().encode(raw).length > MAX_WORKOUT_BYTES)
    throw new Error('Workout files must be at most 1 MiB.');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid workout JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid workout file.');
  const data = value as Record<string, unknown>;
  if (
    data.format !== 'nextround-workout' ||
    data.version !== 1 ||
    Object.keys(data).some((k) => !['format', 'version', 'name', 'config'].includes(k))
  )
    throw new Error('Unsupported workout file format, version or fields.');
  if (typeof data.name !== 'string' || !data.name.trim() || data.name.trim().length > 120)
    throw new Error('Workout names must contain 1–120 characters.');
  const config = copyValidatedConfig(data.config);
  // Native snapshots can carry inactive fields (including minutes: 0).
  // Validate their wire types too, rather than letting the browser and Rust disagree.
  const fields = config as unknown as Record<string, unknown>;
  for (const key of [
    'minutes',
    'durationSeconds',
    'workSeconds',
    'restSeconds',
    'rounds',
    'timeCapSeconds',
  ]) {
    const value = fields[key];
    if (value === undefined || (key !== 'minutes' && value === null)) continue;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 4294967295)
      throw new Error(`Invalid numeric workout field: ${key}.`);
  }
  if (fields.ladder != null && !ladderReps({ ...config, type: 'ladder' } as WorkoutConfig).length)
    throw new Error('Invalid ladder configuration.');
  if (config.exercises?.some((e) => e.id.length > 120))
    throw new Error('Exercise identifiers must be at most 120 characters.');
  return { name: data.name.trim(), config };
}
export function encodeWorkout(workout: PortableWorkout): string {
  const raw = JSON.stringify(
    { format: 'nextround-workout', version: 1, name: workout.name, config: workout.config },
    null,
    2,
  );
  parseWorkout(raw);
  return raw;
}
export function importedConfig(config: WorkoutConfig): WorkoutConfig {
  const copy = copyValidatedConfig(config);
  for (const e of copy.exercises ?? []) {
    const reference = e.catalogId ?? e.id;
    e.id = crypto.randomUUID();
    if (bundled.has(reference)) e.catalogId = reference;
    else delete e.catalogId;
  }
  return copy;
}
export function availableName(name: string, names: string[]): string {
  const used = new Set(names.map((n) => n.trim().toLowerCase()));
  if (!used.has(name.trim().toLowerCase())) return name.trim();
  for (let i = 1; ; i++) {
    const suffix = i === 1 ? ' (copy)' : ` (copy ${i})`;
    const candidate =
      Array.from(name.trim()).reduce(
        (s, c) => (s.length + c.length <= 120 - suffix.length ? s + c : s),
        '',
      ) + suffix;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
