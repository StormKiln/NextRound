import { type LadderConfig, type LadderPattern, ladderReps } from '@nextround/core';
import { useNavigate } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseEditor } from '@/features/setup/exercise-editor';
import { SetupErrors, useSetupValidation } from '@/features/setup/validation';
import { SaveWorkoutButton } from '@/features/templates';
import { useWorkout } from '@/state/workout';
export function LadderSetup() {
  const { ladderDraft: d, setLadderDraft: set, start, busy, error } = useWorkout();
  const { errors, validate, getConfig } = useSetupValidation('ladder');
  const navigate = useNavigate();
  const c = useWorkout.getState().getDraftConfig('ladder') as LadderConfig;
  const reps = ladderReps(c);
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">One rung at a time.</p>
          <h1>Build your Ladder.</h1>
          <p className="subtitle">
            Follow a changing rep target at your own pace. Mark each movement complete.
          </p>
        </div>
        <span className="mode-pill">Ladder</span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="ladder-heading">
          <h2 id="ladder-heading">Choose your progression</h2>
          <label htmlFor="ladder-direction">Pattern</label>
          <select
            id="ladder-direction"
            value={d.direction}
            onChange={(e) => set({ direction: e.target.value as LadderPattern['direction'] })}
          >
            <option value="ascending">Ascending</option>
            <option value="descending">Descending</option>
            <option value="pyramid">Pyramid</option>
          </select>
          <div className="timing-fields">
            {(
              [
                { key: 'startReps', label: 'Starting reps', max: 1000 },
                { key: 'increment', label: 'Rep increment', max: 1000 },
                {
                  key: 'rungs',
                  label: d.direction === 'pyramid' ? 'Rungs to peak' : 'Rungs',
                  max: 50,
                },
              ] as const
            ).map((f) => (
              <div key={f.key}>
                <label htmlFor={`ladder-${f.key}`}>{f.label}</label>
                <Input
                  id={`ladder-${f.key}`}
                  type="number"
                  min="1"
                  max={f.max}
                  step="1"
                  value={d[f.key]}
                  onChange={(e) => set({ [f.key]: e.target.value })}
                  aria-invalid={!!errors.ladder}
                  aria-describedby={errors.ladder ? 'ladder-error-ladder' : undefined}
                />
              </div>
            ))}
          </div>
          <section
            className="ladder-preview"
            data-testid="ladder-preview"
            aria-label="Ladder preview"
          >
            <h3>Round targets · reps of each movement</h3>
            <p>
              {reps.length
                ? reps.join(' → ')
                : 'Choose a valid progression to preview your targets.'}
            </p>
            {!!reps.length && (
              <p>
                {reps.length} rungs · {reps.reduce((a, b) => a + b, 0) * d.exercises.length} planned
                total reps
              </p>
            )}
          </section>
          <label className="checklist-option">
            <input
              type="checkbox"
              checked={d.capped}
              onChange={(e) => set({ capped: e.target.checked })}
            />
            Use a time cap
          </label>
          <div className="timing-fields">
            {(
              [
                { key: 'minutes', label: 'Minutes', max: 1440 },
                { key: 'seconds', label: 'Seconds', max: 59 },
                { key: 'leadInSeconds', label: 'Lead-in seconds', max: 3600 },
                { key: 'warningSeconds', label: 'Warning seconds', max: 59 },
              ] as const
            )
              .filter((f) => d.capped || !['minutes', 'seconds'].includes(f.key))
              .map((f) => {
                const k = ['minutes', 'seconds'].includes(f.key) ? 'timeCapSeconds' : f.key;
                return (
                  <div key={f.key}>
                    <label htmlFor={`ladder-${f.key}`}>{f.label}</label>
                    <Input
                      id={`ladder-${f.key}`}
                      type="number"
                      min="0"
                      max={f.max}
                      step="1"
                      value={d[f.key]}
                      onChange={(e) => set({ [f.key]: e.target.value })}
                      aria-invalid={!!errors[k]}
                      aria-describedby={errors[k] ? `ladder-error-${k}` : undefined}
                    />
                  </div>
                );
              })}
          </div>
          <SetupErrors errors={errors} mode="ladder" />
          {error && <p role="alert">{error}</p>}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (validate() && (await start(false, 'ladder'))) void navigate({ to: '/workout' });
            }}
          >
            Start Ladder
          </Button>
          <SaveWorkoutButton getConfig={getConfig} validate={validate} />
        </section>
        <div data-invalid-exercises={!!errors.exercises}>
          <ExerciseEditor
            validationError={errors.exercises}
            exercises={d.exercises}
            onChange={(exercises) => set({ exercises })}
            repLadder
            title="Your Ladder movements"
            description="Each movement uses the previewed reps for its rung. Choose rep-based exercises or add a Custom movement."
          />
        </div>
      </div>
    </main>
  );
}
