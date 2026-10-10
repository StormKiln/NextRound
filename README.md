# NextRound

![NextRound — white and orange interval-timer emblem against a charcoal gym backdrop](assets/brand/nextround-splash.png)

Plan your workout. Run the clock. Track your progress.

NextRound is a workout companion for CrossFit and functional fitness. It brings together workout timers, a history of completed workouts, a library of exercises, and recommendations matched to the time, equipment, and intensity available for a session.

The initial platforms are **macOS desktop** and **iOS**.

> Status: **1.11.0 macOS release**. Includes Ladder, For Time, EMOM, AMRAP, Countdown and work/rest interval timers, exercise targets and checklists, grouped exercise browsing, saved local workout templates and completed-session history with repeat-attempt comparisons, history-based exercise suggestions and whole-workout generation, configurable window behavior, and separate GitHub/App Store update channels. GitHub downloads are signed and notarized. iOS, cloud sync, and duration/intensity-based workout recommendations remain planned.

[Privacy policy](PRIVACY.md) · [Release notes](docs/release-notes-1.11.0.md)

## Product scope

### Workout tools and timers

- Provide timers for running workouts.
- Proposed initial modes: stopwatch / for-time, countdown, AMRAP (as many rounds or repetitions as possible), EMOM (every minute on the minute), and configurable work/rest intervals.
- Support starting, pausing, resuming, and completing a session, with clear indications of the current interval and remaining time.
- Connect the active workout and its timer to a saved workout result.

### Workout history

- Record completed workouts and review previous sessions.
- Proposed result fields include date, workout performed, duration, rounds, repetitions, loads, scaling, and notes where relevant.
- Compare repeat attempts at the same workout.
- Preserve the workout as performed so later edits to a template or exercise do not rewrite historical results.

### Exercise library

Store reusable exercises with:

| Attribute | Purpose |
| --- | --- |
| Name | Identify the movement. |
| Description | Explain the exercise and how to perform it. |
| Required equipment | Identify what is needed to perform the exercise. |
| Type | Categorize movements, such as strength, conditioning, gymnastics, or mobility. |
| Intensity | Describe the intended effort; the scale still needs to be defined. |

Proposed additions include scaling options and substitutions. Exercise intensity is contextual: load, pace, repetitions, rest, and the athlete affect the effort of a complete workout.

### Workout library and recommendations

- Store workout definitions composed of exercises, prescriptions, and timing or scoring rules.
- Recommend workouts using conditions such as available time and desired intensity.
- Include available equipment as a proposed initial recommendation constraint, using exercise equipment requirements.
- Show why each recommendation fits and distinguish estimated duration from a fixed time cap.
- If no workout meets the constraints, explain the mismatch instead of silently relaxing them.

Example: “I have 20 minutes, a kettlebell, and want moderate intensity.” NextRound should suggest suitable workouts, explain the match, provide the appropriate timer, and save the completed result.

The recommended first implementation is transparent filtering and ranking of stored workouts. Generative AI is not a prerequisite; personalized or generated programming can be evaluated later.

## Initial platform experience

- **macOS:** a desktop application for managing exercises and workouts, reviewing history, and running training sessions.
- **iOS:** a touch-friendly application for choosing workouts, using timers, and recording results during training.
- Share the product model and most UI code, while adapting navigation, layout, keyboard interactions, and touch targets to each platform.

## Proposed technical direction

Use a **monorepo with one Tauri 2 application targeting macOS and iOS**, backed by a shared React interface. Separate desktop and mobile React applications are unnecessary initially; isolate platform-specific behavior behind small adapters.

| Technology | Intended role |
| --- | --- |
| Tauri 2 | Application shell, native capabilities, and macOS / iOS packaging. |
| React + TypeScript | Shared application UI and typed feature code. |
| Vite | Frontend development server and production asset builds. |
| shadcn/ui | Accessible UI building blocks owned and customized in the repository. |
| Tailwind CSS | Styling, responsive layouts, and design tokens. |
| Zustand | Ephemeral client state, such as workout selection, editing state, and active-session UI. |
| TanStack Router | Typed application navigation. |
| TanStack Query | Asynchronous reads, mutations, caching, and invalidation through the persistence layer. |

Use the **latest stable compatible releases at scaffolding time**, then pin the resolved toolchain and commit lockfiles for reproducible builds. Do not use prerelease or canary versions by default. As of September 29, 2026, React's official documentation lists React 19.3; shadcn/ui documents support for React 19 and Tailwind CSS 4. Recheck exact releases and peer compatibility when installing dependencies.

TanStack refers here to Router and Query. Add other TanStack libraries only when a feature needs them. Keep persisted workout data in the persistence layer; avoid maintaining competing copies in Zustand and Query.

### Proposed repository layout

The workspace layout is:

```text
NextRound/
├── apps/
│   └── nextround/
│       ├── src/              # Shared React UI, routes, and feature integration
│       └── src-tauri/        # Tauri shell, native adapters, and platform configuration
├── packages/
│   └── core/                 # Exercise/workout types, validation, recommendation rules
├── docs/                     # Product decisions and implementation notes
├── Makefile                  # Consistent development, checks, and packaging commands
└── README.md
```

Application components remain in the app; shared validation and timeline types live in `packages/core`. pnpm 12.8.1 manages the workspace with committed JavaScript and Rust lockfiles. The root Makefile provides development, validation, and packaging commands.

### Persistence and synchronization

**Recommendation, pending a product decision:** make core workouts, exercise browsing, timers, and history usable offline, with durable local storage such as SQLite. Cross-device synchronization between macOS and iOS is a separate requirement to decide before finalizing the data model and persistence architecture.

No backend, account system, cloud provider, or synchronization service has been selected. Local persistence alone does not synchronize devices.

### Timer and native integration validation

Validate the timer experience on a physical iPhone early, including screen locking, backgrounding, interruptions, and returning to an active workout. Treat JavaScript callbacks as UI refresh triggers rather than the source of elapsed time; persist enough session state to reconstruct the timeline on resume.

Continuous background execution and audible interval alerts must be validated separately from restoring an accurate timer display. Evaluate native integrations for notifications, audio, haptics, and keeping the display awake where needed. If these requirements cannot be met satisfactorily with Tauri integrations, reconsider the iOS shell while retaining shared domain logic.

## Proposed delivery sequence

1. **Foundation:** scaffold the workspace and Tauri app; establish Makefile workflows; launch on macOS and an iOS device; validate critical timer lifecycle behavior.
2. **Library:** create and edit exercises and workout definitions, including equipment, type, and intensity attributes.
3. **Training:** select a workout, run its timer, record a result, and browse history.
4. **Recommendations:** filter and rank workouts by time, intensity, and equipment, with explanations.
5. **Distribution:** establish signing, packaging, and release workflows for both platforms. Decide on TestFlight and macOS distribution channels before release.

## Initial acceptance criteria

- The application launches on macOS and iOS.
- An exercise can be saved with its description, equipment, type, and intensity and retrieved after restarting the app.
- A workout can reference stored exercises and define timing and scoring requirements.
- A user can run a workout timer, save a result, and find it in history after restarting.
- Editing a workout template does not alter a previously recorded result.
- Recommendations respect the selected time, equipment, and intensity constraints, and explain matches or lack of matches.
- Timer behavior through pause/resume, screen lock, and background/foreground transitions is tested on a physical iPhone, with supported alert behavior explicitly documented.

## Decisions still to make

- Whether cross-device synchronization and accounts are required for the first release.
- Intensity vocabulary, equipment taxonomy, and rules for estimating workout duration.
- Whether the initial exercise and workout library is curated, user-created, or both.
- Expected timer alerts while the phone is locked or the app is backgrounded.
- Supported macOS and iOS versions, package manager, application identifiers, and distribution channels.

## Development status

See [CONTRIBUTING.md](CONTRIBUTING.md) for the PR workflow, required checks, and merge queue. PRs into `main` do not require reviewer approval.

### Local development

Prerequisites: macOS 14 or later, Node 24.3.0 (see `.node-version`), Xcode command-line tools, and Rust via rustup. `rust-toolchain.toml` pins Rust 1.98.1. The Makefile bootstraps pnpm 12.8.1 through npm without changing global tooling.

```sh
make install       # Install the locked workspace dependencies
make dev           # Run the macOS Tauri application
make dev-web       # Browser preview; production timing runs natively
make check         # Types, unit tests, Rust tests/lints, frontend lint/build
make test-e2e      # Browser interaction tests (install Chromium first)
make build-app     # Produce a local ad-hoc-signed .app for testing
make build-macos   # Produce the app and DMG for local testing
```

Before `make test-e2e`, install its browser with `npm exec --offline --yes --package=pnpm@12.8.1 -- pnpm exec playwright install chromium` after `make install`.

The app bundle is generated in `apps/nextround/src-tauri/target/release/bundle/macos/`. Initial distribution targets Apple Silicon. Local test builds are not Developer ID signed or notarized and are not public releases. See [release instructions](docs/release.md) for the signed distribution process.

Run `make icons` to regenerate the [macOS and iOS icons](assets/icons/README.md), or `make sounds` to regenerate the original offline audio cues.

### EMOM behavior

Choose 1–1440 whole minutes, 0–3600 lead-in seconds, and 0–59 warning seconds. At least one exercise is required. Exercises repeat in order; 15 minutes with three exercises gives five turns each. Lead-in and pauses do not consume workout time. The timer tocks on each positive warning second, beeps at workout start and each new minute, and plays a distinct completion sound after the last round.

The native process owns timing and plays bundled sounds independently of webview refreshes. Pause/stop cancels current sound playback. The app requests that macOS stay awake while running; if the timer process is suspended or detects a long system interruption, it pauses without replaying missed cues and asks you to resume. Normal backgrounding does not pause the workout. Escape exits full screen without ending the workout.

Workout setup and completion are transient in 0.1.0: they are not saved across app restarts. No account or network connection is required to run a workout.

## Technical references

- [Tauri overview and supported platform approach](https://v2.tauri.app/start/)
- [Tauri prerequisites, including Apple development requirements](https://v2.tauri.app/start/prerequisites/)
- [Tauri iOS signing](https://v2.tauri.app/distribute/sign/ios/)
- [React versions](https://react.dev/versions)
- [shadcn/ui with Tailwind CSS 4 and React 19](https://ui.shadcn.com/docs/tailwind-v4)
- [TanStack libraries for React](https://tanstack.com/libraries/react)
- [TanStack Query overview](https://tanstack.com/query/latest/docs/framework/react/overview)

### 0.2.0 desktop experience

Start on Home, choose **Build an EMOM**, and return home without losing the setup in your current session. Open **Settings** from the toolbar or Command-comma for app information and software updates. The branded startup screen stays visible for at least three seconds.

GitHub installs support signed updates from Settings starting with 0.2.0; 0.1.0 users need one manual upgrade. Updates never install during a running or paused workout. TestFlight/App Store builds update through Apple. See [0.2.0 release notes](docs/release-notes-0.2.0.md).

### 0.3.0

Choose EMOM or a fixed-duration Countdown from Home. The bundled picker now contains 43 exercises, including 20 kettlebell movements, five extra variations each of push-ups/planks/bodyweight squats, and rowing-machine rowing. Set per-exercise repetition, time, distance or machine-calorie targets; see [exercise sources](docs/exercise-sources.md). EMOM rounds remain 60 seconds.

Red-close minimizes by default and keeps workouts running. General Settings can switch it to Quit, retaining active-workout confirmation. Click the Dock icon to restore the window. See [0.3.0 release notes](docs/release-notes-0.3.0.md).

### 0.4.0: build once, use again

Home now has matching, clearly labeled workout cards. Exercise selection groups movements into collapsible categories; drag handles support pointer and keyboard reordering. Countdown can include an optional exercise checklist. Save named EMOM/Countdown templates locally and load, search, rename or delete them from Home. Templates persist across restarts; workout history and active-session recovery are still future work. See [0.4.0 release notes](docs/release-notes-0.4.0.md) for update behavior and data boundaries.

### 1.2.0: local workout history

Choose **Save result** after completing EMOM, Countdown or Intervals to keep the date, active duration, configuration, exercise descriptions/targets and countdown checkmarks. The header's **Workout history** button opens your log. View details, load a copy into setup with **Repeat from setup**, or delete a result with confirmation. Completed results stay independent of later template edits.

History is stored offline in a separate versioned JSON document with atomic native writes, alongside existing templates/settings. Retrying a save does not duplicate the session. Unsaved results require save/discard before navigation, another workout, quit or updater installation. Cancelled/partial sessions and process-crash recovery are not included. Targets are prescriptions, not measurements; pause and lead-in time are excluded from active duration (scheduled interval rest remains included). No history existed before 1.2.0, so old sessions cannot be reconstructed.

GitHub and sandboxed Apple builds keep separate app data; changing distribution channels does not transfer history. See [Privacy policy](PRIVACY.md).

### 1.3.0: exercise suggestions from saved history

The exercise picker displays how many retained saved workouts contain each catalog exercise, once per session regardless of repeated rounds or entries. Choose **My favorites**, **Try something new**, or **Mix it up** to review up to three suggestions before adding one. Existing search applies and suggestions exclude catalog exercises already in the current setup; manual repeats remain available.

Ranking is deterministic: favorites sorts by descending count, new by ascending count, with English name/ID ties. Mix partitions eligible exercises into a lower-count half (rounded up) and the remaining higher-count half, then alternates higher/lower/higher with fallback if a pool runs out. With all-zero eligible counts, use neutral alphabetical ordering. These heuristics offer variety, not balanced programming or personalized coaching.

Counts derive from local retained history; deleting a saved result removes its contribution. Custom and legacy entries without catalog identity are excluded and disclosed, never matched by name. Catalog identity survives templates and repeat flows. A read failure shows unavailable usage and retry, not fabricated zero counts. No new backend, account, AI service or data upload is involved.

### 1.4.0: AMRAP and workout setup fixes

AMRAP adds a fixed time cap, ordered circuit, explicit movement completion/undo and mixed-unit partial progress. Review scores before saving; targets are planned work, not measured performance. Stop confirmation pauses the timer until a decision. New EMOM entries receive editable defaults, uneven rotations are explained, and long exercise lists scroll with add controls outside the list. Existing templates/history are preserved. See the [release notes](docs/release-notes-1.4.0.md) for defaults and limitations.

### 1.5.0: equipment-aware exercise selection

Save your available equipment in **Settings → Equipment** to filter browsing and suggestions. Unconfigured settings show all equipment; saving an empty selection shows known no-equipment exercises. **Show all equipment** temporarily overrides filtering until the picker closes. Changing equipment never removes entries from a workout, template or history. Custom movements remain available, with unassessed equipment requirements.

The catalog now has 63 exercises, including 20 new bodyweight, single-dumbbell and equipment movements. Long AMRAP circuits keep the active movement visible on advance, undo and wrap. Recovered timer read/control errors clear independently. See [1.5.0 release notes](docs/release-notes-1.5.0.md).

### 1.6.0: find your focus

Browse the exercise picker by type or focus area, and filter by any selected area alongside your saved equipment and search. The catalog has **83 exercises**, including 20 new equipment-free movements. Presets and filters survive a visit to Equipment settings; common spellings such as “deadbugs” and “inchworms” are searchable. Filtered-out exercise history no longer looks like missing history. See [1.6.0 release notes](docs/release-notes-1.6.0.md).

### 1.7.0: finish on your terms

For Time counts active elapsed time, with an optional cap and ordered checklist. Finish manually, or record a distinct time-cap outcome; save, repeat or load it like other modes. The catalog now has **103 exercises**, including 20 whole-body/core additions. Search reopens matching groups, empty results offer filter recovery, and dialogs reserve scrollbar space. Setup/history screens load on demand from packaged assets. See [1.7.0 release notes](docs/release-notes-1.7.0.md).

### 1.8.0: one rung at a time

Ladder is the sixth workout mode: ascending, descending or pyramid reps, an exact preview, an optional time cap, and explicit movement completion/undo. Every movement follows the same rep sequence; the final movement pauses for confirmation. Saved results distinguish finished from capped sessions and record only the movements you marked complete.

Load a saved workout and choose **Update saved workout** to retain its identity, or **Save as new** for a separate copy. History now filters by workout type and exercise name/description. Setup errors stay with their mode and guide keyboard focus to the field needing correction. Existing 103 exercises are unchanged; [taxonomy and content policy](docs/exercise-taxonomy.md) documents their meaning and limits. See [1.8.0 release notes](docs/release-notes-1.8.0.md).


### 1.9.0: your own exercise library

Open **My exercises** on Home to create personal movements or copy a bundled exercise. Set category, equipment, focus areas, supported target units and an optional default target. Use **Manage my exercises** from any picker, or explicitly **Save to library** on a workout-local Custom movement. The library holds up to 500 personal entries including archived entries; bundled exercises remain read-only.

Personal movements participate in search, equipment/focus filters and usage-based suggestions across all six modes. EMOM and AMRAP ask for a target when no personal default exists. Ladder uses reps-compatible movements and its rung targets. Archive hides a movement from future selection; restore makes it available again. Editing and archiving never rewrite saved workout/result snapshots. Duplicate names remain distinct identities, and old unlinked Custom entries are never matched by name.

Personal exercises are local to this installation, with no sync or account. Archive is reversible and does not erase the record; permanent deletion is not offered in this release. Corrupt or newer library data is preserved, with retry and bundled choices still available. See [1.9.0 release notes](docs/release-notes-1.9.0.md).

### 1.9.2: generate a complete exercise order

On any workout setup page, choose **Create a workout**, select **My Favorites**, **Try something new**, or **Mix It Up**, then enter the number of exercises. Generation uses saved workout history, saved equipment and the mode’s supported targets; it preserves your timing. No history means alphabetical suggestions. Review and edit the suggested targets before starting. **Undo generated workout** restores the previous list until you edit it. Insufficient eligible exercises or unreadable data leave your current draft unchanged.

In the exercise picker, **Show all equipment** starts checked when equipment preferences are unset. Uncheck it to see only equipment-free movements, or save your equipment in Settings. This temporary choice resets when the picker closes. Home now separates the personal-library action from the workout cards.

### Repeat-attempt comparisons (1.10.0)

In Workout history, open a result and choose **Compare attempts**. Matching uses the saved movement identities, names/descriptions, order, targets and workout rules, while ignoring transient entry IDs and presentation settings. Changed prescriptions stay separate. Completed For Time and Ladder attempts compare active time; AMRAP compares recorded progress. Fixed-duration workouts do not infer improvement from the clock, and cap-reached attempts are not ranked as faster completions. All comparisons are calculated locally without altering saved data.


### Replace a movement (1.11.0)

Use **Replace** beside an exercise in any of the six workout builders. Choose a movement using the existing search, focus-area and equipment filters. Its place in the order and the workout timing stay the same. Compatible targets are kept; unsupported target units receive an explained replacement suggestion. Review suggested targets before starting. Ladder continues to use its rung schedule, and new interval time suggestions fit the work phase.

**Undo replacement** restores just the last replaced movement, preserving timing changes and edits to other entries. It expires when that movement is edited, removed, replaced again, or you leave the builder. Existing saved workouts change only when explicitly saved; previous workout results are never rewritten.

The workout generator also links directly to equipment settings while retaining the requested count and preset. Invalid counts receive keyboard focus for correction. Closing a comparison returns focus to its history result, or the history heading if that result has disappeared.

### Saved-workout favourites

Mark a saved workout as a favourite, then combine **Favourites only**, **Workout type**, and name search to find your next session. Renaming or updating a workout preserves its favourite status; saving a new copy starts unfavourited. **Refresh saved workouts** recovers from records changed elsewhere, and stale renames ask you to review the current name before trying again. Favourite metadata stays on your Mac. Use 1.12.0 or later to edit a library containing favourites.
