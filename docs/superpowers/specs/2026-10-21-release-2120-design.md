# NextRound 2.12.0 design

User authorized selecting and implementing one feature, several fixes, usability improvements and new exercises through verified GitHub/TestFlight publication. Builder choices below preserve the existing offline Tauri/React architecture, six modes and session blocks. No dependencies or storage migrations.

## Feature: swap one suggested addition
Each unpinned row in Fill remaining slots offers Swap. Choose uniformly from the current filtered eligible library, excluding every current preview identity and normalized name (including the replaced movement). Replace only that slot with a newly generated compatible target. Preserve every other snapshot, ID, target, order and pin. Pinned rows require Unpin first. A swap never changes retained chosen exercises or workout timing. No alternative means an explicit message, with the whole preview and pins preserved and Apply still available. Swapping may revisit a movement absent from the current preview; no hidden history or permanent exclusions. Apply/Undo retain existing semantics.

## Reliability fixes
Latch stale source detection in Fill and Create dialogs: once exercises, mode or interval work duration change externally, returning to the original values must not silently re-enable actions. Close/reopen explicitly obtains a fresh source. Loading/errors continue to block generation.

Distinguish invalid numeric input from candidate shortages and swap availability. Only numeric errors mark the count input aria-invalid. A pool shortage explains filters/count and remains linked to the field where useful. Swap failures stay beside the preview and never move focus to the total field or destroy valid suggestions.

## UI consistency
Use a wrapped row-action group for Pin and Swap, stable slot keys and focus restoration to the swapped row's Swap button. Announce replacement names and preserved counts with a live status. Keep fixed dialog footer, adequate scroll padding and readable movement/target text at 760x620 and enlarged text. Controls have explicit names; disabled pinned Swap explains Unpin first. Cancel never changes the workout.

## Catalog
Add 20 distinct movements after researching reputable exercise references; choose a mix complementary to the existing 423, avoiding renamed duplicates. Original concise descriptions, equipment/category/type/intensity/focus/aliases, appropriate supported units and editable conservative targets. Preserve every existing record. No medical claims or external media copied.

## Acceptance
Pure tests for single-slot replacement/exclusion/immutability/pins/exhausted pool; browser tests across six modes and session editor, stale-source return, count errors, no alternatives, keyboard and minimum-window layout. Full source/native/browser checks, production WebKit and reviewed screenshots. Independent review; protected merge; tag v2.12.0; downloaded public artifacts and exact Apple-processed installer verified. Track unobserved physical checks explicitly, never claim them passed.
