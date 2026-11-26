# KAR-213 / S03 — Local upgrade precondition and recovery

**Development contract. Not a production upgrade authorization.** A real-profile migration is prohibited until S03 and S04 are accepted and the owner separately authorizes the actual migration. This document describes the intended bounded procedure. It does not authorize a merge, release, live account action or destructive cleanup.

## Scope

- Pinned sources: historical v1.23.48 (`f2225155e403d89d07a674c9e20f397a4f86694d`); donor v1.25.36 (`5ffd5eccce564154dca0f51b9229283a9d2dae85`); accepted S09 2.0.1.0 (`61f917d384cdce0fc191188e5a99515907967dbe`). Other source versions are unverified by this tool.
- Stable extension identity: `hafahjhhgiipdegfkgacchmnacgblnah`. IndexedDB `kleinanzeigen-renewal` version 2, stores `inventories` and `images`.
- Goal: preserve inventory, profile identities, images, trash metadata, settings, unknown fields and historical evidence. A profile ZIP alone is not a full upgrade backup; its manifest deliberately excludes workflow state.
- S03 does not introduce updater journals, admission layers, Web Locks, ongoing full-storage scans or hot-path overhead. Existing stored donor evidence is not deleted, rewritten or used as current authority.
- The offline review is a mandatory **operator precondition**, not a runtime-enforced activation gate. Skipping it is outside the reviewed upgrade procedure.

## Procedure for a future authorized migration

1. Preserve the exact previously installed extension package and verify its identity and hash. Do not remove the extension from Chrome. Make sure the old version remains available for rollback.
2. In the original version finish all running inventory/renewal/archive/template/batch operations. Any uncertain publication/deletion must be independently checked; do not retry blindly, reset, delete journal entries, or fabricate a resolution merely to obtain a clear result. If an unresolved outcome cannot be settled, stop the migration.
3. Obtain a full read-only snapshot of `chrome.storage.local` from the trusted extension service-worker DevTools of the actual old version, not from a Kleinanzeigen webpage or a replacement runtime. Example expression for the eventual authorized local capture:

   ```js
   const snapshot = {
     schema: 1,
     sourceVersion: chrome.runtime.getManifest().version,
     storageLocal: await chrome.storage.local.get(null),
     capturedAt: new Date().toISOString()
   };
   copy(JSON.stringify(snapshot));
   ```

   Save the output locally to a JSON file outside the repository. The JSON contains private data. Never commit, upload or paste it into an issue/chat. Only the redacted summary may be shared. A subset of storage keys or hand-edited snapshot is not acceptable. Do not run anything from an untrusted DevTools prompt. No storage writes are part of this step.
4. Close manager and all related tabs, exit Chrome completely (including background processes), and keep it closed. No extension or account activity may occur after the snapshot. If activity occurs, invalidate the snapshot and repeat the settled-state review. Run the offline checker using Node.js 22 from the reviewed source checkout:

   ```text
   node scripts/kar213-upgrade-preflight.cjs <local-snapshot.json>
   ```

   Exit 0 / `READY_FOR_OFFLINE_REVIEW` means the inspected storage evidence meets the conservative structural precondition, **not** current remote proof or authorization to install. Exit 1 / `BLOCKED` means stop and investigate the reported codes locally. Exit 2 means input or invocation failed. No automatic repair, deletion, remote verification or resumption is implemented. In every outcome `activationAuthorized` is false.
5. With Chrome closed, cold-copy the entire original Chrome user-data directory, not only the Default subdirectory or the profile ZIP. Identify the exact active profile and user-data parent from the original browser configuration; preserve all applicable profile directories, Local State, extension storage and IndexedDB data. Store a protected local backup outside the working tree, with original extension package and exact source version. Verify the file inventory and SHA-256 of every regular file against the cold original; errors, inaccessible files or unexpected links must stop the procedure. Do not assume copying a running LevelDB/IndexedDB is consistent. Keep the cold backup immutable and access-restricted; it may contain browser credentials and other private browsing data.
6. Restore only to a disposable isolated profile copy on the same host, without live account/network activity. Check the original version opens, exact expected keys/records/profile assignments/image hashes match, and the backup remains unchanged. A copy of a profile is not proof of cross-machine/OS credential portability. Never use the real profile as a fixture.
7. Only after the separately authorized migration prerequisites and isolated restore pass, install the reviewed candidate in a controlled manner, preserving extension identity and data. On unexpected changes or missing data stop before any live action. Keep the candidate working profile separate from the pristine backup; recover using a verified copy of the cold backup and the exact old extension, not a reverse migration that guesses at new data. No uninstall/reinstall, blind clear, partial overwrite or destructive repair is prescribed.

## Classification and evidence limits

The offline checker validates the pinned donor publish-intent, Phase-4 uncertainty, P8 admission and released-fence receipt formats, independently of the existence of a workflow session. Missing, orphaned, contradictory, malformed, future-dated, unknown-family or unresolved records block. Matched historical receipts require exact identity/timing and source/target evidence shape; a pair alone is insufficient. Known unfinished/attention states and unknown workflow shapes block conservatively. Some historically harmless records may require separate review rather than being guessed settled. Unrelated opaque storage keys are not modified or interpreted.

The checker cannot independently establish snapshot authenticity/completeness, physical backup consistency, current remote outcomes, whether Chrome is stopped, absence of new activity, or local/remote authorization. A result cannot substitute for the operator's precondition, isolated recovery evidence, complete technical gates, or owner approval. It does not inspect IndexedDB; the cold backup and isolated browser recovery cover that separate boundary.

The test `tests/kar213-offline-upgrade-preflight.cjs` uses synthetic fixtures only. The real Chromium test `tests/e2e/kar213-cold-upgrade-recovery.py` uses pinned historic packages, synthetic records and raw storage, a cold temporary-profile copy, repeated candidate boots and restoration from an untouched copy. It is a source-overlay diagnostic, not a new packaged release or real-account migration. See the canonical [KAR-213 evidence ledger](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/213#issuecomment-7189767494) for actual run status and outstanding gates. No test result is inferred from this procedure.
