#!/usr/bin/env bash
set -euo pipefail
: "${TESTFLIGHT_DIR:?Run testflight-keychain first}"
: "${TESTFLIGHT_KEYCHAIN:?Run testflight-keychain first}"
: "${APPSTORE_INSTALLER_IDENTITY:?Missing installer identity}"
if [ "$(uname -m)" != arm64 ]; then
  echo 'Build on Apple Silicon for the initial macOS release.' >&2; exit 1
fi
make build-app NEXTROUND_CARGO_ARGS=--no-default-features NEXTROUND_CONFIG_PATH="$TESTFLIGHT_DIR/tauri.appstore.json"
app=apps/nextround/src-tauri/target/release/bundle/macos/NextRound.app
codesign --verify --deep --strict "$app"
python3 scripts/testflight-config.py --check-bundle "$app"
codesign -d --entitlements :- "$app" > "$TESTFLIGHT_DIR/signed-entitlements.plist"
python3 - "$app" <<'PY'
import json, os, plistlib, sys
from pathlib import Path
app=Path(sys.argv[1]); directory=Path(os.environ['TESTFLIGHT_DIR'])
expected=plistlib.loads((directory/'entitlements.plist').read_bytes())
actual=plistlib.loads((directory/'signed-entitlements.plist').read_bytes())
assert all(actual.get(key)==value for key,value in expected.items()), 'Signed entitlements differ from expected App Store permissions'
assert not actual.get('com.apple.security.get-task-allow'), 'Debug entitlement is forbidden'
assert (app/'Contents/embedded.provisionprofile').read_bytes()==(directory/'embedded.provisionprofile').read_bytes(), 'Embedded profile differs'
info=plistlib.loads((app/'Contents/Info.plist').read_bytes())
metadata=json.loads((directory/'metadata.json').read_text())
assert info['CFBundleIdentifier']==metadata['bundle']
assert info['CFBundleVersion']==metadata['build']
assert info['CFBundleShortVersionString']==metadata['version']
assert info['ITSAppUsesNonExemptEncryption'] is False
assert info['LSApplicationCategoryType']=='public.app-category.healthcare-fitness'
PY
mkdir -p testflight
xcrun productbuild --sign "$APPSTORE_INSTALLER_IDENTITY" --keychain "$TESTFLIGHT_KEYCHAIN" \
  --component "$app" /Applications testflight/NextRound.pkg
pkgutil --check-signature testflight/NextRound.pkg
cp "$TESTFLIGHT_DIR/metadata.json" testflight/metadata.json
git rev-parse HEAD > testflight/commit.txt
(cd testflight && shasum -a 256 NextRound.pkg > SHA256SUMS)
