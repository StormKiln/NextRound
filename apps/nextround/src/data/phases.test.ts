import { expect, it } from 'vitest';
import { createBackup, parseBackup } from '@/features/backup/model';
import { mergeLibrary } from '@/features/exercises/library';
import { copyExercise } from '@/features/exercises/library-view';
import { createPersonalRepository, type PersonalExercise } from '@/features/exercises/repository';
import { emptyTraining } from '@/features/sessions/model';
import { type FillFilters, fillCandidates } from '@/features/setup/fill-workout';
import { catalogMetadata } from './equipment';
import { exercises } from './exercises';
import { matchesPhase, parsePhases, phasesFor } from './phases';

const personal: PersonalExercise = {
  id: 'personal:flow',
  name: 'My flow',
  description: '',
  category: 'Other bodyweight',
  equipment: [],
  targetAreas: ['back'],
  supportedUnits: ['seconds'],
  archived: false,
};
const filters: FillFilters = {
  equipment: null,
  areas: [],
  category: '',
  intensity: '',
  favoritesOnly: false,
  favoriteIds: [],
};

it('parses persisted phases tolerantly, dropping unknown values and repeats', () => {
  expect(parsePhases(undefined)).toEqual([]);
  expect(parsePhases('warmup')).toEqual([]);
  expect(parsePhases(['cooldown', 'warmup', 'cooldown', 'stretch', 3, 'toString'])).toEqual([
    'cooldown',
    'warmup',
  ]);
});

function byId(id: string) {
  const entry = exercises.find((e) => e.id === id);
  if (!entry) throw Error(`Missing ${id}`);
  return entry;
}

it('reads catalog tags, defaults untagged and strength movements to no phase', () => {
  expect(phasesFor(byId('arm-circles'))).toEqual(['warmup']);
  expect(phasesFor(byId('childs-pose'))).toEqual(['cooldown']);
  expect(phasesFor(byId('downward-facing-dog'))).toEqual(['warmup', 'cooldown']);
  expect(phasesFor(byId('burpee'))).toEqual([]);
  expect(phasesFor({ id: 'unknown', name: 'Custom' })).toEqual([]);
  // Workout snapshots resolve tags through their catalog identity.
  expect(matchesPhase({ id: 'copy', catalogId: 'pigeon-pose', name: 'Pigeon' }, 'cooldown')).toBe(
    true,
  );
  for (const [id, meta] of Object.entries(catalogMetadata))
    if (meta.phases?.length) {
      expect(meta.trainingType, id).not.toBe('strength');
      expect(meta.intensity, id).not.toBe('high');
      expect(parsePhases(meta.phases), id).toEqual(meta.phases);
    }
});

it('filters fill candidates by phase without changing other filters', () => {
  const library = mergeLibrary([{ ...personal, phases: ['warmup'] }]);
  const warmups = fillCandidates(library, [], 'emom', {
    ...filters,
    phase: 'warmup',
  });
  expect(warmups.length).toBeGreaterThanOrEqual(15);
  expect(warmups.every((e) => matchesPhase(e, 'warmup'))).toBe(true);
  expect(warmups.some((e) => e.id === personal.id)).toBe(true);
  const cooldowns = fillCandidates(library, [], 'emom', {
    ...filters,
    phase: 'cooldown',
  });
  expect(cooldowns.some((e) => e.id === personal.id)).toBe(false);
  expect(fillCandidates(library, [], 'emom', filters)).toHaveLength(library.length);
});

it('keeps old personal exercises unchanged and round-trips phases through storage, copies and backups', async () => {
  let raw: string | null = JSON.stringify({
    version: 1,
    exercises: [personal],
  });
  const repo = createPersonalRepository({
    getItem: (key) => (key === 'nextround.personal-exercises.v1' ? raw : null),
    setItem: (_key, value) => {
      raw = value;
    },
  });
  const [old] = (await repo.read()).exercises;
  expect(old).toEqual(personal);
  expect('phases' in old).toBe(false);
  expect(mergeLibrary([old])[exercises.length].metadata).not.toHaveProperty('phases');
  const tagged = {
    ...personal,
    phases: ['warmup', 'cooldown'] as PersonalExercise['phases'],
  };
  const document = await repo.mutate({
    action: 'save',
    expected: old,
    exercise: tagged,
  });
  expect(document.exercises[0].phases).toEqual(['warmup', 'cooldown']);
  expect(phasesFor(mergeLibrary(document.exercises)[exercises.length])).toEqual([
    'warmup',
    'cooldown',
  ]);
  await expect(
    repo.mutate({
      action: 'save',
      exercise: {
        ...personal,
        id: 'personal:bad',
        phases: ['nap'] as unknown as PersonalExercise['phases'],
      },
    }),
  ).rejects.toThrow('unreadable');
  await expect(
    repo.mutate({
      action: 'save',
      exercise: {
        ...personal,
        id: 'personal:dupe',
        phases: ['warmup', 'warmup'],
      },
    }),
  ).rejects.toThrow('unreadable');
  const data = {
    templates: { version: 2, templates: [], collections: [] },
    history: { version: 1, results: [] },
    personal: {
      version: 1,
      exercises: [old, { ...tagged, id: 'personal:tagged' }],
    },
    training: emptyTraining(),
    window: { version: 1, closeBehavior: 'minimize' },
    preferences: {},
  };
  expect(parseBackup(JSON.stringify(createBackup(data))).data).toEqual(data);
  const copy = copyExercise(byId('pigeon-pose'));
  expect(copy.phases).toEqual(['cooldown']);
  expect(copyExercise(byId('burpee'))).not.toHaveProperty('phases');
});
