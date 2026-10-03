import { formatAmrapProgress, formatTarget } from '@nextround/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkout } from '@/state/workout';

export function AmrapProgressPanel() {
  const {
    snapshot,
    amrapProgress: score,
    setAmrapProgress,
    busy,
    scoreLocked,
    stopConfirmation,
    resultStatus,
  } = useWorkout();
  if (snapshot?.config.type !== 'amrap') return null;
  const config = snapshot.config;
  const currentIndex = score.completedMovements % config.exercises.length;
  const current = config.exercises[currentIndex];
  const editable =
    !busy &&
    !scoreLocked &&
    !stopConfirmation &&
    (snapshot.phase === 'running' ||
      (snapshot.phase === 'completed' && resultStatus === 'pending'));
  return (
    <section className="amrap-progress" aria-label="AMRAP progress">
      <h2>Your progress</h2>
      <p role="status">{formatAmrapProgress(config, score)}</p>
      <p className="hint">
        Record only work you completed. The timer does not measure repetitions. Use Undo to correct
        a completed movement.
      </p>
      <ol className="amrap-circuit">
        {config.exercises.map((e, i) => (
          <li key={e.id} aria-current={i === currentIndex ? 'step' : undefined}>
            <strong>
              {i + 1}. {e.name}
            </strong>
            {e.target && <span> · {formatTarget(e.target)}</span>}
            {i === currentIndex && <span> · Current movement</span>}
          </li>
        ))}
      </ol>
      <div className="add-actions">
        <Button
          disabled={!editable || score.completedMovements >= 999999}
          onClick={() =>
            setAmrapProgress({ completedMovements: score.completedMovements + 1, partialValue: 0 })
          }
        >
          Complete movement
        </Button>
        <Button
          variant="secondary"
          disabled={!editable || score.completedMovements === 0}
          onClick={() =>
            setAmrapProgress({ completedMovements: score.completedMovements - 1, partialValue: 0 })
          }
        >
          Undo movement
        </Button>
      </div>
      <label htmlFor="amrap-partial">
        Partial progress for {current.name} ({current.target?.unit})
      </label>
      <Input
        id="amrap-partial"
        type="number"
        min="0"
        max={(current.target?.value ?? 1) - 1}
        step="1"
        disabled={!editable}
        value={score.partialValue}
        onChange={(event) =>
          setAmrapProgress({ ...score, partialValue: Number(event.target.value) })
        }
      />
      <p className="hint">
        Enter 0–{(current.target?.value ?? 1) - 1} {current.target?.unit}. Once you finish the full
        target, choose Complete movement. Marking or undoing a movement resets its partial progress.
      </p>
      {snapshot.phase === 'completed' && editable && (
        <p>Review and correct your progress before saving the result.</p>
      )}
    </section>
  );
}
