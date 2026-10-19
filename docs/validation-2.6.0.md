# 2.6.0 validation

Scope: [epic #377](https://github.com/StormKiln/NextRound/issues/377). Final immutable publication evidence belongs in [#384](https://github.com/StormKiln/NextRound/issues/384).

## Evidence so far

- Clean 2.5.0 baseline: 324 unit tests. Replacement helper tests first failed because the helper was absent; expanded suite passes 331 tests, covering selected occurrences, identity, immutable source/timing, invalid targets, stale drafts, all six modes and cancellation during a delayed personal-library read.
- Browser regression cases first failed on absent replacement/chooser actions. Six focused production WebKit cases pass: subset Apply/Undo, source preservation, Cancel/focus, chooser filter/preview recovery, stale personal replacement refusal, explicit target edit and minimum-window control geometry.
- Two initial WebKit failures were test selectors: a concatenated accessible name and a comparison action inside a result dialog. Corrected tests follow the actual visible flow and pass.
- Catalog count test failed at 323 before additions, then passed at 343. All prior exercise snapshots remain identical; equipment, aliases, defaults and supported workout modes pass.

Full repository checks, broader browser regression, independent review and signed publication are pending. Record final results on #384 before tagging; do not infer success from a partial run.

## Physical acceptance

Browser/native automation does not prove an installed signed upgrade, human-audible cues, VoiceOver or sleep/wake observations. Attempt physical checks and explicitly link any unavailable observations to an open follow-up with the published build identity.
