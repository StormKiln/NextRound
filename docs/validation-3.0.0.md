# 3.0.0 validation

Epic [#455](https://github.com/StormKiln/NextRound/issues/455); publication [#463](https://github.com/StormKiln/NextRound/issues/463). Implementation merged in #459 (louder cues, #456), #460 (timed-target done cue, #457) and #462 (Spotify control, #458).

Full source checks on the release branch passed: 394 unit tests, 70 native tests (3 interactive tests ignored), type/lint/release tooling and production build. `make release-metadata` validated v3.0.0 across all package, Tauri and Cargo versions. Each implementation PR passed full hosted validation, including the complete Chromium suite and macOS app build, before entering the merge queue. One unrelated backup-restore browser test (`release-200.spec.ts:151`) timed out once on #460, passed 3/3 locally on the same commit and passed on rerun.

## Cues
Cues were regenerated with 0.9–2.6 kHz fundamentals plus harmonics, peaks at 90% full scale (29490, previously 11999) and about +6.5 dB RMS. Clipping was checked by measuring every WAV. The interactive native audio/power lifecycle test passed on this Mac and played all five cues, including the new `done` cue. Rust and Vitest cases cover done timing in EMOM and Intervals, non-seconds targets, warning-window precedence, slot-length targets and the athlete-paced exclusions.

Not observed: listening comparison with Spotify playing over speakers and headphones.

## Spotify
The Apple Event codes (`spfyPlay`, `spfyPaus`, `pPlS`/`kPSP`, `pTrk`, `pnam`, `pArt`, `aUrl`) and access groups (`com.spotify.playback`, `com.spotify.library`) were checked against the sdef of the Spotify app installed on this Mac. Unit tests cover workout-state mapping, change-only transitions, pausing only workout-started playback, disabled-setting behavior, default-off persistence and the artwork host allowlist. The browser build never invokes native Spotify commands.

Not observed: the interactive `native_spotify_round_trip` test did not complete from the automated shell. It blocked waiting on macOS Automation consent for the test process, with Spotify running. Real play/pause, the consent prompt, the now-playing display and App Review acceptance of the `scripting-targets` entitlement must be checked in the signed or TestFlight build. Results are recorded on #463.
