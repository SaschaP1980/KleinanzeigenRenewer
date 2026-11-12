# KAR-167 I1 — icon/media provenance and compatibility audit

**Current Work basis:** `2a0517b73ccbcb6f92c7a26548ad36e1fe17ded6` (main `e5b1ebceab4bd16116f1cd6532f08e56e1cdfde2`, v1.23.59). This is a source-tree organization change; no icon pixel, CSS path, Chrome manifest, ZIP, native host or release bytes are modified.

## Individually classified assets (22/22)

The complete machine-readable inventory, exact source Git blob hashes and packaging roles are in [ICON_ASSET_INVENTORY.json](ICON_ASSET_INVENTORY.json). This table covers **every original icon path**, not just the two masters.

| Original | Current canonical location | Decision | Packaged Chrome runtime? | Evidence |
| --- | --- | --- | --- | --- |
| `icons/action-delete.svg` | `icons/action-delete.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-delete mask; installed Chrome ZIP; current UI surface |
| `icons/action-finish-renewal.svg` | `icons/action-finish-renewal.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-finish-renewal mask; installed Chrome ZIP; current UI surface |
| `icons/action-new-listing.svg` | `icons/action-new-listing.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-new-listing mask and v1212 layout regression; installed Chrome ZIP |
| `icons/action-retry.svg` | `icons/action-retry.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-retry mask; installed Chrome ZIP |
| `icons/action-update.svg` | `icons/action-update.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-update mask; installed Chrome ZIP |
| `icons/action-zip-export.svg` | `icons/action-zip-export.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .action-zip-export mask; installed Chrome ZIP |
| `icons/app-icon-128.png` | `icons/app-icon-128.png` | KEEP_PACKAGED_RUNTIME | YES | manifest.icons[128], app/popup link, installed Chrome ZIP; hash-pinned in v11710 taskbar test |
| `icons/app-icon-256.png` | `icons/app-icon-256.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Non-distributed PNG resolution variant retained at stable path; source history, independent past/manual users not disproved |
| `icons/app-icon-64.png` | `icons/app-icon-64.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Non-distributed PNG resolution variant retained at stable path; source history, independent past/manual users not disproved |
| `icons/app-master-1240.png` | `assets/artwork/app-master-1240.png` | MOVE_BINARY_SHA_IDENTICAL | NO | Original high-resolution raster design/master; not in manifest, HTML/CSS or explicit Chrome ZIP contents; move SHA-identically to assets/artwork |
| `icons/favicon.ico` | `icons/favicon.ico` | KEEP_PACKAGED_RUNTIME | YES | app/popup HTML multi-resolution favicon, installed Chrome ZIP; hash-pinned in v11710 |
| `icons/icon-128.png` | `icons/icon-128.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Legacy 128px alias byte-identical to packaged icons/app-icon-128.png (same Git blob SHA); retained for historical path compatibility |
| `icons/icon-16.png` | `icons/icon-16.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Legacy PNG resolution variant not packaged; retained for historical/indirect usage pending proof |
| `icons/icon-32.png` | `icons/icon-32.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Legacy PNG resolution variant not packaged; retained for historical/indirect usage pending proof |
| `icons/icon-48.png` | `icons/icon-48.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Legacy PNG resolution variant not packaged; retained for historical/indirect usage pending proof |
| `icons/taskbar-16.png` | `icons/taskbar-16.png` | KEEP_PACKAGED_RUNTIME | YES | manifest.action.default_icon[16] and manifest.icons[16], installed Chrome ZIP; SHA256 pinned in v11710 |
| `icons/taskbar-32.png` | `icons/taskbar-32.png` | KEEP_PACKAGED_RUNTIME | YES | manifest.action.default_icon[32], manifest.icons[32], HTML, Chrome ZIP; SHA256 pinned in v11710 |
| `icons/taskbar-48.png` | `icons/taskbar-48.png` | KEEP_PACKAGED_RUNTIME | YES | manifest.action.default_icon[48] and manifest.icons[48], Chrome ZIP; SHA256 pinned in v11710 |
| `icons/taskbar-64.png` | `icons/taskbar-64.png` | KEEP_NONPACKAGED_COMPATIBILITY | NO | Non-distributed PNG resolution variant; retained at stable path for source/manual usage |
| `icons/taskbar-master-1240.png` | `assets/artwork/taskbar-master-1240.png` | MOVE_BINARY_SHA_IDENTICAL | NO | Original high-resolution raster taskbar master; not in manifest, HTML/CSS or explicit Chrome ZIP contents; move SHA-identically to assets/artwork |
| `icons/view-compact.svg` | `icons/view-compact.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .view-mode-compact mask and v1212 test; installed Chrome ZIP |
| `icons/view-detailed.svg` | `icons/view-detailed.svg` | KEEP_PACKAGED_RUNTIME | YES | CSS .view-mode-detailed mask and v1212 test; installed Chrome ZIP |

## Separate high-resolution artwork from installable icons

- **Two raster masters, 2,373,287 bytes in total**, are relocated without re-encoding or deletion from `icons/` to [`assets/artwork/`](../../assets/artwork/README.md). Each exact original Git blob SHA is reused in the Git tree: `919e8bb000f15708b8533985ddcf8dec5a00d1d4` (app) and `25e7ada6070f20091bc28bd650b1e19ebc9563a9` (taskbar). Git history preserves both former paths; historical external raw-image links to the old paths do **not** automatically redirect.
- The masters are **raster PNG source artwork**, not proven editable layered/vector files. They remain tracked in Git, so moving them improves directory purpose/clarity; **it does not shrink the Git repository by 2.4 MB**.
- The 13 assets declared in `scripts/package.py` remain under their exact installed `icons/` paths. The manifest's 16/32/48px taskbar and 128px app icons, HTML favicons, eight CSS-masked SVGs and all associated checks remain unchanged.
- The seven other un-packaged variants keep their existing paths because they could be consumed by manually distributed images, prior instructions or historical development assets. In particular `icons/icon-128.png` and `icons/app-icon-128.png` share **the same Git blob**, so removing either filename would not save another binary blob.

## Contract and verification

- The new mandatory `tests/kar167-icons-closure.cjs` checks all **22** inventoried source names/SHAs, the two preserved master binary SHA-1 Git blob identities after relocation, all runtime references and the exact thirteen-file packager allowlist. It checks PNG headers and the size designation of all installed/compatibility pixel variants; the two **source masters are instead validated against their exact original Git blob SHA plus actual high-resolution PNG headers**, because the historical `-master-1240.png` suffix is **not** a guaranteed pixel canvas size. It also checks the ICO container, SVG markup, old/target file presence, executable consumer paths and 128px alias equality. The longstanding `tests/v11710-taskbar-icon-title.cjs` also SHA256-pins five shipped icons.
- The full Work PR exact-head CI is required: `npm test`/coverage, no-regression, Windows updater/rollback fixture, deterministic **byte-identical committed v1.23.59 Chrome ZIP** and packaged Chromium E2E 9/9. Running only this audit test does not establish complete product acceptance.
- For installed/compatibility resolution variants, a PNG pixel mismatch fails closed. For historical design masters, their verified original Git blob SHA and actual decoded header size are authoritative, not their filename. **CI attempt 1 observed `assets/artwork/app-master-1240.png` is 1254 pixels wide**, contradicting its `1240` filename suffix; the original file remains byte-identical. The adjusted test reports the actual width and height of both masters. No resampling, renaming or image changes are authorized.
- No additional binary deletions were justified. Full external Issue/PR raw-media-link enumeration is not proven; retain the Git SHA map for original versions and treat new paths as canonical going forward.
