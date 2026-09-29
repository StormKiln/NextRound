# macOS release process

0.1.0 targets Apple Silicon Macs running macOS 14 or later. It includes EMOM workouts and transient session setup; history, accounts, synchronization, iOS, and other workout types are not included.

The GitHub distribution channel is a **Developer ID signed and notarized download**. The six Apple/keychain repository secrets are configured. App Store Connect/TestFlight uses a separate signing and packaging path; see [macOS TestFlight setup](testflight-macos.md).

## Tag-triggered GitHub releases

`.github/workflows/release.yml` runs on pushed `v*` tags. Only stable `vMAJOR.MINOR.PATCH` tags are accepted. The tag must point to a commit in `main` history and agree with the versions in root/app/core package.json, Cargo.toml/Cargo.lock, and tauri.conf.json. Prepare `docs/release-notes-VERSION.md` in the same PR as a version bump.

After the release commit has merged and the remaining acceptance checks are complete:

```sh
git switch main
git pull --ff-only origin main
git tag v0.1.0
git push origin v0.1.0
```

The workflow runs the full Makefile checks and browser acceptance on the tagged source before importing credentials. It builds on Apple Silicon, signs the app and DMG, requires Apple's notarization acceptance, staples both tickets, verifies Gatekeeper acceptance, and uploads a DMG, SHA256SUMS, and commit.txt to a draft GitHub release. It publishes the draft only after every asset uploads. Missing credentials or failed verification stop publication; there is no unsigned fallback. A rerun can complete a failed draft upload, but cannot replace assets on an already published release.

Only the publication job has repository write permission. The build job uses a temporary keychain that is deleted at the end. It does not use the updater signing secret because automatic updates are not implemented in 0.1.0.

To rehearse signing without creating a tag or release, open **Actions → Release → Run workflow**, choose **main**, and run it. The verified artifacts are retained in the Actions run for 14 days; the publication job is skipped. CLI equivalent:

```sh
gh workflow run release.yml --repo StormKiln/NextRound --ref main
```

Required secrets: `APPLE_CERTIFICATE` (base64 Developer ID Application p12), `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD` (app-specific), and `APPLE_TEAM_ID`. The workflow selects exactly one valid Developer ID identity from the imported keychain and checks its team against `APPLE_TEAM_ID`.

## Local test artifacts

`make build-app` creates an ad-hoc-signed `.app` for local verification. `make build-macos` also requests a DMG. These artifacts are not the final release and must not be uploaded as a signed/notarized release.

## Signed packaging

After the implementation PR is merged and the checkout is clean, configure these values in the shell:

```sh
export APPLE_SIGNING_IDENTITY='Developer ID Application: Your Organization (TEAMID)'
export NOTARYTOOL_PROFILE='your-existing-keychain-profile'
make release-package
```

The profile must already exist in the macOS keychain. Use Apple's documented `notarytool store-credentials` flow outside the repository; do not commit credentials or place them in an issue. Keep the private signing key in the keychain.

The packaging script checks prerequisites before building, signs with Developer ID, submits the app to Apple's notary service, requires an Accepted result, staples the ticket, creates/signs/notarizes/staples a DMG, runs Gatekeeper assessment, and produces a checksum and commit identifier under `release/`. A failed check stops the script before publication.

## Publication checklist

1. Ensure all implementation issues and required CI checks are complete, and the release evidence in `docs/validation/0.1.0.md` is accurate.
2. Verify the DMG installs and opens on a clean Apple Silicon Mac. Test setup, a short EMOM, sounds, pause/resume, and completion.
3. Verify `release/commit.txt` matches the intended merged commit. Create `v0.1.0` at that commit and push the tag.
4. The tag workflow creates the GitHub release. Verify its DMG, `SHA256SUMS`, commit identifier, and release notes after the workflow succeeds. Never substitute the ad-hoc test artifact.
5. Link the published release from #12, close only satisfied acceptance criteria, then complete epic #1 and its milestone.

The same version tag also triggers the separate TestFlight workflow. To upload a beta without publishing a GitHub release, dispatch `testflight.yml` on `main`; see [TestFlight instructions](testflight-macos.md).

Creating the workflow does not itself publish a release. A successful signing rehearsal is separate evidence from a public tagged release.
