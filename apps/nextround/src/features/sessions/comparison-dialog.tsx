import { formatElapsed } from '@nextround/core';
import { useState } from 'react';
import { Dialog } from '@/components/dialog';
import { Button } from '@/components/ui/button';
import { WorkoutDetails } from '@/features/templates/workout-details';
import { compareSessionRows, comparisonEligibility } from './comparison';
import type { Actual, TrainingResult } from './model';
import { compareActual, recordedLoadKg } from './performance';
import { ActualSummary } from './performance-editor';

const metrics = ['reps', 'seconds', 'metres', 'calories', 'load'] as const;
function value(actual: Actual | undefined, metric: (typeof metrics)[number]): string {
  return actual?.[metric] === undefined
    ? 'Not recorded'
    : `${actual[metric]} ${metric === 'load' ? actual.loadUnit : metric}`;
}
function attemptLabel(result: TrainingResult, position: number): string {
  return `${result.session.name} · ${new Date(result.completedAt).toLocaleString()} · ${result.blocks.every((b) => b.status === 'complete') ? 'Complete' : 'Partial'} · Result ${position + 1}`;
}
function Snapshot({ result, side }: { result: TrainingResult; side: string }) {
  return (
    <section className="comparison-snapshot" aria-label={`Attempt ${side} snapshot`}>
      <h3>
        Attempt {side}: {result.session.name}
      </h3>
      <p>{new Date(result.completedAt).toLocaleString()}</p>
      {result.session.blocks.map((block, index) => {
        const outcome = result.blocks.find((b) => b.blockId === block.id)!;
        return (
          <section key={block.id}>
            <h4>
              {index + 1}. {block.name}
            </h4>
            <p>
              {outcome.status} · {formatElapsed(outcome.elapsedMs)} workout time
            </p>
            <p>
              Recovery after block: {block.restSeconds}s ·{' '}
              {block.advance === 'automatic' ? 'Automatic advance' : 'Wait for Ready'}
            </p>
            <details open>
              <summary>Planned workout</summary>
              <WorkoutDetails config={block.config} />
            </details>
            <h4>Recorded performance</h4>
            <ActualSummary config={block.config} values={outcome.actuals} />
          </section>
        );
      })}
      {result.note && <p>Session note: {result.note}</p>}
    </section>
  );
}
export function SessionComparisonDialog({
  initialId,
  results,
  fresh,
  retry,
  onClose,
}: {
  initialId: string;
  results: TrainingResult[];
  fresh: boolean;
  retry: () => void;
  onClose: () => void;
}) {
  const sorted = [...results].sort(
    (a, b) => b.completedAt - a.completedAt || a.id.localeCompare(b.id),
  );
  const [leftId, setLeftId] = useState(initialId);
  const [rightId, setRightId] = useState(() => {
    const initial = results.find((r) => r.id === initialId);
    return initial
      ? (sorted.find((r) => comparisonEligibility(initial, r) === null)?.id ?? '')
      : '';
  });
  const [includeOther, setIncludeOther] = useState(false);
  const left = results.find((r) => r.id === leftId),
    right = results.find((r) => r.id === rightId);
  const eligible = sorted.filter(
    (r) => r.id !== leftId && (includeOther || (left && comparisonEligibility(left, r) === null)),
  );
  const reason = left && right ? comparisonEligibility(left, right) : null;
  const visibleRight = right && eligible.some((r) => r.id === right.id);
  return (
    <Dialog title="Compare session results" className="comparison-dialog" onClose={onClose}>
      <div className="comparison-body">
        <p>
          Inspect two saved attempts. Differences are measurements, not a winner or a coaching
          recommendation.
        </p>
        {!fresh ? (
          <div role="alert">
            Session history is unavailable or refreshing. Comparisons are paused until a successful
            read.<Button onClick={retry}>Retry comparison history</Button>
          </div>
        ) : (
          <>
            <div className="comparison-selectors">
              <label>
                Attempt A
                <select
                  aria-label="Attempt A"
                  className="input"
                  value={leftId}
                  onChange={(e) => {
                    const next = results.find((r) => r.id === e.target.value)!;
                    setLeftId(next.id);
                    setRightId(
                      sorted.find(
                        (r) =>
                          r.id !== next.id &&
                          (includeOther || comparisonEligibility(next, r) === null),
                      )?.id ?? '',
                    );
                  }}
                >
                  {!left && <option value={leftId}>Selected attempt unavailable</option>}
                  {sorted.map((r) => (
                    <option value={r.id} key={r.id}>
                      {attemptLabel(r, sorted.indexOf(r))}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Attempt B
                <select
                  aria-label="Attempt B"
                  className="input"
                  value={visibleRight ? rightId : ''}
                  onChange={(e) => setRightId(e.target.value)}
                >
                  <option value="">Choose another attempt</option>
                  {eligible.map((r) => (
                    <option value={r.id} key={r.id}>
                      {attemptLabel(r, sorted.indexOf(r))}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="comparison-toggle">
              <input
                type="checkbox"
                checked={includeOther}
                onChange={(e) => setIncludeOther(e.target.checked)}
              />{' '}
              Include changed or partial attempts for inspection
            </label>
            {!left && <p role="alert">Attempt A was removed. Choose another saved result.</p>}
            {left && !visibleRight && (
              <p role="status">
                {rightId
                  ? 'The selected second attempt is no longer available under these choices. '
                  : ''}
                Choose another attempt.{' '}
                {eligible.length === 0 &&
                  'No complete matching attempts are available; enable changed or partial inspection to browse other results.'}
              </p>
            )}
            {left && visibleRight && right && (
              <>
                <p role="status">
                  {reason ??
                    'Matching complete prescriptions. Deltas are Attempt A minus Attempt B.'}
                </p>
                {!reason && (
                  <section aria-label="Recorded differences" className="comparison-differences">
                    <h3>Recorded differences</h3>
                    <p>
                      Blank values stay unrecorded. Non-load deltas need equal recorded loads.
                      Unknown load is not zero. Recorded loads use 1 lb = 0.45359237 kg, rounded to
                      0.001 kg; originals stay unchanged.
                    </p>
                    {compareSessionRows(left, right).map((row) => (
                      <section
                        className="comparison-row"
                        key={`${row.blockIndex}:${row.exerciseIndex}:${row.occurrence}`}
                      >
                        <h4>
                          {row.blockIndex + 1}. {left.session.blocks[row.blockIndex].name} ·
                          Movement {row.exerciseIndex + 1}:{' '}
                          {
                            left.session.blocks[row.blockIndex].config.exercises![row.exerciseIndex]
                              .name
                          }{' '}
                          · {row.occurrence === 0 ? 'block total' : `round/rung ${row.occurrence}`}
                        </h4>
                        <table>
                          <caption>Recorded metrics and neutral deltas</caption>
                          <thead>
                            <tr>
                              <th scope="col">Metric</th>
                              <th scope="col">A</th>
                              <th scope="col">B</th>
                              <th scope="col">A − B</th>
                            </tr>
                          </thead>
                          <tbody>
                            {metrics.map((metric) => {
                              const delta =
                                row.left && row.right
                                  ? compareActual(row.left, row.right, metric)
                                  : null;
                              const missing =
                                row.left?.[metric] === undefined ||
                                row.right?.[metric] === undefined;
                              const unknownLoad =
                                !missing &&
                                (recordedLoadKg(row.left!) === null ||
                                  recordedLoadKg(row.right!) === null);
                              return (
                                <tr key={metric}>
                                  <th scope="row">{metric === 'load' ? 'Load' : metric}</th>
                                  <td>{value(row.left, metric)}</td>
                                  <td>{value(row.right, metric)}</td>
                                  <td>
                                    {delta === null
                                      ? missing
                                        ? 'Not recorded on both attempts'
                                        : unknownLoad
                                          ? 'Load unrecorded'
                                          : 'Different recorded loads'
                                      : `${delta < 0 ? '−' : delta > 0 ? '+' : ''}${Math.abs(delta)} ${metric === 'load' ? 'kg' : metric}`}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </section>
                    ))}
                    {!compareSessionRows(left, right).length && (
                      <p>No movements were specified; there are no aligned actuals to compare.</p>
                    )}
                  </section>
                )}
                <div className="comparison-pair">
                  <Snapshot result={left} side="A" />
                  <Snapshot result={right} side="B" />
                </div>
              </>
            )}
          </>
        )}
      </div>
      <div className="dialog-actions comparison-footer">
        <Button onClick={onClose}>Close comparison</Button>
      </div>
    </Dialog>
  );
}
