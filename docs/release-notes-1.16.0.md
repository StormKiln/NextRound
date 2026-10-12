# NextRound 1.16.0

## See your training summary

Workout History now shows Saved sessions, Workout time and Active days for the results matching your applied date, workout-type and search filters. All six workout modes and saved time-capped results are included. Workout time includes programmed rest and excludes pauses and lead-in; active days use local completion dates. These figures describe saved sessions, not measured exercise effort or completed target volume.

## History fixes

- Changed results must be refreshed, reviewed and confirmed again before deletion. The confirmation shows the saved note, timing, movements, targets and progress being removed.
- Delayed history reads cannot replace newer saved notes, results or deletions. Successful writes update the shared history cache directly.
- Loading and failed initial reads no longer look like empty history. Previously loaded history is clearly labelled after a failed refresh, and successful retries restore current totals.

Existing storage formats, exercise usage, saved snapshots, templates, preferences and workout timing are unchanged. macOS 14 or later on Apple Silicon. GitHub copies use the signed updater; TestFlight/App Store copies remain Apple-managed.

Publication and physical verification evidence is tracked in issue #215.
