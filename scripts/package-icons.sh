#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

icon_root=assets/icons
mac_set="$icon_root/macos/NextRound.iconset"
ios_set="$icon_root/ios/AppIcon.appiconset"
mkdir -p "$mac_set" "$ios_set"

for size in 16 32 128 256 512; do
  sips -z "$size" "$size" "$icon_root/source/macos.png" --out "$mac_set/icon_${size}x${size}.png" >/dev/null
  retina=$((size * 2))
  sips -z "$retina" "$retina" "$icon_root/source/macos.png" --out "$mac_set/icon_${size}x${size}@2x.png" >/dev/null
done
iconutil -c icns "$mac_set" -o "$icon_root/macos/NextRound.icns"

sips -z 1024 1024 "$icon_root/source/ios.png" --out "$ios_set/AppIcon.png" >/dev/null
cat > "$ios_set/Contents.json" <<'JSON'
{
  "images": [
    {
      "filename": "AppIcon.png",
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}
JSON
printf 'Packaged NextRound macOS and iOS icons.\n'
