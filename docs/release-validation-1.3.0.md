# 1.3.0 validation record

Scope: epic #85, feature #80/#82, fixes #86/#87/#88, review finding #90, publication #89.

## Implementation decisions

Reuse catalog IDs shipped in 1.2.0. Derive counts from retained saved history instead of maintaining a second counter. Count inclusion once per session; exclude missing identities without name matching. Presets return at most three distinct eligible catalog exercises, respect search and selected identities, and require explicit selection. Sparse history is disclosed; read failures do not become zero-use statistics. No additional dependencies, backend, telemetry or migration.

History repeat uses a synchronous lock with pending UI and blocks dismissal during the operation; unmount invalidates continuation. Search combines normalized literal matching with deliberate aliases. History action names include mode, date/time and position.

## Evidence

- 88 TypeScript/unit/UI tests pass, including all three workout modes, duplicate entries, legacy identity, count changes, sparse pools, search aliases and partial queries, delayed repeat, dismissal/unmount, failed reads and stale-cache failure.
- 29 native Rust tests pass. Native audio/power integration passes; App Sandbox smoke passes four cues and display-idle assertion cleanup.
- 47 browser tests pass before the final picker spacing correction; final rerun recorded in issue #89.
- Typecheck, lint/clippy, production build, release-script tests and actionlint pass. Isolated native app builds successfully.
- Independent review found partial search regression #90; a failing regression was observed, then fixed. No other blocking finding was reported.
- Physical Mac inspection is performed using a separate `com.stormkiln.nextround.validation130` app identity to protect existing user data. Full observed results and published artifact verification are recorded on #89/#73.

## Apple review boundary

App Store Connect currently has rejected 1.0.0 build 1.8.1 selected under version 1.0. This release does not automatically replace that submission. The physical Mac runs macOS 26.6.2, so testing here cannot satisfy Apple's separate latest-OS recording request. A new physical-device review recording on the latest OS remains an owner follow-up; do not present browser screenshots or CI as that recording. GitHub/TestFlight publication is distinct from public App Store approval.
