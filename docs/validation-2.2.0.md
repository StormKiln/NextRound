# 2.2.0 validation

Source: release/2.2.0. Final full-suite, protected merge/tag, public artifact, Apple processing and installed acceptance evidence is tracked in [release acceptance #336](https://github.com/StormKiln/NextRound/issues/336).

## Automated checks

- `make check` passes release tooling, TypeScript, 313 unit tests, 64 native tests, lint/format/clippy and production frontend build. Opt-in native audio/power lifecycle and sandbox media checks pass separately. Apple configuration compiles without default features.
- New catalog coverage preserves all 243 previous snapshots, verifies the 20 additions and 8/6/6 equipment split, checks aliases/metadata/defaults, and exercises generation and Ladder compatibility.
- Comparison regressions cover all six workout types, explicit A/B selection, equal timestamps, regenerated IDs, duplicate names, distinct occurrences, changed/partial inspection, missing/zero load, refreshed edits, unsaved notes, restart, failed reads and deleted selections.
- Production WebKit exposed an additional pointer-focus difference: clicking a button does not focus it by default. Comparison entry now explicitly focuses its trigger so Escape restores focus reliably. The nested dialog cancel event no longer closes its parent.
- Normal and 760×620 production WebKit screenshots were inspected. Evidence scrolls within the dialog while Close comparison stays reachable. A 20-block regression checks the final block is reachable without horizontal clipping.
- Full browser-suite and independent-review results are recorded in #336 after completion; no pending run is treated as passed here.

## Physical acceptance

At preparation time, computer-use reported that the Mac was locked. An unlock request was sent while automated checks continued. Installed 2.1→2.2 data preservation, intended tester availability, VoiceOver, audible timing and sleep/wake observations require physical access and must be recorded separately. Browser captures and native API smoke tests do not prove these observations. Older release acceptance issues remain separate.
