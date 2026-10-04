import { useNavigate } from '@tanstack/react-router';
import { Clock3, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseEditor } from '@/features/setup/exercise-editor';
import { SetupErrors, useSetupValidation } from '@/features/setup/validation';

import { SaveWorkoutButton } from '@/features/templates';
import { useWorkout } from '@/state/workout';

export function AmrapSetup() {
  const { amrapDraft: draft, setAmrapDraft, start, busy, error } = useWorkout();
  const navigate = useNavigate();
  const { errors, validate, getConfig } = useSetupValidation('amrap');
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">As many rounds as possible</p>
          <h1>Keep the rounds coming.</h1>
          <p className="subtitle">Set a time cap. Repeat your circuit at your own pace.</p>
        </div>
        <span className="mode-pill">
          <Clock3 size={17} /> AMRAP
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="amrap-heading">
          <h2 id="amrap-heading">Set your time</h2>
          <p className="muted">
            Repeat the circuit until time runs out. Mark movements as you finish them; the timer
            never counts reps for you.
          </p>
          <div className="timing-fields">
            {(
              [
                { key: 'minutes', label: 'Minutes', max: 1440 },
                { key: 'seconds', label: 'Seconds', max: 59 },
                { key: 'leadInSeconds', label: 'Lead-in seconds', max: 3600 },
                { key: 'warningSeconds', label: 'Warning seconds', max: 59 },
              ] as const
            ).map(({ key, label, max }) => (
              <div key={key}>
                <label htmlFor={`amrap-${key}`}>{label}</label>
                <Input
                  id={`amrap-${key}`}
                  type="number"
                  min="0"
                  max={max}
                  step="1"
                  value={draft[key]}
                  onChange={(event) => setAmrapDraft({ [key]: event.target.value })}
                  aria-describedby={
                    errors[key]
                      ? `amrap-error-${key}`
                      : (key === 'minutes' || key === 'seconds') && errors.durationSeconds
                        ? 'amrap-error-durationSeconds'
                        : undefined
                  }
                  aria-invalid={
                    !!errors[key] ||
                    ((key === 'minutes' || key === 'seconds') && !!errors.durationSeconds)
                  }
                />
              </div>
            ))}
          </div>
          <SetupErrors errors={errors} mode="amrap" />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (validate() && (await start(false, 'amrap'))) void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start AMRAP'}
          </Button>
          <SaveWorkoutButton getConfig={getConfig} validate={validate} />
        </section>
        <ExerciseEditor
          validationError={errors.exercises}
          exercises={draft.exercises}
          onChange={(exercises) => setAmrapDraft({ exercises })}
          requireTargets
          title="Your circuit"
          description="Complete these movements in order, then begin another round. Every movement needs an editable target."
        />
      </div>
    </main>
  );
}
