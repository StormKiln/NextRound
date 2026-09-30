import { formatTime } from '@nextround/core';
import { useNavigate } from '@tanstack/react-router';
import { Check, Maximize, Pause, Play, RotateCw, Square } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { fullscreen } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import { returnToSetup } from './navigation';

export function Runner() {
  const { snapshot: s, control, busy, error } = useWorkout();
  const navigate = useNavigate();
  const [stop, setStop] = useState(false);
  useEffect(() => {
    if (!s || s.phase === 'cancelled') void navigate({ to: '/emom' });
    else if (s.phase === 'completed') void navigate({ to: '/complete' });
  }, [s?.phase, navigate, s]);
  if (!s) return null;
  const lead = s.phase === 'leadIn';
  const current = s.config.exercises[s.exerciseIndex];
  const next = s.config.exercises[(s.exerciseIndex + 1) % s.config.exercises.length];
  const warning = !s.paused && s.roundRemainingMs <= s.config.warningSeconds * 1000;
  const fraction = lead
    ? s.roundRemainingMs / Math.max(1, s.config.leadInSeconds * 1000)
    : s.roundRemainingMs / 60000;
  return (
    <main className={`runner ${warning ? 'warning' : ''} ${s.paused ? 'paused' : ''}`}>
      <div className="runner-top">
        <span className="mode-pill">EMOM</span>
        <span>
          {lead ? 'Before you begin' : `Round ${s.roundIndex + 1} of ${s.config.minutes}`}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Enter full screen"
          onClick={() => void fullscreen(true)}
        >
          <Maximize size={19} />
        </Button>
      </div>
      <div className="runner-content">
        <section className="timer-face" aria-label="Current round">
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
            <p>{s.paused ? 'Paused' : lead ? 'Starting in' : 'This round'}</p>
            <div className="timer-digits" data-testid="round-clock" aria-live="off">
              {formatTime(s.roundRemainingMs)}
            </div>
            <span>
              {s.paused
                ? 'Take a breath. Resume when ready.'
                : lead
                  ? 'Find your position'
                  : 'Move. Recover. Go again.'}
            </span>
          </div>
        </section>
        <section className="movement">
          <p className="eyebrow">{lead ? 'Up first' : 'Your movement'}</p>
          <h1>{lead ? 'Get ready' : current.name}</h1>
          {lead && <h2>{current.name}</h2>}
          <p className="movement-description">{current.description}</p>
          <div className="total">
            <span>Workout remaining</span>
            <strong data-testid="total-clock" aria-live="off">
              {formatTime(s.remainingMs)}
            </strong>
          </div>
          <div className="up-next">
            <span>
              {s.roundIndex === s.config.minutes - 1 && !lead ? 'Last round' : 'Next movement'}
            </span>
            <strong>
              {s.roundIndex === s.config.minutes - 1 && !lead
                ? 'Finish strong.'
                : lead
                  ? current.name
                  : next.name}
            </strong>
          </div>
        </section>
      </div>
      {(s.notice || error) && (
        <p role="alert" className="runner-notice">
          {s.notice || error}
        </p>
      )}
      <div aria-live="polite" className="sr-only">
        {s.paused
          ? 'Workout paused'
          : lead
            ? 'Get ready'
            : `Round ${s.roundIndex + 1}. ${current.name}`}
      </div>
      <div className="runner-controls">
        <Button
          variant="secondary"
          disabled={busy}
          aria-label={s.paused ? 'Resume workout' : 'Pause workout'}
          onClick={() => void control(s.paused ? 'resume' : 'pause')}
        >
          {s.paused ? <Play size={19} /> : <Pause size={19} />} {s.paused ? 'Resume' : 'Pause'}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          aria-label="Stop workout"
          onClick={() => setStop(true)}
        >
          <Square size={16} />
          Stop
        </Button>
        <span>Escape exits full screen. Your workout keeps running.</span>
      </div>
      {stop && (
        <Dialog title="End this workout?" onClose={() => setStop(false)}>
          <p>Your workout will stop. Your exercise setup will be kept so you can start again.</p>
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setStop(false)}>
              Keep going
            </Button>
            <Button
              variant="destructive"
              onClick={async () => {
                await control('stop');
                setStop(false);
              }}
            >
              End workout
            </Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
export function Completion() {
  const { snapshot: s, start, busy, error } = useWorkout();
  const navigate = useNavigate();
  if (!s)
    return (
      <main className="complete">
        <h1>No completed workout yet</h1>
        <Button onClick={() => void navigate({ to: '/emom' })}>Set up a workout</Button>
      </main>
    );
  return (
    <main className="complete">
      <span className="complete-mark">
        <Check size={44} />
      </span>
      <p className="eyebrow">Every round earned</p>
      <h1>Workout complete</h1>
      <p>You showed up. You put in the work.</p>
      <div className="complete-stats">
        <div>
          <strong>{s.config.minutes}</strong>
          <span>rounds completed</span>
        </div>
        <div>
          <strong>{formatTime(s.elapsedMs)}</strong>
          <span>active workout time</span>
        </div>
      </div>
      {(s.notice || error) && <p role="alert">{s.notice || error}</p>}
      <div className="complete-actions">
        <Button
          variant="ghost"
          onClick={async () => {
            await fullscreen(false);
            void navigate({ to: '/' });
          }}
        >
          Home
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            if (await start(true)) void navigate({ to: '/workout' });
          }}
        >
          <RotateCw size={18} />
          Repeat workout
        </Button>
        <Button
          variant="secondary"
          onClick={async () => {
            await returnToSetup(
              () => fullscreen(false),
              () => {
                void navigate({ to: '/emom' });
              },
              (error) => useWorkout.setState({ error }),
            );
          }}
        >
          Back to setup
        </Button>
      </div>
    </main>
  );
}
