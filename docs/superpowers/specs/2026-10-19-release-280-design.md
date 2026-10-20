# NextRound2.8.0 design

User authorized choosing a feature/fixes/exercises/UI scope and executing through publication. Builder choice: repeat selected session blocks, preserving existing Tauri/React architecture and storage.

Repeat selected block IDs in their existing draft order, appending1 or more additional copies of that whole sequence. Default all blocks selected and1 additional copy. Preview includes added/total block count, capacity20, resulting session time and boundary recovery/advance details. The current final block's stored transition starts applying after append; explain it. Last block still has no trailing recovery. Do not multiply prescription targets, compress work, or equate time caps with predicted finish times.

Apply validates an unchanged draft and rejects live/pending workout/block-edit ownership. Deep-copy blocks/configuration, fresh block IDs but preserve block-local exercise identities and all metadata. Original draft blocks/name/collections/favourite and saved sources/history remain unchanged. One Undo restores the exact pre-apply draft. Cancel and invalid/overcapacity requests do nothing; never truncate. Focus appended block after apply, invoking control after cancellation, original block after Undo. No asynchronous persistence in the feature.

Fixes: described inline validation for names/recovery; positional labels for transition selects; explicit final-block stored recovery summary. UI uses the existing dialog/button patterns with bounded scrolling, fixed actions and unambiguous labels. Validate760×620/1280×900,20px text, visible scrollbars, long names,20-block boundary and keyboard navigation.

Add20 distinct source-informed movements,363→383, keeping every existing record immutable. Original descriptions, complete equipment/focus/alias/type/intensity/default-target metadata; verify appropriate modes. No new dependencies or schema.

Success: meaningful regression tests and independent review; protected merge with issues closed afterwards; version2.8.0 consistent; annotatedv2.8.0 from merged source; public signed/notarized assets/updater verified; exact Apple build uploaded and processing verified. Physical acceptance/tester access explicitly separate; unavailable observations remain open follow-up. Prior acceptance/security issues stay independent.
