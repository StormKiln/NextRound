import { beforeEach, expect, it, vi } from 'vitest';
import { emptyTraining, type TrainingSession } from './model';
import { beginRun } from './progress';

const mocks = vi.hoisted(() => ({
  read: vi.fn(),
  guard: vi.fn(),
  control: vi.fn(),
  write: vi.fn(),
  workout: {
    snapshot: null as unknown,
    checkedExerciseIds: [],
    amrapProgress: { completedMovements: 0, partialValue: 0 },
  },
  owned: { owned: true },
}));
vi.mock('@/native/adapter', () => ({
  readWorkout: mocks.read,
  setTrainingGuard: mocks.guard,
  controlWorkout: mocks.control,
  resolveResult: vi.fn(),
  fullscreen: vi.fn(),
}));
vi.mock('@/state/workout', () => ({
  useWorkout: {
    getState: () => mocks.workout,
    setState: (value: object) => Object.assign(mocks.workout, value),
  },
}));
vi.mock('./ownership', () => ({
  useTrainingOwnership: {
    getState: () => mocks.owned,
    setState: (value: object) => Object.assign(mocks.owned, value),
  },
}));
vi.mock('./repository', () => ({ mutateTraining: mocks.write, readTraining: vi.fn() }));
const config = {
  type: 'countdown' as const,
  durationSeconds: 60,
  leadInSeconds: 0,
  warningSeconds: 0,
  exercises: [],
};
const session: TrainingSession = {
  id: 's',
  name: 'Session',
  blocks: [{ id: 'b', name: 'Block', config, restSeconds: 0, advance: 'automatic' }],
};
const snapshot = {
  config,
  phase: 'running' as const,
  paused: false,
  elapsedMs: 1000,
  remainingMs: 59000,
  roundRemainingMs: 59000,
  roundIndex: 0,
  exerciseIndex: 0,
};
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});
for (const action of ['end', 'discard', 'pause'] as const)
  it(`late poll cannot overwrite ${action}`, async () => {
    const { useTraining } = await import('./state');
    let doc = emptyTraining();
    mocks.write.mockImplementation(async (fn: (d: typeof doc) => void) => {
      fn(doc);
      doc = structuredClone(doc);
    });
    mocks.read.mockResolvedValue(snapshot);
    mocks.control.mockResolvedValue({ ...snapshot, paused: true });
    let release!: () => void, entered!: () => void;
    const waiting = new Promise<void>((r) => {
      entered = r;
    });
    const held = new Promise<void>((r) => {
      release = r;
    });
    mocks.guard.mockImplementation(async (_active: boolean, awake: boolean) => {
      if (awake) {
        entered();
        await held;
      }
    });
    const run = beginRun(session);
    run.snapshot = snapshot;
    useTraining.setState({ run });
    const tick = useTraining.getState().tick();
    await waiting;
    if (action === 'pause') await useTraining.getState().pause(true);
    else await useTraining.getState()[action]();
    const expected = structuredClone(useTraining.getState().run);
    release();
    await tick;
    expect(useTraining.getState().run).toEqual(expected);
    expect(doc.recovery?.stage ?? null).toBe(expected?.stage ?? null);
    if (action === 'pause') expect(useTraining.getState().paused).toBe(true);
  });
