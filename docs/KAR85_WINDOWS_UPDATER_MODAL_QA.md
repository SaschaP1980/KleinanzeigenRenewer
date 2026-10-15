# KAR-85 – Windows Updater modal QA

Owner: [KAR-85](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/85); parent [KAR-84](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/84).

This Wave moves the existing read-only Native Messaging update check and independent Windows OneClick fallback instructions from the configuration pane to a dedicated accessible modal. It does not change install operations, channel approval or Chrome host permissions.

## Scope and expected behavior

- In **Konfiguration**, show only Windows-Updater, one concise availability status and a permanent **Updater öffnen** button.
- The button opens an actual native `<dialog>`, focuses **Erneut prüfen**, and closes by Escape, top-right close or footer close, returning focus to the opener.
- No check runs automatically during Manager start or when the modal opens. Pressing **Erneut prüfen** sends the original trusted `GET_NATIVE_UPDATE_STATUS` message.
- For a blocked/unavailable NativeHost, show **Update-Status derzeit nicht verfügbar.** (not a fabricated equal/newer result). Inside the modal, show the independent desktop OneClick instructions and setup URL.
- A successful read-only native check shows verified installed and approved versions, active extension version, SHA/commit evidence and a dated successful status.
- **Updateanleitung anzeigen** progressively reveals the guarded existing Windows update process: finish Kleinanzeigen workflows, close Chrome, use the owned Desktop shortcut with explicit consent, reopen the same Chrome profile and reload the existing unpacked extension.
- No in-browser Apply button and no automatic local process/URI action.

## Executable and native verification

- Focused test: `node tests/kar85-updater-modal.cjs`.
- Existing security/contracts: `node tests/kar69-native-check.cjs`, `node tests/kar81-native-fallback.cjs`, `node tests/v1101-contract.cjs`, `node tests/v1172-account-modal-ux.cjs`.
- Full gate: `bash scripts/coverage-gate.sh`, clean-build ZIP parity, Work PR CI packaged Chromium E2E and Windows updater/NativeHost security suite. Record actual run IDs and SHA; do not infer PASS from the mere existence of a test.
- Owner/native QA remains pending until real screenshots confirm the layout, responsive modal, Escape/focus and fallback behavior. Corporate NativeHost blocking is already reported, but cannot be diagnosed solely from a generic IPC error.

## Separate dependency

[KAR-86](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/86) is explicitly responsible for NativeHost-independent approved channel status in Chrome. Until that implementation is accepted, a blocked NativeHost correctly produces an **unknown** availability status in KAR-85. No added browser host permissions, global update channel changes or new published GitHub Release are authorized in this Wave.
