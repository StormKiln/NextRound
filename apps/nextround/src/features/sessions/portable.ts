import { parseSession, type TrainingSession } from './model';
export function encodeSession(session: TrainingSession): string {
  const s = parseSession(session);
  const raw = JSON.stringify(
    {
      format: 'nextround-session',
      version: 1,
      session: { id: s.id, name: s.name, blocks: s.blocks },
    },
    null,
    2,
  );
  parseSessionFile(raw);
  return raw;
}
export function parseSessionFile(raw: string): TrainingSession {
  if (new TextEncoder().encode(raw).length > 1048576)
    throw new Error('Session files must be at most 1 MiB.');
  const value = JSON.parse(raw);
  if (
    !value ||
    value.format !== 'nextround-session' ||
    value.version !== 1 ||
    Object.keys(value).some((k) => !['format', 'version', 'session'].includes(k))
  )
    throw new Error('Unsupported session file format or version.');
  const session = parseSession(value.session);
  if (session.favourite || session.collections?.length)
    throw new Error('Shared sessions must not contain private organisation data.');
  return session;
}
export function independentSession(source: TrainingSession): TrainingSession {
  const session = parseSession(source);
  session.id = crypto.randomUUID();
  delete session.favourite;
  delete session.collections;
  for (const b of session.blocks) {
    b.id = crypto.randomUUID();
    for (const e of b.config.exercises ?? []) e.id = crypto.randomUUID();
  }
  return session;
}
