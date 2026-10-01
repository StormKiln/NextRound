# NextRound 1.1.0

## Work/rest intervals

Build interval workouts with configurable work time, rest time, rounds, lead-in and warning sounds. Choose and reorder library or custom exercises, set targets, and save the workout as a reusable local template.

The runner shows **Work** or **Rest**, the phase countdown, total remaining time, and the next movement. Each round contains one work phase; exercises rotate at the start of each work phase. Rest comes between rounds, with no rest after the final round. Zero rest is supported. Work starts with a beep, rest with a descending two-note cue, and completion with its own sound. Pause, resume, stop, repeat and sleep prevention work as in the existing modes.

## Fixes

- Exercise search ignores extra leading, trailing and repeated whitespace.
- Time targets longer than an EMOM round or interval work phase show a warning while allowing intentional targets and preserving saved values.
- About links clear stale errors on retry and show the exact destination if your browser cannot open.

## Installation and compatibility

Requires Apple Silicon and macOS 14 or later. GitHub downloads are Developer ID signed and notarized, with signed in-app updates. Apple/TestFlight copies use Apple's update channel and exclude the GitHub updater.

Existing 1.0.0 EMOM and Countdown templates are retained. New interval templates require 1.1.0 or later; do not downgrade an installation containing them. GitHub and Apple sandbox installations continue to use separate local data locations.

Workouts remain local. No accounts, analytics, history, session recovery or cloud synchronization were added. Unsaved drafts are lost on quit. Targets are guides; they do not change phase lengths or add alerts. See the [privacy policy](https://github.com/StormKiln/NextRound/blob/main/PRIVACY.md).

This release publishes GitHub downloads and TestFlight. The owner controls public Mac App Store submission and release.
