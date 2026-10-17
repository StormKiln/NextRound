import {
  durationSeconds,
  ladderReps,
  type SessionSnapshot,
  type WorkoutConfig,
} from '@nextround/core';
import { copyValidatedConfig } from '../templates/repository';

export type TrainingBlock = {
  id: string;
  name: string;
  config: WorkoutConfig;
  restSeconds: number;
  advance: 'automatic' | 'ready';
};
export type TrainingSession = {
  id: string;
  name: string;
  blocks: TrainingBlock[];
  favourite?: boolean;
  collections?: string[];
};
export type Actual = {
  exerciseId: string;
  occurrence: number;
  reps?: number;
  seconds?: number;
  metres?: number;
  calories?: number;
  load?: number;
  loadUnit?: 'kg' | 'lb';
};
export type BlockResult = {
  blockId: string;
  status: 'complete' | 'partial' | 'skipped';
  elapsedMs: number;
  actuals: Actual[];
  checkedIds: string[];
  completedMovements: number;
  partialValue: number;
};
export type TrainingResult = {
  id: string;
  session: TrainingSession;
  completedAt: number;
  blocks: BlockResult[];
  note: string;
};
export type Recovery = {
  id: string;
  session: TrainingSession;
  index: number;
  stage: 'work' | 'rest' | 'ready' | 'review';
  restRemainingMs: number;
  snapshot: SessionSnapshot | null;
  blocks: BlockResult[];
  current: BlockResult;
  updatedAt: number;
};
export type TrainingDocument = {
  version: 1;
  sessions: TrainingSession[];
  results: TrainingResult[];
  actuals: Record<string, Actual[]>;
  recovery: Recovery | null;
};
export const emptyTraining = (): TrainingDocument => ({
  version: 1,
  sessions: [],
  results: [],
  actuals: {},
  recovery: null,
});
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid training data. Existing data has been preserved.');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, allowed: string[]) {
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new Error('Unsupported training fields. Existing data has been preserved.');
}
export function text(value: unknown, max = 120): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max)
    throw new Error(`Enter text from 1 to ${max} characters.`);
  return value.trim();
}
export function integer(value: unknown, max = 604800000): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max)
    throw new Error('Invalid training number.');
  return value;
}
function list(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('Training list exceeds its supported limit.');
  return value;
}
function unique<T>(values: T[], id: (value: T) => string): T[] {
  if (new Set(values.map(id)).size !== values.length)
    throw new Error('Duplicate training identity.');
  return values;
}
export function parseSession(value: unknown): TrainingSession {
  const v = object(value);
  keys(v, ['id', 'name', 'blocks', 'favourite', 'collections']);
  const blocks = unique(
    list(v.blocks, 20).map((raw) => {
      const b = object(raw);
      keys(b, ['id', 'name', 'config', 'restSeconds', 'advance']);
      if (b.advance !== 'automatic' && b.advance !== 'ready')
        throw new Error('Choose an automatic or Ready transition.');
      return {
        id: text(b.id),
        name: text(b.name),
        config: copyValidatedConfig(b.config),
        restSeconds: integer(b.restSeconds, 3600),
        advance: b.advance,
      } as TrainingBlock;
    }),
    (b) => b.id,
  );
  if (!blocks.length) throw new Error('Add at least one workout block.');
  if (v.favourite !== undefined && typeof v.favourite !== 'boolean')
    throw new Error('Invalid favourite.');
  return {
    id: text(v.id),
    name: text(v.name),
    blocks,
    ...(v.favourite ? { favourite: true } : {}),
    ...(v.collections
      ? {
          collections: unique(
            list(v.collections, 100).map((c) => text(c, 80)),
            (c) => c,
          ),
        }
      : {}),
  };
}
export function sessionSeconds(session: TrainingSession): number | null {
  let seconds = 0;
  for (const [i, b] of session.blocks.entries()) {
    const duration = durationSeconds(b.config);
    if (!Number.isFinite(duration) || (i < session.blocks.length - 1 && b.advance === 'ready'))
      return null;
    seconds +=
      duration + b.config.leadInSeconds + (i < session.blocks.length - 1 ? b.restSeconds : 0);
  }
  return seconds;
}
export function sessionTimeLabel(session: TrainingSession): string {
  const seconds = sessionSeconds(session);
  if (seconds === null) return 'Duration unknown · manual wait or uncapped block';
  const capped = session.blocks.some(
    (b) => b.config.type === 'forTime' || b.config.type === 'ladder',
  );
  return `${capped ? 'Up to' : 'Scheduled'} ${Math.floor(seconds / 60)}m ${seconds % 60}s · pauses extra`;
}
export function parseActuals(value: unknown): Actual[] {
  return unique(
    list(value, 10000).map((raw) => {
      const a = object(raw);
      keys(a, [
        'exerciseId',
        'occurrence',
        'reps',
        'seconds',
        'metres',
        'calories',
        'load',
        'loadUnit',
      ]);
      const result: Actual = {
        exerciseId: text(a.exerciseId),
        occurrence: integer(a.occurrence, 100000),
      };
      for (const key of ['reps', 'seconds', 'metres', 'calories', 'load'] as const)
        if (a[key] !== undefined) {
          const n = a[key];
          if (
            typeof n !== 'number' ||
            !Number.isFinite(n) ||
            n < 0 ||
            n > 10000000 ||
            (key === 'reps' && !Number.isSafeInteger(n))
          )
            throw new Error('Use nonnegative numbers and whole repetitions.');
          result[key] = n;
        }
      if (a.load !== undefined) {
        if (a.loadUnit !== 'kg' && a.loadUnit !== 'lb')
          throw new Error('Choose kg or lb for the recorded load.');
        result.loadUnit = a.loadUnit;
      } else if (a.loadUnit !== undefined)
        throw new Error('Enter a load before choosing its unit.');
      return result;
    }),
    (a) => `${a.exerciseId}:${a.occurrence}`,
  );
}
export function actualOccurrenceLimit(config: WorkoutConfig, exerciseId: string): number {
  const index = config.exercises?.findIndex((e) => e.id === exerciseId) ?? -1;
  if (index < 0) return 0;
  const count = config.exercises?.length || 1;
  switch (config.type) {
    case 'countdown':
    case 'forTime':
      return 0;
    case 'amrap':
      return 100000;
    case 'ladder':
      return ladderReps(config).length;
    case 'intervals':
      return Math.max(0, Math.ceil((config.rounds - index) / count));
    default:
      return Math.max(0, Math.ceil((config.minutes - index) / count));
  }
}
export function validateActualsForConfig(config: WorkoutConfig, input: unknown): Actual[] {
  const values = parseActuals(input);
  for (const a of values) {
    const exercise = config.exercises?.find((e) => e.id === a.exerciseId);
    if (!exercise) throw Error('Actual performance refers to a missing exercise.');
    if (a.occurrence > actualOccurrenceLimit(config, a.exerciseId))
      throw Error('Use a block total or a valid movement round/rung.');
    if (
      exercise.supportedUnits &&
      ['reps', 'seconds', 'metres', 'calories'].some(
        (unit) =>
          a[unit as keyof Actual] !== undefined &&
          !exercise.supportedUnits?.includes(unit as 'reps'),
      )
    )
      throw Error('This movement does not support the recorded unit.');
    if (
      a.occurrence === 0 &&
      values.some((other) => other.exerciseId === a.exerciseId && other.occurrence !== 0)
    )
      throw Error('Use either a block total or separate rounds for each movement.');
  }
  return values;
}
function parseBlockResult(value: unknown, session: TrainingSession): BlockResult {
  const b = object(value);
  keys(b, [
    'blockId',
    'status',
    'elapsedMs',
    'actuals',
    'checkedIds',
    'completedMovements',
    'partialValue',
  ]);
  const block = session.blocks.find((entry) => entry.id === b.blockId);
  if (!block) throw new Error('Result refers to a missing block.');
  if (!['complete', 'partial', 'skipped'].includes(String(b.status)))
    throw new Error('Invalid block status.');
  const actuals = validateActualsForConfig(block.config, b.actuals);
  const ids = new Set((block.config.exercises ?? []).map((e) => e.id));
  if (actuals.some((a) => !ids.has(a.exerciseId)))
    throw new Error('Actual performance refers to a missing exercise.');
  const checkedIds = unique(
    list(b.checkedIds, 100).map((id) => text(id)),
    (id) => id,
  );
  if (checkedIds.some((id) => !ids.has(id))) throw new Error('Unknown checked exercise.');
  return {
    blockId: block.id,
    status: b.status as BlockResult['status'],
    elapsedMs: integer(b.elapsedMs),
    actuals,
    checkedIds,
    completedMovements: integer(b.completedMovements, 1000000),
    partialValue: integer(b.partialValue, 10000000),
  };
}
export function parseResult(value: unknown): TrainingResult {
  const r = object(value);
  keys(r, ['id', 'session', 'completedAt', 'blocks', 'note']);
  const session = parseSession(r.session);
  const blocks = unique(
    list(r.blocks, 20).map((b) => parseBlockResult(b, session)),
    (b) => b.blockId,
  );
  if (blocks.length !== session.blocks.length)
    throw new Error('Each block needs an explicit result status.');
  if (typeof r.note !== 'string' || r.note.length > 2000)
    throw new Error('Notes can contain up to 2,000 characters.');
  return {
    id: text(r.id),
    session,
    completedAt: integer(r.completedAt, 8640000000000000),
    blocks: session.blocks.map((block) => blocks.find((result) => result.blockId === block.id)!),
    note: r.note,
  };
}
export function parseRecovery(value: unknown): Recovery {
  const r = object(value);
  keys(r, [
    'id',
    'session',
    'index',
    'stage',
    'restRemainingMs',
    'snapshot',
    'blocks',
    'current',
    'updatedAt',
  ]);
  const session = parseSession(r.session);
  const index = integer(r.index, session.blocks.length - 1);
  if (!['work', 'rest', 'ready', 'review'].includes(String(r.stage)))
    throw new Error('Invalid recovery stage.');
  let snapshot: SessionSnapshot | null = null;
  if (r.snapshot !== null) {
    const s = object(r.snapshot);
    const config = copyValidatedConfig(s.config);
    if (JSON.stringify(config) !== JSON.stringify(session.blocks[index].config))
      throw new Error('Recovery configuration does not match its block.');
    for (const key of [
      'elapsedMs',
      'remainingMs',
      'roundRemainingMs',
      'roundIndex',
      'exerciseIndex',
    ])
      integer(s[key]);
    if (
      !['leadIn', 'running', 'completed', 'cancelled'].includes(String(s.phase)) ||
      typeof s.paused !== 'boolean'
    )
      throw new Error('Invalid recovery clock.');
    snapshot = structuredClone(s) as unknown as SessionSnapshot;
  }
  const current = parseBlockResult(r.current, session);
  if (current.blockId !== session.blocks[index].id)
    throw new Error('Recovery position is inconsistent.');
  return {
    id: text(r.id),
    session,
    index,
    stage: r.stage as Recovery['stage'],
    restRemainingMs: integer(r.restRemainingMs, 3600000),
    snapshot,
    blocks: unique(
      list(r.blocks, 20).map((b) => parseBlockResult(b, session)),
      (b) => b.blockId,
    ),
    current,
    updatedAt: integer(r.updatedAt, 8640000000000000),
  };
}
export function parseTrainingDocument(value: unknown): TrainingDocument {
  const d = object(value);
  keys(d, ['version', 'sessions', 'results', 'actuals', 'recovery']);
  if (d.version !== 1)
    throw new Error('Unsupported training data version. Existing data has been preserved.');
  const actuals: Record<string, Actual[]> = {};
  for (const [id, values] of Object.entries(object(d.actuals))) {
    text(id);
    Object.defineProperty(actuals, id, {
      value: parseActuals(values),
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  return {
    version: 1,
    sessions: unique(list(d.sessions, 100).map(parseSession), (s) => s.id),
    results: unique(list(d.results, 100000).map(parseResult), (r) => r.id),
    actuals,
    recovery: d.recovery === null ? null : parseRecovery(d.recovery),
  };
}
