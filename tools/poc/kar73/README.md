# KAR-73 — isolated Windows URI dispatch PoC

**Experimental:** Hosted Windows Shell/URI dispatch only. This is not browser-to-Windows acceptance, not an updater, not a corporate-machine installer and not a security policy exception.

## Scope
Prove that a fixed Windows shell URI registration can invoke a harmless PowerShell handler via ShellExecute on a disposable GitHub Windows runner. Never touch Chrome runtime, real profiles, company PC, NativeHost, updater, ads, Task Scheduler, UAC, Defender or local program files.

## Exact fixture
- Requires Windows PowerShell 5.1, CI=true and KAR73_URI_POC_TEST_MODE=1; refuses ordinary runs.
- Refuses registration if scheme kar73poc is already registered under HKCU or HKCR.
- Registers only HKCU\Software\Classes\kar73poc on the disposable runner.
- Command invokes system PowerShell with a fixed harmless script, never passes URI (%1) or user-defined command/path arguments.
- Launches fixed kar73poc://trigger through Windows Shell, checks harmless marker file in runner temp, verifies exact content.
- In finally: removes only its own registry key after exact command ownership check; removes only its own test marker.
- No custom native EXE, no elevation request or privileged scheduled task. The hosted runner's token may itself be privileged: never assert it was necessarily a standard-user token.

## Security limitations
A custom URI does **not authenticate the initiating website or Chrome extension**. Any website might try to trigger that scheme. This fixture deliberately has no update operation, and forwards no URI arguments. A production design would require explicit local consent and enterprise policy approval. It cannot treat a URI as privileged authorization.
A hosted Windows ShellExecute PASS is **not** proof of actual managed Chrome MV3 → Windows handoff, browser prompt behavior or corporate Defender ASR acceptance.
Never run the PoC scripts on the user's company workstation; the CI opt-in guard intentionally stops such runs.

## Hosted contract
The existing KAR Work PR and KAR CI Windows job invokes tests/kar73-windows-uri-protocol.ps1 with KAR73_URI_POC_TEST_MODE=1.
Required PASS evidence (only when genuinely observed):
- PASS KAR73 URI_SCHEME_OWNERSHIP
- PASS KAR73 URI_ARGUMENT_NOT_FORWARDED
- PASS KAR73 WINDOWS_SHELL_URI_DISPATCH
- PASS KAR73 HKCU_CLEANUP
A failure or a lack of browser UI is NOT VERIFIED, never an accepted P0 Chrome handshake.

## Authoritative references
- Chromium external protocol handler: https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/external_protocol/external_protocol_handler.cc
- Microsoft Windows protocol registration: https://learn.microsoft.com/en-us/windows/win32/shell/search-protocol
- Chrome Native Messaging: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Defender ASR: https://learn.microsoft.com/en-us/defender-endpoint/attack-surface-reduction-rules-reference
