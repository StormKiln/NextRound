#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
: "${TAURI_SIGNING_PRIVATE_KEY:?Set the NextRound updater signing key}"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="${TAURI_SIGNING_PRIVATE_KEY_PASSWORD:-}"
: "${APPLE_SIGNING_IDENTITY:?Set a Developer ID Application signing identity}"
: "${NOTARYTOOL_PROFILE:?Set an existing notarytool keychain profile name}"
case "$APPLE_SIGNING_IDENTITY" in
  'Developer ID Application: '*) ;;
  *) echo 'A Developer ID Application identity is required; refusing an alternate signature.' >&2; exit 1 ;;
esac
if [ "$(uname -m)" != arm64 ]; then
  echo 'The initial release artifact must be built on Apple Silicon.' >&2; exit 1
fi
if [ -n "$(git status --porcelain)" ]; then
  echo 'Release packaging requires a clean checkout.' >&2; exit 1
fi
security find-identity -v -p codesigning | grep -F -- "$APPLE_SIGNING_IDENTITY" >/dev/null
# A keychain path is supplied only in CI; local profiles use the default keychain.
notary_args=(--keychain-profile "$NOTARYTOOL_PROFILE")
if [ -n "${NOTARYTOOL_KEYCHAIN:-}" ]; then
  notary_args+=(--keychain "$NOTARYTOOL_KEYCHAIN")
fi
make check
# Explicit configuration overrides the ad-hoc development signing identity.
sign_dir=$(mktemp -d "${TMPDIR:-/tmp}/nextround-signing.XXXXXX")
stage=''
trap 'rm -rf "$sign_dir"; if [ -n "$stage" ]; then rm -rf "$stage"; fi' EXIT
sign_config="$sign_dir/signing.json"
python3 -c 'import json,os,sys; json.dump({"bundle":{"macOS":{"signingIdentity":os.environ["APPLE_SIGNING_IDENTITY"]}}},open(sys.argv[1],"w"))' "$sign_config"
make build-app NEXTROUND_CONFIG_PATH="$sign_config"
app=apps/nextround/src-tauri/target/release/bundle/macos/NextRound.app
codesign --verify --deep --strict "$app"
# Authority entries are only included at verbosity 2 or greater.
codesign -dvv "$app" 2>&1 | grep -F -- "Authority=$APPLE_SIGNING_IDENTITY" >/dev/null
mkdir -p release
if [ -e release/SHA256SUMS ]; then
  echo "Move the previous release/ output aside before packaging again." >&2; exit 1
fi
ditto -c -k --keepParent "$app" release/NextRound-notarization.zip
xcrun notarytool submit release/NextRound-notarization.zip "${notary_args[@]}" --wait --timeout 30m --output-format json > release/app-notarization.json
python3 -c 'import json; assert json.load(open("release/app-notarization.json"))["status"] == "Accepted", "App notarization was not accepted"'
xcrun stapler staple "$app"
xcrun stapler validate "$app"
spctl --assess --type execute --verbose "$app"
stage=$(mktemp -d "${TMPDIR:-/tmp}/nextround-release.XXXXXX")
ditto "$app" "$stage/NextRound.app"
ln -s /Applications "$stage/Applications"
version=$(node -p 'JSON.parse(require("fs").readFileSync("package.json","utf8")).version')
dmg="release/NextRound_${version}_aarch64.dmg"
hdiutil create -volname NextRound -srcfolder "$stage" -ov -format UDZO "$dmg"
codesign --force --timestamp --sign "$APPLE_SIGNING_IDENTITY" "$dmg"
xcrun notarytool submit "$dmg" "${notary_args[@]}" --wait --timeout 30m --output-format json > release/dmg-notarization.json
python3 -c 'import json; assert json.load(open("release/dmg-notarization.json"))["status"] == "Accepted", "DMG notarization was not accepted"'
xcrun stapler staple "$dmg"
xcrun stapler validate "$dmg"
spctl --assess --type open --context context:primary-signature --verbose "$dmg"
# Package only after stapling the app; sign these final archive bytes.
archive="release/NextRound_${version}_aarch64.app.tar.gz"
tar -czf "$archive" -C "$(dirname "$app")" NextRound.app
npm exec --offline --yes --package=pnpm@12.8.1 -- pnpm tauri signer sign --app-version "$version" "$PWD/$archive"
UPDATER_ARCHIVE="$PWD/$archive" make verify-updater
python3 scripts/updater-manifest.py release "$version"
(cd release && shasum -a 256 "$(basename "$dmg")" "$(basename "$archive")" "$(basename "$archive").sig" latest.json > SHA256SUMS)
git rev-parse HEAD > release/commit.txt
printf 'Signed release artifact ready: %s\nNo public release has been created.\n' "$dmg"
