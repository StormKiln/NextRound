# NextRound app icons

Derived from the approved splash-screen emblem using the built-in image-generation tool. The orange and warm-white timer ring and forward chevrons are retained; the wordmark and gym scene are removed for legibility at icon sizes.

## Assets

| Path | Use |
| --- | --- |
| `source/ios.png` | Full-resolution, opaque square iOS source artwork. |
| `source/macos.png` | Full-resolution macOS source artwork with a rounded tile and transparent outer padding. |
| `ios/AppIcon.appiconset/` | Xcode single-size iOS app-icon catalog with a 1024 × 1024 opaque PNG. |
| `macos/NextRound.icns` | Packaged macOS application icon. |
| `macos/NextRound.iconset/` | macOS PNG representations from 16 × 16 through 1024 × 1024. |

Run `make icons` on macOS to regenerate platform assets from the approved sources using `sips` and `iconutil`. No third-party image tooling is required. The source images are preserved unchanged.

These are raster assets, not layered Icon Composer files. The iOS source has square corners so the OS can apply its mask. No separate dark, tinted, or Liquid Glass variants have been authored. Packaging has been checked locally; integration and device appearance must be checked when the Tauri and Xcode projects exist.

For later integration, use the `.icns` in the Tauri macOS bundle configuration and the iOS catalog in the generated Xcode asset catalog. Do not generate the iOS icon from the padded macOS artwork.

References: [Apple asset catalogs](https://developer.apple.com/documentation/xcode/configuring-your-app-icon), [Tauri app icons](https://v2.tauri.app/develop/icons/).

## Generation prompts

Generated September 29, 2026. The iOS prompt references `assets/brand/nextround-splash.png`; the macOS prompt references the generated iOS source.

### iOS

```text
Create a production app icon derived directly from the supplied NextRound splash artwork. Output a single square 1024x1024 icon image. Preserve the identity of its central emblem: a warm-white broken circular timer ring with vivid burnt-orange segments at the upper right and an orange arc down the right, two bold white forward chevrons in the center. Match the emblem's original geometry and orange/white charcoal palette closely. Remove the NextRound wordmark and all gym equipment and scene details. Refine the emblem into crisp, near-flat, clean shapes that remain readable at 32 pixels; substantially reduce chalk distress. Center the emblem, occupying about 70 percent of the canvas, on a uniform very dark charcoal full-bleed background with only extremely subtle matte texture. This is the iOS app-icon master and shared brand master. Opaque square image, background must extend all the way to each edge and corner. No rounded exterior corners, no outer border, no drop shadow, no mockup, no text, no extra symbols, no gradients. Only one icon, no presentation sheet.
```

### macOS

```text
Create the macOS app-icon counterpart of the provided NextRound icon. Preserve the EXACT orange and warm-white broken timer ring and double forward-chevron emblem, with its geometry, color and layout unchanged within the tile. The only change is platform presentation: place that same dark charcoal square icon on a softly rounded-square macOS icon tile occupying approximately 82% of the width and height of a square 1024x1024 canvas. The tile has understated smooth corners and an extremely subtle edge highlight, no thick border, no dramatic 3D tilt, no pedestal. Center the tile with equal TRANSPARENT padding around all four sides; the canvas outside the rounded tile must have actual alpha transparency, not white, black or a checkerboard pattern. The emblem remains crisp and bold and sits proportionally inside the tile. Single finished macOS icon asset viewed straight-on. No text, no mockup or other imagery.
```
