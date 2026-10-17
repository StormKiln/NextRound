import { normalizeSearch } from '@/lib/search';
import { commitLibrary } from '../backup/repository';
import { importedConfig } from '../templates/portable';
import type { PortableCollection } from '../templates/portable-collection';
import { parseTemplateDocument, readTemplates } from '../templates/repository';
import { parseTrainingDocument } from './model';
import { independentSession } from './portable';
import { readTraining } from './repository';
export async function importMixedCollection(
  preview: PortableCollection,
  name: string,
  names: string[],
) {
  const templates = await readTemplates();
  const training = await readTraining();
  const nextT = structuredClone(templates);
  const nextS = structuredClone(training);
  const collectionId = crypto.randomUUID();
  if (templates.collections.some((c) => normalizeSearch(c.name) === normalizeSearch(name)))
    throw new Error('A collection with this name already exists.');
  const used = new Set([
    ...templates.templates.map((t) => normalizeSearch(t.name)),
    ...training.sessions.map((s) => normalizeSearch(s.name)),
  ]);
  for (const name of names) {
    if (!name.trim() || name.length > 120 || used.has(normalizeSearch(name)))
      throw new Error('Choose distinct names that are not already in the library.');
    used.add(normalizeSearch(name));
  }
  const workouts = preview.workouts.map((w, i) => ({
    id: crypto.randomUUID(),
    name: names[i],
    config: importedConfig(w.config),
  }));
  nextT.templates.push(...workouts);
  nextT.collections.push({ id: collectionId, name, workoutIds: workouts.map((w) => w.id) });
  nextS.sessions.push(
    ...(preview.sessions ?? []).map((s, i) => ({
      ...independentSession(s),
      name: names[preview.workouts.length + i],
      collections: [collectionId],
    })),
  );
  await commitLibrary(
    { templates, training },
    { templates: parseTemplateDocument(nextT), training: parseTrainingDocument(nextS) },
  );
  return nextT;
}
