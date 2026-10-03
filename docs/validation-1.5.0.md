# 1.5.0 validation

Local validation on October 3, 2026:
- `make check`: 104 TypeScript tests, 31 Rust tests (2 explicit host/media tests ignored in the default suite), 16 Python release tests; typecheck, lint/clippy and production web build pass.
- Complete browser suite: 64 passed. The subsequent equipment suite passes all nine cases, including an additional new-exercise template/history/repeat/usage round trip (65 total distinct browser cases).
- `make test-native-media`: host audio/power lifecycle passed.
- `make test-sandbox-media`: four cues started and display-idle assertion created/released in the sandbox smoke app.
- Isolated `NextRound Validation 150.app` built with its own identifier to avoid the owner's application data.
- Independent whole-branch review identified diagnostic overwrite on repeated notarization invocation. A failing regression reproduced it; a guard now preserves the prior record and refuses upload. The release suite and full checks passed after the fix.

Automated coverage includes unset/empty/configured equipment, all-required-item semantics, raised-surface/jump-box distinction, unknown requirements, corrupted/future storage preservation, write failure, override reset, picker/Settings return, all four workout builders, minimum-window AMRAP advance/undo/wrap/focus, stale poll responses and separate error recovery. Original 43 catalog IDs are unchanged; 20 entries bring the total to 63.

Interactive packaged-app checks, the exact TestFlight-installed build, and an isolated signed 1.4.0→1.5.0 live update have not yet been observed: computer-use reports the Mac locked. An accessible startup splash alone is not a passed interactive check. Track these explicitly in delivery issue #109; do not infer success from browser tests or Apple upload acceptance. Existing version-specific 1.4.0 follow-ups #100/#101 remain separate.

Publication evidence (protected merge, immutable tag, public artifact verification, exact Apple build and Internal-group availability) will be recorded in #109 after the tag workflows complete.
