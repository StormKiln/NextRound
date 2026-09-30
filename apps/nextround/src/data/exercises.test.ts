import { describe, expect, it } from 'vitest';
import { exercises, listExercises } from './exercises';

describe('exercise catalogue', () => {
  it('preserves the original IDs, names and order used by saved workouts and default EMOM', () => {
    expect(exercises.slice(0, 8).map(({ id, name }) => [id, name])).toEqual([
      ['squat', 'Air squat'],
      ['pushup', 'Push-up'],
      ['situp', 'Sit-up'],
      ['burpee', 'Burpee'],
      ['swing', 'Kettlebell swing'],
      ['lunge', 'Reverse lunge'],
      ['plank', 'Plank'],
      ['jump', 'Jump rope'],
    ]);
    expect(exercises.find(({ id }) => id === 'plank')?.description).toMatch(/^Brace/);
  });

  it('offers at least 20 distinct kettlebell exercises', () => {
    expect(exercises.filter(({ name }) => /kettlebell/i.test(name)).length).toBeGreaterThanOrEqual(
      20,
    );
  });

  it.each(['push-up', 'plank', 'squat'])(
    'adds at least five %s variations beyond the base',
    (name) => {
      const baseIds = ['pushup', 'plank', 'squat'];
      expect(
        exercises.filter(
          (entry) =>
            !baseIds.includes(entry.id) &&
            !entry.name.startsWith('Kettlebell') &&
            entry.name.toLowerCase().includes(name),
        ).length,
      ).toBeGreaterThanOrEqual(5);
    },
  );

  it('includes rowing on a rowing machine with a stable ID', () => {
    expect(exercises.find(({ id }) => id === 'rowing-machine')).toMatchObject({
      name: 'Rowing machine',
    });
  });

  it('has unique persistent IDs and distinct names with concise descriptions', () => {
    expect(new Set(exercises.map(({ id }) => id)).size).toBe(exercises.length);
    expect(new Set(exercises.map(({ name }) => name.toLowerCase())).size).toBe(exercises.length);
    for (const entry of exercises) {
      expect(entry.supportedUnits?.length).toBeGreaterThan(0);
      expect(new Set(entry.supportedUnits).size).toBe(entry.supportedUnits?.length);
      expect(entry.id).toMatch(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);
      expect(entry.name.trim().length).toBeGreaterThan(0);
      expect(entry.name.length).toBeLessThanOrEqual(60);
      expect(entry.description?.trim().length).toBeGreaterThan(0);
      expect(entry.description?.length).toBeLessThanOrEqual(240);
    }
  });

  it('offers target units appropriate to each movement', () => {
    for (const id of ['pushup', 'squat', 'swing', 'situp', 'burpee', 'plank-walkup']) {
      expect(exercises.find((entry) => entry.id === id)).toMatchObject({
        supportedUnits: ['reps', 'seconds'],
      });
    }
    for (const id of ['plank', 'plank-high', 'plank-side']) {
      expect(exercises.find((entry) => entry.id === id)).toMatchObject({
        supportedUnits: ['seconds'],
      });
    }
    expect(exercises.find(({ id }) => id === 'rowing-machine')).toMatchObject({
      supportedUnits: ['seconds', 'metres', 'calories'],
    });
    expect(exercises.find(({ id }) => id === 'kettlebell-suitcase-carry')).toMatchObject({
      supportedUnits: ['seconds', 'metres'],
    });
  });

  it('returns the complete catalogue to exercise pickers', async () => {
    expect(await listExercises()).toEqual(exercises);
  });
});
