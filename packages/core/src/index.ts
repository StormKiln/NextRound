export type TargetUnit = 'reps' | 'seconds' | 'metres' | 'calories';
export type ExerciseTarget = { unit: TargetUnit; value: number };
export type ExerciseEntry = {
  id: string;
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
export type WorkoutConfig = EmomConfig | CountdownConfig;
export type WorkoutCue = 'tock' | 'beep' | 'complete';
export type Workout =
  | { type: 'emom'; config: EmomConfig }
  | { type: 'countdown'; config: CountdownConfig };
export type SessionSnapshot = {
  phase: 'leadIn' | 'running' | 'completed' | 'cancelled';
  remainingMs: number;
  roundRemainingMs: number;
  roundIndex: number;
  exerciseIndex: number;
  elapsedMs: number;
  paused: boolean;
  notice?: string | null;
  config: WorkoutConfig;
};
export function validateConfig(config: WorkoutConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (config.type === 'countdown') {
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
  const entries =
    config.exercises === undefined && config.type === 'countdown' ? [] : config.exercises;
  if (
    !Array.isArray(entries) ||
    (config.type !== 'countdown' && entries.length < 1) ||
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
        !validTarget(e),
    ) ||
    new Set(entries.map((e) => e.id)).size !== entries.length
  )
    errors.exercises = `Add ${config.type === 'countdown' ? '0' : '1'}–100 exercises with unique IDs, names up to 120 characters and descriptions up to 2000 characters. Targets must use a supported unit and a positive whole value up to 999999 (86400 for seconds).`;
  if (
    config.type === 'countdown' &&
    config.showChecklist !== undefined &&
    typeof config.showChecklist !== 'boolean'
  )
    errors.showChecklist = 'Choose whether to show completion checkboxes.';
  return errors;
}
export function snapshotAt(config: WorkoutConfig, elapsed: number): SessionSnapshot {
  const lead = config.leadInSeconds * 1000;
  const duration =
    config.type === 'countdown' ? config.durationSeconds * 1000 : config.minutes * 60000;
  const active = Math.max(0, elapsed - lead);
  const completed = active >= duration;
  const roundIndex =
    config.type === 'countdown' ? 0 : Math.min(config.minutes - 1, Math.floor(active / 60000));
  return {
    config,
    phase: elapsed < lead ? 'leadIn' : completed ? 'completed' : 'running',
    remainingMs: Math.max(0, duration - active),
    roundRemainingMs:
      elapsed < lead
        ? lead - elapsed
        : completed
          ? 0
          : config.type === 'countdown'
            ? duration - active
            : 60000 - (active % 60000),
    roundIndex,
    exerciseIndex: config.type === 'countdown' ? 0 : roundIndex % config.exercises.length,
    elapsedMs: Math.min(active, duration),
    paused: false,
  };
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
  const end = lead + (config.type === 'countdown' ? config.durationSeconds : config.minutes * 60);
  if (second > end) return null;
  if (second === end) return 'complete';
  if (
    second === lead ||
    (config.type !== 'countdown' && second > lead && (second - lead) % 60 === 0)
  )
    return 'beep';
  const remaining =
    second < lead
      ? lead - second
      : config.type === 'countdown'
        ? end - second
        : 60 - ((second - lead) % 60);
  return remaining <= config.warningSeconds ? 'tock' : null;
}
