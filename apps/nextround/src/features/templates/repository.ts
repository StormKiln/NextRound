import { validateConfig, type WorkoutConfig } from '@nextround/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { normalizeSearch } from '@/lib/search';
import { assertStorageReady } from '../backup/gate';
import { collectionError } from './collection-errors';
export type WorkoutTemplate = {
  id: string;
  name: string;
  config: WorkoutConfig;
  favourite?: boolean;
};
export type WorkoutCollection = { id: string; name: string; workoutIds: string[] };
export type TemplateDocument = {
  version: 2;
  templates: WorkoutTemplate[];
  collections: WorkoutCollection[];
};
export type TemplateMutation =
  | {
      action: 'collectionimport';
      name: string;
      workouts: { name: string; config: WorkoutConfig }[];
    }
  | { action: 'collectioncreate'; name: string }
  | { action: 'collectionrename'; id: string; name: string; expectedName: string }
  | { action: 'collectiondelete'; id: string; expectedName: string }
  | { action: 'membership'; id: string; collectionIds: string[]; expectedCollectionIds: string[] }
  | { action: 'save'; name: string; config: WorkoutConfig }
  | { action: 'import'; name: string; config: WorkoutConfig }
  | { action: 'update'; id: string; expected: WorkoutTemplate; name: string; config: WorkoutConfig }
  | { action: 'rename'; id: string; name: string; expectedName: string }
  | { action: 'favourite'; id: string; favourite: boolean }
  | { action: 'duplicate'; id: string; expected: WorkoutTemplate; name: string }
  | { action: 'delete'; id: string; expected: WorkoutTemplate };
export type TemplateStorage = Pick<Storage, 'getItem' | 'setItem'>;
export const TEMPLATE_STORAGE_KEY = 'nextround.workout-templates.v1';
const invalid = 'Saved workouts could not be read. Existing data has been preserved.';
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function nameValue(name: unknown): string {
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 120)
    throw new Error('Enter a workout name from 1 to 120 characters.');
  return name.trim();
}
function rejectUnknown(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('This workout contains unsupported fields. Existing data has been preserved.');
}
export function copyValidatedConfig(value: unknown): WorkoutConfig {
  if (
    !record(value) ||
    (value.type !== undefined &&
      value.type !== 'emom' &&
      value.type !== 'countdown' &&
      value.type !== 'intervals' &&
      value.type !== 'amrap' &&
      value.type !== 'forTime' &&
      value.type !== 'ladder')
  )
    throw new Error('Invalid workout configuration.');
  rejectUnknown(value, [
    'type',
    'minutes',
    'durationSeconds',
    'workSeconds',
    'restSeconds',
    'rounds',
    'leadInSeconds',
    'warningSeconds',
    'exercises',
    'showChecklist',
    'timeCapSeconds',
    'ladder',
  ]);
  if (Array.isArray(value.exercises))
    for (const exercise of value.exercises) {
      if (!record(exercise)) continue;
      rejectUnknown(exercise, [
        'id',
        'catalogId',
        'name',
        'description',
        'target',
        'supportedUnits',
      ]);
      if (record(exercise.target)) rejectUnknown(exercise.target, ['unit', 'value']);
    }
  if (
    (value.type !== 'countdown' && value.type !== 'forTime' && value.type !== 'ladder') ||
    value.exercises !== undefined
  ) {
    if (
      !Array.isArray(value.exercises) ||
      value.exercises.some(
        (e) =>
          !record(e) ||
          typeof e.id !== 'string' ||
          !e.id ||
          typeof e.name !== 'string' ||
          (e.catalogId != null &&
            (typeof e.catalogId !== 'string' || !e.catalogId.trim() || e.catalogId.length > 120)) ||
          (e.description !== undefined &&
            e.description !== null &&
            typeof e.description !== 'string') ||
          (e.supportedUnits !== undefined && !Array.isArray(e.supportedUnits)) ||
          (e.target !== undefined && !record(e.target)),
      )
    )
      throw new Error('Invalid workout exercises.');
  }
  if (value.showChecklist !== undefined && typeof value.showChecklist !== 'boolean')
    throw new Error('Invalid checklist setting.');
  const config = value as WorkoutConfig;
  const errors = validateConfig(config);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(' '));
  const copy = structuredClone(config);
  for (const exercise of copy.exercises ?? []) {
    if (exercise.catalogId === null) delete exercise.catalogId;
  }
  return copy;
}
export function parseTemplateDocument(value: unknown): TemplateDocument {
  if (!record(value)) throw new Error(invalid);
  rejectUnknown(
    value,
    value.version === 1 ? ['version', 'templates'] : ['version', 'templates', 'collections'],
  );
  if (value.version !== 1 && value.version !== 2)
    throw new Error('This saved workout version is unsupported. Existing data has been preserved.');
  if (!Array.isArray(value.templates) || value.templates.length > 100) throw new Error(invalid);
  const ids = new Set<string>();
  const templates = value.templates.map((entry) => {
    if (
      !record(entry) ||
      typeof entry.id !== 'string' ||
      !entry.id ||
      entry.id.length > 120 ||
      ids.has(entry.id)
    )
      throw new Error(invalid);
    ids.add(entry.id);
    rejectUnknown(entry, ['id', 'name', 'config', 'favourite']);
    if (entry.favourite !== undefined && typeof entry.favourite !== 'boolean')
      throw new Error(invalid);
    return {
      ...(entry.favourite ? { favourite: true } : {}),
      id: entry.id,
      name: nameValue(entry.name),
      config: copyValidatedConfig(entry.config),
    };
  });
  const rawCollections = value.version === 1 ? [] : value.collections;
  if (!Array.isArray(rawCollections) || rawCollections.length > 100) throw new Error(invalid);
  const collectionIds = new Set<string>(),
    names = new Set<string>();
  const collections = rawCollections.map((c) => {
    if (
      !record(c) ||
      typeof c.id !== 'string' ||
      !c.id ||
      c.id.length > 120 ||
      collectionIds.has(c.id)
    )
      throw new Error(invalid);
    rejectUnknown(c, ['id', 'name', 'workoutIds']);
    const name = collectionName(c.name);
    if (
      names.has(normalizeSearch(name)) ||
      !Array.isArray(c.workoutIds) ||
      c.workoutIds.some((id) => typeof id !== 'string' || !ids.has(id)) ||
      new Set(c.workoutIds).size !== c.workoutIds.length
    )
      throw new Error(invalid);
    collectionIds.add(c.id);
    names.add(normalizeSearch(name));
    return { id: c.id, name, workoutIds: [...c.workoutIds] as string[] };
  });
  return { version: 2, templates, collections };
}
export function collectionName(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80)
    throw collectionError('name', 'Enter a collection name from 1 to 80 characters.');
  return value.trim();
}
export function memberships(document: TemplateDocument, id: string): string[] {
  return document.collections
    .filter((c) => c.workoutIds.includes(id))
    .map((c) => c.id)
    .sort();
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
export function sameTemplate(a: WorkoutTemplate, b: WorkoutTemplate): boolean {
  return canonical(a) === canonical(b);
}
export function createBrowserRepository(storage: TemplateStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  async function read(): Promise<TemplateDocument> {
    assertStorageReady(storage);
    const raw = storage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw === null) return { version: 2, templates: [], collections: [] };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(invalid);
    }
    return parseTemplateDocument(parsed);
  }
  function mutate(mutation: TemplateMutation): Promise<TemplateDocument> {
    // Snapshot before awaiting so later draft edits cannot change what is saved.
    const input = structuredClone(mutation);
    const operation = pending.then(async () => {
      const document = await read();
      if (input.action === 'collectionimport') {
        const name = collectionName(input.name);
        if (document.collections.some((c) => normalizeSearch(c.name) === normalizeSearch(name)))
          throw collectionError('name', 'A collection with this name already exists.');
        if (!input.workouts.length || input.workouts.length > 100)
          throw new Error('Import 1–100 workouts.');
        if (
          document.collections.length >= 100 ||
          document.templates.length + input.workouts.length > 100
        )
          throw new Error(
            'The library limit is 100 workouts and 100 collections. Free space before importing.',
          );
        const used = new Set(document.templates.map((t) => normalizeSearch(t.name)));
        const added = input.workouts.map((w) => {
          const name = nameValue(w.name);
          if (used.has(normalizeSearch(name)))
            throw new Error(`A workout named “${name}” already exists. Choose another name.`);
          used.add(normalizeSearch(name));
          const config = copyValidatedConfig(w.config);
          for (const exercise of config.exercises ?? []) exercise.id = crypto.randomUUID();
          return { id: crypto.randomUUID(), name, config };
        });
        document.templates.push(...added);
        document.collections.push({
          id: crypto.randomUUID(),
          name,
          workoutIds: added.map((t) => t.id),
        });
      } else if (
        input.action === 'collectioncreate' ||
        input.action === 'collectionrename' ||
        input.action === 'collectiondelete'
      ) {
        const existing =
          input.action === 'collectioncreate'
            ? undefined
            : document.collections.find((c) => c.id === input.id);
        if (
          input.action !== 'collectioncreate' &&
          (!existing || existing.name !== input.expectedName)
        )
          throw collectionError(
            'conflict',
            'This collection changed or was removed. Refresh and try again.',
          );
        if (input.action === 'collectiondelete')
          document.collections = document.collections.filter((c) => c !== existing);
        else {
          const name = collectionName(input.name);
          if (
            document.collections.some(
              (c) => c !== existing && normalizeSearch(c.name) === normalizeSearch(name),
            )
          )
            throw collectionError('name', 'A collection with this name already exists.');
          if (existing) existing.name = name;
          else {
            if (document.collections.length >= 100)
              throw collectionError('capacity', 'You can save up to 100 collections.');
            document.collections.push({ id: crypto.randomUUID(), name, workoutIds: [] });
          }
        }
      } else if (input.action === 'membership') {
        if (!document.templates.some((t) => t.id === input.id))
          throw new Error('This saved workout no longer exists.');
        if (
          canonical(memberships(document, input.id)) !==
          canonical([...input.expectedCollectionIds].sort())
        )
          throw collectionError('conflict', 'Workout collections changed. Refresh and try again.');
        if (
          new Set(input.collectionIds).size !== input.collectionIds.length ||
          input.collectionIds.some((id) => !document.collections.some((c) => c.id === id))
        )
          throw collectionError(
            'conflict',
            'A selected collection no longer exists. Refresh and try again.',
          );
        for (const c of document.collections)
          c.workoutIds = [
            ...c.workoutIds.filter((id) => id !== input.id),
            ...(input.collectionIds.includes(c.id) ? [input.id] : []),
          ];
      } else if (input.action === 'save' || input.action === 'import') {
        if (
          input.action === 'import' &&
          document.templates.some(
            (t) => t.name.trim().toLowerCase() === nameValue(input.name).toLowerCase(),
          )
        )
          throw new Error(`A workout named “${name}” already exists. Choose another name.`);
        if (document.templates.length >= 100)
          throw new Error('You can save up to 100 workouts. Delete one before saving another.');
        document.templates.push({
          id: crypto.randomUUID(),
          name: nameValue(input.name),
          config: copyValidatedConfig(input.config),
        });
      } else {
        const index = document.templates.findIndex((template) => template.id === input.id);
        if (index < 0)
          throw new Error('This saved workout no longer exists. Refresh and try again.');
        if (input.action === 'duplicate' || input.action === 'delete') {
          const current = document.templates[index];
          if (
            current.id !== input.expected.id ||
            current.name !== input.expected.name ||
            canonical(current.config) !== canonical(input.expected.config)
          )
            throw new Error(
              'This saved workout changed. Refresh to review it before confirming again.',
            );
          if (input.action === 'delete') {
            document.templates.splice(index, 1);
            for (const c of document.collections)
              c.workoutIds = c.workoutIds.filter((id) => id !== input.id);
          } else {
            if (document.templates.length >= 100)
              throw new Error('You can save up to 100 workouts. Delete one before saving another.');
            document.templates.push({
              id: crypto.randomUUID(),
              name: nameValue(input.name),
              config: copyValidatedConfig(current.config),
            });
            const copiedId = document.templates[document.templates.length - 1].id;
            for (const c of document.collections)
              if (c.workoutIds.includes(input.id)) c.workoutIds.push(copiedId);
          }
        } else if (input.action === 'update') {
          if (
            canonical({
              id: document.templates[index].id,
              name: document.templates[index].name,
              config: document.templates[index].config,
            }) !==
            canonical({
              id: input.expected.id,
              name: input.expected.name,
              config: input.expected.config,
            })
          )
            throw new Error(
              'This saved workout changed since you loaded it. Reload it or save as new.',
            );
          document.templates[index] = {
            ...document.templates[index],
            id: input.id,
            name: nameValue(input.name),
            config: copyValidatedConfig(input.config),
          };
        } else if (input.action === 'favourite') {
          if (input.favourite) document.templates[index].favourite = true;
          else delete document.templates[index].favourite;
        } else {
          if (document.templates[index].name !== input.expectedName)
            throw new Error(
              'This saved workout name changed. Refresh to review the current name before trying again.',
            );
          document.templates[index].name = nameValue(input.name);
        }
      }
      assertStorageReady(storage);
      storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(document));
      return parseTemplateDocument(JSON.parse(JSON.stringify(document)));
    });
    pending = operation.catch(() => undefined);
    return operation;
  }
  return { read, mutate };
}
let browserRepository: ReturnType<typeof createBrowserRepository> | undefined;
function browser() {
  browserRepository ??= createBrowserRepository(window.localStorage);
  return browserRepository;
}
export async function readTemplates(): Promise<TemplateDocument> {
  return isTauri()
    ? parseTemplateDocument(await invoke('read_workout_templates'))
    : browser().read();
}
export async function mutateTemplates(mutation: TemplateMutation): Promise<TemplateDocument> {
  return isTauri()
    ? parseTemplateDocument(await invoke('mutate_workout_templates', { mutation }))
    : browser().mutate(mutation);
}
