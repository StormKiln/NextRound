import { expect, it } from 'vitest';
import { collectionFailure } from './collection-errors';
import { createBrowserRepository } from './repository';

it('reports stable codes for collection name and stale-data failures', async () => {
  let raw: string | null = null;
  const repo = createBrowserRepository({
    getItem: (key: string) => (key === 'nextround.workout-templates.v1' ? raw : null),
    setItem: (_, v) => {
      raw = v;
    },
  });
  const doc = await repo.mutate({ action: 'collectioncreate', name: 'Training' });
  for (const [mutation, code] of [
    [{ action: 'collectioncreate', name: 'Training' }, 'name'],
    [{ action: 'collectioncreate', name: ' ' }, 'name'],
    [
      { action: 'collectionrename', id: doc.collections[0].id, expectedName: 'Old', name: 'New' },
      'conflict',
    ],
  ] as const) {
    try {
      await repo.mutate(mutation);
      throw new Error('Expected rejection');
    } catch (e) {
      expect(collectionFailure(e).code).toBe(code);
    }
  }
});
