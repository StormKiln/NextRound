import { durationSeconds, type SessionSnapshot } from '@nextround/core';
import {
  type BlockResult,
  parseSession,
  type Recovery,
  sessionSeconds,
  type TrainingSession,
} from './model';
export const blankBlock = (blockId: string): BlockResult => ({
  blockId,
  status: 'partial',
  elapsedMs: 0,
  actuals: [],
  checkedIds: [],
  completedMovements: 0,
  partialValue: 0,
});
export function beginRun(session: TrainingSession): Recovery {
  return {
    id: crypto.randomUUID(),
    session: parseSession(session),
    index: 0,
    stage: 'work',
    restRemainingMs: 0,
    snapshot: null,
    blocks: [],
    current: blankBlock(session.blocks[0].id),
    updatedAt: Date.now(),
  };
}
export function elapsedWithLead(snapshot: SessionSnapshot): number {
  return Math.floor(
    snapshot.phase === 'leadIn'
      ? snapshot.config.leadInSeconds * 1000 - snapshot.roundRemainingMs
      : snapshot.config.leadInSeconds * 1000 + snapshot.elapsedMs,
  );
}
export function finishBlock(run: Recovery, status: BlockResult['status']): Recovery {
  const next = structuredClone(run);
  next.current = { ...next.current, status, elapsedMs: Math.floor(next.snapshot?.elapsedMs ?? 0) };
  next.blocks = [...next.blocks.filter((b) => b.blockId !== next.current.blockId), next.current];
  if (next.index === next.session.blocks.length - 1) next.stage = 'review';
  else {
    next.restRemainingMs = next.session.blocks[next.index].restSeconds * 1000;
    next.stage = next.restRemainingMs > 0 ? 'rest' : 'ready';
  }
  next.updatedAt = Date.now();
  return next;
}
export function recoveryPaused(run: Recovery): Recovery {
  const next = structuredClone(run);
  if (next.snapshot) next.snapshot.paused = true;
  return next;
}

export function overallRemaining(run: Recovery): number | null {
  if (sessionSeconds(run.session) === null) return null;
  if (run.stage === 'review') return 0;
  let ms = 0;
  for (let i = run.index + 1; i < run.session.blocks.length; i++) {
    const b = run.session.blocks[i];
    ms +=
      (durationSeconds(b.config) +
        b.config.leadInSeconds +
        (i < run.session.blocks.length - 1 ? b.restSeconds : 0)) *
      1000;
  }
  if (run.stage === 'rest') return ms + run.restRemainingMs;
  if (run.stage === 'ready') return ms;
  const b = run.session.blocks[run.index];
  const s = run.snapshot;
  return (
    ms +
    (s
      ? s.remainingMs + (s.phase === 'leadIn' ? s.roundRemainingMs : 0)
      : (durationSeconds(b.config) + b.config.leadInSeconds) * 1000) +
    (run.index < run.session.blocks.length - 1 ? b.restSeconds * 1000 : 0)
  );
}
