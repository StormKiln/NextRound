import { countLabel, formatTarget } from '@nextround/core';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { attemptSummary, comparableAttempts, compareAttempts } from './comparisons';
import { historyKey, readHistory } from './repository';

export function ComparisonView({
  resultId,
  onClose,
}: {
  resultId: string;
  onClose: () => Promise<void>;
}) {
  const [returning, setReturning] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);
  const returnLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function close() {
    if (returnLock.current) return;
    returnLock.current = true;
    setReturning(true);
    setReturnError(null);
    try {
      await onClose();
    } catch {
      if (mounted.current)
        setReturnError(
          'The result could not be read. Your history is preserved. Try returning again.',
        );
    } finally {
      returnLock.current = false;
      if (mounted.current) setReturning(false);
    }
  }
  const query = useQuery({
    queryKey: historyKey,
    queryFn: readHistory,
    retry: false,
    refetchOnMount: 'always',
  });
  const selected = query.data?.results.find((r) => r.id === resultId);
  const attempts = selected ? comparableAttempts(query.data?.results ?? [], selected) : [];
  return (
    <Dialog title="Compare attempts" onClose={() => void close()} className="comparison-dialog">
      <div className="comparison-body">
        <p>
          Comparisons include all matching saved attempts, regardless of the date, type or search
          filters on the history list.
        </p>
        <p>
          Matches use the saved movement identities, names, descriptions, order, targets and workout
          rules. Changed prescriptions stay separate. Lead-in and warning settings do not affect
          matching.
        </p>
        {query.isFetching ? (
          <p role="status">Loading attempts…</p>
        ) : query.isError ? (
          !returnError && (
            <div role="alert">
              <p>History could not be read. Existing results are preserved.</p>
              <Button onClick={() => void query.refetch()}>Retry comparisons</Button>
            </div>
          )
        ) : !selected ? (
          <p role="status">
            This result is no longer in history. Close this view and choose another result.
          </p>
        ) : (
          <>
            <h3>{countLabel(attempts.length, 'matching attempt')}</h3>
            {attempts.length === 1 && (
              <p>
                No other matching attempt yet. Repeat this workout and save its result to compare
                next time.
              </p>
            )}
            <details>
              <summary>Matched workout prescription</summary>
              <ol>
                {selected.config.exercises?.map((e) => (
                  <li key={e.id}>
                    {e.name}
                    {e.target && ` · ${formatTarget(e.target)}`}
                    {e.description && <p>{e.description}</p>}
                  </li>
                ))}
              </ol>
              {!selected.config.exercises?.length && (
                <p>
                  No movements were specified; the timer cannot establish how much work was done.
                </p>
              )}
            </details>
            <p className="hint">
              Targets are planned work. Progress and checkmarks are self-reported; they are not
              measured repetitions.
            </p>
            <ol className="comparison-attempts" aria-label="Matching attempts">
              {attempts.map((attempt, index) => {
                const previous = attempts
                  .slice(index + 1)
                  .find((r) => r.completedAt < attempt.completedAt);
                return (
                  <li key={attempt.id} aria-current={attempt.id === resultId ? 'true' : undefined}>
                    <h3>
                      <time dateTime={new Date(attempt.completedAt).toISOString()}>
                        {new Date(attempt.completedAt).toLocaleString()}
                      </time>
                      {attempt.id === resultId && ' · Selected attempt'}
                    </h3>
                    <p>{attemptSummary(attempt)}</p>
                    {(attempt.config.type === 'countdown' || attempt.config.type === 'forTime') &&
                      attempt.config.showChecklist !== false && (
                        <p>
                          {attempt.checkedExerciseIds.length} of{' '}
                          {countLabel(attempt.config.exercises?.length ?? 0, 'exercise')} checked
                          off
                        </p>
                      )}
                    {previous && <p>{compareAttempts(attempt, previous)}</p>}
                  </li>
                );
              })}
            </ol>
          </>
        )}
      </div>
      {returnError && <p role="alert">{returnError}</p>}
      <div className="dialog-actions">
        <Button
          variant="secondary"
          onClick={() => void query.refetch()}
          disabled={query.isFetching || returning}
        >
          Refresh attempts
        </Button>
        <Button disabled={returning} onClick={() => void close()}>
          {returning ? 'Returning…' : returnError ? 'Retry return' : 'Close'}
        </Button>
      </div>
    </Dialog>
  );
}
