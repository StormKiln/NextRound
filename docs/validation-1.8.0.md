# 1.8.0 validation

Scope: epic #128; Ladder #129; saved-workout updates #130; history filters #131; validation ownership/accessibility #132/#133; taxonomy #13; publication #134; review-discovered future-field preservation #135.

## Source and automated evidence

Final local verification: `make check` passes **139 TypeScript tests, 38 Rust tests (two host-only tests excluded), 16 Python release tests**, typecheck, Biome, cargo fmt/clippy and production build. The complete browser suite passes **96 tests**. `make test-native-media`, `make test-sandbox-media` and the isolated macOS app build pass.

Production output: entry JS 328.56 kB (104.12 kB Vite gzip); all initial/preloaded JS totals 504,061 bytes (152,717 bytes Python gzip). Initial JS grew about 2% from 1.7.0's 494,228 bytes. Setup/history remain deferred local assets; no claim of faster startup or lower memory is made.

- Domain tests cover ascending/descending/pyramid targets, limits, reps eligibility, cap clocks and non-clock-driven progression. Native/browser commands own the completed-movement count, reject lead-in/terminal advancement, pause on final advance, support Undo, and give elapsed caps precedence.
- Template update regressions preserve identity and reject stale or deleted sources. Failed writes preserve the old document. Per-mode loaded-source snapshots survive the supported screen-reload recovery path and are cleared on repeat/load.
- History filters combine workout type and normalized saved exercise text without changing stored records. Filtered deletion uses the selected result ID; closing detail retains the filters.
- Ladder completion receipts include native progress so resolved results cannot be mistaken for another completion after reload. Saved results retain marked progress and distinct finished/capped outcomes.
- Independent whole-branch review found unknown nested fields could be dropped before native conflict detection (#135). Browser and Rust failing regressions reproduced the issue. Unsupported configuration/exercise/target fields now reject mutations and preserve original bytes. A minor Ladder equipment-count explanation was also corrected.
- Existing catalog contents were not edited: all 103 exercise identities, descriptions and targets remain covered by existing regression fixtures.
- Host audio/display-idle assertion and sandbox four-cue/power smoke tests pass. An isolated `NextRound Validation 180.app` builds under its own bundle identifier, without touching the owner's installed app or data.

## Visual and physical coverage

Browser screenshots at 760×620 were inspected for Ladder setup and cap results. Keyboard/error-linking checks cover all six setup modes, including correcting one field without hiding another error. A long Ladder list verifies keyboard advancement, paused Stop confirmation and reachable controls.

The physical Mac is locked; an unlock request was sent. Native visual/VoiceOver checks, exact packaged/TestFlight interaction, signed live upgrade and audible/sleep observations remain unperformed unless later recorded in #134. Automated audio/power tests do not prove those physical observations. Older release validation issues remain separate.

## Distribution gates

Final test counts, production chunk sizes, protected merge, immutable tag, workflow IDs, public artifact hashes/signatures/notarization/updater verification, and exact Apple VALID/Internal build are recorded in #134 when observed. No publication claim is made by this pre-release document. App Store public review/approval is separate from TestFlight availability.
