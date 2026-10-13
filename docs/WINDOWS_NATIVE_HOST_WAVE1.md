# KAR-64 — Native Messaging host Wave 01 (read-only)

This is **Phase 2, Wave 01**, not an operational one-click updater. It installs a per-user Chrome Native Messaging helper with two read-only operations: \`health\` (no network) and \`check\` (delegates to the existing Phase 1 \`-Command check\`). No \`nativeMessaging\` permission or update button has been added to the extension; the standalone Phase 1 updater continues to work as before.

## Install and verification (Windows PowerShell 5.1)

1. Download/checkout **both** \`tools/windows/KleinanzeigenRenewer.NativeHost.cs\`, \`tools/windows/Install-KleinanzeigenRenewer-NativeHost.ps1\` and the existing \`tools/windows/KleinanzeigenRenewer-Updater.ps1\` in the same directory. Run only trusted source from the official project; do not globally relax Windows script execution policies.
2. Run \`.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action install\`, inspect the prompt and explicitly type \`JA\`.
3. Run \`.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action verify\`.
4. To remove, run \`.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action uninstall\` and type \`JA\`. It only unregisters/removes this native helper and leaves the extension, Chrome profile, local inventory and the Phase 1 updater untouched.

Installer uses the built-in Windows PowerShell/.NET Framework compiler; no administrator or external C# SDK, Node or Python installation is required. It writes \`%LOCALAPPDATA%\KleinanzeigenRenewer\NativeHost\` and **only** \`HKCU\Software\Google\Chrome\NativeMessagingHosts\de.kleinanzeigenrenewer.updater\`. The host JSON has a single \`allowed_origins\` entry, \`chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/\`.

Installation refuses to overwrite an existing host or foreign registry entry. The host program and fixed updater delegate have SHA-256 receipt verification; \`verify\` proves helper **files/registry**, not actual Chrome extension activation.

## IPC contract

Chrome \`runtime.sendNativeMessage('de.kleinanzeigenrenewer.updater', message)\`, once the separately authorized extension permission and background bridge are added in a later Wave. Payload is a 4-byte little-endian binary length plus UTF-8 JSON, maximum 8,192 bytes. Exactly one request per host process:

\`\`\`json
{"protocol":1,"requestId":"0123456789abcdef","operation":"health"}
\`\`\`

The only other operation is \`check\`, same schema. All three keys are required and extra keys forbidden; requestId must be 16–64 ASCII hexadecimal characters. An unknown operation, malformed JSON, oversized frame, unexpected field or unsupported protocol fails closed with a bounded error code; no user-supplied URLs, commands or file paths are accepted. Native stdout contains only framed protocol JSON, never human-readable logs.

\`health\` replies with \`ok:true\`, protocol 1, requestId, hostVersion 1, capabilities \`["health","check"]\`. \`check\` starts the installed vetted Phase 1 updater with fixed \`-Command check\` (45-second timeout) and extracts approved version, installed version and pinned ZIP SHA/immutable commit. Network failures are an explicit \`CHECK_FAILED\` or \`CHECK_TIMEOUT\`, not a success.

**No write/apply/update/rollback/reload messages are implemented in Wave 01.** Chrome busy-state gating and consent are required before a future write-capable Wave. The Phase 1 updater itself still refuses program-file switches while Chrome runs. Never work around this gate in native host logic.

## Acceptance limits

Hosted Windows tests validate the host executable, registry/origin binding, framing, parsing and failure cases. Real owner-PC Chrome Native Messaging handshakes, app UI, pending workflow safety/reload, and update activation remain for later Wave(s). A green hosted fixture is **not** a native user-PC activation result.
