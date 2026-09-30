# NextRound icon sources

Updated for 0.4.0 using the built-in image generation/edit tool, using the existing macOS icon as the edit target. The central white double-chevron and orange/white timer mark remain; the dark face is larger and the outer light bevel is removed.

Edit prompt: Preserve the central NextRound mark and proportions. Enlarge the charcoal rounded-square face to nearly fill the canvas with a small transparent exterior margin. Remove white/light outer perimeter, silver bevel and glossy rim. Keep black at the rounded edges and use genuine alpha transparency.

Opaque companion prompt: Preserve the same central mark, size and position; extend charcoal to all four square edges and corners, with no transparency, silhouette, outer ring, bevel or shadow.

`macos.png` has transparent exterior corners. `ios.png` is opaque RGB. Run `make icons` to regenerate the ICNS/iconset and iOS universal app icon. Do not flatten the macOS source onto a white background.
