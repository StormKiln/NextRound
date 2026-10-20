import { parseSession, type TrainingSession } from './model';

export function repeatSessionBlocks(
  expected: TrainingSession,
  current: TrainingSession,
  selectedIds: string[],
  copies: number,
  idFactory: () => string = () => crypto.randomUUID(),
): TrainingSession {
  if (JSON.stringify(expected) !== JSON.stringify(current))
    throw new Error(
      'Your session changed. Close this dialog and review it before repeating blocks.',
    );
  parseSession(current);
  if (!selectedIds.length) throw new Error('Select at least one block to repeat.');
  if (
    new Set(selectedIds).size !== selectedIds.length ||
    selectedIds.some((id) => !current.blocks.some((b) => b.id === id))
  )
    throw new Error('The selected blocks are no longer valid. Close and review your session.');
  if (!Number.isSafeInteger(copies) || copies < 1)
    throw new Error('Enter a whole number of additional copies, at least 1.');
  if (current.blocks.length + selectedIds.length * copies > 20)
    throw new Error(
      'This would exceed 20 blocks. Select fewer blocks or reduce additional copies.',
    );
  const next = structuredClone(current);
  const selected = current.blocks.filter((b) => selectedIds.includes(b.id));
  for (let i = 0; i < copies; i++)
    next.blocks.push(...selected.map((b) => ({ ...structuredClone(b), id: idFactory() })));
  parseSession(next);
  return next;
}
