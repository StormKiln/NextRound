# 1.10.0 validation

Scope: epic #158, comparison feature #159, history aliases #160, interval targets #161, singular wording #145, publication #162.

## Investigation and regression coverage

History's old search failed a `pushups` query against a saved `Push-up`. Generated Intervals targets ignored the configured work duration and gave a 30-second plank target for a one-second phase. Both regressions failed before their fixes. Comparison interaction failed because Compare attempts was absent. Count-label and one-rung formatting regressions also failed before implementation.

Comparisons use a conservative snapshot key, excluding transient entry IDs, lead-in, warning and checklist visibility. Stable movement identities, names/descriptions, order, targets and mode-specific timing/scoring rules remain in the key. Legacy unattributed movements are not inferred to be catalog movements. No persistence schema changes are introduced.

Tests cover all six modes, UUID-independent repeats, material prescription changes, cap versus finished outcomes, AMRAP progress, unchanged fixed clocks, unspecified For Time work, millisecond differences, one attempt, read failure/retry, deletion, restart, minimum-window access and short-interval generation/Undo. Existing 0/1/2 count and wording assertions cover singular/plural behavior.

Independent static review found no additional blocking defects. Review scope included comparison matching/ranking, refresh/error/deletion behavior, dialog lifecycle, shared layout, aliases and generator/default handling.

## Verification tracking

Final local test counts and hosted CI, native checks, signed artifacts, updater and Apple processing evidence are recorded in #162. Physical Mac inspection was initially unavailable because the Mac was locked; this is not inferred from browser automation. Pending observations will be explicitly recorded if access remains unavailable.

## Final local results

- `make check`: 163 TypeScript tests, 43 Rust tests (two host-dependent tests intentionally ignored), 16 release-tooling tests, type checks, lint, formatting and production build passed.
- Final stable `make test-e2e`: 145 passed. The initial new Ladder fixture incorrectly included a per-exercise target; corrected to the valid rung-based prescription. A development-server reload/teardown interrupted earlier overlapping runs; the final full run used stable sources and one server.
- Isolated native 1.10.0 app bundle built successfully with separate application identity/storage. It is an ad-hoc validation build, not the signed distribution.
- Comparison screenshots inspected at 760×620 and 1280×620; attempts scroll while footer controls remain visible.
- Physical native/distribution interaction remains pending until the Mac can be unlocked. Publication evidence will be recorded in #162.
