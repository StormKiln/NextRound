# 1.7.0 validation

Implementation: epic #120, feature #21, catalog #121, picker #122/#123, bundle #118, dialogs #125, publication #124, native retry #126.

## Automated and local evidence

- `make check`: 128 TypeScript tests, 34 Rust tests (two host-only tests excluded from the ordinary run), 16 Python release tests; typecheck, Biome, cargo fmt/clippy and production build pass.
- Complete browser suite: **83 passed**, covering all five workout modes; manual Finish/cap outcomes; confirmation pause/resume; templates/history/repeat; search group reopening; filter recovery; module-load retry; stable scrollbar geometry and minimum-window controls. Four old assertions initially expected eight dumbbell entries; these now correctly expect eleven and include For Time.
- Catalog: 103 unique movements; complete original 83-entry value/order fixture unchanged. Twenty additions have equipment/focus metadata, valid editable defaults, concise instructions and tested full plural names. References and counting conventions are in [exercise sources](exercise-sources.md).
- `make test-native-media` and `make test-sandbox-media`: host audio/power lifecycle and sandbox four-cue/display-idle assertion smoke checks pass.
- An isolated `NextRound Validation 170.app` was built under its own identifier. Native home, For Time setup, the expanded picker, selection of Bear-plank hold, full-screen start and disabled Finish during lead-in were observed. `pmset` showed the isolated process owning its active-workout display-idle assertion.
- Native interaction is intermittently blocked by Mac lock and ScreenCaptureKit error -3811. Remaining packaged-workout, exact installed-TestFlight and signed live-upgrade observations are not inferred from automation; track observed progress in #124.
- Browser screenshots at 760×620 were inspected for picker gutter space and Finish confirmation: controls are readable and uncut.

## Production loading measurements

Three fresh Chromium contexts per version, local Vite production preview, same Mac. Home ready includes the intentional three-second splash. JS totals include every initial shared/preloaded chunk, not just the entry filename. Gzip totals use Node gzip consistently for both versions; Vite's own displayed gzip estimate differs slightly.

| Metric | 1.6.0 | 1.7.0 |
| --- | ---: | ---: |
| Initial JavaScript, total bytes | 507,496 | 494,228 |
| Initial JavaScript, gzip bytes | 151,936 | 150,563 |
| Entry chunk, minified kB | 507.49 | 324.41 |
| Median home-ready time | 3,348 ms | 3,342 ms |
| Median JS heap after home | 4,616,368 bytes | 4,640,093 bytes |
| Median first EMOM navigation | 71 ms | 108 ms |

The change removes the 500 kB warning without raising its threshold and reduces initial JS by about 2.6% despite adding For Time and 20 exercises. These samples do **not** demonstrate a perceptible startup or memory improvement: startup is effectively unchanged, measured heap is slightly higher, and first setup navigation has an additional local module load. Setup/history chunks are packaged local assets, with no new service/network dependency. Runner and completion stay eager. Retry handles cached import failures by reloading with validated draft preservation and refuses reload during active/unresolved workouts.

## Release gates

Independent whole-branch review found one native retry/result-resolution issue (#126); a failing regression was reproduced and the fix passes all 128 TypeScript tests. Protected merge, immutable v1.7.0 tag, both distribution workflows, exact public artifact verification and Apple internal availability will be recorded in #124 as each is completed. This document does not claim publication before those checks run. App Store public review/approval remains separate from TestFlight delivery.
