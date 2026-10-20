# NextRound 2.10.0 — fill remaining workout slots

## Intent and authorized scope
The user approved adding a flow that preserves chosen exercises, selects a total count, filters available movements, randomly fills the remaining slots without duplicates, and offers reshuffle and Undo. Deliver as 2.10.0 to GitHub and TestFlight with issue tracking and verified publication.

## Design decisions
- Add **Fill remaining slots** alongside the existing Create a workout action in the shared exercise editor (all six workout types and session block editing). Existing replacement presets keep their replacement/ranking behavior; the shared interval-default clamp also corrects their newly generated personal seconds targets.
- Opening the dialog snapshots current entries. Keep every existing entry exactly, including order, IDs, custom descriptions, targets and intentional duplicates. Workout timing is unchanged. Empty lists can be filled too.
- Total exercise count is an integer greater than the existing count and at most 100; initial total is current count + 3 capped at 100. A full list explains the limit.
- Local filters: all eligible movements or starred favorites; category; intensity; focus areas (any selected area); saved equipment by default with a temporary Show all equipment override and settings link. A null (unset/all) equipment preference means all equipment initially; an explicitly saved empty list means no equipment; unchecking means no equipment. Filters apply only to additions. Missing metadata fails specific category/intensity/focus/equipment filters. Archived personal exercises are excluded by the existing library.
- Exclude library IDs already used and normalized names already present (including custom entries). Deduplicate the candidate pool by identity and normalized name. Existing duplicates remain untouched. Respect ladder reps compatibility.
- Select uniformly without replacement using Fisher–Yates with an injectable random source for tests. No history ranking masquerades as randomness. Reshuffle can repeat a selection by chance and is labeled accordingly.
- Preview first: show retained exercises separately from proposed additions, count eligible candidates, review target defaults. Preview/Reshuffle do not mutate the workout. Apply appends only the preview. Cancel/Escape changes nothing. One Undo restores the exact original list and is hidden after subsequent edits.
- Stable content signatures (not library array reference identity) detect changed filters/count/library/favorites/equipment and invalidate a preview; a changed workout list, mode or work-phase duration while open blocks application and asks the user to reopen. Load failures block generation and offer Retry without overwriting saved data. Interval seconds targets for new suggestions are capped at work-phase seconds, including personal defaults.
- Reuse existing dialog/button/focus controls; bounded scrolling body, fixed footer, visible focus, labeled inputs/errors and live preview status. Verify 760×620 and large text. No new dependencies, schemas, exercises or workout modes in this focused release.

## Success criteria
Pure operation tests cover preservation, duplicate exclusion, randomness, filters, capacity, custom and archived movements and mode target behavior. Browser checks cover all modes, preview/reshuffle/apply/undo/cancel, stale and error states, settings round trip and minimum-window layout. Full source/unit/native/browser checks and independent review pass. Protected PR merged, annotated v2.10.0 pushed, GitHub downloads independently verified and exact TestFlight build processed by Apple. Physical checks attempted; unobserved observations explicitly tracked instead of claimed.

## Builder check
Independent read-only review found no blocking product questions. Decisions incorporated: use content signatures for preview validity, distinguish null from empty equipment, clamp newly generated personal interval targets in the shared helper, permanently invalidate Undo after a later list edit, and include mode/work duration in stale-preview checks.
