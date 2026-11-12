# Runtime icons and retained compatibility variants

**Runtime icon paths stay stable.** Chrome manifest, `app.html`, `popup.html`, `app.css` and `scripts/package.py` consume assets here by exact relative name. Never move or rename an installed icon without simultaneous packaged Chromium/identity acceptance and a versioned release.

- **Installed Chrome assets:** `taskbar-16/32/48.png`, `app-icon-128.png`, `favicon.ico`; six `action-*.svg` and two `view-*.svg` assets. Thirteen files total, exact path and bytes unchanged.
- **Retained non-packaged variants:** `app-icon-64.png`, `app-icon-256.png`, `icon-16/32/48/128.png`, `taskbar-64.png`. These seven files retain their paths for historical/indirect use. `icon-128.png` shares exactly the same Git blob as `app-icon-128.png`; keeping two names does not create a second binary blob.
- **Original raster artwork (filenames ending in `-master-1240.png`):** now tracked under [`assets/artwork/`](../assets/artwork/README.md), preserving byte-for-byte content. The masters were never part of the installed Chrome ZIP.

Every original file, SHA, size, consumer and disposition is catalogued in the [I1 audit](../docs/maintenance/ICON_ASSET_AUDIT.md) and [JSON inventory](../docs/maintenance/ICON_ASSET_INVENTORY.json). The mandatory coverage gate checks for path regressions and image byte/dimension integrity.
