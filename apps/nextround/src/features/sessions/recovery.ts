import { sessionTimeLabel, type TrainingBlock, type TrainingSession } from './model';

export function recoveryTimeLabel(session: TrainingSession) {
  if (
    session.blocks
      .slice(0, -1)
      .some(
        (b) => !Number.isSafeInteger(b.restSeconds) || b.restSeconds < 0 || b.restSeconds > 3600,
      )
  )
    return 'Complete recovery values to preview timing.';
  return sessionTimeLabel(session);
}
export function updateSessionRecovery(
  expected: TrainingSession,
  current: TrainingSession,
  ids: string[],
  seconds: number,
  advance: TrainingBlock['advance'],
): TrainingSession {
  if (JSON.stringify(expected) !== JSON.stringify(current))
    throw new Error(
      'Your session changed. Close this dialog and review it before editing recovery.',
    );
  if (!ids.length) throw new Error('Select at least one block.');
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !current.blocks.some((b) => b.id === id))
  )
    throw new Error('The selected blocks are no longer valid. Close and review your session.');
  if (!Number.isSafeInteger(seconds) || seconds < 0 || seconds > 3600)
    throw new Error('Enter whole seconds from 0 to 3600.');
  if (advance !== 'automatic' && advance !== 'ready')
    throw new Error('Choose how to advance after recovery.');
  if (
    current.blocks
      .filter((b) => ids.includes(b.id))
      .every((b) => b.restSeconds === seconds && b.advance === advance)
  )
    throw new Error('Selected blocks already use these recovery settings.');
  const next = structuredClone(current);
  for (const b of next.blocks)
    if (ids.includes(b.id)) {
      b.restSeconds = seconds;
      b.advance = advance;
    }
  return next;
}
