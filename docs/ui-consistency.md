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
