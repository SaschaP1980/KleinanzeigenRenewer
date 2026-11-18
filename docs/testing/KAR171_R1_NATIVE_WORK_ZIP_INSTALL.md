# KAR-171 R1 — Work-only v1.25.14 Chrome test package and immutable P8 continuity

**Scope:** Owner-supervised R1 native evidence on the *same existing Chrome profile*, with original P8 receipts preserved. This is NOT a GitHub Release, R1 acceptance, a general update-apply authorization, a new account, or a permission to renew/delete/publish advertisements.

## Non-negotiable evidence continuity

- The previously observed Phase-4 original P8 and publication P8 evidence lives in `chrome.storage.local` under the installed extension ID `hafahjhhgiipdegfkgacchmnacgblnah`. Its original worker/token/attempt journal must survive **unchanged**, including the corresponding historical renewal/fill profile references.
- A fresh/isolated Chrome profile does **not** inherently contain this history. Merely importing a profile/inventory ZIP does not certify transfer of the P8/Phase-4/publication receipt keys or Chrome's IndexedDB. Do not claim otherwise.
- Chrome documents that `chrome.storage.local` survives browser history clearing but is cleared when the extension is **removed**; `chrome.storage.session` is lost when the extension is reloaded or the browser restarts. See https://developer.chrome.com/docs/extensions/reference/api/storage .
- For the **same-profile** test, do not click **Remove/Entfernen**, do not add a second unpacked extension with the same ID, and do not clear extension site data. A backup of the complete Chrome profile while Chrome is closed is a recovery prerequisite; it is NOT proof that a new directory/Chrome profile will automatically recover the immutable history.
- Never send or commit a copied Chrome profile, raw `chrome.storage.local`, authentication cookies, account names, full diagnostic records or other personal secrets. The review requires **only sanitized script output**.

## Before the owner installs anything

1. Verify the release-less **Work-only Chrome ZIP** was produced from an exact tested SHA on `work/KAR-171`, the manifest declares **v1.25.14**, the manifest `key` yields the unchanged extension ID, all mandatory runtime, safety and packaged Chromium fixture E2E gates are GREEN and the ZIP's SHA-256/size are recorded in #171.
2. Open `chrome://extensions` and check the currently installed Kleinanzeigen Manager's exact ID and source type. This procedure applies only if the existing installation is **unpacked** and you know the **existing extension source folder**. If the extension is a packaged/managed/store install, **stop**: no safe in-place unpacked swap is approved by this protocol.
3. In the **existing installed extension**, run the previously approved **Stage 2 read-only historical lineage** inspection once (or use the most recent already verified snapshot if nothing changed), recording **only sanitized counters/status**. Do not perform fresh listings or create new P8 evidence.
4. Open `chrome://version` and note the **Profile Path** locally. Exit Chrome completely (including background processes and other windows) and make a private offline copy of the **entire Chrome profile directory** and a separate copy of the existing **unpacked extension source folder**. Do not zip/upload them to GitHub/ChatGPT. Confirm both copies exist and can be read. If they cannot be copied or the profile path is ambiguous, **STOP**.
5. **Do not install** until you have personally reviewed this precise source/ZIP and chosen to proceed. The assistant cannot read or verify your offline profile backup remotely.

## Owner-controlled same-profile installation (only after step 1–5)

1. Keep Chrome **fully closed**. Preserve the backed-up original extension folder. In the original extension source path (not a new path), replace the previous runtime files with the contents of the verified Chrome ZIP, ensuring `manifest.json` lies directly at the extension folder root. Never copy the Chrome profile into the extension source folder. Do not delete the Chrome extension in `chrome://extensions`.
2. Start Chrome using the same browser profile. Go to `chrome://extensions`, check the Kleinanzeigen Manager extension **ID has not changed**, and click its **Reload/Aktualisieren** control only if needed. Confirm v1.25.14. If the ID changed, Chrome reports errors, the account/profile is not recognized or inventory/receipts are absent, **STOP**; do not run R1 or any listing action.
3. Repeat the same **Stage 2 read-only** sanitized counters and compare to the pre-swap evidence. Equality is a **continuity check**, not proof of every original token's identity or source deletion; conflicting/missing evidence blocks R1. Do not force or manually restore receipts.
4. Have the correct live Kleinanzeigen account open in **Meine Anzeigen / PROJECTS** with the matching selected manager inventory profile; avoid other workflows and account changes during the test.
5. Review the standalone source [`KAR171_R1_LIVE_REMOTE_OWNER_READ_ONLY.js`](KAR171_R1_LIVE_REMOTE_OWNER_READ_ONLY.js) and paste it **once** into the extension's **Service Worker DevTools** console (not into the website). This opt-in script **reads authenticated My Ads pages and may create/close managed, read-only verification tabs and update local tab-registry bookkeeping**, but it does **not** publish, renew, delete or change an ad. Only send the single sanitized output prefixed `KAR171_R1_LIVE_REMOTE_OWNER_V1`. The output always contains `r1Accepted:false` and `eligibleForLease:false`.
6. If the script fails, report its **sanitized status only**. Do not re-run posting/deletion, reset diagnostics or create/modify receipts to manufacture a pass. A positive `liveRemoteVerified:true` is **only a remote-account subproof**: R1 remains OPEN until original restart/interruption requirements and owner acceptance are proven.

## Rollback — no evidence fabrication

If extension startup or history continuity fails, do not run the Stage 3 probe. Fully close Chrome and restore the backed-up **original source folder** at the original path; only if the Chrome profile itself is corrupt, restore its **complete offline profile backup** while Chrome is closed. Prefer not to roll back the whole profile unnecessarily, as doing so can revert unrelated legitimate browsing state. After restart, verify the same extension ID and original redacted Stage 2 historical status. If history remains inconsistent, mark R1 **BLOCKED**, preserve both backups and diagnose non-destructively.

**Hard gates:** No automatic updater apply, NativeHost transaction, Chrome reload triggered by this test code, publication or deletion action, Work→main merge, PR closure or GitHub Release. R2–R6 remain parked.
