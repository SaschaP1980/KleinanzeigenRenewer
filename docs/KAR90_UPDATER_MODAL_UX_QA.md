# KAR-90 – Profile Management parity and Windows Updater UX

Parent: [#89](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/89). Work child: [#90](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/90).

## Implemented corrective scope

- The compact Windows-Updater configuration has explicit bottom breathing room after `Updater öffnen` before the next section boundary.
- The dedicated Windows-Updater dialog reuses the Profile Management header, kicker, shared circular SVG modal-close control, border/radius/backdrop/surface, headings, responsive scroll body and footer treatment.
- The default view shows a human-readable German result, active Chrome extension version, separately verified online-approved version, last successful check, one `Erneut prüfen` button and progressive `So aktualisierst du` help.
- Full Desktop OneClick instructions, help link, NativeHost transport status and technical evidence are inside optional help/technical details. The online approved channel is independent of corporate NativeHost availability. Unknown/offline results never claim up-to-date.
- The browser still cannot directly launch the Windows updater. The approved Windows standalone fallback, explicit human consent, all-Chrome-closed requirement and existing Chrome-profile reload rules remain unchanged.

## Executable checks and acceptance

New contract `node tests/kar90-updater-ux.cjs` asserts shared Profile Management classes and close icon, bottom spacing, exactly one progressive help region and plain-language state copy. Existing `tests/kar81-native-fallback.cjs` and historical close-count contract were updated narrowly to retain fallback availability while removing the permanently visible explanation wall.

Keep KAR85/KAR86 trusted version/state and fail-closed online channel tests, legacy Profile Manager tests, coverage no-regression, signed-extension identity and security checks and packaged browser E2E GREEN. The atomic builder produces a single immutable versioned Chrome ZIP with independently validated SHA-256, without changing global approved channel in this Work wave.

**Owner-native QA pending**: compare screenshot side-by-side with Profile Management, test narrow viewport, focus/Escape and thumb scroll, approve German copy, check account/inventory continuity and corporate online channel status. Host fixture/mock success alone is not managed-PC proof.

Dependent child [KAR-91](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/91) owns the English-only standalone Windows console and consented installed-kit reprovision. No GitHub Release and no automatic local Chrome/Windows update.
