# NextRound 1.11.0 validation

Scope: epic #165, exercise replacement #166, generator equipment recovery #167, count validation focus #168, comparison focus #169, release #170.

## Regression evidence

The baseline passed all 163 unit tests. New browser regressions failed before implementation for missing replacement controls, invalid generator count focus, and comparison close focus when the originating result had disappeared. Ordinary comparison close/Escape already restored the origin in Chromium; the fix now makes that destination explicit and adds a stable heading fallback.

Replacement keeps the slot identity and snapshots the newly selected movement. Compatible targets are copied, incompatible targets receive visible explanation and a valid suggestion, Ladder has no per-entry targets, and new interval time suggestions are capped to the work phase. Undo affects only an unchanged replacement slot and expires if that slot changes or disappears. No persistence schema changes are introduced.

Coverage includes all six modes, cancellation, duplicate names, equipment and Ladder eligibility, target compatibility, personal/default targets, custom replacement, template reload, performed-history attribution, unrelated edits, Undo expiry, invalid count correction, equipment settings round-trips, and missing comparison origins.

## Verification tracking

Final automated counts, physical Mac observations, hosted CI, review and both publication channels are tracked in #170. Source-build checks are distinguished from installed signed GitHub/TestFlight observations. The Mac was initially locked; physical inspection is pending unlock and must not be inferred from browser tests.

## Local checks

- `make check`: 168 TypeScript tests, 43 Rust tests (two host-dependent tests intentionally ignored), 16 release-tooling tests, type checks, lint, formatting and production build passed.
- The 12 focused release browser cases passed; full-suite results are recorded in #170 after completion.
- A fresh, read-only whole-change review found no actionable correctness, data-loss, accessibility or regression findings.
- Screenshots inspected at 760×620 and 1280×620 with visible scrollbars: replacement picker, replacement/Undo feedback and generator controls remain usable.
- Isolated native 1.11.0 validation app built successfully with separate application identity/storage. It is ad-hoc signed and is not a distribution artifact.
