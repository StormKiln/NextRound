# 1.9.0 validation

Scope: epic #138; personal library #139; browser source normalization #137; Custom validation #140; Unicode search #141; delivery #142.

## Automated evidence

`make check` passes 149 TypeScript tests, 43 Rust tests (two host-only checks excluded), 16 Python release tests, typecheck, Biome, cargo fmt/clippy and production build. The complete browser run passed 108 tests and identified one stale version assertion expecting 1.8.0. That assertion was updated to 1.9.0, and its four-test Settings suite passes. CI must pass the entire 109-test suite before merge.

Personal tests cover stable identity, duplicate names, restart persistence, stale expected-record rejection, archive/restore, corrupt/future data preservation, write failure/retry without duplicates, the 500-record cap, metadata filters and independent snapshots. Browser tests exercise selection in all six modes, explicit Custom saving, bundled copies, cancellation before committing a required target, corrupt-library fallback, stale editing, equivalent Unicode search, and minimum-window keyboard controls.

`make test-native-media` and `make test-sandbox-media` pass: audio cues start and the display-idle assertion is created/released. The isolated NextRound Validation 190 app builds under its own identifier. These automated checks do not establish subjective audible behavior or actual long-duration sleep prevention.

## Native and visual observations

Inspected the personal editor screenshot at 760×620 with wide scrollbar gutters: errors and save/cancel remain visible while fields scroll. On the physical Mac, the isolated native app shows 1.9.0, opens My exercises, creates a personal exercise with description and displays it back in the library. Additional native observations and release artifact checks will be recorded in #142.

## Distribution

Protected merge, immutable tag, workflow IDs, public artifact hashes/signature/notarization/updater verification and exact Apple VALID/Internal availability are recorded in #142 after observation. This document does not claim publication before those checks. Public App Store review is separate. Unobserved physical checks from older releases retain their original issues.
