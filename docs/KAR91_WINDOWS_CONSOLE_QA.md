# KAR-91 – English technical OneClick console verification

Parent [KAR-89](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/89), Wave [KAR-91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91).

## Baseline, test first

The existing desktop OneClick launcher contains German application-owned prompts, the Windows updater's no-change status contains German prose and uses exact `JA`, and the per-user shortcut manager has German setup/remove output. A dedicated focused test `tests/kar91-english-console.cjs` must demonstrably fail before these scripts are changed. Historic machine-readable event codes remain stable.

## Safety and installed-kit migration

The copied per-user Desktop launcher and Updater PowerShell script are receipt-bound to SHA-256 digests recorded in `owner.json`. A repository source change or extension version bump **does not change the already-installed trusted kit**. A future user-hosted switch to English must verify ownership and follow the existing separately consented `remove` + `install` mechanism with trusted matching source files. This is not an automatic installer update. Never overwrite an installed kit in place without owner consent, elevate, alter ExecutionPolicy, unblock files, or bypass company policies.

The new English consent literal will be explicitly `YES` for **newly provisioned scripts only**, while previously installed old scripts may still ask for `JA`. Keep all-Chrome-closed install gate, atomic backup/journal/rollback, SHA-pinned ZIP, version/identity and negative tests unchanged. `CHECK`, `BEREITS_AKTUELL`, `KEIN_NEUERES_UPDATE`, `FILES_VERIFIED`, `FILES_INSTALLED_RELOAD_REQUIRED` and other protocol IDs are machine-owned and unchanged.

## Native acceptance

On a managed Windows PC, test the new kit **only after the owner explicitly chooses the safe re-provisioning procedure**, read back kit ownership and confirm no inventory/Chrome data loss. Do not infer corporate policy approval from hosted Windows fixtures. The owner has already proven the previous German kit safely updated 1.23.32 to 1.23.34; English future-kit behavior is still pending.
