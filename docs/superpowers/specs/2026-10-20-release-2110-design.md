# NextRound 2.11.0 design

User authorized choosing and executing a release containing one feature, multiple fixes, new exercises and UI consistency work. Builder choices below build on the existing React/Tauri app, without new dependencies or persistence schemas.

## Feature: keep selected random additions
In Fill remaining slots, each proposed addition has a labelled Pin toggle. Pinned entries keep their exact snapshot and position during reshuffle; unpinned positions are randomly filled from the eligible pool excluding retained and pinned identities/names. Original chosen exercises remain unchanged. Pins are temporary to this preview and do not become favorites or persist. All pinned disables Reshuffle with an explanation. Unpin re-enables it. Reshuffle can repeat unpinned movements by chance. Apply and Undo retain existing exact snapshot semantics. All six modes and session blocks share the implementation.

Changing total, filters or eligible library content invalidates the entire preview including pins. Opening equipment settings without changes preserves them. A stale workout blocks Apply. Clear filters resets category/intensity/favorites/focus and the equipment override to the saved preference, preserves total, and invalidates preview/pins. Display an explicit preview-reset notice after local filter/count changes to avoid silently losing pins.

## Fixes and usability
- Create a workout Retry must refetch failed session history as well as workout history; recovery must not require closing the dialog or mutate unreadable storage.
- Create a workout must capture its source exercises/mode/workSeconds and refuse generation if those change while open, matching Fill remaining slots. Initial focus goes to exercise count.
- Both generation dialogs use shared labelled controls, consistent spacing, stable scrollbar gutters and fixed actions. Fill preview rows keep name/target and Pin control separated and wrap long names at 760x620 and larger text. Expose a clear, scoped Clear filters action in Fill.

## Catalog
Add 20 distinct movements, using existing equipment/focus/type/intensity metadata and original concise descriptions with counting/side guidance. Preserve all 403 existing entries. Research technique references and record sources; no external media or medical claims. Defaults must use supported units and fit interval duration. Exact selection is a builder choice based on duplicate checking.

## Delivery
Tests first for changed behavior; full unit/native/Chromium plus production WebKit and native UI checks where available. Capture current UI, update version/docs, independent review, protected PR and merge queue. Tag merged source v2.11.0, verify GitHub assets/signatures/notarization/updater and Apple-processed exact TestFlight build. Issues close after merge, publication/epic only after verified release. Report unobserved physical checks honestly.
