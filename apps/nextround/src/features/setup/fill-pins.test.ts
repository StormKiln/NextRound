import type { ExerciseEntry } from '@nextround/core';
import { expect, it } from 'vitest';
import { reshuffleFill } from './fill-workout';

const entries: ExerciseEntry[] = ['a', 'b', 'c', 'd'].map((id) => ({
  id,
  name: id,
  supportedUnits: ['reps'],
}));
it('keeps pinned snapshots at their exact positions and excludes their identities', () => {
  const pinned = {
    ...entries[1],
    id: 'snapshot',
    catalogId: 'b',
    target: { unit: 'reps' as const, value: 7 },
  };
  const result = reshuffleFill(entries, [entries[0], pinned, entries[2]], ['snapshot'], () => 0);
  expect(result[1]).toEqual(pinned);
  expect(result.filter((e) => (e.catalogId ?? e.id) === 'b')).toHaveLength(1);
  expect(new Set(result.map((e) => e.catalogId ?? e.id)).size).toBe(3);
  expect(result).toHaveLength(3);
});
it('returns an unchanged preview when all entries are pinned', () => {
  expect(reshuffleFill(entries, entries, ['a', 'b', 'c', 'd'], () => 0)).toEqual(entries);
});
it('refuses a stale pin or insufficient pool without partial additions', () => {
  expect(() => reshuffleFill(entries, entries, ['missing'], () => 0)).toThrow();
  expect(() => reshuffleFill(entries.slice(0, 1), entries.slice(0, 2), ['a'], () => 0)).toThrow();
});
it('excludes duplicate normalized names of pinned snapshots', () => {
  const duplicate = { ...entries[1], id: 'alias', name: ' B ' };
  const result = reshuffleFill(
    [entries[0], entries[1], duplicate],
    entries.slice(0, 2),
    ['b'],
    () => 0,
  );
  expect(result.map((e) => e.name)).toEqual(['a', 'b']);
});
