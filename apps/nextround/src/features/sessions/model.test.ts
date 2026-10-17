import { describe, expect, it } from 'vitest';
import {
  emptyTraining,
  parseResult,
  parseSession,
  parseTrainingDocument,
  sessionSeconds,
  type TrainingSession,
} from './model';

const session: TrainingSession = {
  id: 's',
  name: 'Morning',
  blocks: [
    {
      id: 'a',
      name: 'Warm up',
      config: { type: 'countdown', durationSeconds: 30, leadInSeconds: 5, warningSeconds: 3 },
      restSeconds: 10,
      advance: 'automatic',
    },
    {
      id: 'b',
      name: 'Move',
      config: { type: 'countdown', durationSeconds: 60, leadInSeconds: 0, warningSeconds: 3 },
      restSeconds: 0,
      advance: 'automatic',
    },
  ],
};
describe('training sessions', () => {
  it('includes lead-ins and boundary rest but not unused final rest', () => {
    expect(sessionSeconds(session)).toBe(105);
    expect(
      sessionSeconds({
        ...session,
        blocks: session.blocks.map((b) => ({ ...b, restSeconds: 10 })),
      }),
    ).toBe(105);
  });
  it('does not promise a duration for manual waits or uncapped work', () => {
    const copy = structuredClone(session);
    copy.blocks[0].advance = 'ready';
    expect(sessionSeconds(copy)).toBeNull();
    copy.blocks[0].advance = 'automatic';
    copy.blocks[1].config = { type: 'forTime', leadInSeconds: 0, warningSeconds: 3 };
    expect(sessionSeconds(copy)).toBeNull();
  });
  it('copies prescriptions and rejects duplicate identities and invalid limits', () => {
    const copy = parseSession(session);
    copy.blocks[0].name = 'Changed';
    expect(session.blocks[0].name).toBe('Warm up');
    expect(() =>
      parseSession({ ...session, blocks: [session.blocks[0], session.blocks[0]] }),
    ).toThrow();
    expect(() => parseSession({ ...session, blocks: [] })).toThrow();
    expect(() =>
      parseSession({
        ...session,
        blocks: Array.from({ length: 21 }, (_, i) => ({ ...session.blocks[0], id: String(i) })),
      }),
    ).toThrow();
    expect(() =>
      parseSession({ ...session, blocks: [{ ...session.blocks[0], restSeconds: -1 }] }),
    ).toThrow();
  });
  it('preserves an empty dataset and rejects future versions without resetting', () => {
    expect(parseTrainingDocument(emptyTraining())).toEqual({
      version: 1,
      sessions: [],
      results: [],
      actuals: {},
      recovery: null,
    });
    expect(() => parseTrainingDocument({ ...emptyTraining(), version: 2 })).toThrow(/version/i);
    expect(() =>
      parseTrainingDocument({ ...emptyTraining(), sessions: [session, session] }),
    ).toThrow();
  });
});

it('normalizes imported block outcomes to prescription order for comparisons', () => {
  const block = (blockId: string) => ({
    blockId,
    status: 'complete',
    elapsedMs: 10,
    actuals: [],
    checkedIds: [],
    completedMovements: 0,
    partialValue: 0,
  });
  expect(
    parseResult({
      id: 'r',
      session,
      completedAt: 1,
      note: '',
      blocks: [block('b'), block('a')],
    }).blocks.map((b) => b.blockId),
  ).toEqual(['a', 'b']);
});
