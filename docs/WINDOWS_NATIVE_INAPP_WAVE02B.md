# KAR-69 — Windows native update status inside Kleinanzeigen Manager (Phase 2B)

This is a **read-only update availability check**, not an installer. Phase 2 of #59 is not complete until separately scoped #67 provides an authoritative workflow-idle gate, explicit consent and safe deferred program-file replacement **after Chrome exits**.

## What the app supports

Under **Konfiguration → Windows-Updater**, pressing **Auf Updates prüfen** sends precisely one app-owned request to the MV3 background service worker. The worker verifies the sender is its own exact app URL, checks Windows support, generates a cryptographically random request ID, and invokes **only** the existing per-user Chrome Native Messaging host de.kleinanzeigenrenewer.updater, operation check, protocol 1. The helper reuses the existing verified Windows updater's read-only -Command check and returns the installed program-file version, separately approved version, pinned ZIP SHA-256 and immutable commit. Nothing is installed, updated, deleted or published on Kleinanzeigen.

The UI distinguishes the **active Chrome extension version** from the **managed Windows installation's receipt version**. These can differ: version 1.23.30 is a new reviewed extension build, while the separate approval channel still approves v1.23.29 until the owner authorizes a later channel change.

## Native prerequisites and registration

Use the Wave 01 source-only helper documented in docs/WINDOWS_NATIVE_HOST_WAVE1.md, installed via tools/windows/Install-KleinanzeigenRenewer-NativeHost.ps1 under the normal Windows user. It registers exactly HKCU/Software/Google/Chrome/NativeMessagingHosts/de.kleinanzeigenrenewer.updater, with allowed_origins restricted to the immutable extension ID hafahjhhgiipdegfkgacchmnacgblnah. If missing, offline, non-Windows, timed out or invalid, the app shows a non-success status; its regular inventory and protected Kleinanzeigen workflows remain unaffected.

## Security boundary

- Only native status check can be requested, with **no** custom path, command, URL, version selector or update parameter.
- Only the exact extension chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/app.html can reach the trusted MV3 background handler. Website or content-script requests are rejected before Native Messaging.
- Native responses must match protocol, fresh correlation and strict SHA/commit/version schema. Concurrent, replayed, stale and unexpected responses fail closed.
- Chrome nativeMessaging permission is added **only in v1.23.30+**. All preexisting host permissions remain unchanged. Both the exact-committed-ZIP verifier and Phase 1 Windows updater enforce separate permission allowlists for older versions versus v1.23.30+; unrelated permissions remain prohibited.
- App controls never call update, apply, rollback, reload, shutdown.exe or Chrome process termination. Chrome-running safety of Phase 1 is preserved.

## Testing and acceptance limits

Hosted CI asserts browser/package closure, real packaged Chromium E2E, background sender-identity, read-only app status UI, random nonce, strict gateway negative cases, Windows updater 1.23.30 version-aware permission acceptance and existing 1.23.27/28 rollback tests. A real owner Windows/Chrome **Native Messaging handshake is still a separate native acceptance requirement**, not proven by hosted CI. The existing installed 1.23.29 and its ZIP remain untouched; no GitHub Release or channel approval is implied.
