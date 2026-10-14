# NextRound 1.19.0 validation

Scope: #239 with focus-area generation #240 and usability fixes #241–#243. Publication evidence is tracked in #244.

- Baseline and implementation unit suites: 225 passed. `make check` passed including release tooling checks, TypeScript, unit/native tests, Biome, Rust formatting/clippy and frontend build. Native suite: 50 passed, two intentionally ignored media/signature tests covered separately during release verification.
- Initial regressions reproduced archive/empty-search focus loss, personal default/unit focus failures, retained picker filter scroll and the missing generation focus control. The five fix regressions passed after changes.
- Stable generation/favourites regression run: 27 passed. Explicit WebKit suite: 18 passed, including six modes, four presets, ANY/Back/Lats/Whole-body semantics, no matches, settings return, timing/count/Undo preservation, archive/write-error focus and personal target limits. Full browser coverage and fresh-review results are recorded in the PR and #244.
- Physical Mac, isolated identity `com.stormkiln.nextround.validation1190`, 760×620: generated a core movement with unchanged timing, recovered from count 0 by typing 1 without reclicking, and restored the original exercise order with Undo. Clearing a bundled no-match search restored typing to search. Missing units focused Reps (Space corrected it); invalid default amount focused the amount field (typing corrected it). Keyboard archiving of the last personal row restored typing to library search. Native data is isolated from production documents.
- Browser minimum-window expanded/collapsed focus controls were visually inspected; action buttons remain fixed while content scrolls. `docs/screenshots/focus-generation.png` shows sample selections in the shared interface.
- Existing direct/Apple data baselines are captured read-only before upgrade. Installed-release/live-update preservation, artifact signatures/notarization/updater feed and exact Apple version/build/tester availability must be recorded after publication in #244; source tests are not substitutes for those observations.

No catalog entries, user document schemas, accounts or cloud services were changed. Prior-release acceptance remains in its original issues.
