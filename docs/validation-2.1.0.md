# 2.1.0 validation

Source: release/2.1.0. Final full-suite, merge/tag, downloadable artifact, Apple processing and physical acceptance evidence is recorded in [release acceptance #325](https://github.com/StormKiln/NextRound/issues/325).

## Automated checks

- `make check` passes release tooling, TypeScript, 303 unit tests, native tests, lint/format/clippy and production frontend build.
- Catalog checks preserve all 223 prior snapshots and verify 20 additions, metadata, supported targets, equipment and identity uniqueness. Directed alternative references are checked for dangling, self and duplicate relationships.
- Production WebKit: all 14 release regressions pass.
- Browser regressions cover confirmation/cancel/Undo, all six builders, session-block snapshot persistence, equipment override/search, incompatible actual metrics, collection failure/retry, neutral export cancellation and genuine write failures.
- Independent review found orphan collection memberships and aggregate performance errors focusing an unrelated row. Both were reproduced with failing regressions, fixed and re-reviewed with no remaining findings.
- Native opt-in audio/keep-awake lifecycle and sandbox media checks pass; the Apple configuration compiles without default features.
- Production WebKit screenshots at normal and 760×620 sizes were inspected. The picker scrolls while equipment/footer actions remain accessible; the confirmation dialog retains visible, padded actions.

## Physical acceptance

The Mac was accessible during this release, but the pre-existing installed copy identified itself as 1.14.0. It is not evidence for this release. Installed 2.1.0, Apple tester availability, VoiceOver, audible timing and upgrade evidence must be observed and recorded in #325 separately from automated success. Older acceptance issues are not closed by these checks.
