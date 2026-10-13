# KAR-64 — Native Messaging host Wave 01 (read-only)

This is the **Phase 2, Wave 01** standalone per-user Windows host. Current Chrome extension **v1.23.31** has a separately reviewed read-only `nativeMessaging` permission and a user-initiated **Auf Updates prüfen** UI; it **cannot install/apply updates from Chrome**. The helper exposes only `health` (no network) and `check` (delegates to the Phase 1 `-Command check`). Phase 1 Windows program-file updating remains a separately confirmed standalone action.

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


## KAR-66: controlled refresh of an already installed read-only host (2026-10-13)

The Windows Native Messaging helper installed from the initial KAR-64 code rejects Chrome's real **two-argument** host launch. The fix accepts only the exact Chrome extension origin `chrome-extension://hafahjhhgiipdegfkgacchmnacgblnah/` (with or without the serialized trailing slash) followed by a valid unsigned decimal `--parent-window=<handle>` (0 for MV3 worker). It rejects missing, swapped, hostile, extra or malformed arguments **before** reading stdin. The hosted Windows RED→GREEN regression suite runs actual compiled .NET Framework processes with the Chrome startup arguments and strict negative cases. This changes **the separately compiled host source**, not the v1.23.31 Chrome ZIP, extension ID, saved data or the approved updater channel.

**Immutable reviewed source checkpoint:** `35bf0acd95c482d719bd95d0d7da4fcc6b8643a0`. Expected download hashes (SHA-256) for files in `tools/windows/` at that commit:

| File | SHA-256 |
| --- | --- |
| `KleinanzeigenRenewer.NativeHost.cs` | `c32f51d6f948018a7b03fc4eedb1e7ef8b533fd979c1217f23bbc6d7dd116844` |
| `Install-KleinanzeigenRenewer-NativeHost.ps1` | `712ec4d2f1699d2298bbfd672b6ec9b926f560046c93e0e6492a57e93a04e7cd` |
| `KleinanzeigenRenewer-Updater.ps1` | `c81cabf9f232731f924ccf39cd3c0378be952684911b3716652e43f3ada4a621` |

**Before removal:** Complete/stop any active Kleinanzeigen operation, close **all** Chrome processes without force-terminating active work, and keep the same Chrome profile. In Windows PowerShell 5.1 under the existing user, first verify the current installation:

```powershell
Set-Location (Join-Path $HOME 'Downloads')
.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action verify
```

Download the revised **C# host source only** from the immutable commit above to a temporary `.download` file in the same directory as the current installer and Phase 1 updater. Do not execute, copy into place or compile a downloaded file until its exact SHA-256 matches. Verify the two existing scripts against the table too. Do not edit the extension folder or any Chrome profile files:

```powershell
$sourceCommit = '35bf0acd95c482d719bd95d0d7da4fcc6b8643a0'
$url = "https://raw.githubusercontent.com/SaschaP1980/KleinanzeigenRenewer/$sourceCommit/tools/windows/KleinanzeigenRenewer.NativeHost.cs"
$temp = Join-Path (Get-Location) 'KleinanzeigenRenewer.NativeHost.cs.download'
Invoke-WebRequest -Uri $url -OutFile $temp -UseBasicParsing
$expected = 'c32f51d6f948018a7b03fc4eedb1e7ef8b533fd979c1217f23bbc6d7dd116844'
if ((Get-FileHash $temp -Algorithm SHA256).Hash.ToLowerInvariant() -cne $expected) { throw 'Host source checksum mismatch: STOP' }
if ((Get-FileHash '.\Install-KleinanzeigenRenewer-NativeHost.ps1' -Algorithm SHA256).Hash.ToLowerInvariant() -cne '712ec4d2f1699d2298bbfd672b6ec9b926f560046c93e0e6492a57e93a04e7cd') { throw 'Installer checksum mismatch: STOP' }
if ((Get-FileHash '.\KleinanzeigenRenewer-Updater.ps1' -Algorithm SHA256).Hash.ToLowerInvariant() -cne 'c81cabf9f232731f924ccf39cd3c0378be952684911b3716652e43f3ada4a621') { throw 'Updater delegate checksum mismatch: STOP' }
Move-Item -LiteralPath $temp -Destination '.\KleinanzeigenRenewer.NativeHost.cs' -Force
```

**Before changing the installed helper**, copy the entire original receipt-verified NativeHost directory to a unique sibling backup **outside** the live directory and verify its EXE digest matches the original. Never overwrite an existing backup:

```powershell
$live = Join-Path $env:LOCALAPPDATA 'KleinanzeigenRenewer\NativeHost'
$backup = Join-Path $env:LOCALAPPDATA ('KleinanzeigenRenewer\NativeHost-Backup-KAR66-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
if (Test-Path -LiteralPath $backup) { throw 'Backup already exists: STOP' }
Copy-Item -LiteralPath $live -Destination $backup -Recurse -ErrorAction Stop
if ((Get-FileHash (Join-Path $backup 'KleinanzeigenRenewer.NativeHost.exe') -Algorithm SHA256).Hash -cne (Get-FileHash (Join-Path $live 'KleinanzeigenRenewer.NativeHost.exe') -Algorithm SHA256).Hash) { throw 'Backup validation failed: STOP' }
Write-Host ('Verified previous host backup: ' + $backup)
```

The **existing reviewed installer** deliberately refuses overwriting a live registered host. Execute its two separate consented operations, each requiring **JA**, never bypass its ownership/receipt checks or force-remove a foreign registry entry:

```powershell
.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action uninstall
.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action install
.\Install-KleinanzeigenRenewer-NativeHost.ps1 -Action verify
```

Only after `PASS KAR-64 NATIVE_HOST_VERIFIED` restart the **same** Chrome profile. Under `chrome://extensions/` verify the **same** extension ID and v1.23.31. In the manager click **Auf Updates prüfen**: expected active/installed/approved **1.23.31** with source commit `4dbb6fddf8a73470fa2daf4567af4c44ee218841` and SHA-256 `dab1b2e9a28ab2e161d20f8e0ca23772bb42f65c77031584e86dc95190776283`. Verify inventory, photos, trash, profiles, settings and after a normal Chrome restart. For extra separation of failure causes, the owner's extension Service Worker DevTools can perform a single read-only `health` probe; the response must be framed protocol version 1 with `ok:true`, `operation:'health'` and exactly `health,check` capabilities. Do not send file-install or mutation requests.

**If uninstall or install fails:** STOP. Preserve the verified `$backup` and actual console output for owner-guided recovery; **do not** recursively delete unknown directories or registry entries, silently overwrite an installed binary, disable permission checks, or claim live health passed. A failed host refresh affects only the optional native status helper, not existing extension storage or the independently accepted Phase 1 updater. The old verified directory copy provides recovery evidence, but restoring the HKCU registration requires a separate deliberate, ownership-checked procedure and must not be assumed automatic.

Native owner-machine acceptance for #66 remains pending until the real Chrome`→`host check works; hosted CI or installer `verify` alone cannot close the Issue.
