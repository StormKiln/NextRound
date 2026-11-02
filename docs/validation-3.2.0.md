# 3.2.0 validation

Epic [#476](https://github.com/StormKiln/NextRound/issues/476); publication [#482](https://github.com/StormKiln/NextRound/issues/482). Implementation is in #483 (warm-up and cool-down pools, #477 and #478) and #484 (workout screen readability, #479, #480 and #481).

## Warm-ups and cool-downs
- **Warm-up pool:** 43 movements. 16 active bodyweight movements of moderate intensity were added, and 17 passive floor and seated drills removed.
- **Cool-down pool:** 44 movements. 10 light or relaxation-only items were removed, and Garland Pose added.
- Either pool still fills a 15-minute block. No phase-tagged movement needs equipment or is high intensity. Cool-down entries are low-intensity, non-strength work (`phases.test.ts`, `catalog-310.test.ts`).
- `bookends.test.ts` covers:
  - per-phase holds of 45 s for the warm-up and 50 s for the cool-down;
  - the ramp split (about a third mobility first) for 1, 3, 5, 6 and 9 minutes;
  - the fill from the other group when one runs short;
  - cool-downs are not reordered.
- The `release-310.spec.ts` full run asserts "Move for 45 seconds" in the warm-up and "Hold for 50 seconds" in the cool-down.

## Workout screen
- The timer face is unchanged: 530px at 1440x900, 507px at 1180x820 and 346px at 760x620, measured before and after #484.
- The runner fills the window height at widths of 581px and up. Long text scrolls inside the movement column, and Pause and Stop stay in view at the 760x620 minimum.
- Sizes:
  - current description about 23px at desktop widths;
  - Spotify now-playing 26px, with 56px artwork.
- `release-320.spec.ts` covers:
  - the EMOM next-movement description at the minimum window, including the lead-in and the last round;
  - the warm-up's change window, where the heading and description move to the next movement and the Up next panel is hidden.
- CI found that the new e2e tests exceeded the default 30-second budget on slower macOS runners. Fast-forwarding a minute of fake time is expensive there, so both tests now have a 90-second budget.

Screenshots `workout-runner-320.png` and `warmup-runner-320.png` are 1440x900 Chromium captures from `release-320.spec.ts` with `NEXTROUND_CAPTURE=1`, against the browser build. The browser build can't control Spotify, so the now-playing line doesn't appear in them.

## Not observed
- The native app on a physical Mac: the new layout in WKWebView, and the 50-second cool-down done cue.
- The larger now-playing line with a real Spotify session. It was checked only with injected markup during development.
- A TestFlight tester installation.

Results from the tagged release are recorded on #482.
