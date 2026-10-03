# 1.4.0 validation

Source scope: epic #100; implementation #23, #95, #96, #97, #99; delivery #101.

Evidence and final run/build identifiers are recorded in #101 as verification completes. Do not treat this checklist as a completed test report.

- Unit and native contracts: AMRAP fixed time cap, target validation, mixed-unit progress validation, immutable history and backward-compatible old records; Stop confirmation state and failure paths.
- Browser: all existing workout flows, AMRAP progress/undo/correction/save/restart/repeat, all-mode Stop pause/cancel/confirm, target editing/defaults, uneven rotations, scrolling/reordering and minimum window sizes.
- Packaged native: actual app lifecycle, timing/cues, pause during Stop, completion/history/restart and App Store channel behavior. Native audio/keep-awake and sandbox checks are separate from visual observations.
- Distribution: tag/source/version agreement, downloaded hashes, signing/notarization/staples, updater signature/tamper rejection and live signed update preserving seeded data; TestFlight processing and Internal group availability.

The Mac was locked at the first attempted native check; an unlock was requested while automated work continued. Outstanding observations must stay explicitly open until actually performed. App Review recording/latest-OS resubmission remains #92.

## Pre-merge evidence

- `make check`: 96 TypeScript tests, 31 Rust tests and 11 release-script tests passed; typecheck, Biome, Clippy and production build passed.
- `make test-e2e`: all 53 browser tests passed, including four-mode Stop confirmation, AMRAP mixed-unit scoring/history/repeat and EMOM list/defaults/rotation coverage.
- `make test-native-media`: passed with host audio access. The restricted-process attempt could not access audio output; this was an environment restriction, not silently treated as a pass.
- `make test-sandbox-media`: passed; all four cues started and the display-idle assertion was created and released.
- Independent whole-branch source review: no actionable findings. Active-session crash recovery and cloud sync remain explicitly outside this release.

Packaged UI, signed upgrade and distribution evidence remains pending and is tracked in #101.

## CI clock-test correction (#103)

The first PR CI run passed 49 scenarios, but four Stop-confirmation cases exhausted the 30-second test deadline while replaying 70 seconds of polling callbacks. A throttled local diagnostic preserved the paused clock at 00:59 but spent 15,120 ms in `runFor`. Using `fastForward` for the same 70-second paused interval took 21 ms and passed the unchanged assertions within the original timeout. Running-clock progression tests still use `runFor`; only the long paused interval jumps.
