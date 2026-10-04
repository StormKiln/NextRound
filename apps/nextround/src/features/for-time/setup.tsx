import { useNavigate } from '@tanstack/react-router';
import { Clock3, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExerciseEditor } from '@/features/setup/exercise-editor';
import { SetupErrors, useSetupValidation } from '@/features/setup/validation';
import '../countdown/checklist.css';
import { SaveWorkoutButton } from '@/features/templates';
import { useWorkout } from '@/state/workout';

export function ForTimeSetup() {
  const { forTimeDraft: draft, setForTimeDraft, start, busy, error } = useWorkout();
  const navigate = useNavigate();
  const { errors, validate, getConfig } = useSetupValidation('forTime');
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">One list. Your pace.</p>
          <h1>Finish on your terms.</h1>
          <p className="subtitle">
            Work through your list once, then finish to record your elapsed time.
          </p>
        </div>
        <span className="mode-pill">
          <Clock3 size={17} /> For Time
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="for-time-heading">
          <h2 id="for-time-heading">Choose your timer</h2>
          <p className="muted">The clock counts up. Add an optional cap of up to 24 hours.</p>
          <label className="checklist-option">
            <input
              type="checkbox"
              checked={draft.capped}
              onChange={(event) => setForTimeDraft({ capped: event.target.checked })}
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
              .filter(({ key }) => draft.capped || (key !== 'minutes' && key !== 'seconds'))
              .map(({ key, label, max }) => (
                <div key={key}>
                  <label htmlFor={`for-time-${key}`}>{label}</label>
                  <Input
                    id={`for-time-${key}`}
                    type="number"
                    min="0"
                    max={max}
                    step="1"
                    value={draft[key]}
                    onChange={(event) => setForTimeDraft({ [key]: event.target.value })}
                    aria-describedby={
                      errors[key]
                        ? `forTime-error-${key}`
                        : (key === 'minutes' || key === 'seconds') && errors.timeCapSeconds
                          ? 'forTime-error-timeCapSeconds'
                          : undefined
                    }
                    aria-invalid={
                      !!errors[key] ||
                      ((key === 'minutes' || key === 'seconds') && !!errors.timeCapSeconds)
                    }
                  />
                </div>
              ))}
          </div>
          <label className="checklist-option">
            <input
              type="checkbox"
              checked={draft.showChecklist}
              onChange={(event) => setForTimeDraft({ showChecklist: event.target.checked })}
            />
            Show completion checkboxes
          </label>
          <SetupErrors errors={errors} mode="forTime" />
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (validate() && (await start(false, 'forTime'))) void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start For Time'}
          </Button>
          <SaveWorkoutButton getConfig={getConfig} validate={validate} />
        </section>
        <ExerciseEditor
          validationError={errors.exercises}
          exercises={draft.exercises}
          onChange={(exercises) => setForTimeDraft({ exercises })}
          title="Your workout list"
          forTime
          description="Optional movements for one pass. Checking the last item does not finish your workout."
        />
      </div>
    </main>
  );
}
