# KAR-86 – Approved Windows updater channel status (read-only)

This Wave is tracked by [KAR-86](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/86) under [KAR-84](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/84). It follows the successfully integrated KAR-85 modal in v1.23.33.

## Trust separation

The **active Chrome extension version** is determined from its running `chrome.runtime.getManifest().version`. A public GitHub REST read-only check discovers the **explicitly approved channel version**, **not** the latest GitHub ZIP. Without an authenticated, reachable NativeHost, the **managed Windows installation/receipt version remains unknown**, and the UI must not equate it to the extension manifest version.

The Windows updater remains solely responsible for SHA-pinned binary download and verification, profile/ID continuity, consent, Chrome-closed gate, journal/backup/rollback and atomic replacement. An available version displayed in Chrome is never authority to install.

## Endpoint and validation

The browser makes two bounded unauthenticated GETs with `credentials: 'omit'`, `redirect: 'error'`, no referrer and no-store caching:

1. `https://api.github.com/repos/SaschaP1980/KleinanzeigenRenewer/git/ref/heads/main` for the authoritative full main commit hash.
2. `https://api.github.com/repos/SaschaP1980/KleinanzeigenRenewer/contents/release/windows-updater-channel.json?ref=<exact-main-sha>` for the pinned approved-channel file.

The reader limits response/decoded byte sizes, validates the pinned Git ref, GitHub file envelope, base64 byte count, JSON schema and exact field keys, `approved` marker, extension ID, safe SemVer, ZIP commit/SHA-256/size, and rejects unexpected HTTP/redirect results. Failed, malformed, stale, cancelled or blocked checks must show **Update-Status derzeit nicht verfügbar**, never **Es ist keine neue Version verfügbar**.

Fetch support relies on public GitHub API CORS; there are **no extra manifest host permissions** or NativeHost IPC requirements for this status path. The environment may block public API egress, so availability on the actual corporate PC remains separate native evidence, not a guaranteed production outcome.

## In-app user path

- The compact configuration surface always shows **Updater öffnen**.
- Initial availability check executes once when the updater status UI initializes; **Erneut prüfen** starts another bounded check, even if the NativeHost is unreachable.
- The visible details distinguish active extension version, approved release, and unverified Windows managed receipt. When available, a date/time of last successful check is displayed.
- The modal continues to guide the owner to the independent trusted Windows OneClick Desktop shortcut; no in-browser apply, file changes, native policy bypass, or automatic Chrome shutdown.
- The previous native read-only bridge remains limited to `GET_NATIVE_UPDATE_STATUS`, guarded by the existing trusted app-window and nonce checks.

## Validation and acceptance

Focused: `node tests/kar86-approved-channel.cjs` verifies equal/newer/older, malformed/unapproved records, network failures and blocked NativeHost fallback against the real UI controller VM.

Mandatory: full public API 100%, line/branch/architecture no-regression, SHA-parity Chrome ZIP and packaged Playwright Chromium E2E, hosted Windows updater and NativeHost security negative tests, exact Work PR 4/4 and merged-main CI 2/2. Record actual SHA/run and truthfully mark native owner checks pending.

**Known limitation:** Hosted tests mock the GitHub REST responses. The real corporate Chrome/CORS/network path has not been positively observed on the owner's managed PC. The modal correctly falls back to unknown if network is blocked; never equate generic transport failure to a proven policy error.

No global approved-channel promotion, GitHub Release publication, Windows script installation, profile mutation or Hot-Update is authorized by this Wave.
