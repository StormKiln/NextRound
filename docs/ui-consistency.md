# UI consistency

NextRound keeps its charcoal surfaces, orange primary actions and existing type scale. Changes should make equivalent tasks behave alike without hiding useful controls or changing workout semantics.

## Library cards

- Use Preview, Load/Open and Favourite as the first action group. Keep visible labels short; accessible names retain the routine name.
- Put Collections, Export, Duplicate, Rename and Delete in a second labelled group. Separate Delete visually and keep the existing confirmation.
- Wrap controls with a 12px gap and at least 44px height. Long names wrap in summaries rather than widening action labels.
- Filters apply to saved workouts and sessions together. Show successful-read match counts separately; never present a failed read as an empty library. Session results have a nearby clear-filters action.
- Label cached data and prevent current-data actions until a successful refresh. Re-read saved identity/content before load, duplication or export.

## Dialogs

Use compact confirmations, medium forms and wider detail views. Long content belongs in a bounded scrolling body; action rows remain outside it. Reserve scrollbar and focus-ring space on both narrow and larger windows. Collection membership choices are full-width rows, not inline labels.

Preserve form state while showing errors. Close/Cancel remain available when a read fails. Use visible focus, native dialog containment and explicit trigger focus where WebKit pointer activation does not focus buttons. Escape dismisses only the top dialog. Avoid broad spacing overrides when a specific component owns the layout.

## Verification matrix

| Surface | States/content | Check |
| --- | --- | --- |
| Workout/session cards | Long names, favourite, no matches, failed read | Action groups wrap; short labels; accurate counts and reset |
| Session preview | All six modes, 20 blocks, ready transitions, uncapped work | Honest duration, reachable footer, no mutation, draft confirmation, stale/deleted rejection |
| Session collections | 30 long collection names | Checkbox spacing, scrolling body, fixed Cancel/Save, keyboard focus |
| Exercise picker/generator/targets | Visible scrollbars, search, nested personal editor, equipment errors | Search/results usable; actions and errors reachable; no overlap |
| History/comparison/actuals | Long results, nested confirmations | Evidence scrolls, topmost Escape and focus restoration, preserved edits |
| Settings/backup/import | Minimum window, long content, errors | Navigation separated, Close/recovery reachable, destructive confirmation |

Run at 760×620 and a larger desktop window in Chromium and production WebKit. Record screenshots using sample data. Browser checks do not substitute for physical VoiceOver, audible cues, sleep/wake or installed upgrade observations.

## 2.4.0 library and editor behavior

- One labelled Sort saved library control affects both result lists. Recently added uses reverse saved insertion order (including legacy records); Name A–Z uses stable case-insensitive name ordering; Shortest duration puts unknown/manual-wait/uncapped durations last. Caps are not finish-time predictions. Sorting is transient, non-mutating and survives navigation/filter reset; restarting uses Recently added.
- Say Clear library filters wherever the shared filters reset. Show session — clear library filters explicitly reveals a result after a successful action; never reset silently. Keep the selected sort and editor draft.
- Announce block removal and the existing Undo action. Focus the next surviving block's Edit, otherwise the previous block's Edit, otherwise Add EMOM block. Undo focuses the restored block. Use the existing destructive button style for Remove.

## 2.5.0 session assembly

- Use Search saved library and All collections for controls shared by saved workouts and sessions.
- Choose saved workouts opens a searchable multi-selection dialog; selection order is explicit and independent of filtered results. Refresh discards stale selection and asks for a fresh review. Fixed actions remain visible while content scrolls.
- Add a new block and Update this block must have distinct instructions and commit actions. Cancelling preserves the draft.
- Move/duplicate operations announce position and focus the affected block's Edit control, including list boundaries. Undo tracks the relevant block per edit. Chooser cancellation returns focus to its invoking button, including WebKit mouse activation.
- Session, chooser and actual-performance selects use a scoped 44px minimum, explicit chevron and native select semantics. WebKit native appearance otherwise shrinks these controls to 23px despite min-height.

## 2.6.0 replacement and chooser behavior

- Replace across session shows selected occurrences explicitly; review target changes before Apply. One Undo restores the batch. Custom slots without catalog identity are separate even when names match.
- Reuse grouped exercise choices, focus/equipment filters and target editing. Keep review actions and errors outside the bounded scrolling body; return focus after Cancel, Apply and Undo.
- Clear chooser filters resets search/type/favourite filters without clearing selected order. Matching and hidden-selection counts explain why a selected item is not in the filtered list.
- Inline previews have Close preview, focus their heading when opened, and restore the preview invoker or search fallback when closed.
- Comparison and replacement selects share the scoped 44px native-select styling and visible chevron.

## 2.7.0 reusable blocks and equipment

- Separate block Edit/Save actions from arrangement controls. Save opens a named preview with bounded scrolling and fixed actions; save errors retain the entered name.
- Reveal a saved workout only through an explicit clear-filters action, keeping the session draft.
- Replacement labels include block and movement positions when names repeat. No selectable candidates appear with zero selected occurrences.
- Keep equipment status and its settings shortcut in the replacement footer. Nested settings retain search and selection and return focus. Equipment filters check types, not quantities or bench configuration.
