# 2.12.0 validation

Epic [#444](https://github.com/StormKiln/NextRound/issues/444); publication [#450](https://github.com/StormKiln/NextRound/issues/450).

The three pure swap tests failed before implementation, then passed. Four browser regressions reproduced stale-draft revival and incorrect numeric error semantics in both generation dialogs before the fixes. The catalog test observed 423 instead of 443 before additions. All 390 unit tests now pass.

Focused Chromium verification passed 21 checks: single-slot swapping across six modes, preserved pinned positions and neighboring targets, Apply/Undo, exhausted pools, session blocks, filter invalidation and minimum-window layout. An initial Undo test captured before hydration; waiting for the visible builder trigger corrected the test setup.

Production WebKit captures use isolated sample data. Full regression, native packaging, independent review and signed publication evidence are recorded on #450 as they complete. Browser checks do not establish physical-device observations.

![Swap suggestions](screenshots/swap-suggestions.png)

![Minimum window](screenshots/swap-suggestions-minimum.png)
