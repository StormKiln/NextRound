import {
  countLabel,
  durationSeconds,
  formatTarget,
  formatTime,
  ladderReps,
  type WorkoutConfig,
} from '@nextround/core';
export function workoutSummary(config: WorkoutConfig) {
  return config.type === 'ladder'
    ? `Ladder · ${config.ladder.direction} · ${config.ladder.startReps} starting reps`
    : config.type === 'forTime'
      ? `For Time · ${config.timeCapSeconds ? `${formatTime(config.timeCapSeconds * 1000)} cap` : 'No time cap'}`
      : config.type === 'amrap'
        ? `AMRAP · ${formatTime(config.durationSeconds * 1000)} cap`
        : config.type === 'intervals'
          ? `Intervals · ${countLabel(config.rounds, 'round')} · ${config.workSeconds}s work / ${config.restSeconds}s rest`
          : config.type === 'countdown'
            ? `Countdown · ${config.durationSeconds} seconds`
            : `EMOM · ${countLabel(config.minutes, 'round')}`;
}
export function WorkoutDetails({ config }: { config: WorkoutConfig }) {
  const openEnded = config.type === 'forTime' || config.type === 'ladder';
  const seconds = durationSeconds(config);
  return (
    <section className="template-review" aria-label="Saved workout details">
      <p>{workoutSummary(config)}</p>
      <p>
        {openEnded
          ? Number.isFinite(seconds)
            ? `Time cap: ${formatTime(seconds * 1000)}`
            : 'No time cap — finish at your own pace.'
          : `Workout duration: ${formatTime(seconds * 1000)}`}
      </p>
      <p>
        Lead-in: {config.leadInSeconds}s · Warning: {config.warningSeconds}s
      </p>
      <p>Lead-in is extra; paused time is excluded.</p>
      {config.type === 'intervals' && <p>No rest after the final work round.</p>}
      {(config.type === undefined || config.type === 'emom') && (
        <p>One movement per minute, cycling through the saved order.</p>
      )}
      {config.type === 'ladder' && (
        <>
          <p>
            {config.ladder.rungs} configured rungs · {config.ladder.increment} rep increment
          </p>
          <p>Reps per movement by rung: {ladderReps(config).join(' → ')}</p>
        </>
      )}
      {(config.type === 'countdown' || config.type === 'forTime') && (
        <p>Checklist: {config.showChecklist !== false ? 'On' : 'Off'}</p>
      )}
      <h3>Exercises ({config.exercises?.length ?? 0})</h3>
      <ol>
        {config.exercises?.map((exercise) => (
          <li key={exercise.id}>
            <strong>{exercise.name}</strong>
            {exercise.target && <> · {formatTarget(exercise.target)}</>}
            {exercise.description && <p>{exercise.description}</p>}
          </li>
        ))}
      </ol>
      {!config.exercises?.length && <p>No exercises specified.</p>}
      <p>Targets are prescriptions, not measured results or predicted completion times.</p>
    </section>
  );
}
