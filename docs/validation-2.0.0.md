# 2.0.0 validation

Source: release/2.0.0; merge/tag and artifact evidence will be recorded in #308.

## Automated evidence

- `make check`: passes release tooling, TypeScript, 295 unit tests, 63 native tests (two opt-in checks), lint/format/clippy and production frontend build.
- Focused browser checks cover session editing, both reorder methods, mixed six-mode execution, rest/Ready transitions, paused restart, checkpoint failures, actuals distinct from targets, collection import, full backup/rollback, minimum-window actions and filter reset.
- Native restore fault injection verifies previous data survives partial writes and commit-marker failure; prepared/committed journals recover correctly.
- Additional full-browser, production WebKit, native media and signed artifact evidence is pending; do not infer completion from this document.

## Physical acceptance

Computer-use preflight reported the Mac locked. Physical UI/VoiceOver, installed upgrade and Apple-build launch checks are not yet observed. #308 retains these gates separately from publication. Native automated audio/power/sandbox tests do not establish audible cue quality or VoiceOver usability.
