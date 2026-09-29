# Set up NextRound for macOS TestFlight

The GitHub release workflow distributes a Developer ID signed/notarized DMG. TestFlight is a separate channel: App Store distribution signing, an embedded provisioning profile, a sandboxed app, and a signed installer package uploaded to App Store Connect. The `.github/workflows/testflight.yml` workflow builds a separate sandboxed App Store installer; the GitHub DMG is not uploaded to TestFlight.

## 1. Register the explicit bundle ID

Sign in to [Apple Developer → Certificates, Identifiers & Profiles → Identifiers](https://developer.apple.com/account/resources/identifiers/list) using the team that will own NextRound.

1. Choose **+ → App IDs → App**.
2. Description: **NextRound**.
3. Bundle ID: **Explicit**, `com.stormkiln.nextround`. This must exactly match `apps/nextround/src-tauri/tauri.conf.json`.
4. Leave optional services such as iCloud, Push Notifications, and Sign in with Apple disabled; the current offline EMOM app does not use them.
5. Register the identifier. If it already exists under your team, reuse it.

Keep this identifier for the future iOS platform as well if you want one cross-platform App Store Connect record; iOS is not part of the current release.

## 2. Create the App Store Connect record

Open [App Store Connect → Apps](https://appstoreconnect.apple.com/apps), choose **+ → New App**, and enter:

| Field | Value |
| --- | --- |
| Platform | macOS |
| Name | NextRound (subject to availability) |
| Primary language | English (U.S.), or your preferred listing language |
| Bundle ID | `com.stormkiln.nextround` |
| SKU | `nextround-macos` (your internal unique identifier) |
| User access | Grant your developer/CI account access; Full Access is suitable for a solo team |

Record the numeric Apple ID shown under App Information. Select the correct team/provider if your account belongs to multiple organizations. The Account Holder may need to accept pending Apple agreements before app creation/upload works.

Source: [Apple: Add a new app](https://developer.apple.com/help/app-store-connect/create-an-app-record/add-a-new-app/).

## 3. Prepare the two signing identities

Use an **Apple Distribution** identity valid for your team and macOS submission (or the macOS-specific **Mac App Distribution** identity offered by the portal) to sign the app. A matching existing distribution identity can be reused. Export it from Keychain Access with its private key as a password-protected `.p12`.

Create/export a **Mac Installer Distribution** identity for signing the `.pkg` installer. This is separate from Developer ID Application/Installer signing for downloads outside the store. Keep each export password with its corresponding file.

If creating a certificate through the Developer portal, first generate a certificate signing request using Keychain Access → Certificate Assistant → Request a Certificate From a Certificate Authority; upload that CSR, download the issued certificate, and open it on the same Mac so it pairs with the private key.

Sources: [Apple: Certificates overview](https://developer.apple.com/help/account/certificates/certificates-overview), [Tauri: App Store packaging](https://v2.tauri.app/distribute/app-store/).

## 4. Create the provisioning profile

In [Apple Developer → Profiles](https://developer.apple.com/account/resources/profiles/list):

1. Choose **+ → Distribution → Mac App Store Connect**.
2. Select the NextRound App ID and the app distribution certificate from step 3.
3. Name it **NextRound macOS App Store**, generate it, and download the `.provisionprofile` file.

The app build must embed this exact profile and use the matching signing certificate. TestFlight for Mac requires a provisioning profile even when the app does not request special services.

Sources: [Apple: Create an App Store Connect provisioning profile](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile), [Apple: TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/).

## 5. Prepare upload authentication and CI secrets

In App Store Connect → **Users and Access → Integrations → App Store Connect API**, create a team API key named **NextRound CI** with **App Manager** access. The Account Holder must enable API access if it has not been enabled. Download its `.p8` private key and record its Key ID and Issuer ID. If you already have a suitable team key used for HeadState, you can reuse it, provided its access is appropriate; GitHub cannot reveal the stored key, so use your original backup.

Set these additional repository Actions secrets when ready:

| Secret | Value |
| --- | --- |
| `MACOS_DIST_CERT_P12_BASE64` | Base64 of the app distribution `.p12` |
| `MACOS_DIST_CERT_PASSWORD` | App certificate export password |
| `MACOS_INSTALLER_CERT_P12_BASE64` | Base64 of the Mac Installer Distribution `.p12` |
| `MACOS_INSTALLER_CERT_PASSWORD` | Installer certificate export password |
| `MACOS_PROVISIONING_PROFILE_BASE64` | Base64 of the downloaded profile |
| `APPSTORE_API_KEY_ID` | API Key ID |
| `APPSTORE_API_ISSUER_ID` | API Issuer ID |
| `APPSTORE_API_PRIVATE_KEY` | Raw contents of the `.p8` file |

These are the inputs consumed by `testflight.yml`; `release.yml` continues to use the Developer ID secrets. `KEYCHAIN_PASSWORD` can be reused for its temporary keychain. Do not replace the existing Developer ID `APPLE_CERTIFICATE` secret: GitHub downloads and App Store builds need distinct identities.

For a binary file, pipe its encoded contents directly into the appropriate secret, for example:

```sh
openssl base64 -A -in /path/to/NextRound.provisionprofile |
  gh secret set MACOS_PROVISIONING_PROFILE_BASE64 --repo StormKiln/NextRound
```

Source: [Apple: App Store Connect API](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api).

## 6. Build and upload

After changes merge, run **Actions → TestFlight → Run workflow → main**, leaving **upload** enabled. CLI:

```sh
gh workflow run testflight.yml --repo StormKiln/NextRound --ref main -f upload=true
```

Set `upload=false` to validate signing/package generation without sending a build to Apple. Pushing a stable `vMAJOR.MINOR.PATCH` tag also runs TestFlight, independently of the GitHub DMG release. Tag versions must match the committed manifests and be in main history.

The workflow runs all checks, a sandboxed native media smoke test, and validates both signing identities against `APPLE_TEAM_ID`. It also requires the app certificate to match the embedded profile. A separate generated Tauri config supplies the App Sandbox/application/team entitlements, profile, fitness category, and export-compliance metadata. It builds an Apple Silicon macOS 14+ app, verifies its signature and metadata, signs a `.pkg` with Mac Installer Distribution, then validates/uploads using `altool`.

Build numbers use `(1 + run_number // 100).(run_number % 100).run_attempt`; reruns increase the last component. Run attempts must be 1–99 and run numbers below 999,900. Start a new workflow run if the attempt limit is reached. An API preflight rejects stale retries when the generated number is not greater than recently uploaded builds; start a new dispatch instead. The workflow waits up to ten minutes for Apple processing; a timeout after upload is not proof of a failed upload. Check App Store Connect before retrying.

The installer/checksum/commit/build metadata are retained as Actions artifacts for 14 days. Credentials and generated signing files live only in runner temporary storage and are removed on completion/failure. No API key or private signing material is included in artifacts.

Audio uses in-process AVAudioPlayer with embedded WAV data. Active workouts hold a public IOKit display-idle assertion (which also prevents idle system sleep); pause, stop, completion and exit release it. Explicit sleep and closing the lid can still suspend the Mac. `make test-sandbox-media` verifies playback initiation and the assertion lifecycle in an ad-hoc signed sandboxed app. Actual audibility, route changes, and full TestFlight workout behavior still need device validation.

The Tauri updater signing key is unrelated to TestFlight. App Store/TestFlight builds use Apple's distribution/update channel. Uploading does not submit a public App Store version or invite external testers.

## 7. Enable internal testing

Once a successfully uploaded build finishes processing, open **NextRound → TestFlight → macOS**. Resolve any export-compliance prompt, create an **Internal Testing** group, add yourself as an eligible App Store Connect user, and assign the build. Install TestFlight from the Mac App Store and accept the invitation. External testers require the additional beta-review process.

Source: [Apple: Add internal testers](https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers/).
