import { useNavigate } from '@tanstack/react-router';
import { Clock3, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkout } from '@/state/workout';

export function CountdownSetup() {
  const { countdownDraft: draft, setCountdownDraft, start, busy, errors, error } = useWorkout();
  const navigate = useNavigate();
  return (
    <main className="setup page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">One uninterrupted timer</p>
          <h1>Make time for yourself.</h1>
          <p className="subtitle">Set a duration. Move at your own pace.</p>
        </div>
        <span className="mode-pill">
          <Clock3 size={17} /> Countdown
        </span>
      </div>
      <div className="workbench">
        <section className="configuration" aria-labelledby="countdown-heading">
          <h2 id="countdown-heading">Set your time</h2>
          <p className="muted">A single countdown from start to finish, up to 24 hours.</p>
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
                <label htmlFor={`countdown-${key}`}>{label}</label>
                <Input
                  id={`countdown-${key}`}
                  type="number"
                  min="0"
                  max={max}
                  step="1"
                  value={draft[key]}
                  onChange={(event) => setCountdownDraft({ [key]: event.target.value })}
                  aria-invalid={
                    !!errors[key] ||
                    ((key === 'minutes' || key === 'seconds') && !!errors.durationSeconds)
                  }
                />
              </div>
            ))}
          </div>
          {Object.entries(errors).map(([key, message]) => (
            <p className="error" role="alert" key={key}>
              {message}
            </p>
          ))}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button
            className="start-button"
            disabled={busy}
            onClick={async () => {
              if (await start(false, 'countdown')) void navigate({ to: '/workout' });
            }}
          >
            <Play size={19} fill="currentColor" />
            {busy ? 'Starting…' : 'Start countdown'}
          </Button>
        </section>
        <section className="sequence">
          <h2>A little space to focus.</h2>
          <p className="muted">
            Use your time for a hold, a stretch, a recovery, or a workout of your own.
          </p>
          <div className="clock-note">
            <Clock3 size={18} />
            <p>
              Your lead-in is extra.
              <span>
                One beep starts your workout. Tocks count down the final warning seconds, and a
                distinct sound marks the finish. Set warnings to zero for no tocks.
              </span>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
