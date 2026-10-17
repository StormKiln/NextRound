import { expect, it } from 'vitest';
import type { TrainingSession } from './model';
import { encodeSession, independentSession, parseSessionFile } from './portable';

const s: TrainingSession = {
  id: 's',
  name: 'Flow',
  favourite: true,
  collections: ['private'],
  blocks: [
    {
      id: 'b',
      name: 'Warm up',
      config: {
        type: 'countdown',
        durationSeconds: 10,
        leadInSeconds: 0,
        warningSeconds: 3,
        exercises: [{ id: 'e', name: 'Custom movement' }],
      },
      restSeconds: 0,
      advance: 'automatic',
    },
  ],
};
it('shares prescriptions without personal organisation and imports independent identities', () => {
  const raw = encodeSession(s);
  expect(raw).not.toContain('private');
  expect(raw).not.toContain('favourite');
  const copy = independentSession(parseSessionFile(raw));
  expect(copy.id).not.toBe(s.id);
  expect(copy.blocks[0].id).not.toBe('b');
  expect(copy.blocks[0].config.exercises![0].id).not.toBe('e');
  expect(copy.name).toBe('Flow');
});
it('rejects unsupported or oversized files without partial parsing', () => {
  expect(() => parseSessionFile('{"format":"nextround-session","version":99}')).toThrow();
  expect(() => parseSessionFile(' '.repeat(1048577))).toThrow(/1 MiB/);
});
