export type ExerciseEntry = { id: string; name: string; description?: string };
export type EmomConfig = {
  minutes: number;
  leadInSeconds: number;
  warningSeconds: number;
  exercises: ExerciseEntry[];
};
export type Workout = { type: 'emom'; config: EmomConfig };
export type SessionSnapshot = {
  phase: 'leadIn' | 'running' | 'completed' | 'cancelled';
  remainingMs: number;
  roundRemainingMs: number;
  roundIndex: number;
  exerciseIndex: number;
  elapsedMs: number;
  paused: boolean;
  notice?: string | null;
  config: EmomConfig;
};
export function validateConfig(config: EmomConfig): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!Number.isInteger(config.minutes) || config.minutes < 1 || config.minutes > 1440)
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
  if (
    config.exercises.length < 1 ||
    config.exercises.length > 100 ||
    config.exercises.some(
      (e) => !e.name.trim() || e.name.length > 120 || (e.description?.length ?? 0) > 2000,
    )
  )
    errors.exercises =
      'Add 1–100 exercises with names up to 120 characters and descriptions up to 2000 characters.';
  return errors;
}
export function snapshotAt(config: EmomConfig, elapsed: number): SessionSnapshot {
  const lead = config.leadInSeconds * 1000;
  const duration = config.minutes * 60000;
  const active = Math.max(0, elapsed - lead);
  const completed = active >= duration;
  const roundIndex = Math.min(config.minutes - 1, Math.floor(active / 60000));
  return {
    config,
    phase: elapsed < lead ? 'leadIn' : completed ? 'completed' : 'running',
    remainingMs: Math.max(0, duration - active),
    roundRemainingMs: elapsed < lead ? lead - elapsed : completed ? 0 : 60000 - (active % 60000),
    roundIndex,
    exerciseIndex: roundIndex % config.exercises.length,
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
