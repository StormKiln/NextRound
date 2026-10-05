import type { ExerciseTarget, TargetUnit } from '@nextround/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { categories, type EquipmentId, equipmentLabels } from '@/data/equipment';
import { type FocusArea, focusAreas } from '@/data/focus';
export type PersonalExercise = {
  id: string;
  name: string;
  description: string;
  category: (typeof categories)[number];
  equipment: EquipmentId[];
  targetAreas: FocusArea[];
  supportedUnits: TargetUnit[];
  defaultTarget?: ExerciseTarget;
  sourceId?: string;
  archived: boolean;
};
export type PersonalDocument = { version: 1; exercises: PersonalExercise[] };
export type PersonalMutation = {
  action: 'save';
  exercise: PersonalExercise;
  expected?: PersonalExercise;
};
export const PERSONAL_STORAGE_KEY = 'nextround.personal-exercises.v1';
export const units: TargetUnit[] = ['reps', 'seconds', 'metres', 'calories'];
const invalid =
  'Personal exercises are unreadable or unsupported. Existing data has been preserved.';
function record(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
function keys(v: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(v).some((k) => !allowed.includes(k))) throw Error(invalid);
}
function list(v: unknown, allowed: readonly string[], required = false) {
  if (
    !Array.isArray(v) ||
    (required && !v.length) ||
    v.some((x) => typeof x !== 'string' || !allowed.includes(x)) ||
    new Set(v).size !== v.length
  )
    throw Error(invalid);
}
export function parsePersonalDocument(value: unknown): PersonalDocument {
  if (!record(value)) throw Error(invalid);
  keys(value, ['version', 'exercises']);
  if (value.version !== 1 || !Array.isArray(value.exercises) || value.exercises.length > 500)
    throw Error(invalid);
  const ids = new Set<string>();
  for (const e of value.exercises) {
    if (!record(e)) throw Error(invalid);
    keys(e, [
      'id',
      'name',
      'description',
      'category',
      'equipment',
      'targetAreas',
      'supportedUnits',
      'defaultTarget',
      'sourceId',
      'archived',
    ]);
    if (
      typeof e.id !== 'string' ||
      !/^personal:[A-Za-z0-9-]+$/.test(e.id) ||
      e.id.length > 120 ||
      ids.has(e.id) ||
      typeof e.name !== 'string' ||
      !e.name.trim() ||
      e.name.length > 120 ||
      typeof e.description !== 'string' ||
      e.description.length > 2000 ||
      typeof e.archived !== 'boolean' ||
      !categories.includes(e.category as (typeof categories)[number])
    )
      throw Error(invalid);
    ids.add(e.id);
    list(e.equipment, Object.keys(equipmentLabels));
    list(e.targetAreas, Object.keys(focusAreas));
    list(e.supportedUnits, units, true);
    if (
      e.sourceId !== undefined &&
      (typeof e.sourceId !== 'string' || !e.sourceId.trim() || e.sourceId.length > 120)
    )
      throw Error(invalid);
    if (e.defaultTarget !== undefined) {
      const t = e.defaultTarget;
      if (!record(t)) throw Error(invalid);
      keys(t, ['unit', 'value']);
      if (
        !(e.supportedUnits as unknown[]).includes(t.unit) ||
        typeof t.value !== 'number' ||
        !Number.isInteger(t.value) ||
        t.value < 1 ||
        t.value > (t.unit === 'seconds' ? 86400 : 999999)
      )
        throw Error('Choose a supported target unit and a positive whole value.');
    }
  }
  return structuredClone(value) as PersonalDocument;
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function createPersonalRepository(storage: Pick<Storage, 'getItem' | 'setItem'>) {
  let pending: Promise<unknown> = Promise.resolve();
  async function read(): Promise<PersonalDocument> {
    const raw = storage.getItem(PERSONAL_STORAGE_KEY);
    if (raw === null) return { version: 1, exercises: [] };
    let value: unknown;
    try {
      value = JSON.parse(raw);
    } catch {
      throw Error(invalid);
    }
    return parsePersonalDocument(value);
  }
  function mutate(mutation: PersonalMutation): Promise<PersonalDocument> {
    const input = structuredClone(mutation);
    const operation = pending.then(async () => {
      const document = await read();
      const exercise = parsePersonalDocument({ version: 1, exercises: [input.exercise] })
        .exercises[0];
      if (input.expected) parsePersonalDocument({ version: 1, exercises: [input.expected] });
      const index = document.exercises.findIndex((e) => e.id === exercise.id);
      if (index >= 0) {
        if (canonical(document.exercises[index]) === canonical(exercise)) return document;
        if (!input.expected || canonical(document.exercises[index]) !== canonical(input.expected))
          throw Error('This exercise changed. Close and reopen it to load the latest version.');
        document.exercises[index] = exercise;
      } else {
        if (input.expected) throw Error('This exercise no longer exists. Reload the library.');
        if (document.exercises.length >= 500)
          throw Error('The personal library limit is 500 exercises, including archived entries.');
        document.exercises.push(exercise);
      }
      storage.setItem(PERSONAL_STORAGE_KEY, JSON.stringify(document));
      return parsePersonalDocument(JSON.parse(JSON.stringify(document)));
    });
    pending = operation.catch(() => undefined);
    return operation;
  }
  return { read, mutate };
}
let browser: ReturnType<typeof createPersonalRepository> | undefined;
function repository() {
  browser ??= createPersonalRepository(window.localStorage);
  return browser;
}
export async function readPersonalExercises(): Promise<PersonalDocument> {
  return isTauri()
    ? parsePersonalDocument(await invoke('read_personal_exercises'))
    : repository().read();
}
export async function mutatePersonalExercises(
  mutation: PersonalMutation,
): Promise<PersonalDocument> {
  return isTauri()
    ? parsePersonalDocument(await invoke('mutate_personal_exercises', { mutation }))
    : repository().mutate(mutation);
}
