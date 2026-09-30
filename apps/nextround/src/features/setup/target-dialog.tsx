import type { ExerciseEntry, ExerciseTarget, TargetUnit } from '@nextround/core';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const labels: Record<TargetUnit, string> = {
  reps: 'Repetitions',
  seconds: 'Seconds',
  metres: 'Metres',
  calories: 'Calories',
};
const allUnits: TargetUnit[] = ['reps', 'seconds', 'metres', 'calories'];
export function TargetDialog({
  exercise,
  onSave,
  onClose,
}: {
  exercise: ExerciseEntry;
  onSave: (target: ExerciseTarget | undefined) => void;
  onClose: () => void;
}) {
  const units = exercise.supportedUnits ?? allUnits;
  const [unit, setUnit] = useState<TargetUnit>(exercise.target?.unit ?? units[0]);
  const [amount, setAmount] = useState(exercise.target ? String(exercise.target.value) : '10');
  const [error, setError] = useState<string | null>(null);
  const maximum = unit === 'seconds' ? 86400 : 999999;
  return (
    <Dialog title={`Target for ${exercise.name}`} onClose={onClose}>
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const value = Number(amount);
          if (!units.includes(unit) || !Number.isInteger(value) || value < 1 || value > maximum) {
            setError(`Enter a positive whole number from 1 to ${maximum}.`);
            return;
          }
          onSave({ unit, value });
        }}
      >
        <p className="muted">
          Finish this work within your minute, then recover until the next round.
        </p>
        <div className="target-fields">
          <div>
            <label htmlFor="target-amount">Target amount</label>
            <Input
              id="target-amount"
              type="number"
              min="1"
              max={maximum}
              step="1"
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              aria-invalid={!!error}
              aria-describedby={error ? 'target-error' : undefined}
            />
          </div>
          <div>
            <label htmlFor="target-unit">Target unit</label>
            <select
              id="target-unit"
              value={unit}
              onChange={(event) => {
                setUnit(event.target.value as TargetUnit);
                setError(null);
              }}
            >
              {units.map((option) => (
                <option key={option} value={option}>
                  {labels[option]}
                </option>
              ))}
            </select>
          </div>
        </div>
        {unit === 'seconds' && (
          <p className="hint">
            A time target does not change the 60-second round or add a separate alert.
          </p>
        )}
        {unit === 'calories' && (
          <p className="hint">Use the calorie count shown by your equipment.</p>
        )}
        {error && (
          <p id="target-error" className="error" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          {exercise.target && (
            <Button variant="ghost" type="button" onClick={() => onSave(undefined)}>
              Clear target
            </Button>
          )}
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save target</Button>
        </div>
      </form>
    </Dialog>
  );
}
