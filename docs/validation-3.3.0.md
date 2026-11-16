# 3.3.0 validation

Epic [#490](https://github.com/StormKiln/NextRound/issues/490); publication [#489](https://github.com/StormKiln/NextRound/issues/489). Implementation is in #491 (22 new movements, #488) and #492 (Favorites group, #487).

## Favorites group
- The picker's exercise list starts with an open **Favorites** group. It lists every starred movement that passes the current search, equipment, phase and focus filters, alphabetically and with no cap. It appears in both the *Type* and *Focus* groupings.
- The capped **My favorites** suggestion preset is removed from the picker. *Create a workout* and *Fill remaining slots* keep their favourites sources.
- When you unstar from inside the group, its row is removed, so focus moves to the exercise search.
- Coverage:
  - `exercise-recommendations.test.ts`: more than three favorites, search, toggling, hidden states and the removed preset.
  - `favorites-330.spec.ts`: seeded favorites, starring and unstarring, and adding from the group.
  - `release-1180` and `release-1120` were updated for the star control appearing twice.

## Catalog
- 473 → 495 movements. `catalog-330.test.ts` checks:
  - the 473-record prefix, against `catalog-320-baseline.json`;
  - no name or alias collisions;
  - complete metadata;
  - every alias is searchable;
  - valid targets in every mode, including Ladder;
  - the requested search terms.
- Search aliases were added to Jump squat, Kettlebell alternating gorilla row, Butt kicks, Plank jack and Kettlebell halo. They're pinned exactly in the test.
- No new movement is tagged for warm-ups or cool-downs, so the 3.2.0 pools are unchanged.

## Checks
- `make check` on the release branch (exit 0): 419 unit tests and 72 native tests, release tooling, types, lint and build.
- #491 and #492 each passed Full validation on the PR and in the merge queue.
- Locally, the full Chromium e2e run on #492 had 445 passing tests and one failure, in `release-1240` (an unrelated session-library reload check). That test then passed 3/3 when repeated on its own.

## Not observed
- The native app on a physical Mac.
- A TestFlight tester installation.

Results from the tagged release are recorded on #489.
