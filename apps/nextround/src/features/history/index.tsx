import { formatAmrapProgress, formatElapsed, formatTarget, formatTime } from '@nextround/core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { fullscreen } from '@/native/adapter';
import { useWorkout } from '@/state/workout';
import {
  copyResult,
  historyKey,
  mutateHistory,
  readHistory,
  type WorkoutResult,
} from './repository';
import '../templates/templates.css';
import './history.css';

const modeName = (result: WorkoutResult) =>
  result.config.type === 'forTime'
    ? 'For Time'
    : result.config.type === 'amrap'
      ? 'AMRAP'
      : result.config.type === 'countdown'
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
  const repeatLock = useRef(false);
  const mounted = useRef(true);
  const [repeating, setRepeating] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
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
        {results.map((result, index) => (
          <li key={result.id}>
            <div className="template-summary">
              <h2>{modeName(result)}</h2>
              <p>
                <time dateTime={new Date(result.completedAt).toISOString()}>
                  {new Date(result.completedAt).toLocaleString()}
                </time>
              </p>
              <p>
                {result.config.type === 'forTime'
                  ? formatElapsed(result.elapsedMs)
                  : formatTime(result.elapsedMs)}{' '}
                active time · {result.config.exercises?.length ?? 0} exercises
                {result.outcome &&
                  ` · ${result.outcome === 'finished' ? 'Finished' : 'Time cap reached'}`}
              </p>
            </div>
            <div className="template-actions">
              <Button
                variant="secondary"
                aria-label={`View result: ${modeName(result)}, ${new Date(result.completedAt).toLocaleString()}, session ${index + 1}`}
                onClick={() => {
                  setError(null);
                  setDetail(result);
                }}
              >
                View result
              </Button>
              <Button
                variant="ghost"
                aria-label={`Delete result: ${modeName(result)}, ${new Date(result.completedAt).toLocaleString()}, session ${index + 1}`}
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
          onClose={() => {
            if (!repeatLock.current) setDetail(null);
          }}
          className="history-detail"
        >
          <p>
            {new Date(detail.completedAt).toLocaleString()} ·{' '}
            {detail.config.type === 'forTime'
              ? formatElapsed(detail.elapsedMs)
              : formatTime(detail.elapsedMs)}{' '}
            active workout time
          </p>
          <p>
            {detail.config.type === 'forTime'
              ? `${detail.outcome === 'finished' ? 'Finished' : 'Time cap reached'} · ${detail.config.timeCapSeconds ? `${formatTime(detail.config.timeCapSeconds * 1000)} cap` : 'No time cap'}`
              : detail.config.type === 'amrap' && detail.amrapProgress
                ? formatAmrapProgress(detail.config, detail.amrapProgress)
                : detail.config.type === 'intervals'
                  ? `${detail.config.rounds} rounds · ${detail.config.workSeconds}s work / ${detail.config.restSeconds}s rest`
                  : detail.config.type !== 'countdown' && detail.config.type !== 'amrap'
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
                {(detail.config.type === 'countdown' || detail.config.type === 'forTime') &&
                  detail.config.showChecklist !== false && (
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
            <Button variant="ghost" disabled={repeating} onClick={() => setDetail(null)}>
              Close
            </Button>
            <Button
              disabled={repeating}
              onClick={async () => {
                if (repeatLock.current) return;
                repeatLock.current = true;
                setRepeating(true);
                setError(null);
                try {
                  const latest = (await readHistory()).results.find(
                    (result) => result.id === detail.id,
                  );
                  if (!mounted.current) return;
                  if (!latest)
                    throw new Error('This result no longer exists. Refresh and try again.');
                  const copy = copyResult(latest);
                  if (!useWorkout.getState().loadConfig(copy.config))
                    throw new Error('Finish your workout and save or discard its result first.');
                  await fullscreen(false);
                  if (!mounted.current) return;
                  void navigate({
                    to:
                      copy.config.type === 'forTime'
                        ? '/for-time'
                        : copy.config.type === 'amrap'
                          ? '/amrap'
                          : copy.config.type === 'intervals'
                            ? '/intervals'
                            : copy.config.type === 'countdown'
                              ? '/countdown'
                              : '/emom',
                  });
                } catch (e) {
                  if (mounted.current) setError(String(e));
                } finally {
                  repeatLock.current = false;
                  if (mounted.current) setRepeating(false);
                }
              }}
            >
              {repeating ? 'Loading workout…' : 'Repeat from setup'}
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
