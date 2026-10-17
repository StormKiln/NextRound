import { expect, it } from 'vitest';
import { collectionFromDocument, encodeCollection, parseCollection } from './portable-collection';
import { createBrowserRepository, type TemplateDocument } from './repository';

const config = {
  minutes: 3,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'e', name: 'Rowing' }],
};
const collection = {
  name: 'Training',
  workouts: [
    { name: 'Morning', config },
    { name: 'Evening', config },
  ],
};
it('round trips a distinct envelope without local metadata and exports all members in collection order', () => {
  const doc: TemplateDocument = {
    version: 2,
    templates: [
      { id: 'a', name: 'Morning', config, favourite: true },
      { id: 'b', name: 'Evening', config },
    ],
    collections: [{ id: 'c', name: 'Training', workoutIds: ['b', 'a'] }],
  };
  const exported = collectionFromDocument(doc, 'c');
  expect(exported.workouts.map((w) => w.name)).toEqual(['Evening', 'Morning']);
  const raw = encodeCollection(exported);
  expect(parseCollection(raw)).toEqual(exported);
  expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['format', 'name', 'version', 'workouts']);
  expect(raw).not.toContain('favourite');
  expect(() => collectionFromDocument({ ...doc, collections: [] }, 'c')).toThrow();
});
it('rejects invalid envelopes, unsupported fields, empty/oversized collections and duplicate names', () => {
  const good = JSON.parse(encodeCollection(collection));
  for (const value of [
    { ...good, version: 2 },
    { ...good, history: [] },
    { ...good, workouts: [] },
    { ...good, workouts: [...good.workouts, good.workouts[0]] },
    { ...good, workouts: [{ ...good.workouts[0], config: { ...config, minutes: -1 } }] },
  ])
    expect(() => parseCollection(JSON.stringify(value))).toThrow();
  expect(() => parseCollection(' '.repeat(1048577))).toThrow();
});
it('imports a whole collection atomically with independent identities and fresh destination checks', async () => {
  let raw: string | null = null;
  let fail = false;
  const repo = createBrowserRepository({
    getItem: () => raw,
    setItem: (_, value) => {
      if (fail) throw Error('Disk full');
      raw = value;
    },
  });
  const doc = await repo.mutate({ action: 'collectionimport', ...collection });
  expect(doc.templates).toHaveLength(2);
  expect(doc.collections[0].workoutIds).toEqual(doc.templates.map((t) => t.id));
  expect(doc.templates.every((t) => !t.favourite)).toBe(true);
  const before = raw;
  await expect(repo.mutate({ action: 'collectionimport', ...collection })).rejects.toThrow();
  expect(raw).toBe(before);
  await expect(
    repo.mutate({
      action: 'collectionimport',
      name: 'Other',
      workouts: [
        { name: 'Unique', config },
        { name: 'Morning', config },
      ],
    }),
  ).rejects.toThrow();
  expect(raw).toBe(before);
  fail = true;
  await expect(
    repo.mutate({
      action: 'collectionimport',
      name: 'Other',
      workouts: [{ name: 'Unique', config }],
    }),
  ).rejects.toThrow('Disk full');
  expect(raw).toBe(before);
});
it('rejects destination capacity overflow without a partial collection', async () => {
  let raw = JSON.stringify({
    version: 2,
    templates: Array.from({ length: 99 }, (_, i) => ({
      id: `w${i}`,
      name: `Existing ${i}`,
      config,
    })),
    collections: [],
  });
  const repo = createBrowserRepository({
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  });
  const before = raw;
  await expect(repo.mutate({ action: 'collectionimport', ...collection })).rejects.toThrow(/100/);
  expect(raw).toBe(before);
});

it('round trips all six modes and rejects byte overflow and invalid nested data', () => {
  const common = {
    leadInSeconds: 5,
    warningSeconds: 3,
    exercises: [{ id: 'e', name: 'Squat', target: { unit: 'reps', value: 8 } }],
  };
  const workouts = [
    { ...common, type: 'emom', minutes: 3 },
    { ...common, type: 'countdown', durationSeconds: 90 },
    { ...common, type: 'intervals', workSeconds: 30, restSeconds: 10, rounds: 3 },
    { ...common, type: 'amrap', durationSeconds: 90 },
    { ...common, type: 'forTime', timeCapSeconds: 90 },
    {
      ...common,
      exercises: config.exercises,
      type: 'ladder',
      ladder: { direction: 'ascending', startReps: 2, increment: 2, rungs: 3 },
    },
  ] as import('@nextround/core').WorkoutConfig[];
  const value = {
    name: 'All modes',
    workouts: workouts.map((config, i) => ({ name: `Mode ${i}`, config })),
  };
  expect(parseCollection(encodeCollection(value))).toEqual(value);
  const raw = encodeCollection(value);
  expect(() => parseCollection(raw + ' '.repeat(1048576))).toThrow(/1 MiB/);
  expect(() =>
    parseCollection(raw.replace('"minutes": 3', '"minutes": 3, "secret": "unknown"')),
  ).toThrow();
});

it('rechecks latest collection capacity and destination names before committing', async () => {
  let raw = JSON.stringify({ version: 2, templates: [], collections: [] });
  const repo = createBrowserRepository({
    getItem: () => raw,
    setItem: (_, v) => {
      raw = v;
    },
  });
  await repo.read();
  raw = JSON.stringify({
    version: 2,
    templates: [],
    collections: Array.from({ length: 100 }, (_, i) => ({
      id: `c${i}`,
      name: `Collection ${i}`,
      workoutIds: [],
    })),
  });
  const before = raw;
  await expect(repo.mutate({ action: 'collectionimport', ...collection })).rejects.toThrow(/100/);
  expect(raw).toBe(before);
});
