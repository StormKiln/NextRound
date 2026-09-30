import { describe, expect, it } from 'vitest';
import { type CountdownConfig, cueAt, snapshotAt, validateConfig } from './index';

const config: CountdownConfig = {
  type: 'countdown',
  durationSeconds: 125,
  leadInSeconds: 2,
  warningSeconds: 3,
};
describe('Countdown', () => {
  it('accepts bounds without exercises', () => {
    for (const durationSeconds of [1, 86400])
      expect(validateConfig({ ...config, durationSeconds })).toEqual({});
  });
  it.each([0, -1, 1.5, NaN, Infinity, 86401])('rejects invalid duration %s', (durationSeconds) => {
    expect(validateConfig({ ...config, durationSeconds })).toHaveProperty('durationSeconds');
  });
  it('rejects invalid lead-in and warning values', () => {
    for (const leadInSeconds of [-1, 3601, 1.5, NaN])
      expect(validateConfig({ ...config, leadInSeconds })).toHaveProperty('leadInSeconds');
    for (const warningSeconds of [-1, 60, 1.5, NaN])
      expect(validateConfig({ ...config, warningSeconds })).toHaveProperty('warningSeconds');
  });
  it('preserves legacy EMOM minute-boundary cues', () => {
    const emom = {
      minutes: 2,
      leadInSeconds: 0,
      warningSeconds: 3,
      exercises: [{ id: 'a', name: 'Squat' }],
    };
    expect(cueAt(emom, 0)).toBe('beep');
    expect(cueAt(emom, 57000)).toBe('tock');
    expect(cueAt(emom, 60000)).toBe('beep');
    expect(cueAt(emom, 120000)).toBe('complete');
  });
  it('counts one uninterrupted interval, excluding lead-in', () => {
    expect(snapshotAt(config, 0)).toMatchObject({
      phase: 'leadIn',
      remainingMs: 125000,
      roundRemainingMs: 2000,
    });
    expect(snapshotAt(config, 62000)).toMatchObject({
      phase: 'running',
      remainingMs: 65000,
      roundRemainingMs: 65000,
      elapsedMs: 60000,
    });
    expect(snapshotAt(config, 200000)).toMatchObject({
      phase: 'completed',
      remainingMs: 0,
      elapsedMs: 125000,
    });
  });
  it('plays one start, one completion, final warnings and no minute cues', () => {
    const cues = Array.from({ length: 129 }, (_, s) => cueAt(config, s * 1000));
    expect(cues.filter((c) => c === 'beep')).toHaveLength(1);
    expect(cues.filter((c) => c === 'complete')).toHaveLength(1);
    expect(cues.filter((c) => c === 'tock')).toHaveLength(5);
    expect(cues[62]).toBeNull();
    expect(cueAt({ ...config, leadInSeconds: 0 }, 0)).toBe('beep');
    expect(cueAt({ ...config, warningSeconds: 0 }, 126000)).toBeNull();
  });
});
