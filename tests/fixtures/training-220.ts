import type { TrainingResult } from '../../apps/nextround/src/features/sessions/model';
export function result220(id = 'a', time = 2): TrainingResult {
  return {
    id,
    completedAt: time,
    note: '',
    session: {
      id: `session-${id}`,
      name: `Attempt ${id}`,
      blocks: [
        {
          id: `block-${id}`,
          name: 'Work',
          restSeconds: 0,
          advance: 'automatic',
          config: {
            type: 'countdown',
            durationSeconds: 30,
            leadInSeconds: 0,
            warningSeconds: 3,
            exercises: [
              {
                id: `exercise-${id}`,
                catalogId: 'pushup',
                name: 'Push-up',
                supportedUnits: ['reps', 'seconds'],
                target: { unit: 'reps', value: 8 },
              },
            ],
          },
        },
      ],
    },
    blocks: [
      {
        blockId: `block-${id}`,
        status: 'complete',
        elapsedMs: 30000,
        actuals: [
          {
            exerciseId: `exercise-${id}`,
            occurrence: 0,
            reps: time === 2 ? 12 : 10,
            load: 0,
            loadUnit: 'kg',
          },
        ],
        checkedIds: [],
        completedMovements: 0,
        partialValue: 0,
      },
    ],
  };
}
