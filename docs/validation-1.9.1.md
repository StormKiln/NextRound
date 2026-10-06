# 1.9.1 validation

## Scope and completion criteria

Fix #147: separate picker controls, move equipment controls to a pinned footer, keep matching exercises visible in small windows, and preserve filtering and keyboard behavior across six modes. Audit related UI spacing, fix reproduced cases (#150), and deliver immutable v1.9.1 to GitHub and TestFlight (#151). Public App Store submission remains separate.

## Investigation and regression evidence

The shared picker used a flex column without a gap, while equipment controls and suggestions preceded all search results. The personal-library page placed its action row directly against its search input. The personal editor's category select also touched the next fieldset's legend.

Before fixes, seven new browser regressions failed: picker spacing or first-result visibility in each of six workout modes, and a zero-pixel action/search gap in My exercises. A separate editor regression measured a zero-pixel category/equipment gap. The focused fixes add explicit spacing and a footer outside the scroll region, prioritize results during search, reset the result scroll position for new queries, and separate nested fieldsets.

## UI audit

Inspected Settings (General, Equipment, Updates, About), Custom exercise, target editor, save-template dialog, picker, personal-library modal, personal editor and Stop confirmation at 760×620 and 1440×900 with 18px scrollbar styling. The personal-library and editor spacing defects are included in #150. The other inspected screens showed separated controls; scrollable content is intentionally clipped at scrollport boundaries. This is browser-rendered layout evidence; native and publication evidence are recorded separately below or in #151.

## Final local verification

- `make check`: passed, including 149 TypeScript tests, 43 Rust tests (two host-dependent checks intentionally ignored), 16 release-tooling tests, type checks, lint, formatting and production build.
- `make test-e2e`: 120 passed, including nine new spacing, visibility and keyboard regressions. The About test now reads the declared app version instead of hard-coding 1.9.0.
- Independent code review found no blocking defects. Corrected directional suggestion copy and added keyboard recovery coverage for unsupported equipment data in response to review.
- Built and inspected the native macOS app with an isolated validation bundle identifier. Verified the search result appears immediately, footer controls remain separate, returning from equipment settings retains the search, and the equipment override has the correct accessible name. This used the local Mac, not a simulator; the signed distribution builds are validated separately by the release workflows.

## Release evidence

Merge/tag identity, workflow IDs and exact Apple build state are recorded as they are verified in #151. Publication is complete only after both GitHub and Internal TestFlight availability are verified.
