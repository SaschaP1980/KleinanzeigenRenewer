# Emergency local workflow recovery — archived, version-pinned scripts

**Exceptional manual recovery only. Not part of the normal Kleinanzeigen Manager runtime, installer, Chrome package or automatic update flow.**

These two JavaScript files were originally supplied during troubleshooting on **20 November 2026**. They operate only in the **manager's own Chrome-extension DevTools context** and rewrite specific local workflow session states to make an incorrectly held *derived UI insertion lock* eligible for release. They do **not** modify a real Kleinanzeigen listing or confirm the remote outcome of any previous posting or deletion.

| Archived script | Exact installed product version | Manager page | Evidence / status |
| --- | --- | --- | --- |
| [`Kleinanzeigen-Manager-Recovery-v1.23.48.js`](Kleinanzeigen-Manager-Recovery-v1.23.48.js) | `1.23.48` | `chrome-extension://<extension-id>/app.html` | **Owner-confirmed successful** on 2026-11-20; source based on historic commit [`f2225155`](https://github.com/SaschaP1980/KleinanzeigenRenewer/commit/f2225155e403d89d07a674c9e20f397a4f86694d) |
| [`Kleinanzeigen-Manager-Recovery-v1.25.12.js`](Kleinanzeigen-Manager-Recovery-v1.25.12.js) | `1.25.12` | `chrome-extension://<extension-id>/src/app/app.html` | **Archived original only — NOT verified in native Chrome; do not assume it is safe or successful** |

The two scripts are preserved **unchanged** from the original supplied files. SHA-256 of their UTF-8 bytes:

- v1.23.48: `ce0000e182c39bd54461889940ebcb7ddbf067f3059c321b4d020a0cbdb2e043` — 10,567 bytes
- v1.25.12: `4d4aaf59955fa54a0174452f2812f072b11e5d10b32a5b5eaeacd10007fedcd9` — 10,179 bytes

## Before running anything

1. **Stop all current automatic posting, renewing and deleting workflows.** Close or stop the relevant automation forms/tabs. A workflow that has already crossed the remote publish/delete boundary may still have an uncertain remote outcome.
2. **Inspect `Meine Anzeigen` on Kleinanzeigen first**, for the correct account, and reconcile whether the original and/or replacement listing already exists. Never blindly re-publish or re-delete an ad just because the manager UI is stuck.
3. Confirm the **installed** Chrome extension version with `chrome.runtime.getManifest().version`. It must match the script **exactly**, including all components. Do not run against another version, a different extension, or a normal Kleinanzeigen website tab.
4. Prefer the application's built-in **`Laufende Vorgänge zurücksetzen`** when it works. Use these historical scripts only when that supported control has failed and you have a clear reason to accept manual local state intervention.
5. Review the source yourself. These are intentionally **not** integrated or regression-tested as a current supported recovery API.

## Manual execution (only on the matching historical installation)

1. Open the actual **Kleinanzeigen Manager application window** corresponding to the required version; do not use Chrome's extension-management page or a Kleinanzeigen website tab.
2. Open Chrome DevTools for **that specific manager window** (`Ctrl+Shift+I`).
3. Go to **Sources → Snippets**, create a snippet, and paste the complete text of the matching `.js` file. Execute using `Ctrl+Enter`.
4. Review the first confirmation. The script initiates a **private JSON backup download of selected workflow storage keys**. Check the actual downloaded JSON file on disk: initiating a download does not prove its completion.
5. **Only if that backup exists**, accept the second confirmation. The script marks some local workflow records cancelled/needs-review and reads them back.
6. It then requests `GET_INSERTION_LOCK_STATE` from the existing backend. If the state is still locked or cannot be confirmed, **stop**: the scripts must not be interpreted as proving all locks cleared. Reload is performed only on the acknowledged unlocked path.
7. Re-check `Meine Anzeigen` for both source and newly published ads **before initiating a fresh renewal**. An unresolved remote transaction may otherwise produce duplicate listings or unsafe cleanup.

### Exact local effects and exclusions

The scripts inspect these `chrome.storage.local` keys:

- `renewalSessionsV1` — local renewal states
- `templateFillSessions` — local fill states
- `archiveInsertionSessionsV1` — ZIP/archive insertion states
- `massRenewalBatchV1` — mass-renewal batch state
- `bulkInventoryRun` — inventory capture run state

They set eligible nonterminal records to cancelled/review states and perform a readback. They do **not** remove the saved inventory/trash records or images in IndexedDB, alter user profiles, issue remote posting/deletion requests, remove immutable publish-intent/Phase-4/P8 safety journals, or force-release browser Web Locks or updater fences. These exclusions **do not guarantee** the preceding live operation actually completed or that a session is safe to retry.

### Known limitations — especially v1.25.12

- **v1.23.48:** The owner confirmed that the original script restored use of the interface in their historical installation. That is **one real-world report**, not general proof of recoverability of all states, and is not approval for use against later versions.
- **v1.25.12:** **Not native-tested and not recommended for unattended use.** Unlike the older v1.23.48 script, this archived original does **not enforce equality of the pre-backup and pre-write storage snapshots**. A new or changed workflow between the backup and mutation could be marked cancelled **without that precise new state being included in the downloaded backup**. This is a known concurrency limitation, not an endorsed safe recovery contract. It is preserved as historical source evidence, not silently modified to imply it was the script originally supplied.
- Chrome's local storage APIs do not provide a transaction across all five storage keys. A background worker running simultaneously may race with either script.
- A backend-reported unlocked state is a **local UI insertion-lock observation**, **not proof that all security gates, platform account restrictions, persisted owner states, or remote outcomes are clear**.

## Security and provenance

**Never upload downloaded recovery JSON backups, customer listings/images, diagnostic ZIPs, profiles, access tokens or account details to public GitHub.** The archived JavaScript files contain no owner-specific data; backups created at runtime may contain private information. Keep them protected locally and delete copies according to your recovery needs.

For current development, use the supported in-app emergency reset and a version-specific, evidence-based fix. A historical script should not be copied to a future version merely by changing the constant. Any new recovery tool needs independent current-code characterization, a bounded failure/recovery contract and safety tests.

Related: [global workflow/lock architecture (KAR-99)](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/99), [Phase-4 recovery bug (KAR-199)](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/199) and [this archive's owning Issue (KAR-204)](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/204).
