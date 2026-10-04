import { ladderReps, type LadderConfig } from './ladder';
export { ladderReps, ladderTotalMovements, validLadderProgress, formatLadderProgress, type LadderConfig, type LadderPattern } from './ladder';
export type TargetUnit = 'reps' | 'seconds' | 'metres' | 'calories';
export type ExerciseTarget = { unit: TargetUnit; value: number };
export type ExerciseEntry = {
  id: string;
  catalogId?: string;
  name: string;
  description?: string;
  target?: ExerciseTarget;
  supportedUnits?: TargetUnit[];
};
export function formatTarget(target: ExerciseTarget): string {
  return `${target.value} ${{ reps: 'reps', seconds: 'sec', metres: 'm', calories: 'cal' }[target.unit]}`;
}
function validTarget(exercise: ExerciseEntry): boolean {
  const units: TargetUnit[] = ['reps', 'seconds', 'metres', 'calories'];
  if (exercise.supportedUnits?.some((unit) => !units.includes(unit))) return false;
  const target = exercise.target;
  return (
    target == null ||
    (units.includes(target.unit) &&
      Number.isInteger(target.value) &&
      target.value > 0 &&
      target.value <= (target.unit === 'seconds' ? 86400 : 999999) &&
      (!exercise.supportedUnits || exercise.supportedUnits.includes(target.unit)))
  );
}
export type EmomConfig = {
  type?: 'emom';
  minutes: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises: ExerciseEntry[];
};
export type CountdownConfig = {
  type: 'countdown';
  durationSeconds: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises?: ExerciseEntry[];
  showChecklist?: boolean;
};
export type IntervalsConfig = {
  type: 'intervals';
  workSeconds: number;
  restSeconds: number;
  rounds: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises: ExerciseEntry[];
};
export type AmrapConfig = {
  type: 'amrap';
  durationSeconds: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises: ExerciseEntry[];
};
export type AmrapProgress = { completedMovements: number; partialValue: number };
export function validAmrapProgress(config: AmrapConfig, score: AmrapProgress): boolean {
  const target = config.exercises[score.completedMovements % config.exercises.length]?.target;
  return (
    Object.keys(score).every((key) => ['completedMovements', 'partialValue'].includes(key)) &&
    Number.isSafeInteger(score.completedMovements) &&
    score.completedMovements >= 0 &&
    score.completedMovements <= 999999 &&
    Number.isSafeInteger(score.partialValue) &&
    score.partialValue >= 0 &&
    !!target &&
    score.partialValue < target.value
  );
}
export function formatAmrapProgress(config: AmrapConfig, score: AmrapProgress): string {
  const rounds = Math.floor(score.completedMovements / config.exercises.length);
  const extra = score.completedMovements % config.exercises.length;
  const current = config.exercises[extra];
  return `${rounds} completed ${rounds === 1 ? 'round' : 'rounds'} + ${extra} completed ${extra === 1 ? 'movement' : 'movements'}${score.partialValue && current.target ? ` + ${formatTarget({ ...current.target, value: score.partialValue })} of ${current.name}` : ''}`;
}
export type ForTimeConfig = {
  type: 'forTime';
  timeCapSeconds?: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises?: ExerciseEntry[];
  showChecklist?: boolean;
};
export type ForTimeOutcome = 'finished' | 'timeCapReached';
export type WorkoutConfig =
  | LadderConfig
  | ForTimeConfig
  | EmomConfig
  | CountdownConfig
  | IntervalsConfig
  | AmrapConfig;
export function durationSeconds(config: WorkoutConfig): number {
  return config.type === 'forTime' || config.type === 'ladder'
    ? (config.timeCapSeconds ?? Infinity)
    : config.type === 'intervals'
      ? config.rounds * config.workSeconds + (config.rounds - 1) * config.restSeconds
      : config.type === 'countdown' || config.type === 'amrap'
        ? config.durationSeconds
        : config.minutes * 60;
}
export type WorkoutCue = 'tock' | 'beep' | 'rest' | 'complete';
export type Workout =
  | { type: 'ladder'; config: LadderConfig }
  | { type: 'forTime'; config: ForTimeConfig }
  | { type: 'emom'; config: EmomConfig }
  | { type: 'countdown'; config: CountdownConfig }
  | { type: 'intervals'; config: IntervalsConfig }
  | { type: 'amrap'; config: AmrapConfig };
export type SessionSnapshot = {
  ladderCompletedMovements?: number;
  outcome?: ForTimeOutcome;
  phase: 'leadIn' | 'running' | 'completed' | 'cancelled';
  remainingMs: number;
  roundRemainingMs: number;
  intervalPhase?: 'work' | 'rest';
  roundIndex: number;
  exerciseIndex: number;
  elapsedMs: number;
  paused: boolean;
  notice?: string | null;
  config: WorkoutConfig;
};
export function validateConfig(config: WorkoutConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (config.type === 'forTime' || config.type === 'ladder') {
    if (
      config.timeCapSeconds !== undefined &&
      (!Number.isInteger(config.timeCapSeconds) ||
        config.timeCapSeconds < 1 ||
        config.timeCapSeconds > 86400)
    )
      errors.timeCapSeconds = 'Choose a whole time cap from 1 to 86400 seconds.';
  } else if (config.type === 'intervals') {
    for (const [key, min, max] of [
      ['workSeconds', 1, 86400],
      ['restSeconds', 0, 86400],
      ['rounds', 1, 1440],
    ] as const) {
      if (!Number.isInteger(config[key]) || config[key] < min || config[key] > max)
        errors[key] = `Choose a whole number from ${min} to ${max}.`;
    }
    if (!Object.keys(errors).length && durationSeconds(config) > 86400)
      errors.durationSeconds = 'Keep the total workout within 24 hours.';
  } else if (config.type === 'countdown' || config.type === 'amrap') {
    if (
      !Number.isInteger(config.durationSeconds) ||
      config.durationSeconds < 1 ||
      config.durationSeconds > 86400
    )
      errors.durationSeconds = 'Choose a whole duration from 1 to 86400 seconds.';
  } else if (!Number.isInteger(config.minutes) || config.minutes < 1 || config.minutes > 1440)
    errors.minutes = 'Choose a whole number from 1 to 1440.';
  if (
    !Number.isInteger(config.leadInSeconds) ||
    config.leadInSeconds < 0 ||
    config.leadInSeconds > 3600
  )
    errors.leadInSeconds = 'Choose a whole number from 0 to 3600.';
  if (
    !Number.isInteger(config.warningSeconds) ||
    config.warningSeconds < 0 ||
    config.warningSeconds > 59
  )
    errors.warningSeconds = 'Choose a whole number from 0 to 59.';
  if (config.type === 'ladder' && !ladderReps(config).length)
    errors.ladder = 'Choose start/increment 1–1000 and 1–50 rungs. Every rung must have at least one rep.';
  const entries =
    config.exercises === undefined && (config.type === 'countdown' || config.type === 'forTime')
      ? []
      : config.exercises;
  if (
    !Array.isArray(entries) ||
    (config.type !== 'countdown' && config.type !== 'forTime' && entries.length < 1) ||
    entries.length > 100 ||
    entries.some(
      (e) =>
        !e ||
        typeof e.id !== 'string' ||
        !e.id.trim() ||
        typeof e.name !== 'string' ||
        !e.name.trim() ||
        e.name.length > 120 ||
        (e.description !== undefined &&
          e.description !== null &&
          (typeof e.description !== 'string' || e.description.length > 2000)) ||
        (e.supportedUnits !== undefined && !Array.isArray(e.supportedUnits)) ||
        !validTarget(e) ||
        (config.type === 'amrap' && !e.target) ||
        (config.type === 'ladder' && ((e.supportedUnits && !e.supportedUnits.includes('reps')) || e.target !== undefined)),
    ) ||
    new Set(entries.map((e) => e.id)).size !== entries.length
  )
    errors.exercises = `Add ${config.type === 'countdown' || config.type === 'forTime' ? '0' : '1'}–100 exercises with unique IDs, names up to 120 characters and descriptions up to 2000 characters. Targets must use a supported unit and a positive whole value up to 999999 (86400 for seconds).`;
  if (
    (config.type === 'countdown' || config.type === 'forTime') &&
    config.showChecklist !== undefined &&
    typeof config.showChecklist !== 'boolean'
  )
    errors.showChecklist = 'Choose whether to show completion checkboxes.';
  return errors;
}
export function snapshotAt(config: WorkoutConfig, elapsed: number): SessionSnapshot {
  const lead = config.leadInSeconds * 1000;
  const duration = durationSeconds(config) * 1000;
  const active = Math.max(0, elapsed - lead);
  const completed = active >= duration;
  if (config.type === 'forTime' || config.type === 'ladder') {
    const remaining = Number.isFinite(duration) ? Math.max(0, duration - active) : 0;
    return {
      config,
      ...(config.type === 'ladder' ? { ladderCompletedMovements: 0 } : {}),
      phase: elapsed < lead ? 'leadIn' : completed ? 'completed' : 'running',
      remainingMs: remaining,
      roundRemainingMs: elapsed < lead ? lead - elapsed : remaining,
      roundIndex: 0,
      exerciseIndex: 0,
      elapsedMs: Math.min(active, duration),
      paused: false,
      ...(completed ? { outcome: 'timeCapReached' } : {}),
    };
  }
  const cycle =
    config.type === 'intervals' ? (config.workSeconds + config.restSeconds) * 1000 : 60000;
  const roundIndex =
    config.type === 'countdown' || config.type === 'amrap'
      ? 0
      : Math.min(
          (config.type === 'intervals' ? config.rounds : config.minutes) - 1,
          Math.floor(active / cycle),
        );
  const resting =
    config.type === 'intervals' &&
    !completed &&
    elapsed >= lead &&
    active % cycle >= config.workSeconds * 1000;
  const phaseRemaining =
    config.type === 'intervals'
      ? (resting ? cycle : config.workSeconds * 1000) - (active % cycle)
      : 60000 - (active % 60000);
  return {
    config,
    phase: elapsed < lead ? 'leadIn' : completed ? 'completed' : 'running',
    remainingMs: Math.max(0, duration - active),
    roundRemainingMs:
      elapsed < lead
        ? lead - elapsed
        : completed
          ? 0
          : config.type === 'countdown' || config.type === 'amrap'
            ? duration - active
            : phaseRemaining,
    ...(config.type === 'intervals'
      ? { intervalPhase: resting ? ('rest' as const) : ('work' as const) }
      : {}),
    roundIndex,
    exerciseIndex:
      config.type === 'countdown' || config.type === 'amrap'
        ? 0
        : roundIndex % config.exercises.length,
    elapsedMs: Math.min(active, duration),
    paused: false,
  };
}
export function formatElapsed(ms: number): string {
  const seconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = String(Math.floor(seconds / 60) % 60).padStart(2, '0');
  const tail = `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  return seconds >= 3600 ? `${Math.floor(seconds / 3600)}:${tail}` : tail;
}
export function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}

export function cueAt(config: WorkoutConfig, elapsedMs: number): WorkoutCue | null {
  const second = Math.floor(elapsedMs / 1000);
  const lead = config.leadInSeconds;
  const end = lead + durationSeconds(config);
  if (second > end) return null;
  if (second === end) return 'complete';
  if (config.type === 'intervals' && second >= lead) {
    const inCycle = (second - lead) % (config.workSeconds + config.restSeconds);
    if (inCycle === 0) return 'beep';
    if (inCycle === config.workSeconds) return 'rest';
    const remaining =
      (inCycle < config.workSeconds
        ? config.workSeconds
        : config.workSeconds + config.restSeconds) - inCycle;
    return remaining <= config.warningSeconds ? 'tock' : null;
  }
  if (
    second === lead ||
    (config.type !== 'countdown' &&
      config.type !== 'amrap' &&
      config.type !== 'forTime' &&
      config.type !== 'ladder' &&
      second > lead &&
      (second - lead) % 60 === 0)
  )
    return 'beep';
  const remaining =
    second < lead
      ? lead - second
      : config.type === 'countdown' || config.type === 'amrap' || config.type === 'forTime' || config.type === 'ladder'
        ? end - second
        : 60 - ((second - lead) % 60);
  return remaining <= config.warningSeconds ? 'tock' : null;
}
