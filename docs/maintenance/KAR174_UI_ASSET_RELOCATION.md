# KAR-174 — UI entrypoint relocation and dependency record

**Source baseline:** `main@e276466c242eae096c7b6b4cb569021ae84668ab`, Chrome version 1.23.88. **Issue:** [#174](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/174). The four files are live Chrome ZIP resources, not obsolete assets.

| Historical KAR-167 root entry | Canonical runtime entry | Runtime owner |
| --- | --- | --- |
| `app.html` | `src/app/app.html` | `src/background/background.js` via `APP_PAGE` |
| `app.css` | `src/app/app.css` | Manager HTML stylesheet and CSS `../../icons/` masks |
| `popup.html` | `src/popup/popup.html` | Bundled launcher, directly openable extension page; *not* configured as `action.default_popup` |
| `popup.css` | `src/popup/popup.css` | Bundled launcher stylesheet |

## Code and release contracts

- Keep `manifest.json` identity, service-worker/content-script paths, permission grants and `action.default_popup` state unchanged.
- `src/background/background.js`: both window creation and `getAppUrl` share the exact new `APP_PAGE` constant.
- The two HTML pages resolve their own relative local scripts and icons from `src/app/` and `src/popup/`; the application CSS resolves packaged icons through `../../icons/`.
- `scripts/package.py` has explicit canonical UI ZIP members and verifies normalized HTML script paths relative to each HTML page. `scripts/v12319-architecture-audit.cjs` follows those new HTML roots.
- `tests/e2e/run_browser_e2e.py` targets the new packaged Manager extension URL. The new `tests/kar174-ui-asset-relocation.cjs` enforces **real path absence** at the old root, new ZIP members, icon/script/style resource closure, unchanged action semantics and both page entrypoints.
- Existing `tests/v12222-vm-legacy-bridge.cjs` is loaded **only for historical Node tests via `npm test`**. Its additional four name mappings keep historic lexical DOM/UI tests running against *the actual relocated files*. The bridge **does not write or expose root files in the packaged extension**, fake old HTML content, or override the dedicated direct filesystem/ZIP closure test.
- The immutable `docs/maintenance/REPOSITORY_FINAL_INVENTORY.json` captures the pre-#174 #167 historical paths and hashes exactly as originally recorded; `tests/kar167-final-repository-closure.cjs` narrowly permits these **four only** verified new locations while retaining protection for all other original paths, historical release ZIPs and Windows tool assets.

## Known compatibility boundary

An external saved `chrome-extension://<existing-extension-id>/app.html` URL does **not** redirect to the new URL when the old root file is removed. Internal `OPEN_APP_WINDOW` entrypoints open the canonical page, while manually created old bookmarks, third-party absolute URLs and pre-existing tab navigation must be retested in a native Chrome profile. Do not claim external bookmark compatibility or native acceptance without real evidence. No hidden root compatibility shim is delivered.

## Acceptance

Require full `npm test`/coverage, 100% Dynamic Public API coverage, packaging byte parity with **a newly committed version-specific ZIP**, nine packaged Chromium E2E scenarios and **four green exact-HEAD Work PR jobs**. Keep merge, public release and native-user actions separate owner-gated operations.
