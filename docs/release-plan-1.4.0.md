# NextRound 1.4.0 execution plan
Spec: GitHub epic #100 and #23/#95/#96/#97/#99/#101; user authorized execution and publication.
Worktree: /Users/sthirlwall/code/nextround-1.4.0
Base: 923ef5151268e7b3a9e7c439393996649a2fd298

1. #95: store-owned stop confirmation transaction, pause before opening, restore previous running state on cancel, serialize actions, leave dialog on errors. Test state transitions and races.
2. #96/#97/#99: exercise-specific editable EMOM defaults on add/starter only, custom30sec fallback, uneven slot distribution text, bounded scroll list with visible actions and accessible scrolling/reorder. Test defaults/rotation and browser geometry.
3. #23: AMRAP fixed countdown (1..86400 sec), ordered exercises with targets; explicit completed-movement counter and editable partial target units, undo across round boundaries. Count complete circuits using floor(completedMovements / count), preserve partial units and planned targets independently. Corrections available while paused and at completion before saving. No inferred reps/time-based progress, no backend. Extend TS/Rust timer, config/storage validation, routing/home/setup/runner/history/templates and tests.
4. #101: consistent1.4.0 version/docs, full checks, native validation, fresh final branch review, merge queue, close merged issues, push immutabletag, verify GitHub/TestFlight and live updater/data retention. Report blocked native observations honestly; do not rewrite completion criteria to silently waive them.

Preflight interfaces: #95 consumes native/browser control snapshot; #23 shares this unchanged. #96 editor applies defaults explicitly only for EMOM, AMRAP initializes its own required targets. #99 list shared by all builders must preserve focus/drag. #23 must update TS and Rust history validators together, old history remains valid, optional new score required only on AMRAP. No incompatible data rewrites.
