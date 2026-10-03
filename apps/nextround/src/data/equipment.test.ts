import { expect, it } from 'vitest';
import { catalogMetadata, eligibleExercise, equipmentNote } from './equipment';
import { exercises } from './exercises';

it('audits every catalog entry and never mistakes unknown requirements for bodyweight', () => {
  for (const entry of exercises)
    expect(catalogMetadata[entry.id]).toMatchObject({
      equipment: expect.any(Array),
      category: expect.any(String),
      aliases: expect.any(Array),
    });
  expect(eligibleExercise({ id: 'unknown', name: 'Custom' }, [])).toBe(false);
  expect(eligibleExercise({ id: 'unknown', name: 'Custom' }, null)).toBe(true);
  expect(equipmentNote({ id: 'unknown', name: 'Custom' }, [])).toContain('unknown');
});
it('distinguishes unset, none and all-required equipment without inferring from names', () => {
  expect(eligibleExercise({ id: 'swing', name: 'renamed' }, null)).toBe(true);
  expect(eligibleExercise({ id: 'swing', name: 'renamed' }, [])).toBe(false);
  expect(eligibleExercise({ id: 'swing', name: 'renamed' }, ['kettlebell'])).toBe(true);
  expect(eligibleExercise({ id: 'squat', name: 'Air squat' }, [])).toBe(true);
  expect(eligibleExercise({ id: 'pushup-incline', name: 'Incline push-up' }, [])).toBe(false);
  expect(
    eligibleExercise({ id: 'pushup-incline', name: 'Incline push-up' }, ['raised-surface']),
  ).toBe(true);
  expect(eligibleExercise({ id: 'box-jump', name: 'Box jump' }, ['raised-surface'])).toBe(false);
});

it('requires every item and treats a jump box as a surface, never the reverse', async () => {
  const { missingEquipment } = await import('./equipment');
  expect(missingEquipment(['dumbbell', 'raised-surface'], ['dumbbell'])).toEqual([
    'raised-surface',
  ]);
  expect(missingEquipment(['dumbbell', 'raised-surface'], ['dumbbell', 'jump-box'])).toEqual([]);
  expect(missingEquipment(['jump-box'], ['raised-surface'])).toEqual(['jump-box']);
});
