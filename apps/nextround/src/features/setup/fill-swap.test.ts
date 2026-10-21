import { expect, it } from 'vitest';
import { swapFill } from './fill-workout';

const a = { id: 'slot-a', catalogId: 'a', name: 'A', target: { unit: 'reps' as const, value: 7 } };
const b = {
  id: 'slot-b',
  catalogId: 'b',
  name: 'B',
  target: { unit: 'seconds' as const, value: 12 },
};
const c = { id: 'c', name: 'C' };
it('swaps only from candidates absent by identity and normalized name', () => {
  const preview = [a, b];
  const before = structuredClone(preview);
  expect(
    swapFill(
      [{ id: 'a', name: 'Alias' }, { id: 'x', name: ' a ' }, { id: 'b', name: 'Other' }, c],
      preview,
      0,
      [b.id],
      () => 0,
    ),
  ).toEqual(c);
  expect(preview).toEqual(before);
});
it('rejects pinned slots and missing positions', () => {
  expect(() => swapFill([c], [a, b], 1, [b.id])).toThrow('Unpin');
  expect(() => swapFill([c], [a, b], 2, [])).toThrow('changed');
});
it('reports exhausted pools without mutating a valid preview', () => {
  const preview = [a, b];
  const before = structuredClone(preview);
  expect(() =>
    swapFill(
      [
        { id: 'a', name: 'A' },
        { id: 'b', name: 'B' },
      ],
      preview,
      0,
      [],
    ),
  ).toThrow('No different');
  expect(preview).toEqual(before);
});
