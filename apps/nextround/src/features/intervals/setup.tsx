import { durationSeconds, formatTime, validateConfig } from '@nextround/core';
import { useNavigate } from '@tanstack/react-router';
import { Play, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseEditor } from '@/features/setup/exercise-editor';
import { SetupErrors, useSetupValidation } from '@/features/setup/validation';
import { SaveWorkoutButton } from '@/features/templates';
import { useWorkout } from '@/state/workout';
export function IntervalsSetup() {
  const {
    intervalsDraft: draft,
    setIntervalsDraft,
    start,
    busy,

    error,
    getDraftConfig,
  } = useWorkout();
  const navigate = useNavigate();
  const { errors, validate, getConfig } = useSetupValidation('intervals');
  const config = getDraftConfig('intervals');
  const valid = Object.keys(validateConfig(config)).length === 0;
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Work. Rest. Repeat.</p>
          <h1>Find your rhythm.</h1>
          <p className="subtitle">Your work time. Your recovery. One movement per round.</p>
        </div>
        <span className="mode-pill">
          <Repeat2 size={17} /> Intervals
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="interval-timing">
          <h2 id="interval-timing">Set your intervals</h2>
          <p className="muted">Rest between rounds. Finish after the last work phase.</p>
          <div className="timing-fields">
            {(
              [
                { key: 'workSeconds', label: 'Work seconds', min: 1, max: 86400 },
                { key: 'restSeconds', label: 'Rest seconds', min: 0, max: 86400 },
                { key: 'rounds', label: 'Rounds', min: 1, max: 1440 },
                { key: 'leadInSeconds', label: 'Lead-in seconds', min: 0, max: 3600 },
                { key: 'warningSeconds', label: 'Warning seconds', min: 0, max: 59 },
              ] as const
            ).map(({ key, label, min, max }) => (
              <div key={key}>
                <label htmlFor={`interval-${key}`}>{label}</label>
                <Input
                  id={`interval-${key}`}
                  type="number"
                  min={min}
                  max={max}
                  step="1"
                  value={draft[key]}
                  onChange={(e) => setIntervalsDraft({ [key]: e.target.value })}
                  aria-describedby={
                    errors[key]
                      ? `intervals-error-${key}`
                      : errors.durationSeconds
                        ? 'intervals-error-durationSeconds'
                        : undefined
                  }
                  aria-invalid={!!errors[key]}
                />
              </div>
            ))}
          </div>
          <p className="hint">
            {valid
              ? `${formatTime(durationSeconds(config) * 1000)} total, excluding lead-in and pauses.`
              : 'Choose whole durations and rounds, up to 24 hours total.'}
          </p>
          <SetupErrors errors={errors} mode="intervals" />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (validate() && (await start(false, 'intervals')))
                void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start intervals'}
          </Button>
          <SaveWorkoutButton getConfig={getConfig} validate={validate} />
        </section>
        <ExerciseEditor
          validationError={errors.exercises}
          exercises={draft.exercises}
          onChange={(exercises) => setIntervalsDraft({ exercises })}
          rounds={Number(draft.rounds)}
          workSeconds={Number(draft.workSeconds)}
          description="One movement per work phase. Recover between rounds, then move to the next exercise."
        />
      </div>
    </main>
  );
}
