import type { ExerciseEntry } from '@nextround/core';
import { describe, expect, it } from 'vitest';
import type { LibraryExercise } from '@/features/exercises/library';
import { type FillFilters, fillCandidates, sampleFill } from './fill-workout';

const filters: FillFilters = {
  equipment: null,
  areas: [],
  category: '',
  intensity: '',
  favoritesOnly: false,
  favoriteIds: [],
};
const move = (id: string, name = id): LibraryExercise => ({
  id,
  name,
  supportedUnits: ['reps', 'seconds'],
  metadata: {
    category: 'Other bodyweight',
    equipment: [],
    aliases: [],
    targetAreas: ['core'],
    intensity: 'moderate',
  },
});
const library = [move('a'), move('b'), move('c'), move('d')];
describe('random fill', () => {
  it('excludes retained identities and normalized custom names, keeps inputs untouched', () => {
    const retained: ExerciseEntry[] = [
      { id: 'snapshot', catalogId: 'a', name: 'Renamed A', target: { unit: 'reps', value: 17 } },
      { id: 'custom', name: '  B  ', description: 'my cue' },
    ];
    const before = structuredClone({ library, retained });
    expect(fillCandidates(library, retained, 'emom', filters).map((e) => e.id)).toEqual(['c', 'd']);
    expect({ library, retained }).toEqual(before);
  });
  it('deduplicates library identities and names and handles legacy entry IDs', () => {
    expect(
      fillCandidates(
        [...library, move('a', 'alias'), move('other', ' C ')],
        [{ id: 'b', name: 'old name' }],
        'emom',
        filters,
      ).map((e) => e.id),
    ).toEqual(['a', 'c', 'd']);
  });
  it('intersects equipment, category, intensity, favorites and any selected focus', () => {
    const kb: LibraryExercise = {
      ...move('kb'),
      metadata: {
        ...move('kb').metadata!,
        category: 'Kettlebell',
        equipment: ['kettlebell'],
        targetAreas: ['legs'],
        intensity: 'high',
      },
    };
    const pool = [...library, kb, { id: 'unknown', name: 'Unknown' }];
    expect(
      fillCandidates(pool, [], 'emom', {
        ...filters,
        equipment: [],
        areas: ['core', 'legs'],
        intensity: 'moderate',
        favoritesOnly: true,
        favoriteIds: ['b', 'kb', 'unknown'],
      }).map((e) => e.id),
    ).toEqual(['b']);
    expect(
      fillCandidates(pool, [], 'emom', {
        ...filters,
        category: 'Kettlebell',
        equipment: ['kettlebell'],
      }).map((e) => e.id),
    ).toEqual(['kb']);
    expect(
      fillCandidates(pool, [], 'emom', { ...filters, category: 'Kettlebell', equipment: [] }),
    ).toEqual([]);
    expect(fillCandidates(pool, [], 'emom', { ...filters, favoritesOnly: true })).toEqual([]);
  });
  it('excludes seconds-only movements from Ladder and admits them for other modes', () => {
    const timed = { ...move('hold'), supportedUnits: ['seconds'] as const };
    const pool = [...library, { ...timed, supportedUnits: [...timed.supportedUnits] }];
    expect(fillCandidates(pool, [], 'ladder', filters)).toHaveLength(4);
    expect(fillCandidates(pool, [], 'countdown', filters)).toHaveLength(5);
  });
  it('samples without replacement and allows different outcomes via the random source', () => {
    const before = structuredClone(library);
    const a = sampleFill(library, 2, 4, () => 0);
    const b = sampleFill(library, 2, 4, () => 0.999);
    expect(a).toHaveLength(2);
    expect(new Set(a.map((e) => e.id)).size).toBe(2);
    expect(a.map((e) => e.id)).not.toEqual(b.map((e) => e.id));
    expect(library).toEqual(before);
  });
  it('rejects invalid totals, full lists and insufficient pools without partial results', () => {
    for (const total of [0, 2, 1.5, 101, NaN])
      expect(() => sampleFill(library, 2, total)).toThrow();
    expect(() => sampleFill(library, 100, 100)).toThrow();
    expect(() => sampleFill(library, 2, 7)).toThrow(/Only 4/);
    expect(sampleFill(library, 0, 4)).toHaveLength(4);
    expect(sampleFill(library, 99, 100)).toHaveLength(1);
  });
});
