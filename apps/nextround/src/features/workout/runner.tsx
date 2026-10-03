import { formatTarget, formatTime } from '@nextround/core';
import { useNavigate } from '@tanstack/react-router';
import { Check, Maximize, Pause, Play, RotateCw, Square } from 'lucide-react';
import { useEffect } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { AmrapProgressPanel } from '@/features/amrap/progress';
import { ResultActions } from '@/features/history';
import { fullscreen } from '@/native/adapter';
import { useWorkout, workoutError } from '@/state/workout';
import '../countdown/checklist.css';
import { returnToSetup } from './navigation';

export function Runner() {
  const { snapshot: s, control, busy, checkedExerciseIds, toggleChecked } = useWorkout();
  const error = useWorkout(workoutError);
  const navigate = useNavigate();
  const { stopConfirmation: stop, requestStop, cancelStop } = useWorkout();
  useEffect(() => {
    if (!s || s.phase === 'cancelled')
      void navigate({
        to:
          s?.config.type === 'amrap'
            ? '/amrap'
            : s?.config.type === 'intervals'
              ? '/intervals'
              : s?.config.type === 'countdown'
                ? '/countdown'
                : '/emom',
      });
    else if (s.phase === 'completed') void navigate({ to: '/complete' });
  }, [s?.phase, navigate, s]);
  if (!s) return null;
  const lead = s.phase === 'leadIn';
  const amrap = s.config.type === 'amrap';
  const countdown = s.config.type === 'countdown';
  const emom = s.config.type !== 'countdown' && s.config.type !== 'amrap' ? s.config : null;
  const intervals = s.config.type === 'intervals';
  const resting = intervals && s.intervalPhase === 'rest' && !lead;
  const rounds = emom ? (emom.type === 'intervals' ? emom.rounds : emom.minutes) : 0;
  const current = emom?.exercises[s.exerciseIndex];
  const next = emom?.exercises[(s.exerciseIndex + 1) % emom.exercises.length];
  const upcomingTarget = lead
    ? current?.target
    : emom && s.roundIndex < rounds - 1
      ? next?.target
      : undefined;
  const warning = !s.paused && s.roundRemainingMs <= s.config.warningSeconds * 1000;
  const fraction = lead
    ? s.roundRemainingMs / Math.max(1, s.config.leadInSeconds * 1000)
    : s.roundRemainingMs /
      (s.config.type === 'countdown' || s.config.type === 'amrap'
        ? s.config.durationSeconds * 1000
        : s.config.type === 'intervals'
          ? (resting ? s.config.restSeconds : s.config.workSeconds) * 1000
          : 60000);
  return (
    <main
      className={`runner ${amrap ? 'amrap-runner' : ''} ${warning ? 'warning' : ''} ${s.paused ? 'paused' : ''}`}
    >
      <div className="runner-top">
        <span className="mode-pill">
          {amrap ? 'AMRAP' : countdown ? 'Countdown' : intervals ? 'Intervals' : 'EMOM'}
        </span>
        <span>
          {lead
            ? 'Before you begin'
            : countdown || amrap
              ? 'Time for your workout'
              : `Round ${s.roundIndex + 1} of ${rounds}`}
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
        <section
          className="timer-face"
          aria-label={countdown || amrap ? 'Countdown timer' : 'Current round'}
        >
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
            {intervals && !lead && (
              <strong className="mode-pill" data-testid="interval-phase">
                {resting ? 'Rest' : 'Work'}
              </strong>
            )}
            <p>
              {s.paused
                ? 'Paused'
                : lead
                  ? 'Starting in'
                  : countdown || amrap
                    ? 'Time remaining'
                    : 'This round'}
            </p>
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
        <section className="movement" aria-label={amrap ? 'Circuit and progress' : undefined}>
          <p className="eyebrow">
            {countdown || amrap
              ? 'Your time. Your pace.'
              : lead
                ? 'Up first'
                : resting
                  ? 'Recovery'
                  : 'Your movement'}
          </p>
          <h1>
            {lead
              ? 'Get ready'
              : amrap
                ? 'Keep your circuit going'
                : countdown
                  ? 'Make time to move'
                  : resting
                    ? 'Take a breath'
                    : current?.name}
          </h1>
          {lead && <h2>{current?.name}</h2>}
          <p className="movement-description">
            {resting
              ? 'Recover now. The next work phase starts at the beep.'
              : current?.description}
          </p>
          {!resting && current?.target && <h2>{formatTarget(current.target)}</h2>}
          <div className="total">
            <span>Workout remaining</span>
            <strong data-testid="total-clock" aria-live="off">
              {formatTime(s.remainingMs)}
            </strong>
          </div>
          {s.config.type === 'countdown' && !!s.config.exercises?.length && (
            <section className="countdown-checklist" aria-label="Workout exercises">
              <h2>Your workout list</h2>
              <ol>
                {s.config.exercises.map((exercise) => (
                  <li key={exercise.id}>
                    {s.config.type === 'countdown' && s.config.showChecklist !== false && (
                      <input
                        type="checkbox"
                        aria-label={`Complete ${exercise.name}`}
                        checked={checkedExerciseIds.includes(exercise.id)}
                        onChange={() => toggleChecked(exercise.id)}
                      />
                    )}
                    <div>
                      <strong>{exercise.name}</strong>
                      {exercise.target && (
                        <span className="checklist-target">{formatTarget(exercise.target)}</span>
                      )}
                      {exercise.description && <p>{exercise.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}
          {amrap && <AmrapProgressPanel />}
          {emom && (
            <div className="up-next">
              <span>{s.roundIndex === rounds - 1 && !lead ? 'Last round' : 'Next movement'}</span>
              <strong>
                {s.roundIndex === rounds - 1 && !lead
                  ? 'Finish strong.'
                  : lead
                    ? current?.name
                    : next?.name}
                {upcomingTarget && ` · ${formatTarget(upcomingTarget)}`}
              </strong>
            </div>
          )}
        </section>
      </div>
      {(s.notice || error) && (
        <p role="alert" className="runner-notice">
          {[s.notice, error].filter(Boolean).join(' ')}
        </p>
      )}
      <div aria-live="polite" className="sr-only">
        {s.paused
          ? 'Workout paused'
          : lead
            ? 'Get ready'
            : countdown || amrap
              ? 'Countdown running'
              : `Round ${s.roundIndex + 1}. ${resting ? 'Rest' : 'Work'}. ${resting ? next?.name : current?.name}`}
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
          onClick={() => void requestStop()}
        >
          <Square size={16} />
          Stop
        </Button>
        <span>Escape exits full screen. Your workout keeps running.</span>
      </div>
      {stop && (
        <Dialog title="End this workout?" onClose={() => void cancelStop()}>
          {error && <p role="alert">{error}</p>}
          <p>
            Your workout is paused. Your workout will stop. Your setup will be kept so you can start
            again.
          </p>
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => void cancelStop()}>
              Keep going
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                await control('stop');
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
  const { snapshot: s, start, busy, pendingResult } = useWorkout();
  const error = useWorkout(workoutError);
  const navigate = useNavigate();
  if (s?.phase !== 'completed')
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
      <p className="eyebrow">
        {s.config.type === 'countdown' ? 'Time well spent' : 'Every round earned'}
      </p>
      <h1>Workout complete</h1>
      <p>You showed up. You put in the work.</p>
      <div className="complete-stats">
        {s.config.type !== 'countdown' && s.config.type !== 'amrap' && (
          <div>
            <strong>{s.config.type === 'intervals' ? s.config.rounds : s.config.minutes}</strong>
            <span>rounds completed</span>
          </div>
        )}
        <div>
          <strong>{formatTime(s.elapsedMs)}</strong>
          <span>active workout time</span>
        </div>
      </div>
      {(s.notice || error) && <p role="alert">{[s.notice, error].filter(Boolean).join(' ')}</p>}
      {s.config.type === 'amrap' && <AmrapProgressPanel />}
      <ResultActions />
      <div className="complete-actions">
        <Button
          variant="ghost"
          onClick={async () => {
            await returnToSetup(
              () => fullscreen(false),
              () => {
                void navigate({ to: '/' });
              },
              (error) => useWorkout.setState({ error }),
            );
          }}
        >
          Home
        </Button>
        <Button
          disabled={busy || !!pendingResult}
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
                void navigate({
                  to:
                    s.config.type === 'amrap'
                      ? '/amrap'
                      : s.config.type === 'intervals'
                        ? '/intervals'
                        : s.config.type === 'countdown'
                          ? '/countdown'
                          : '/emom',
                });
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
