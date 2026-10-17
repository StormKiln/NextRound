## Outcome
NextRound 2.0 turns individual workouts into complete training sessions: build a warm-up, main workout, finisher and cooldown; run them together; record what you actually did; and protect your local training data.

## Agreed scope
- Multi-part sessions using all six existing workout modes, configurable between-block rest, automatic or Ready-to-continue transitions, and block/overall progress.
- Actual performance logging, with planned targets kept separate, plus meaningful comparisons.
- Home organised around starting and continuing training, with single-workout access retained.
- Full local backup and restore, plus safe migration of existing data.
- Focused usability/reliability fixes, including #294.

## Planning defaults
These are implementation recommendations, not additional user-stated requirements. A session contains 1–20 ordered workout blocks; each embeds an independent snapshot of an existing workout configuration. Existing standalone workouts remain usable unchanged. Each boundary has optional rest followed by either automatic advance or an explicit Ready action. Each block keeps its own configured lead-in; previews include both lead-in and transition rest. Uncapped blocks and manual waits make the total duration unknown, never a falsely precise countdown. Pauses are extra.

Recovery after an interruption requires explicit resume and starts paused; downtime is not silently treated as completed exercise. Results are explicitly saved, distinguish complete/partial/skipped work, and use retry-safe identities. Performance logging is optional, manually entered and distinct from prescribed targets; there is no sensor-based measurement.

Backup/restore is local, versioned and validated. Restore replaces the supported local dataset only after a preview and explicit confirmation, creates a rollback copy, and cannot run during active training or unresolved results. Sharing a session is separate from backing up personal history/preferences.

## Boundaries
Keep the existing Tauri/React monorepo, macOS 14+ Apple Silicon support, offline/no-account operation and separate GitHub/Apple update channels. Preserve existing workouts, history, exercises, favourites, collections and preferences. Existing workout/collection files remain readable. No forced database rewrite merely because this is a major release: record the persistence decision before implementation.

Calendar/training plans, cloud sync/accounts, iPhone delivery, automatic coaching, new exercise seeding and extra workout modes are not required for 2.0. Exercise substitutions and broader recommendations remain #16/#20. Older release-specific physical acceptance remains in its own issues.

## Success and issue discipline
Keep children updated with implementation, verification and blockers; close implementation issues only after verified protected merge. File discoveries and add them only when they fit this scope. Release acceptance requires immutable v2.0.0, verified GitHub signed/notarized artifacts and updater, the exact TestFlight build processed and available to intended testers, and recorded physical installed-upgrade checks. Upload success alone does not prove installed acceptance. App Store review submission is separate.

## Linked implementation and acceptance
- [ ] #298 — Design versioned session/result storage and lossless 1.x migration
- [ ] #299 — Build a multi-part training session editor
- [ ] #300 — Run multi-part sessions with reliable timing and transitions
- [ ] #301 — Recover interrupted sessions and unsaved results safely
- [ ] #302 — Log actual workout performance separately from planned targets
- [ ] #303 — Show session history and comparable actual performance
- [ ] #304 — Save, organise and share reusable multi-part sessions
- [ ] #305 — Back up and restore all local training data safely
- [ ] #306 — Refresh Home around starting and continuing training
- [ ] #307 — Harden session dialogs, scroll regions and accessible controls
- [ ] #308 — Validate and publish NextRound 2.0.0 to GitHub and TestFlight
- [ ] #294 — Clear filters validation-only fix

## Delivery order
Storage/schema → editor → runner → recovery and actual logging → history and reusable sessions → backup/restore and Home → accessibility/regression hardening → release acceptance. Each child records its concrete prerequisites. Existing #14/#17/#18/#19 are related umbrella backlog; assess their remaining requirements separately rather than closing them automatically.
