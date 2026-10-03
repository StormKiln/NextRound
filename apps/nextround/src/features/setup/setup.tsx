import { useNavigate } from '@tanstack/react-router';
import { Clock3, Play, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SaveWorkoutButton } from '@/features/templates';
import { useWorkout } from '@/state/workout';
import { ExerciseEditor } from './exercise-editor';

export function Setup() {
  const { draft, setDraft, errors, busy, start, error } = useWorkout();
  const navigate = useNavigate();
  const minutes = Number(draft.minutes);
  const validDuration = Number.isInteger(minutes) && minutes > 0 && minutes <= 1440;
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Every minute on the minute</p>
          <h1>Make this round count.</h1>
          <p className="subtitle">Choose your movements. Set the clock. Get to work.</p>
        </div>
        <span className="mode-pill">
          <Clock3 size={17} /> EMOM
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="timing-heading">
          <h2 id="timing-heading">Set your pace</h2>
          <p className="muted">
            A new exercise starts every 60 seconds. Finish your reps, then recover until the next
            beep.
          </p>
          <div className="duration-input">
            <label htmlFor="minutes">Total minutes</label>
            <Input
              id="minutes"
              type="number"
              min="1"
              max="1440"
              step="1"
              value={draft.minutes}
              onChange={(e) => setDraft({ minutes: e.target.value })}
              aria-invalid={!!errors.minutes}
              aria-describedby={errors.minutes ? 'minutes-error' : undefined}
            />
            <span>one round per minute</span>
          </div>
          {errors.minutes && (
            <p id="minutes-error" className="error" role="alert">
              {errors.minutes}
            </p>
          )}
          <div className="timing-fields">
            <div>
              <label htmlFor="lead">Lead-in seconds</label>
              <Input
                id="lead"
                type="number"
                min="0"
                max="3600"
                step="1"
                value={draft.leadInSeconds}
                onChange={(e) => setDraft({ leadInSeconds: e.target.value })}
                aria-invalid={!!errors.leadInSeconds}
              />
              <p className="hint">Time to get into position</p>
              {errors.leadInSeconds && (
                <p className="error" role="alert">
                  {errors.leadInSeconds}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="warning">Warning seconds</label>
              <Input
                id="warning"
                type="number"
                min="0"
                max="59"
                step="1"
                value={draft.warningSeconds}
                onChange={(e) => setDraft({ warningSeconds: e.target.value })}
                aria-invalid={!!errors.warningSeconds}
              />
              <p className="hint">A tock each second, then a beep</p>
              {errors.warningSeconds && (
                <p className="error" role="alert">
                  {errors.warningSeconds}
                </p>
              )}
            </div>
          </div>
          <div className="clock-note">
            <RotateCw size={18} />
            <p>
              {validDuration ? `${minutes} rounds` : 'Set a duration'}
              {draft.exercises.length
                ? `, cycling through ${draft.exercises.length} movements in order.`
                : '. Add a movement to begin.'}
              <span>Your lead-in is extra; it does not use workout time.</span>
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (await start()) void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start workout'}
          </Button>
          <SaveWorkoutButton getConfig={() => useWorkout.getState().getDraftConfig('emom')} />
        </section>
        <div>
          <ExerciseEditor
            emomDefaults
            exercises={draft.exercises}
            onChange={(exercises) => setDraft({ exercises })}
            rounds={validDuration ? minutes : undefined}
          />
          {errors.exercises && (
            <p className="error" role="alert">
              {errors.exercises}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
