# macOS release process

0.1.0 targets Apple Silicon Macs running macOS 14 or later. It includes EMOM workouts and transient session setup; history, accounts, synchronization, iOS, and other workout types are not included.

The selected distribution channel is a **Developer ID signed and notarized GitHub download**. Publication is intentionally blocked until a Developer ID Application identity and a notarytool keychain profile are available. The locally installed Apple Distribution certificate is for a different distribution channel and must not be substituted. The user explicitly chose to finish the app and leave signed publication blocked.

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
4. Create a GitHub release attaching the signed/notarized DMG and `SHA256SUMS`, with `docs/release-notes-0.1.0.md` as release notes. Never substitute the ad-hoc test artifact.
5. Link the published release from #12, close only satisfied acceptance criteria, then complete epic #1 and its milestone.

No release tag or public release should be created while signing/publication remains blocked. This document and the preflight script prepare the path without claiming that an unavailable signing identity was tested.
