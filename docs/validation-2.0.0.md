# 2.0.0 validation

Source: release/2.0.0; merge/tag and artifact evidence will be recorded in #308.

## Automated evidence

- `make check`: passes release tooling, TypeScript, 299 unit tests, 64 native tests (two opt-in checks), lint/format/clippy and production frontend build.
- Focused browser checks cover session editing, both reorder methods, mixed six-mode execution, rest/Ready transitions, paused restart, checkpoint failures, actuals distinct from targets, collection import, full backup/rollback, minimum-window actions and filter reset.
- Native restore fault injection verifies previous data survives partial writes and commit-marker failure; prepared/committed journals recover correctly.
- Production WebKit: all 14 new-release flows pass, including all six modes, paused reload recovery, restore/rollback failure gating and atomic history/actual deletion.
- Native opt-in audio/power lifecycle and sandbox media checks pass. Apple build configuration compiles with default features disabled.
- Independent whole-branch review identified three findings: stale poll overwriting user actions, unresolved restores allowing writes, and dirty parent notes losing nested-editor protection. All were reproduced with failing regression tests and fixed. There are no deferred review findings.
- Production screenshots of session editing and backup settings were visually inspected. Screenshot review found JSON picker spacing (#313), corrected with an explicit gap and bounded input width.
- Full browser regression suite: 306 passed. Signed artifact and publication evidence will be attached to #308.

## Physical acceptance

Computer-use preflight reported the Mac locked. Physical UI/VoiceOver, installed upgrade and Apple-build launch checks are not yet observed. #307 and #308 retain these gates separately from publication. Native automated audio/power/sandbox tests do not establish audible cue quality or VoiceOver usability.
