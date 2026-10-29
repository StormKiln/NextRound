# 3.1.0 validation

Epic [#465](https://github.com/StormKiln/NextRound/issues/465); publication [#470](https://github.com/StormKiln/NextRound/issues/470). Implementation is in #472 (phase tags and 30 exercises, #466 and #467) and #473 (warm-up and cool-down options and runs, #468 and #469), stacked under this release.

## Catalog
The catalog grows from 443 to 473 records. `catalog-310.test.ts` checks the first 443 against the new `catalog-2120-baseline.json` and checks every addition's metadata, aliases, phase tags and generated targets for each mode. 44 movements are tagged warm-up and 53 cool-down, with one carrying both, so either pool fills a 15-minute block. Personal exercises carry an optional `phases` field through the TS and Rust validators, backup and copy. Older files load unchanged.

## Warm-up and cool-down
Unit tests cover the preference defaults and tolerance, picking and config building (`bookends.test.ts`). They also cover the full store sequence (`bookend-run.test.ts`):
- warm-up, then main, then cool-down, with the native cue flags at each part;
- one main result carrying `warmupMs` and `cooldownMs`, resolved once natively;
- Skip warm-up and End cool-down;
- a cool-down that fails to start, which keeps the main result;
- Repeat;
- unchanged behavior with neither option on.

A Rust test bounds the optional history fields and round-trips them.

Browser checks in `release-310.spec.ts` and `phases-310.spec.ts`:
- Options in all six modes, slider bounds, the default, hide-and-keep, persistence across reload, and reshuffle.
- A clock-driven Countdown run with a 1-minute warm-up and cool-down: hold and change-position states, automatic transitions, pause and resume, End cool-down, the completion summary and Save. Also Skip warm-up.
- Phase filtering in the library and picker, and personal tagging.

Results: 11/11 passed in Chromium and 9/9 of `release-310.spec.ts` in WebKit.

These checks found and fixed a real defect before merge. After a cool-down, polling replaced the completion screen's workout snapshot with the finished cool-down. A unit regression test now covers it. The full-run e2e test also got a 90-second budget, because more than three minutes of simulated time came close to the default 30-second limit.

Screenshots `warmup-cooldown.png` and `warmup-runner.png` are WebKit captures from `release-310.spec.ts` with `NEXTROUND_CAPTURE=1`, against the browser build with isolated sample data.

## Not observed
- A physical-Mac run of the native app with real audio cues at the part transitions.
- The Spotify between-parts behavior on device.
- A TestFlight tester installation.

Results from the tagged release are recorded on #470.
