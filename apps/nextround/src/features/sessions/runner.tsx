import { formatElapsed, formatTime } from '@nextround/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { Runner } from '@/features/workout/runner';
import { useWorkout } from '@/state/workout';
import { sessionSeconds, sessionTimeLabel } from './model';
import { ActualSummary, PerformanceEditor } from './performance-editor';
import { overallRemaining } from './progress';
import { trainingKey } from './repository';
import { useTraining } from './state';
import './session.css';
export function TrainingRunner() {
  const [editingActuals, setEditingActuals] = useState<string | null>(null);
  const state = useTraining();
  const { run, paused, busy, error, recovered } = state;
  const navigate = useNavigate();
  const client = useQueryClient();
  const [confirm, setConfirm] = useState<'stop' | 'skip' | 'discard' | null>(null);
  const [resumeAfter, setResumeAfter] = useState(false);
  if (!run)
    return (
      <main className="page">
        <h1>No session running</h1>
        <Button onClick={() => void navigate({ to: '/' })}>Home</Button>
      </main>
    );
  const block = run.session.blocks[run.index];
  const review = run.stage === 'review';
  const elapsed =
    run.blocks.reduce((n, b) => n + b.elapsedMs, 0) +
    (run.blocks.some((b) => b.blockId === run.current.blockId) ? 0 : run.current.elapsedMs);
  const scheduled = sessionSeconds(run.session);
  const remaining = overallRemaining(run);
  async function ask(action: 'stop' | 'skip' | 'discard') {
    setResumeAfter(!paused && !recovered);
    if (!paused && !recovered) await state.pause(true);
    if (!useTraining.getState().error) setConfirm(action);
  }
  async function cancel() {
    setConfirm(null);
    if (resumeAfter) await state.pause(false);
  }
  return (
    <main className="training-run">
      <header className="training-banner">
        <div>
          <h1>{run.session.name}</h1>
          <p>
            Block {run.index + 1} of {run.session.blocks.length}
          </p>
        </div>
        <strong>{block.name}</strong>
        <p>
          {sessionTimeLabel(run.session)}
          <br />
          Workout time: {formatElapsed(elapsed)}
          {scheduled !== null && ' · block clocks include their own lead-ins'}
          {remaining !== null && (
            <>
              <br />
              Session remaining
              {run.session.blocks.some(
                (b) => b.config.type === 'forTime' || b.config.type === 'ladder',
              )
                ? ' (maximum)'
                : ''}
              : <strong data-testid="session-clock">{formatTime(remaining)}</strong>
            </>
          )}
        </p>
      </header>
      {error && (
        <p className="page error" role="alert">
          {error}
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void (recovered ? state.resumeRecovery() : state.pause(true))}
          >
            Retry saving checkpoint
          </Button>
        </p>
      )}
      {recovered ? (
        <section className="training-wait">
          <h2>Interrupted session</h2>
          <p>Resume paused at your last saved position. Time away is not counted.</p>
          <Button disabled={busy} onClick={() => void state.resumeRecovery()}>
            Recover session paused
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void state.end()}>
            Review partial session
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setConfirm('discard')}>
            Discard interrupted session
          </Button>
        </section>
      ) : review ? (
        <section className="page session-results">
          <h1>
            {run.blocks.every((b) => b.status === 'complete')
              ? 'Session complete'
              : 'Session review'}
          </h1>
          <p>
            Save this session once, with each block’s result. Targets are planned work; actuals are
            optional.
          </p>
          {run.blocks.map((result) => {
            const b = run.session.blocks.find((b) => b.id === result.blockId)!;
            return (
              <article className="session-result-block" key={result.blockId}>
                <h2>{b.name}</h2>
                <p>
                  {result.status} · {formatElapsed(result.elapsedMs)} workout time
                </p>
                <p>{b.config.exercises?.map((e) => e.name).join(', ') || 'No exercise list'}</p>
                <ActualSummary config={b.config} values={result.actuals} />
                {!!b.config.exercises?.length && (
                  <Button variant="secondary" onClick={() => setEditingActuals(b.id)}>
                    Record actuals for {b.name}
                  </Button>
                )}
              </article>
            );
          })}
        </section>
      ) : run.stage === 'work' ? (
        <Runner embedded />
      ) : (
        <section className="training-wait">
          <h2>{run.stage === 'rest' ? 'Recovery between blocks' : 'Ready for the next block?'}</h2>
          {run.stage === 'rest' && (
            <div className="timer-digits" aria-live="off">
              {formatTime(run.restRemainingMs)}
            </div>
          )}
          <p>Up next: {run.session.blocks[run.index + 1]?.name}</p>
          {run.stage === 'ready' && (
            <Button disabled={busy} onClick={() => void state.next()}>
              Ready — start next block
            </Button>
          )}
        </section>
      )}
      {!recovered && (
        <footer className="session-footer">
          <div className="dialog-actions">
            {review ? (
              <>
                <Button variant="ghost" disabled={busy} onClick={() => setConfirm('discard')}>
                  Discard session result
                </Button>
                <Button
                  disabled={busy}
                  onClick={async () => {
                    if (await state.save()) {
                      await client.invalidateQueries({ queryKey: trainingKey });
                      void navigate({ to: '/' });
                    }
                  }}
                >
                  Save session result
                </Button>
              </>
            ) : (
              <>
                {run.stage === 'work' &&
                  (block.config.type === 'forTime' || block.config.type === 'ladder') && (
                    <Button
                      disabled={busy}
                      onClick={() => void useWorkout.getState().requestFinish()}
                    >
                      Finish block
                    </Button>
                  )}
                {run.stage !== 'ready' && (
                  <Button
                    disabled={busy}
                    variant="secondary"
                    onClick={() => void state.pause(!paused)}
                  >
                    {paused ? 'Resume session' : 'Pause session'}
                  </Button>
                )}
                <Button disabled={busy} variant="ghost" onClick={() => void ask('skip')}>
                  {run.stage === 'work' ? 'Skip block' : 'Skip recovery'}
                </Button>
                <Button disabled={busy} variant="ghost" onClick={() => void ask('stop')}>
                  Stop session
                </Button>
              </>
            )}
          </div>
        </footer>
      )}
      {editingActuals && (
        <PerformanceEditor
          config={run.session.blocks.find((b) => b.id === editingActuals)!.config}
          values={
            run.blocks.find((b) => b.blockId === editingActuals)?.actuals ?? run.current.actuals
          }
          onSave={async (values) => {
            await state.setActuals(editingActuals, values);
            if (useTraining.getState().error) throw new Error(useTraining.getState().error!);
          }}
          onClose={() => setEditingActuals(null)}
        />
      )}
      {confirm && (
        <Dialog
          title={
            confirm === 'discard'
              ? 'Discard this session?'
              : confirm === 'skip'
                ? 'Skip this block?'
                : 'End this session?'
          }
          onClose={() => void cancel()}
        >
          <p>
            {confirm === 'discard'
              ? 'This unsaved session result will be removed.'
              : 'Your session is paused. Completed work can be reviewed and saved; unfinished blocks stay marked partial or skipped.'}
          </p>
          <div className="dialog-actions">
            <Button variant="secondary" disabled={busy} onClick={() => void cancel()}>
              Keep session
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                setConfirm(null);
                if (confirm === 'discard') {
                  if (await state.discard()) void navigate({ to: '/' });
                } else await state.end(confirm === 'skip');
              }}
            >
              {confirm === 'discard'
                ? 'Discard session'
                : confirm === 'skip'
                  ? 'Skip and continue'
                  : 'End and review'}
            </Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
