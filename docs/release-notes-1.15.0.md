# NextRound 1.15.0

## Make a copy from Home

Choose Duplicate on a saved workout, name the copy, and keep your current setup intact. Copies preserve all workout settings and saved movement targets/descriptions across all six modes. Each copy has its own identity and starts unfavourited; the original is unchanged. If filters hide the new copy, NextRound explains why and offers Show copied workout.

## Saved-workout fixes

- Search, workout-type and favourites filters survive navigation within the app session. Restarting resets them; Clear filters remains explicit.
- New operations replace outdated success/recovery messages, including after a failed refresh.
- Older pending reads cannot replace a freshly refreshed library or successfully saved mutation.
- Deletion and duplication check that the source name/configuration still matches what you reviewed. Changed records require refresh and reconfirmation; favourite-only changes do not block the operation. Typed names survive retry, and refreshed workout settings are available to review.

Existing data formats, history, exercise usage, snapshots and workout timing are unchanged. Saved workouts remain limited to 100. macOS 14 or later on Apple Silicon. GitHub copies use the signed updater; TestFlight/App Store copies remain Apple-managed.

Publication and physical verification evidence is tracked in issue #207.
