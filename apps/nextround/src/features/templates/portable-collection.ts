import { normalizeSearch } from '@/lib/search';
import type { TrainingSession } from '../sessions/model';
import { encodeSession, parseSessionFile } from '../sessions/portable';
import { encodeWorkout, MAX_WORKOUT_BYTES, type PortableWorkout, parseWorkout } from './portable';
import { collectionName, type TemplateDocument } from './repository';
export type PortableCollection = {
  name: string;
  workouts: PortableWorkout[];
  sessions?: TrainingSession[];
};
export function parseCollection(raw: string): PortableCollection {
  if (new TextEncoder().encode(raw).length > MAX_WORKOUT_BYTES)
    throw new Error('Collection files must be at most 1 MiB.');
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('This file is not valid collection JSON.');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid collection file.');
  const data = value as Record<string, unknown>;
  if (
    data.format !== 'nextround-collection' ||
    (data.version !== 1 && data.version !== 2) ||
    Object.keys(data).some(
      (k) =>
        ![
          'format',
          'version',
          'name',
          'workouts',
          ...(data.version === 2 ? ['sessions'] : []),
        ].includes(k),
    )
  )
    throw new Error('Unsupported collection file format, version or fields.');
  const name = collectionName(data.name);
  if (!Array.isArray(data.workouts) || data.workouts.length > 100)
    throw new Error('Collection files must contain 1–100 workouts.');
  const seen = new Set<string>();
  const workouts = data.workouts.map((entry: unknown) => {
    if (
      !entry ||
      typeof entry !== 'object' ||
      Array.isArray(entry) ||
      Object.keys(entry).some((k) => !['name', 'config'].includes(k))
    )
      throw new Error('Invalid collection workout.');
    const w = entry as Record<string, unknown>;
    const parsed = parseWorkout(
      JSON.stringify({ format: 'nextround-workout', version: 1, name: w.name, config: w.config }),
    );
    const fingerprint = JSON.stringify([normalizeSearch(parsed.name), parsed.config]);
    if (seen.has(fingerprint))
      throw new Error(
        'Duplicate workout entries. Give identical workouts distinct names before exporting.',
      );
    seen.add(fingerprint);
    return parsed;
  });
  const sessions =
    data.version === 2
      ? (() => {
          if (!Array.isArray(data.sessions) || data.sessions.length > 100)
            throw new Error('Invalid collection sessions.');
          return data.sessions.map((raw) =>
            parseSessionFile(
              JSON.stringify({ format: 'nextround-session', version: 1, session: raw }),
            ),
          );
        })()
      : [];
  if (!workouts.length && !sessions.length)
    throw new Error('Collection files must contain at least one workout or session.');
  return { name, workouts, ...(sessions.length ? { sessions } : {}) };
}
export function encodeCollection(collection: PortableCollection): string {
  const raw = JSON.stringify(
    {
      format: 'nextround-collection',
      version: collection.sessions?.length ? 2 : 1,
      ...(collection.sessions?.length
        ? { sessions: collection.sessions.map((s) => JSON.parse(encodeSession(s)).session) }
        : {}),
      name: collection.name,
      workouts: collection.workouts
        .map((w) => JSON.parse(encodeWorkout(w)))
        .map(({ name, config }) => ({ name, config })),
    },
    null,
    2,
  );
  parseCollection(raw);
  return raw;
}
export function collectionFromDocument(
  document: TemplateDocument,
  id: string,
  sessions: TrainingSession[] = [],
): PortableCollection {
  const collection = document.collections.find((c) => c.id === id);
  if (!collection) throw new Error('This collection no longer exists. Refresh the library.');
  const selected = sessions.filter((s) => s.collections?.includes(id));
  if (!collection.workoutIds.length && !selected.length)
    throw new Error('Add a saved workout to this collection before exporting.');
  return {
    name: collection.name,
    ...(selected.length ? { sessions: selected } : {}),
    workouts: collection.workoutIds.map((id) => {
      const t = document.templates.find((t) => t.id === id);
      if (!t) throw new Error('A collection workout is missing. Refresh the library.');
      return { name: t.name, config: t.config };
    }),
  };
}
export function availableTransferName(name: string, names: string[], max: number): string {
  const used = new Set(names.map(normalizeSearch));
  const base = name.trim();
  if (!used.has(normalizeSearch(base))) return base;
  for (let i = 1; ; i++) {
    const suffix = i === 1 ? ' (copy)' : ` (copy ${i})`;
    let stem = '';
    for (const c of base) {
      if (stem.length + c.length > max - suffix.length) break;
      stem += c;
    }
    const candidate = stem + suffix;
    if (!used.has(normalizeSearch(candidate))) return candidate;
  }
}
