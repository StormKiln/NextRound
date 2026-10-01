import { validateConfig, type WorkoutConfig } from '@nextround/core';
import { invoke, isTauri } from '@tauri-apps/api/core';
export type WorkoutTemplate = { id: string; name: string; config: WorkoutConfig };
export type TemplateDocument = { version: 1; templates: WorkoutTemplate[] };
export type TemplateMutation =
  | { action: 'save'; name: string; config: WorkoutConfig }
  | { action: 'rename'; id: string; name: string }
  | { action: 'delete'; id: string };
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
export function copyValidatedConfig(value: unknown): WorkoutConfig {
  if (
    !record(value) ||
    (value.type !== undefined &&
      value.type !== 'emom' &&
      value.type !== 'countdown' &&
      value.type !== 'intervals')
  )
    throw new Error('Invalid workout configuration.');
  if (value.type !== 'countdown' || value.exercises !== undefined) {
    if (
      !Array.isArray(value.exercises) ||
      value.exercises.some(
        (e) =>
          !record(e) ||
          typeof e.id !== 'string' ||
          !e.id ||
          typeof e.name !== 'string' ||
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
  return structuredClone(config);
}
export function parseTemplateDocument(value: unknown): TemplateDocument {
  if (!record(value)) throw new Error(invalid);
  if (value.version !== 1)
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
    return { id: entry.id, name: nameValue(entry.name), config: copyValidatedConfig(entry.config) };
  });
  return { version: 1, templates };
}
export function createBrowserRepository(storage: TemplateStorage) {
  let pending: Promise<unknown> = Promise.resolve();
  async function read(): Promise<TemplateDocument> {
    const raw = storage.getItem(TEMPLATE_STORAGE_KEY);
    if (raw === null) return { version: 1, templates: [] };
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
      if (input.action === 'save') {
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
        if (input.action === 'delete') document.templates.splice(index, 1);
        else document.templates[index].name = nameValue(input.name);
      }
      storage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(document));
      return structuredClone(document);
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
