# KAR-91 – English technical OneClick console verification

Parent [KAR-89](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/89), Wave [KAR-91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91).

## Baseline, test first

The existing desktop OneClick launcher contains German application-owned prompts, the Windows updater's no-change status contains German prose and uses exact `JA`, and the per-user shortcut manager has German setup/remove output. A dedicated focused test `tests/kar91-english-console.cjs` must demonstrably fail before these scripts are changed. Historic machine-readable event codes remain stable.

## Safety and installed-kit migration

The copied per-user Desktop launcher and Updater PowerShell script are receipt-bound to SHA-256 digests recorded in `owner.json`. A repository source change or extension version bump **does not change the already-installed trusted kit**. A future user-hosted switch to English must verify ownership and follow the existing separately consented `remove` + `install` mechanism with trusted matching source files. This is not an automatic installer update. Never overwrite an installed kit in place without owner consent, elevate, alter ExecutionPolicy, unblock files, or bypass company policies.

The new English consent literal will be explicitly `YES` for **newly provisioned scripts only**, while previously installed old scripts may still ask for `JA`. Keep all-Chrome-closed install gate, atomic backup/journal/rollback, SHA-pinned ZIP, version/identity and negative tests unchanged. `CHECK`, `BEREITS_AKTUELL`, `KEIN_NEUERES_UPDATE`, `FILES_VERIFIED`, `FILES_INSTALLED_RELOAD_REQUIRED` and other protocol IDs are machine-owned and unchanged.

## Native acceptance

On a managed Windows PC, test the new kit **only after the owner explicitly chooses the safe re-provisioning procedure**, read back kit ownership and confirm no inventory/Chrome data loss. Do not infer corporate policy approval from hosted Windows fixtures. The owner has already proven the previous German kit safely updated 1.23.32 to 1.23.34; English future-kit behavior is still pending.

## Verified source-side implementation (2026-10-15)

- App-owned technical OneClick launcher strings are now English; startup banner, no-argument failure, missing updater, no-update explanation, consent instructions, failure and same-Chrome-profile reload advice have been translated. Fixed `-Command oneclick` invocation and no automatic browser actions remain unchanged.
- Windows updater interactive consent is **case-sensitive `YES`** for newly deployed scripts; no consent means no installation. Existing negative trust, version, ZIP proof, backup/journal/rollback and Chrome-closed checks remain unchanged. Protocol identifiers including `BEREITS_AKTUELL` and `KEIN_NEUERES_UPDATE` retain their historical spelling for software compatibility, even though the displayed detail is now English.
- The shortcut-management script `check`, `install` and `remove` messages and explicit consent are now English; original per-user kit ownership and collision guards are still enforced. The shortcut's visible existing Windows name is intentionally unchanged for compatibility with the receipt-bound ownership checks.
- The existing hosted Windows Phase 1 fixture expectation for the *displayed English* already-current detail was updated; the protocol event type remains unchanged. Mandatory coverage and hosted Windows security tests are required before acceptance.

## Important: updating Chrome does not replace the Windows helper kit

The Chrome extension package does **not** silently replace `%LOCALAPPDATA%\\KleinanzeigenRenewer\\Updater` or the existing Desktop shortcut. On the owner's computer the previously installed, checksummed German kit may therefore still ask for `JA` after the extension becomes v1.23.36. This is expected, **not** evidence that the new source scripts failed to build.

A separate user-consented transition to the English kit is required and must not proceed without the owner explicitly requesting it:

1. Obtain both current official `tools/windows/OneClick-Update-KleinanzeigenRenewer.cmd` and `tools/windows/KleinanzeigenRenewer-Updater.ps1` and the matching `tools/windows/Manage-KleinanzeigenRenewer-OneClick.ps1` from one verified GitHub source commit (never mix versions or accept unexpected local executables).
2. Run the manager's read-only `-Action check` to verify the old `owner.json`, exact owned shortcut and both existing script hashes. If any verification fails, **stop**; do not forcibly delete, replace or bypass enterprise controls.
3. After explicitly consenting, run the trusted manager with `-Action remove` (removes **only** the owned shortcut and its separate updater-script kit; does not remove the Chrome extension or inventory), then `-Action install` from the new verified source (writes a new SHA-bound owner receipt), finally `-Action check` again. The new script asks for `YES`; an installed old script may still ask for `JA` if that old script is the one being executed.
4. Validate that the Desktop shortcut targets the same fixed per-user kit, then run **read-only** updater `-Command check`. Verify matching approved version; no Chrome file changes during check. For future actual upgrades all Chrome processes must be closed and the user explicitly consents; reload the **existing** extension under `chrome://extensions/` in the same profile afterward.

Do not execute the above on the owner's computer from GitHub CI. Never change PowerShell execution policy, unblock enterprise-controlled files, elevate, overwrite an unknown shortcut, or delete owner Chrome profiles. If a corporate policy prevents execution, stop and report it rather than bypassing it.

## Test evidence and completion state

At the start of this documentation update, the guarded atomic builder [#38693607377](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/38693607377) completed SUCCESS for v1.23.36 ZIP (761424 bytes, SHA-256 `df864443bfcf1e0b66a6b000b955f7d26d9ce6cabb7f6eb98ff252af4a996916`). The source-only PR run [#38693158983](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/38693158983), attempt 2, finished SUCCESS. This document commit triggers the final exact packaged Work PR run; its outcome and merge/main acceptance are **not yet verified** at document-commit time. The owner-native kit migration remains PENDING.
