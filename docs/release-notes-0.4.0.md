# NextRound 0.4.0

Build a workout more comfortably, then save it for next time.

- **Clearer Home:** artwork sits beside the introduction; matching EMOM and Countdown cards make each workout type easy to find.
- **Grouped exercises:** browse collapsible movement categories or search the full library.
- **Better exercise order:** drag movements into place, or use keyboard reordering. Spaced controls and larger targets keep reps, time, distance and calories readable. Scheduled EMOM appearances are labeled rounds.
- **Countdown checklists:** optionally add exercises and targets, with completion checkboxes during the workout. Checkmarks do not change the timer and reset when repeating.
- **Saved workouts:** save named EMOM and Countdown templates on this Mac. Search, load, rename or delete them from Home. Loaded drafts are independent copies; timing, exercise order and targets survive app restarts.
- **Update discovery:** automatic checks run on return to the app, reconnect and every 15 minutes while visible. Opt-out and dismissed-version preferences remain respected; installation still waits until your workout is finished.
- **Visual fixes:** readable Settings navigation, properly spaced exercise actions, focus rings only when needed, and a larger dark macOS icon without the outer light rim.

## Installation and updates

Apple Silicon Macs on macOS 14 or later. GitHub downloads are Developer ID signed and notarized. Existing 0.2.0/0.3.0 GitHub copies can use Settings → Updates → Check for Updates, then Install and Restart. Their older automatic-check schedule may not discover this release immediately; the improved schedule begins after installing 0.4.0. TestFlight copies update through TestFlight.

## Scope and data

Templates are stored locally; GitHub and sandboxed TestFlight installations have separate application-data locations. No accounts or cloud synchronization. Saved templates survive updates, but unsaved drafts and checklist progress do not survive quitting. Workout history and session recovery remain future work. EMOM targets describe work within fixed 60-second rounds; checked Countdown exercises never end the timer automatically.
