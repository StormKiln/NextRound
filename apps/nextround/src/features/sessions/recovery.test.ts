import { expect, it } from 'vitest';
import { result220 } from '../../../../../tests/fixtures/training-220';
import { sessionSeconds } from './model';
import { updateSessionRecovery } from './recovery';

const session = () => {
  const s = result220().session;
  s.blocks = [0, 1, 2].map((i) => ({
    ...structuredClone(s.blocks[0]),
    id: `b${i}`,
    restSeconds: 5,
    advance: 'automatic' as const,
  }));
  return s;
};
it('updates only selected recovery, preserving source and independent configs', () => {
  const s = session(),
    original = structuredClone(s);
  const next = updateSessionRecovery(s, s, ['b2', 'b0'], 20, 'ready');
  expect(next.blocks.map((b) => [b.restSeconds, b.advance])).toEqual([
    [20, 'ready'],
    [5, 'automatic'],
    [20, 'ready'],
  ]);
  expect(s).toEqual(original);
  expect(next.blocks.map((b) => b.config)).toEqual(s.blocks.map((b) => b.config));
  expect(next.blocks[0].config).not.toBe(s.blocks[0].config);
  expect(next.blocks.map((b) => b.id)).toEqual(['b0', 'b1', 'b2']);
});
it('stores final recovery without adding time and preserves manual-wait timing', () => {
  const s = session();
  const next = updateSessionRecovery(s, s, ['b2'], 3600, 'ready');
  expect(sessionSeconds(next)).toBe(sessionSeconds(s));
  expect(sessionSeconds(updateSessionRecovery(s, s, ['b0'], 0, 'ready'))).toBeNull();
});
it('repairs selected invalid recovery without requiring unrelated names', () => {
  const s = session();
  s.name = '';
  s.blocks[0].name = '';
  s.blocks[0].restSeconds = NaN;
  const next = updateSessionRecovery(s, s, ['b0'], 0, 'automatic');
  expect(next.name).toBe('');
  expect(next.blocks[0].restSeconds).toBe(0);
});
it('rejects stale drafts, invalid selection and invalid recovery atomically', () => {
  const s = session();
  expect(() => updateSessionRecovery(s, { ...s, name: 'Changed' }, ['b0'], 10, 'ready')).toThrow(
    'changed',
  );
  for (const ids of [[], ['b0', 'b0'], ['gone']])
    expect(() => updateSessionRecovery(s, s, ids, 10, 'ready')).toThrow();
  for (const n of [-1, 3601, 1.5, NaN, Infinity])
    expect(() => updateSessionRecovery(s, s, ['b0'], n, 'ready')).toThrow('whole seconds');
  expect(() => updateSessionRecovery(s, s, ['b0'], 10, 'bad' as never)).toThrow();
  expect(() => updateSessionRecovery(s, s, ['b0'], 5, 'automatic')).toThrow('already');
});
