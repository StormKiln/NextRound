import {
  formatLadderProgress,
  type LadderConfig,
  ladderReps,
  ladderTotalMovements,
} from '@nextround/core';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useWorkout } from '@/state/workout';
export function LadderProgressPanel() {
  const { snapshot: s, busy, control, stopConfirmation, finishConfirmation } = useWorkout();
  const active = useRef<HTMLLIElement>(null);
  const count = s?.ladderCompletedMovements ?? 0;
  useEffect(() => {
    if (count >= 0) active.current?.scrollIntoView({ block: 'nearest' });
  }, [count]);
  if (s?.config.type !== 'ladder') return null;
  const c = s.config;
  const reps = ladderReps(c);
  const total = ladderTotalMovements(c);
  const rung = Math.floor(count / c.exercises.length);
  const movement = count % c.exercises.length;
  const frozen = busy || stopConfirmation || finishConfirmation || s.phase !== 'running';
  return (
    <section className="ladder-progress" data-testid="ladder-progress" aria-label="Ladder progress">
      <h2>
        {count === total
          ? 'All movements marked complete'
          : `Rung ${rung + 1} of ${reps.length} · ${reps[rung]} reps each`}
      </h2>
      <p role="status">{formatLadderProgress(c, count)}</p>
      <ol className="ladder-movements">
        {c.exercises.map((e, i) => (
          <li
            key={e.id}
            ref={i === movement ? active : undefined}
            aria-current={count < total && i === movement ? 'step' : undefined}
          >
            <strong>{e.name}</strong>
            <span>
              {count < total
                ? `${reps[rung]} reps${i < movement ? ' · Completed' : ''}`
                : 'Completed'}
            </span>
            {e.description && <p>{e.description}</p>}
          </li>
        ))}
      </ol>
      <div className="dialog-actions">
        <Button disabled={frozen || count >= total} onClick={() => void control('advance')}>
          Complete movement
        </Button>
        <Button
          variant="secondary"
          disabled={frozen || count === 0}
          onClick={() => void control('undo')}
        >
          Undo movement
        </Button>
      </div>
      <p className="hint">
        Mark only movements you completed. The timer does not measure your reps.
      </p>
    </section>
  );
}
export function LadderResult({ config, completed }: { config: LadderConfig; completed: number }) {
  const reps = ladderReps(config);
  return (
    <section className="ladder-result">
      <h2>Ladder result</h2>
      <p>{formatLadderProgress(config, completed)}</p>
      <p>Targets: {reps.join(' → ')} reps of each movement</p>
      <p>
        Completed reps (as marked):{' '}
        {Array.from(
          { length: completed },
          (_, i) => reps[Math.floor(i / config.exercises.length)],
        ).reduce((a, b) => a + b, 0)}
      </p>
      {completed < ladderTotalMovements(config) && (
        <p>
          Next planned target: {reps[Math.floor(completed / config.exercises.length)]} reps ·{' '}
          {config.exercises[completed % config.exercises.length].name}
        </p>
      )}
      <p className="muted">Unfinished movements are not counted as completed reps.</p>
    </section>
  );
}
