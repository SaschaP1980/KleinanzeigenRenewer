# KAR-75 — Chrome MV3 external protocol consent laboratory

Isolated, hosted GitHub Windows Chromium GUI test. Not an updater and not a corporate deployment.

## Workflow

1. Require CI=true, GITHUB_ACTIONS=true, KAR75_POC=1, Windows and RUNNER_TEMP.
2. Refuse foreign kar75poc: registration, create throwaway HKCU-only scheme (never SYSTEM, UAC or privileged task).
3. Register only a fixed PowerShell script with a fixed harmless temporary marker path; never forward %1 / URI or any caller input.
4. Create a disposable MV3 extension and Chrome/Chromium profile. Navigate to its extension page.
5. Real pointer click on a custom-scheme link. Require an observable native external-application confirmation.
6. Click Cancel in the native confirmation and prove no handler marker was written.
7. Click link again, explicitly accept native dialog and require matching handler marker.
8. Always close Chrome, remove only owned HKCU key and disposable profile/marker, and emit machine-readable JSON even on unsuccessful browser exercise.

## Strict evidence classification

- PASS only after observable real extension click, browser prompt, cancel negative, explicit accept positive and owned registry cleanup.
- NOT_VERIFIED on inaccessible native dialog/headless Windows, missing Chrome extensions, any automation/Playwright error, or absent observed handler.
- Never add Chrome `--disable-features=...`, auto-accept external protocol, global policy changes, Task Scheduler, PowerShell execution-policy override or a new native EXE.
- The external URI does not attest initiator identity. This lab has zero actual update capability and cannot establish safe production handoff.
- This runner does NOT prove acceptance by managed corporate Chrome/Defender ASR on the owner's machine.

Source fixture: `tests/kar75-chrome-uri-poc.py`; handler: `tests/kar75-uri-handler.ps1`.
Evidence: KAR Work PR Windows job logs and `kar75-chrome-uri-result.json` uploaded on all outcomes.
Parent: #72. Previous OS Shell-only test: #73 (must not be counted as a browser PASS).
