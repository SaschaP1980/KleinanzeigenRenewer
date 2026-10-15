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


## Owner-authorized onboarding/footer follow-up (v1.23.37)

This separately authorized 2026-10-15 follow-up reuses the existing Profile Management dialog styling and preserves the existing read-only update status contract:
- One `Erneut prüfen` button sits at the **left** of the persistent footer; `Schließen` sits at the **right**. There is no duplicate retry control in the scroll body. Narrow viewports use equal shrinking footer buttons with focus and keyboard labels intact.
- The **visible** first-time setup section `Zum ersten Mal hier?` links to [the verified German beginner guide](user-manuals/windows-updater-einrichten.md) (`Einrichtungsanleitung öffnen`). The browser only opens instructions, not a Windows executable. Approval status does not establish installed Desktop shortcut presence.
- The separate existing-user section `Verknüpfung bereits vorhanden?` progressively reveals `Update-Schritte anzeigen`: save work, close all Chrome windows, run the existing Desktop shortcut, explicitly consent only when appropriate, open the same Chrome profile and reload the existing extension. Technical NativeHost diagnostic messages remain in collapsed details.
- Existing `src/app/native-update-check-ui.js` request, error, busy/disabled and focus wiring is unchanged except for the expanded/collapsed toggle labels.
- The old generic technical-doc fallback expectation in KAR81 was replaced by the real current end-user guide link; no safety checks are loosened.

Test-first evidence: real [Draft PR #96 source RED](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/38723457793) at 6112c349a01d55255e117c4ac594e59e7c2922c7, focused KAR90 footer assertion failed on unfixed UI. Same assertion passed after source fix b741a3105bb884b124e6b49f8715547ede6455a3 in [runtime/safety/coverage PR gate](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/38723911893). Atomic [v1.23.37 Work PATCH builder](https://github.com/SaschaP1980/KleinanzeigenRenewer/actions/runs/38724351427) completed success at f73f4ced8887d91300e9eb928a5e0f86903558de. That source-only intermediate PR run failed archive parity before packaging, as expected; **new exact final-HEAD Work PR 4/4 and post-merge main CI remain acceptance gates**.

**Native owner QA is still pending:** on real Chrome, check comparison to Profile Management, left/right footer at desktop and narrow widths, scrolling without footer overlap, Escape/focus return, visible setup entry and the German manual link, expanded update steps, approved-channel newer/equal/unknown/offline, NativeHost unavailable and no false Desktop detection. #94 real first-time Windows install and trust-policy acceptance are separately OPEN; do not claim them from this UI work. No public Release, Windows kit reprovision or approved-channel promotion is implied.
