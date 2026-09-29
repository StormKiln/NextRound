import { describe, expect, it } from 'vitest';
import { type EmomConfig, snapshotAt, validateConfig } from './index';

const config: EmomConfig = {
  minutes: 15,
  leadInSeconds: 10,
  warningSeconds: 3,
  exercises: [
    { id: 'a', name: 'Air squat' },
    { id: 'b', name: 'Push-up' },
    { id: 'c', name: 'Custom', description: 'Your movement' },
  ],
};

describe('EMOM configuration', () => {
  it('accepts a valid workout and short lead-in', () => {
    expect(validateConfig(config)).toEqual({});
    expect(validateConfig({ ...config, leadInSeconds: 1 })).toEqual({});
  });
  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, 1441])(
    'rejects invalid minutes %s',
    (minutes) => {
      expect(validateConfig({ ...config, minutes })).toHaveProperty('minutes');
    },
  );
  it('rejects invalid warning, lead-in, empty and blank custom entries', () => {
    expect(validateConfig({ ...config, warningSeconds: 60 })).toHaveProperty('warningSeconds');
    expect(validateConfig({ ...config, leadInSeconds: -1 })).toHaveProperty('leadInSeconds');
    expect(validateConfig({ ...config, exercises: [] })).toHaveProperty('exercises');
    expect(validateConfig({ ...config, exercises: [{ id: 'x', name: ' ' }] })).toHaveProperty(
      'exercises',
    );
  });
});

describe('timeline', () => {
  it('excludes lead-in from workout remaining and starts with a full round', () => {
    expect(snapshotAt(config, 0)).toMatchObject({
      phase: 'leadIn',
      remainingMs: 900000,
      roundRemainingMs: 10000,
    });
    expect(snapshotAt(config, 10000)).toMatchObject({
      phase: 'running',
      remainingMs: 900000,
      roundRemainingMs: 60000,
      roundIndex: 0,
    });
  });
  it('cycles three exercises five times in 15 rounds and completes exactly once', () => {
    const turns = Array.from(
      { length: 15 },
      (_, i) => snapshotAt(config, 10000 + i * 60000).exerciseIndex,
    );
    expect(turns).toEqual([0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2, 0, 1, 2]);
    expect(snapshotAt(config, 910000)).toMatchObject({
      phase: 'completed',
      remainingMs: 0,
      roundRemainingMs: 0,
      roundIndex: 14,
    });
  });
  it('supports uneven rotation and delayed observation without drift', () => {
    expect(snapshotAt({ ...config, minutes: 5 }, 250123)).toMatchObject({
      roundIndex: 4,
      exerciseIndex: 1,
      remainingMs: 59877,
      roundRemainingMs: 59877,
    });
  });
});
