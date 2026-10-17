import { expect, it } from 'vitest';
import { workoutFilename } from './filename';

it('uses readable names without paths, controls or unbounded UTF-8 bytes', () => {
  expect(workoutFilename(' Morning session ')).toBe('Morning session.json');
  expect(workoutFilename('../A/B\\C:\u0000')).toBe('A B C.json');
  expect(workoutFilename('...///')).toBe('NextRound-workout.json');
  const long = workoutFilename('💪'.repeat(120));
  expect(new TextEncoder().encode(long).length).toBeLessThanOrEqual(185);
  expect(long).not.toContain('\ufffd');
  expect(long.endsWith('.json')).toBe(true);
});
