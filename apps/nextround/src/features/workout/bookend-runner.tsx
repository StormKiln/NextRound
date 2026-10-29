import { formatTarget, formatTime } from '@nextround/core';
import { useNavigate } from '@tanstack/react-router';
import { Pause, Play, SkipForward } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { phaseLabels } from '@/data/phases';
import { BOOKEND_HOLD_SECONDS } from '@/state/bookends';
import { useWorkout, workoutError } from '@/state/workout';
import { NowPlaying } from './now-playing';
import { Runner } from './runner';

// The /workout route shows the warm-up or cool-down while one runs, otherwise the workout itself.
export function WorkoutRoute() {
  const stage = useWorkout((state) => state.run?.stage);
  return stage === 'warmup' || stage === 'cooldown' ? <BookendRunner /> : <Runner />;
}

export function BookendRunner() {
  const { run, busy, controlBookend } = useWorkout();
  const error = useWorkout(workoutError);
  const navigate = useNavigate();
  const stage = run?.stage;
  useEffect(() => {
    if (stage === 'done') void navigate({ to: '/complete' });
  }, [stage, navigate]);
  if (!run || (stage !== 'warmup' && stage !== 'cooldown')) return null;
  const label = phaseLabels[stage];
  const s = run.snapshot;
  if (!s)
    return (
      <main className="runner">
        <p role="status">Starting your {label.toLowerCase()}…</p>
        {error && <p role="alert">{error}</p>}
      </main>
    );
  const lead = s.phase === 'leadIn';
  const plan = run.plan[stage];
  const movements = plan?.exercises ?? [];
  const current = movements[s.exerciseIndex % Math.max(1, movements.length)];
  const next = movements[(s.exerciseIndex + 1) % Math.max(1, movements.length)];
  const last = s.roundIndex === (plan?.minutes ?? 1) - 1;
  const position = 60000 - s.roundRemainingMs;
  const changing = !lead && position >= BOOKEND_HOLD_SECONDS * 1000;
  const fraction = lead
    ? s.roundRemainingMs / Math.max(1, s.config.leadInSeconds * 1000)
    : s.roundRemainingMs / 60000;
  const after = stage === 'warmup' ? 'Your workout starts next.' : 'Then review your result.';
  return (
    <main className={`runner ${s.paused ? 'paused' : ''}`}>
      <div className="runner-top">
        <span className="mode-pill">{label}</span>
        <span>{lead ? 'Before you begin' : `Minute ${s.roundIndex + 1} of ${plan?.minutes}`}</span>
      </div>
      <div className="runner-content">
        <section className="timer-face" aria-label={`${label} minute`}>
          <svg viewBox="0 0 400 400" aria-hidden="true">
            <circle className="track" cx="200" cy="200" r="184" />
            <circle
              className="progress"
              cx="200"
              cy="200"
              r="184"
              strokeDasharray={1156}
              strokeDashoffset={1156 * (1 - fraction)}
            />
          </svg>
          <div className="timer-center">
            <p>{s.paused ? 'Paused' : lead ? 'Starting in' : 'This minute'}</p>
            <div className="timer-digits" data-testid="bookend-clock" aria-live="off">
              {formatTime(s.roundRemainingMs)}
            </div>
            <span>
              {s.paused
                ? 'Take a breath. Resume when ready.'
                : changing
                  ? 'Change position'
                  : `Hold for ${BOOKEND_HOLD_SECONDS} seconds`}
            </span>
          </div>
        </section>
        <section className="movement">
          <p className="eyebrow">{lead ? 'Up first' : label}</p>
          <h1>
            {lead
              ? 'Get ready'
              : changing
                ? `Next: ${last ? 'finish' : next?.name}`
                : current?.name}
          </h1>
          {lead && <h2>{current?.name}</h2>}
          <p className="movement-description">{current?.description}</p>
          {!changing && current?.target && <h2>{formatTarget(current.target)}</h2>}
          <div className="total">
            <span>{label} remaining</span>
            <strong data-testid="bookend-total" aria-live="off">
              {formatTime(s.remainingMs)}
            </strong>
          </div>
          <div className="up-next">
            <span>{last && !lead ? `Last minute. ${after}` : 'Next movement'}</span>
            <strong>{last && !lead ? 'Ease into it.' : lead ? current?.name : next?.name}</strong>
          </div>
        </section>
      </div>
      <NowPlaying />
      {(s.notice || error) && (
        <p role="alert" className="runner-notice">
          {[s.notice, error].filter(Boolean).join(' ')}
        </p>
      )}
      <div aria-live="polite" className="sr-only">
        {s.paused ? `${label} paused` : lead ? 'Get ready' : `${label}. ${current?.name}`}
      </div>
      <div className="runner-controls">
        <Button
          variant="secondary"
          disabled={busy}
          aria-label={s.paused ? `Resume ${label.toLowerCase()}` : `Pause ${label.toLowerCase()}`}
          onClick={() => void controlBookend(s.paused ? 'resume' : 'pause')}
        >
          {s.paused ? <Play size={19} /> : <Pause size={19} />} {s.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button variant="ghost" disabled={busy} onClick={() => void controlBookend('stop')}>
          <SkipForward size={16} />
          {stage === 'warmup' ? 'Skip warm-up' : 'End cool-down'}
        </Button>
        <span>{after}</span>
      </div>
    </main>
  );
}
