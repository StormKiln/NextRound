# 1.9.0 validation

Scope: epic #138; personal library #139; browser source normalization #137; Custom validation #140; Unicode search #141; delivery #142.

## Automated evidence

`make check` passes 149 TypeScript tests, 43 Rust tests (two host-only checks excluded), 16 Python release tests, typecheck, Biome, cargo fmt/clippy and production build. The complete browser suite passes 111 tests, including the two review-discovered recovery regressions.

Personal tests cover stable identity, duplicate names, restart persistence, stale expected-record rejection, archive/restore, corrupt/future data preservation, write failure/retry without duplicates, the 500-record cap, metadata filters and independent snapshots. Browser tests exercise selection in all six modes, explicit Custom saving, bundled copies, cancellation before committing a required target, corrupt-library fallback, stale editing, equivalent Unicode search, and minimum-window keyboard controls.

`make test-native-media` and `make test-sandbox-media` pass: audio cues start and the display-idle assertion is created/released. The isolated NextRound Validation 190 app builds under its own identifier. These automated checks do not establish subjective audible behavior or actual long-duration sleep prevention.

## Native and visual observations

Inspected the personal editor screenshot at 760×620 with wide scrollbar gutters: errors and save/cancel remain visible while fields scroll. On the physical Mac, the isolated native app shows 1.9.0, opens My exercises, creates a personal exercise with description and displays it back in the library. Native quit/relaunch preserves the entry; archive hides it, restore returns it, and EMOM selection asks for a reps target and copies the confirmed 8 Reps into the draft. These observations use the isolated pre-publication build; exact distributed builds and subjective audio/sleep observations remain separate. Release artifact checks will be recorded in #142.

## Distribution

Protected merge, immutable tag, workflow IDs, public artifact hashes/signature/notarization/updater verification and exact Apple VALID/Internal availability are recorded in #142 after observation. This document does not claim publication before those checks. Public App Store review is separate. Unobserved physical checks from older releases retain their original issues.


## Independent review

The read-only whole-branch reviewer found two P2 recovery issues: #144 stale conflicts reused cached personal records, and the picker empty-state Custom entry point retained an old validation error (#140). Both had observed failing browser regressions before fixes; failures now refresh personal query data without discarding the form, and all Custom entry points clear old validation.

The reviewer left physical/distribution checks to the release executor; evidence above and #142 distinguish observed from unobserved behavior. Cross-tab/multiple-process simultaneous writers were not reviewed; serialization is scoped to the existing repository/store instance, consistent with this local desktop release. No broader concurrency guarantee is claimed. The existing glib Linux-target advisory remains tracked in #72; `cargo tree --target aarch64-apple-darwin -i glib` confirms it is absent from this macOS dependency tree.
