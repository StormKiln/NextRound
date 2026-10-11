# NextRound 1.13.0 validation

Scope: epic #179; notes #180, refresh recovery #181, keyboard focus #182, bounded result dialogs #183, publication #184.

## Regression evidence

Baseline: 172 TypeScript tests passed. New browser/native persistence tests failed before note support was implemented. Browser regressions reproduced missing notes/refresh and lost focus on deletion. Notes use expected-original-text conflict checks and preserve immutable performed data, including idempotent save retries. Native writes use the existing serialized atomic writer. Plain text and Unicode limits are validated on both storage paths.

## Verification tracking

Final automated results, independent review, physical Mac checks, hosted CI and publication evidence are tracked in #184. Physical source checks use isolated synthetic data and a separate app identifier. Older outstanding installed-distribution checks (#164 and #177) must not be claimed complete without direct evidence.

## Local source checks

- `make check`: 180 TypeScript, 46 Rust and 16 release-tooling tests passed, along with type checking, lint, formatting and production build. Two host-only Rust checks are excluded from the ordinary suite.
- App Store feature configuration passed `cargo check --no-default-features`. The isolated native app built successfully. Native audio/power lifecycle and App Sandbox four-cue/display-idle smoke checks passed.
- Independent review found a Unicode whitespace mismatch (#186). A native test reproduced the BOM-only conflict loop; both stores now share an explicit whitespace set and cover BOM clearing, U+0085 preservation and subsequent editing. Follow-up review found no remaining actionable issue.
- New browser coverage exercises all six modes, timer-only sessions, note persistence/repeat, plain text, Unicode limits, search, stale/missing results, write/read errors, unsaved navigation, focus and long content. Final full-suite result is recorded in #184.
- Startup synchronization failures in older browser tests are tracked and fixed in #185. Data assertions retain their ordinary timeout after a bounded application-readiness wait.
- Physical UI checks and tester-visible TestFlight availability require an unlocked Mac. A request is pending; no physical 1.13.0 UI checks are claimed here.
