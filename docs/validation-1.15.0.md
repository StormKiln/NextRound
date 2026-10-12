# NextRound 1.15.0 validation

Scope: epic #201, children #202–#207. Baseline: 186 TypeScript tests passed.

Observed initial failures: missing native/browser duplication; lost library filters across navigation; retained success message after refresh failure; stale deletion removing a changed record; delayed query replacing a newer manual refresh. Follow-up regression also exposed outdated hidden-copy feedback after clearing filters. These are addressed within the scoped issues.

Final automated, native physical, review and published-channel evidence is recorded in #207 before release closure. Pending distribution checks are not implied by passing source tests.

Source checks passed: 197 TypeScript, 48 Rust and 19 release-tooling tests, type/lint/format/build checks. Focused release browser scenarios passed (8); the final full browser suite passed all 201 tests. Independent review found no actionable defects; added native all-mode/capacity and pending-read-during-mutation coverage for noted gaps.

Physical isolated 1.15.0 app on macOS 26.6.2: created an unfavourited copy with unchanged source, observed hidden-copy explanation with favourites filter, retained filter across History/Home, and rejected native deletion after stored duration changed. Refresh showed the new duration before reconfirmation. Native audio/power and sandbox media smoke passed. This validation uses synthetic templates and a distinct app identity; installed-release/upgrade evidence remains separate in #207.

Restart confirmed the new copy persisted independently and session filters reset. The README includes a native duplication-dialog screenshot using synthetic data.
