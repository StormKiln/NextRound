# NextRound 1.16.0 validation

Scope: epic #210 and children #211–#215. Baseline: 197 TypeScript tests passed.

Observed failing regressions before implementation: stale deletion removes a changed result in browser/native storage, a delayed query replaces a saved note, and unknown/loading history announces zero results. Focused history regressions now pass, including serialized manual reads/writes, unmounted views, failed writes, property ordering, all six modes, local dates/DST and aggregate duration formatting.

Final automated, native physical, independent review and published-channel evidence is recorded in #215. Pending distribution checks are not implied by source tests. Earlier exact-version observations under #207 remain separate.

Source checks passed: 209 TypeScript, 49 Rust and 19 release-tooling tests, type/lint/format/build checks. The first full browser suite passed 205 tests; the expanded final suite includes the additional nested-error regression. All five focused release scenarios pass. Native audio/power and sandbox media smoke passed.

Independent review found that note-editor read failures were not reflected in History after closing the editor (#216). The failing browser reproduction now passes after moving error status into the shared query. Re-review found no remaining actionable issues.

An isolated 760×620 native bundle was built under `com.stormkiln.nextround.validation1160` with synthetic history. Physical interaction and installed-channel evidence remain pending while the host is locked; they are tracked in #215 without implying completion.
