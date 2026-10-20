# NextRound 2.9.0 design

User authorizes proposing and executing a release with one feature, fixes, exercises and UI consistency. Implementation choices below are agent recommendations under that authorization.

## Outcome
Edit recovery across selected session blocks in one reviewed operation. Select blocks (all initially), enter whole seconds 0–3600 and choose automatic advance or wait until ready. Preview old → new values and total scheduled session timing. Final-block recovery is stored but unused until another block follows. Apply changes only recovery/advance; one existing Undo restores the prior draft. Cancel changes nothing. Names, IDs, configs, saved sources and history remain unchanged.

## Safety and usability
Reject empty/unknown/duplicate selection, invalid seconds, stale drafts and active/busy/pending workout ownership. Do not require unrelated blank names to be corrected just to edit recovery. Disable no-op application. Focus the seconds input initially; Cancel restores the invoker; Apply focuses the first selected block; Undo restores that block. Use the existing Dialog, controls and bounded body with fixed footer, explicit labels, visible validation and count/timing preview.

Fix the session editor footer's fixed-height content allowance: measure footer height so long notices and larger fonts never obscure trailing controls. Keep existing actions reachable at minimum 760×620 and 20px text. Fix repeat-copy invalid input semantics (upper bound and capacity). Guard general session mutations/Undo and block navigation when a workout takes ownership, including asynchronous starts; do not silently mutate active training. Surface refusal as an alert.

## Catalog
Add 20 distinct movements with original technique descriptions, truthful equipment, focus areas, aliases, supported units and defaults. Preserve all 383 existing records and IDs; total 403. Research primary exercise sources and document provenance. No copied imagery or medical claims.

## Constraints / completion
Existing Tauri/React/TypeScript/Zustand stack, no dependency or storage schema change. Offline/macOS focus. Unit, browser Chromium/WebKit, native/release tooling checks, production screenshots and independent review before protected merge. Tag v2.9.0 only on verified merged source; verify GitHub signed/notarized assets/updater and exact Apple processed TestFlight build. Track unobserved physical acceptance explicitly without claiming it passed. Keep issues updated and close implemented issues after merge; epic closes after publication.

## Builder-check resolutions
Initial values use the first block's valid recovery or 0/automatic; all selected. Preserve unknown/manual timing and show “Complete recovery values to preview timing” for incomplete nonfinal rest. Separate workout ownership from block-edit exclusion so BlockCapture remains valid. Guard async saving inside storage mutation and avoid replacing a draft that changed while awaiting I/O. Focus uses first selected block in session order. These are agent decisions within the authorized scope.
