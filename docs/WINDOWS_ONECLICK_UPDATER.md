# KAR-80 — Independent Windows One-Click updater

The desktop shortcut starts the **existing user-level Phase 1 updater**, not NativeHost.exe.
One click launches the update **workflow**, but does not mean unattended file mutation.

## Components and version scope

- `tools/windows/OneClick-Update-KleinanzeigenRenewer.cmd`: stable no-parameter entrypoint that starts a single PowerShell process with `-Command oneclick`.
- `tools/windows/KleinanzeigenRenewer-Updater.ps1`: approved Phase 1 update core with a dedicated `oneclick` entrypoint; standalone `update` still rejects non-newer approved versions. It verifies pinned GitHub ZIP source commit/size/SHA-256 and installation integrity, asks `JA`, requires all Chrome processes closed before switching files, and maintains journal/backup/rollback.
- `tools/windows/Manage-KleinanzeigenRenewer-OneClick.ps1`: controlled per-user shortcut setup/status/removal (source unchanged after setup).

**Production Chrome extension v1.23.31 is unchanged.** The helper is not embedded in the Chrome ZIP. NativeHost installation or IPC is not required. This feature does not implement automatic in-app apply (#67).

## Setup (user action, never administrator)

1. On a Windows system where user-script execution is **permitted by the actual OS/company policy**, place **all three named components** above in a single folder obtained from an authorized, trustworthy source. Do not run them from an untrusted or unknown folder. The code is not currently a signed installer and is not proof of corporate trust.
2. Inspect the source/paths and use **ordinary** Windows PowerShell (not elevated) in that folder:
   `./Manage-KleinanzeigenRenewer-OneClick.ps1 -Action check`
3. Set up the starter by invoking `./Manage-KleinanzeigenRenewer-OneClick.ps1 -Action install` and typing exactly `JA` when asked. If a security policy refuses execution, **stop**; do not unblock the file, disable ASR/WDAC, alter ExecutionPolicy, elevate, change paths to evade checks, or use a scheduled task.
4. The installer copies only `OneClick-Update-KleinanzeigenRenewer.cmd` and `KleinanzeigenRenewer-Updater.ps1` to `%LOCALAPPDATA%\KleinanzeigenRenewer\Updater` and creates **Kleinanzeigen Manager aktualisieren.lnk** in the current user's Desktop directory. The two files and exact SHA-256 are recorded in `owner.json`. Nothing in `%LOCALAPPDATA%\KleinanzeigenRenewer\Extension` is changed during setup.
5. To update an **existing** installed extension, save all browser work, close **all** Chrome processes, and double-click the shortcut. It checks approved metadata and the installed program files in the same PowerShell process; only a strictly newer approved version enters the existing guarded update path with explicit `JA` confirmation before any switch. The current Chrome profile, Extension ID and storage are left intact. After a successful update, reopen the same Chrome profile and **reload** the existing unpacked extension under `chrome://extensions/`. Do not remove and reinstall it.
6. If the installed version equals the approved version, the One-Click command prints `BEREITS_AKTUELL: Bereits aktuell - kein Update erforderlich` without a red exception or file exchange. If the installed version is newer than the currently approved channel, it prints `KEIN_NEUERES_UPDATE` and does not downgrade. The original standalone `update` command still rejects equality and downgrades. If installation is missing, use the original manually accepted `Update-KleinanzeigenRenewer.cmd` installer first, then the shortcut for updates.

## Safety and idempotence

- Existing Desktop links or kit directories without a matching owner receipt are **never** overwritten, adopted or deleted.
- Pre-existing owned kit files must match their recorded digests; unknown extra entries, missing entries, tampered scripts and reparse points fail closed.
- A second `-Action install` simply verifies the already owned shortcut and kit; it does **not** update scripts in place or bypass a changed signature.
- `-Action check` is read-only. `-Action remove` verifies ownership, asks for `JA` and removes only the owned Desktop `.lnk` and owned Updater kit, **never** the installed extension, native host, settings, backups or Chrome data. When absent, remove is idempotent.
- Updating the shortcut kit itself (including this already-current UX patch) requires an explicitly consented **remove followed by new install** of the three original setup source files; do not silently overwrite a running or unverified updater. The old Desktop link and kit retain their old checksummed scripts until that user-controlled re-provisioning is completed.
- The shortcut cannot execute with elevated privileges by construction. A user-writable path must never be used as an elevated scheduled-task target.

## Testing and limitations

- `tests/windows-oneclick-shortcut.ps1` is a CI-only Windows PowerShell 5.1 fixture (`KAR_ONECLICK_TEST_MODE=1`) with scratch directories under `RUNNER_TEMP`; it cannot run against the owner's Desktop/LocalAppData in CI.
- Hosted Windows tests verify actual WScript.Shell `.lnk` target/arguments, idempotence, collision denial and ownership removal; the Phase 1 fixture checks equal/older/newer OneClick results, unchanged receipts, backups, and the original strict `update` rejection. They do not invoke the online update action, make real Kleinanzeigen account changes or establish permission on a managed corporate computer.
- Full Phase 1 updater fixture SHA/ZIP traversal/rollback/recovery tests must remain GREEN on the same exact GitHub commit.
- The extension Manager fallback guidance is tracked in dependent child #81. The **read-only** NativeHost check remains optional; if native transport fails, the Manager displays standalone Desktop shortcut instructions and a separate setup guide link. The Manager **cannot launch** the shortcut directly without an authorized local bridge. This is a browser-facing instruction, not proof the shortcut is installed or company policy permits its execution.

Tracking: parent #79; this Windows wave #80; follow-up browser UI wave #81.
