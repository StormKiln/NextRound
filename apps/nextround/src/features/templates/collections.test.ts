import { expect, it } from 'vitest';
import { createBrowserRepository, parseTemplateDocument } from './repository';

const config = {
  minutes: 3,
  leadInSeconds: 0,
  warningSeconds: 3,
  exercises: [{ id: 'e', name: 'Rowing', description: 'Steady strokes' }],
};
function fixture() {
  let raw = JSON.stringify({ version: 1, templates: [{ id: 'w', name: 'Morning', config }] });
  let fail = false;
  const storage = {
    getItem: () => raw,
    setItem: (_: string, v: string) => {
      if (fail) throw Error('Disk full');
      raw = v;
    },
  };
  return {
    repo: createBrowserRepository(storage),
    raw: () => raw,
    fail: () => {
      fail = true;
    },
  };
}
it('migrates v1 without writing until mutation, copies membership and never deletes workouts with collections', async () => {
  const f = fixture();
  expect(await f.repo.read()).toMatchObject({ version: 2, collections: [] });
  expect(JSON.parse(f.raw()).version).toBe(1);
  let d = await f.repo.mutate({ action: 'collectioncreate', name: ' Strength ' });
  const c = d.collections[0];
  d = await f.repo.mutate({
    action: 'membership',
    id: 'w',
    collectionIds: [c.id],
    expectedCollectionIds: [],
  });
  expect(d.collections[0].workoutIds).toEqual(['w']);
  d = await f.repo.mutate({ action: 'duplicate', id: 'w', expected: d.templates[0], name: 'Copy' });
  expect(d.collections[0].workoutIds).toEqual(d.templates.map((t) => t.id));
  d = await f.repo.mutate({ action: 'collectiondelete', id: c.id, expectedName: c.name });
  expect(d.collections).toEqual([]);
  expect(d.templates).toHaveLength(2);
});
it('rejects equivalent collection names, stale memberships and failed writes without changing persisted bytes', async () => {
  const f = fixture();
  const d = await f.repo.mutate({ action: 'collectioncreate', name: 'Ｋｅｔｔｌｅ  Bell' });
  await expect(
    f.repo.mutate({ action: 'collectioncreate', name: 'kettle bell' }),
  ).rejects.toThrow();
  const c = d.collections[0];
  await f.repo.mutate({
    action: 'membership',
    id: 'w',
    collectionIds: [c.id],
    expectedCollectionIds: [],
  });
  const before = f.raw();
  await expect(
    f.repo.mutate({ action: 'membership', id: 'w', collectionIds: [], expectedCollectionIds: [] }),
  ).rejects.toThrow(/changed/);
  f.fail();
  await expect(
    f.repo.mutate({ action: 'collectionrename', id: c.id, name: 'New', expectedName: c.name }),
  ).rejects.toThrow('Disk full');
  expect(f.raw()).toBe(before);
});
it('rejects malformed membership references and future versions', () => {
  expect(() =>
    parseTemplateDocument({
      version: 2,
      templates: [],
      collections: [{ id: 'c', name: 'Group', workoutIds: ['missing'] }],
    }),
  ).toThrow();
  expect(() => parseTemplateDocument({ version: 3, templates: [], collections: [] })).toThrow();
});
it('keeps imports unfiled, preserves updates and cleans deleted memberships', async () => {
  const f = fixture();
  let d = await f.repo.mutate({ action: 'collectioncreate', name: 'A' });
  const a = d.collections[0];
  d = await f.repo.mutate({ action: 'collectioncreate', name: 'B' });
  const b = d.collections[1];
  d = await f.repo.mutate({
    action: 'membership',
    id: 'w',
    collectionIds: [a.id, b.id],
    expectedCollectionIds: [],
  });
  d = await f.repo.mutate({
    action: 'update',
    id: 'w',
    expected: d.templates[0],
    name: 'Renamed',
    config,
  });
  expect(d.collections.map((c) => c.workoutIds)).toEqual([['w'], ['w']]);
  d = await f.repo.mutate({ action: 'import', name: 'Imported', config });
  expect(d.collections.map((c) => c.workoutIds)).toEqual([['w'], ['w']]);
  d = await f.repo.mutate({ action: 'delete', id: 'w', expected: d.templates[0] });
  expect(d.collections.map((c) => c.workoutIds)).toEqual([[], []]);
});
it('rejects empty/oversized names, duplicate and dangling references before writes', async () => {
  const f = fixture();
  const before = f.raw();
  for (const name of ['', ' ', 'a'.repeat(81), '💪'.repeat(41)])
    await expect(f.repo.mutate({ action: 'collectioncreate', name })).rejects.toThrow();
  await expect(
    f.repo.mutate({
      action: 'membership',
      id: 'w',
      collectionIds: ['missing'],
      expectedCollectionIds: [],
    }),
  ).rejects.toThrow();
  expect(f.raw()).toBe(before);
});
it('trims FEFF but preserves NEL exactly like native collection names', async () => {
  const f = fixture();
  const d = await f.repo.mutate({ action: 'collectioncreate', name: '\uFEFFStrength\uFEFF' });
  expect(d.collections[0].name).toBe('Strength');
  const before = f.raw();
  await expect(f.repo.mutate({ action: 'collectioncreate', name: 'Strength' })).rejects.toThrow();
  expect(f.raw()).toBe(before);
  const renamed = await f.repo.mutate({
    action: 'collectionrename',
    id: d.collections[0].id,
    expectedName: 'Strength',
    name: '\u0085Strength',
  });
  expect(renamed.collections[0].name).toBe('\u0085Strength');
});
