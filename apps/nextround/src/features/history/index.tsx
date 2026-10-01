import { formatTarget, formatTime } from '@nextround/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { fullscreen } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import { copyResult, mutateHistory, readHistory, type WorkoutResult } from './repository';
import '../templates/templates.css';
import './history.css';
export const historyKey = ['workout-history'];
const modeName = (result: WorkoutResult) =>
  result.config.type === 'countdown'
    ? 'Countdown'
    : result.config.type === 'intervals'
      ? 'Intervals'
      : 'EMOM';
export function History() {
  const query = useQuery({ queryKey: historyKey, queryFn: readHistory, retry: false });
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: mutateHistory,
    onSuccess: () => client.invalidateQueries({ queryKey: historyKey }),
  });
  const navigate = useNavigate();
  const [detail, setDetail] = useState<WorkoutResult | null>(null);
  const [deleting, setDeleting] = useState<WorkoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const results = [...(query.data?.results ?? [])].sort((a, b) => b.completedAt - a.completedAt);
  return (
    <main className="page history-page">
      <p className="eyebrow">Your training, remembered</p>
      <h1>Workout history</h1>
      <p>Completed sessions you chose to save. Stored on this Mac.</p>
      {query.isPending && <p role="status">Loading workout history…</p>}
      {query.isError && (
        <div role="alert">
          <p>{String(query.error)}</p>
          <Button onClick={() => void query.refetch()}>Retry history</Button>
        </div>
      )}
      {!query.isPending && !query.isError && results.length === 0 && (
        <section className="history-empty">
          <h2>No saved results yet.</h2>
          <p>Finish a workout and choose Save result to start your training log.</p>
          <Button onClick={() => void navigate({ to: '/' })}>Choose a workout</Button>
        </section>
      )}
      <ul className="template-list history-list">
        {results.map((result) => (
          <li key={result.id}>
            <div className="template-summary">
              <h2>{modeName(result)}</h2>
              <p>
                <time dateTime={new Date(result.completedAt).toISOString()}>
                  {new Date(result.completedAt).toLocaleString()}
                </time>
              </p>
              <p>
                {formatTime(result.elapsedMs)} active time · {result.config.exercises?.length ?? 0}{' '}
                exercises
              </p>
            </div>
            <div className="template-actions">
              <Button
                variant="secondary"
                onClick={() => {
                  setError(null);
                  setDetail(result);
                }}
              >
                View result
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setError(null);
                  setDeleting(result);
                }}
              >
                Delete result
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {detail && (
        <Dialog
          title={`${modeName(detail)} result`}
          onClose={() => setDetail(null)}
          className="history-detail"
        >
          <p>
            {new Date(detail.completedAt).toLocaleString()} · {formatTime(detail.elapsedMs)} active
            workout time
          </p>
          <p>
            {detail.config.type === 'intervals'
              ? `${detail.config.rounds} rounds · ${detail.config.workSeconds}s work / ${detail.config.restSeconds}s rest`
              : detail.config.type !== 'countdown'
                ? `${detail.config.minutes} one-minute rounds`
                : `${detail.config.durationSeconds}s countdown`}
          </p>
          <p>
            Lead-in: {detail.config.leadInSeconds}s · Warning: {detail.config.warningSeconds}s
          </p>
          <p className="muted">
            Targets are your planned work, not measured results. Checkmarks record what you ticked
            off.
          </p>
          <ol className="history-exercises">
            {detail.config.exercises?.map((exercise) => (
              <li key={exercise.id}>
                <strong>{exercise.name}</strong>
                {exercise.target && <span> · Target: {formatTarget(exercise.target)}</span>}
                {exercise.description && <p>{exercise.description}</p>}
                {detail.config.type === 'countdown' && detail.config.showChecklist !== false && (
                  <p>
                    {detail.checkedExerciseIds.includes(exercise.id)
                      ? 'Checked off'
                      : 'Not checked off'}
                  </p>
                )}
              </li>
            ))}
          </ol>
          {!detail.config.exercises?.length && <p>No exercises were specified.</p>}
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              onClick={async () => {
                setError(null);
                try {
                  const latest = (await readHistory()).results.find(
                    (result) => result.id === detail.id,
                  );
                  if (!latest)
                    throw new Error('This result no longer exists. Refresh and try again.');
                  const copy = copyResult(latest);
                  if (!useWorkout.getState().loadConfig(copy.config))
                    throw new Error('Finish your workout and save or discard its result first.');
                  await fullscreen(false);
                  void navigate({
                    to:
                      copy.config.type === 'intervals'
                        ? '/intervals'
                        : copy.config.type === 'countdown'
                          ? '/countdown'
                          : '/emom',
                  });
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              Repeat from setup
            </Button>
          </div>
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete this result?"
          onClose={() => {
            if (!mutation.isPending) setDeleting(null);
          }}
        >
          <p>
            This removes the saved {modeName(deleting)} session from{' '}
            {new Date(deleting.completedAt).toLocaleString()}. Your saved workout templates are
            kept.
          </p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={mutation.isPending} onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.isPending}
              onClick={async () => {
                setError(null);
                try {
                  await mutation.mutateAsync({ action: 'delete', id: deleting.id });
                  setDeleting(null);
                } catch (e) {
                  setError(String(e));
                }
              }}
            >
              {mutation.isPending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </div>
        </Dialog>
      )}
    </main>
  );
}
export function ResultActions() {
  const { pendingResult, resultStatus, saveResult, discardResult, busy, error } = useWorkout();
  const [discard, setDiscard] = useState(false);
  const client = useQueryClient();
  const navigate = useNavigate();
  return (
    <section className="result-actions" aria-label="Save workout result">
      {pendingResult && (
        <>
          <p>Keep this session in your local workout history?</p>
          <div className="template-actions">
            <Button
              disabled={busy}
              onClick={async () => {
                if (await saveResult()) await client.invalidateQueries({ queryKey: historyKey });
              }}
            >
              {busy ? 'Saving…' : 'Save result'}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setDiscard(true)}>
              Discard result
            </Button>
          </div>
        </>
      )}
      {resultStatus === 'saved' && (
        <>
          <p role="status">Result saved to history.</p>
          <Button
            variant="secondary"
            onClick={async () => {
              await fullscreen(false);
              void navigate({ to: '/history' });
            }}
          >
            View history
          </Button>
        </>
      )}
      {resultStatus === 'discarded' && <p role="status">Result discarded.</p>}
      {discard && (
        <Dialog
          title="Discard this result?"
          onClose={() => {
            if (!busy) setDiscard(false);
          }}
        >
          <p>This completed session will not be added to history.</p>
          {error && <p role="alert">{error}</p>}
          <div className="dialog-actions">
            <Button variant="ghost" disabled={busy} onClick={() => setDiscard(false)}>
              Keep result
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (await discardResult()) setDiscard(false);
              }}
            >
              Discard result
            </Button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
