#!/usr/bin/env bash
set -euo pipefail
stage=$(mktemp -d "${TMPDIR:-/tmp}/nextround-sandbox-smoke.XXXXXX")
trap 'rm -rf "$stage"' EXIT
app="$stage/NextRoundMediaSmoke.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
cp apps/nextround/sounds/*.wav "$app/Contents/Resources/"
python3 - "$app" "$stage" <<'PY'
import plistlib,sys
from pathlib import Path
app=Path(sys.argv[1]); stage=Path(sys.argv[2])
(app/'Contents/Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':'com.stormkiln.nextround.media-smoke', 'CFBundleExecutable':'smoke', 'CFBundlePackageType':'APPL', 'CFBundleVersion':'1'}))
(stage/'entitlements.plist').write_bytes(plistlib.dumps({'com.apple.security.app-sandbox':True}))
PY
xcrun clang -fobjc-arc -Wall -Wextra -Werror apps/nextround/src-tauri/native/media.m tests/native/media-smoke.m \
  -framework Foundation -framework AVFoundation -framework IOKit -o "$app/Contents/MacOS/smoke"
codesign --force --sign - --entitlements "$stage/entitlements.plist" "$app"
"$app/Contents/MacOS/smoke"
