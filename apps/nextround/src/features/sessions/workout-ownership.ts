// Completed/cancelled snapshots remain available after a result is handled.
// Only live work, pending results and in-flight operations own the workout.
export function workoutOwnsSession(state: {
  busy: boolean;
  pendingResult: unknown;
  snapshot: { phase: string } | null;
}) {
  return !!(
    state.busy ||
    state.pendingResult ||
    (state.snapshot && ['leadIn', 'running'].includes(state.snapshot.phase))
  );
}
