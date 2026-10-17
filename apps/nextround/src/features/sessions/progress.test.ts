import { snapshotAt } from '@nextround/core';
import { expect, it } from 'vitest';
import type { TrainingSession } from './model';
import { beginRun, elapsedWithLead, finishBlock, recoveryPaused } from './progress';

const session: TrainingSession = {
  id: 's',
  name: 'Two blocks',
  blocks: [
    {
      id: 'one',
      name: 'Warmup',
      config: { type: 'countdown', durationSeconds: 10, leadInSeconds: 5, warningSeconds: 3 },
      restSeconds: 3,
      advance: 'ready',
    },
    {
      id: 'two',
      name: 'Cool down',
      config: { type: 'countdown', durationSeconds: 5, leadInSeconds: 0, warningSeconds: 3 },
      restSeconds: 0,
      advance: 'automatic',
    },
  ],
};
it('persists lead-in position separately from active time', () => {
  expect(elapsedWithLead(snapshotAt(session.blocks[0].config, 2000))).toBe(2000);
  expect(elapsedWithLead(snapshotAt(session.blocks[0].config, 7000))).toBe(7000);
});
it('finishes one block without marking future blocks complete', () => {
  const run = beginRun(session);
  run.snapshot = snapshotAt(session.blocks[0].config, 15000);
  const next = finishBlock(run, 'complete');
  expect(next.stage).toBe('rest');
  expect(next.restRemainingMs).toBe(3000);
  expect(next.blocks).toHaveLength(1);
  expect(next.blocks[0].elapsedMs).toBe(10000);
});
it('restores a running checkpoint paused with no downtime credited', () => {
  const run = beginRun(session);
  run.snapshot = snapshotAt(session.blocks[0].config, 7000);
  const recovered = recoveryPaused(run);
  expect(recovered.snapshot?.paused).toBe(true);
  expect(recovered.snapshot?.elapsedMs).toBe(2000);
  expect(run.snapshot.paused).toBe(false);
});
it('shows honest overall remaining time including current lead-in and future rest', async () => {
  const { overallRemaining } = await import('./progress');
  const fixed = structuredClone(session);
  fixed.blocks[0].advance = 'automatic';
  const run = beginRun(fixed);
  run.snapshot = snapshotAt(fixed.blocks[0].config, 2000);
  expect(overallRemaining(run)).toBe(21000);
  run.snapshot = snapshotAt(fixed.blocks[0].config, 15000);
  const rest = finishBlock(run, 'complete');
  expect(overallRemaining(rest)).toBe(8000);
  expect(overallRemaining(beginRun(session))).toBeNull();
});
