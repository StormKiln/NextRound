import { expect, it } from 'vitest';
import { countLabel } from './index';

it('uses singular only for exactly one workout, round or exercise', () => {
  for (const noun of ['workout', 'round', 'exercise', 'movement']) {
    expect(countLabel(0, noun)).toBe(`0 ${noun}s`);
    expect(countLabel(1, noun)).toBe(`1 ${noun}`);
    expect(countLabel(2, noun)).toBe(`2 ${noun}s`);
  }
});

import { formatLadderProgress } from './index';

it('formats a single ladder rung and movement consistently', () => {
  expect(
    formatLadderProgress(
      {
        type: 'ladder',
        ladder: { direction: 'ascending', startReps: 1, increment: 1, rungs: 1 },
        exercises: [{ id: 'a', name: 'Squat' }],
        leadInSeconds: 0,
        warningSeconds: 0,
      },
      0,
    ),
  ).toBe('0 of 1 rung completed · 0 of 1 movement');
});
