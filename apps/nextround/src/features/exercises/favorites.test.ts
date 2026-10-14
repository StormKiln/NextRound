import { describe, expect, it } from 'vitest';
import { suggestExercises } from '../setup/exercise-suggestions';
import { FAVORITES_KEY, readFavorites, toggleFavorite } from './favorites';

function storage(raw: string | null = null) {
  return {
    getItem: () => raw,
    setItem: (_key: string, value: string) => {
      raw = value;
    },
  };
}
describe('explicit exercise favourites', () => {
  it('starts empty and persists independent stable identities', () => {
    const s = storage();
    expect(readFavorites(s)).toEqual([]);
    expect(toggleFavorite(s, 'pushup')).toEqual(['pushup']);
    expect(toggleFavorite(s, 'personal:1180')).toEqual(['pushup', 'personal:1180']);
    expect(toggleFavorite(s, 'pushup')).toEqual(['personal:1180']);
    expect(readFavorites(s)).toEqual(['personal:1180']);
    expect(FAVORITES_KEY).toBe('nextround.exercise-favorites.v1');
  });
  it.each([
    'invalid',
    '{"version":2,"ids":[]}',
    '{"version":1,"ids":["a","a"]}',
    '{"version":1,"ids":[null]}',
    '{"version":1,"ids":[],"extra":1}',
  ])('preserves unreadable or unsupported bytes: %s', (raw) => {
    const s = storage(raw);
    expect(() => readFavorites(s)).toThrow();
    expect(() => toggleFavorite(s, 'pushup')).toThrow();
    expect(s.getItem()).toBe(raw);
  });
  it('does not erase unknown or archived IDs and rereads before each change', () => {
    const s = storage('{"version":1,"ids":["personal:archived","future-movement"]}');
    toggleFavorite(s, 'pushup');
    expect(readFavorites(s)).toEqual(['personal:archived', 'future-movement', 'pushup']);
  });
  it('reports failed storage writes without publishing success', () => {
    const s = storage();
    s.setItem = () => {
      throw Error('Disk full');
    };
    expect(() => toggleFavorite(s, 'pushup')).toThrow('Disk full');
    expect(readFavorites(s)).toEqual([]);
  });
  it('rejects invalid identity without touching preferences', () => {
    const s = storage();
    expect(() => toggleFavorite(s, '')).toThrow();
    expect(s.getItem()).toBeNull();
  });
  it('keeps most-used ranking distinct from a starred-only pool without filling gaps', () => {
    const rows = [
      { id: 'pushup', name: 'Push-up' },
      { id: 'squat', name: 'Air squat' },
    ];
    const counts = new Map([['pushup', 10]]);
    expect(suggestExercises(rows, counts, 'frequent', 2).map((e) => e.id)).toEqual([
      'pushup',
      'squat',
    ]);
    expect(
      suggestExercises(rows, counts, 'favorites', 2, ['squat', 'personal:archived']).map(
        (e) => e.id,
      ),
    ).toEqual(['squat']);
    expect(suggestExercises(rows, counts, 'favorites', 2, [])).toEqual([]);
  });
});
