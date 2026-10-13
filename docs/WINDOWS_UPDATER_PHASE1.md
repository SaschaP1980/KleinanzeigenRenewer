# KAR-59 Phase 1 — Safe Windows local installer and updater

Phase 1 is a **separate, manual Windows updater**, not an in-app button. The updater is standalone PowerShell 5.1 with no Python, native host, administrator rights, token or Chrome extension permission additions. **Phase 2 remains unimplemented.**

## Prerequisites and first-time installation

- Windows with built-in Windows PowerShell 5.1 (PowerShell 7 is also testable); Chrome; an ordinary local user account; access to GitHub HTTPS.
- Download both files from this repository's \`tools/windows/\` directory to the same local directory (e.g. Downloads). Keep their filenames. Right-click the downloaded PS1 and use Windows "Unblock" if marked from the Internet and local ExecutionPolicy requires it; **do not disable Windows security policy globally**.
- Close **all** Chrome processes and end running Kleinanzeigen workflows before installation. Important Chrome data in your Chrome profile should be separately backed up via supported application exports; the updater backs up **program files only**, never inventory or Chrome profile data.
- Double-click \`Update-KleinanzeigenRenewer.cmd\`. It first performs an online approval-channel check, then asks install/update/cancel and explicit \`JA\` confirmation. For an initial installation select **I**. The unzipped extension is staged and installed in \`%LOCALAPPDATA%\KleinanzeigenRenewer\Extension\`.
- Open \`chrome://extensions/\`, enable Developer Mode and use **Load unpacked** exactly once for the stable directory above. Keep the same Chrome profile. Read the Chrome extension ID and compare it with \`hafahjhhgiipdegfkgacchmnacgblnah\`; do not proceed if it differs.

**Important for existing unpacked installations:** Chrome does **not** automatically retarget a "Load unpacked" registration from an old directory. The updater does not move that old folder, remove extensions, or migrate browser profiles. Do **not** click "Remove" on your existing extension or assume its Chrome storage will survive a path change. Verify identity/data retention on a safe copy of the Chrome profile and register the stable directory deliberately; where native storage retention on the target Chrome installation is not verified, retain the previous installation as a fallback. Do not run two copies of the same ID simultaneously. End-user Windows/Chrome acceptance is **pending** until it is actually exercised.

## Everyday use (phase 1)

- Run \`Update-KleinanzeigenRenewer.cmd\`, choose U and confirm. If Chrome is running the updater fails closed. It never publishes, renews or deletes Kleinanzeigen ads.
- Or execute \`powershell.exe -NoProfile -File .\KleinanzeigenRenewer-Updater.ps1 -Command check\` to compare installed and latest **explicitly approved** version without changing files.
- Commands: \`check\`, \`install\`, \`update\`, \`verify\`, \`rollback\`, \`recover\`, \`accept\`. Commands changing files require explicit \`JA\`; \`-Yes\` is an opt-in for an already user-invoked command, not automatic updating.
- **After files are installed**, open Chrome with the **same profile and unchanged extension ID**, open \`chrome://extensions/\` and press **Reload**. Only after manually verifying the version and inventory may the user run \`-Command accept\`: this records an **operator confirmation**, not an API-measured browser activation. \`verify\` proves files/receipt SHA-256 match, **not** that running Chrome has reloaded.
- Logs: \`%LOCALAPPDATA%\KleinanzeigenRenewer\State\updater.jsonl\`, installed receipt \`State\active.json\`, lock \`State\updater.lock\`. These contain version/commit/hash/error/timestamp, never browser cookies or inventory.
- Before deleting/uninstalling updater files, keep the stable extension folder if still loaded in Chrome. The program is not an extension uninstaller.

## Trust and release approval

The updater obtains the current \`main\` Git ref through GitHub's official HTTPS API, then fetches \`release/windows-updater-channel.json\` at **that specific commit**. The **repository-maintained approval record** declares a single version, pinned **immutable source commit**, size and expected SHA-256. It constructs a fixed-domain HTTPS raw-content URL for the corresponding ZIP at that immutable commit, validates size/hash and embedded extension identity and required runtime structure before activation.

**Approving newer ZIPs is a separate governed change:** each future release must explicitly update \`release/windows-updater-channel.json\` using the fully verified committed ZIP SHA-256, immutable source commit and size. The channel deliberately does **not** auto-select the numerically greatest ZIP. An unapproved newer ZIP will not install. HTTPS and this repository approval policy are the trust boundary; this is **not** independent code signing and does not protect against repository owner compromise. No untrusted arbitrary URL/path is accepted.

## Crash recovery and rollback

- The updater validates all ZIP members before extraction, rejects traversal, duplicates, symlinks/special files, size/compression bombs, key/ID/host/permission deviations, and refuses unapproved versions and downgrades. It maintains an exclusive single-process lock.
- A new version is extracted into \`Staging\`. Before touching \`Extension\`, the updater writes a transaction journal. The current verified directory is moved to a separate timestamp-free unique \`Backups\backup-<id>\` directory, then the ready stage is moved into \`Extension\`. Failed switches attempt automatic recovery of the prior verified program files. A crash leaves \`State\pending.json\` for the user to run \`-Command recover\` after closing Chrome.
- The current program files are backed up separately from Chrome profiles. The updater **never** reads, migrates or deletes \`chrome.storage\`, IndexedDB, Kleinanzeigen inventories, credentials, cookies or any Chrome user-data directory. Restoration of backed-up program files does not restore browser data.
- To restore a last verified program backup: close Chrome; run \`powershell.exe -NoProfile -File .\KleinanzeigenRenewer-Updater.ps1 -Command rollback\`, confirm, then manually Reload in Chrome. It checks every restored file against the saved SHA-256 receipt. Failed or suspicious backups are rejected; no silent arbitrary downgrade.
- Quarantined interrupted candidates remain under \`Staging\`; never delete them during an unresolved recovery. Keep \`Backups\` for manual recovery.
- File locks, power loss, insufficient disk permissions or Chrome profiles moved manually can require operator recovery. A **success** message means files placed and verified; Chrome activation remains a separate manual check.

## CI acceptance and native gaps

\`tests/windows-updater-phase1.ps1\` exercises offline positive install/update/rollback and fail-closed tampering on a temporary directory, with test-only overrides available **only** when GitHub CI sets both \`CI=true\` and \`KAR_UPDATER_TEST_MODE=1\`. The existing complete Work PR/main safety, 100% public API and packaged Chromium suite remain mandatory.

**Unverified until a real Windows Chrome installation test:** first registration under the expected ID, persistence of real local inventory/settings and IndexedDB, browser-level activation after Reload, workflow-idle checks with the user's real Windows sessions, Chrome file-lock/restart and abrupt power-loss behavior. Never classify hosted fixture tests as native end-user acceptance. Phase 2 Native Messaging is not part of this implementation.
