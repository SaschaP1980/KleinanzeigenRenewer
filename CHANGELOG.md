# Changelog

This is the canonical version-specific history for Kleinanzeigen Manager. Entries are sorted numerically by version identifier; `_c1`, `_c2` etc. follow their base version and do not establish a publication date. A source or correction version below does **not** imply a published GitHub Release. Verify [published assets](https://github.com/SaschaP1980/KleinanzeigenRenewer/releases) separately.

All distinct historical section bodies from the former root README and CHANGELOG are preserved with source labels and line numbers. The [KAR-170 migration ledger](docs/maintenance/KAR170_CHANGELOG_MIGRATION.json) identifies their original Git blobs and body checksums. Overlapping versions retain distinct factual notes; older references to planned builds or native/CI acceptance are **historical**, not live status.

## v1.23.90 — KAR-174 relocate application and launcher HTML/CSS (source Work candidate)

- Move the manager page and stylesheet from root to `src/app/app.html` and `src/app/app.css`, and the separately bundled launcher assets to `src/popup/popup.html` and `src/popup/popup.css`. The extension action opens the new manager URL; the launcher's manifest registration remains unchanged.
- Rebase HTML script/style/icon and CSS mask URLs, architecture graph discovery, deterministic Chrome ZIP allowlist/closure, source validation, legacy UI tests and packaged Chromium smoke coverage to the actual page-relative resources.
- Preserve the pinned KAR-167 historical repository snapshot, original archived releases, extension key and ID, Chrome permissions and guarded ad-operation behavior. Add independent executable checks that all four former root UI files are absent and new local assets are real and packaged.
- **Compatibility boundary:** Existing external bookmarks or persisted absolute URLs targeting `chrome-extension://<id>/app.html` will not redirect after installation. Reopen using the extension action or update the bookmarked URL to `/src/app/app.html`. Native profile/bookmark migration has not been independently verified.
- This is a source Work candidate, not a public GitHub Release. Merge, publishing and native-user acceptance remain separately gated.

## v1.23.89 — KAR-134 L15 automatic schema observation (source Work integration)

- Integrate schema observations into verified capture/refresh/edit-form and normal republishing flows; remove the standalone `Kategorie prüfen` inventory action and legacy synthetic/runtime test session entrypoints.
- Retain value-level fail-closed publication preflight, verified F1/F2/F3 structural drift review, explicit safeguarded two-step real F3 baseline consent, category-405 legacy verification and safety/readback gates. Local `Details anzeigen` does not trigger site navigation or a schema crawl.
- Add permanent L15 positive/negative regression coverage. This Work source version does **not** imply a published GitHub Release or native acceptance of a genuine F3 structural change; that remains open under [KAR-134](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/134).

## v1.23.88 — KAR-170 documentation consolidation

- Source-side Work change: rewrite README around the two original purposes (reusable saved listings/images, and routine re-insertion instead of paid visibility promotion); migrate historical version notes here; introduce a permanent documentation destination/check contract. This note does **not** represent a published GitHub Release.

## v1.23.87 — MV3 workflow safety foundation

- [KAR-99](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/99) foundation merged with [PR #100](https://github.com/SaschaP1980/KleinanzeigenRenewer/pull/100) to `main@07dd90f437054f11a1fad3067c03f2e1b88ec2cb`. The future positive updater lease, independent remote outcome and NativeHost acceptance are **not accepted** and belong to open [KAR-171](https://github.com/SaschaP1980/KleinanzeigenRenewer/issues/171). This version on source main is not a GitHub Release.

The historical documents did not give an individually attributable release note for every intermediate 1.23.x source package. This reconciliation does not invent missing records: Git commits and their Issues are the authority for those intervening changes.

## v1.23.22

<!-- KAR170-BEGIN:CHANGELOG:1 -->
### Original CHANGELOG: v1.23.22 (source line 1)

Correction für flüchtige Titel-Mismatches beim Template-Fill. Das aktive sichtbare Inserierformular wird für Titel-Readback und finale Verifikation explizit aufgelöst. Der Titel wird bounded gegen Controlled-Input-/DOM-Resets nachgelesen und bei Bedarf höchstens dreimal erneut exakt gesetzt; unmittelbar vor der finalen Verifikation erfolgt ein weiterer Stabilitätscheck. Bleibt der Titel abweichend, stoppt der Ablauf weiterhin fail-closed. Neue Diagnosen liefern Expected/Actual- und Feldkandidaten-Evidence. Keine neue IPC-/Runtime-Grenze und keine Änderung an Publish-/Delete-Safety. Nächster Architektur-Build nach nativer Abnahme bleibt v1.24.0 / EPIC-REF-003.
<!-- KAR170-END:CHANGELOG:1 -->

<!-- KAR170-BEGIN:README:1 -->
### Historical README: v1.23.22 – Title Field Stabilization Correction (source line 1)

v1.23.22 behebt einen real beobachteten flüchtigen Titel-Fill-Fehler in Massen-Renewals. Der Titel wird nach dem Setzen bounded zurückgelesen, bei einem Controlled-Input-/DOM-Reset erneut exakt gesetzt und vor der finalen Verifikation nochmals stabilisiert. Die Verifikation arbeitet dabei gegen das aufgelöste aktive Inserierformular. Exakte Gleichheit und fail-closed Safety bleiben unverändert; es gibt keinen Publish-Bypass und keine neue IPC-Grenze.
<!-- KAR170-END:README:1 -->

## v1.23.20_c1

<!-- KAR170-BEGIN:CHANGELOG:5 -->
### Original CHANGELOG: v1.23.20_c1 (source line 5)

Correction für einen im finalen nativen Performance-Smoke gefundenen UI-State-Recovery-Fehler. Ein vorbereiteter, aber noch nicht gestarteter Massen-Neuinserat-Draft konnte beim Visibility-/Actions-Resync von einem historischen terminalen `complete`-/`stopped`-Batch überlagert und dadurch fälschlich als abgeschlossen dargestellt werden. Automatische Startup-/Resync-/Storage-Rehydration verwendet nun Recovery-only-Semantik: aktive Batches bleiben recoverable; terminale Snapshots werden automatisch nur übernommen, wenn sie zur bereits lokal getrackten Batch-ID gehören. Explizite Review-Anwendung terminaler Snapshots bleibt möglich. Es wird kein Batch ohne Nutzeraktion gestartet und keine Publish-/Delete-/Account-/Profil-Safety verändert. Zusätzlich normalisiert der Public-API-Coverage-Report laufabhängige V8-Aufrufszähler auf binäre 0/1-Ausführungsevidenz, damit Source-Checkpoints und Source-ZIPs über identische Release-Läufe byte-stabil bleiben.
<!-- KAR170-END:CHANGELOG:5 -->

<!-- KAR170-BEGIN:README:5 -->
### Historical README: v1.23.20_c1 – stale terminal Mass-Renewal Rehydration Correction (source line 5)

Der finale v1.23.20-Native-Smoke fand vor dem Start des 3er-Performance-Laufs einen UI-State-Bug: Ein lokaler Selection-/Order-Draft konnte beim Zurückkehren zur App durch den zuletzt persistierten historischen terminalen Mass-Batch ersetzt werden. v1.23.20_c1 schützt automatische Startup-/Actions-/Visibility-/Storage-Rehydration vor solchen fremden terminalen Snapshots. Der Abschluss derselben tatsächlich laufenden Batch-ID wird weiterhin automatisch übernommen. Der Performance-Lauf bleibt auf `fast` mit 5/11/20 Bildern verpflichtend und wird erst nach diesem Correction-Smoke durchgeführt. Der Release-Report speichert Public-API-Ausführung außerdem deterministisch als 0/1-Evidenz statt als laufabhängige rohe V8-Aufrufszähler; dies ändert keine Runtime-Semantik.
<!-- KAR170-END:README:5 -->

## v1.23.20

<!-- KAR170-BEGIN:CHANGELOG:1951 -->
### Original CHANGELOG: 1.23.20 (source line 1951)

- Finaler v1.23.x-Closure-Build: Runtime-Code bleibt byteidentisch zu v1.23.19; Coverage-/Architecture-/Safety-/Reproduzierbarkeits-Gates werden erneut vollständig erzwungen.
- Nach technischem RELEASE_GREEN ist der native Gesamt-Soak inklusive verbindlichem realen 3er-Performance-Lauf (5/11/20 Bilder) durchzuführen.
<!-- KAR170-END:CHANGELOG:1951 -->

<!-- KAR170-BEGIN:README:1859 -->
### Historical README: v1.23.20 Final Closure (source line 1859)

v1.23.20 ist der finale Gesamt-Soak-/Gold-Paritäts-/Safety-/Reproduzierbarkeits-Build der v1.23.x-Refactoring-Serie. Der Runtime-Code bleibt gegenüber v1.23.19 byteidentisch. Nach dem technischen Release ist der native 3er-Performance-Lauf mit 5, 11 und 20 Bildern Pflicht.
<!-- KAR170-END:README:1859 -->

## v1.23.19

<!-- KAR170-BEGIN:CHANGELOG:9 -->
### Original CHANGELOG: v1.23.19 (source line 9)

- Architektur-/Cleanup-/Coverage-Closure über alle Runtime-Module.
- Globaler Public-vs-Private-Audit: 897 -> 805 im jeweiligen Modul implementierte Public Functions; unnötige Exporte privatisiert, ein totes Content-Policy-Modul entfernt.
- Dynamic Public Function Coverage: 805/805 (100 %). Safety-kritische Public APIs besitzen explizite Negativ-/Fail-closed-Evidenz.
- Neue echte V8-Line-/Branch-Coverage mit Gold-Baseline und permanentem No-Regression-Gate; modul- und bereichsbezogene Reports unter `coverage/`.
- Runtime-Reachability/Dependency-Audit: 100/100 Runtime-Module erreichbar, 0 fehlende KRDeps-Provider, 0 Zyklen.
- Keine neue Runtime-/IPC-Grenze; Publish-Safety unverändert. Nächster planmäßiger Build: v1.23.20 finaler Gesamt-Soak/Performance.
<!-- KAR170-END:CHANGELOG:9 -->

<!-- KAR170-BEGIN:README:9 -->
### Historical README: v1.23.19 – Architektur-/Coverage-Closure (source line 9)

Die Refactoring-Serie ist architektonisch geschlossen: sämtliche Runtime-Module wurden auf echte Public Contracts geprüft, unnötige Exporte privatisiert und ein totes Modul entfernt. 805/805 verbleibende implementierte Public Functions werden dynamisch ausgeführt. V8-basierte Line-/Branch-Coverage ist als Gold-Baseline mit No-Regression-Gate etabliert. Die Runtime ist vollständig erreichbar und der KRDeps-Graph enthält keine fehlenden Provider oder Zyklen. v1.23.20 bleibt der finale Gesamt-Soak inklusive realem 3er-Performance-Lauf.
<!-- KAR170-END:README:9 -->

## v1.23.18

<!-- KAR170-BEGIN:CHANGELOG:18 -->
### Original CHANGELOG: v1.23.18 (source line 18)

- Inventory Runner in fünf fachliche in-process Module zerlegt: Roster/Parser, Readiness, Status-/Failure-Overlay, Delete/Verification Operations und Bulk/Reconciliation Run Loop.
- `src/content/inventory-runner.js` bleibt kompatible Message-/Lifecycle-/Composition-Facade.
- Neue Modul-Public-API-Closure: 28 echte Public Methods, 28/28 dynamisch über Public APIs getestet; Delete, Readiness und Reconciliation besitzen explizite fail-closed Negativverträge.
- Keine neue Runtime-/IPC-Grenze; Publish-Safety unverändert. Nächster planmäßiger Build: v1.23.19 Architektur-/Coverage-Closure.
<!-- KAR170-END:CHANGELOG:18 -->

<!-- KAR170-BEGIN:README:13 -->
### Historical README: v1.23.18 – Inventory Runner modularisiert (source line 13)

Der My-Ads/Inventory-Content-Runner ist in Roster/Parser, Readiness, Status/Failure-Overlay, Delete/Verification und Bulk/Reconciliation-Run-Loop getrennt. `inventory-runner.js` bleibt die kompatible KRInventoryRun-Facade. Alle 28 neuen Modul-Public-Methods werden dynamisch contract-orientiert ausgeführt; Safety-Negativpfade bleiben fail-closed. Keine neue Runtime-/IPC-Grenze. Nächster planmäßiger Schritt: v1.23.19 Architektur-/Cleanup-/Coverage-Closure.
<!-- KAR170-END:README:13 -->

## v1.23.17_c3

<!-- KAR170-BEGIN:CHANGELOG:25 -->
### Original CHANGELOG: v1.23.17_c3 (source line 25)

- Correction für den nativen Extension-/Content-Rebootstrap: fünf bislang nicht reentry-sichere Shared-/Content-Dependencies verwenden bei Same-Document-Reinjektion die bereits registrierte KRDeps-API statt ein zweites Objekt zu registrieren.
- Betroffen: `KRMessageContractRegistry`, `KRManagedNavigation`, `KRPlatformHardening`, `KRPaidInsertionGuard`, `KRMyAdsReadiness`.
- `KRDeps.register()` bleibt unverändert strikt und erkennt echte Dependency-Konflikte weiterhin als Fehler.
- Kein Seiten-Reload, kein Polling, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze; Publish-Safety bleibt unverändert.
<!-- KAR170-END:CHANGELOG:25 -->

<!-- KAR170-BEGIN:README:17 -->
### Historical README: v1.23.17_c3 – Content-Rebootstrap-Härtung (source line 17)

Der bestehende manifestseitige und dynamische Content-Bootstrap kann bei bereits offenen Kleinanzeigen-Tabs zeitlich überlappen. Die fünf Shared-/Content-Module, die bislang keine eigene Same-Document-Reentry-Absicherung hatten, verwenden bei erneuter Ausführung jetzt ihre bereits registrierte KRDeps-API weiter. Die zentrale Dependency Registry bleibt absichtlich strikt; echte gleichnamige Konflikte werden nicht toleriert. Es gibt keinen Seiten-Reload, kein Polling, keinen neuen Message-Contract und keine neue Runtime-/IPC-Grenze.
<!-- KAR170-END:README:17 -->

## v1.23.17_c2

<!-- KAR170-BEGIN:CHANGELOG:32 -->
### Original CHANGELOG: v1.23.17_c2 (source line 32)

- Correction für den Awaiting-Publish-Status einer Papierkorb-Vorlage: Die Recovery-/Status-Aktion öffnet das zuvor geschlossene Modal jetzt wieder zuverlässig, solange der Vorgang fortsetzbar ist.
- Status-Reopen und Zieltab-Fokus sind getrennt: Das Modal enthält im Zustand „Anzeige ist vorbereitet“ eine separate Aktion „Anzeige prüfen“, die den bereits getrackten Kleinanzeigen-Tab explizit fokussiert.
- Beim Reopen wird der gespeicherte Zieltab nur auf Existenz und Kleinanzeigen-Zugehörigkeit geprüft; es erfolgt kein impliziter Fokuswechsel. Fehlt der Tab, greift weiterhin der bestehende fail-closed Target-Loss-/Restart-Pfad.
- Kein Polling, kein Auto-Publish, keine automatische Tab-Adoption, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze.
- Die v1.23.17_c1 Public-API-Closure der fünf Template-Filler-Module bleibt unverändert bei 28/28 dynamisch ausgeführten Public Methods.
<!-- KAR170-END:CHANGELOG:32 -->

<!-- KAR170-BEGIN:README:21 -->
### Historical README: v1.23.17_c2 – Trash-Template Modal-Reopen Correction (source line 21)

Die Recovery-/Status-Aktion eines bereits vorbereiteten Papierkorb-Templates öffnet den Statusdialog wieder, statt bei noch vorhandenem Zieltab ausschließlich dorthin zu fokussieren. Der Zieltab wird nun nur über die separate Modal-Aktion **„Anzeige prüfen“** fokussiert. Target-Loss, Restart, manuelle Veröffentlichung und alle Publish-Safety-Grenzen bleiben unverändert fail-closed.
<!-- KAR170-END:README:21 -->

## v1.23.17_c1

<!-- KAR170-BEGIN:CHANGELOG:40 -->
### Original CHANGELOG: v1.23.17_c1 (source line 40)

- Correction zur v1.23.17-Template-Filler-Modularisierung: `KRTemplateVerification.verifyTemplate()` ist kein Public Contract mehr, sondern internes Implementierungsdetail.
- Public-API-Audit der fünf neuen Template-Filler-Module: 29 -> 28 Public Methods; alle 28 verbleibenden Methoden werden dynamisch über ihre öffentlichen Modul-APIs getestet.
- Keine neue Runtime-/IPC-Grenze, keine Publish-Safety-Änderung; `.submit()`/`requestSubmit()` bleiben 0/0.
- Für v1.23.19 ist zusätzlich ein globaler Public-vs-Private-Audit über alle Runtime-Module verbindlich.
<!-- KAR170-END:CHANGELOG:40 -->

<!-- KAR170-BEGIN:README:25 -->
### Historical README: v1.23.17_c1 – Public-API-Closure (source line 25)

Diese Correction privatisiert den unnötigen Export `verifyTemplate()` im Verification-Modul und schließt die dynamische Public-API-Testabdeckung der fünf in v1.23.17 extrahierten Template-Filler-Module. Nach dem Audit verbleiben 28 echte Public Methods; alle 28 werden dynamisch ausgeführt. Für v1.23.19 ist derselbe Public-vs-Private-Audit für sämtliche Runtime-Module verbindlich.
<!-- KAR170-END:README:25 -->

## v1.23.17

<!-- KAR170-BEGIN:CHANGELOG:47 -->
### Original CHANGELOG: 1.23.17 (source line 47)

- Template Filler in fünf fachliche in-process Content-Module zerlegt: Category Flow, Form Fields/Attributes, Image Upload/Preview Stability, Verification und Publish/Paid-Insertion Flow.
- `src/content/template-filler.js` bleibt Lifecycle-Orchestrator und behält die bestehende `KRTemplateFill`-Public-API.
- Keine neue Runtime-/IPC-Grenze; Manifest, bestehender dynamischer Content-Bootstrap und Packaging laden die fünf Module vor dem Orchestrator.
- Publish-Safety unverändert: `.submit()` / `requestSubmit()` bleiben 0 / 0; Template-only veröffentlicht nie automatisch; Paid-Insertion bleibt fail-closed.
- Testarchitektur: neue Ownership-/Runtime-Verträge gegen Modul-APIs; historische lexikalische Tests verwenden ausschließlich testseitig eine zusammengesetzte Template-Filler-Source-Surface.
- Direkte Basis: technisch RELEASE_GREEN und für den c2-Correction-Scope nativ GREEN `1.23.16_c2`. Nächster planmäßiger Build: v1.23.18 – Inventory Runner modularisieren.
<!-- KAR170-END:CHANGELOG:47 -->

<!-- KAR170-BEGIN:README:29 -->
### Historical README: v1.23.17 – Template Filler modularisiert (source line 29)

Regulärer Refactoring-Build auf Basis von v1.23.16_c2. Der bisherige `src/content/template-filler.js` wird entlang fachlicher Grenzen in fünf über `KRDeps` komponierte Content-Module zerlegt: Kategoriefluss, Formularfelder/Merkmale, Bild-Upload/Preview-Stabilität, Verifikation und Publish/Paid-Insertion. Der verbleibende Template Filler orchestriert Session-/Page-Lifecycle und UI-Feedback. Es entsteht keine neue Chrome-/Message-/IPC-Grenze; Publish-Safety und der c2-Target-Loss-Recovery bleiben unverändert. Nächster planmäßiger Build ist v1.23.18 – Inventory Runner modularisieren.
<!-- KAR170-END:README:29 -->

## v1.23.16_c2

<!-- KAR170-BEGIN:CHANGELOG:56 -->
### Original CHANGELOG: 1.23.16_c2 (source line 56)

- Correction-Patch für den verbleibenden c1-Lifecycle-Restfehler: Wird der bereits vorbereitete Papierkorb-Template-Zieltab geschlossen, während „Anzeige ist vorbereitet“ offen bleibt, wechselt das Modal jetzt sofort in-place auf „Vorbereiteter Tab wurde geschlossen“.
- Eventgetrieben über den bestehenden `chrome.tabs.onRemoved`-Listener; kein Polling. Nur die exakt getrackte `targetTabId` im Zustand `awaiting-publish` wird verarbeitet. Fremde Tab-Schließungen bleiben wirkungslos.
- Der Tab-Lifecycle-Listener verwendet nur einen bereits instanziierten Archive/Trash-UI-Controller und erzeugt für beliebige Tab-Schließungen keine neue UI-Komposition.
- Der c1-Recovery bleibt unverändert: „Anzeige neu vorbereiten“ öffnet nur nach Background-bestätigtem Target-Loss einen neuen Tab, veröffentlicht nichts automatisch und beendet den alten Fill kontrolliert als superseded. Kein automatisches Rebind eines wiederhergestellten Tabs.
- Kein neuer Message-Typ, keine neue Runtime-/IPC-Grenze und keine Änderung an Publish-/Account-/Profil-Safety (`.submit()` / `requestSubmit()` = 0 / 0).
- Technisch bleibt `manifest.version = 1.23.16`; sichtbar und in Artefakten wird `version_name = 1.23.16_c2` verwendet. Der reguläre nächste Build bleibt v1.23.17.
<!-- KAR170-END:CHANGELOG:56 -->

<!-- KAR170-BEGIN:README:33 -->
### Historical README: v1.23.16_c2 – Live-Recovery bei geschlossenem vorbereiteten Tab (source line 33)

Correction-Patch auf Basis von v1.23.16_c1. Wird der getrackte Kleinanzeigen-Zieltab geschlossen, während das Modal „Anzeige ist vorbereitet“ bereits offen ist, wechselt genau dieses Modal jetzt sofort über den bestehenden `chrome.tabs.onRemoved`-Pfad in den Zustand „Vorbereiteter Tab wurde geschlossen“. Kein Polling, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze. Der c1-Recovery „Anzeige neu vorbereiten“ bleibt unverändert fail-closed: kein Auto-Publish, alter Fill nur nach Background-bestätigtem Target-Loss superseded, kein automatisches Rebind eines wiederhergestellten Tabs. Technische Manifest-Version bleibt 1.23.16, sichtbare Version/Artefakte sind 1.23.16_c2. Der reguläre nächste Refactor bleibt v1.23.17.
<!-- KAR170-END:README:33 -->

## v1.23.16_c1

<!-- KAR170-BEGIN:CHANGELOG:65 -->
### Original CHANGELOG: 1.23.16_c1 (source line 65)

- Correction-Patch für den im nativen v1.23.16-UI-Smoke gefundenen Papierkorb-Template-Recovery-Bug: Ein `template-only-complete`-Vorgang konnte nach Schließen seines Ziel-Tabs weiterhin den normalen Dialog „Anzeige ist vorbereitet“ öffnen, obwohl die Session an der alten `targetTabId` nicht mehr sicher fortsetzbar war.
- UI-Fix: Beim Status-Reopen wird der gespeicherte Zieltab geprüft. Ist er nicht mehr vorhanden, erscheint „Vorbereiteter Tab wurde geschlossen“ mit einem klaren, fail-closed Recovery-Hinweis. „Ins Inventar aufnehmen“ bleibt in diesem Zustand ausgeblendet/gesperrt.
- Recovery: „Anzeige neu vorbereiten“ öffnet nach expliziter Bestätigung einen neuen Kleinanzeigen-Tab mit derselben Papierkorb-Vorlage. Es wird weiterhin nichts automatisch veröffentlicht. Der Dialog weist darauf hin, vorher „Meine Anzeigen“ zu prüfen, falls die geschlossene Anzeige möglicherweise bereits manuell veröffentlicht wurde.
- Background-Safety: Der bestehende `START_TRASH_TEMPLATE_FILL`-Contract erhält optional `supersedeFillId`. Der alte Fill wird nur dann als `cancelled / template-only-target-tab-lost-superseded` markiert, wenn der Background selbst bestätigt, dass genau dessen `targetTabId` nicht mehr existiert. Ist der Tab noch offen oder nicht sicher prüfbar, wird kein zweiter Zieltab gestartet.
- Kein automatisches Rebind eines per Strg+Umschalt+T oder anderweitig wiederhergestellten Tabs anhand bloßer URL.
- Kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze; Publish-Safety bleibt unverändert (`.submit()` / `requestSubmit()` = 0 / 0).
- Technisch bleibt `manifest.version = 1.23.16`; sichtbar und in Artefakten wird `version_name = 1.23.16_c1` verwendet. Der reguläre nächste Build bleibt v1.23.17.
<!-- KAR170-END:CHANGELOG:65 -->

<!-- KAR170-BEGIN:README:37 -->
### Historical README: v1.23.16_c1 – Recovery bei geschlossenem Papierkorb-Template-Tab (source line 37)

Correction-Patch auf Basis der technisch RELEASE_GREEN v1.23.16. Wird der fertig vorbereitete Kleinanzeigen-Zieltab eines Papierkorb-Template-Vorgangs geschlossen, zeigt der Manager beim Wiederöffnen des Status jetzt einen expliziten Recovery-Zustand statt weiterhin „Anzeige ist vorbereitet“. „Anzeige neu vorbereiten“ öffnet bewusst einen neuen Zieltab; veröffentlicht wird weiterhin nichts automatisch. Der Background supersediert den alten Fill nur, wenn er selbst bestätigt, dass genau dessen gespeicherte `targetTabId` nicht mehr existiert. Ein wiederhergestellter oder anderer Tab wird nicht allein anhand seiner URL automatisch übernommen. Technische Manifest-Version bleibt 1.23.16, sichtbare Version/Artefakte sind 1.23.16_c1. Der reguläre nächste Refactor bleibt v1.23.17.
<!-- KAR170-END:README:37 -->

## v1.23.16

<!-- KAR170-BEGIN:CHANGELOG:1945 -->
### Original CHANGELOG: 1.23.16 (source line 1945)

- Bulk Worker und Reconciliation in eigene in-process Services extrahiert.
- Archive Recovery und Verification/Promotion getrennt.
- Mass-Renewal-Watchdog separat; globaler Emergency Reset als expliziter Safety-Controller.
- Keine neue Runtime-/IPC-Grenze; Safety-/Tombstone-Semantik unverändert.
<!-- KAR170-END:CHANGELOG:1945 -->

<!-- KAR170-BEGIN:README:1856 -->
### Historical README: v1.23.16 Architektur (source line 1856)

Bulk-/Archive-/Emergency-Lifecycle sind in explizite in-process Owner getrennt. Tests adressieren bevorzugt Public Contracts; private Helper bleiben austauschbare Implementierungsdetails.
<!-- KAR170-END:README:1856 -->

## v1.23.15

<!-- KAR170-BEGIN:CHANGELOG:75 -->
### Original CHANGELOG: v1.23.15 – Renewal Workflow Controller zerlegt (source line 75)

- `renewal-verification-flow.js`, `renewal-reinventory-flow.js` und `paid-checkout-recovery-service.js` aus dem bisherigen Controller extrahiert.
- `renewal-workflow-controller.js` hält weiter Retry-/Resume-/Publish-/Auto-Replacement-Ownership.
- Capability-Port-Dependencies statt neuer Runtime-/Message-/IPC-Grenzen; `renewalAttemptDetails` im Background nun explizit verdrahtet.
- Verhaltens-Characterization und neue Runtime-/Wiring-Regressionstests; finaler Gesamt-Soak/Performance erst v1.23.20.
<!-- KAR170-END:CHANGELOG:75 -->

<!-- KAR170-BEGIN:README:41 -->
### Historical README: v1.23.15 – Renewal Workflow Controller zerlegt (source line 41)

Auf der nativ grünen v1.23.14-Basis sind Fast-Verifikation, Safe-Reinventarisierung und Paid-/Checkout-Recovery in drei kleine fachliche in-process Owner extrahiert. Der Controller bleibt für Skeleton/Persistenz, Retry, Publish, Auto-Replacement und Resume autoritativ. Die Ports werden explizit komponiert; keine zusätzliche Runtime-/IPC-Grenze. Der reale 3er-Performance-Lauf bleibt v1.23.20 vorbehalten.
<!-- KAR170-END:README:41 -->

## v1.23.14

<!-- KAR170-BEGIN:CHANGELOG:84 -->
### Original CHANGELOG: 1.23.14 (source line 84)

- Inventory- und Trash-Rendering aus dem bisherigen großen Render-Controller in `inventory-card-renderer.js` und `trash-card-renderer.js` getrennt; gemeinsame belegte Card-Primitiven liegen in `record-card-view.js`.
- `inventory-render-controller.js` bleibt als kleine in-process Kompositions-/Kompatibilitätsfassade erhalten.
- Archive-Insertion-UI und Trash-Template-UI in getrennte Controller zerlegt; die bisherige kombinierte Fassade komponiert nur noch beide Owner.
- IndexedDB-Snapshot/Restore des Profil-Backups inklusive Collision-Checks und atomarem Inventories+Images-Replace in `profile-backup-storage-service.js` verschoben; UI-Lock/Picker/Import-/Export-Orchestrierung bleibt im Profil-Backup-Controller.
- Keine neue Runtime-/IPC-Grenze; Account-/Profil-, Publish-/Delete- und Workflow-Safety bleiben unverändert.
- Build-Recovery: externe GREEN-Checkpoint-ZIPs werden während des laufenden Builds direkt unter `/mnt/data` behalten und erst nach vollständig verifiziertem `RELEASE_GREEN` entbehrlich.
- Nächster regulärer Refactoring-Build: v1.23.15 – Renewal Workflow Controller zerlegen.
<!-- KAR170-END:CHANGELOG:84 -->

<!-- KAR170-BEGIN:README:45 -->
### Historical README: v1.23.14 – Inventory-/Trash-Rendering + Backup/UI-Trennung (source line 45)

Refactoring-Build auf der technisch und nativ grünen v1.23.13_c2-Basis. Inventory- und Trash-Karten besitzen getrennte Renderer; echte gemeinsame Card-Primitiven liegen in `record-card-view.js`. Archive-Insertion-UI und Trash-Template-UI sind getrennte Owner, während die bisherige kombinierte Fassade nur noch in-process komponiert. Der Profil-Backup-Controller delegiert IndexedDB-Snapshot/Restore an `profile-backup-storage-service.js`. Fachliche Workflows, Account-/Profil-Safety, Publish-/Delete-Safety und IPC-Grenzen bleiben unverändert. Nächster regulärer Build ist v1.23.15.
<!-- KAR170-END:README:45 -->

## v1.23.13_c2

<!-- KAR170-BEGIN:CHANGELOG:95 -->
### Original CHANGELOG: 1.23.13_c2 (source line 95)

- Correction-Build für den verbleibenden nativen Reentry-UI-Fehler aus v1.23.13_c1: Der Capture-State wurde bereits korrekt rehydriert, aber eine gleichzeitig aktive Activity konnte den sichtbaren Inventory-Progress-Shortcut durch die Single-currentActivity-Arbitration wieder ausblenden.
- Fix: Der Inventory-Progress-Shortcut bleibt sichtbarkeitsseitig beim `KRInventoryCaptureController`/`KRInventoryCaptureView` und wird nicht mehr vom zentralen Single-Slot-Visibility-Loop verdeckt.
- Bulk-Status-Activity und Inventory-Shortcut verwenden getrennte Activity-Identitäten, sodass ihre Slots sich nicht gegenseitig überschreiben. Background-Run, Reentry-Bindung, Stop-after-current, Reconciliation und Safety bleiben unverändert.
- Release-Recovery zusätzlich gehärtet: der detached Supervisor schreibt alle 120 Sekunden einen persistenten Status-Snapshot; lange Phasen werden wieder selbstständig bis zum nächsten belastbaren Meilenstein fortgeführt. Kurze Status-Polls, sichtbares Statusfeedback ungefähr alle fünf Minuten und externe hashverifizierte GREEN-Checkpoints bleiben verbindlich.
- Browser-E2E-Härtung: `bulk-runtime-lease-recovery` weist nach dem absichtlichen MV3-Service-Worker-Abbruch zuerst einen tatsächlich neuen Background-Epoch nach und prüft erst danach den Recovery-State. Damit wird eine reproduzierte Timing-Flake des Test-Harnesses beseitigt; der Produkt-/Runtime-Recovery-Code bleibt unverändert.
- Browser-E2E-Startup zusätzlich gehärtet: Der Szenario-Bootstrap triggert den MV3-Background aktiv über `GET_BACKGROUND_EPOCH` und verlangt einen gültigen Epoch plus registrierten Service-Worker. Der sporadische `bottom-clamp-four-views`-INFRA-Fail durch rein passive Worker-Erkennung wird damit im Harness geschlossen; Produktcode bleibt unverändert.
- Technisch bleibt `manifest.version = 1.23.13`; sichtbar und in Artefakten wird `version_name = 1.23.13_c2` verwendet. Der nächste reguläre Build bleibt v1.23.14.
<!-- KAR170-END:CHANGELOG:95 -->

<!-- KAR170-BEGIN:README:49 -->
### Historical README: v1.23.13_c2 – Inventory-Reentry trotz konkurrierender Meldung (source line 49)

Correction-Build auf Basis von v1.23.13_c1. Der laufende Inventory-Capture wird nach App-Neustart weiterhin korrekt rehydriert; zusätzlich bleibt der kompakte „Fortschritt anzeigen“-Einstieg jetzt sichtbar, auch wenn gleichzeitig eine andere aktive Meldung wie „Vorlagen-Inserat ist vorbereitet“ den aktuellen Activity-Slot belegt. Die Shortcut-Sichtbarkeit bleibt beim Capture-Controller, Bulk-Status und Shortcut verwenden getrennte Activity-Identitäten. Technische Manifest-Version bleibt 1.23.13, sichtbare Version ist 1.23.13_c2. Der reguläre Refactorplan setzt danach mit v1.23.14 fort. Das packaged Browser-E2E `bulk-runtime-lease-recovery` wartet außerdem explizit auf einen neuen Service-Worker-/Background-Epoch, bevor der Recovery-State geprüft wird; dies härtet nur den Test-Harness gegen eine nachgewiesene Timing-Flake und ändert keine Produkt-Runtime-Semantik.
<!-- KAR170-END:README:49 -->

## v1.23.13_c1

<!-- KAR170-BEGIN:CHANGELOG:105 -->
### Original CHANGELOG: 1.23.13_c1 (source line 105)

- Correction-Build für den nativen v1.23.13-Reentry-Fehler bei „Anzeigen erfassen“: Ein laufender Bulk-Inventurlauf blieb im Background korrekt aktiv, wurde nach Schließen und erneutem Öffnen der Manager-App aber nicht wieder in den Inventory-Capture-UI-State gebunden.
- Fix: `renderBulkState()` rehydriert einen laufenden, profilpassenden Run nur bei fehlendem/stalem Capture-State über den bestehenden `bindExistingBulkInventoryCapture()`-Pfad. Normale In-Session-Updates werden nicht wiederholt neu gebunden.
- Nach Rehydration bleibt bei geschlossenem Dialog ein kompakter „Fortschritt anzeigen“-Einstieg verfügbar. Reentry startet keinen zweiten Bulk-Workflow.
- Neues Diagnoseevent `UI_INVENTORY_CAPTURE_BULK_REENTRY_BOUND` dokumentiert den lokalen Rebind. Background-Run, Stop-after-current, Reconciliation, Account-/Profil-Safety und Runtime-/IPC-Grenzen bleiben unverändert.
- Technisch bleibt `manifest.version = 1.23.13`; sichtbar und in Artefakten wird `version_name = 1.23.13_c1` verwendet. Der nächste reguläre Build bleibt v1.23.14.
<!-- KAR170-END:CHANGELOG:105 -->

<!-- KAR170-BEGIN:README:53 -->
### Historical README: v1.23.13_c1 – Bulk-Capture-Reentry nach App-Neustart (source line 53)

Correction-Build auf Basis von v1.23.13. Ein laufender Bulk-Inventurlauf wird nach Schließen und erneutem Öffnen der Manager-App wieder lokal in den bestehenden Inventory-Capture-Progress gebunden. Der Reentry verwendet denselben Run und startet keinen zweiten Workflow. Technische Manifest-Version bleibt 1.23.13, sichtbare Version ist 1.23.13_c1. Der reguläre Refactorplan setzt danach mit v1.23.14 fort.
<!-- KAR170-END:README:53 -->

## v1.23.13

<!-- KAR170-BEGIN:CHANGELOG:113 -->
### Original CHANGELOG: 1.23.13 (source line 113)

- Inventory Capture intern zerlegt: `src/app/inventory-capture-view.js` besitzt Dialog-, Step-, Progress-, Result- und Candidate-Rendering; `src/app/inventory-candidate-model.js` besitzt pure Kandidaten-Deduplizierung, Source-Priorisierung und stabile Inventar-/Papierkorb-/Neu-Klassifikation.
- `src/app/inventory-capture-controller.js` bleibt autoritativer Owner für Single-/Bulk-Start, Stop-after-current, Candidate-Discovery, Reentry, Emergency-Reset und Workflow-State-Transitions.
- App-Komposition verdrahtet beide neuen Module in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze.
- Historische Inventory-Capture-Characterizations wurden ausschließlich auf die neue Source-Ownership migriert; fachliche Assertions bleiben erhalten.
- v1.23.12_c1 ist direkte technisch und nativ grüne Basis; der `normalizeInventoryScope`-Regressionstest bleibt dauerhaft aktiv.
- Reale 3er-Performance-Abnahme bleibt planmäßig v1.23.20 vorbehalten, sofern vorher kein konkreter Performanceverdacht entsteht.
<!-- KAR170-END:CHANGELOG:113 -->

<!-- KAR170-BEGIN:README:57 -->
### Historical README: v1.23.13 – Inventory Capture intern zerlegt (source line 57)

**Aktueller Stand:** v1.23.13 basiert auf der technisch und nativ grünen v1.23.12_c1. `inventory-capture-view.js` übernimmt die reine Darstellung des Erfassungsdialogs, `inventory-candidate-model.js` die pure Kandidaten-/Membership-Logik. `inventory-capture-controller.js` behält die autoritative Lifecycle-Ownership für Single/Bulk, Stop-after-current und Reentry. Es entsteht keine neue Runtime-/IPC-Grenze. Nächster regulärer Refactoring-Build ist v1.23.14.
<!-- KAR170-END:README:57 -->

## v1.23.12_c1

<!-- KAR170-BEGIN:CHANGELOG:122 -->
### Original CHANGELOG: 1.23.12_c1 (source line 122)

- Correction-Build auf Basis des ausgelieferten v1.23.12: „Anzeigen erfassen“ scheiterte nativ beim Aufbau des Bulk-Inventar-Controllers mit `ReferenceError: normalizeInventoryScope is not defined`.
- Root Cause: Beim v1.23.12-Composition-Root-Refactor wurde der lokale Helper entfernt, während `requireBulkInventoryController()` den Dependency-Namen weiterhin übergab.
- Fix: `normalizeInventoryScope` wird im Background-Composition-Root direkt aus der bereits autoritativen `KRInventoryScope.normalizeInventoryScope`-Policy gebunden; keine neue Policy und keine Runtime-/IPC-Grenze.
- Neuer Regressionstest sichert die beiden betroffenen Bulk-Erfassungsrouten, den definierten Composition-Root-Binding und die unveränderte `all`/`new-only`-Semantik.
- Technisch bleibt `manifest.version = 1.23.12`; sichtbar und in Artefakten wird `version_name = 1.23.12_c1` verwendet. Der reguläre Buildplan bleibt unverändert; nächster regulärer Build ist v1.23.13.
<!-- KAR170-END:CHANGELOG:122 -->

## v1.23.12

<!-- KAR170-BEGIN:CHANGELOG:130 -->
### Original CHANGELOG: v1.23.12 (source line 130)

- Composition Roots & Routing Cleanup auf der technisch und nativ grünen v1.23.11-Basis.
- `src/app/app-elements.js` übernimmt 233 Top-Level-DOM-Bindings aus `app.js` in strukturierte Gruppen; Verhalten und Selektoren bleiben unverändert.
- `src/app/profile-account-ui-controller.js` übernimmt Account-/Profil-Präsentationsprimitiven und Profilmanager-Rendering. Die belegten Compatibility-Mirrors `currentProfile`, `liveAccountState` und `liveAccountAmbiguousNames` wurden entfernt; `accountGateState` bleibt autoritativ und Profil-Mismatch bleibt fail-closed.
- `src/background/background-message-router.js` besitzt die explizite 82-Typen-Routentabelle. Message-Contract-Enforcement, Plattform-Safety-Gate und Fehlerdiagnose bleiben unverändert.
- `src/shared/renewal-policy.js` zentralisiert Safe/Fast-Normalisierung, 1..5-Attempt-Clamping, Attempt-/Retry-Policy und nicht-retrybare Safety-Klassifikation.
- Keine neue Runtime-/IPC-Grenze; neue Module laufen in-process über `KRDeps`. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben 0/0.
- Recovery-Härtung erweitert: wichtige GREEN-Zwischenstände werden während laufender Builds extern hashverifiziert gesichert; nach vollständig verifiziertem `RELEASE_GREEN` dürfen temporäre Zwischen-Checkpoints entfallen und die finale Release-Struktur wird alleinige Recovery-Authority.
- Der reale 3er-Performance-Lauf ist nicht Teil von v1.23.12; verbindlicher Abschluss bleibt v1.23.20, sofern vorher kein konkreter Performanceverdacht entsteht.
<!-- KAR170-END:CHANGELOG:130 -->

<!-- KAR170-BEGIN:README:61 -->
### Historical README: v1.23.12 – Composition Roots & Routing Cleanup (source line 61)

**Aktueller Correction-Stand:** v1.23.12_c1 behebt ausschließlich den nativen Bulk-Erfassungs-Wiringfehler `normalizeInventoryScope is not defined`; der reguläre nächste Refactoring-Build bleibt v1.23.13.


v1.23.12 setzt die nativ grüne v1.23.11-Basis fort. `app-elements.js` übernimmt die 233 Top-Level-DOM-Bindings, `profile-account-ui-controller.js` bündelt Account-Gate-/Profil-Präsentation, `background-message-router.js` besitzt die explizite 82-Typen-Routentabelle und `shared/renewal-policy.js` zentralisiert Safe/Fast- und Attempts-Policy. Die belegten Account/Profile-Compatibility-Mirrors wurden entfernt; `accountGateState` bleibt autoritativ. Es entsteht keine neue Runtime-/IPC-Grenze.

Während laufender Builds werden wichtige GREEN-Meilensteine zusätzlich extern hashverifiziert gesichert, damit ein vollständiger Sandbox-/Runtime-Wechsel keine Zwischenbytes verliert. Nach vollständig verifiziertem `RELEASE_GREEN` werden diese Zwischenstände nicht mehr benötigt; die finalen Release-Artefakte bilden dann die Recovery-Authority. Der reale 3er-Performance-Lauf bleibt für v1.23.20 reserviert.
<!-- KAR170-END:README:61 -->

## v1.23.10

<!-- KAR170-BEGIN:CHANGELOG:143 -->
### Original CHANGELOG: 1.23.10 (source line 143)

- EPIC-REF-002: Inventory Capture Controller vervollständigt; Single-Start, Bulk-Start, Stop-after-current und Reentry-Orchestrierung liegen nun im bestehenden in-process Controller.
- `app.js` delegiert Capture-Lifecycle-Aktionen nur noch dünn; keine neue Runtime-/IPC-Grenze.
- Bestehende Account-/Profilbindung, Reentry-Sicherheit, Bulk-Locks und kontrollierter Stop bleiben erhalten.
- Build-/Recovery-Härtung aus v1.23.9 bleibt verbindlich: kurze Status-Polls, sichtbarer 5-Minuten-Heartbeat und selbstenthaltende Release-Closure.
<!-- KAR170-END:CHANGELOG:143 -->

<!-- KAR170-BEGIN:CHANGELOG:1939 -->
### Original CHANGELOG: v1.23.10 Release-/Stream-Härtung (source line 1939)

- Lange Release-Pipelines können jetzt über `scripts/release-supervisor.sh` detached vom Chat-/Tool-Stream gestartet werden; Supervisor-PID, RC, Wall-Clock und Log bleiben persistent.
- Vor dem langen Release-Lauf wird ein exakter `source-before-release`-Checkpoint erzeugt. Ein alter `RELEASE_GREEN` wird bei neuem Source-Stand entfernt und der Stage-State auf `source-dirty` gesetzt.
- Status-Polls sind ausdrücklich kurz und nicht blockierend; ein `STREAM_TIMEOUT` wird getrennt von Gate-/Buildfehlern behandelt und erst anhand von PID/RC/Stage/Log klassifiziert.
- Diese Regeln sowie der spätestens ungefähr fünfminütige sichtbare Europe/Berlin-Heartbeat werden in Handover und Initial-Prompt fortgeschrieben.
<!-- KAR170-END:CHANGELOG:1939 -->

## v1.23.9

<!-- KAR170-BEGIN:CHANGELOG:150 -->
### Original CHANGELOG: v1.23.9 (source line 150)

- `Control Accordion Controller` übernimmt Accordion-Zustand, kontrollierte/native Open-Semantik, Animation, Watchdog-/Stale-State-Recovery und Accordion-Diagnosesnapshot aus `app.js`.
- `Diagnostics Controls Controller` übernimmt Diagnose-ZIP-Download, fail-closed Diagnose-Reset-Sperren und den zweistufig bestätigten lokalen Emergency-Workflow-Reset aus `app.js`.
- `Renewal Settings Controller` übernimmt Voll-/Schnellprüfung, Fast-Mode-Erstbestätigung und begrenzte Versuche je Phase einschließlich Persistenz-/UI-Synchronisation.
- Alle drei Controller laufen in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze. Historische Tests wurden nur an die neue Source-Ownership angepasst.
- Packaged Browser-E2E deckte vor Release einen App-Boot-Fehler durch eine beim Accordion-Refactor verlorene `controlAccordionReducedMotion()`-Fassade auf. Der Fehler wurde gemäß RED→GREEN-Regel mit dauerhaftem Regressionstest behoben; die Fassade delegiert nun wieder an den Controller.
- Der Finalizer spiegelt den finalen Recovery-Checkpoint jetzt zusätzlich in den Release-Ordner, prüft `SHA256SUMS.txt` vor `RELEASE_GREEN` als vollständig lokale Closure und nimmt den Checkpoint in das Übergabepaket auf.
- Der gehärtete `release-finalize`-Gate und die verkettete Release-Pipeline bleiben verbindlich.
<!-- KAR170-END:CHANGELOG:150 -->

## v1.23.8

<!-- KAR170-BEGIN:CHANGELOG:160 -->
### Original CHANGELOG: v1.23.8 (source line 160)

- `Account Session Controller` übernimmt Account-Probe-Integration, Account-Gate-Diagnosesnapshot und fail-closed Profil/Konto-Bindungsprüfung aus `background.js`.
- `Profile Management Controller` übernimmt Profilzustand, Auswahl, Erkennung, Legacy-Zuordnung, Backup-Import und sichere Profil-Löschung einschließlich bestehender Bulk-/Renewal-Sperren.
- Beide Controller laufen in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze.
- Historische Characterization-Verträge wurden nur an die neue Source-Ownership angepasst; Safety-Assertions bleiben erhalten.
- Der seit v1.23.7 materialisierte `release-finalize`-Gate bleibt Teil der verbindlichen Release-Pipeline.
<!-- KAR170-END:CHANGELOG:160 -->

<!-- KAR170-BEGIN:README:70 -->
### Historical README: v1.23.8 – Account Session Controller + Profile Management Controller (source line 70)

v1.23.8 setzt EPIC-REF-002 auf der nativ grünen v1.23.7-Basis fort. Account-Session-/Live-Account-Binding und Profilverwaltung werden aus `background.js` in die in-process Controller `src/background/controllers/account-session-controller.js` und `src/background/controllers/profile-management-controller.js` verschoben. Profilwahl, Backup-/Restore-Safety, Profil-Löschung, Legacy-Zuordnung, Live-Account-Probe und fail-closed Account-Binding bleiben fachlich unverändert. Es wird keine neue Runtime-/IPC-Grenze eingeführt. Der gehärtete `release-finalize`-Gate aus v1.23.7 bleibt verbindlich.
<!-- KAR170-END:README:70 -->

## v1.23.7

<!-- KAR170-BEGIN:CHANGELOG:168 -->
### Original CHANGELOG: v1.23.7 (source line 168)

- EPIC-REF-002: Den vollständigen Diagnose-ZIP-Aufbau aus `background.js` in `src/background/services/diagnostic-export-service.js` extrahiert. `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze und delegiert `GET_DIAGNOSTIC_EXPORT` in-process über `KRDeps`.
- Source-Struktur bereinigt: alle 64 bisherigen Root-`*.js`-Dateien fachlich unter `src/shared/`, `src/background/{controllers,services,repositories,lib}/`, `src/content/`, `src/app/` und `src/popup/` organisiert; im Source-Root verbleiben 0 `*.js`. `scripts/source-layout.json` dokumentiert die Migration.
- Sämtliche Runtime-Referenzen wurden auf die neue Struktur migriert: Manifest-Service-Worker/Content-Scripts, App-/Popup-Scriptreihenfolge, Service-Worker-`importScripts()`, dynamischer Content-Bootstrap sowie Packaging-Dateiliste.
- Packaging-Closure wurde um deklarierte Runtime-Referenzen aus Manifest und HTML ergänzt; relative lokale `importScripts()`-Abhängigkeiten werden normalisiert und gegen das tatsächlich gepackte Chrome-Inventar geprüft.
- Historische Characterization-/Safety-Verträge wurden nur hinsichtlich der neuen Source-Ownership/Pfade angepasst; die fachlichen Assertions bleiben erhalten. Neue v1.23.7-Tests sichern Diagnostic-Export-Runtime, Path-Closure, Root-Layout und rekursiv 0 direkte `.submit()`/`requestSubmit()`-Bypässe.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; Gold-Baseline bleibt v1.21.15. Der reale 3er-Performance-Lauf bleibt für v1.23.12 reserviert, sofern vorher kein konkreter Performanceverdacht entsteht.
- Ab v1.23.7 ist ein eigener kontrollierter `release-finalize`-Gate mit Stage-State, RC/Wall/PID und eindeutigem `RELEASE_GREEN`-/DONE-Sentinel verbindlich.
<!-- KAR170-END:CHANGELOG:168 -->

<!-- KAR170-BEGIN:README:74 -->
### Historical README: v1.23.7 – Diagnostic Export Service + organisierte Source-Struktur (source line 74)

Der Diagnoseexport wird jetzt durch `src/background/services/diagnostic-export-service.js` aufgebaut; der Service Worker delegiert weiterhin innerhalb derselben Runtime über `KRDeps`. Gleichzeitig wurden alle bisherigen Root-JavaScript-Dateien fachlich unter `src/` organisiert. Manifest, HTML, dynamischer Content-Bootstrap, `importScripts()` und Packaging verwenden die neuen kanonischen Pfade; `scripts/source-layout.json` hält die Altpfad→Neupfad-Migration fest.

Die Packaging-Closure prüft zusätzlich die im Manifest und in HTML deklarierten Runtime-Skripte. Die Source-Reorganisation verändert keine fachliche Runtime-/IPC-Topologie und keine Publish-/Delete-/Account-/Profil-Safety-Grenze. Ab diesem Release wird die Release-Dokumentation nach den technischen Gates über einen kontrollierten `release-finalize`-Ablauf mit Stage-State und DONE-Sentinel abgeschlossen.
<!-- KAR170-END:README:74 -->

## v1.23.6

<!-- KAR170-BEGIN:CHANGELOG:178 -->
### Original CHANGELOG: v1.23.6 (source line 178)

- EPIC-REF-002: Verbliebene Bulk-Inventarisierungs-Orchestrierung aus `background.js` in den bestehenden `bulk-inventory-controller.js` überführt; Bulk-State/Persistenz bleibt über den bestehenden Guard abgesichert.
- Öffentliche Anzeigen-/Datums-Evidenz in `public-listing-evidence-service.js` extrahiert (öffentliche URL, Read-only-Metadaten, Ableitung/Erhalt des Anzeigendatums, Public-Availability-Snapshot).
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze.
- UI/UX: Recovery-Kachel ist zustandsabhängig: „Anzeige prüfen“, „Inventarisierung fortsetzen“, „Problem prüfen“ bzw. „Status öffnen“. Bei vorbereitetem Template-Fill fokussiert „Anzeige prüfen“ nach Möglichkeit direkt den vorhandenen Kleinanzeigen-Tab; sonst Fallback auf Recovery-Dialog.
- Packaging-Closure und packaged Browser-E2E bleiben verbindliche Release-Gates; kein realer 3er-Performance-Lauf für diesen Refactoring-Schritt.
<!-- KAR170-END:CHANGELOG:178 -->

<!-- KAR170-BEGIN:README:80 -->
### Historical README: v1.23.6 – Bulk + Public Listing Evidence (source line 80)

Der Bulk-Inventarisierungsworkflow liegt nun vollständig im `bulk-inventory-controller.js`; wiederverwendete öffentliche Anzeigen-/Datums-Evidenz lebt in `public-listing-evidence-service.js`. `background.js` bleibt Router/Lifecycle-Grenze. Die Template-Fill-Recovery-Kachel verwendet zustandsabhängige Aktionen und fokussiert bei `template-only-complete` nach Möglichkeit den bestehenden Kleinanzeigen-Tab.
<!-- KAR170-END:README:80 -->

## v1.23.5

<!-- KAR170-BEGIN:CHANGELOG:186 -->
### Original CHANGELOG: v1.23.5 (source line 186)

- EPIC-REF-002: Archive-Insertion-State-Machine aus `background.js` nach `archive-insertion-controller.js` extrahiert. `archive-insertion-service.js` bleibt Owner der revisionierten Session-Persistenz.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; `background.js` bleibt Service-Worker-Router und globale Lifecycle-/Emergency-Reset-Grenze.
- Lifecycle-Fix: `complete / template-only-complete` wird durch einen späteren Emergency Reset nicht mehr rückwirkend auf `cancelled / manual-emergency-reset` umgeschrieben. `template-only-published` bleibt bis zur Inventarisierung weiterhin recovery-/reset-fähig.
- Neue RED→GREEN-Verträge für Archive-Ownership, Controller-Runtime, terminale Template-Fills und v1.23.5-Architektur.
- Packaging-Closure und packaged Browser-E2E bleiben verbindliche Release-Gates.
<!-- KAR170-END:CHANGELOG:186 -->

## v1.23.4

<!-- KAR170-BEGIN:CHANGELOG:194 -->
### Original CHANGELOG: v1.23.4 (source line 194)

- EPIC-REF-002: Template-Fill-Orchestrierung aus `background.js` in `template-fill-controller.js` extrahiert.
- Globalen Inserierungs-/Austausch-Lock in `insertion-lock-service.js` extrahiert.
- Keine neue Chrome-Runtime-/Message-/IPC-Grenze; Safety-/Publish-Semantik unverändert.
- Packaged-E2E- und importScripts-Closure-Gates bleiben verbindlich.
<!-- KAR170-END:CHANGELOG:194 -->

## v1.23.3

<!-- KAR170-BEGIN:CHANGELOG:201 -->
### Original CHANGELOG: v1.23.3 (source line 201)

- EPIC-REF-002 Schritt 2: Die Mass-Renewal-Ablaufsteuerung wurde aus `background.js` in den neuen `mass-renewal-workflow-controller.js` extrahiert. Der bestehende `mass-renewal-controller.js` bleibt Eigentümer von Batch-State/Persistenz; der neue Controller besitzt Start/Next/Retry/Resume/Stop/Watchdog und die Verknüpfung zum Einzel-Renewal.
- Keine neue Runtime-/IPC-Grenze: der Workflow-Controller läuft im selben MV3-Service-Worker und wird über `KRDeps` verdrahtet. `background.js` behält Routing, globale Lifecycle-Hoheit und delegierende Brücken.
- Die v1.23.2-Packaging-Härtung bleibt verbindlich: lokale `importScripts()`-Dependency-Closure und Browser-E2E gegen den entpackten erzeugten Chrome-ZIP.
- Kein realer 3er-Performance-Lauf für diesen Refactoring-Schritt; das verbindliche reale Performance-Gate bleibt v1.23.12, sofern vorher kein konkreter Verdacht entsteht.
<!-- KAR170-END:CHANGELOG:201 -->

<!-- KAR170-BEGIN:README:124 -->
### Historical README: v1.23.3 – Mass Renewal Workflow Controller (source line 124)

Die Mass-Renewal-Orchestrierung ist in `mass-renewal-workflow-controller.js` ausgelagert. `mass-renewal-controller.js` bleibt für Batch-State/Persistenz zuständig; `background.js` bleibt Service-Worker-Entry-Point, Router und Lifecycle-Grenze. Die Modularisierung erzeugt keine zusätzliche Chrome-Runtime-/IPC-Grenze.


Aktueller Stand: **v1.23.7**. Dieser Stabilisierung-/Soak-Release behält das Message-Contract-Enforcement aus v1.22.25 und den dynamischen Bootstrap-Fix aus v1.22.25_c1 bei. Zusätzlich werden die bekannten Action-State-Desync-Fenster bei `insertion-lock-sync` und Bulk-Start über einen gemeinsamen autoritativen Inventory-Action-Sync geschlossen. Kostenpflichtige Inserate nach Erreichen des Kleinanzeigen-Anzeigenlimits werden bereits am sichtbaren Kostenbanner und als Fallback auf der Checkout-Seite erkannt; Auto-Publish stoppt fail-closed, „Mehrere neu inserieren“ hält kontrolliert an, und die Extension führt keinerlei Zahlungsaktion aus. Die Diagnoseausgabe `versionName` und der Registry-Snapshot bleiben erhalten.
<!-- KAR170-END:README:124 -->

## v1.23.2

<!-- KAR170-BEGIN:CHANGELOG:208 -->
### Original CHANGELOG: v1.23.2 (source line 208)

- Correction-Build für den defekten v1.23.1-Chrome-Release: `renewal-workflow-controller.js` wird jetzt tatsächlich in das Chrome-Paket aufgenommen.
- Neuer dauerhafter Packaging-Closure-Gate: jede lokale `importScripts()`-Abhängigkeit einer gepackten Runtime-Datei muss ebenfalls im Chrome-Paket enthalten sein.
- Browser-E2E kann über `KR_E2E_EXTENSION_ROOT` gegen den entpackten **erzeugten Chrome-ZIP** laufen; Release-Abnahme testet damit nicht mehr nur den Source-Root.
- Keine Änderung der Renewal-Fachsemantik oder Runtime-Topologie gegenüber der korrigierten v1.23.1-Source.
- Der ursprünglich für v1.23.2 geplante Mass-Renewal-Refactor verschiebt sich auf v1.23.3; der finale EPIC-REF-002-Soak/3er-Performance-Gate verschiebt sich entsprechend auf v1.23.12.
<!-- KAR170-END:CHANGELOG:208 -->

## v1.23.1

<!-- KAR170-BEGIN:CHANGELOG:216 -->
### Original CHANGELOG: v1.23.1 (source line 216)

- EPIC-REF-002 Schritt 1: Die Renewal-Workflow-State-Machine wurde aus `background.js` in den neuen `renewal-workflow-controller.js` extrahiert. `background.js` behält nur delegierende Brücken sowie die Service-Worker-/Emergency-Reset-Lifecycle-Hoheit.
- Keine neue Runtime-/IPC-Grenze: der Controller läuft im selben MV3-Service-Worker und wird über `KRDeps` verdrahtet.
- Renewal-Characterization, Ownership- und Runtime-Tests sichern Skeleton/Persistenz, Fast-/Safe-Verifikation, Publish-Bestätigung, Checkout-Recovery und Service-Worker-Resume. Historische Source-Surface-Tests wurden ausschließlich an die neue Ownership angepasst.
- Browser-E2E fand vor Release eine fehlende explizite `globalThis.KRDeps`-Bindung im neuen `importScripts`-Modul. Der MV3-Bootfehler wurde test-/E2E-gesichert behoben; Haupt- und Fresh-Source-Browser-E2E sind 9/9 grün.
- Safety unverändert: globaler Emergency Reset bleibt account-unabhängig und lokal; Remote-Mutations-/Account-/Profil-/Publish-/Delete-Gates bleiben unverändert; keine neue `.submit()`-/`requestSubmit()`-Grenze.
- Kein realer 3er-Performance-Lauf für diesen Patch; das verbindliche reale Performance-Gate bleibt v1.23.11, sofern vorher kein konkreter Verdacht entsteht.
<!-- KAR170-END:CHANGELOG:216 -->

<!-- KAR170-BEGIN:CHANGELOG:1930 -->
### Original CHANGELOG: 1.23.1 (source line 1930)

- EPIC-REF-002: Renewal-Workflow-Orchestrierung aus `background.js` nach `renewal-workflow-controller.js` extrahiert.
- Der Controller übernimmt Skeleton/Persistenz/Feedback, Fast-/Safe-Verifikation, Retry, Publish-Bestätigung, automatische Replacement-Orchestrierung, Checkout-Recovery und Resume.
- `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze; globaler account-unabhängiger Emergency Reset bleibt dort.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; Controller-Aufrufe bleiben in-process über `KRDeps`.
- Neue v1.23.1 Characterization-, Modularisierungs- und Runtime-Verträge.
<!-- KAR170-END:CHANGELOG:1930 -->

<!-- KAR170-BEGIN:README:1849 -->
### Historical README: Architekturstand v1.23.1 (source line 1849)

EPIC-REF-002 hat die Renewal-Workflow-State-Machine in `renewal-workflow-controller.js` verschoben. `background.js` delegiert die Workflow-Aufrufe weiterhin innerhalb desselben Service Workers; es entsteht keine zusätzliche IPC-Grenze. Der globale Emergency Reset und die oberste Runtime-/Lifecycle-Hoheit verbleiben bewusst in `background.js`. Der Controller bindet `KRDeps` explizit über `globalThis.KRDeps`, damit der klassische MV3-`importScripts`-Bootstrap zuverlässig funktioniert; dies wurde durch den echten Browser-E2E verifiziert.
<!-- KAR170-END:README:1849 -->

## v1.23.0

<!-- KAR170-BEGIN:CHANGELOG:225 -->
### Original CHANGELOG: v1.23.0 (source line 225)

- Start von **EPIC-REF-002** als zweite vollständige Modularisierungswelle für die verbliebenen Verantwortungen in `app.js` und `background.js`.
- v1.23.0 verschiebt bewusst **noch keine Produkt-/Runtime-Logik**. Die Runtime-Bytes von `app.js` und `background.js` bleiben gegenüber der kanonischen v1.22.30-Basis unverändert.
- Neue versionsübergreifende Characterization deckt alle 14 vorgesehenen Extraktionsspots ab und ist vor der Versionierung auf unverändertem v1.22.30 grün festgeschrieben.
- Neues `architecture-baseline-v1.23.0.json` dokumentiert Source-Hash/LOC-Baseline, 14 Ownership-Ziele, v1.23.1–v1.23.11-Wellenplan und die Regel, dass Modularisierung keine neue Chrome-Runtime-/IPC-Grenze erzeugen darf.
- Reale 3er-Performance-Läufe werden wegen der knappen freien Anzeigen **nicht pro Patch** erzwungen. Verbindliches Real-Performance-Gate ist v1.23.11; ein Zwischenlauf erfolgt nur bei konkretem Performanceverdacht. Referenzwerte auf dem langsamen Rechner: v1.20.3 = 93,744 s, v1.22.30 = 99,332 s.
- Safety unverändert: account-unabhängiger lokaler Emergency Reset, Publish-/Delete-/Replacement-/Account-/Profil-Gates und 0 direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verbindlich.
<!-- KAR170-END:CHANGELOG:225 -->

<!-- KAR170-BEGIN:README:84 -->
### Historical README: v1.23.0 – EPIC-REF-002 Baseline und Characterization (source line 84)

v1.23.0 eröffnet die zweite vollständige Modularisierungswelle für die verbliebenen Verantwortungen in `app.js` und `background.js`. Dieser Baseline-Release verschiebt noch keine Produktlogik. Stattdessen friert er das aktuelle Verhalten über versionsübergreifende Characterization-Tests ein und dokumentiert alle 14 vorgesehenen Ownership-Extraktionen in `architecture-baseline-v1.23.0.json`.

Dauerhafte 1.23.x-Regel: Eine Modularisierung darf **keine neue Chrome-Runtime-, Tab-, Message- oder IPC-Grenze** allein wegen der Dateiaufteilung erzeugen. `app.js` bleibt UI-Entry-Point; `background.js` bleibt Service-Worker-Router und Lifecycle-Grenze; Fachlogik wandert nur in In-Process-JavaScript-Module über `KRDeps`.

Der reale 3er-Performance-Smoke auf dem langsamen Rechner wird nicht pro Patch verbraucht. Pflicht-Gate ist v1.23.20; ein Zwischenlauf erfolgt nur bei konkretem Performanceverdacht. Automatisierte Hot-Path-, Message-, Storage-, Retry-, Safety- und Browser-E2E-Gates laufen weiterhin pro Release.

Aktualisierter Verlauf: v1.23.1 Renewal Workflow (Chrome-Release verworfen), v1.23.2 Packaging-Correction, v1.23.3 Mass Renewal Workflow, v1.23.4 Template Fill + Insertion Lock, v1.23.5 Archive Insertion, v1.23.6 Bulk + Public Listing Evidence, v1.23.7 Diagnostic Export, v1.23.8 Account/Profile, v1.23.10 UI-Restkomponenten, v1.23.10 Capture-Grenze, v1.23.11 Facade-/Dead-Code-Cleanup, v1.23.12 Composition Roots & Routing Cleanup, v1.23.13–v1.23.19 weitere Refactorings, v1.23.20 Gesamt-Soak/Performance-Gate.
<!-- KAR170-END:README:84 -->

## v1.22.30

<!-- KAR170-BEGIN:CHANGELOG:234 -->
### Original CHANGELOG: v1.22.30 (source line 234)

- `Alle Prozesse abbrechen` ist jetzt eine rein lokale, account-unabhängige Lifecycle-Grenze. Der Reset führt keine Remote-/Account-Verifikation aus und gibt globale Workflow-/Inserierungs-Locks frei.
- Remote-unsichere Post-Publish-Zustände werden lokal terminal als `cancelled / emergency-reset-unverified` mit `remoteVerification=unverified` und `remoteVerificationRequired=true` markiert; sichere Pre-Publish-Zustände bleiben `cancelled / manual-emergency-reset`.
- Reset-Generation-Fences verhindern nach einem parallelen Notfall-Reset spätere Single-/Bulk-Starts sowie insbesondere einen Phase-4-Delete. Persistente Reset-Tombstones schützen Renewal-, Fill-, Archive-, Bulk- und Mass-Zustände vor stale asynchronen Writes.
- Lokale UI-Zustände für Profiltransfer, Inventory-Capture, Renewal-/Mass-Dialoge und Archive-/Trash-Insertion werden beim Reset ebenfalls freigegeben. Managed Workflow-Tabs werden geschlossen; Remote-Safety-Gates und der getrennte read-only Checkout-Recovery-Pfad aus v1.22.29 bleiben erhalten.
- Release-Recovery verwendet durable Checkpoint-ZIPs und `BUILD-STATE-v1.22.30.json` zwischen den Gates.
<!-- KAR170-END:CHANGELOG:234 -->

<!-- KAR170-BEGIN:README:94 -->
### Historical README: v1.22.30 – account-unabhängiger lokaler Emergency Reset (source line 94)

`Alle Prozesse abbrechen` benötigt kein bestimmtes Kleinanzeigen-Konto und keine Remote-Verifikation. Der Manager kann lokale Einzel-/Massen-Renewals, Inventuren, Profiltransfers, Insertion- und Worker-Zustände terminalisieren und seine globalen Locks freigeben, selbst wenn das ursprüngliche Konto nicht mehr erreichbar ist.

Hat ein betroffener Datensatz bereits eine mögliche Publish-/Remote-Grenze überschritten, wird ausdrücklich kein Remote-Erfolg behauptet: er bleibt lokal `cancelled / emergency-reset-unverified` und kann später separat read-only reconciled werden. Sichere Pre-Publish-Fälle werden ohne erfundene Remote-Unsicherheit beendet. Generation-Fences und Reset-Tombstones verhindern, dass parallele/stale Arbeit nach dem Reset wieder Remote-Delete oder alte Workflow-Zustände aktiviert.

Alle bisherigen Publish-, Account-/Profil-, Delete-/Replacement-, Captcha-/Rate-Limit- und Submit-Bypass-Sicherheitsgrenzen bleiben bestehen.
<!-- KAR170-END:README:94 -->

## v1.22.29

<!-- KAR170-BEGIN:CHANGELOG:242 -->
### Original CHANGELOG: v1.22.29 (source line 242)

- Neuer fail-closed Recovery-Pfad für einen abgebrochenen kostenpflichtigen Checkout nach bereits überschrittener Publish-Grenze. Ein alter `needs-review / manual-emergency-reset`-Renewal wird nicht mehr dauerhaft nur deshalb gesperrt, weil nach dem Publish-Klick `/m-bestellung-aufnehmen.html` erreicht wurde; er wird aber ausdrücklich **nicht** allein aufgrund von `newAdId=null` oder des Checkout-Pfads freigegeben.
- Recovery ist nur nach unabhängiger read-only Remote-Prüfung zulässig: Ein frischer, vollständiger Mehrseiten-Scan von „Meine Anzeigen“ muss im ursprünglich gebundenen Konto erfolgen, die Quellanzeige muss weiterhin remote vorhanden sein und jede aktuell gefundene Anzeigen-ID muss bereits vor `publishClickedAt` lokal nachweisbar gewesen sein. Falsches Konto, unvollständiger Roster/Count-Mismatch, fehlende Quellanzeige oder auch nur eine unbekannte Remote-ID halten den Lock fail-closed.
- Der Recovery-Worker verwendet den bestehenden `MY_ADS_STATUS`-Vertrag mit `fullRoster:true`; er führt keine Veröffentlichung, Zahlung, Löschung oder sonstige Remote-Mutation aus. Nach bestätigter Evidenz wird ausschließlich der lokale Renewal zu `cancelled / checkout-aborted-verified` terminalisiert; ein zugehöriges Mass-Renewal-Item wird ebenfalls lokal terminalisiert.
- Neue Diagnoseevents: `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_STARTED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_CONFIRMED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_BLOCKED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_FAILED` und `RENEWAL_CHECKOUT_ABORT_RECOVERED`. Künftige Checkout-Fälle persistieren zusätzlich `checkoutObservedAt`/`checkoutPath`; öffentliche Renewal-Snapshots enthalten `publishClickedAt` und Checkout-Recovery-Evidenz.
- Die seit v1.22.27 etablierte Browser-E2E-Supervisor/Child-Prozessarchitektur bleibt unverändert. Lange Release-Schritte werden weiterhin als kontrollierte lokale Prozesse mit Log, Return-Code, Wall-Clock und kurzen Statusabfragen ausgeführt; diese Regel bleibt verpflichtender Bestandteil jedes zukünftigen Handovers.
<!-- KAR170-END:CHANGELOG:242 -->

<!-- KAR170-BEGIN:README:102 -->
### Historical README: v1.22.29 – verifizierte Recovery für abgebrochenen kostenpflichtigen Checkout (source line 102)

Ein historischer Renewal, der nach dem automatischen Publish-Klick nur den kostenpflichtigen Kleinanzeigen-Checkout erreicht hat, darf nur nach unabhängiger read-only Remote-Verifikation entsperrt werden. `newAdId=null` und der Checkout-Pfad allein reichen nicht. Die Extension öffnet dafür einen versteckten frischen „Meine Anzeigen“-Prüftab, liest den vollständigen Roster über alle Seiten und vergleicht ihn mit den lokal bereits vor dem Publish-Klick nachweisbaren Anzeigen-IDs des ursprünglich gebundenen Profils. Die Quellanzeige muss weiterhin vorhanden sein; falsches Konto, Count-Mismatch, fehlende Quellanzeige oder eine unbekannte Remote-ID blockieren die Recovery.

Bei bestätigter Evidenz wird ausschließlich der lokale Renewal als `cancelled / checkout-aborted-verified` abgeschlossen. Der Recovery-Pfad klickt weder Publish noch Zahlung noch Löschung und verändert keine Remote-Anzeige. Für einen Legacy-Fall muss bei der Prüfung das ursprünglich gebundene Kleinanzeigen-Konto angemeldet sein; andernfalls bleibt der Lock bewusst bestehen.

Release-Builds und lange Tests laufen weiterhin als kontrollierte Prozesse mit kurzen Statusabfragen; Browser-E2E bleibt im Supervisor-/Child-Prozessmodell.
<!-- KAR170-END:README:102 -->

## v1.22.28

<!-- KAR170-BEGIN:CHANGELOG:250 -->
### Original CHANGELOG: v1.22.28 (source line 250)

- Behebt einen Legacy-/Migration-Lifecycle-Bug aus v1.22.26/v1.22.27: Ein bereits per Notfall-Reset beendeter Renewal in `needs-review / manual-emergency-reset` ohne jede Publish-Grenze blockiert den globalen Inserierungs-Lock und damit den Diagnose-Reset nicht mehr.
- Die Freigabe ist konservativ: `newAdId`, `publishClickedAt`, `submitted`/`publish-submitted`, `newIdConfirmedAt`, öffentliche Ziel-URL, Vergleichs-/Public-Availability-Evidenz oder Phase-2+-Versuche gelten als Publish-/Post-Publish-Evidenz und halten den Lock weiterhin fail-closed.
- Beim Service-Worker-Recovery wird ein eindeutig unveröffentlichter Legacy-Notfall-Reset lokal zu `cancelled / manual-emergency-reset` migriert; bei Mass-Renewal-Zuordnung wird die Session terminal markiert. Es erfolgt keine Remote-Mutation.
- Der Diagnosebereich zeigt bei blockiertem Reset nun den konkreten Workflow-/Lock-Grund; bei Inserierungs-Locks werden Lock-Typ, Owner-ID sowie Status/Stage sichtbar ausgegeben.
- Build-/Testausführung bleibt auf dem v1.22.27 eingeführten Supervisor-/Child-Modell. Lange Release-Schritte werden zusätzlich als kontrollierte Prozesse mit kurzen Statusabfragen ausgeführt, damit Chat-/Tool-Unterbrechungen nicht mit echten Build-Hängern verwechselt werden. Diese Regel ist dauerhaft in zukünftigen Handovers zu dokumentieren.
<!-- KAR170-END:CHANGELOG:250 -->

<!-- KAR170-BEGIN:README:110 -->
### Historical README: v1.22.28 – Legacy-Reset-Migration und transparenter Diagnose-Blocker (source line 110)

Ein alter `needs-review / manual-emergency-reset`-Renewal ohne nachweisbare Publish-Grenze wird beim Recovery lokal terminalisiert und hält keinen Inserierungs-Lock mehr. Post-Publish-Evidenz bleibt fail-closed gesperrt. Der Diagnosebereich nennt bei einem blockierten Reset den konkreten Workflow bzw. Inserierungs-Lock inklusive Owner und Status/Stage.

Release-Builds und lange Tests laufen kontrolliert mit kurzen Statusabfragen; Browser-E2E bleibt im Supervisor-/Child-Prozessmodell.
<!-- KAR170-END:README:110 -->

## v1.22.27

<!-- KAR170-BEGIN:CHANGELOG:258 -->
### Original CHANGELOG: v1.22.27 (source line 258)

- Behebt den nativen v1.22.26-Restfehler, bei dem ein eindeutig **vor Publish** erkannter `paid-insertion-required`-Renewal den globalen Inserierungs-Lock weiter halten konnte. Die Lock-Policy liegt jetzt in `renewal-state-repository.js` und gibt ausschließlich eindeutig unveröffentlichte Paid-Insertion-Fälle frei; Checkout-/`publish-submitted`-/New-ID-Fälle bleiben fail-closed gesperrt.
- Paid-Insertion-Provenienz (`phase`, `source`, `pathname`, `amount`, `detectedAt`) wird aus `template-filler.js` in Fill- und Renewal-State persistiert. Bereits unter v1.22.26 gespeicherte Paid-Insertion-Zustände ohne diese Metadaten können ebenfalls sicher erkannt werden, sofern keine Publish-Grenze nachweisbar ist.
- Der Notfall-Reset setzt einen sicher unveröffentlichten Paid-Insertion-Fill und den zugehörigen Renewal auf `cancelled / manual-emergency-reset`; lokale Quelldaten bleiben erhalten und es erfolgt keine Remote-Mutation. Unsichere Post-Publish-Fälle werden dadurch nicht entsperrt.
- Browser-E2E läuft ab v1.22.27 über `tests/e2e/run_browser_e2e_supervisor.py`: jedes Szenario eigener Python-/Playwright-/Chromium-Prozess, eigenes Temp-Profil, harter Szenario- und Cleanup-Timeout, gezieltes Process-Tree-Kill und aggregierter Report mit getrenntem `scenarioStatus` / `cleanupStatus`.
- Die Chromium-Policy bleibt außerhalb des Supervisors; Release-Orchestrierung muss jede temporäre Policy-Änderung weiterhin durch einen äußeren `try/finally`/Trap schützen und den ursprünglichen Policy-Hash restaurieren.
<!-- KAR170-END:CHANGELOG:258 -->

<!-- KAR170-BEGIN:README:116 -->
### Historical README: v1.22.27 – Paid-Insertion Lock-Härtung und isolierter Browser-E2E-Supervisor (source line 116)

Ein vor der Veröffentlichung eindeutig erkanntes kostenpflichtiges Inserat ist terminal und blockiert keine weiteren Inserierungsaktionen mehr. Die Ausnahme gilt nur ohne Publish-Grenze (`newAdId`, `publishClickedAt`, `submitted`/`publish-submitted` usw.); Checkout-/Post-Publish-Zustände bleiben konservativ gesperrt. Der Notfall-Reset kann diesen sicheren lokalen Fall vollständig beenden, ohne die Quellanzeige auf Kleinanzeigen zu verändern.

Die Browser-E2E-Infrastruktur startet jedes der neun Szenarien separat über einen Supervisor. Dadurch kann ein Playwright-/Chromium-Cleanup-Hänger nur noch das betroffene Child treffen und blockiert nicht den restlichen Lauf. Der Report trennt fachlichen Szenariostatus und Cleanupstatus. Temporäre Chromium-Policy-Änderungen bleiben Aufgabe der äußeren Release-Orchestrierung und müssen immer per `try/finally`/Trap restauriert werden.
<!-- KAR170-END:README:116 -->

## v1.22.26

<!-- KAR170-BEGIN:CHANGELOG:266 -->
### Original CHANGELOG: 1.22.26 (source line 266)

- Stabilisierung / Soak / Gold-Parität: behebt die wiederholt beobachteten `UI_ACTION_STATE_DESYNC_DETECTED`-Fenster bei `insertion-lock-sync` und unmittelbar beim Bulk-Start. Einzel- und Vollerfassungsaktionen verwenden nun dieselbe autoritative Disable-Ableitung; ein gemeinsamer `syncInventoryActionStates()`-Pfad synchronisiert beide Buttons vor dem Diagnose-Snapshot.
- Paid-Insertion-Safety: neue `paid-insertion-guard.js` erkennt den real beobachteten Kleinanzeigen-Hinweis „Anzeigenlimit erreicht. Das Einstellen dieser Anzeige ist kostenpflichtig.“ bereits nach Kategorieauswahl sowie als Fallback die Checkout-Seite `/m-bestellung-aufnehmen.html` mit Warenkorb/Einstellgebühr/„Zur Bezahlung“.
- Bei erkannter Kostenpflicht wird Auto-Publish fail-closed gestoppt. Die Fill-/Renewal-Position wird `paid-insertion-required`, „Mehrere neu inserieren“ hält kontrolliert mit Attention an, weitere queued Positionen werden nicht automatisch gestartet und die alte Quellanzeige bleibt unangetastet.
- Die Extension wählt niemals eine Zahlungsart, bestätigt keine Zahlungs-/Widerrufscheckbox und klickt niemals „Zur Bezahlung“. Diagnoseevents unterscheiden Pre-Publish- und Checkout-Erkennung (`PAID_INSERTION_REQUIRED_DETECTED_PRE_PUBLISH`, `PAID_INSERTION_CHECKOUT_DETECTED`, `MASS_RENEWAL_PAID_INSERTION_STOPPED`).
- Message-Contract-Enforcement und der v1.22.25_c1-Bootstrap-Fix bleiben erhalten; `paid-insertion-guard.js` ist sowohl im Manifest- als auch im dynamischen Content-Script-Stack und im Chrome-Paket enthalten.
- Test-first: neue Characterization sowie RED→GREEN-Regressionssuiten für Action-State-Synchronisierung und Paid-Insertion. Historische Test-Harnesses wurden nur an die neue explizite Action-State-Dependency/Ownership angepasst; fachliche und Safety-Assertions bleiben erhalten.
- Keine neuen Remote-Mutationen, keine automatische Zahlung und keine Submit-Bypässe.
<!-- KAR170-END:CHANGELOG:266 -->

## v1.22.25_c1

<!-- KAR170-BEGIN:CHANGELOG:276 -->
### Original CHANGELOG: 1.22.25_c1 (source line 276)

- Correction-Build auf v1.22.25: repariert den dynamischen Content-Script-Bootstrap für bereits geöffnete Kleinanzeigen-Tabs nach einem Extension-Update.
- `CONTENT_SCRIPT_FILES` spiegelt wieder exakt den Manifest-Stack und injiziert `message-contract-registry.js` direkt nach `runtime-deps.js`.
- `content.js` und `inventory-runner.js` akzeptieren einen alten partiellen Boolean-Bootstrap-Guard nicht mehr als vollständige Initialisierung; `ready` wird erst nach erfolgreicher Registry-Auflösung gesetzt. Dadurch kann ein unter v1.22.25 fehlgeschlagener Bootstrap im selben Tab erneut sauber initialisiert werden.
- Message-Contract-Enforcement, Account-/Profil-Safety und Remote-Mutationsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:276 -->

## v1.22.25

<!-- KAR170-BEGIN:CHANGELOG:283 -->
### Original CHANGELOG: 1.22.25 (source line 283)

- Message-Contract-Enforcement aktiviert: `message-contract-registry.js` bleibt die zentrale Registry der 102 bekannten Verträge, meldet jetzt aber `mode=enforced` und `enforcement=true`.
- Background-Router lehnt unbekannte oder an den falschen Ziel-Router adressierte Runtime-Requests vor jeder fachlichen Verarbeitung fail-closed mit stabilen Fehlercodes (`KR_MESSAGE_CONTRACT_UNKNOWN` / `KR_MESSAGE_CONTRACT_TARGET_MISMATCH`) ab und protokolliert `MESSAGE_CONTRACT_REJECTED`.
- Die parallel im Kleinanzeigen-Tab geladenen Router `content.js` und `inventory-runner.js` akzeptieren ausschließlich ihre registrierten Zielverträge. Ein für den jeweils anderen registrierter Contract wird bewusst nur ignoriert, damit kein Response-Race entsteht; wirklich unbekannte Message-Typen werden fail-closed beantwortet und diagnostiziert.
- Der App-Broadcast-Listener akzeptiert ausschließlich die drei registrierten App-Broadcasts; andere registrierte Zieltypen werden ignoriert, unbekannte Typen diagnostiziert.
- Der Contract-Inventarbestand bleibt unverändert bei 102 Typen: 82 Background, 10 Content, 7 My-Ads-Content, 3 App-Broadcasts.
- Test-first: unveränderte Pre-Enforcement-Characterization 5/5 PASS; neue Enforcement-Contract- und Runtime-Suiten waren auf v1.22.24 bewusst RED und sind nach Umsetzung 7/7 bzw. 6/6 PASS. Historische VM-Tests erhalten ausschließlich testseitig eine minimale Registry-Kompatibilitätsdependency; die v1.22.25-Enforcement-Tests laden die echte Registry.
- v1.22.24 wurde nativ als grün bestätigt. Die dort ergänzte Diagnoseausgabe `versionName` bleibt erhalten.
- Publish-/Renewal-/Delete-/Account-/Profil-/Notfall-Reset-Safety unverändert; keine neuen Remote-Mutationen und keine Submit-Bypässe.
<!-- KAR170-END:CHANGELOG:283 -->

## v1.22.24

<!-- KAR170-BEGIN:CHANGELOG:294 -->
### Original CHANGELOG: 1.22.24 (source line 294)

- Architektur: neue `message-contract-registry.js` als zentrale, explizite Registry der derzeit bekannten Extension-Message-Verträge. Die Registry wird über `KRDeps` bereitgestellt und katalogisiert Background-, Content-, My-Ads-Content- und App-Broadcast-Typen.
- v1.22.24 ist bewusst kompatibel/diagnostisch: `enforcement=false`; bestehende Router und Safety-Gates bleiben fachlich unverändert. Unbekannte Nachrichten werden weiterhin durch die bisherigen Router behandelt bzw. fail-closed abgewiesen, nicht durch die Registry.
- Diagnose: `environment.json` enthält den Registry-Snapshot (`schemaVersion`, Modus, Enforcement-Status, Typanzahl je Ziel) und zusätzlich `versionName`; Summary/Diagnose-ZIP verwenden die sichtbare Manifest-Version, wenn `version_name` vorhanden ist.
- Background-Fehlerdiagnosen enthalten zusätzlich den Message-Contract-Status des fehlgeschlagenen Requests.
- Test-first: Pre-Refactor-Characterization, Registry-Contract und Runtime-Coverage sichern die bestehende Router-Semantik und die Registry-Abdeckung.
- Publish-/Renewal-/Delete-/Account-/Profil-/Notfall-Reset-Safety unverändert; keine neuen Remote-Mutationen.
<!-- KAR170-END:CHANGELOG:294 -->

## v1.22.23_c2

<!-- KAR170-BEGIN:CHANGELOG:311 -->
### Original CHANGELOG: v1.22.23_c2 (source line 311)

- Korrektur auf v1.22.23_c1: Beim erfolgreichen Notfall-Reset wird die aktive Trash-Template-Recovery-Meldung vor dem Entfernen aus dem aktiven Slot als terminale Historienmeldung „Vorlagen-Inserat zurückgesetzt“ archiviert.
- Der Archiveintrag enthält keine Fortsetzen-Aktion; lokale Quelldaten bleiben unverändert, Remote-/Reset-Safety bleibt unverändert.
- Der reguläre Buildplan bleibt unverändert; technisch bleibt `manifest.version` Chrome-konform auf `1.22.23`, sichtbar ist `version_name=1.22.23_c2`.
<!-- KAR170-END:CHANGELOG:311 -->

## v1.22.23_c1

<!-- KAR170-BEGIN:CHANGELOG:303 -->
### Original CHANGELOG: 1.22.23_c1 (source line 303)

- Correction-Build auf Basis v1.22.23: Ein bereits archivierter, unveränderter terminaler Bulk-Erfassungsstatus wird bei späteren allgemeinen Refreshes nicht erneut als aktuelle Meldung hervorgeholt. Er bleibt im Meldungsverlauf erhalten.
- Inhaltlich geänderte terminale Bulk-Ergebnisse dürfen weiterhin erneut als aktuelle Meldung erscheinen; laufende Bulk-Vorgänge bleiben unverändert sichtbar/recoverable.
- Der v1.22.23-Notfall-Reset und sämtliche Backend-/Remote-/Safety-Gates bleiben unverändert.
- Sichtbare Versionsbezeichnung ist `v1.22.23_c1`; das Chrome-konforme technische Manifest bleibt `1.22.23` und nutzt `version_name: 1.22.23_c1`.
<!-- KAR170-END:CHANGELOG:303 -->

## v1.22.23

<!-- KAR170-BEGIN:CHANGELOG:317 -->
### Original CHANGELOG: 1.22.23 (source line 317)

- Hotfix: Der Notfall-Reset entfernt nach erfolgreichem Reset jetzt auch die persistente Trash-Template-Recovery-Meldung sofort und räumt den zugehörigen UI-Trackingzustand auf. Ein zusätzlicher Broadcast-Hook verhindert, dass die veraltete Recovery-Kachel nach dem Reset sichtbar bleibt. Backend-/Safety-/Remote-Mutationslogik bleibt unverändert.
<!-- KAR170-END:CHANGELOG:317 -->

<!-- KAR170-BEGIN:README:131 -->
### Historical README: v1.22.23 Hotfix (source line 131)

Der Notfall-Reset synchronisiert nun nach erfolgreichem Backend-Reset auch den Trash-Template-Recovery-UI-Zustand. Die persistente „Vorgang fortsetzen“-Kachel wird entfernt; bei einem bewusst neu geöffneten, noch nicht gestarteten Draft bleibt dessen Dialog-Ownership unangetastet.
<!-- KAR170-END:README:131 -->

## v1.22.22

<!-- KAR170-BEGIN:CHANGELOG:321 -->
### Original CHANGELOG: v1.22.22 (source line 321)

- Notfall-Reset-Fix: fachlich offene Trash-Template-Sessions `complete / template-only-complete` und `complete / template-only-published` werden von „Laufende Vorgänge zurücksetzen“ erfasst und als `cancelled / manual-emergency-reset` terminalisiert. `template-only-inventoried`, `needs-review` und `error` bleiben terminal und werden nicht erneut resetbar gemacht.
- Der Reset evictet den kurzlebigen Template-Bildtransfer-Cache; Inventar, Papierkorb, lokale Bilder, Profile und Einstellungen bleiben erhalten, und es wird keine Remote-Mutation auf Kleinanzeigen ausgelöst.
- Legacy-/Facade-/Global-Cleanup: `KRDeps` ist die einzige produktive Registry für KR-Modul-APIs; redundante `globalThis.KR…`-/`root.KR…`-Publikationen und der Legacy-Global-Fallback von `runtime-deps.js` wurden entfernt.
- `background.js`, `content.js` und `platform-guard-content.js` verlangen die Runtime-Registry explizit; historische VM-Tests erhalten Legacy-Aliase ausschließlich testseitig über `tests/v12222-vm-legacy-bridge.cjs`.
- Die tote `MANAGED_WORKER_TABS_KEY`-/`readManagedWorkerTabs`-/`writeManagedWorkerTabs`-Fassade wurde entfernt.
- Test-first: die v1.22.22-Pre-Refactor-Characterization/Runtime-Dateien bleiben SHA-256-byteidentisch; zusätzliche Reset-, Cleanup- und Runtime-Ownership-Regressionen sichern die neue Grenze.
- Keine Abschwächung der Publish-/Renewal-/Delete-/Account-/Profil-Safety; direkte Runtime-`.submit()`-/`requestSubmit()`-Bypässe bleiben 0.
<!-- KAR170-END:CHANGELOG:321 -->

<!-- KAR170-BEGIN:README:135 -->
### Historical README: v1.22.22 (source line 135)

- Fix: „Laufende Vorgänge zurücksetzen“ beendet jetzt auch fachlich noch offene Trash-Template-Sessions in `complete / template-only-complete` und `complete / template-only-published` als `cancelled / manual-emergency-reset`; `template-only-inventoried`, `needs-review` und `error` bleiben terminal.
- Der Notfall-Reset bereinigt zugehörige kurzlebige Bildtransfer-Caches, verändert aber weder Inventar/Papierkorb/Bilder/Profile noch Remote-Anzeigen auf Kleinanzeigen.
- Architektur: `KRDeps` ist die einzige produktive Registry für KR-Modul-APIs; doppelte `globalThis.KR…`-/`root.KR…`-Publikationen und der Legacy-Fallback in `runtime-deps.js` sind entfernt.
- Runtime-Entrypoints verlangen `KRDeps` explizit/fail-fast; historische VM-Tests erhalten Legacy-Aliase ausschließlich über die testseitige Bridge.
- Die alte Managed-Worker-Storage-Fassade in `background.js` wurde entfernt; Safety-, Account-/Profil-, Publish-, Delete- und Replacement-Gates bleiben unverändert.
<!-- KAR170-END:README:135 -->

## v1.22.21

<!-- KAR170-BEGIN:CHANGELOG:331 -->
### Original CHANGELOG: v1.22.21 (source line 331)

- Architektur: Remote-Delete-/Replacement-Fachlogik aus `background.js` in `remote-delete-replacement-service.js` ausgelagert; `background.js` bleibt Service-Worker-Orchestrator mit dünnen Kompatibilitätsfassaden.
- Safety unverändert: Remote-Löschen gilt erst nach unabhängiger frischer Abwesenheitsprüfung als erfolgreich; lokale Promotion erfolgt erst danach atomar inklusive Bilddaten.
- Target-Tab-Ownership, Transport-Unterbrechungsbehandlung, Replacement-Cleanup und lokales Entfernen eines verifizierten Replacement-Candidates liegen im neuen Service.
- Keine neue Remote-Löschfunktion für Endnutzer hinzugefügt; bestehende Renewal-Safety- und Account-/Profil-Gates bleiben unverändert.
<!-- KAR170-END:CHANGELOG:331 -->

<!-- KAR170-BEGIN:README:143 -->
### Historical README: v1.22.21 (source line 143)

- Architektur: `remote-delete-replacement-service.js` übernimmt die bestehende Phase-4-Remote-Delete-/Replacement-Mechanik hinter expliziten Dependencies; `background.js` bleibt Router und Orchestrator.
- Safety: Der alte Anzeigen-Datensatz wird erst nach unabhängiger frischer Abwesenheitsverifikation als gelöscht behandelt; erst danach erfolgt die atomare lokale Candidate-Promotion inklusive Bilddaten.
- Die bestehenden Account-/Profil-/Own-Ad-/Publish-/Delete-Gates und die Remote-Mutationsgrenzen werden nicht abgeschwächt.
- Dauerhafte Architekturregel: `app.js` und `background.js` bleiben Orchestratoren; stateful Fachlogik und komplexe Workflows gehören in klar abgegrenzte Module mit expliziten Dependencies.
<!-- KAR170-END:README:143 -->

## v1.22.20

<!-- KAR170-BEGIN:CHANGELOG:338 -->
### Original CHANGELOG: v1.22.20 (source line 338)

- Stabilitätsfix: Papierkorb-Template-Recovery lädt den Quelldatensatz bei leerem lokalen Trash-Cache frisch nach, bevor Titel/Metadaten/Titelbild gerendert werden.
- Behebt fehlendes Vorschaubild im Recovery-Dialog nach App-/Extension-Neustart.
- Keine Änderung an Publish-, Account-, Profil- oder Capture-Safety-Gates.
<!-- KAR170-END:CHANGELOG:338 -->

## v1.22.19

<!-- KAR170-BEGIN:CHANGELOG:344 -->
### Original CHANGELOG: v1.22.19 (source line 344)

- Stabilitätsfix: Ein neu geöffneter Papierkorb-Vorlagen-Draft besitzt jetzt eine explizite Dialog-Ownership/Revision und kann nicht mehr durch eine ältere recoverable Session überschrieben werden.
- Passive periodische Recovery-/Lock-Synchronisation aktualisiert weiterhin die Meldungs-Kachel, übernimmt aber keinen konkurrierenden lokalen Draft.
- Verspätete asynchrone Recovery-Antworten werden über die Dialogrevision verworfen. Nur der explizite Nutzerpfad „Vorgang fortsetzen“ darf die persistierte Recovery-Session in das Modal übernehmen.
- Bestehende Recovery-Preview, Activity-Kachel, Confirmation→Capture-Safety und finaler Publish-Hinweis bleiben erhalten.
<!-- KAR170-END:CHANGELOG:344 -->

## v1.22.18

<!-- KAR170-BEGIN:CHANGELOG:351 -->
### Original CHANGELOG: v1.22.18 (source line 351)

- Stabilitäts-/UI-Fix: Papierkorb-Template-Recovery rekonstruiert Titel, Metadaten und Titelbild vollständig aus dem lokalen Papierkorb-Datensatz.
- Recovery-Einstieg ist keine permanente Hauptaktion mehr; stattdessen erscheint eine persistente Meldungs-Kachel mit „Vorgang fortsetzen“ für aktive, `template-only-complete`- und `template-only-published`-Sessions.
- Nach `template-only-inventoried` verschwindet die Recovery-Kachel.
- Template-Only-Zwischenstep-Toasts zeigen den cyanfarbenen Hinweis „Nicht veröffentlicht …“ nicht mehr; der Hinweis bleibt ausschließlich im finalen `template-only-complete`-Endzustand.
<!-- KAR170-END:CHANGELOG:351 -->

## v1.22.17

<!-- KAR170-BEGIN:CHANGELOG:358 -->
### Original CHANGELOG: v1.22.17 (source line 358)

- Stabilitätsfix: Papierkorb-Template-Fill kann nach Extension-Neustart über „Vorlagen-Inserat fortsetzen“ wieder geöffnet werden.
- Finaler Capture wechselt nach bestätigter `addId` kontrolliert in die eigene Bearbeiten-Ansicht und prüft Own-Ad/ID erneut.
- Erfolgreicher finaler Capture terminalisiert die Template-Session als `template-only-inventoried`.
<!-- KAR170-END:CHANGELOG:358 -->

<!-- KAR170-BEGIN:README:150 -->
### Historical README: v1.22.17 (source line 150)

- Architektur: `renewal-state-repository.js` besitzt Renewal-Session-Persistenz, Retention sowie öffentliche/Insertion-Snapshots. Die getrennte A3a-Mutationsgrenze bleibt bewusst außerhalb dieses Refactoring-Schritts.
- Architektur: `template-fill-service.js` besitzt Template-Fill-Session-State, serialisierte Fill-Mutationen, Source-Readiness/Payload, Watchdog-Terminalisierung und den gebundenen Bildtransfer-Cache.
- Architektur: `archive-insertion-service.js` besitzt Archive-Insertion-Session-Persistenz, revisionsgeschützte Snapshots und Status-/Meta-Semantik; browser- und remote-nahe Insertion-Orchestrierung bleibt im Service Worker.
- Safety: Publish-/Delete-/Account-/Profil-/Insertion-Gates sowie Remote-Mutationsgrenzen bleiben im Orchestrator unverändert.
<!-- KAR170-END:README:150 -->

## v1.22.16

<!-- KAR170-BEGIN:CHANGELOG:364 -->
### Original CHANGELOG: 1.22.16 (source line 364)

- Extrahiert Renewal-Session-Persistenz/Retention/Snapshot-Semantik in `renewal-state-repository.js`; `persistRenewalSession()` und die separat geplante A3a-Mutationsgrenze bleiben bewusst im Orchestrator bzw. Backlog.
- Extrahiert Template-Fill-State, serielle Fill-Mutationen, Source-Readiness/Payload, Watchdog-Terminalisierung und den kurzlebigen Bildtransfer-Cache in `template-fill-service.js`.
- Extrahiert Archive-Insertion-Session-Persistenz, monotone Revisionen, öffentliche Snapshots und Meta/Status in `archive-insertion-service.js`; Browser-/Publish-/Verification-Orchestrierung bleibt im `background.js`.
- Historische Source-Location-Verträge wurden auf die neuen Modulbesitzer umgestellt, ohne fachliche/Safety-Assertions abzuschwächen.
- Keine beabsichtigte fachliche Änderung; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten.
<!-- KAR170-END:CHANGELOG:364 -->

## v1.22.15

<!-- KAR170-BEGIN:CHANGELOG:372 -->
### Original CHANGELOG: 1.22.15 (source line 372)

- Behoben: Einzelinventur konnte nach erfolgreichem Speichern beim Ergebnis-Rendering mit `appendDerivedListingDateBadge is not defined` scheitern.
- Refactoring: Mass-Renewal State/Progress/Stop/Finalisierung in `mass-renewal-controller.js` ausgelagert.
- Refactoring: Renewal-Semantikvergleich und Verification-Outcomes in `renewal-verification-service.js` ausgelagert.
- Browser-/Safety-Orchestrierung der Verifikation bleibt bewusst in `background.js`.
<!-- KAR170-END:CHANGELOG:372 -->

<!-- KAR170-BEGIN:README:157 -->
### Historical README: v1.22.15 (source line 157)

- Fix: Die Einzelinventur rendert den erfolgreichen Ergebnisdialog wieder zuverlässig; die abgeleitete Datums-Badge-Hilfe wird explizit aus dem Inventory-Render-Controller injiziert.
- Architektur: Mass-Renewal-Zustand/Mutation/Progress/Stop/Finalisierung liegt in `mass-renewal-controller.js`.
- Architektur: semantischer Renewal-Datensatz-/Bildvergleich und Verification-Outcomes liegen in `renewal-verification-service.js`; browsernahe Safe-/Fast-Verifikation und Lösch-/Publish-Safety bleiben im Service-Worker-Orchestrator.
- Safety-/Account-/Profil-/Remote-Mutationsgrenzen bleiben unverändert.
<!-- KAR170-END:README:157 -->

## v1.22.14

<!-- KAR170-BEGIN:CHANGELOG:379 -->
### Original CHANGELOG: 1.22.14 – Single-/Bulk-Inventur-Controller + Notfall-Reset-UX (source line 379)

- Single-Inventur-Workflow in `single-inventory-controller.js` ausgelagert; Account-/Profilbindung, Own-Ad-Prüfung, Edit-/Read-only-Worker und garantiertes Worker-Cleanup bleiben semantisch unverändert.
- Bulk-Inventur-State-Machine in `bulk-inventory-controller.js` ausgelagert: Run-Initialisierung, Progress-Patches, Existing-Skip-/Result-Accounting, kontrollierter Stop, Worker-Close und Fail-Transition. Browser-/DOM-nahe Worker-Extraktion, Fresh-Source-Orchestrierung, Reconciliation-Finalisierung und Retry bleiben bewusst im Service-Worker-Orchestrator.
- Notfall-Reset-UI korrigiert: Normal- und Bestätigungszustand besitzen erklärende Tooltips und `aria-label`; nach Ablauf des 10-Sekunden-Fensters werden Buttontext, Tooltip/ARIA und der zugehörige Bestätigungshinweis gemeinsam zurückgesetzt. Ein Revision-Guard verhindert, dass dabei ein inzwischen neuerer Diagnose-/Statushinweis überschrieben wird.
- Erwartbarer verspäteter `BULK_CLOSE_WORKER` nach bereits erfolgter Runtime-Recovery wird als `BACKGROUND_REQUEST_EXPECTED_BULK_CLOSE` auf Info-Level klassifiziert statt als Fehler.
- v1.22.13 bleibt funktional nativ bestanden; v1.22.14 benötigt native Smoke-Abnahme für Single/Bulk-Controller und Notfall-Reset-UX.
<!-- KAR170-END:CHANGELOG:379 -->

## v1.22.13

<!-- KAR170-BEGIN:CHANGELOG:387 -->
### Original CHANGELOG: 1.22.13 – Bulk-Inventur Deadlock-/Recovery-Härtung (source line 387)

- Behebt den nativen v1.22.12-Smoke-Test-Fehler, bei dem ein `BULK_EXTRACT_SAVE_WORKER`-Request unbegrenzt hängen konnte und dadurch die nominelle 90-Sekunden-Worker-Deadline nicht mehr erreicht wurde. `inventory-runner.js` verwendet nun einen separaten 15-Sekunden-Request-Timeout, jeweils gedeckelt durch die verbleibende absolute Item-Deadline.
- Neues `bulk-run-guard.js`: serialisiert persistente Bulk-State-Schreibvorgänge, verhindert die Wiederbelebung terminaler Runs durch veraltete `running`-Snapshots und führt eine monotone `stateRevision`.
- `tab-lifecycle-observer.js` mutiert Bulk-Zustände atomar. Parallele `tabs.onRemoved`-Ereignisse für Source-/Worker-/Metadata-Tabs können `needs-review` nicht mehr mit einem älteren `running`-Stand überschreiben.
- Independent Background-Watchdog mit 110-Sekunden-Hard-Limit für `opening-worker`/`worker-open`/`saving-worker`. Bei Überschreitung wird der Run fail-safe `needs-review / worker-timeout`, Worker werden geschlossen und Source-Ownership wird freigegeben bzw. ein automatisch erzeugter Source-Tab geschlossen.
- Laufende Bulk-Runs besitzen eine Runtime-Lease in `chrome.storage.session`. Fehlt diese Lease nach Extension-Reload, Browser-Neustart oder vergleichbarem Runtime-Verlust, wird ein persistiertes `running` automatisch zu `needs-review / runtime-session-lost` statt die UI dauerhaft zu sperren.
- Unter „Diagnose“ gibt es zusätzlich „Laufende Vorgänge zurücksetzen“. Die Aktion benötigt einen zweiten Bestätigungsklick und beendet ausschließlich Laufzeit-/Workflow-Zustände und Managed Worker; Inventar, Papierkorb, Profile, lokale Bilder und Einstellungen bleiben erhalten und auf Kleinanzeigen werden keine Anzeigen verändert oder gelöscht.
- RED→GREEN: neue Deadlock-/Timeout-, Guard- und parallele Lifecycle-Race-Regressionen. Alle bestehenden v1.22.12-Verträge bleiben grün; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben 0.
- v1.22.13 ist bewusst ein Stabilitätsrelease. Der zuvor für v1.22.13 geplante Refactoring-Schritt „Single Inventory + Bulk Inventory Controller“ rückt auf v1.22.14; die folgenden Refactoring-Ziele verschieben sich entsprechend um eine Version.
<!-- KAR170-END:CHANGELOG:387 -->

## v1.22.12

<!-- KAR170-BEGIN:CHANGELOG:398 -->
### Original CHANGELOG: 1.22.12 – Managed Tabs/Workers, Content Connection, Account Probe, Platform Safety und Tab Lifecycle modularisiert (source line 398)

- **Test-vor-Refactoring strikt eingehalten:** 10/10 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.11 grün festgeschrieben und bleiben nach der Extraktion byteidentisch. Anschließend kamen 11/11 Ownership-/Architektur- und 5/5 Runtime-Modultests hinzu.
- Neue `managed-tab-worker-service.js`, `content-connection-manager.js`, `account-probe-service.js`, `platform-safety-controller.js` und `tab-lifecycle-observer.js` übernehmen technische Tab-/Worker-, Content-Verbindungs-, Kontoprüf-, Plattform-Safety- und Lifecycle-Zustände.
- `background.js` bleibt Service-Worker-Orchestrator: fachliche Workflow-, Account-/Profil- und Remote-Mutationsentscheidungen bleiben dort bzw. in den bereits bestehenden Services; die neuen Module werden per Dependency Injection eingebunden.
- Managed Worker werden weiterhin zuerst als `about:blank` registriert und erst danach zum Ziel navigiert; Content-Bootstrap behält Loading-Deferral, kontrollierte Close-Semantik und Handshake-Retries; Account-Probes bleiben isoliert, retry-begrenzt und schließen ihren Worker zuverlässig.
- Plattformzugriffssperren bleiben fail-closed: Remote-Aktionen werden blockiert, laufende Workflows sicher in Review-/Stop-Zustände überführt und verwaltete Worker beendet. Tab-Lifecycle behandelt weiterhin verworfene/discarded Worker und unerwartet geschlossene Tabs kontrolliert.
- Keine beabsichtigte Produktsemantik geändert. Die gewünschte neue Profil-Löschsemantik bleibt Backlog. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten; v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:CHANGELOG:398 -->

## v1.22.11

<!-- KAR170-BEGIN:CHANGELOG:407 -->
### Original CHANGELOG: 1.22.11 – Profile/Inventory/Trash Repositories und Services modularisiert (source line 407)

- **Test-vor-Refactoring strikt eingehalten:** 8/8 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.10 grün festgeschrieben. Die beiden Pre-Refactor-Testdateien bleiben nach der Extraktion byteidentisch; anschließend kamen 11/11 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Neue `profile-repository.js`, `inventory-repository.js`, `inventory-image-store.js` und `trash-service.js` übernehmen die persistente Storage-Mechanik; `background.js` behält Workflow-, Safety-, Account-/Profil- und Diagnose-Orchestrierung sowie dünne Kompatibilitätsfassaden.
- Bestehende IndexedDB-Hot-Paths wurden ausdrücklich erhalten: profilindizierte Reads, `trashExpiresAt`-Index mit Next-Due-Cache, cursorbasierter Unassigned-Count und Shared-DB-Verbindung. Ein zunächst erkannter Scan-Fallback wurde vor Release korrigiert.
- Historische Implementierungsort-Tests wurden nur auf die neuen Modulgrenzen erweitert; fachliche und Safety-Erwartungen wurden nicht abgeschwächt.
- Keine beabsichtigte Produktsemantik geändert. Die bestehende Profil-Löschsemantik (lokale Datensätze → „Nicht zugeordnet“) bleibt in v1.22.11 bestehen; die neue gewünschte Voll-Löschsemantik bleibt Backlog. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:CHANGELOG:407 -->

<!-- KAR170-BEGIN:README:168 -->
### Historical README: Kleinanzeigen Renewal 1.22.11 (source line 168)


<!-- KAR170-END:README:168 -->

<!-- KAR170-BEGIN:README:170 -->
### Historical README: Version 1.22.11: Profile/Inventory/Trash Repositories und Services modularisiert (source line 170)

- Neue `profile-repository.js`, `inventory-repository.js`, `inventory-image-store.js` und `trash-service.js` übernehmen die persistente Profil-, Inventar-/Bild- und Papierkorb-Storage-Mechanik hinter `KRDeps`; `background.js` bleibt Service-Worker-Orchestrator für Workflow-, Account-/Profil- und Safety-Gates.
- `inventory-repository.js` besitzt IndexedDB-Schema/Connection, profilindizierte Reads, atomare Inventar-/Bild-Commits und Löschungen sowie Profilzuordnungs-Mutationen. Die bestehenden Hot-Paths bleiben erhalten: `profileId`-Index, `trashExpiresAt`-Index, wiederverwendete Shared-DB-Verbindung und cursorbasierter Legacy-Unassigned-Count.
- `trash-service.js` besitzt Retention-Schedule, Soft-Delete/Retention-Reset, endgültige lokale Löschung und Ablaufbereinigung; `inventory-image-store.js` besitzt lokale Bildreads und bildbezogene Cleanup-Operationen; `profile-repository.js` besitzt Profil-/Selected-/Active-Metadaten inklusive Import-Metadaten.
- Strikt test-first: 8/8 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.10 grün festgeschrieben und blieben nach dem Refactor SHA-256-identisch. Danach kamen 11/11 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Ein alter Hot-Path-Vertrag deckte während der Regression einen unbeabsichtigten Scan-Fallback in der ersten Refactor-Fassung auf; die Implementierung wurde korrigiert, sodass Trash-Expiry und Unassigned-Count die bisherigen indizierten/cursorbasierten Pfade beibehalten.
- Keine beabsichtigte fachliche Änderung: Insbesondere bleibt die bestehende Profil-Löschsemantik in v1.22.11 unverändert (Datensätze werden weiterhin zu „Nicht zugeordnet“). Die gewünschte künftige Semantik „Profil löschen = lokalen Profilbestand vollständig löschen, ZIP als Erhaltungsweg“ bleibt separater Backlogpunkt. Publish-/Delete-/Renewal-/Account-Safety bleibt unverändert; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben ausgeschlossen.
<!-- KAR170-END:README:170 -->

## v1.22.10

<!-- KAR170-BEGIN:CHANGELOG:415 -->
### Original CHANGELOG: 1.22.10 – Profile Backup + Inventory Render/Formatting modularisiert (source line 415)

- **Test-vor-Refactoring strikt eingehalten:** Zwei neue v1.22.10-Pre-Refactor-Suites wurden auf unverändertem v1.22.9 erstellt und mit 9/9 Characterization- sowie 6/6 Runtime-Checks grün festgeschrieben. Ihre SHA-256-Hashes blieben nach der Extraktion unverändert; anschließend kamen 10/10 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Neuer `profile-backup-controller.js`: besitzt exklusiven Profil-Transfer-Lock, Native-File-Picker-Zustand, Export/Import, profilbezogene IndexedDB-Snapshots, collision-sicheren atomaren Inventar-/Bild-Replace und Rollback-Schutz. Workflow-/Insertion-/Capture-Blocker bleiben im `app.js`-Orchestrator.
- Neuer `inventory-formatting.js`: besitzt die inventarbezogene Präsentationssemantik für Preis/Kategorie, Listing-/Enddatum, Renewal-Status und Papierkorb-Retention. `app.js` hält nur kleine kompatible Fassaden; die Render-Runtime konsumiert das Modul direkt.
- Neuer `inventory-render-controller.js`: besitzt detaillierte und kompakte Inventar-/Papierkorb-Renderpfade, Lazy-Details, Karten-/Zeilenaktionen, lokale Bilddarstellung und ZIP-Export-UI. Fachliche Account-/Profil-/Insertion-/Renewal-Gates werden injiziert und nicht in den Controller verschoben.
- `app.js` sinkt von 5.323 auf rund 3.860 Zeilen. Historische source-location-Verträge lesen für ihre unveränderten Verhaltenserwartungen eine test-only zusammengesetzte Source-Surface aus den realen neuen Modulen statt Dead-Code in `app.js` zu halten.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal-, Trash- oder Backup-Safety-Semantik geändert. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.
<!-- KAR170-END:CHANGELOG:415 -->

<!-- KAR170-BEGIN:README:179 -->
### Historical README: Version 1.22.10: Profile Backup + Inventory Render/Formatting modularisiert (source line 179)

- Neuer `profile-backup-controller.js`: besitzt Profil-Transfer-Lock, Native-Picker-Zustand, Export/Import, profilbezogene IndexedDB-Snapshots sowie den atomaren Inventar-/Bild-Replace mit Rollback-Schutz. `app.js` behält die workflowgebundenen Start-Blocker und dünne Orchestrierungsfassaden.
- Neuer `inventory-formatting.js`: bündelt die Inventar-/Papierkorb-spezifische Preis-, Kategorie-, Datums-, Renewal- und Retention-Präsentationssemantik hinter `KRDeps`.
- Neuer `inventory-render-controller.js`: besitzt detaillierte und kompakte Inventar-/Papierkorb-Darstellung einschließlich Karten-/Zeilenaktionen, Lazy-Details, Bildstreifen, ZIP-Aktionen und Render-Kontext. Account-/Profil-/Workflow-Gates bleiben injizierte Orchestrator-Abhängigkeiten.
- Strikt test-first: 9/9 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.9 vor dem Refactor grün festgeschrieben; beide Pre-Refactor-Testdateien sind nach dem Umbau SHA-256-identisch. Danach kamen 10/10 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Historische lexikalische Verträge wurden ausschließlich hinsichtlich der neuen Implementierungsorte auf eine test-only zusammengesetzte Source-Surface umgestellt; fachliche und Safety-Assertions wurden nicht gelockert.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal-, Trash- oder Backup-Semantik bewusst geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.
<!-- KAR170-END:README:179 -->

## v1.22.9

<!-- KAR170-BEGIN:CHANGELOG:424 -->
### Original CHANGELOG: 1.22.9 – Mass-Renewal UI und Archive-/Trash-Insertion UI modularisiert (source line 424)

- **Test-vor-Refactoring strikt eingehalten:** Die fehlenden v1.22.9-Characterization-/Runtime-Verträge wurden zuerst auf dem unveränderten v1.22.8-Stand erstellt und dort 8/8 bzw. 5/5 grün bestätigt. Dieselben Testdateien blieben nach der Extraktion unverändert und erneut grün; erst danach wurden Ownership-/Architekturtests ergänzt.
- Neuer `mass-renewal-ui-controller.js`: besitzt Auswahl, Reihenfolge/Drag-and-drop, Batch-Snapshot, Safe-/Fast-Phasenmodell, Fortschritt, Summary, Retry, kontrollierten Stop und den kompletten Mass-Renewal-Dialog-Lifecycle. `app.js` behält Account-/Workflow-Orchestrierung und die Runtime-Brücke.
- Neuer `archive-trash-insertion-ui-controller.js`: besitzt ZIP-Validierung und Archive-Insertion-Dialogzustand, revisionsgeschützte Progress-Snapshots sowie Trash-Template-Dialog, manuelle Publish-/Erfassungsfreigabe und zugehörige UI-Lifecycle-Events. Storage-/Image-Staging und die workflow-/accountgebundene Start-Orchestrierung bleiben in `app.js`.
- Historische Verträge wurden nur dort auf die neuen Implementierungsorte erweitert, wo sie zuvor bewusst `app.js` als Speicherort geprüft hatten. Die fachlichen und Safety-Assertions blieben unverändert.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal- oder Trash-Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.
<!-- KAR170-END:CHANGELOG:424 -->

<!-- KAR170-BEGIN:README:188 -->
### Historical README: Version 1.22.9: Mass-Renewal UI und Archive-/Trash-Insertion UI modularisiert (source line 188)

- `mass-renewal-ui-controller.js` besitzt jetzt den zustandsbehafteten Mehrfach-Neuinserat-Dialog: Auswahl, Reihenfolge, Fortschritt, Summary, Retry und kontrollierten Stop.
- `archive-trash-insertion-ui-controller.js` besitzt ZIP-/Archive-Insertion-UI und Trash-Template-UI einschließlich Validierung, Fortschritt und manueller Erfassungsfreigabe.
- `app.js` bleibt Orchestrator und behält Storage-/Image-Staging, Account-/Profilbindung sowie die eigentlichen Workflow-Startbrücken.
- Die Extraktion wurde strikt test-first durchgeführt: 8/8 Characterization + 5/5 Runtime auf unverändertem v1.22.8 vor dem Refactor; dieselben Tests unverändert danach erneut grün.
- Keine fachliche oder Safety-Semantik wurde bewusst verändert. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:README:188 -->

## v1.22.8

<!-- KAR170-BEGIN:CHANGELOG:432 -->
### Original CHANGELOG: 1.22.8 – Inventory Capture und Renewal Dialog modularisiert (source line 432)

- **Test-vor-Refactoring strikt eingehalten:** Fehlende Characterization-/Runtime-Verträge wurden zuerst auf dem unveränderten v1.22.7-Stand erstellt und dort 8/8 bzw. 5/5 grün bestätigt. Dieselben Dateien blieben nach der Extraktion unverändert und erneut grün; erst danach wurden Ownership-/Architekturtests ergänzt.
- Neuer `inventory-capture-controller.js`: besitzt Dialogzustand, Single-Candidate-Auswahl, Bulk-Reentry, Membership-Snapshot, Fortschritts-/Result-Darstellung und Capture-Modal-Lifecycle. `app.js` behält die accountgebundene Single-/Bulk-Orchestrierung und Runtime-Kommunikation.
- Neuer `renewal-dialog-controller.js`: besitzt Renewal-Dialogzustand, Tracking, Safe-/Fast-Phasenanzeige, Bestätigung, Fortschritt, Abschlussdarstellung und Dialog-Listener. Die eigentliche Renewal-Workflow-/Safety-Orchestrierung bleibt außerhalb des Dialogcontrollers.
- Bestehende historische UI-/Workflow-Verträge wurden nur dort auf die neuen Implementierungsorte umgestellt, wo sie zuvor bewusst `app.js` als Speicherort geprüft hatten. Die Verhaltenserwartungen und Safety-Negativverträge wurden nicht gelockert.
- Keine fachliche Workflow-, Publish-, Delete-, Account- oder Renewal-Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.
<!-- KAR170-END:CHANGELOG:432 -->

## v1.22.7

<!-- KAR170-BEGIN:CHANGELOG:440 -->
### Original CHANGELOG: 1.22.7 – Sticky/Layout, Tab/Page Inspection und Shared UI Helpers modularisiert (source line 440)

- **Test-vor-Refactoring erstmals formal angewendet:** Vor jeder Codeverschiebung wurde die bestehende Abdeckung inventarisiert. Fehlende Characterization-/Runtime-Verträge (`v1227-pre-refactor-*`) wurden auf dem unveränderten v1.22.6-Stand erstellt und dort 7/7 bzw. 4/4 grün bestätigt. Dieselben Tests blieben nach der Extraktion unverändert und grün; erst anschließend kamen Ownership-/Architekturtests hinzu.
- Neuer `app-layout-controller.js`: besitzt Sticky-Header-Sync sowie die temporäre `UI_SIDEBAR_*`-Bottom-of-page-Diagnose. `app.js` behält dünne Fassaden und View-Orchestrierung.
- Neuer `tab-page-inspection-controller.js`: besitzt Tab-Messaging, Content-Connection-Recovery, Lifecycle-Klassifikation und die Abfrage nutzerseitiger Kleinanzeigen-Tabs. Bestehende erwartete-close/gone/discarded-Semantik und Diagnoseevents bleiben erhalten.
- Neuer `shared-ui-helpers.js`: bündelt wiederverwendbare Preis-, Kategorie-, Datums- und Compact-Action-Formatierung/DOM-Helfer.
- Die bestehenden Sticky-/Bottom-Clamp-, Tab-Lifecycle- und UI-Verhaltensverträge wurden auf die neuen Implementierungsorte umgestellt, ohne die fachlichen Erwartungen zu lockern.
- Keine fachliche Funktionalität oder Safety-Semantik geändert. `UI_ACTIONS_*` bleibt aktiv; `UI_SIDEBAR_*` bleibt bis zur formalen nativen Bottom-Clamp-Abnahme aktiv. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:CHANGELOG:440 -->

<!-- KAR170-BEGIN:README:196 -->
### Historical README: Version 1.22.7: Layout-, Tab-Inspection- und Shared-UI-Grenzen modularisiert (source line 196)

- Die neue verbindliche **Test-vor-Refactoring-Regel** wurde erstmals vollständig angewendet: Testinventur → fehlende Characterization-/Runtime-Tests auf unverändertem v1.22.6 grün → Refactoring → dieselben Tests unverändert grün → Ownership-/Architekturtests → Vollregression/E2E.
- `app-layout-controller.js` besitzt jetzt Sticky-Header-Geometrie/Sync und die temporäre Bottom-of-page-`UI_SIDEBAR_*`-Diagnose.
- `tab-page-inspection-controller.js` besitzt Tab-Messaging, Content-Bootstrap-Recovery, Lifecycle-Klassifikation und die nutzerseitige Kleinanzeigen-Tab-Abfrage.
- `shared-ui-helpers.js` bündelt wiederverwendbare Preis-, Kategorie-, Datums- und kompakte Action-UI-Helfer.
- `app.js` bleibt Orchestrator und hält für bestehende Call-Sites bewusst dünne Fassaden. Keine Workflow-, Publish-, Delete-, Account-, Renewal- oder sonstige Safety-Semantik wurde geändert.
<!-- KAR170-END:README:196 -->

## v1.22.6

<!-- KAR170-BEGIN:CHANGELOG:451 -->
### Original CHANGELOG: 1.22.6 – Diagnose- und Actions-Diagnose modularisiert (source line 451)

- Extrahiert den zustandsbehafteten Diagnose-Store aus `background.js` nach `diagnostics-service.js`. Session-ID, Buffer, Flush-Queue, Cache, Retention, Aggregation, Redaction, Gallery-Diagnose sowie Reset-/Boundary-State liegen nun im eigenen Service; `background.js` behält dünne Fassaden und workflow-nahe Korrelation/Blocker.
- Extrahiert die umfangreiche Actions-/UI-Stuck-Instrumentierung aus `app.js` nach `actions-diagnostics-controller.js`. State-Snapshots, Pointer-/Hit-Test-Capture, Desync-Erkennung, Background-Epoch, Resync-Lifecycle und Karten-Interaktionsdiagnose liegen nun im eigenen Controller.
- Beide Module werden über `KRDeps` geladen und erhalten ihre konkreten Abhängigkeiten per Factory/Dependency-Injection. Bestehende Eventnamen, Diagnosefelder, Retention, Export-/Reset-Verhalten und Actions-Recovery-Semantik bleiben erhalten.
- Historische Verträge wurden nur dort auf die neuen Modulgrenzen angepasst, wo sie Implementierungsorte statt Verhalten geprüft hatten. Neue statische und Runtime-Verträge sichern State-Besitz, Aggregation/Redaction/Reset sowie Actions-Snapshot/Epoch/Resync-Verhalten.
- Keine fachliche Workflow- oder Safety-Semantik geändert. `UI_ACTIONS_*` bleibt aktiv; `UI_SIDEBAR_*` bleibt bis zur formalen nativen Bottom-Clamp-Abnahme aktiv. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:CHANGELOG:451 -->

<!-- KAR170-BEGIN:README:205 -->
### Historical README: Version 1.22.6: Diagnose- und Actions-Diagnose modularisiert (source line 205)

- `background.js` gibt den zustandsbehafteten Diagnose-Store an `diagnostics-service.js` ab. Session-Grenzen, Buffer/Flush, Cache, Retention, Aggregation, Redaction, Gallery-Diagnose und Reset-State liegen damit außerhalb des Service-Worker-Orchestrators.
- `app.js` gibt die ausführliche Actions-/UI-Stuck-Instrumentierung an `actions-diagnostics-controller.js` ab. Snapshots, Pointer-/Hit-Test-Diagnose, Desync-Erkennung, Background-Epoch, Resync und Karten-Interaktionsdiagnose besitzen jetzt einen eigenen Controller.
- Beide Module nutzen `KRDeps` und Dependency Injection; die bisherigen internen Aufrufer bleiben über dünne Fassaden kompatibel. Diagnoseevent-Namen und fachliche Semantik bleiben unverändert.
- Neue Architektur- und Runtime-Verträge sichern die Modulgrenzen sowie Diagnose-Aggregation/Redaction/Reset und Actions-Resync/Epoch-Verhalten.
- Keine Workflow-, Publish-, Delete-, Account-, Renewal-, ZIP- oder sonstige Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:README:205 -->

## v1.22.5

<!-- KAR170-BEGIN:CHANGELOG:459 -->
### Original CHANGELOG: 1.22.5 – Erste inkrementelle Modularisierung (source line 459)

- Extrahiert den zustandsbehafteten Meldungs-/Activity-Center aus `app.js` nach `app-activity-center.js`. Persistenz, Retention, Priorisierung, Verlauf, Dismiss-Fingerprints und Rendering liegen im eigenen Controller; `app.js` bleibt UI-Orchestrator mit dünnen Kompatibilitätsfassaden.
- Extrahiert die eventgetriebene Tab-Load-/Target-Navigation-Wartekoordination aus `background.js` nach `tab-load-coordinator.js`. Waiter-/Versionszustand, Event-Wakeup, Timing-/Timeout-Diagnose und Off-Target-Erkennung liegen im eigenen Controller; `background.js` bleibt Service-Worker-Orchestrator.
- Beide neuen Module werden über `KRDeps` eingebunden und erhalten ihre konkreten Laufzeitabhängigkeiten per Factory/Dependency-Injection. Das reduziert versteckten gemeinsamen Zustand und bereitet weitere modulare Extraktionen vor.
- Bestehende interne Call-Sites bleiben über dünne Fassaden kompatibel; keine fachliche Workflow- oder Safety-Semantik geändert.
- Neue Architektur- und Runtime-Verträge sichern die Modulgrenzen sowie Activity-Center- und Tab-Readiness-Verhalten. Die Browser-/MV3-E2E-Suite bleibt unverändert Release-Gate.
- v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.
<!-- KAR170-END:CHANGELOG:459 -->

<!-- KAR170-BEGIN:README:213 -->
### Historical README: Version 1.22.5: erste inkrementelle Modularisierungswelle (source line 213)

- `app.js` gibt den zustandsbehafteten Meldungs-/Activity-Center-Bereich an `app-activity-center.js` ab. Persistenz, Retention, Priorisierung, Verlauf, Dismiss-Fingerprints und Rendering dieses Bereichs liegen damit in einem eigenen Controller; `app.js` behält nur dünne Fassaden und UI-Orchestrierung.
- `background.js` gibt die eventgetriebene Tab-Load-/Target-Navigation-Wartekoordination an `tab-load-coordinator.js` ab. Waiter-/Versions-Maps, Signal-Wakeup, Timing-/Timeout-Diagnose und target-bound Off-Target-Erkennung liegen damit außerhalb des Service-Worker-Monolithen.
- Beide Module werden über die in v1.22.4 eingeführte `KRDeps`-Grenze konsumiert und erhalten ihre Laufzeitabhängigkeiten explizit per Factory-/Dependency-Injection. Legacy-interne Funktionsnamen bleiben als dünne Fassaden erhalten, damit bestehende Call-Sites und Verhalten stabil bleiben.
- Die Extraktion ist bewusst die erste, kleine Welle: keine Big-Bang-Zerlegung, keine neue fachliche Funktion, keine Änderung an Publish-, Delete-, Account-, Renewal-, ZIP- oder Workflow-Safety.
- Neue statische und Runtime-Verträge prüfen die Modulgrenzen sowie Activity-Center- und Tab-Readiness-Semantik. Die reale Browser-/MV3-Suite bleibt Release-Gate. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:README:213 -->

## v1.22.4

<!-- KAR170-BEGIN:CHANGELOG:469 -->
### Original CHANGELOG: 1.22.4 – Runtime-Dependency-Boundary (source line 469)

- Führt `runtime-deps.js` als kleine zentrale Runtime-Registry ein und lädt sie vor allen abhängigen Scripts in App, Content-Scripts, dynamischem Content-Bootstrap und Service Worker.
- App, Content-Einstieg und Service Worker lösen Kernabhängigkeiten über `KRDeps.require(...)`; optionale Helper verwenden `KRDeps.optional(...)`. Direkte benannte `globalThis.KR…`-Reads werden an diesen Consumer-Grenzen reduziert.
- Bestehende `KR…`-Producer bleiben in v1.22.4 bewusst unverändert. Die Registry adoptiert diese Legacy-Aliase lazy beim ersten Zugriff. Das hält den Refactor inkrementell und reduziert den Runtime-Diff.
- Die Registry verhindert konfliktbehaftete Doppelregistrierungen und liefert bei fehlenden strikten Abhängigkeiten einen klaren Load-Order-Fehler.
- Neue statische und Runtime-Verträge sichern Reihenfolge, Consumer-Grenzen, Legacy-Brücke, Duplicate-/Missing-Verhalten sowie Packaging ab.
- Keine fachliche Funktionalität oder Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.
<!-- KAR170-END:CHANGELOG:469 -->

<!-- KAR170-BEGIN:README:221 -->
### Historical README: Version 1.22.4: explizite Runtime-Abhängigkeitsgrenze (source line 221)

- Neue kleine `runtime-deps.js`-Registry als zentrale Abhängigkeitsgrenze für App, Content-Scripts und Service Worker.
- `runtime-deps.js` wird in allen drei Runtime-Kontexten garantiert zuerst geladen: App-Scriptreihenfolge, Manifest-Content-Scripts, dynamischer Content-Bootstrap und Service-Worker-`importScripts`.
- Zentrale Verbraucher lesen Kernabhängigkeiten nicht mehr direkt über viele `globalThis.KR…`-Namen, sondern über `KRDeps.require(...)` bzw. für bewusst optionale Helper über `KRDeps.optional(...)`.
- Bestehende `KR…`-Globals bleiben in dieser inkrementellen Phase als unveränderte Kompatibilitäts-Aliase bestehen. Die Registry übernimmt sie beim ersten Zugriff lazy; dadurch mussten die stabilen Producer-Module nicht gleichzeitig refactort werden.
- Die Registry erkennt widersprüchliche Doppelregistrierungen, meldet fehlende strikte Abhängigkeiten eindeutig und hält registrierte Namen deterministisch.
- Keine fachliche Workflow-, UI-, Publish-, Delete-, Account- oder Renewal-Semantik geändert. Der strukturelle Actions-Fix und die Fokus-Modality bleiben unverändert. v1.21.15 bleibt das unveränderliche Gold-Release.
<!-- KAR170-END:README:221 -->

## v1.22.3

<!-- KAR170-BEGIN:CHANGELOG:479 -->
### Original CHANGELOG: 1.22.3 – Fokus-Modality für Actions (source line 479)

- Der Actions-Bereich unterscheidet Pointer- und Keyboard-Modality jetzt explizit statt sich allein auf Chromes `:focus-visible`-Heuristik zu verlassen.
- Jede Pointer-Eingabe setzt die Actions-Fokusdarstellung auf `pointer`; Tab sowie Tastaturaktivierung im Actions-Bereich schalten auf `keyboard`.
- Nach einer Maus-/Pointer-Aktion bleibt am ausgelösten Action-Button kein sichtbarer Outline zurück – auch dann nicht, wenn ein Dialog den Fokus später programmgesteuert auf den auslösenden Button zurückgibt.
- Echter Tastaturfokus bleibt weiterhin mit dem vorhandenen 2-px-Mint-Outline sichtbar. Kein `blur()`-Workaround; Fokus selbst und Tastaturbedienbarkeit bleiben erhalten.
- Der echte Browser-/MV3-E2E-Test prüft zusätzlich die simulierte Fokus-Rückgabe nach Pointer-Aktion sowie den anschließenden Wechsel auf Keyboard-Modality per Tab.
- Der strukturelle Actions-Accordion-Fix aus v1.22.1 sowie sämtliche Publish-, Delete-, Account-, Renewal- und Workflow-Safety-Grenzen bleiben unverändert. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:CHANGELOG:479 -->

<!-- KAR170-BEGIN:README:230 -->
### Historical README: Version 1.22.3: deterministische Fokus-Modality im Actions-Bereich (source line 230)

- Nach einer per Maus/Pointer ausgelösten Aktion zeigt der auslösende Button keinen persistenten Fokusrahmen mehr – weder den Chromium-UA-Rahmen noch den mintfarbenen Tastaturindikator. Das gilt auch nach einer späteren Fokus-Rückgabe aus einem Dialog.
- Der Actions-Bereich führt dafür explizit die letzte Eingabemodalität `pointer` oder `keyboard`. Tab bzw. Tastaturaktivierung schalten zuverlässig zurück auf Keyboard-Modality.
- Tastaturbedienung bleibt vollständig sichtbar: echter Keyboard-Fokus behält den 2-px-Mint-Rahmen. Es wird kein `blur()` eingesetzt.
- Der Browser-E2E-Test deckt Pointer-Klick, simulierte Fokus-Rückgabe und anschließende Tab-Navigation ab.
- Keine Workflow-, Account-, Renewal-, Delete-, ZIP- oder sonstige Safety-Grenze wurde verändert. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:README:230 -->

## v1.22.2

<!-- KAR170-BEGIN:CHANGELOG:488 -->
### Original CHANGELOG: 1.22.2 – Fokusdarstellung und Safety-Dokumentations-Cleanup (source line 488)

- Action-Buttons im Bereich `Aktionen` entfernen bei Pointer-Fokus den Chromium-UA-Outline über `:focus:not(:focus-visible)`, behalten aber einen expliziten mintfarbenen `:focus-visible`-Indikator für Tastaturbedienung. Kein programmatisches `blur()`.
- Der Browser-E2E-Test des Actions-Accordions prüft zusätzlich Pointer-Fokus ohne UA-Rahmen sowie sichtbaren Tastaturfokus.
- Der sachlich falsche Modulkommentar in `template-filler.js` wurde an die seit v1.8.2 bestehende Safety-Semantik angepasst: Template-only veröffentlicht nie automatisch; Renewal-/Archive-Insertion darf nur hinter dem vollständigen Hard-Gate automatisch den eindeutigen sichtbaren Publish-Button klicken. `.submit()`/`requestSubmit()` bleiben ausgeschlossen.
- Zwei überholte globale README-Aussagen zu Remote-Löschung und automatischem Publish wurden auf die tatsächlichen, workflow-spezifischen Grenzen präzisiert. Keine Runtime-Safety- oder Workflow-Semantik geändert.
- Das Source-Packaging schließt `__pycache__`/`.pyc` explizit aus, damit lokale Python-Testcaches nicht versehentlich in Release-Sources gelangen.
- v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.
<!-- KAR170-END:CHANGELOG:488 -->

<!-- KAR170-BEGIN:README:238 -->
### Historical README: Version 1.22.2: Fokusdarstellung und Safety-Dokumentation (source line 238)

- Action-Buttons zeigen nach einem normalen Mausklick keinen persistenten weißen Chromium-UA-Fokusrahmen mehr. Pointer-Fokus blendet nur den UA-Outline aus; echter Tastaturfokus bleibt mit einem expliziten mintfarbenen `:focus-visible`-Indikator sichtbar. Kein `blur()`-Workaround.
- Die Safety-Dokumentation wurde gegen den realen Runtime-Stand abgeglichen. `template-filler.js` dokumentiert jetzt korrekt, dass Template-only-Abläufe nicht automatisch veröffentlichen, während verifizierte Renewal-/ZIP-Insertion-Abläufe den finalen sichtbaren Publish-Button ausschließlich hinter dem bestehenden vollständigen Hard-Gate automatisch klicken dürfen. `.submit()`/`requestSubmit()` bleiben verboten.
- Historisch überholte globale Aussagen in der README wurden präzisiert: lokale Inventar-Löschaktionen verändern Kleinanzeigen nicht; der separat abgesicherte Renewal-Workflow kann dagegen nach verifizierter Neuerstellung die alte Quellanzeige entfernen. Ebenso bleibt manuelles/Template-only-Neuinserieren manuell, während der Renewal-Hard-Gate-Pfad seit v1.8.2 automatisches Veröffentlichen erlaubt.
- Keine Workflow-, Account-, Renewal-, Delete-, ZIP- oder sonstige Safety-Grenze wurde verändert. v1.21.15 bleibt unveränderliches Gold-Release.
<!-- KAR170-END:README:238 -->

## v1.22.1

<!-- KAR170-BEGIN:CHANGELOG:497 -->
### Original CHANGELOG: 1.22.1 – Actions-Accordion Hit-Test-Fix (source line 497)

- Native Diagnose aus v1.21.15 bestätigte einen Hit-Test-/Rendering-State-Desync im Bereich „Aktionen“: sichtbare/enabled Button-Rechtecke waren vorhanden, `elementFromPoint()` traf jedoch wiederholt das übergeordnete native `<details>` statt Button-/Wrapper-Subtree. Fachlicher Disabled-/Busy-State, externes Overlay und verwaister eigener WAAPI-State waren für diesen Fall ausgeschlossen.
- Der Bereich „Aktionen“ wurde deshalb vom nativen `<details>/<summary>`-Open-State entkoppelt. Er verwendet nun einen normalen fokussierbaren Button mit `aria-expanded`/`aria-controls` und ein explizit kontrolliertes Panel. „Konfiguration“ und „Diagnose“ bleiben unverändert native Details.
- Der bestehende gemeinsame Accordion-Controller abstrahiert jetzt nativen und kontrollierten Open-State; Animation, Single-Open-Verhalten, Watchdog/Sanitizer und bestehende Actions-Diagnose bleiben erhalten.
- Der v1.22.0 Browser-E2E-Test `accordion-rapid-toggle` prüft zusätzlich den realen Hit-Test der vier Action-Buttons nach Rapid-Toggle. Für den Test werden nur synchron im Testkontext deaktivierte Buttons kurz pointer-aktiv gemacht; es wird keine Aktion ausgelöst und keine Remote-Mutation ausgeführt.
- Die Browser-Harness-Wartebedingungen wurden auf CSP-sichere Funktionsprädikate umgestellt; reine Testinfrastruktur, keine Produktionssemantik.
- Gold-Referenz bleibt unverändert v1.21.15. Alle Gold-Runtime-Dateien außer `app.html`, `app.css` und `app.js` bleiben in v1.22.1 byteidentisch. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.
<!-- KAR170-END:CHANGELOG:497 -->

<!-- KAR170-BEGIN:README:245 -->
### Historical README: Version 1.22.1: Actions-Accordion Hit-Test-Fix (source line 245)

- **v1.21.15 bleibt unveränderliche Gold-Referenz.** v1.22.1 ist ein gezielter QoL-/Stabilitätspatch auf der v1.22.0-E2E-Basis.
- Der native Actions-Freeze wurde diagnostisch auf einen Hit-Test-/Rendering-State des nativen `<details>` eingegrenzt: Button-Geometrie und Enable-State waren korrekt, Chrome traf im eingefrorenen Zustand aber das übergeordnete `details#actionsAccordion`.
- Nur der Bereich **„Aktionen“** verwendet deshalb jetzt einen kontrollierten Accordion-Container mit normalem Button (`aria-expanded`, `aria-controls`) und explizitem Panel-State; Konfiguration und Diagnose bleiben unverändert.
- Bestehende Accordion-Animation, Single-Open-Verhalten, Watchdog/Sanitizer und die ausführliche `UI_ACTIONS_*`-Diagnose bleiben erhalten.
- Der echte Browser-E2E-Test prüft nach Rapid-Toggle zusätzlich, dass alle vier Action-Flächen im Chrome-Hit-Test tatsächlich ihre Buttons treffen und nicht den Accordion-Container.
- Keine fachliche Workflow-, Publish-, Delete-, Account- oder Renewal-Semantik wurde verändert.
<!-- KAR170-END:README:245 -->

## v1.22.0

<!-- KAR170-BEGIN:CHANGELOG:506 -->
### Original CHANGELOG: 1.22.0 (source line 506)

- Quality-of-Life test foundation on immutable Gold baseline v1.21.15; no production runtime logic changes beyond the version metadata/docs.
- Added real Chrome/Chromium MV3 E2E harness (`npm run test:e2e`) with isolated temporary profiles and locally intercepted Kleinanzeigen fixtures; no real account or remote mutation is required.
- Added 8 browser scenarios: MV3 boot, service-worker restart/reconnect, rapid Actions accordion toggles, app close/reopen persistence, profile-switch action lock, unexpected worker-tab close, Bottom-Clamp in all four inventory/trash × detailed/compact combinations, and remote publish/delete safety negative.
- Added immutable Gold baseline manifest with canonical v1.21.15 artifact hashes and SHA-256 parity for 39 production runtime files. v1.22.0 statically proves these runtime files are byte-identical to Gold.
- Browser infrastructure failures (missing browser/Playwright or enterprise policy blocking unpacked extensions) are hard failures, never false PASS/SKIP.
- `scripts/build.sh` can execute the browser gate with `KR_RUN_BROWSER_E2E=1`; default builds remain portable across machines without browser-test prerequisites.
<!-- KAR170-END:CHANGELOG:506 -->

<!-- KAR170-BEGIN:README:1843 -->
### Historical README: Gold-Baseline und Browser-E2E ab v1.22.0 (source line 1843)

v1.21.15 ist die unveränderliche Gold-Referenz. `tests/e2e/gold-v1.21.15.json` dokumentiert die kanonischen Artefakt-Hashes und die SHA-256-Werte der 39 Produktions-Runtime-Dateien, die v1.22.0 byteidentisch übernimmt.

Die neue echte Chrome-/MV3-Suite wird mit `npm run test:e2e` gestartet. Sie nutzt ein isoliertes temporäres Browserprofil und lokale Fixtures für `kleinanzeigen.de`; ein echtes Konto wird nicht benötigt und es werden keine realen Remote-Mutationen ausgeführt. Voraussetzungen und einzelne Szenarien sind in `tests/e2e/README.md` dokumentiert. Für einen Release-Build kann der Browser-Gate explizit mit `KR_RUN_BROWSER_E2E=1 ./scripts/build.sh <ziel>` aktiviert werden. Infrastrukturprobleme werden dabei als Fehler behandelt und niemals als bestandener oder übersprungener E2E-Test ausgegeben.
<!-- KAR170-END:README:1843 -->

## v1.21.15

<!-- KAR170-BEGIN:CHANGELOG:515 -->
### Original CHANGELOG: 1.21.15 – Actions-Stuck-Hardening und UI-Feinschliff (source line 515)

- Actions-/UI-Stuck-Diagnose erweitert: document-level Capture protokolliert Pointerdown/Click im geometrischen Actions-Bereich auch dann, wenn das Ereignis `.primary-actions` oder den erwarteten Button nicht erreicht. Erfasst werden Event-/Hit-Target, `elementsFromPoint`-Stack, erwarteter Button, mögliche Overlay-Situation, Accordion-/Panel-/Primary-Actions-Geometrie, `overflow`, `pointer-events`, Web-Animation-State, Background-Epoch und Zeit seit letztem erfolgreichen Actions-State-Sync.
- Actions-State-Snapshots enthalten zusätzlich den Zustand des Aktionen-Accordions (`open`, effektiver Zielzustand, `is-animating`, Panel-/Summary-/Body-Geometrie, `scrollHeight`, Inline-Höhe/-Opacity sowie WAAPI-Status).
- Accordion-Animationen besitzen einen Failsafe-Watchdog. Verwaiste oder zu alte `is-animating`-/Inline-Zustände werden bei Pointerdown im Actions-Bereich, App-Focus, Rückkehr zur sichtbaren Seite und Actions-Re-Sync bereinigt und mit `UI_ACTIONS_ACCORDION_*_RECOVERED` diagnostiziert.
- Accordion-Summaries bleiben während Animationen anklickbar; Rapid-Clicks orientieren sich am angeforderten Zielzustand und können eine laufende Öffnen-/Schließen-Animation kontrolliert umkehren.
- Papierkorb-Detailbezeichnung wurde von `Im Papierkorb seit` auf `Im Papierkorb` verkürzt; Datum/Uhrzeit bleiben unverändert.
- Die drei Schritt-Kacheln im Papierkorb-Vorlagenworkflow nutzen auf Desktop die volle verfügbare Breite mit drei gleich großen Spalten; bestehendes Responsive-Verhalten bleibt erhalten.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt bewusst aktiv. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.
<!-- KAR170-END:CHANGELOG:515 -->

<!-- KAR170-BEGIN:README:254 -->
### Historical README: Version 1.21.15: Actions-Stuck-Hardening und UI-Feinschliff (source line 254)

- Die Actions-/UI-Stuck-Diagnose erfasst jetzt Pointer-Ereignisse auf Dokumentebene im gesamten geometrischen Actions-Bereich. Dadurch werden auch Klicks sichtbar, die wegen Overlay, Clipping oder Hit-Test-Problemen die eigentlichen Aktionsbuttons nie erreichen.
- Diagnoseeinträge enthalten Hit-Target und Hit-Stack, erwarteten Button, mögliche Overlay-Erkennung, Actions-/Panel-Geometrie, `overflow`, `pointer-events`, Accordion-`open`/`is-animating`, `scrollHeight`, Inline-Geometrie und Web-Animation-State.
- Actions-State-Snapshots enthalten den Accordion-Zustand, damit fachlich korrekte Button-States mit der tatsächlichen UI-Geometrie korreliert werden können.
- Accordion-Animationen besitzen einen Watchdog und eine defensive Sanierung auf Actions-Pointerdown, App-Focus, Visibility-Rückkehr und Actions-Re-Sync. Ein verwaister Animationszustand wird bereinigt und separat diagnostiziert.
- Accordion-Köpfe werden während einer Animation nicht mehr per `pointer-events:none` blockiert. Schnelle Gegenklicks verwenden den angeforderten Zielzustand und starten die Animation kontrolliert aus der aktuellen gemessenen Höhe neu.
- Im Papierkorb heißt das Datumsfeld jetzt kurz `Im Papierkorb`; Datum und Uhrzeit bleiben identisch.
- Die drei Schritt-Kacheln des Vorlagen-Neuinserierens nutzen die volle Dialogbreite als drei gleich große Spalten, sodass insbesondere Schritt 3 mehr Platz erhält.
- Die temporäre `UI_SIDEBAR_*`-Bottom-of-page-Diagnose bleibt bis zur erfolgreichen nativen Bottom-Clamp-Abnahme erhalten. Die erweiterte Actions-/UI-Stuck-Diagnose bleibt für die nächste Reproduktion aktiv.
- Alle Publish-, Account-, Renewal-, Delete-, ZIP- und sonstigen Safety-Gates bleiben unverändert.
<!-- KAR170-END:README:254 -->

## v1.21.14

<!-- KAR170-BEGIN:CHANGELOG:525 -->
### Original CHANGELOG: 1.21.14 – Verständlichere UI-Texte und konsistente Papierkorb-Aktionen (source line 525)

- Erfassung sprachlich neutralisiert: Haupteinstieg und Dialog heißen `Anzeigen erfassen`, Start-CTA `Erfassung starten`; die bewusste Umfangsunterscheidung `Nur neue Anzeigen erfassen` / `Gesamten Bestand neu einlesen` bleibt unverändert.
- Papierkorb-Texte beschreiben den lokalen Zustand eindeutig als `Im Papierkorb seit`; Einleitung stellt klar, dass Kleinanzeigen-Anzeigen unverändert bleiben und neue Anzeigen nicht automatisch veröffentlicht werden.
- Papierkorb-Kachel- und Listenansicht verwenden dieselbe Aktionsreihenfolge: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Endgültig löschen`. Aktionslogik und Safety-Semantik bleiben unverändert.
- Neu-Inserieren-, Massen-Neuinserieren-, Profil-, Leerzustands-, Such-, Online-Status-, Sortier- und Prüfmodus-Texte wurden für Endbenutzer vereinfacht; verschachtelte Erfassungsfortschritte heißen `Fortschritt X von 4`.
- Laufende Dialoge weisen sichtbar darauf hin, dass ein Vorgang beim Schließen des Fensters im Hintergrund weiterläuft. Vor dem Start heißt die sekundäre Aktion konsistent `Abbrechen`.
- Diagnoseaktion heißt `Diagnose zurücksetzen`; Download und Reset stehen untereinander, damit beide Beschriftungen vollständig lesbar bleiben.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.
<!-- KAR170-END:CHANGELOG:525 -->

<!-- KAR170-BEGIN:README:266 -->
### Historical README: Version 1.21.14: Verständlichere UI-Texte und konsistente Papierkorb-Aktionen (source line 266)

- Der zentrale Einstieg und der Erfassungsdialog heißen jetzt `Anzeigen erfassen`; der Startbutton heißt `Erfassung starten`. Die bestehende, bewusst klar getrennte Auswahl `Nur neue Anzeigen erfassen` / `Gesamten Bestand neu einlesen` bleibt erhalten.
- Papierkorb-Texte verwenden eindeutige lokale Begriffe wie `Im Papierkorb seit` und erklären, dass der Papierkorb nur lokal wirkt: die Anzeige bei Kleinanzeigen bleibt unverändert, und neue Anzeigen werden nicht automatisch veröffentlicht.
- Detail- und Listenansicht des Papierkorbs verwenden dieselbe Reihenfolge: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Endgültig löschen`. Es wurde nur die Darstellung/Reihenfolge vereinheitlicht; die vorhandenen Aktionen und Safety-Gates bleiben identisch.
- Der Neu-Inserieren-Flow, Massen-Neuinserieren, Profil-Sicherung, Leerzustände, Suche, Online-Status, Sortiertexte und Prüfmodus-Beschreibungen verwenden verständlichere Endnutzerbegriffe. Die zweite interne Erfassungszählung heißt nun `Fortschritt X von 4`.
- Laufende Workflow-Dialoge weisen sichtbar darauf hin, dass der Vorgang nach dem Schließen des Fensters im Hintergrund weiterläuft. Vor dem Start wird `Abbrechen` statt `Schließen` verwendet.
- In der Diagnose heißt die Reset-Aktion `Diagnose zurücksetzen`; Download und Reset sind untereinander angeordnet.
- `UI_SIDEBAR_*` bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten. Keine Remote-, Publish-, Delete-, Renewal-, Account- oder Workflow-Safety-Semantik wurde geändert.
<!-- KAR170-END:README:266 -->

## v1.21.13

<!-- KAR170-BEGIN:CHANGELOG:535 -->
### Original CHANGELOG: 1.21.13 – Papierkorb-Listenaktionen vervollständigt (source line 535)

- Papierkorb-Listenansicht ergänzt `30 Tage neu starten` und `Als ZIP exportieren` zwischen `Neu inserieren` und `Entfernen`.
- `30 Tage neu starten` nutzt das bestehende Update-Icon der Inventar-Aktualisierung; ZIP verwendet das bestehende `action-zip-export.svg`.
- Vorhandene Runtime-Funktionen, Bestätigungsdialoge, Statusmeldungen und Papierkorb-Diagnoseevents werden wiederverwendet; keine Remote-/Safety-Semantik geändert.
- `UI_SIDEBAR_*`-Bottom-Diagnose und ausführliche Actions-/UI-Stuck-Diagnose bleiben unverändert aktiv.
<!-- KAR170-END:CHANGELOG:535 -->

<!-- KAR170-BEGIN:README:276 -->
### Historical README: Version 1.21.13: Papierkorb-Listenaktionen vervollständigt (source line 276)

- In der Listenansicht des Papierkorbs stehen jetzt zusätzlich `30 Tage neu starten` und `Als ZIP exportieren` als kompakte Icon-Aktionen zur Verfügung.
- Reihenfolge der Papierkorb-Listenaktionen: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Entfernen`.
- `30 Tage neu starten` verwendet bewusst dasselbe Update-Symbol wie `Daten aktualisieren` in der Inventaransicht; der ZIP-Export verwendet das bestehende ZIP-/Archivsymbol.
- Beide Aktionen verwenden exakt die bereits vorhandene Papierkorb-Funktionalität (`RESET_TRASH_RETENTION` bzw. lokaler ZIP-Export) samt bestehender Bestätigung, Statusmeldungen und Diagnoseevents; keine Remote-/Safety-Semantik wurde geändert.
- `UI_SIDEBAR_*` bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten.
<!-- KAR170-END:README:276 -->

## v1.21.12

<!-- KAR170-BEGIN:CHANGELOG:542 -->
### Original CHANGELOG: 1.21.12 – Sidebar-Bottom-Clamp, Refresh-Feedback und Erfassungs-Badges (source line 542)

- Behebt den diagnostisch bestätigten Sidebar-Bottom-Clamp am Dokumentende durch einen gemeinsamen unteren Shell-Abstand (`--app-shell-bottom-gap`) und dynamische Control-Panel-Mindesthöhe aus Sticky-Top + Bottom-Gap.
- Globaler Refresh zeigt Busy-Rotation, Disabled-State und temporäres Success-Häkchen; Normal-Tooltip „Ansicht und Kontostatus aktualisieren“.
- Content-Überschriften Inventar/Papierkorb einzeilig mit inline Eintragszahl.
- Meldungsverlauf erhält 2 px untere Scrollreserve, damit die letzte Kartenborder dauerhaft sichtbar bleibt.
- „Geöffnete Anzeige erfassen“ kennzeichnet per frischem lokalen Profil-Snapshot sicher neue Kandidaten mit `NEU` und nur im Papierkorb vorhandene Kandidaten mit `PAPIERKORB`.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur Praxisbestätigung aktiv; Actions-Stuck-Diagnose und sämtliche Safety-Grenzen unverändert.
<!-- KAR170-END:CHANGELOG:542 -->

<!-- KAR170-BEGIN:README:284 -->
### Historical README: Version 1.21.12: Sidebar-Bottom-Clamp, Refresh-Feedback und Erfassungs-Badges (source line 284)

- Der Sidebar-Höhenvertrag verwendet jetzt denselben dynamischen Sticky-Geometrie-Contract wie die Listensteuerung. `--app-shell-bottom-gap: 28px` steuert sowohl das untere App-Shell-Padding als auch die Mindesthöhe des linken Control-Panels. Dadurch bleibt vor der Unterkante des Sticky-Containing-Blocks eine kleine Sicherheitsreserve und der diagnostizierte ca. 5–5,8-px-Sprung am exakten Seitenende soll entfallen. Die temporäre `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bestätigung aktiv.
- Der globale Aktualisieren-Button zeigt nun einen klaren Busy-/Success-Zustand: während des Refreshs rotiert das Symbol und der Button ist kurz deaktiviert; nach erfolgreichem Abschluss erscheint ca. 1,5 s ein Häkchen. Tooltip/ARIA heißen im Normalzustand „Ansicht und Kontostatus aktualisieren“ und während des Laufs „Wird aktualisiert …“. Kein künstliches UI-Flackern.
- Inventar- und Papierkorb-Bereichsüberschriften sind im normalen Desktoplayout einzeilig: `Gespeicherte Anzeigen · N Einträge` bzw. `Papierkorb · N Einträge`. Der Titel bleibt visuell führend, die Anzahl kleiner/gedeckter.
- Der Meldungsverlauf besitzt 2 px untere Innen-/Scrollreserve, damit die untere Border der letzten Kachel am maximalen Scrollstand nicht mehr an der Scrollport-Kante abgeschnitten wird.
- Im Dialog „Geöffnete Anzeige erfassen“ wird bei jedem Öffnen ein frischer, rein lokaler read-only Snapshot von aktivem Inventar und Papierkorb des ausgewählten Profils gelesen. Kandidaten mit stabiler `adId`, die in keinem der beiden lokalen Bereiche vorkommen, erhalten die Badge `NEU`; nur im Papierkorb vorhandene Anzeigen erhalten `PAPIERKORB`; bereits aktive oder unklare IDs werden nicht als neu markiert. Keine Remote-Navigation oder Inventaränderung.
- Die temporär ausführliche Actions-/UI-Stuck-Diagnose bleibt aktiv; Account-, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Grenzen bleiben unverändert.
<!-- KAR170-END:README:284 -->

## v1.21.11

<!-- KAR170-BEGIN:CHANGELOG:551 -->
### Original CHANGELOG: 1.21.11 – Globale Ansichtsauswahl und Sidebar-Ende-Diagnose (source line 551)

- Globaler gemeinsamer View-Modus für Inventar und Papierkorb im App-Header; Content-Umschalter entfernt.
- Header-3er-Set `Kachelansicht | Listenansicht | Aktualisieren`; Inventar-Tab erhält Anzahl-Badge.
- Migration von `inventoryListViewModeV1`/`trashListViewModeV1` auf `globalListViewModeV1`, danach Entfernung der Altkeys.
- Globaler Live-Kontostatus weitere 3 px nach oben verschoben.
- Temporäre `UI_SIDEBAR_*`-Diagnose für den Restfehler am Dokumentende, detailliert nur in der letzten 250-px-Zone; allgemeine `UI_STICKY_*`-Diagnose bleibt entfernt.
- Actions-/UI-Stuck-Diagnose und sämtliche Safety-Grenzen unverändert.
<!-- KAR170-END:CHANGELOG:551 -->

<!-- KAR170-BEGIN:README:293 -->
### Historical README: Version 1.21.11: globale Ansichtsauswahl und Sidebar-Ende-Diagnose (source line 293)

- Eine gemeinsame Ansichtsauswahl für Inventar und Papierkorb sitzt jetzt global im App-Header als 3er-Set `Kachelansicht | Listenansicht | Aktualisieren`. Die bisherigen Content-internen Umschalter entfallen.
- Der View-Modus wird unter `globalListViewModeV1` gemeinsam persistiert. Bestehende getrennte Inventar-/Papierkorb-Zustände werden einmalig migriert; bei widersprüchlichen Altwerten hat der bisherige Inventarzustand Vorrang, weil Inventar die Startansicht ist. Die Altkeys werden danach entfernt.
- Der Inventar-Tab besitzt nun wie der Papierkorb eine Anzahl-Badge mit dem aktuellen aktiven Inventarbestand.
- Der globale Kleinanzeigen-Kontostatus wurde gegenüber v1.21.10 um weitere 3 px nach oben verschoben.
- Für den noch offenen leichten Sprung des linken Inventarprofilbereichs exakt am Dokumentende wurde eine temporäre, auf die letzten 250 px fokussierte Diagnose ergänzt (`UI_SIDEBAR_*`). Sie protokolliert Scroll-/Dokument-/Viewport-/Sidebar-Geometrie, Sticky-Zustand und Vorher-/Nachher-Snapshots beim Erreichen des Seitenendes. Außerhalb der Bottom-Zone wird nur sparsam gesampelt.
- Die alte breite `UI_STICKY_*`-Diagnose bleibt entfernt; die erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv.
- Workflow-, Renewal-, Publish-, Delete-, Account- und sonstige Safety-Semantik bleibt unverändert.
<!-- KAR170-END:README:293 -->

## v1.21.10

<!-- KAR170-BEGIN:CHANGELOG:560 -->
### Original CHANGELOG: 1.21.10 – UI-Feinschliff und ZIP-Aktionskonsistenz (source line 560)

- Globaler Kleinanzeigen-Kontostatus höher und breiter nutzbar im App-Header; vollständige Kontoadresse wird nicht mehr unnötig durch eine enge Ellipsis-Grenze abgeschnitten.
- Inventarprofil-Select typografisch leicht verdichtet, ohne separate Narrow-Schrift.
- Sidebar-Control-Panel verwendet denselben dynamisch gemessenen Sticky-Zielpunkt wie die Listenheader und vermeidet den in der Papierkorb-Kompaktansicht beobachteten ca. 6-px-Y-Sprung.
- „Als ZIP exportieren“ ist in Inventar-Detailkarten wieder eine echte rechte Aktion zwischen Aktualisieren/Online-Status und Papierkorb; veraltete absolute Footer-CSS-Positionierung ist neutralisiert.
- Inventar-Kompaktansicht besitzt ein eigenes ZIP-/Archivexport-Icon an derselben logischen Aktionsposition.
- Meldungs-Dock in der Sidebar unter „Diagnose“ verschoben; Meldungsfunktionalität unverändert.
- Actions-/UI-Stuck-Diagnose bleibt aktiv, Sticky-/Wheel-Tracing bleibt entfernt.
- Keine Änderung an Remote-/Workflow-/Safety-Semantik.
<!-- KAR170-END:CHANGELOG:560 -->

<!-- KAR170-BEGIN:README:303 -->
### Historical README: Version 1.21.10: UI-Feinschliff und ZIP-Aktionskonsistenz (source line 303)

- Globaler Kleinanzeigen-Kontostatus im App-Header höher und mit gelockerter Breitenbegrenzung platziert; die Adresse bleibt rechtsbündig und kann den verfügbaren Headerraum weiter nach links nutzen.
- Inventarprofil-Select typografisch leicht verdichtet (10 px, dezentes engeres Letter-Spacing), ohne eine fremde Narrow-Schrift einzuführen.
- Linke Sidebar nutzt für ihre Sticky-Y-Position denselben dynamisch gemessenen App-Header-Unterkanten-/Shell-Gap-Contract wie die Listenheader; der in der Papierkorb-Kompaktansicht beobachtete ca. 6-px-Sprung soll damit entfallen.
- Inventar-Detailkarten zeigen „Als ZIP exportieren“ wieder als echte rechte Aktion zwischen „Daten aktualisieren“/„Online Status prüfen“ und „In Papierkorb“. Alte absolute Footer-Positionierungsreste werden neutralisiert.
- Inventar-Kompaktansicht erhält ein eigenes ZIP-/Archiv-Icon als Aktion an derselben logischen Position. ZIP-Export bleibt lokal und fachlich unverändert.
- Sidebar-Reihenfolge nach Aktionen: Konfiguration → Diagnose → Meldungen. Die Meldungs-Dock-Semantik selbst bleibt unverändert.
- Temporär erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv; Sticky-/Wheel-Diagnose bleibt entfernt.
- Keine Änderung an Account-, Renewal-, Publish-, Delete-, ZIP- oder sonstiger Remote-/Safety-Semantik.
<!-- KAR170-END:README:303 -->

## v1.21.9

<!-- KAR170-BEGIN:CHANGELOG:571 -->
### Original CHANGELOG: 1.21.9 – UI-Konsolidierung und Sticky-Diagnose-Rückbau (source line 571)

- Globaler Live-Kontostatus oben rechts über der Inventar-/Papierkorb-Navigation: `Kleinanzeigen-Konto: <E-Mail-Adresse>`; der Status ist damit als globale Session-Information klar vom lokalen Inventarprofil getrennt.
- Inventarprofil-Block beruhigt: klarere Abschnittsüberschrift, Profil-Combobox mit `… · <n> Anzeigen`, kompakter Zahnrad-Button „Inventarprofile verwalten“ direkt rechts daneben sowie systematisierte Abstände.
- Select-/Combobox-Chevrons werden kontrolliert mit symmetrischer rechter Innenpolsterung dargestellt.
- Detailkarten: Aktionsbuttons kompakter; Inventar zeigt `Neu inserieren`, `Daten aktualisieren`/`Online Status prüfen`, `Als ZIP exportieren`, `In Papierkorb` im rechten Aktionsstapel. Der ZIP-Export entfällt im Kartenfuß. Papierkorb-Aktionen verwenden dieselbe kompakte Höhe.
- Gespeicherte Detailbilder in Inventar und Papierkorb sind anklickbar und öffnen – sofern eine lokale vollständige Bildquelle verfügbar ist – sicher in einem neuen Tab.
- Sidebar erhält einen dauerhaft sichtbaren Meldungs-Dock mit einer priorisierten aktiven Meldung und „Weitere Meldungen anzeigen“ samt Badge. Manuell geschlossene Meldungen bleiben bei unverändertem Inhalt geschlossen und öffnen erst bei echter Inhaltsänderung erneut.
- Die nach erfolgreicher v1.21.8-Praxisabnahme nicht mehr benötigte temporäre Sticky-/Wheel-Diagnose (`UI_STICKY_*`) wird entfernt; Sticky-, Occlusion-, Fixed-Slot- und Wheel-Funktionalität bleibt unverändert.
- Die temporär erweiterte Actions-/UI-Stuck-Diagnose und der defensive Read-only Actions-Re-Sync bleiben aktiv, bis der Actions-Stuck-Bug ursächlich abgeschlossen ist.
- Keine Änderung an Account-, Renewal-, Publish-, Delete-, ZIP- oder sonstiger Remote-/Safety-Semantik.
<!-- KAR170-END:CHANGELOG:571 -->

<!-- KAR170-BEGIN:README:314 -->
### Historical README: Version 1.21.9: UI-Konsolidierung und Sticky-Diagnose-Rückbau (source line 314)

- Der aktuell live erkannte Kleinanzeigen-Account wird als globale Session-Information oben rechts über der Inventar-/Papierkorb-Navigation angezeigt: `Kleinanzeigen-Konto: <E-Mail-Adresse>`. Der lokale Inventarprofil-Block enthält nur noch Profilauswahl und Verwaltung.
- Der Inventarprofil-Block nutzt eine klarere Abschnittsüberschrift, `… · <n> Anzeigen`, einen kompakten Zahnrad-Button direkt rechts neben der Combobox und systematisierte Abstände. Selects verwenden einen kontrollierten Chevron mit symmetrischer Innenpolsterung.
- In der Detailansicht sind die rechten Kartenaktionen kompakter. Im normalen Inventar stehen `Neu inserieren`, `Daten aktualisieren`, `Als ZIP exportieren` und `In Papierkorb` gemeinsam im rechten Stapel; der Kartenfuß enthält nur noch Details sowie Gespeichert/ID. Papierkorb-Aktionen verwenden dieselbe kompakte Höhe.
- Bilder im Bereich „Gespeicherte Daten anzeigen“ sind in Inventar und Papierkorb anklickbar. Ist die gespeicherte lokale Vollbildquelle verfügbar, öffnet sie sich sicher in einem neuen Tab; Reihenfolge, Titelbildkennzeichnung und Metadaten bleiben unverändert.
- Die Sidebar besitzt einen dauerhaft sichtbaren Meldungs-Dock mit genau einer priorisierten aktiven Meldung und „Weitere Meldungen anzeigen“ inklusive Badge. Eine manuell geschlossene Meldung bleibt geschlossen, solange ihr fachlicher Inhalt unverändert ist; echte Inhaltsänderungen dürfen sie erneut öffnen.
- Nach erfolgreicher nativer Sticky-/Scroll-Praxisabnahme von v1.21.8 wird die temporäre `UI_STICKY_*`-Wheel-/Geometrie-Diagnose zurückgebaut. Die funktionalen Sticky-, Occlusion-, Fixed-Slot- und Wheel-Fixes bleiben unverändert.
- Die temporär erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv; der exakte Root Trigger des seltenen Actions-Stuck-Falls ist noch nicht abschließend bewiesen.
- Account-/Profilbindung, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Gates bleiben unverändert.
<!-- KAR170-END:README:314 -->

## v1.21.8

<!-- KAR170-BEGIN:CHANGELOG:583 -->
### Original CHANGELOG: 1.21.8 – Sticky-Occlusion und Actions-State-Diagnose (source line 583)

- Inventar/Papierkorb: fixed Occlusion-Maske deckt beim angehefteten Header exakt den Spalt zwischen globalem App-Header und Listenheader ab; Karteninhalte können dort nicht mehr sichtbar hindurchscrollen.
- Occlusion verwendet denselben `--app-canvas-background`, ist `pointer-events:none` und übernimmt X/Width/Height dynamisch aus der bestehenden Sticky-Geometrie.
- Temporär stark erweiterte Actions-Diagnose mit State-Snapshots, Klickversuchen auch bei nativen `disabled`-Buttons, Hit-Target/Overlay-Daten, Desync-Erkennung, Background-Epoch-Korrelation und Re-Sync-Events.
- Idempotenter Read-only Actions-Re-Sync auf Focus, Visibility-Rückkehr und Background-Reconnect; keine automatische Remote-Aktion und keine Abschwächung bestehender Safety-Gates.
- Die erhöhte Actions-Diagnose soll nach erfolgreicher Praxisabnahme wieder reduziert/aggregiert werden.
<!-- KAR170-END:CHANGELOG:583 -->

<!-- KAR170-BEGIN:README:325 -->
### Historical README: Version 1.21.8: Sticky-Occlusion und Actions-State-Diagnose (source line 325)


<!-- KAR170-END:README:325 -->

<!-- KAR170-BEGIN:README:327 -->
### Historical README: v1.21.8 – Sticky-Occlusion und Actions-State-Diagnose (source line 327)

- Inventar und Papierkorb besitzen beim angehefteten Listenheader eine nicht-interaktive Occlusion-Maske zwischen App-Header-Unterkante und Sticky-Zielposition. Sie verwendet exakt denselben viewport-verankerten `--app-canvas-background`, liegt über scrollenden Karten und unter dem Listenheader und verhindert dadurch sichtbares Hindurchscrollen oberhalb des Headers.
- Breite, X-Position und Höhe der Maske werden aus derselben gemessenen Sticky-Geometrie wie der Header abgeleitet; es wird kein zusätzlicher 20-px-Wert hartcodiert. Die v1.21.7-Y-Position und der v1.21.6-Wheel-Fix bleiben unverändert.
- Die Actions-/UI-Stuck-Diagnose ist temporär erweitert: `UI_ACTIONS_STATE_SNAPSHOT`, `UI_ACTION_ATTEMPT`, `UI_ACTION_STATE_DESYNC_DETECTED`, `UI_ACTIONS_RESYNC_STARTED`, `UI_ACTIONS_RESYNC_COMPLETED`, `UI_ACTIONS_RESYNC_FAILED` sowie Background-Epoch-Korrelation.
- Klickversuche auf native deaktivierte Sidebar-Aktionen werden über diagnostische Wrapper erfasst, inklusive Disable-Grund, Button-/Hit-Target-Geometrie, `elementFromPoint`, `pointer-events`, Sichtbarkeit, Account-Gate, Profilbindung, Busy-/Lock-Zustand und Zeit seit letztem erfolgreichen Actions-State-Sync. Die Wrapper lösen selbst keine Aktion aus und umgehen kein Safety-Gate.
- Auf App-Focus, Rückkehr zu sichtbarer Seite und erkanntem Background-Epoch-Wechsel erfolgt ein idempotenter Read-only Actions-Re-Sync aus Profil-, Account-, Insertion-Lock-, Bulk- und Mass-Status. Es wird keine Remote-Aktion automatisch gestartet.
- Die erhöhte Actions-Diagnose ist ausdrücklich temporär und soll nach erfolgreicher Praxisabnahme wieder reduziert bzw. aggregiert werden. Workflow-, Publish-, Renewal-, Delete-, ZIP- und sonstige Safety-Semantik bleibt unverändert.
<!-- KAR170-END:README:327 -->

## v1.21.7

<!-- KAR170-BEGIN:CHANGELOG:591 -->
### Original CHANGELOG: 1.21.7 – Sticky-Zielposition und Geometriestabilisierung (source line 591)

- Pin-Schwelle und fixed Header-Position verwenden jetzt dieselbe dynamisch gemessene Zielposition aus App-Header-Unterkante plus `--app-shell-top-gap`.
- `--list-sticky-top` verbindet die JS-Messung direkt mit CSS; der Header bleibt beim Scrollen an seiner natürlichen Y-Position.
- `display: flow-root` stabilisiert die Header-Box zwischen normalem und fixed Zustand und verhindert den zuvor diagnostizierten 12-px-Höhen-/ScrollHeight-Shift durch Margin-Collapse.
- v1.21.6-Wheel-/Background-Hardening und die temporär erweiterte Sticky-Diagnose bleiben unverändert.
- Keine Änderung an Workflow-/Remote-/Safety-Semantik.
<!-- KAR170-END:CHANGELOG:591 -->

<!-- KAR170-BEGIN:README:336 -->
### Historical README: Version 1.21.7: Sticky-Zielposition und Geometriestabilisierung (source line 336)


<!-- KAR170-END:README:336 -->

<!-- KAR170-BEGIN:README:338 -->
### Historical README: v1.21.7 – Sticky-Zielposition und Geometriestabilisierung (source line 338)

- Inventar und Papierkorb verwenden für Pin-Schwelle und fixed `top` dieselbe dynamisch gemessene Zielposition: Unterkante des globalen App-Headers plus `--app-shell-top-gap`. Dadurch bleibt der Listenheader beim Scrollen exakt an seiner natürlichen Y-Position und fährt nicht mehr um ca. 20 px nach oben.
- Die Zielposition wird als `--list-sticky-top` an CSS und JavaScript gemeinsam weitergegeben; separate Hardcodierungen entfallen.
- `.list-sticky-header` erzeugt mit `display: flow-root` einen stabilen Block Formatting Context. Dadurch ändert sich die unbeabsichtigte Headerhöhe beim Wechsel relative ↔ fixed nicht mehr und die Dokumentgeometrie bleibt stabil.
- Die v1.21.6-Slot-/Wheel-/Background-Härtung und die temporär erweiterte `UI_STICKY_*`-Diagnose bleiben unverändert erhalten.
- Workflow-, Account-, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Logik bleibt unverändert.
<!-- KAR170-END:README:338 -->

## v1.21.6

<!-- KAR170-BEGIN:CHANGELOG:599 -->
### Original CHANGELOG: 1.21.6 – Sticky-Slot- und Diagnose-Hardening (source line 599)

- Sticky-/Wheel-Scroll-Härtung: stabiler Header-Slot hält die natürliche Dokumenthöhe konstant; der sichtbare angeheftete Header ist ein separater fixed/elevated Layer. Keine dynamische Flow-Spacer-Höhenänderung mehr im Wheel-Pfad.
- `overflow-anchor: none` auf Slot/Header zur zusätzlichen Absicherung gegen Browser-Scroll-Anchoring.
- Gemeinsamer viewport-verankerter `--app-canvas-background` für Body und fixed Sticky-Layer; die v1.21.5-Hintergrundnachbildung entfällt.
- Papierkorb-Amber-Hinweis bleibt im normalen Flow vollständig; nur der sichtbare pinned Layer zeigt die kompakte Einzeile.
- Temporär erweiterte Diagnoseevents `UI_STICKY_PINNED`, `UI_STICKY_UNPINNED`, `UI_STICKY_GEOMETRY_SAMPLE`, `UI_STICKY_WHEEL_SAMPLE`, `UI_STICKY_OSCILLATION_DETECTED` mit detaillierten Scroll-/Geometriefeldern. Diagnosevolumen soll nach Praxisabnahme wieder reduziert werden.
- Keine Änderung an Renewal-/Publish-/Delete-/Account-/ZIP-/Profil-Safety.
<!-- KAR170-END:CHANGELOG:599 -->

<!-- KAR170-BEGIN:README:346 -->
### Historical README: Version 1.21.6: Sticky-Slot- und Diagnose-Hardening (source line 346)


<!-- KAR170-END:README:346 -->

<!-- KAR170-BEGIN:README:348 -->
### Historical README: v1.21.6 – Sticky-Slot- und Diagnose-Hardening (source line 348)

- Inventar und Papierkorb verwenden einen geometrisch stabilen Header-Slot. Beim Pinning bleibt die Dokumenthöhe unverändert; der sichtbare Header wird als fixed/elevated Layer über dem Slot dargestellt.
- Dynamische Flow-Spacer-Anpassungen im Wheel-Scroll-Pfad entfallen. `overflow-anchor: none` schützt Slot und Header zusätzlich gegen Browser-Scroll-Anchoring.
- Body/App-Canvas und angehefteter Header verwenden exakt denselben viewport-verankerten `--app-canvas-background`-Contract, damit beim Pinning kein nahezu schwarzer Rechteck-Hintergrund mehr erscheint.
- Der Papierkorb darf im sichtbaren fixed Layer weiterhin auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ kondensieren, während der Slot die volle natürliche Höhe hält.
- Temporär stark erweiterte Scroll-/Sticky-Diagnose: Pin/Unpin, Geometrie-Samples, gedrosselte Wheel-Samples und Oszillationserkennung mit Sentinel-, Slot-, Header-, Scroll- und `overflow-anchor`-Werten. Diese Datenmenge ist ausdrücklich nur für die aktuelle Fehleranalyse vorgesehen und soll nach erfolgreicher Praxisabnahme wieder reduziert werden.
- Renewal-, Publish-, Delete-, Account-, ZIP- und sonstige Workflow-Safety bleibt unverändert.
<!-- KAR170-END:README:348 -->

## v1.21.5

<!-- KAR170-BEGIN:CHANGELOG:608 -->
### Original CHANGELOG: 1.21.5 – Sticky-Scroll-Hardening (source line 608)

- Behebt den Papierkorb-Wheel-Scroll-Feedback-Loop durch unabhängigen Sentinel statt Self-Measurement des sticky Headers.
- Verschiebt die Höhenkompensation hinter den Sticky-Header, sodass der Pin-Anker unverändert bleibt.
- Entfernt die flache schwarze Sticky-Fläche und integriert den angehefteten Header wieder in den bestehenden dunklen Grünverlauf; nur eine dezente untere Elevation bleibt sichtbar.
- Der Amber-Hinweis kondensiert weiterhin ausschließlich im angehefteten Zustand und expandiert beim Zurückscrollen wieder vollständig.
- Keine Änderung an Workflow-/Remote-/Safety-Logik.
<!-- KAR170-END:CHANGELOG:608 -->

<!-- KAR170-BEGIN:README:357 -->
### Historical README: Version 1.21.5: Sticky-Scroll-Hardening (source line 357)

- Sticky-Pin/Unpin wird nicht mehr aus der bereits veränderten Header-Geometrie abgeleitet, sondern aus einem unabhängigen Sentinel vor dem Header. Damit kann das Kondensieren des Papierkorb-Hinweises keinen Scroll-Feedback-Loop mehr erzeugen.
- Der Höhenausgleich für den kompakten Papierkorb-Hinweis liegt hinter dem Sticky-Header und hält die Kartenposition stabil, ohne den Sticky-Anker zu verschieben.
- Der angeheftete Header verwendet keinen flachen schwarzen Block mehr. Stattdessen wird ein viewport-verankerter Hintergrund im bestehenden dunklen Grünverlauf verwendet; sichtbar bleibt nur eine sehr dezente untere Elevation.
- Der vollständige Amber-Hinweis bleibt in natürlicher Position erhalten und wird nur im tatsächlich angehefteten Zustand auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ reduziert.
- Interaction-Hardening und alle Workflow-/Remote-/Safety-Gates bleiben unverändert.
<!-- KAR170-END:README:357 -->

## v1.21.4

<!-- KAR170-BEGIN:CHANGELOG:616 -->
### Original CHANGELOG: 1.21.4 – Sticky-Gold-Line (source line 616)

- Stellt die natürliche Listensteuerungs-Optik von vor v1.21.3 wieder her; Sticky-Elevation wird nur im angehefteten Zustand aktiv.
- Papierkorb-Hinweis wird ausschließlich im angehefteten Zustand auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ kondensiert.
- Höhenkompensation verhindert einen sichtbaren Listen-Sprung beim Umschalten zwischen vollem und kompaktem Papierkorb-Hinweis.
- Keine Änderung an Workflow-/Remote-/Safety-Logik.
<!-- KAR170-END:CHANGELOG:616 -->

<!-- KAR170-BEGIN:README:365 -->
### Historical README: Version 1.21.4: Sticky-Gold-Line (source line 365)

- Die Listensteuerung sieht in ihrer natürlichen Position wieder exakt wie vor dem Sticky-Umbau aus; Hintergrund/Schatten werden erst im tatsächlich angehefteten Zustand zugeschaltet.
- Inventar und Papierkorb bleiben sticky unter dem globalen App-Header und erhalten dort nur einen dezenten Elevated-Effekt ohne zusätzliche Geometrie.
- Der vollständige Papierkorb-Hinweis bleibt in der natürlichen Position unverändert; im angehefteten Zustand wird er zu „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ verkürzt.
- Ein Flow-Ausgleich kompensiert die Höhenänderung des Papierkorb-Hinweises, damit die Liste beim Anheften nicht sichtbar springt.
- Keine Änderungen an Renewal-, Publish-, Delete-, ZIP-, Account- oder Safety-Semantik.
<!-- KAR170-END:README:365 -->

## v1.21.3

<!-- KAR170-BEGIN:CHANGELOG:623 -->
### Original CHANGELOG: 1.21.3 – Sticky Listensteuerung, Papierkorb-Aufbewahrung und Interaction-Hardening (source line 623)

- Inventar/Papierkorb: kompletter Listen-Steuerungsblock sticky unter dem globalen Header; Papierkorb inklusive amberfarbenem Aufbewahrungshinweis.
- Ansichtsumschalter: Tooltips/Accessible Labels heißen jetzt „Detailansicht“ und „Kompakte Ansicht“.
- Kompakte Ansicht: Preis- und Zeitmetadaten nutzen eine feste erste Spalte; die Zeitinformation beginnt dadurch über alle Karten hinweg an derselben X-Position.
- Papierkorb: statt des Kleinanzeigen-Enddatums wird die lokale 30-Tage-Aufbewahrung als „Im Papierkorb bis <Datum> (noch N Tage)“ priorisiert.
- Interaction-Hardening: transiente Kontoprüfungen führen nicht mehr zu unnötigem Re-Render der Kartenaktionen, solange die effektive Account-/Profilfreigabe unverändert bleibt; echte Gate-Wechsel bleiben fail-closed.
- Diagnose: Kartenaktionen protokollieren Pointerdown/Click, disabled-State, Gate-Kind sowie Profilbindung.
- Keine Änderung an Publish-, Renewal-, Phase-4-Delete-, ZIP- oder Remote-Safety-Logik.
<!-- KAR170-END:CHANGELOG:623 -->

<!-- KAR170-BEGIN:README:374 -->
### Historical README: Version 1.21.3: Sticky Listensteuerung, Papierkorb-Aufbewahrung und Interaction-Hardening (source line 374)

- Inventar und Papierkorb besitzen einen sticky Bereichs-Header unterhalb des globalen App-Headers. Im Papierkorb gehört der amberfarbene 30-Tage-Hinweis zum sticky Bereich.
- Die Ansichtsumschaltung verwendet die Endnutzerbegriffe „Detailansicht“ und „Kompakte Ansicht“.
- In der kompakten Ansicht beginnt die rechte Zeitspalte über alle Karten hinweg an einer stabilen Position. Im Inventar zeigt sie weiterhin „Endet am“, im Papierkorb stattdessen „Im Papierkorb bis … (noch N Tage)“.
- Transiente Account-Rechecks ersetzen vorhandene Karten-/Action-DOMs nicht mehr, solange sich die effektive Profilbindung und Aktionsfreigabe nicht ändert. Safety-relevante Gate-Wechsel sperren weiterhin sofort.
- Pointerdown/Click auf Kartenaktionen werden strukturiert diagnostiziert, damit verlorene Interaktionen, disabled UI und Gate-Ablehnungen künftig unterscheidbar sind.
- Workflow-, Publish-, Renewal-, Delete-, ZIP- und Account-Safety-Semantik bleibt unverändert.
<!-- KAR170-END:README:374 -->

## v1.21.2

<!-- KAR170-BEGIN:CHANGELOG:633 -->
### Original CHANGELOG: 1.21.2 – Verdichtete Schmalansicht und neue View-/Inserieren-Icons (source line 633)

- Schmale Listenansicht auf drei Informationszeilen verdichtet: letzte Kategorieebene oben, Titel mittig, Preis und Enddatum gemeinsam in einer zweigeteilten unteren Zeile.
- Titelbildgröße und rechtsbündige Hauptaktionen unverändert.
- Textschalter „Kachel mit Details“/„Schmal“ durch zugängliche SVG-View-Icons ersetzt.
- „Neu inserieren“-Icon als Tag/Inserieren-Symbol mit Spark-Stern statt Plus neu gezeichnet.
- Keine Änderung an Workflow-, Publish-, Renewal-, Delete- oder Safety-Logik.
- Handover-Regel ergänzt: Bei Builds spätestens alle fünf Minuten oder nach Meilensteinen Fortschritt melden.
<!-- KAR170-END:CHANGELOG:633 -->

<!-- KAR170-BEGIN:README:384 -->
### Historical README: Version 1.21.2: Verdichtete Schmalansicht und Icon-Umschalter (source line 384)

- Schmale Inventar-/Papierkorbzeilen verwenden jetzt eine feste Drei-Zeilen-Hierarchie: Kategorie, Titel, danach Preis und Enddatum in einer zweigeteilten Metazeile.
- Titelbildgröße und rechtsbündige Hauptaktionen bleiben unverändert.
- Die Ansichtswahl ist icon-only mit zugänglichen Tooltips/ARIA-Labels; neue SVG-Icons unterscheiden Detailkarten und schmale Liste.
- Das Icon „Neu inserieren“ orientiert sich stärker am Kleinanzeigen-Inserieren-Symbol und verwendet einen Spark/Stern als Neu-Akzent statt eines Pluszeichens.
- Workflow-, Account-, Renewal-, Delete- und Safety-Logik bleiben unverändert.
- Build-Regel: Während künftiger Builds spätestens alle fünf Minuten oder nach sinnvollen Meilensteinen Fortschritt melden; diese Regel wird in Handovers fortgeführt.
<!-- KAR170-END:README:384 -->

## v1.21.1

<!-- KAR170-BEGIN:CHANGELOG:642 -->
### Original CHANGELOG: 1.21.1 – Endnutzerfreundliche Meldungs-Gold-Line (source line 642)

- Zentrale Meldungsdarstellung um strukturierte Faktenzeilen und semantische Badge-Bezeichnungen erweitert; `waiting` bedeutet nicht mehr automatisch „Prüfung erforderlich“.
- Bestandserfassung unterscheidet erfolgreiche Abschlüsse, Count-Mismatch, teilweise Erfassung, Bestandsabgleich, kontrollierten Stopp und technische Unterbrechung mit jeweils eigener kurzer Nutzerbotschaft.
- Count-Mismatch ohne Einzelfehler: **Erfassung abgeschlossen – Anzahl prüfen** mit gefunden/neu/vorhanden/Fehler-Fakten und separat angezeigter Kleinanzeigen-Sollzahl.
- `Bald Online`/Online-Status, Einzel-/Mehrfach-Renewal, ZIP-Inserierung, Profiltransfer und Account-Gates auf die kurze Gold-Line vereinheitlicht. Sicherheitsrelevante Renewal-Fälle benennen weiterhin ausdrücklich, dass die alte Anzeige nicht entfernt wurde.
- Normale Kacheln geben keine rohen `Error.message`, `lastError`, Stacktraces, Diagnose-Eventnamen oder internen Status-/Reason-Werte aus. Diagnoseprotokollierung bleibt vollständig erhalten.
- Kontrolliert geschlossene Workflow-Tabs bleiben still; echte Lifecycle-/Timeoutfehler werden endanwenderfreundlich übersetzt.
- Bilder bleiben optional; die Meldungslogik führt fehlende Bilder nicht pauschal als ZIP-/Vollständigkeitsfehler an.
- Keine Änderung an Publish-, Edit-Verifikations-, Phase-4-Delete-, Account-Binding- oder sonstigen Safety-Gates.
<!-- KAR170-END:CHANGELOG:642 -->

<!-- KAR170-BEGIN:README:394 -->
### Historical README: Version 1.21.1: Meldungs-Gold-Line (source line 394)

- Meldungskacheln folgen jetzt einer einheitlichen Endnutzerstruktur: kurzer Titel, optionale Faktenzeile mit `·`, höchstens ein kurzer Erklärungssatz und nur bei Bedarf eine Aktion.
- Farbe und Bedeutung sind getrennt: Gelb kann einen Hinweis, **Bald Online** oder echten Prüfbedarf bedeuten und wird im Meldungsverlauf nicht mehr pauschal als „Prüfung erforderlich“ beschriftet.
- Der reine Count-Mismatch der Bestandserfassung besitzt eine eigene Gold-Line. Beispiel: **Erfassung abgeschlossen – Anzahl prüfen** mit `67 gefunden · 2 neu · 65 vorhanden · 0 Fehler` und dem Hinweis `Kleinanzeigen meldet 66 laufende Anzeigen.`
- Erfassungs-, Online-Status-, Renewal-, Mehrfach-Renewal-, ZIP-, Profil- und Konto-Meldungen verwenden kurze, konsistente Nutzertexte. Sicherheitsrelevante Fälle nennen weiterhin ausdrücklich, wenn die alte Anzeige nicht entfernt oder ein Austausch nicht abgeschlossen wurde.
- Normale Meldungskacheln geben keine rohen `Error.message`-/`lastError`-Texte, Diagnose-Eventnamen, Stacktraces oder internen `status`/`reason`-Werte aus. Technische Details bleiben in der Diagnose.
- Kontrolliert geschlossene Workflow-Tabs erzeugen keine Warnkachel; echte Verbindungs-/Timeoutfälle werden als **Seite konnte nicht gelesen werden**, **Vorgang unterbrochen** bzw. **Kleinanzeigen antwortet nicht** übersetzt.
- Bilder bleiben optional: ZIP-/Vollständigkeitsmeldungen behaupten nicht pauschal, dass fehlende Bilder einen unvollständigen Datensatz bedeuten.
- Workflow-, Publish-, Edit-Vergleich-, Phase-4-Delete-, Account-Binding- und sonstige Safety-Gates bleiben fachlich unverändert.
<!-- KAR170-END:README:394 -->

## v1.21.0

<!-- KAR170-BEGIN:CHANGELOG:653 -->
### Original CHANGELOG: 1.21.0 – Detail-/Schmalansichten und Meldungsverlauf leeren (source line 653)

- Inventar und Papierkorb besitzen jeweils unabhängig persistierbare Darstellungsarten **Kachel mit Details** (Default) und **Schmal**.
- Die schmale Ansicht zeigt nur Bild, Titel, letzte Kategorieebene, Preis, Enddatum und Hauptaktionen. Detailbereich und ZIP-Export bleiben ausschließlich in der Detailansicht verfügbar.
- Hauptaktionen werden in der schmalen Ansicht als hochauflösende SVG-Icons dargestellt. Neu sind Icons für **Neu inserieren**, **Daten aktualisieren**, **Löschen/Entfernen** und **Erneut prüfen**; für den seltenen Zustand **Austausch abschließen** existiert zusätzlich ein eigenes Vektor-Icon.
- Im Inventar bedeutet das Löschen-Icon ausschließlich **In Papierkorb**; im Papierkorb ausschließlich **Entfernen** aus der lokalen Verwaltung. Keine dieser Aktionen löscht eine Anzeige bei Kleinanzeigen.
- Bestehende Gates bleiben erhalten, insbesondere `Bald Online`, Account-/Profilbindung und Workflow-Locks. `Online Status prüfen` verwendet in der schmalen Ansicht das Prüf-/Retry-Icon.
- Im Dialog **Meldungsverlauf** steht unten links **Alles löschen** mit Mülleimer-Icon. Nach gestaltetem Bestätigungsdialog werden ausschließlich Verlaufseinträge geleert; Diagnose, Inventar, Papierkorb und Workflowdaten bleiben unverändert. Der Meldungszähler wird auf 0 zurückgesetzt/ausgeblendet.
- Keine Änderung an Renewal-, Publish-, Phase-4-Delete- oder Remote-Safety-Logik.
<!-- KAR170-END:CHANGELOG:653 -->

<!-- KAR170-BEGIN:README:406 -->
### Historical README: Version 1.21.0: Detail-/Schmalansichten und Meldungsverlauf leeren (source line 406)

- **Inventar** und **Papierkorb** können unabhängig zwischen **Kachel mit Details** und **Schmal** umgeschaltet werden; beide Einstellungen werden getrennt gespeichert. Default bleibt die bisherige Detailansicht.
- **Schmal** zeigt Bild, Titel, letzte Kategorieebene, Preis, Enddatum und nur die Hauptaktionen als Vektor-Icons. ZIP-Export und ausklappbare Detaildaten bleiben der Detailansicht vorbehalten.
- Das Löschen-Icon ist rein lokal: im Inventar **In Papierkorb**, im Papierkorb **Entfernen**. Auf Kleinanzeigen wird dadurch nichts gelöscht.
- Bestehende Zustände/Gates wie **Bald Online**, **Online Status prüfen**, Retry- und Account-/Profil-Sperren bleiben fachlich unverändert.
- Der **Meldungsverlauf** besitzt unten links **Alles löschen**. Nach bestätigtem, gestaltetem Dialog werden nur Verlaufseinträge gelöscht; Diagnose-, Inventar-, Papierkorb- und Workflowdaten bleiben erhalten.
<!-- KAR170-END:README:406 -->

## v1.20.22

<!-- KAR170-BEGIN:CHANGELOG:664 -->
### Original CHANGELOG: 1.20.22 – Optionale 0-Bilder-Anzeigen (source line 664)

- Fix: Anzeigen ohne Bilder werden im Bearbeiten-Modus nicht mehr allein wegen `images.length === 0` abgewiesen.
- Safety: 0 Bilder gilt nur bei explizitem strukturiertem `post-listing-props`-Bildarray mit Länge 0 und ohne widersprüchliche Preview-/Hidden-/Local-Preview-Evidenz als vollständig.
- `blob:`-/`data:`-Previews bleiben blockierend; unklare leere Bildzustände bleiben fail-closed.
- Explizit bestätigte leere Bildbestände dürfen vorhandene lokale Bilder bei einer Datenaktualisierung atomar auf 0 reduzieren.
- Direktes Neu-Inserieren akzeptiert bestätigte 0-Bilder-Vorlagen.
- ZIP-Export/-Neu-Inserat unterstützt bestätigte 0-Bilder-Vorlagen; unbestätigt leere ZIP-Bildbestände bleiben gesperrt.
- Vollprüfungs-Bildvergleich: explizit leer ↔ explizit leer = Match; explizit leer ↔ Bilder = Mismatch; unbestätigt leer = Unsicherheit.
- Keine Änderung an Schnellprüfung, Public-Readiness/`Bald Online` oder Phase-4-Löschsicherheit.
<!-- KAR170-END:CHANGELOG:664 -->

<!-- KAR170-BEGIN:README:415 -->
### Historical README: Version 1.20.22: Anzeigen ohne Bilder korrekt erfassen (source line 415)

- Bilder sind weiterhin optional: Ein Bearbeiten-Snapshot mit **explizit strukturiert bestätigtem leerem Bildarray** wird nun als gültiger 0-Bilder-Bestand erfasst.
- Unklare leere Bildzustände bleiben fail-closed. Vorhandene, aber nicht eindeutig extrahierbare Bilder werden nicht als „0 Bilder“ umgedeutet.
- `blob:`-/`data:`-Previews bzw. sonstige lokale, nicht sicher persistierbare Preview-Zustände bleiben blockierend.
- Die explizite 0-Bilder-Evidenz wird im Inventardatensatz gespeichert. Dadurch darf ein bestätigter leerer Bildbestand bei einer Aktualisierung auch einen früheren Bildbestand ersetzen.
- Direktes „Neu inserieren“ akzeptiert explizit bestätigte 0-Bilder-Vorlagen; der Template-Filler hatte den 0-Bilder-Fall bereits als vollständig unterstützt.
- ZIP-Export/-Neu-Inserat akzeptiert ebenfalls explizit bestätigte 0-Bilder-Vorlagen; ein unbestätigt leerer ZIP-Bildbestand bleibt blockiert.
- In der Vollprüfung gilt 0 Bilder gegen 0 Bilder nur dann als Bild-Match, wenn beide Seiten ihren leeren Bildbestand explizit bestätigt haben. Ein bestätigtes 0↔N bleibt ein Mismatch, ein nicht bestätigtes leeres Set bleibt unsicher.
- Schnellprüfung, `Bald Online`, öffentliche Read-only-Enrichment-Logik und Phase-4-Delete-Safety bleiben unverändert.
<!-- KAR170-END:README:415 -->

## v1.20.21

<!-- KAR170-BEGIN:CHANGELOG:675 -->
### Original CHANGELOG: 1.20.21 – „Bald Online“ in Mehrfachlauf-Übersicht (source line 675)

- Die Abschlussübersicht von **Mehrere neu inserieren** zeigt einen erfolgreich ersetzten Datensatz mit noch ausstehender öffentlicher Bereitstellung jetzt sichtbar als **Bald Online** statt nur als generisch **Erfolgreich**. Die vier erfolgreich abgeschlossenen Phasen bleiben weiterhin grün abgehakt; `Bald Online` ist ein nachgelagerter Public-Readiness-Status und kein Prüfbedarf.
- Der Mehrfachlauf übernimmt `publicAvailabilityPending` aus der Renewal-Session in den persistierten Batch-Item-State und liefert den Wert auch im Public-Snapshot. Recovery aus einem bereits promotierten Inventardatensatz rekonstruiert denselben Zustand.
- Für bereits unter v1.20.20 gespeicherte Batch-Abschlüsse ohne dieses neue Feld verwendet die UI als Fallback den **neuen** Inventardatensatz (`newInventoryId`/`newAdId`) vor der alten Papierkorb-Quelle. Dadurch kann ein bestehender `Bald Online`-Datensatz nach dem Upgrade ebenfalls korrekt in der Übersicht erkannt werden.
- Die Statuspille verwendet dieselbe gelb/amberfarbene Pending-Semantik wie das Inventar-Badge. Batch-Zähler bleiben fachlich unverändert: der Austausch zählt weiterhin als erfolgreich, solange kein echter Prüfbedarf vorliegt.
- Schnellprüfung, Vollprüfungs-Edit-Gate, `Online Status prüfen`, Neu-Inserieren-Sperre bei `Bald Online` und Phase-4-Delete-Safety bleiben unverändert.
<!-- KAR170-END:CHANGELOG:675 -->

<!-- KAR170-BEGIN:README:426 -->
### Historical README: Version 1.20.21: „Bald Online“ in der Mehrfachlauf-Übersicht (source line 426)

Die Abschluss-**Übersicht** von **Mehrere neu inserieren** unterscheidet jetzt zwischen vollständig abgeschlossenem Austausch und noch ausstehender öffentlicher Bereitstellung. Hat ein erfolgreich ersetzter Datensatz `publicAvailabilityPending`, bleiben alle vier Workflow-Phasen als erfolgreich markiert, die sichtbare Statuspille lautet jedoch **Bald Online** statt **Erfolgreich**. Der Eintrag zählt weiterhin als erfolgreicher Austausch und nicht als Prüfbedarf.

Der Pending-Zustand wird im Batch-Item persistiert und im Public-Snapshot transportiert. Für bereits mit v1.20.20 erzeugte Abschlusszustände ohne dieses Feld kann die UI den Zustand aus dem promotierten neuen Inventardatensatz ableiten; dafür wird bei der Vorschau die neue Inventar-ID vor der alten Quell-/Papierkorb-ID bevorzugt. Voll-/Schnellprüfung, Delete-Safety und die v1.20.20-Inventarkartenlogik bleiben unverändert.
<!-- KAR170-END:README:426 -->

## v1.20.20

<!-- KAR170-BEGIN:CHANGELOG:684 -->
### Original CHANGELOG: 1.20.20 – „Bald Online“-Aktionskarte korrigiert (source line 684)

- Normale Inventarkarten mit dem Badge **Bald Online** beschriften die Aktualisierungsaktion jetzt korrekt mit **Online Status prüfen** statt **Daten aktualisieren**. Die Aktion bleibt auf den öffentlichen Read-only-Check beschränkt und öffnet den Bearbeiten-Modus nicht erneut.
- **Neu inserieren** ist in diesem Zustand zusätzlich direkt in der normalen Inventarkarten-UI an `Bald Online` gebunden gesperrt. Auch nach einem fehlgeschlagenen Online-Status-Check kann ein Re-Render/Fehlerpfad den Button nicht versehentlich wieder freigeben.
- Der bestehende Background-Hard-Gate gegen Neu-Inserieren bei `Bald Online`, die v1.20.19-Vollprüfungs-/Delete-Semantik und die Schnellprüfung bleiben unverändert.
<!-- KAR170-END:CHANGELOG:684 -->

<!-- KAR170-BEGIN:README:433 -->
### Historical README: Version 1.20.20: „Bald Online“-Aktionskarte korrigiert (source line 433)

Normale Inventarkarten mit **Bald Online** zeigen jetzt **Online Status prüfen** statt **Daten aktualisieren**. Der Check bleibt ein reiner öffentlicher Read-only-Status-/Metadaten-Refresh. **Neu inserieren** ist in diesem Zustand explizit deaktiviert und bleibt auch nach einem fehlgeschlagenen Online-Status-Check gesperrt. Background-Hard-Gate, Vollprüfungs-/Delete-Semantik aus v1.20.19 und Schnellprüfung bleiben unverändert.
<!-- KAR170-END:README:433 -->

## v1.20.19

<!-- KAR170-BEGIN:CHANGELOG:691 -->
### Original CHANGELOG: 1.20.19 – Edit-Verifikation, „Bald Online“ und Retry-UI (source line 691)

- Die Vollprüfung behandelt den frischen Edit-Recheck und den semantischen Vergleich gegen die Ursprungsanzeige als maßgebliche Inhaltsverifikation. Ein vollständiger Match gibt Phase 4 frei; öffentliche Read-only-Erreichbarkeit ist kein Delete-Gate mehr.
- Noch nicht öffentlich erreichbare, aber inhaltlich vollständig verifizierte Neu-Anzeigen werden als **Bald Online** markiert. **Online Status prüfen** versucht kanonische und ID-Direkt-Route erneut und ergänzt fehlende Read-only-Metadaten; bei Erfolg verschwindet das Badge.
- `Bald Online` sperrt **Neu inserieren** in UI und Background. Die Schnellprüfung bleibt unverändert und führt weiterhin keinen Edit-Recheck durch.
- Die Phase-4-Sicherheitskette bleibt bestehen: exakte Quell-ID, Profilbindung, bestätigte Löschung, frischer unabhängiger MyAds-Abwesenheitsnachweis und Promotion erst nach `source-delete-verified`.
- Der Batch-Button **Erneut prüfen** bleibt nun auch über Storage-/UI-Re-Renders während des laufenden Retries gesperrt und zeigt **Prüfung läuft …**.
- Der verbleibende 1-px-Sticky-Versatz links wurde korrigiert; die rechte Außenlücke des v1.20.18-Refresh-Buttons wurde reduziert, ohne seine Gold-Line-Gestaltung oder den Abstand zu den Tabs zu ändern.
<!-- KAR170-END:CHANGELOG:691 -->

<!-- KAR170-BEGIN:README:437 -->
### Historical README: v1.20.19 – Edit-Vergleich als Vollprüfungs-Gate und „Bald Online“ (source line 437)

- **Schnellprüfung bleibt unverändert:** Sie prüft die neue Anzeigen-ID weiterhin nur kontoseitig unter „Meine Anzeigen“ und öffnet die neue Anzeige nicht erneut im Bearbeiten-Modus.
- **Vollprüfung:** Der frische Bearbeiten-Recheck der exakten neuen Anzeigen-ID wird vollständig gegen die Ursprungsanzeige verglichen. Ein vollständiger semantischer Match setzt den Kandidaten auf `verified / replacement-ready`; die öffentliche Read-only-Erreichbarkeit ist kein Lösch-Gate mehr. Semantische Mismatches oder andere inhaltliche Unsicherheiten bleiben fail-closed.
- Kann die neue Anzeige über die kanonische oder ID-Direkt-URL noch nicht eindeutig im Read-only-Modus geöffnet werden, bleibt der inhaltlich verifizierte Datensatz mit `listingMeta.publicAvailability.status = pending` und dem Inventar-Badge **Bald Online** erhalten. Nach erfolgreicher Read-only-Erreichbarkeit wird der Status auf `online` gesetzt.
- Solange **Bald Online** besteht, heißt **Daten aktualisieren** stattdessen **Online Status prüfen**. Diese Aktion prüft nur die öffentlichen Routen und ergänzt die dort noch fehlenden Read-only-Daten; sie öffnet den Bearbeiten-Modus nicht erneut. Ein erfolgreicher Lauf entfernt den Pending-Status und damit das Badge.
- **Neu inserieren** ist für einen `Bald Online`-Datensatz sowohl in der UI als auch im Background-Hard-Gate gesperrt.
- Phase 4 behält die bestehenden Safety-Invarianten: profilgebundene Löschung der alten ID, frischer unabhängiger MyAds-Abwesenheitsnachweis und lokale Promotion erst nach `source-delete-verified`.
- **Mehrere neu inserieren:** „Erneut prüfen“ bleibt über Re-Renders hinweg gesperrt, solange derselbe Retry lokal oder im persistenten Item-State `running/retrying` ist.
- UI-Feinschliff: verbleibender 1-px-Sticky-Versatz links korrigiert; nur die rechte Außenlücke zwischen Refresh-Button und Scrollbalken verkleinert. Die v1.20.18-Bright-Cyan-Refresh-Gestaltung und der Abstand zwischen Tabs und Refresh bleiben unverändert.
<!-- KAR170-END:README:437 -->

## v1.20.18

<!-- KAR170-BEGIN:CHANGELOG:701 -->
### Original CHANGELOG: 1.20.18 – Ansichts-Refresh, Sticky-Geometrie und Meldungsverlauf (source line 701)

- Der bestehende umfassende manuelle Refresh wurde aus der Inventarüberschrift in die rechte Header-/Ansichtsleiste verschoben. Er bleibt technisch unverändert umfassend, ist nun aber als eigener gerahmter Icon-Button mit **Ansicht aktualisieren** semantisch passend platziert.
- Headerhöhe und oberer Shell-Abstand sind gemeinsame CSS-Geometrie-Tokens; die Sticky-Schwelle der linken Steuerung ist deren Summe. Damit entfällt der sichtbare wenige-Pixel-Sprung beim Scrollen.
- `uiActivityHistoryV1`/`uiCurrentActivityV1` werden beim App-Bootstrap geladen. Der Öffnen-Handler des Meldungsverlaufs wartet ebenfalls auf `ensureUiActivityLoaded()`, bevor er Zähler/Liste rendert. Persistierte Meldungen bleiben nach App-Neustart unmittelbar sichtbar.
- Keine fachliche Änderung an Renewal-, Publish-, Delete-, Phase-4-, Inventur- oder Account-Safety-Gates.
<!-- KAR170-END:CHANGELOG:701 -->

<!-- KAR170-BEGIN:README:449 -->
### Historical README: v1.20.18 – Ansichts-Refresh, Sticky-Geometrie und Meldungsverlauf (source line 449)

- Der umfassende manuelle Refresh bleibt funktional unverändert (`inspectPage({ forceFresh: true })` gefolgt von `refreshInventories()`), sitzt aber nicht mehr irreführend in der Inventar-Überschrift. Er befindet sich jetzt rechts in der gemeinsamen Header-/Ansichtsleiste als eigener kompakter Bright-Cyan-Icon-Button mit dem Tooltip **Ansicht aktualisieren** und sichtbarem Abstand zu `Inventar | Papierkorb`.
- Die linke Steuerung verwendet für ihre Sticky-Schwelle dieselben expliziten Geometrie-Tokens wie Headerhöhe und oberer App-Shell-Abstand. Dadurch stimmt die anfängliche natürliche Position mit der Sticky-Position überein und das wenige Pixel große Hoch-/Runterspringen beim An- und Ablösen entfällt.
- Der persistente Activity-Center-Zustand wird beim App-Start proaktiv aus `chrome.storage.local` geladen. Zusätzlich wartet **Weitere Meldungen anzeigen** vor dem Rendern explizit auf diesen Load. Bereits gespeicherte Meldungen erscheinen dadurch nach Reload/Neustart wieder zuverlässig im Zähler und im Meldungsverlauf, statt bis zur nächsten neuen Activity nur im Storage zu liegen.
- Renewal-, Publish-, Phase-3/4-, Inventur-, Account-Gate- und Safety-Logik bleiben fachlich unverändert.
<!-- KAR170-END:README:449 -->

## v1.20.17

<!-- KAR170-BEGIN:CHANGELOG:709 -->
### Original CHANGELOG: 1.20.17 – Aktionen-Meldungen und MyAds-Inkonsistenz (source line 709)

- Generische aktuelle Aktionen-Statuskarten erhalten ein `×`; Ausblenden verschiebt die Meldung in den Meldungsverlauf statt sie zu löschen.
- Neue Readiness-Fehlerklasse `KR_MY_ADS_INCONSISTENT` für widersprüchliche MyAds-Zähler/Karten-Zustände.
- Endanwendertext nennt bei bekannten Counts den konkreten Zustand (z. B. 10 gemeldet, 9 vollständig sichtbar), erklärt den sicheren Nicht-Start und empfiehlt einen späteren erneuten Versuch.
- Strukturierte Readiness-Fehlerdetails (`expectedOnline`, `listingCount`, `listingIds`, Fingerprint, Reason-Code) werden Content → Background → App erhalten und in den Bulk-Source-Diagnoseevents protokolliert.
- Keine Änderung an Renewal-/Publish-/Phase-4-Safety oder eigentlicher Inventarisierungslogik.
<!-- KAR170-END:CHANGELOG:709 -->

<!-- KAR170-BEGIN:README:457 -->
### Historical README: v1.20.17 – Aktionen-Meldungen und MyAds-Inkonsistenz (source line 457)

- Der generische aktuelle Status im Bereich **Aktionen** besitzt jetzt wie die übrigen Meldungskarten ein `×`. Ausblenden archiviert die Meldung in **Weitere Meldungen anzeigen**; sie wird nicht gelöscht. Damit sind insbesondere Erfolgs- und Fehlerkarten aus **Geöffnete Anzeige erfassen** einheitlich dismissbar.
- Ein fachlich inkonsistenter „Meine Anzeigen“-Stand wird als eigene Readiness-Fehlerklasse `KR_MY_ADS_INCONSISTENT` bis zur UI propagiert. Wenn Kleinanzeigen beispielsweise 10 Online-Anzeigen meldet, aber nur 9 Karten vollständig liefert, erklärt die Oberfläche den sicheren Abbruch ausdrücklich und empfiehlt, kurz zu warten und erneut zu versuchen.
- Die Readiness-Diagnose bewahrt bei solchen Fällen erwartete/erkannte Counts, erkannte Anzeigen-IDs, Seiten-Fingerprint und den konkreten Reason-Code. Fehlende IDs werden nur ausgewiesen, wenn sie belastbar bekannt sind; andernfalls bleibt `missingIdsKnown=false`.
- Der fachliche Inventur-, Renewal-, Publish- und Phase-4-Ablauf bleibt unverändert; der Patch verbessert ausschließlich Meldungs-UX und Diagnose/Fehlerpropagation der MyAds-Readiness.
<!-- KAR170-END:README:457 -->

## v1.20.16

<!-- KAR170-BEGIN:CHANGELOG:718 -->
### Original CHANGELOG: 1.20.16 – Stabilisierung Phase 3, Batch-Recovery und Header-Kontur (source line 718)

- Fresh Public Verification wartet nach bestätigter Ziel-Ad-ID im selben frisch erzeugten Tab auf Read-only-Readiness (30-s-Grenze), statt vorschnell weitere Verification-Tabs zu erzeugen.
- Mehrfachlauf normalisiert nach erfolgreicher manueller Recovery den Batch-Top-Level aus den Item-Zuständen und diagnostiziert dies als `MASS_RENEWAL_BATCH_STATUS_NORMALIZED`; bereits persistierte stale Terminalzustände werden beim nächsten Statusabruf ebenfalls selbstheilend normalisiert.
- Header-/Tab-Kontur durchgehend Bright Cyan: inaktive Tab-Unterkante, Inventar-Rechtskante und Papierkorb-Linkskante.
- Keine Änderung an Publish-/Delete-/Phase-4-Safety.
<!-- KAR170-END:CHANGELOG:718 -->

<!-- KAR170-BEGIN:README:465 -->
### Historical README: v1.20.16 – Stabilisierung Phase 3, Batch-Recovery und Header-Kontur (source line 465)

- Phase 3 behält die Fresh-Tab-only-Invariante bei. Sobald ein frischer öffentlicher Prüftab eindeutig die erwartete Anzeigen-ID erreicht hat, wartet derselbe frische Tab bis zu 30 Sekunden auf die fachliche Read-only-Bereitschaft, bevor ein weiterer Verifikationsweg geöffnet wird.
- Erfolgreiche manuelle Recoveries normalisieren den Top-Level-Status des Mehrfach-Neuinserats aus den finalen Item-Zuständen; ein stale `complete-with-attention` bleibt nach `2/2 success, attention=0` nicht bestehen. Bereits aus älteren Builds gespeicherte stale Terminalzustände werden beim nächsten Statusabruf ebenfalls aus den Items selbst geheilt.
- Die Header-Navigationslinie ist durchgehend Bright Cyan: Unterkante beider Tabs sowie die gemeinsame Trennkante Inventar↔Papierkorb verwenden `#4de0b7`.
- Publish-, Bild-, Inventur-, Account-Gate- und Phase-4-Safety bleiben unverändert.
<!-- KAR170-END:README:465 -->

## v1.20.15

<!-- KAR170-BEGIN:CHANGELOG:725 -->
### Original CHANGELOG: 1.20.15 – Header-Navigationslinie Bright Cyan (source line 725)

- Die horizontale Trennlinie des App-Headers verwendet jetzt `#4de0b7`, exakt dieselbe Farbe wie die Border des aktiven `Inventar`-/`Papierkorb`-Tabs.
- Position, Dicke, Tab-Geometrie und aktive/inaktive Tab-Semantik bleiben unverändert.
- Es existiert bereits ein gezielter Test für diese Linie (`tests/v1176-accordion-motion.cjs`); sein Contract wurde von der bisherigen subtilen Cyan-Variante auf Bright Cyan aktualisiert.
- Auf ausdrücklichen Wunsch wurde für diesen rein visuellen Patch auf die vollständige Regression, Syntax-Gesamtlauf und Fresh-Source-Testmatrix verzichtet.
<!-- KAR170-END:CHANGELOG:725 -->

<!-- KAR170-BEGIN:README:473 -->
### Historical README: v1.20.15 – Header-Navigationslinie Bright Cyan (source line 473)

Die horizontale Header-Trennlinie, auf der die beiden Ansichts-Tabs sitzen, verwendet jetzt exakt dasselbe **Bright Cyan `#4de0b7`** wie die Border des aktiven Tabs. Höhe, Position, Tab-Geometrie sowie aktive/inaktive Tab-Semantik bleiben unverändert.

**Bewusst enger Patch-Scope:** ausschließlich diese visuelle Header-Anpassung; keine funktionalen Workflow- oder Safety-Änderungen. Auf ausdrücklichen Wunsch wurde für diesen Patch auf die vollständige Test-/Fresh-Source-Matrix verzichtet; der bereits vorhandene gezielte Header-Contract `tests/v1176-accordion-motion.cjs` wurde auf die neue Farbregel aktualisiert und separat ausgeführt.
<!-- KAR170-END:README:473 -->

## v1.20.14

<!-- KAR170-BEGIN:CHANGELOG:733 -->
### Original CHANGELOG: 1.20.14 – Stabilisierung ID-Route, Batch-Zähler und Prüf-Terminologie (source line 733)

- **Öffentliche ID-Route auch im Content-/Read-only-Pfad:** Die bereits in v1.20.13 verwendete Fresh-Tab-ID-Route `https://www.kleinanzeigen.de/s-anzeige/<adId>` wird nun auch von der eigentlichen Read-only-Metadatenextraktion als gültige Anzeigen-Detailseite erkannt. Der Content-Kontext verwendet dafür denselben `managed-navigation.js`-Ad-ID-Parser wie die zielgebundene Phase-3-Navigation; kanonische URL und ID-Route teilen damit dieselbe autoritative Anzeigen-ID-Semantik.
- `managed-navigation.js` wird deshalb vor `content.js` auch im Content-Script-Kontext geladen. Kategorie-/Location-IDs werden weiterhin nur aus der langen kanonischen URL abgeleitet; die Ad-ID selbst ist in beiden öffentlichen URL-Formen autoritativ.
- **Mehrfachlauf-Zähler normalisiert:** Die UI leitet `total`, `success`, `attention`, `cancelled`, `queued` und `running` immer aus `batch.items` ab. Rohe Storage-Events und Background-Public-Snapshots werden vor dem Rendern auf dieselbe Form normalisiert; ein späteres Storage-Event kann korrekte Counts nicht mehr zu `0 von 0` zurücksetzen.
- **Prüf-CTA vereinheitlicht:** Wiederholungen desselben Verifikationsworkflows heißen überall `Erneut prüfen`. Varianten wie `Jetzt erneut prüfen` und `Prüfung erneut starten` wurden entfernt.
- **Statussprache endanwenderfreundlich:** `NOCH NICHT ONLINE` wird zu `VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT`, `PRÜFUNG NÖTIG` zu `PRÜFUNG ERFORDERLICH`. Passive Wartezustände formulieren nicht mehr irreführend, dass im Hintergrund weiter geprüft werde.
- Die v1.20.13-Fresh-Tab-only-Phase-3-Architektur, Gold-Line, Publish-/Bild-/Phase-4-/Inventur-/Account-Gate-Safety bleiben unverändert.
<!-- KAR170-END:CHANGELOG:733 -->

<!-- KAR170-BEGIN:README:480 -->
### Historical README: v1.20.14 – Stabilisierung ID-Route, Batch-Zähler und Prüf-Terminologie (source line 480)

Die öffentliche Fresh-Tab-Verifikation aus v1.20.13 verwendet bereits die Anzeigen-ID als autoritative Identität. v1.20.14 schließt den letzten Parser-Widerspruch: Auch die Content-/Read-only-Metadatenextraktion akzeptiert nun sowohl die lange kanonische Anzeigen-URL als auch `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Beide Pfade verwenden denselben `managed-navigation.js`-Ad-ID-Parser; damit kann eine korrekt erreichte ID-Route nicht mehr fälschlich als „keine öffentliche Anzeigen-Detailseite“ abgewiesen werden.

Der Fortschritt von **Mehrere neu inserieren** normalisiert seine Zähler jetzt ausschließlich aus `batch.items`. Storage-Events und Runtime-Responses besitzen dadurch dieselbe abgeleitete UI-Form; die Fortschrittszeile bleibt beispielsweise bei zwei Anzeigen korrekt `0 von 2`, `1 von 2`, `2 von 2` statt nach Storage-Updates auf `0 von 0` zurückzufallen.

Prüfaktionen sind sprachlich vereinheitlicht: dieselbe Verifikation heißt überall **Erneut prüfen**. Der Status **Noch nicht online** entfällt zugunsten von **Veröffentlichung noch nicht bestätigt**; unsichere Prüfzustände heißen **Prüfung erforderlich**. Dadurch beschreibt die UI nur, was tatsächlich bewiesen ist, ohne eine noch laufende Hintergrundprüfung oder eine sicher nicht öffentliche Anzeige zu suggerieren.

**Stabilisierungsscope:** Die Fresh-Tab-only-Architektur aus v1.20.13, Gold-Line, Publish-/Template-Fill-, Bild-, Phase-4-, Vollinventur-, Actions-/Account-Gate- und ZIP-Pfade bleiben fachlich unverändert.
<!-- KAR170-END:README:480 -->

## v1.20.13

<!-- KAR170-BEGIN:CHANGELOG:742 -->
### Original CHANGELOG: 1.20.13 – Stabilisierung Phase 3 + Mehrfachlauf-Gold-Linie (source line 742)

- **Phase-3-Verifikation ID-zentriert und Fresh-Tab-only:** Jede öffentliche Prüf-URL wird in einem neu erzeugten, dedizierten Managed-Tab geprüft. Publish-/Target-Tabs, „Meine Anzeigen“-Tabs, frühere Verification-Tabs und vorhandene Nutzertabs werden nicht recycelt.
- Die bekannte kanonische öffentliche URL bleibt der erste Prüfweg. Bei Off-Target, Navigations-/Transportfehler oder fehlender eindeutiger Evidenz folgt ein zweiter **separater frischer Tab** über `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Redirects zwischen ID-Route und kanonischer URL gelten als erfolgreich, wenn die erwartete Anzeigen-ID eindeutig übereinstimmt.
- „Meine Anzeigen“ wird ebenfalls über einen eigenen frischen Prüftab aufgelöst. Liefert dieser eine abweichende kanonische URL, wird auch diese URL erneut in einem weiteren frischen Public-Verification-Tab geprüft.
- Öffentliche Navigation ist zielgebunden: `about:blank`, Stadt-/Suchseiten, Browserfehler und fremde Anzeigen-IDs werden nicht als erfolgreicher `complete`-Zustand akzeptiert. Jeder Verifikationstab wird nach Erfolg, Fehler oder Safety-Stop kontrolliert geschlossen.
- Phase 3 trennt transiente Navigations-/Transportprobleme (`transient-navigation-failure`, `off-target`, `temporarily-unavailable`) von fachlichen Mismatches. Reine Sichtbarkeitsunsicherheit darf die konfigurierten Phase-3-Retries nutzen; echte Inhaltsabweichungen bleiben autoritativ und fail-closed.
- Die Phase-4-Sicherheitsgrenze bleibt unverändert: Die alte Anzeige wird erst nach eindeutig bestätigter öffentlicher neuer Anzeigen-ID und erfolgreicher semantischer Prüfung weiterverarbeitet.
- **Mehrfach-Neuinserate folgen der Gold-Linie:** Im globalen Stepper und in jeder Anzeigenzeile wird ein erfolgreich abgeschlossener Schritt sofort als `✓` mit grünlichem Erfolgszustand dargestellt. Der laufende Schritt bleibt nummeriert/aktiv, zukünftige Schritte bleiben neutral; abgeschlossene Schritte fallen visuell nicht zurück.
- Diagnoseevents dokumentieren pro öffentlichem Versuch frische `tabId`, Versuch, URL-Variante, angeforderte/finale URL, erwartete/erkannte Anzeigen-ID, Ergebnis und Close-Grund.
<!-- KAR170-END:CHANGELOG:742 -->

<!-- KAR170-BEGIN:README:490 -->
### Historical README: v1.20.13 – Stabilisierung Phase 3 und Mehrfachlauf-Gold-Linie (source line 490)

Die Safe-/Vollprüfung der neu erzeugten Anzeige verifiziert öffentliche Evidenz nun **ID-zentriert und ausschließlich über frische dedizierte Tabs**. Zuerst wird eine bekannte kanonische Anzeigen-URL geprüft; wenn dieser Pfad off-target oder technisch uneindeutig endet, folgt in einem anderen frisch erzeugten Tab die ID-Route `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Ein Redirect auf die kanonische URL ist zulässig, solange die tatsächlich erreichte öffentliche URL eindeutig dieselbe Anzeigen-ID trägt. Kein Publish-, Nutzer-, MyAds- oder früherer Prüftab wird für öffentliche Evidenz recycelt.

Transiente Navigations-/Transportfehler sind von semantischen Inhaltsabweichungen getrennt und können innerhalb der bestehenden begrenzten Phase-3-Versuche erneut geprüft werden. Die Safety-Grenze bleibt unverändert: Phase 4 wird erst nach eindeutiger öffentlicher ID-Bestätigung und erfolgreichem Inhaltsvergleich freigegeben. Jeder Prüftab wird kontrolliert geschlossen und die Diagnose enthält Versuch, frische Tab-ID, URL-Variante, angeforderte/finale URL sowie erwartete und beobachtete Anzeigen-ID.

Der Fortschritt von **Mehrere neu inserieren** verwendet jetzt dieselbe Gold-Linie wie Einzeldurchläufe. Global und je Anzeigenzeile erscheinen abgeschlossene Schritte sofort als `✓` mit grünlichem Erfolgszustand; der aktuelle Schritt bleibt nummeriert aktiv, zukünftige Schritte neutral.

**Stabilisierungsscope:** Publish-/Template-Fill-, Bild-, Phase-4-, Vollinventur-, Actions-/Account-Gate- und ZIP-Einzeldurchlaufpfade werden nicht breit refaktoriert.
<!-- KAR170-END:README:490 -->

## v1.20.12

<!-- KAR170-BEGIN:CHANGELOG:753 -->
### Original CHANGELOG: 1.20.12 (source line 753)

- ZIP-Einzeldurchlauf: Die wechselnden Inhaltskarten liegen jetzt in einem gemeinsamen vertikalen Flow-Stack mit konstantem Abstand. Dadurch überlappen ZIP-Vorschau, Hinweis und Fortschritts-/Ergebniskarte in keiner Phase mehr.
- Der Hinweis „Es wird eine neue Anzeige erstellt.“ verwendet die neutrale Info-Darstellung statt der amberfarbenen Warnungsdarstellung.
- Die laufende ZIP-Inserierung erzeugt keine generische persistente Statuskarte „Anzeige aus ZIP wird inseriert“ mehr. Der Workflow wird über Dialog, Lock und Aktionen-Aktivitätsindikator abgebildet; nach Terminalzustand bleibt keine falsche „läuft“-Meldung stehen.
- Beim Upgrade wird eine eventuell aus v1.20.11 persistierte aktuelle Legacy-Meldung „Anzeige aus ZIP wird inseriert“ einmalig aus der aktiven Statusfläche entfernt und in den Meldungsverlauf überführt.
- ZIP-Workflow-State, Inserierungs-/Publish-/Prüf-/Inventarlogik und die in v1.20.11 eingeführte monotone Schrittfortschrittslogik bleiben fachlich unverändert.
<!-- KAR170-END:CHANGELOG:753 -->

<!-- KAR170-BEGIN:README:1840 -->
### Historical README: v1.20.12 – ZIP-Dialog UI/UX-Polish (source line 1840)

Der ZIP-Einzeldurchlauf verwendet für Vorschau, Hinweis und Fortschritts-/Ergebniskarte einen gemeinsamen vertikalen Flow-Stack mit konstanten Abständen. Der Hinweis vor dem Start ist neutral statt amber. Die frühere generische Statuskarte „Anzeige aus ZIP wird inseriert“ wird nicht mehr als persistente aktuelle Meldung verwendet; der laufende Zustand bleibt über Dialog, Inserierungs-Lock und Aktionen-Aktivitätsindikator sichtbar und verschwindet nach Terminalzustand zuverlässig aus der aktuellen Statusfläche.
<!-- KAR170-END:README:1840 -->

## v1.20.11

<!-- KAR170-BEGIN:CHANGELOG:762 -->
### Original CHANGELOG: 1.20.11 (source line 762)

- ZIP-Neuinserierung: Workflow-Fortschritt ist jetzt vom allgemeinen Inventar-Live-Refresh entkoppelt. Persistierte Session-Transitions werden über `ARCHIVE_INSERTION_STATE_CHANGED` direkt an die UI übertragen.
- ZIP-Neuinserierungs-Snapshots besitzen eine monotone `revision`; verspätete ältere UI-Snapshots können keinen bereits neueren Schritt oder Terminalzustand mehr zurücksetzen.
- Der erfolgreiche Terminalzustand (`complete`) wird dadurch nicht mehr von einem nachfolgenden `archive-insertion-completed`-Inventarrefresh verdrängt.
- Die Schrittanzeige des ZIP-Einzeldurchlaufs sitzt dauerhaft im oberen Dialogbereich direkt unter Titel/Einleitung und vor den wechselnden Inhalten; abgeschlossene Schritte bleiben gemäß Gold-Linie abgehakt.
- Renewal-/Publish-/Delete-/Vollinventur-Abläufe bleiben fachlich unverändert.
<!-- KAR170-END:CHANGELOG:762 -->

<!-- KAR170-BEGIN:README:1836 -->
### Historical README: v1.20.11 – ZIP-Inserierungsfortschritt (source line 1836)

Der ZIP-Einzeldurchlauf verwendet einen eigenen monotonen Workflow-State-Kanal statt des allgemeinen Inventar-Debounces. Die Schrittleiste bleibt nach der ZIP-Prüfung stabil oben im Dialog und zeigt bestätigte Schritte dauerhaft mit Haken.
<!-- KAR170-END:README:1836 -->

## v1.20.10

<!-- KAR170-BEGIN:CHANGELOG:771 -->
### Original CHANGELOG: 1.20.10 – 2026-09-21 (source line 771)

- **Aktionen-/Account-Gate architektonisch zentralisiert:** Der UI-Zustand für accountgebundene Aktionen besitzt mit `account-gate.js` eine einzige State-Authority (`checking`, `confirmed`, `transient-unavailable`, `missing`, `ambiguous`, `restricted`). Sichtbares Button-Enablement, Tooltips und Klick-Guard leiten sich aus demselben Gate-Modell ab.
- Passive Health-Checks degradieren eine zuletzt bestätigte Profilbindung bei transienten Tab-/Content-/Navigationsfehlern nicht mehr zu `missing`. Die bestätigte Identität bleibt erhalten; bei passender Profilbindung bleiben Aktionen im Zustand `ready-transient` nutzbar. Autoritative Belege wie Logout, kein Kleinanzeigen-Tab, Mehrdeutigkeit oder Plattform-Safety sperren weiterhin sofort.
- **Managed Account-Probe zielgebunden:** `managed-navigation.js` trennt das alte `about:blank`-Dokument von der angeforderten Zielnavigation. Ein beliebiges `tab.status === complete` reicht nicht mehr; erst die erwartete Kleinanzeigen-Ziel-URL plus `complete` gilt als bereit. Browser-Fehlerseiten/Fremdziele werden als off-target klassifiziert. Der Probe-Pfad hat höchstens zwei Versuche und retried H1/H2-Plattform-Safety ausdrücklich nicht.
- Der 60-s-Healthcheck bleibt Safety-Fallback. Kurze Recovery-Checks (z. B. 650 ms) können nicht mehr durch den nachgelagerten 60-s-Timer überschrieben werden; der Scheduler behält immer den früheren fälligen Check.
- **Diagnose erweitert:** `ACCOUNT_GATE_TRANSITION`, `PROFILE_BINDING_TRANSITION` und `ACCOUNT_GATE_ACTION_BLOCKED` dokumentieren State-/Profil-/Freigabewechsel. Der Diagnose-ZIP enthält zusätzlich `account-gate-state.json` mit aktuellem Gate, ausgewähltem Profil, zuletzt bestätigtem Live-Profil, Quelle, Grund und Generation.
- **Scope-Isolation:** Vollinventur-/Reconciliation-Readiness aus v1.20.9 sowie Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Abläufe werden fachlich nicht umgebaut. Backend-Account-Binding vor echten Remote-Aktionen bleibt als frische Sicherheitsprüfung erhalten.
<!-- KAR170-END:CHANGELOG:771 -->

<!-- KAR170-BEGIN:README:501 -->
### Historical README: v1.20.10 – zentraler Account-Gate-/Actions-Lifecycle (source line 501)

Der Bereich **Aktionen** verwendet jetzt eine zentrale Account-Gate-State-Authority. UI-Freigabe, Tooltips und Klick-Guard werden aus demselben Zustand abgeleitet; dynamisch gerenderte Inventarkarten werden bei relevanten Gate-Transitions ebenfalls synchron aktualisiert. Transiente Health-/Tab-Fehler löschen eine zuletzt bestätigte Profilidentität nicht mehr. Solange ausgewähltes Inventarprofil und zuletzt bestätigtes Live-Konto übereinstimmen, bleibt die Oberfläche in einem expliziten `ready-transient`-Zustand nutzbar; definitive Zustände wie Logout, Mehrdeutigkeit, falsches Profil oder Plattform-Safety sperren weiterhin.

Die verwaltete Account-Probe ist nun an die tatsächlich angeforderte Navigation gebunden. Der zunächst erzeugte `about:blank`-Tab kann nicht mehr mit seinem alten `complete`-Status als erfolgreiche Kleinanzeigen-Navigation gelten. Erst die erwartete Ziel-URL mit anschließendem `complete` wird akzeptiert; Browser-Fehlerseiten und Fremdziele werden sauber als off-target behandelt. Ein begrenzter Retry bleibt Recovery, nicht primäre Readiness.

Die Diagnose enthält zusätzlich `ACCOUNT_GATE_TRANSITION`, `PROFILE_BINDING_TRANSITION`, `ACCOUNT_GATE_ACTION_BLOCKED` sowie `account-gate-state.json`. Damit lässt sich künftig nachvollziehen, wann und warum Aktionen zwischen freigegeben, prüfend, transient, mismatch oder gesperrt wechseln. Kurze Recovery-Checks behalten Vorrang vor dem 60-s-Safety-Fallback, sodass ein 650-ms-Recheck nicht mehr versehentlich durch den nächsten 60-s-Timer ersetzt wird.

**Bewusst unverändert:** die v1.20.9-Vollinventur-/Reconciliation-Architektur sowie Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Workflows. Echte Remote-Aktionen behalten zusätzlich die frische Background-Profil-/Live-Konto-Verifikation.
<!-- KAR170-END:README:501 -->

## v1.20.9

<!-- KAR170-BEGIN:CHANGELOG:781 -->
### Original CHANGELOG: 1.20.9 – 2026-09-21 (source line 781)

- **Inventarisierungs-Readiness architektonisch vereinheitlicht:** `tab.status === "complete"` bleibt das eventgetriebene Navigationssignal aus P6a. Danach prüft eine gemeinsame fachliche `MyAds`-Readiness, ob Seite 1, Profilbindung, Online-Zähler und Anzeigenkarten tatsächlich konsistent verfügbar sind.
- Die Readiness läuft im Content-Kontext primär über einen kurzlebigen `MutationObserver`; ein 1-s-Recheck bleibt nur Safety-/Recovery-Fallback. Pro frischem Source-Tab gilt ein 12-s-Limit. Ein echter Nullbestand wird unterstützt und 1,2 s stabilisiert; `null`/nicht erkannt bleibt semantisch unbekannt und wird nicht länger über `Number(null)` zu 0.
- Der Vollinventurstart besitzt nur noch eine autoritative Background-Operation (`START_BULK_INVENTORY_OPERATION`). Der frühere aktive Split aus `PREPARE_BULK_INVENTORY_SOURCE` und `START_BULK_INVENTORY_FRESH` wurde aus dem Router entfernt. Source-Erzeugung, Readiness und `BULK_INIT_RUN` teilen sich dieselbe `operationId`.
- Transiente Readiness-Timeouts dürfen höchstens einen zweiten frischen „Meine Anzeigen“-Source verwenden. Falsche Seite, falsches Profil und Plattform-Safety (`KR_PLATFORM_ACCESS_RESTRICTED`) werden nicht durch zusätzliche Source-Retries kaschiert.
- Die unabhängige zweite Bestandsprüfung verwendet dieselbe Readiness-Primitive und übernimmt den verifizierten `readySnapshot` direkt in den Reconciliation-Scan. Der in v1.20.7 eingeführte lokale 500-ms-Polling-Sonderpfad entfällt. Dauerhafte Unsicherheit bleibt `needs-review` mit `movedToTrash = 0`.
- A2-Korrelation ist für diesen Workflow durchgängig: Source-Operation und resultierender Bulk-Run bleiben demselben Vorgang zugeordnet. Inventur-Source-Tabs werden über die TabRegistry kontrolliert verwaltet/geschlossen.
- **Scope-Isolation:** Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Verifikationspfade wurden bewusst nicht auf die neue Inventur-Readiness migriert. Der bewährte Renewal-Stand sowie der v1.20.8-Worker-Tab-Create-Retry bleiben erhalten.
<!-- KAR170-END:CHANGELOG:781 -->

<!-- KAR170-BEGIN:README:511 -->
### Historical README: v1.20.9 – gemeinsame eventgetriebene „Meine Anzeigen“-Readiness für Inventarisierung (source line 511)

Die Vollinventur und ihre unabhängige zweite Bestandsprüfung verwenden jetzt dieselbe fachliche Readiness-Schicht für „Meine Anzeigen“. Browser-`tab.status === "complete"` bleibt weiterhin die Navigationsgrenze; erst danach wartet der Content-Kontext zusätzlich darauf, dass Seite 1, Profilbindung, Online-Zähler und Anzeigenkarten einen konsistenten fachlichen Zustand bilden. Ein kurzlebiger `MutationObserver` ist das Primärsignal, ein 1-s-Recheck nur Safety-Net; nach 12 s endet ein Versuch begrenzt und fail-closed. Ein expliziter echter Nullbestand wird unterstützt, muss aber 1,2 s stabil bleiben. `null`/nicht erkannt wird niemals mehr als `0` interpretiert.

Der Start einer Vollinventur ist nun eine einzige autoritative Background-Operation (`START_BULK_INVENTORY_OPERATION`). Der frühere erreichbare Split aus `PREPARE_BULK_INVENTORY_SOURCE` und `START_BULK_INVENTORY_FRESH` wurde entfernt. Source-Tab-Erzeugung, semantische Readiness und `BULK_INIT_RUN` behalten dadurch dieselbe `operationId`. Transiente Readiness-Probleme dürfen höchstens einen zweiten frischen Source-Tab verwenden; falsche Seite, falsches Profil und Plattform-Safety scheitern sofort.

Die Reconciliation verwendet dieselbe Readiness-Primitive und übergibt den einmal verifizierten Snapshot an den zweiten Scan. Der lokale v1.20.7-500-ms-Polling-Sonderpfad entfällt. H4 bleibt unverändert fail-closed: Ohne zwei vollständige bestätigte Bestände erfolgt keine automatische Papierkorbmutation.

**Bewusst nicht verändert:** Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Verifikationspfade. Der v1.20.8-Worker-Tab-Create-Retry bleibt erhalten. Diese Version glättet ausschließlich die Inventarisierungs-/Reconciliation-Architektur.
<!-- KAR170-END:README:511 -->

## v1.20.8

<!-- KAR170-BEGIN:CHANGELOG:791 -->
### Original CHANGELOG: 1.20.8 – 2026-09-21 (source line 791)

- **Transienten Bulk-Worker-Tab-Erzeugungsfehler abgefangen:** Der zwingende Bearbeiten-Worker erhält genau einen lokalen Wiederholungsversuch nach 200 ms, wenn `chrome.tabs.create()` transient fehlschlägt oder keinen gültigen Tab zurückgibt. Ein erfolgreicher zweiter Versuch verarbeitet dieselbe Anzeige weiter; es wird nicht zur nächsten Anzeige gesprungen.
- H1/H2-Plattform-Safety bleibt autoritativ: `KR_PLATFORM_ACCESS_RESTRICTED` wird niemals wiederholt. Nach zwei fehlgeschlagenen Erzeugungsversuchen bleibt die Anzeige weiterhin fail-closed als Fehler markiert.
- Der ursprüngliche `chrome.tabs.create()`-Fehler wird jetzt in `BULK_WORKER_TAB_CREATE_RETRY` bzw. `BULK_WORKER_TAB_CREATE_FAILED` diagnostisch erhalten. Ein erfolgreicher Recovery-Versuch wird mit `BULK_WORKER_TAB_CREATE_RECOVERED` dokumentiert.
- Wenn der optionale Metadaten-Tab bereits erfolgreich erzeugt wurde, der zwingende Bearbeiten-Worker aber endgültig scheitert, wird der Metadaten-Tab sofort kontrolliert geschlossen. Dadurch bleibt kein unregistrierter/orphaned Worker-Tab zurück.
- Der manuelle Einzel-Retry eines fehlgeschlagenen Inventareintrags verwendet denselben begrenzten Worker-Erzeugungs-Recovery-Pfad.
- Die v1.20.7-Reconciliation-Readiness-Korrektur sowie Publish-/Delete-/Account-/H1/H2-Safety-Gates bleiben unverändert.
<!-- KAR170-END:CHANGELOG:791 -->

<!-- KAR170-BEGIN:README:522 -->
### Historical README: v1.20.8 – robuster Bulk-Worker-Tab-Start (source line 522)

Ein transienter Fehler beim Erzeugen des zwingenden Bearbeiten-Worker-Tabs beendet eine Anzeige nicht mehr sofort. `chrome.tabs.create()` erhält in diesem eng begrenzten Bulk-Pfad genau einen Wiederholungsversuch nach 200 ms. Schlägt auch dieser fehl, bleibt die bestehende Fail-Closed-Semantik erhalten. Plattform-Safety (`KR_PLATFORM_ACCESS_RESTRICTED`) wird ausdrücklich nicht wiederholt.

Der echte Chrome-Fehler wird in der Diagnose erhalten. Falls der optionale öffentliche Metadaten-Tab parallel bereits geöffnet wurde, der Bearbeiten-Worker aber endgültig nicht erzeugt werden kann, wird dieser Gegenpart kontrolliert geschlossen, statt als unregistrierter Tab zurückzubleiben. Der manuelle Einzel-Retry nutzt denselben Recovery-Pfad. Die Reconciliation-Readiness aus v1.20.7 und alle Safety-Gates bleiben unverändert.
<!-- KAR170-END:README:522 -->

## v1.20.7

<!-- KAR170-BEGIN:CHANGELOG:800 -->
### Original CHANGELOG: 1.20.7 – 2026-09-21 (source line 800)

- **QA-01 Reconciliation-Readiness-Race behoben:** Ein frischer „Meine Anzeigen“-Tab wird nach `tab.status === "complete"` nicht mehr wegen eines transienten, noch nicht hydrierten `0 Anzeigen online`-Status sofort verworfen.
- Bei ansonsten korrekter Seite 1 und passender Profilbindung wird ein abweichender/noch nicht erkannter Online-Zähler lokal und begrenzt bis zu 12-mal im Abstand von 500 ms erneut gelesen. Sobald der erwartete Bestand stabil sichtbar ist, startet die unabhängige zweite Bestandsprüfung auf demselben frischen Tab.
- Falsche Seite, falsches Profil oder dauerhaft abweichender Bestand bleiben Fail-Closed. Nach maximal zwei frischen Quellen endet der Lauf weiterhin mit `needs-review`; `movedToTrash` bleibt 0. Ein tatsächlich erwarteter leerer Bestand (`expectedTotal = 0`) wird ohne künstliche Wartezeit akzeptiert.
- Safety-, Account-, H1/H2-, Lösch-, Publish- und Reconciliation-Mutationsgates bleiben unverändert. Basis ist ausdrücklich die kanonische v1.20.5; die frühere v1.20.6-Diagnoseversion wurde nicht als Source verwendet.
<!-- KAR170-END:CHANGELOG:800 -->

<!-- KAR170-BEGIN:README:528 -->
### Historical README: v1.20.7 – QA-01 Reconciliation-Readiness (source line 528)

Auf Basis der kanonischen v1.20.5 wartet die unabhängige zweite Bestandsprüfung nach einem vollständig geladenen frischen „Meine Anzeigen“-Tab zusätzlich auf einen stabilen lokalen Bestandsstatus. Ein transienter `0 Anzeigen online`-Zustand während der DOM-Hydrierung verbraucht dadurch nicht sofort einen Fresh-Source-Versuch. Dauerhafte Bestandsabweichungen bleiben unverändert sicher und führen ohne Papierkorbmutation zu `needs-review`.
<!-- KAR170-END:README:528 -->

## v1.20.5

<!-- KAR170-BEGIN:CHANGELOG:807 -->
### Original CHANGELOG: 1.20.5 – 2026-09-21 (source line 807)

- **Lifecycle-Race-Fix nach Low-Resource Phase 2:** Ein bereits gestarteter Content-Bootstrap wird nach einem planmäßigen Renewal-Target-Close nicht mehr als technischer Bootstrap-/Connection-Fehler protokolliert.
- `expectedControlledTabCloseEntry()` erkennt neben finalen `goneReason`-Tombstones jetzt auch den bereits vor `chrome.tabs.remove()` persistierten `closeIntentReason`. Damit ist der kontrollierte Close bereits während des physischen Tab-Schließens neutral klassifizierbar; ein aktiver Close-Intent gilt dafür höchstens 10 Sekunden.
- Sowohl der `executeScript`-Inject-Pfad (`No tab with id`) als auch der nachgelagerte Handshake (`Receiving end does not exist`) reklassifizieren einen inzwischen planmäßig geschlossenen Tab **vor** `CONTENT_SCRIPT_BOOTSTRAP_FAILED` zu `CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE` / `KR_TAB_EXPECTED_CLOSED`.
- Keine neue Performanceoptimierung: P6a, Bildtransport/IPC, Bildreihenfolge, Settling-, Publish-, Delete-, Reconciliation-, H1/H2- und Account-Semantik bleiben gegenüber v1.20.4 unverändert.
<!-- KAR170-END:CHANGELOG:807 -->

<!-- KAR170-BEGIN:README:532 -->
### Historical README: v1.20.5 – Lifecycle-Race-Fix nach Phase 2 (source line 532)

v1.20.5 ist ein bewusst kleiner Stabilitäts-Patch auf v1.20.4 und enthält **keine neue Performancephase**. Zwei im nativen v1.20.4-3er-Lauf beobachtete Expected-Close-Races werden geschlossen: Ein bereits gestarteter Content-Bootstrap kann nicht mehr nach einem planmäßigen `renewal-target-published`-Close als `CONTENT_SCRIPT_BOOTSTRAP_FAILED`/`BACKGROUND_REQUEST_*` eskalieren, weder beim `executeScript`-Inject (`No tab with id`) noch im anschließenden Handshake (`Receiving end does not exist`).

Die TabRegistry-Close-Intention aus v1.20.2 gilt nun bereits während des physischen `tabs.remove()` als erwarteter kontrollierter Close; aktive Close-Intents werden dabei auf ein 10-s-Fenster begrenzt, damit ein veralteter Intent keinen späteren echten Connection-Fehler neutralisieren kann. Bootstrap-/Handshake-Fehler prüfen diese Korrelation erneut **bevor** ein Fehlerdiagnoseevent geschrieben wird und enden neutral mit `KR_TAB_EXPECTED_CLOSED`. Dadurch entfallen auch unnötige Rest-Retries gegen einen bereits planmäßig geschlossenen Renewal-Target-Tab.

P6a Event-driven Tab Readiness, der 512-KiB-Bildtransport-Cache, die strikt sequenzielle serverseitige Bildanlage, 200-ms-Settling, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates bleiben gegenüber v1.20.4 unverändert.
<!-- KAR170-END:README:532 -->

## v1.20.4

<!-- KAR170-BEGIN:CHANGELOG:814 -->
### Original CHANGELOG: 1.20.4 – 2026-09-20 (source line 814)

- **Low-Resource Performance II / Phase 2:** P6a stellt Tab-Readiness von 250-ms-Polling auf `chrome.tabs.onUpdated` als Primärsignal um. Die fachliche Bedingung bleibt bewusst unverändert `tab.status === "complete"`; ein 2-s-Safety-/Recovery-Check bleibt erhalten.
- Eine Signal-Generation schließt den Race zwischen letzter Tab-Abfrage und dem Scharfschalten des Event-Waiters, ohne einen zusätzlichen Polling-Takt einzuführen. `tabs.onRemoved` weckt wartende Operationen ebenfalls sofort; vorhandene TabRegistry-/Expected-Close-Semantik bleibt erhalten.
- Der lokale Bildtransport Background → Content nutzt **512-KiB-Chunks** statt 256 KiB. Uploadreihenfolge, serverseitige Anlage und überlappende CDN-/Preview-Stabilisierung bleiben unverändert.
- Pro aktivem Bild wird Session-/Ownership-Berechtigung einmal validiert und das lokale Blob kurzzeitig in einem streng begrenzten Worker-Cache gehalten. Folgechunks lesen weder `templateFillSessions` noch dasselbe IndexedDB-Bild erneut. Nach dem letzten Chunk, Terminalzustand, Tab-Close oder TTL wird das Blob freigegeben.
- `getInventoryImage()` verwendet die bereits vorhandene geteilte IndexedDB-Verbindung. Bei Service-Worker-Neustart ist der Cache leer und der bestehende persistente Fallback greift automatisch.
- **Phase 3 – Manager UI/RAM** (P8 Preview-Lazy-Loading/LRU und P9 inkrementelles Rendering) bleibt bewusst offen.
<!-- KAR170-END:CHANGELOG:814 -->

<!-- KAR170-BEGIN:README:540 -->
### Historical README: v1.20.4 – Low-Resource Performance II, Phase 2: Event-driven Tab Readiness + Bildtransport/IPC (source line 540)

v1.20.4 lässt die fachliche Readiness-Bedingung bewusst unverändert bei `tab.status === "complete"`, wartet darauf aber primär ereignisgetrieben über `chrome.tabs.onUpdated` statt alle 250 ms `chrome.tabs.get()`/TabRegistry-Prüfungen auszulösen. Ein 2-s-Safety-/Recovery-Check bleibt als konservativer Fallback bestehen. Eine Signal-Generation verhindert, dass ein `complete`-Event im engen Fenster zwischen letzter Abfrage und Waiter-Registrierung erst beim Fallback bemerkt wird.

Der lokale Bildtransport verwendet 512-KiB-Chunks. Ein aktives Bild wird beim ersten Chunk gegen Fill-Session, Target-Tab und Inventory validiert und anschließend kurzzeitig im Background gecacht. Folgechunks desselben Bildes verursachen dadurch keine erneuten `templateFillSessions`-Reads und keine erneuten IndexedDB-Reads desselben Blobs. Der Cache ist auf zwei Einträge und 60 Sekunden begrenzt und wird nach dem letzten Chunk, Terminalzuständen und Tab-Schließung sofort bereinigt. Bei Service-Worker-Neustart fällt der Pfad automatisch auf die persistente IndexedDB zurück.

**Unverändert bleiben:** die 200-ms-Settling-Pausen, lokale Kategorie-Retries, strikte Bild-Uploadreihenfolge, serverseitige Bestätigung jeder Bildanlage, überlappende Preview-/CDN-Stabilisierung, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates.

Für den Low-Resource-Vergleich gilt erneut derselbe definierte 3er-Batch auf demselben alten Rechner nach Diagnose-Reset: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. Die kontrollierte Reihe liegt vor Phase 2 bei v1.20.0 = 134,17 s, v1.20.1 = 108,49 s, v1.20.2 = 110,26 s und v1.20.3 = **86,24 s**.
<!-- KAR170-END:README:540 -->

## v1.20.3

<!-- KAR170-BEGIN:CHANGELOG:823 -->
### Original CHANGELOG: 1.20.3 – 2026-09-20 (source line 823)

- **Low-Resource Performance II / Phase 1:** Der Renewal-/Storage-Hot-Path wird reduziert, ohne fachliche Workflow- oder Safety-Gates zu lockern.
- Normale Bild-Mikrofortschritte (`queued`, `uploading`, `checking`, `stable`) werden nicht mehr bei jedem Schritt als Recovery-Zustand durch `templateFillSessions`, Renewal-Session und Renewal-Skeleton persistiert. Fehler-, Verify-, Publish- und Terminalzustände bleiben dauerhaft.
- Der frühere direkte `touchMassRenewalProgressForFill()`-Pfad entfällt. Transienter Bildfortschritt wird pro Renewal über die bestehende 1,5-s-Mass-Batch-Koaleszierung zusammengefasst; terminale Zustände werden weiterhin sofort reconciled.
- Profilindex-Reads sowie Renewal-Skeleton-Reads/-Writes verwenden eine wiederverwendete IndexedDB-Verbindung für die Lebenszeit des Background-Service-Workers. Bei `versionchange` wird die Verbindung kontrolliert geschlossen und beim nächsten Zugriff neu geöffnet.
- Die indexbasierte 30-Tage-Papierkorb-Bereinigung cached den nächsten relevanten Expiry-Zeitpunkt. Solange kein Eintrag fällig sein kann, überspringen normale Inventar-/Papierkorb-Reads die zusätzliche Expiry-Abfrage. Neue Trash-Einträge und Frist-Resets invalidieren den Cache.
- Routine-Diagnoseevents werden stärker gebündelt: 1,2-s-Fenster und bis zu 120 Pending-Events. Der bereits persistierte Diagnosebestand wird pro Worker-Lebenszeit im Speicher gecacht, sodass Routine-Flushes nicht jedes Mal zuerst `chrome.storage.local` lesen. Warning/Error-, Safety-, Recovery- und terminale Events bleiben sofort persistent.
- **H3/P11 Event-driven Inventory DOM Scanning** ist als späterer Backlogpunkt festgehalten und bewusst nicht Teil dieses Releases.
<!-- KAR170-END:CHANGELOG:823 -->

<!-- KAR170-BEGIN:README:551 -->
### Historical README: v1.20.3 – Low-Resource Performance II, Phase 1: Renewal-/Storage-Hot-Path (source line 551)

v1.20.3 reduziert lokale CPU-, Storage- und IndexedDB-Arbeit während laufender Renewals, ohne die bewährte 200-ms-Settling-, Upload-, Publish-, Delete-, Reconciliation-, H1/H2- oder Account-Semantik zu verändern. Normale Bild-Mikrofortschritte (`queued`, `uploading`, `checking`, `stable`) bleiben sichtbar und werden für den Massenlauf koalesziert, werden aber nicht mehr bei jedem Schritt als Recovery-Zustand durch Fill-Session, Renewal-Session und Inventory-Skeleton persistiert. Fehlgeschlagene Bilder sowie Verify-/Publish-/Terminal-Meilensteine bleiben weiterhin dauerhaft.

Der bisherige direkte Mass-Batch-Touch aus jedem Template-Fill-Update entfällt. Nichtterminale Batch-Fortschritte laufen ausschließlich über die vorhandene 1,5-s-Koaleszierung; terminale Zustände bleiben sofort persistent. Profilbezogene Hot-Reads sowie Renewal-Skeleton-Reads/-Writes verwenden innerhalb der Service-Worker-Lebenszeit eine wiederverwendete IndexedDB-Verbindung mit sauberem `onversionchange`-Close.

Die automatische 30-Tage-Papierkorb-Bereinigung merkt sich nach einem indexbasierten Check den nächsten relevanten Ablaufzeitpunkt. Normale `LIST_INVENTORIES`-/`LIST_TRASH`-Reads führen dadurch bis zu diesem Zeitpunkt keine erneute Expiry-Query aus; neue oder verlängerte Papierkorb-Fristen invalidieren den Cache sicher. Routine-Diagnoseevents werden in größeren Batches gesammelt (1,2 s / bis 120 pending), und der bereits persistierte Diagnosebestand wird pro Service-Worker-Lebenszeit im Speicher gehalten, sodass nicht jeder Flush zuvor erneut `chrome.storage.local` lesen muss. Warning/Error- und Safety-/Recovery-/Terminalevents bleiben sofort persistent.

Für den Low-Resource-Vergleich gilt weiterhin derselbe definierte 3er-Batch auf demselben alten Rechner nach Diagnose-Reset: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**.

**Backlog H3/P11 – Event-driven Inventory DOM Scanning:** Die Vollinventur-/Listing-Erkennung soll später schrittweise von wiederholten 250-/500-ms-DOM-Scans auf `MutationObserver` als Primärsignal umgestellt werden; Polling bleibt Safety-/Recovery-Fallback. Dieser Punkt ist nicht Bestandteil von v1.20.3.
<!-- KAR170-END:README:551 -->

## v1.20.2

<!-- KAR170-BEGIN:CHANGELOG:834 -->
### Original CHANGELOG: 1.20.2 – 2026-09-20 (source line 834)

- **Expected-Close-Race behoben:** Die TabRegistry persistiert den beabsichtigten kontrollierten Close-Grund jetzt vor `chrome.tabs.remove()`. Ein unmittelbar eintreffendes `tabs.onRemoved` kann den Grund dadurch nicht mehr temporär zu einem generischen `tabs.onRemoved`/`KR_TAB_GONE` degradieren. Planmäßig geschlossene Renewal-/Worker-Tabs bleiben auch in diesem Race neutral diagnostiziert.
- **A7 IndexedDB-Indizes umgesetzt:** Das Datenbankschema steigt kontrolliert auf Version 2. Der Inventar-Store besitzt zusätzlich `profileId` sowie `trashExpiresAt` (`trash.expiresAt`) als Indizes; bestehende Datensätze werden von IndexedDB beim Schema-Upgrade automatisch in die Indizes aufgenommen, ohne fachliche Datenmigration.
- Profilbezogene `LIST_INVENTORIES`-/`LIST_TRASH`-Reads verwenden für normale Profile den `profileId`-Index statt den gesamten Inventar-Store per `getAll()` zu materialisieren. Nicht zugeordnete Legacy-Datensätze behalten einen sicheren Fallback.
- Die 30-Tage-Papierkorb-Bereinigung fragt abgelaufene Einträge direkt über `trashExpiresAt` ab, statt vor normalen Listenabfragen den gesamten Inventar-Store zu scannen.
- Weitere profilgebundene Pfade wurden auf den Index umgestellt: Profil löschen, Inventar leeren, Reconciliation-Kandidaten und der Delta-Erfassungs-Snapshot bekannter Anzeigen-IDs.
- Die Profil-Erkennung zählt nicht zugeordnete aktive Einträge per Cursor, ohne dafür `listInventories()` samt Papierkorb-Purge und globalen Array-Reads aufzurufen.
- Profilbackup/-Restore nutzt im Manager den Profilindex sowie den vorhandenen `images.inventoryId`-Index für Snapshots; direkte App-Datenbankzugriffe sind versionsneutral, damit ausschließlich der Background die Schema-Migration besitzt.
- **A6/P7 bleibt unverändert aktiv.** Renewal-Filler, 200-ms-Settling, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates werden durch A7 nicht gelockert.
<!-- KAR170-END:CHANGELOG:834 -->

<!-- KAR170-BEGIN:README:563 -->
### Historical README: v1.20.2 – A7 IndexedDB-Indizes + Expected-Close-Race (source line 563)

Auf der in v1.20.1 event-driven reduzierten Lifecycle-Arbeit setzt v1.20.2 **A7 IndexedDB-Indizes** um. Profilbezogene Inventar- und Papierkorb-Abfragen lesen reguläre Profile direkt über einen `profileId`-Index; die automatische Papierkorb-Bereinigung nutzt `trash.expiresAt` statt globaler Vollscans. Reconciliation, Delta-Erfassung und weitere profilgebundene Reads verwenden denselben gezielten Pfad. Bestehende Daten bleiben erhalten; das IndexedDB-Schema wird auf Version 2 angehoben und die neuen Indizes werden im Schema-Upgrade aufgebaut.

Zusätzlich ist der im v1.20.1-Low-Resource-Benchmark beobachtete **Expected-Close-Race** behoben. Der kontrollierte Close-Grund wird vor dem physischen Tab-Schließen persistiert, sodass ein nahezu gleichzeitig eintreffendes `tabs.onRemoved` keinen planmäßigen Renewal-Tab-Abschluss mehr als Warning/Error klassifizieren kann.

Für den Low-Resource-Vergleich soll auf demselben alten Rechner nach Diagnose-Reset wieder exakt der definierte 3er-Batch ausgeführt werden: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. v1.20.0 bleibt die kanonische Voroptimierungs-Baseline; v1.20.1 dokumentiert isoliert A6/P7; v1.20.2 zeigt den zusätzlichen A7-Effekt.
<!-- KAR170-END:README:563 -->

## v1.20.1

<!-- KAR170-BEGIN:CHANGELOG:845 -->
### Original CHANGELOG: 1.20.1 – 2026-09-20 (source line 845)

- **A6/P7 Event-driven Lifecycle/Health** ist als erster Low-Resource-Optimierungsblock umgesetzt. Fachliche Renewal-, Publish-, Delete-, Reconciliation-, H1/H2- und Account-Gates bleiben unverändert.
- Der Manager fragt `GET_BULK_RUN_STATUS` nicht mehr jede Sekunde ab. Der persistierte Bulk-Status wird einmal beim Start geladen und danach direkt über `chrome.storage.onChanged` für `bulkInventoryRun` aktualisiert.
- Änderungen am Massen-Neuinserierungs-Batch werden direkt aus `massRenewalBatchV1` übernommen. Das bisherige `mass-renewal-updated`-Signal löst dadurch keinen vollständigen Inventar-/Papierkorb-Refresh mehr aus. Inventaränderungen des eigentlichen Renewals bleiben weiterhin über die vorhandenen Renewal-Events sichtbar.
- Normale Inventar-Refreshes führen keinen zusätzlichen Bulk-Status-Read mehr aus. Dadurch entfallen weitere redundante Storage-/Background-Roundtrips.
- Die Account-/Tab-Gesundheitsprüfung bleibt ereignisgetrieben über `tabs.onUpdated`, `tabs.onActivated`, `tabs.onRemoved` und Plattform-Safety-Events. Der periodische Safety-/Recovery-Fallback wurde von 15 Sekunden auf **60 Sekunden** verlangsamt.
- Managed Worker werden im Manager aus dem persistenten `tabRegistryV1`-Session-Cache verfolgt. Account-Inspektionen müssen dafür nicht mehr bei jedem Health-Check `GET_MANAGED_WORKER_TAB_IDS` beim Background abfragen.
- Tab-Events von verwalteten Worker-Tabs und unbekannten inaktiven Tabs lösen keine teure Account-Inspektion mehr aus. Bekannte User-Tabs, aktive User-Tabs und relevante „Meine Anzeigen“-Tabs bleiben ereignisgetrieben beobachtet.
- A7 IndexedDB-Indizes ist bewusst **noch nicht** enthalten. Damit kann der definierte 3er-Benchmark auf dem alten Rechner den Effekt von A6/P7 isoliert gegen die v1.20.0-Baseline messen.
<!-- KAR170-END:CHANGELOG:845 -->

<!-- KAR170-BEGIN:README:571 -->
### Historical README: v1.20.1 – A6/P7 Event-driven Lifecycle/Health (source line 571)

Die erste Low-Resource-Phase reduziert wiederkehrende Hintergrundarbeit, ohne den bewährten Renewal-Ablauf aus v1.20.0 anzutasten. Der Manager pollt den Bulk-Erfassungsstatus nicht mehr im Sekundentakt, sondern übernimmt Änderungen direkt aus dem persistenten Storage-Event. Auch der Fortschritt von **Mehrere neu inserieren** wird aus dem Batch-Storage aktualisiert und löst nicht länger bei jedem Batch-Fortschritt einen vollständigen Inventar-/Papierkorb-Refresh aus.

Die Account-/Tab-Gesundheit bleibt primär ereignisgetrieben. Der periodische Safety-/Recovery-Check läuft nur noch alle **60 Sekunden** statt alle 15 Sekunden. Verwaltete Worker-Tabs werden aus dem `tabRegistryV1`-Session-Cache erkannt; ihre häufigen Navigations-/Lifecycle-Events lösen keine unnötige Account-Inspektion aus. Bekannte beziehungsweise aktive Nutzer-Tabs bleiben sofort beobachtet.

**A7 IndexedDB-Indizes ist in v1.20.1 noch nicht umgesetzt.** Nach Installation soll auf dem alten Rechner exakt derselbe Diagnose-Reset + 3er-Batch wie bei der v1.20.0-Baseline ausgeführt werden: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. Erst danach folgt A7, damit beide Effekte getrennt messbar bleiben.
<!-- KAR170-END:README:571 -->

## v1.20.0

<!-- KAR170-BEGIN:CHANGELOG:856 -->
### Original CHANGELOG: 1.20.0 – 2026-09-19 (source line 856)

- Der Bereich **Diagnose** besitzt zusätzlich die Aktion **Reset**. Sie beginnt bewusst eine neue persistente Diagnose-Messgrenze für reproduzierbare Benchmark- und Fehlerläufe.
- Beim Reset werden zuvor gepufferte Diagnoseeinträge zuerst abgeschlossen; anschließend werden alte Diagnose-/Galeriedaten aus dem aktiven Exportkontext entfernt und `DIAGNOSTIC_SESSION_RESET` als erster neuer Diagnosepunkt geschrieben.
- Der manuelle Diagnose-Beginn wird persistent gespeichert. Ein Service-Worker-Neustart während des anschließenden Laufs beendet daher nicht die bewusst gestartete Messgrenze; der Diagnoseexport umfasst weiterhin nur Daten ab dem letzten Reset.
- Reset ist während laufender Erfassung, Einzel-Erfassung, Neu-Inserierung/Massen-Neuinserierung oder Profiltransfer deaktiviert und wird im Background zusätzlich gegen persistierte laufende Workflows abgesichert. Eine Rückfrage ist bewusst nicht erforderlich.
- A6/P7 und A7 sind in dieser Version noch **nicht** umgesetzt. v1.20.0 dient als unveränderte funktionale Benchmark-Basis auf v1.19.8, bevor die Low-Resource-Optimierungen beginnen.
- Workflow-, Publish-, Delete-, Reconciliation-, H1/H2-, Account- und Safety-Gates bleiben unverändert.
<!-- KAR170-END:CHANGELOG:856 -->

<!-- KAR170-BEGIN:README:579 -->
### Historical README: v1.20.0 – Diagnose-Reset als Benchmark-Basis (source line 579)

Der Bereich **Diagnose** besitzt jetzt zusätzlich **Reset**. Damit kann unmittelbar vor einem definierten Test- oder Fehlerlauf eine neue Diagnose-Messgrenze begonnen werden. Zuvor gepufferte Diagnosen werden sauber abgeschlossen; ältere Diagnose- und Galeriedaten werden aus dem neuen Exportkontext entfernt. Der nächste Diagnoseexport enthält anschließend nur Daten ab diesem Reset.

Die Reset-Grenze wird persistent gespeichert. Ein Neustart des Extension-Service-Workers während des anschließenden Laufs verliert daher nicht die bewusst gesetzte Messgrenze. Während laufender Erfassung, Einzel-Erfassung, Neu-Inserierung/Massen-Neuinserierung oder Profiltransfer ist Reset gesperrt; eine Bestätigungsabfrage ist nicht erforderlich.

**A6/P7 Event-driven Lifecycle/Health und A7 IndexedDB-Indizes sind in v1.20.0 noch nicht umgesetzt.** Diese Version dient bewusst als funktional unveränderte Benchmark-Basis auf dem v1.19.8-Verhalten, bevor die Low-Resource-Optimierungen beginnen.
<!-- KAR170-END:README:579 -->

## v1.19.8

<!-- KAR170-BEGIN:CHANGELOG:865 -->
### Original CHANGELOG: 1.19.8 – 2026-09-18 (source line 865)

- Profil-Backups deduplizieren identische Bildpayloads physisch per SHA-256, ohne logische `imageKey`-/Inventarzuordnungen beim Restore zu verlieren; Manifest/Diagnose unterscheiden Bildreferenzen, eindeutige Bilddateien und eingesparte Bytes.
- Profil-Export und -Wiederherstellung verwenden einen exklusiven operationsgebundenen Transfer-Lock; parallele zustandsverändernde Manager-Aktionen sind währenddessen gesperrt.
- Abbruch des nativen Restore-Dateipickers lässt das Profilmanagement geöffnet und unverändert.
- Ungültige Profilbackup- und Anzeigen-ZIPs zeigen in Dialog und Activity Center verständliche Endanwendertexte; technische Ursachen bleiben diagnostisch protokolliert.
- Der reine Sicherheitshinweis im Renewal-Dialog verwendet neutrale Info-Semantik statt Amber-Warnoptik.
- Template-Fill führt nach erfolgreichen Feldinteraktionen eine 200-ms-Settling-Phase aus. Kategorie-Öffnungen erhalten kurze lokale Versuche entsprechend der bestehenden Einstellung `Versuche je Phase`, bevor der übergeordnete Retry-Pfad greift.
- Die DOM-/IndexedDB-Suite bleibt optional und wird bei fehlenden `linkedom`/`fake-indexeddb` explizit als SKIPPED behandelt.
<!-- KAR170-END:CHANGELOG:865 -->

<!-- KAR170-BEGIN:README:587 -->
### Historical README: v1.19.8 – Profiltransfer-Härtung und ruhigere Renewal-Interaktionen (source line 587)

Profil-Backups speichern identische Bildinhalte im ZIP jetzt physisch nur noch einmal, wenn ihre SHA-256-Prüfsumme identisch ist. Die logischen Bildreferenzen pro Anzeige bleiben vollständig erhalten und werden beim Restore wieder separat hergestellt. Das Backup-Manifest dokumentiert Bildreferenzen, eindeutige Bilddateien und die durch Deduplizierung eingesparten Bytes. Bestehende Profilsicherungen bleiben importierbar.

Profil sichern und Profil aus Sicherung wiederherstellen verwenden während der laufenden Operation einen exklusiven, operationsgebundenen Transfer-Lock. Währenddessen sind andere zustandsverändernde Manager-Aktionen gesperrt. Abbruch des nativen Dateipickers lässt das Profilmanagement geöffnet und verändert keine Daten. Ungültige Profilsicherungen bzw. Anzeigenexporte zeigen in Dialog und Activity Center nur verständliche Endanwendertexte; technische Parserdetails bleiben in der Diagnose.

Beim Renewal wartet der Template-Filler nach erfolgreich gesetzten interaktiven Feldern bewusst **200 ms**, bevor die nächste UI-Interaktion beginnt. Das Öffnen der Kategorie verwendet zunächst kurze lokale Interaktionsversuche gemäß der bestehenden Konfiguration **Versuche je Phase**; jedes Mal wird das Control frisch aus dem DOM aufgelöst. Erst nach Ausschöpfen dieser lokalen Versuche greift der übergeordnete Retry-/Recovery-Pfad. Der reine Sicherheitshinweis im Renewal-Dialog wird neutral statt amber dargestellt.

Die DOM-/IndexedDB-Suite bleibt bewusst **optional**: Ist `linkedom`/`fake-indexeddb` vorhanden, wird sie mit ausgeführt; fehlen die Pakete, wird sie als SKIPPED dokumentiert und blockiert den Release nicht.
<!-- KAR170-END:README:587 -->

## v1.19.7

<!-- KAR170-BEGIN:CHANGELOG:875 -->
### Original CHANGELOG: 1.19.7 – 2026-09-18 (source line 875)

- Der geöffnete Bereich **Aktionen** verwendet nach seiner Öffnungs-/Schließanimation wieder die natürliche Inhaltshöhe. Neue Status-/Ergebniskacheln vergrößern den Bereich dadurch automatisch; entfernte Kacheln lassen ihn ohne Leerraum wieder schrumpfen.
- **Weitere Meldungen anzeigen** bleibt als stabiler Verlaufszugang immer sichtbar und zeigt rechts einen kompakten Bestandszähler. Ein leerer Verlauf zeigt bewusst `0`; bei einer wegen der Obergrenze gekürzten Historie wird `250+` angezeigt.
- Der Meldungsverlauf wird automatisch auf **30 Tage** und höchstens **250 gespeicherte Einträge** begrenzt. Ein persistierter Overflow-Status unterscheidet exakt `250` von `250+`.
- Jede historische Meldung besitzt oben rechts ein kleines **×** und kann ohne Rückfrage einzeln dauerhaft gelöscht werden. Das Entfernen blendet und klappt die Karte kurz aus; bei `prefers-reduced-motion` erfolgt es ohne Animation.
- Workflow-, Publish-, Delete-, Reconciliation-, H1/H2-, Account- und Safety-Gates bleiben unverändert.
<!-- KAR170-END:CHANGELOG:875 -->

<!-- KAR170-BEGIN:README:597 -->
### Historical README: v1.19.7 – dynamischer Aktionenbereich und begrenzter Meldungsverlauf (source line 597)

Der geöffnete Bereich **Aktionen** passt seine Höhe nach der Akkordeonanimation wieder automatisch an den tatsächlichen Inhalt an. Wird eine Status-/Ergebniskachel eingeblendet, wächst der Bereich; wird sie entfernt, schrumpft er wieder. Die Animationshöhe bleibt nach dem Öffnen nicht mehr als wirksamer WAAPI-Fill-Effekt stehen.

**Weitere Meldungen anzeigen** bleibt dauerhaft sichtbar und zeigt einen kompakten Zähler. Bei leerem Verlauf steht dort bewusst **0**. Die Historie wird automatisch auf die letzten **30 Tage** und höchstens **250 gespeicherte Meldungen** begrenzt; wenn wegen der Obergrenze ältere Meldungen verworfen wurden, zeigt der Zähler **250+**. Jede historische Meldung kann über ein kleines **×** ohne Rückfrage dauerhaft entfernt werden. Die Karte blendet dabei kurz aus und klappt zusammen; reduzierte Bewegungseinstellungen werden respektiert.

Die Sicherheits- und Workflow-Gates aus v1.19.6 bleiben unverändert.
<!-- KAR170-END:README:597 -->

## v1.19.6

<!-- KAR170-BEGIN:CHANGELOG:882 -->
### Original CHANGELOG: 1.19.6 – 2026-09-18 (source line 882)

- Die Seitenleiste zeigt im Bereich Aktionen nur noch eine aktuelle Status- oder Ergebniskachel. Frühere Meldungen werden beim Wechsel in einen persistenten Meldungsverlauf verschoben und über die kompakte Aktion „Weitere Meldungen anzeigen“ in einem Modal zugänglich.
- Laufende Erfassungen, minimierte Erfassungen, Renewal-Fortschritt und Abschlussmeldungen werden über eine gemeinsame Anzeige-Arbitration geführt, sodass keine konkurrierenden Kacheln mehr gleichzeitig Platz belegen.
- Der Erfassungsdialog verwendet „Auswahl im Überblick“ als dynamische Zusammenfassung aller vier Kombinationen aus Erfassungsumfang und Prüfmodus. In Fortschritt und Ergebnis erscheint dieselbe Auswahl neutral statt als gelbe Hinweisleiste; im Ergebnis wird in Vergangenheitsform zusammengefasst.
- Das Manager-Fenster startet mit einer festen ergonomischen Größe von 1180 × 900 Pixeln. Die Chrome-Extension-API bietet keine native minWidth/minHeight-Grenze; bewusst wird keine Resize-Rücksprung-Emulation eingesetzt.
<!-- KAR170-END:CHANGELOG:882 -->

<!-- KAR170-BEGIN:README:605 -->
### Historical README: v1.19.6 – kompakter Statusbereich, Meldungsverlauf und Auswahlübersicht (source line 605)

Im Bereich **Aktionen** ist jetzt höchstens eine aktuelle Status- oder Ergebniskachel sichtbar. Beginnt ein neuer Vorgang oder ersetzt ein neuer Zustand das bisherige Ergebnis, wandert die vorherige Meldung in den persistenten **Meldungsverlauf**. Die schmale Aktion **Weitere Meldungen anzeigen** öffnet dafür ein eigenes Modal. Technische Diagnoseereignisse bleiben weiterhin getrennt im Diagnoseexport.

Der Dialog **Alle laufenden Anzeigen erfassen** fasst die gewählte Kombination aus Erfassungsumfang und Prüfmodus unter **Auswahl im Überblick** verständlich zusammen. Während Fortschritt und Ergebnis wird dieselbe Auswahl neutral dargestellt; nach Abschluss verwendet die Zusammenfassung Vergangenheitsform statt Warnfarb-Semantik.

Das Manager-Fenster öffnet neu mit **1180 × 900 Pixeln**. Chrome Extensions unterstützen bei `chrome.windows` keine echte native Mindestbreite/-höhe; deshalb wird bewusst keine Resize-Emulation verwendet, die das Fenster beim Verkleinern sichtbar zurückspringen lassen würde. Das bestehende responsive Layout bleibt erhalten.
<!-- KAR170-END:README:605 -->

## v1.19.5

<!-- KAR170-BEGIN:CHANGELOG:888 -->
### Original CHANGELOG: 1.19.5 – 2026-09-18 (source line 888)

- Jede neue Erfassung startet in einem frisch geöffneten, verwalteten „Meine Anzeigen“-Tab; paginierte Tabs vorheriger Erfassungen werden nicht wiederverwendet oder neu geladen.
- Der frische Inventur-Tab wird intern auf Konto, PROJECTS-Ansicht und Seite 1 geprüft. Der Start-Recovery ist auf zwei frische Tabs begrenzt; Reload-Schleifen sind ausgeschlossen.
- Der Erfassungs-Stepper steht jetzt stabil direkt unter der Einleitung; Schritt 1 heißt „Einstellungen“. Wechselnde Inhalte scrollen in einem eigenen Inhaltsbereich, während Orientierung und Aktionen stabil bleiben.
<!-- KAR170-END:CHANGELOG:888 -->

<!-- KAR170-BEGIN:README:614 -->
### Historical README: v1.19.5 – frischer Start jeder Erfassung und stabiler Fortschritt (source line 614)

Jede neue Erfassung öffnet jetzt einen eigenen verwalteten „Meine Anzeigen“-Hintergrundtab. Ein Tab aus einer vorherigen Erfassung wird nicht mehr wiederverwendet oder neu geladen. Vor dem Start prüft die Erweiterung intern weiterhin das erwartete Kleinanzeigen-Konto, die PROJECTS-Ansicht und Seite 1. Ein fehlgeschlagener Start ist auf höchstens zwei frische Tabs begrenzt; Reload-Schleifen sind ausgeschlossen.

Der Erfassungsdialog wurde außerdem strukturell harmonisiert: Der Fortschritt steht direkt unter der Einleitung und bleibt beim Wechsel zwischen den Schritten an derselben Stelle. Schritt 1 heißt **Einstellungen**. Nur der wechselnde Schrittinhalt scrollt; die Orientierung und die Aktionsleiste bleiben stabil.

Das bestehende Account-Gate vor dem Start, Delta-/Vollerfassung, Schnell-/Vollprüfung, H1/H2 und die sichere Phase-3-Reconciliation bleiben unverändert.
<!-- KAR170-END:README:614 -->

## v1.19.4

<!-- KAR170-BEGIN:CHANGELOG:893 -->
### Original CHANGELOG: 1.19.4 – 2026-09-18 (source line 893)

- **Phase 3 / Bestand bestätigen:** Der zweite unabhängige Bestandsabgleich verwendet immer einen frisch erzeugten, verwalteten „Meine Anzeigen“-Hintergrundtab statt den vom ersten Scan paginierten Quelltab wiederzuverwenden.
- Vor dem zweiten Scan werden PROJECTS-Ansicht, bestätigtes Kleinanzeigen-Konto, `currentPage === 1` und die erwartete Online-Anzahl explizit geprüft. Erst danach startet die zweite vollständige ID-Prüfung.
- Der bisherige Page-1-Reset per `location.replace(MY_ADS_PROJECTS_URL)` und die daraus mögliche Reload-Schleife wurden entfernt.
- Recovery ist streng begrenzt: maximal zwei frische Phase-3-Quelltabs insgesamt. Scheitern beide, endet die Erfassung mit **Prüfung nötig**, `movedToTrash: 0` und ohne Reconciliation-Mutation.
- Der erste paginierte Quelltab wird nach erfolgreichem Übergang kontrolliert beendet; der Phase-3-Tab läuft über die bestehende TabRegistry-/Controlled-Close-Logik. H1/H2 gelten auch für diesen neuen Source-Lifecycle.
- Neuer RED→GREEN-Regressionstest deckt den realen Mehrseitenfall ab: erster Scan endet auf Seite 3, erster frischer Recovery-Versuch kann ungültig sein, zweiter frischer Tab auf Seite 1 startet den Bestandsabgleich; zwei ungültige frische Starts führen sicher zu `needs-review`.
- Delta-Erfassung, Schnell-/Vollprüfung, Reconciliation-Gates, Publish-/Delete-Gates, Extension-ID, Manifest-Key, Permissions und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:893 -->

<!-- KAR170-BEGIN:README:622 -->
### Historical README: v1.19.4 – frischer Phase-3-Tab für den sicheren Bestandsabgleich (source line 622)

Die zweite Bestandsprüfung **Bestand bestätigen** verwendet nicht mehr den bereits durch Seite 1, 2, 3 usw. navigierten Quelltab. Nach Abschluss der eigentlichen Erfassung wird für Phase 3 ein **frischer Hintergrundtab** mit „Meine Anzeigen“ geöffnet. Dadurch hängt der zweite Scan nicht mehr vom im vorherigen Tab erhaltenen Paginierungszustand ab.

Vor Beginn des zweiten Scans werden die neue „Meine Anzeigen“-Ansicht, der PROJECTS-Tab, das erwartete Kleinanzeigen-Konto, **Seite 1** und die erwartete Online-Anzahl ausdrücklich geprüft. Erst nach erfolgreicher Verifikation beginnt der zweite vollständige ID-Bestandsabgleich. Die ID-Menge der ersten Seite wird nicht als Gleichheits-Gate verwendet; maßgeblich bleibt der vollständige Vergleich beider Bestände.

Der bisherige Reset über `location.replace()` entfällt vollständig. Schlägt der frische Start transient fehl, ist genau ein weiterer frischer Tab als Recovery erlaubt. Danach endet die Erfassung sicher mit **Prüfung nötig**; bereits gespeicherte Daten bleiben erhalten und es findet keine automatische Reconciliation beziehungsweise Papierkorb-Verschiebung statt. Damit werden H3 (keine Reload-Schleifen) und H4 (keine Bereinigung nach unvollständigem Bestandsabgleich) weiter gehärtet.

Delta-Erfassung, Schnell-/Vollprüfung, H1/H2, kontrollierter Stopp, Publish-/Delete-Gates und die übrige v1.19.3-Logik bleiben unverändert.
<!-- KAR170-END:README:622 -->

## v1.19.3

<!-- KAR170-BEGIN:CHANGELOG:903 -->
### Original CHANGELOG: 1.19.3 – 2026-09-18 (source line 903)

- Der Dialog **Alle laufenden Anzeigen erfassen** fasst **Erfassungsumfang** und **Prüfmodus** jetzt in einer gemeinsamen Box **Einstellungen für diese Erfassung** zusammen. Die Reihenfolge bleibt bewusst **Was → Wie**.
- Beim **Erfassungsumfang** steht der feste Standard **Nur neue Anzeigen erfassen** jetzt an erster Stelle. Die vollständige Alternative heißt endanwenderfreundlich **Gesamten Bestand neu einlesen**.
- Die Beschreibungstexte beider Erfassungsumfänge wurden gekürzt und klar gegeneinander abgegrenzt. Ein zusätzlicher Hinweis erklärt, dass für regelmäßige Erfassungen meist **Nur neue Anzeigen erfassen** ausreicht.
- Die Texte für **Schnellprüfung** und **Vollprüfung** wurden ebenfalls vereinfacht: Schnellprüfung beschreibt den schnelleren Ablauf mit weniger Zusatzprüfungen und möglichen abgeleiteten Angaben; Vollprüfung nennt die direkte Prüfung aller verfügbaren Angaben.
- Sichtbare Begriffe **Massenlauf** und **Inventurlauf** wurden aus Runtime-Meldungen entfernt. Inventurmeldungen verwenden konsequent **Erfassung**; beim gemeinsamen Neu-Inserieren werden je nach Kontext **Neu inserieren** oder **Vorgang** verwendet.
- Die in v1.19.2 eingeführte Delta-/Vollerfassungslogik, Reconciliation, H1/H2, kontrollierter Stopp sowie Publish-/Delete-Sicherheitsgrenzen bleiben funktional unverändert.
<!-- KAR170-END:CHANGELOG:903 -->

<!-- KAR170-BEGIN:README:632 -->
### Historical README: v1.19.3 – kompakter Erfassungsdialog und konsistente Endanwender-Sprache (source line 632)

Der Dialog **Alle laufenden Anzeigen erfassen** bündelt die beiden Einstellungen für den aktuellen Vorgang in einer gemeinsamen Box **Einstellungen für diese Erfassung**. Zuerst wird unter **Erfassungsumfang** festgelegt, was eingelesen werden soll; darunter bestimmt der **Prüfmodus**, wie geprüft wird.

Der Standard **Nur neue Anzeigen erfassen** steht bei jedem Öffnen an erster Stelle. Die bewusste Vollerfassung heißt **Gesamten Bestand neu einlesen**. Die Begleittexte sind kürzer und erklären direkt, ob bereits gespeicherte Anzeigen unangetastet bleiben oder vollständig neu eingelesen werden. Schnellprüfung und Vollprüfung verwenden ebenfalls kürzere, nutzenorientierte Beschreibungen.

Sichtbare technische Begriffe wie **Massenlauf** und **Inventurlauf** wurden aus Runtime-Meldungen entfernt. Inventurmeldungen sprechen konsequent von **Erfassung**; das gemeinsame Neu-Inserieren wird konkret als **Neu inserieren** oder neutral als **Vorgang** bezeichnet.

Die Logik aus v1.19.2 bleibt unverändert: Delta-Erfassung erkennt bestehende Anzeigen weiterhin ausschließlich über die Anzeigen-ID, der vollständige doppelte Bestandsabgleich bleibt erhalten, und Prüfmodusänderungen im Dialog wirken nur auf die aktuelle Erfassung. H1/H2, kontrollierter Stopp und alle Publish-/Delete-Sicherheitsgrenzen bleiben bestehen.
<!-- KAR170-END:README:632 -->

## v1.19.2

<!-- KAR170-BEGIN:CHANGELOG:912 -->
### Original CHANGELOG: 1.19.2 – 2026-09-18 (source line 912)

- Der Dialog **Alle laufenden Anzeigen erfassen** trennt jetzt nach dem Prinzip „Was, dann Wie“ zuerst den **Erfassungsumfang** und anschließend den **Prüfmodus**.
- **Nur neue Anzeigen erfassen** ist bei jedem Öffnen des Dialogs bewusst der Standard. Bereits aktive Einträge desselben Inventarprofils werden ausschließlich anhand ihrer numerischen Anzeigen-ID erkannt und ohne Bearbeiten-/Detail-Worker übersprungen; nur unbekannte Anzeigen-IDs werden vollständig neu erfasst. Bei einem neuen oder leeren Profil sind dadurch automatisch alle gefundenen Anzeigen neu und werden vollständig erfasst.
- **Alle Anzeigen aktualisieren** muss für jeden Lauf ausdrücklich neu gewählt werden und entspricht der bisherigen vollständigen Erfassung aller laufenden Anzeigen. Die Auswahl des Erfassungsumfangs wird nicht persistent gespeichert.
- Der **Prüfmodus** wird beim Öffnen einmalig aus der Konfiguration übernommen. Eine Umschaltung zwischen Schnellprüfung und Vollprüfung im Dialog gilt ausschließlich für diesen Lauf und verändert die Konfiguration nicht.
- Delta-/Neu-Erfassung reduziert nur die Detail-Inventarisierung. Der erste vollständige ID-Bestand und die zweite unabhängige Bestandsbestätigung bleiben über alle laufenden Anzeigen erhalten; Reconciliation-/Papierkorb-Gates werden nicht gelockert.
- Fortschritt und Ergebnis weisen übersprungene, bereits vorhandene Anzeigen separat aus. Der kontrollierte Stopp aus v1.19.1 und H1/H2 bleiben unverändert wirksam.
<!-- KAR170-END:CHANGELOG:912 -->

<!-- KAR170-BEGIN:README:642 -->
### Historical README: v1.19.2 – Erfassungsumfang: neue Anzeigen oder vollständige Aktualisierung (source line 642)

Der Dialog **Alle laufenden Anzeigen erfassen** fragt jetzt zuerst **was** erfasst werden soll und danach **wie** geprüft werden soll. Unter **Erfassungsumfang** stehen **Nur neue Anzeigen erfassen** und **Alle Anzeigen aktualisieren** zur Wahl. **Nur neue Anzeigen erfassen** ist bei jedem Öffnen des Dialogs erneut der Standard und wird nicht als dauerhafte Einstellung gespeichert.

Im Standardmodus werden bereits aktive Anzeigen des ausgewählten Inventarprofils anhand ihrer Anzeigen-ID erkannt und bei der Detail-Erfassung übersprungen. Nur bislang unbekannte Anzeigen-IDs werden vollständig eingelesen. Bei einem neuen oder leeren Profil sind keine Anzeigen-IDs bekannt; deshalb werden dort automatisch alle gefundenen laufenden Anzeigen vollständig erfasst. Wer auch bereits gespeicherte Anzeigen neu einlesen möchte, wählt für den jeweiligen Lauf ausdrücklich **Alle Anzeigen aktualisieren**.

Der darunterliegende **Prüfmodus** übernimmt beim Öffnen den in der Konfiguration hinterlegten Standard für Schnellprüfung oder Vollprüfung. Eine Änderung im Erfassungsdialog gilt nur für den gestarteten Lauf und schreibt nicht in die Konfiguration zurück. Beide Erfassungsumfänge können mit beiden Prüfmodi kombiniert werden.

Die Optimierung betrifft ausschließlich die teure Detail-Erfassung. Der vollständige erste Anzeigen-ID-Bestand und die unabhängige zweite Bestandsbestätigung bleiben bestehen. Dadurch bleiben die Reconciliation-Sicherheitsgrenzen erhalten: Nur zwei vollständige, übereinstimmende Bestände dürfen eine automatische Verschiebung nicht mehr online vorhandener lokaler Anzeigen in den Papierkorb freigeben. H1/H2 und der kontrollierte Inventur-Stopp aus v1.19.1 bleiben unverändert.
<!-- KAR170-END:README:642 -->

## v1.19.1

<!-- KAR170-BEGIN:CHANGELOG:922 -->
### Original CHANGELOG: 1.19.1 – 2026-09-18 (source line 922)

- **HARDENING H1:** Die bekannte Sperrseite „IP-Bereich vorübergehend gesperrt“ wird über einen gemeinsamen, bewusst engen Detector als eigener Plattform-Sperrstatus klassifiziert; generische Hilfe-/Fehlertexte werden nicht fälschlich als Sperre erkannt.
- **HARDENING H2:** Eine bestätigte Plattform-Sperre setzt einen persistenten globalen Safety-Stop. Neue automatisierte Kleinanzeigen-Tabs/-Navigationen und Remote-Workflow-Aktionen werden blockiert; laufende Bulk-, Renewal-, Archiv-, Fill- und Massenläufe werden sicher terminalisiert. Nach Service-Worker-Neustart erfolgt keine automatische Wiederaufnahme.
- Lokale Funktionen bleiben nutzbar. Eine erneute Plattformprüfung wird nicht automatisch geplant, sondern ausschließlich durch die sichtbare Nutzeraktion **Erneut prüfen** ausgelöst.
- Vollinventur erhält **Nach aktueller Anzeige stoppen**: Die aktuelle Anzeige wird vollständig abgeschlossen, danach startet keine weitere Anzeige; der Bestandsabgleich wird übersprungen und das Ergebnis weist bearbeitete sowie nicht bearbeitete Anzeigen transparent aus.
- Plattform-Sperren erzeugen einen eigenen Diagnose-/Fehlercode statt als gewöhnlicher Ladefehler in normale Retry-Schleifen zu fallen.
- PERFORMANCE-5 aus v1.19.0, Reconciliation-Gates, Profil-Backup, Publish-/Delete-Sicherheitsgrenzen, Extension-ID, Manifest-Key, Permissions und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:922 -->

<!-- KAR170-BEGIN:README:652 -->
### Historical README: v1.19.1 – HARDENING H1/H2: Plattform-Sperren und kontrollierter Safety-Stop (source line 652)

v1.19.1 erkennt die bekannte Kleinanzeigen-Sperrseite **„IP-Bereich vorübergehend gesperrt“** als eigenen Safety-Zustand. Eine erkannte Sperre wird nicht wie ein normaler Lade- oder Transportfehler behandelt und deshalb nicht von den üblichen Retry-Schleifen erneut angefragt. Der Zustand wird persistent gespeichert, damit ein Service-Worker-Neustart keine automatischen Abläufe wieder aufnimmt.

Sobald die Sperre eindeutig erkannt ist, greift ein globaler Kleinanzeigen-Safety-Stop: Neue automatisierte Kleinanzeigen-Tabs, Navigationen und Remote-Workflow-Aktionen werden blockiert; laufende Inventur-, Renewal-, Vorlagen-, Archiv- und Massenläufe werden in einen sicheren Endzustand überführt. Lokale Funktionen wie Inventar/Papierkorb ansehen, Sicherungen und Diagnose bleiben verfügbar. Eine erneute Prüfung erfolgt ausschließlich auf ausdrückliche Nutzeraktion über **Erneut prüfen**.

Die Vollinventur erhält zusätzlich **Nach aktueller Anzeige stoppen**. Ein angeforderter Stopp lässt die gerade bearbeitete Anzeige vollständig zu Ende laufen, startet danach keine weitere Anzeige und überspringt den Bestandsabgleich. Bereits aktualisierte Anzeigen bleiben erhalten; das Ergebnis zeigt transparent, wie viele Anzeigen abgeschlossen und wie viele nicht mehr bearbeitet wurden.

PERFORMANCE-5 aus v1.19.0 bleibt unverändert. PERFORMANCE-6 bleibt offen; P7 bleibt als Teilpaket von A6 geführt.
<!-- KAR170-END:README:652 -->

## v1.19.0

<!-- KAR170-BEGIN:CHANGELOG:931 -->
### Original CHANGELOG: 1.19.0 – 2026-09-18 (source line 931)

- **PERFORMANCE-5:** Bild-Uploads beim Neu-Inserieren bleiben strikt sequenziell; nach bestätigter serverseitiger Anlage wird die Preview-/CDN-Stabilisierung eines Bildes jedoch vom nächsten Upload entkoppelt und darf überlappend weiterlaufen.
- Vor dem finalen Erfolgsgate werden alle ausstehenden Preview-Stabilisierungen vollständig abgewartet. Die bestehende Endprüfung auf vollständige Bildanzahl, terminal stabile Vorschauen und Reihenfolge bleibt verpflichtend.
- Keine parallelen Bild-Uploads; ein fehlgeschlagener serverseitiger Upload bricht weiterhin ab, bevor nachfolgende Positionen verschoben werden könnten.
- PERFORMANCE-6 bleibt offen. PERFORMANCE-7 wird künftig als Teilpaket von A6 „Event-driven Lifecycle/Health“ geführt und ist nicht Bestandteil dieses Builds.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions, Renewal-/Publish-/Delete-Gates, Reconciliation, Profil-Backup und Prüfmodi bleiben unverändert.
<!-- KAR170-END:CHANGELOG:931 -->

<!-- KAR170-BEGIN:README:662 -->
### Historical README: v1.19.0 – PERFORMANCE-5: schnellere Bildpipeline (source line 662)

Beim Neu-Inserieren bleiben Bild-Uploads weiterhin strikt nacheinander. Sobald ein Bild serverseitig angelegt ist, muss seine Vorschau-/CDN-Stabilisierung den Upload des nächsten Bildes jedoch nicht mehr blockieren. Bereits angelegte Bilder dürfen im Hintergrund weiter stabilisieren, während das nächste Bild hochgeladen wird.

Vor einem erfolgreichen Abschluss werden weiterhin alle ausstehenden Vorschauprüfungen zusammengeführt. Die verpflichtende Endkontrolle auf vollständige Bildanzahl, stabile Vorschauen und korrekte Reihenfolge bleibt unverändert. Es gibt weiterhin keine parallelen Bild-Uploads.

PERFORMANCE-6 bleibt offen. Das frühere PERFORMANCE-7 wird nicht mehr separat geführt, sondern als Teilpaket von **A6 – Event-driven Lifecycle/Health**.
<!-- KAR170-END:README:662 -->

## v1.18.4

<!-- KAR170-BEGIN:CHANGELOG:939 -->
### Original CHANGELOG: 1.18.4 – 2026-09-18 (source line 939)

- UX-/Text-Polish ohne Änderung der Workflow- oder Sicherheitslogik: sichtbare Schnell-/Vollprüfungs-Hinweise erklären Nutzen und Konsequenz ohne interne Begriffe wie Read-only-Tab, Remote-Bestand oder Vollscan.
- Die Badge **Abgeleitet** ist kompakter und als gelb/amberfarbener Hinweis gestaltet. Ihr Tooltip lautet kurz und handlungsorientiert: **„Aus Enddatum berechnet. Mit „Daten aktualisieren“ direkt prüfen.“**
- Der Bestandsabgleich wird in der Oberfläche als zweite Sicherheitsprüfung erklärt; bei Abweichung wird verständlich mitgeteilt, dass nichts automatisch in den Papierkorb verschoben wurde.
- Profilverwaltung verwendet **Profil sichern**, **Profil aus Sicherung wiederherstellen** und **Profil entfernen**. Sicherungs-/Wiederherstellungs-Fehlertexte folgen derselben Endanwender-Terminologie.
- Massen-Neuinserat verwendet kürzere Texte wie **Reihenfolge**, **Die Anzeigen werden von oben nach unten neu inseriert.** und **Anzeigen werden neu inseriert …**; die ZIP-Schnellprüfung nennt den übersprungenen Schritt **Zusätzliche Inhaltsprüfung wird übersprungen**.
- Renewal-Fortschritt verzichtet auf die unnötige Vorsilbe „Automatischer“; sichtbare Inventarisierungs-Texte werden auf **Erfassung** vereinheitlicht.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions, Prüfmodi, Retry-Semantik, Reconciliation, Profil-Backup-Datenformat, Publish-/Delete-Gates und Taskleisten-Identität bleiben unverändert.
<!-- KAR170-END:CHANGELOG:939 -->

<!-- KAR170-BEGIN:README:670 -->
### Historical README: v1.18.4 – Endanwenderfreundliche Texte und kompaktere Hinweise (source line 670)

v1.18.4 überarbeitet ausschließlich sichtbare UX-Texte und die Darstellung der **Abgeleitet**-Kennzeichnung. Schnell- und Vollprüfung erklären jetzt den jeweiligen Nutzen ohne interne Browser-/Workflow-Begriffe. Der Bestandsabgleich wird als zweite Sicherheitsprüfung beschrieben und nennt bei Abweichungen direkt die Konsequenz: Es wird nichts automatisch in den Papierkorb verschoben.

Die Badge **Abgeleitet** ist kleiner und gelb/amberfarben. Der Tooltip führt direkt zur passenden Aktion: **„Aus Enddatum berechnet. Mit „Daten aktualisieren“ direkt prüfen.“**

Im Profilmanagement heißen die Aktionen **Profil sichern**, **Profil aus Sicherung wiederherstellen** und **Profil entfernen**. Massen-Neuinserat, Austauschfortschritt und Erfassungsdialoge verwenden kürzere, konsistente Begriffe. Der ZIP-Schnellmodus bezeichnet die ausgelassene Kontrolle als **Zusätzliche Inhaltsprüfung wird übersprungen**.

Die zugrunde liegende Workflow-, Prüf-, Backup-, Reconciliation-, Retry-, Publish- und Löschlogik ist gegenüber v1.18.3 unverändert.
<!-- KAR170-END:README:670 -->

## v1.18.3

<!-- KAR170-BEGIN:CHANGELOG:949 -->
### Original CHANGELOG: 1.18.3 – 2026-09-18 (source line 949)

- **In Papierkorb** behebt den nach erfolgreichem IndexedDB-Commit auftretenden `ReferenceError: trashed is not defined`: `moveInventoryToTrash()` verwendet nach der Transaktion ausschließlich den aufgelösten Promise-Rückgabewert. Der Fehler wurde mit einem gezielten Runtime-Regressionstest gegen v1.18.2 reproduziert und anschließend GREEN abgesichert.
- Der Dialog **Alle laufenden Anzeigen erfassen** zeigt den aktiven Prüfmodus vor dem Start sowie während Fortschritt und Ergebnis sichtbar an. Schnellprüfung erklärt den entfallenden öffentlichen Read-only-Tab und die mögliche Ableitung von `Anzeige vom`; Vollprüfung erklärt die direkte Read-only-Verifikation. Laufende/reopenete Bulk-Läufe verwenden dafür ihren persistierten `verificationMode`.
- Im Massen-Neuinserat stehen die drei Reihenfolgeaktionen ganz rechts als gemeinsame Gruppe **[Drag][↑][↓]**.
- Schnellinventur-Heuristik, Reconciliation, Profil-Backup/-Restore, globale Retry-Konfiguration, Modal-Scroll-Lock, Taskleisten-Identität sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:949 -->

<!-- KAR170-BEGIN:README:680 -->
### Historical README: v1.18.3 – Papierkorb-Fix, transparenter Inventur-Prüfmodus und kompakte Reihenfolgeaktionen (source line 680)

Der manuelle **In Papierkorb**-Pfad gibt nach erfolgreichem IndexedDB-Commit wieder den tatsächlich verschobenen Datensatz zurück. Damit kann ein bereits erfolgreich in den Papierkorb geschriebener Datensatz nicht mehr durch den nachgelagerten `ReferenceError: trashed is not defined` als fehlgeschlagen gemeldet werden. Derselbe Helper ist damit auch für den lokalen Renewal-Kandidaten-Entfernungspfad wieder korrekt.

Der Dialog **Alle laufenden Anzeigen erfassen** zeigt den für den Lauf geltenden Prüfmodus jetzt dauerhaft sichtbar an. In der **Schnellprüfung** wird transparent erklärt, dass der öffentliche Read-only-Tab pro Anzeige entfällt und `Anzeige vom` bei Bedarf aus `Endet am` abgeleitet wird; in der **Vollprüfung** wird die zusätzliche direkte Read-only-Verifikation erklärt. Bei einem laufenden oder wieder geöffneten Bulk-Lauf stammt die Anzeige aus dem im Lauf gespeicherten `verificationMode`, nicht aus einer eventuell später geänderten Konfiguration.

Im Schritt **Reihenfolge festlegen** bilden Drag-Handle, Hoch- und Runter-Pfeil nun rechts außen eine gemeinsame kompakte Aktionsgruppe in der Reihenfolge **[Drag][↑][↓]**. Positionsnummer, Titelbild und Anzeigendaten bleiben links.
<!-- KAR170-END:README:680 -->

## v1.18.2

<!-- KAR170-BEGIN:CHANGELOG:956 -->
### Original CHANGELOG: 1.18.2 – 2026-09-18 (source line 956)

- Inventur-Dialog benennt die vier Schritte klarer als **Bestand laden → Anzeigen erfassen → Bestand bestätigen → Ergebnis**.
- Im aktuell gewählten **Schnellprüfungs-Modus** verzichtet die Vollinventur auf den separaten öffentlichen Read-only-Metadaten-Tab pro Anzeige. `Anzeige vom` wird stattdessen aus dem auf „Meine Anzeigen“ sichtbaren `Endet am`-Datum mit der derzeit bewusst angenommenen 60-Tage-Regel abgeleitet. Die Vollprüfung behält den direkten Read-only-Pfad unverändert.
- Heuristisch abgeleitete Veröffentlichungsdaten werden persistent als abgeleitet markiert und in der Inventaransicht mit der neutralen Badge **Abgeleitet** samt Erklärung gekennzeichnet; direkt verifizierte Read-only-Werte haben weiterhin Vorrang. Verlängerungs-/Wiederveröffentlichungs-Sonderfälle werden in dieser ersten Optimierung bewusst nicht zusätzlich verifiziert.
- Der wiederholte Papierkorb-Hinweis wird aus den einzelnen Karten entfernt und einmal zentral im gelben Hinweisbereich angezeigt.
- Jeder Papierkorb-Eintrag erhält **30 Tage neu starten**: Nach Bestätigung wird ausschließlich seine lokale `expiresAt`-Frist ab dem aktuellen Zeitpunkt auf volle 30 Tage gesetzt. Der Eintrag bleibt im Papierkorb; Inventar und Kleinanzeigen bleiben unverändert.
- Reconciliation, Profil-Backup/-Restore, globale Retry-Konfiguration, Modal-Scroll-Lock, Taskleisten-Identität sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:956 -->

<!-- KAR170-BEGIN:README:688 -->
### Historical README: v1.18.2 – Schnellinventur ohne Read-only-Tab und Papierkorb-Friststeuerung (source line 688)

Der Inventur-Dialog verwendet jetzt die eindeutigen Schritte **Bestand laden**, **Anzeigen erfassen**, **Bestand bestätigen** und **Ergebnis**. Ist in der Konfiguration **Schnellprüfung** gewählt, öffnet die Vollinventur pro Anzeige keinen zusätzlichen öffentlichen Read-only-Metadaten-Tab mehr. Das sichtbare `Endet am`-Datum aus „Meine Anzeigen“ bleibt die Remote-Quelle; daraus wird `Anzeige vom` heuristisch mit einer bewusst angenommenen Laufzeit von 60 Tagen abgeleitet. Dieser Wert wird intern als abgeleitet gespeichert und in der UI mit **Abgeleitet** gekennzeichnet. Die Vollprüfung behält den direkten Read-only-Pfad und kann einen heuristischen Wert durch direkt verifizierte Metadaten ersetzen. Verlängerungen und Wiederveröffentlichungen werden für diese erste Schnellprüfungs-Optimierung bewusst nicht gesondert verifiziert.

Im Papierkorb steht der allgemeine Hinweis zur fehlenden Rückverschiebung ins Inventar jetzt einmal zentral. Pro Eintrag gibt es zusätzlich **30 Tage neu starten**. Die Aktion setzt ausschließlich die lokale Aufbewahrungsfrist ab dem aktuellen Zeitpunkt zurück; der Eintrag bleibt im Papierkorb und löst weder eine Inventar-Wiederherstellung noch eine Kleinanzeigen-Aktion aus.

Die Sicherheitsmechanismen aus v1.18.1 bleiben unverändert: doppelter unabhängiger Remote-Roster vor Reconciliation, vollständiger Profil-Backup/-Restore, Konto-/Profilbindung, globaler Inserierungs-Lock, konfigurierbare Phase-Retries, Modal-Scroll-Lock und unabhängige Phase-4-Abwesenheitsprüfung.
<!-- KAR170-END:README:688 -->

## v1.18.1

<!-- KAR170-BEGIN:CHANGELOG:965 -->
### Original CHANGELOG: 1.18.1 – 2026-09-18 (source line 965)

- Vollinventur erhält einen abgesicherten Bestandsabgleich: Der erste vollständige Remote-ID-Bestand wird separat vom Detail-Import erfasst und nach der Inventarisierung durch einen zweiten unabhängigen Vollscan von „Meine Anzeigen“ bestätigt.
- Der zweite Vollscan ist im Inventur-Modaldialog als eigener Schritt **Bestand prüfen** transparent sichtbar. Nur zwei vollständige, identische Remote-Roster dürfen eine Bereinigung freigeben; bei Abweichung, Unterbrechung, Count-/Paging-Fehler oder nicht vollständiger Inventarisierung wird die Bereinigung vollständig übersprungen.
- Erst nach bestätigtem Doppel-Roster werden aktive lokale Einträge desselben Profils, deren numerische Anzeigen-ID remote fehlt, atomar in den 30-Tage-Papierkorb verschoben. Titel-/Preisähnlichkeit wird niemals als Bereinigungsbeweis verwendet; workflowgeschützte Datensätze bleiben ausgenommen und Bilder erhalten.
- Profilmanagement erhält vollständigen Profil-Backup-Export und -Import als versioniertes ZIP mit Profilmetadaten, aktivem Inventar, komplettem Papierkorb samt Löschmetadaten sowie allen referenzierten lokalen Bildern inklusive SHA-256-Integritätsdaten.
- Bei bereits vorhandener Profilidentität ist ausschließlich **Bestehendes Profil vollständig ersetzen** nach ausdrücklicher Sicherheitsabfrage möglich; kein Merge und kein Duplikatprofil. Der lokale Inventar-/Papierkorb-/Bildbestand wird transaktional ersetzt und bei einem nachfolgenden Importfehler rückgesichert.
- Profil-Backups enthalten und reaktivieren keine Renewal-/Massenlauf-/temporären Workflow-Sessions. Kontoabhängige Aktionen bleiben nach Restore weiterhin den bestehenden Live-Konto-Gates unterworfen.
- Neuer RED→GREEN-Vertrag plus Runtime-Tests schützen Reconciliation, Roster-Gates, workflowgeschützte Einträge, Profil-Backup-Roundtrip und Replace-only-Semantik.
<!-- KAR170-END:CHANGELOG:965 -->

<!-- KAR170-BEGIN:README:696 -->
### Historical README: v1.18.1 – sicherer Bestandsabgleich und vollständige Profil-Backups (source line 696)

Ein erfolgreicher Vollinventurlauf endet jetzt nicht mehr beim Upsert der gefundenen Anzeigen. Parallel wird ein expliziter Remote-ID-Bestand aufgebaut. Nach Abschluss der eigentlichen Inventarisierung führt die App einen **zweiten unabhängigen Vollscan** von „Meine Anzeigen“ durch und zeigt diesen Sicherheitscheck im Modal als eigenen Schritt **Bestand prüfen**. Nur wenn beide vollständigen Remote-Roster exakt übereinstimmen, dürfen lokal aktive Einträge desselben Profils, deren Anzeigen-ID remote nicht mehr existiert, kontrolliert in den 30-Tage-Papierkorb verschoben werden. Bei Abweichungen, unvollständigem Paging, Count-Mismatch, Accountwechsel oder Unterbrechung bleibt der lokale Bestand unangetastet und der Lauf zeigt Prüfbedarf. Workflowgeschützte Datensätze werden nicht bereinigt; Titel- oder Inhaltsähnlichkeit ist niemals Löschbeweis.

Das Profilmanagement bietet zusätzlich einen vollständigen **Profil-Backup-Export/-Import** als versioniertes ZIP. Gesichert werden Profilmetadaten, das gesamte aktive Inventar, der komplette Papierkorb einschließlich 30-Tage-/Löschmetadaten sowie alle referenzierten lokalen Bilder mit Integritätsprüfungen. Existiert dieselbe Profilidentität bereits lokal, gibt es ausschließlich die ausdrücklich zu bestätigende Option **Bestehendes Profil vollständig ersetzen** – keinen Merge und kein Duplikatprofil. Laufende oder terminale Renewal-/Massenlauf-Sessions werden nicht aus dem Backup als Workflowzustand importiert oder reaktiviert.

Die Sicherheitsgrenzen aus v1.18.0 bleiben erhalten: keine direkte Publish-Submission, Konto-/Profilbindung, globaler Inserierungs-Lock, strikt sequenzielle Massenverarbeitung und die unabhängige Phase-4-Abwesenheitsprüfung bleiben unverändert.
<!-- KAR170-END:README:696 -->

## v1.18.0

<!-- KAR170-BEGIN:CHANGELOG:975 -->
### Original CHANGELOG: 1.18.0 – 2026-09-18 (source line 975)

- Diagnosebereich kompakter: Der Statusbereich unter „Diagnosedaten herunterladen“ belegt im Leerzustand keinen Platz mehr und wird erst bei tatsächlicher Ausgabe sichtbar.
- „Mehrere Anzeigen neu inserieren“ erhält einen vierstufigen Ablauf mit neuem Schritt **Reihenfolge festlegen**. Die Auswahl startet dort exakt in der sichtbaren Tabellenreihenfolge aus Schritt 1 und kann per Drag-and-drop sowie Hoch-/Runter-Steuerung angepasst werden; diese Reihenfolge steuert verbindlich die strikt sequenzielle Batch-Verarbeitung und die Ergebnisdarstellung.
- In Schritt 1 lässt sich die Auswahl zusätzlich durch Klick auf die gesamte Tabellenzeile umschalten; Checkbox, Zeilenstatus und Tastaturbedienung bleiben synchron und direkte Checkbox-Klicks lösen keinen Doppel-Toggle aus.
- Papierkorb-Einträge können über **Als ZIP exportieren** inklusive ihrer lokal gespeicherten Bilder als letzte Sicherung exportiert werden, ohne Datensätze, Wiederherstellung oder Löschlogik zu verändern.
- Scrollbars des App-Inhalts und der internen Scrollbereiche sind farblich an das dunkle Cyan/Grün-Design der App angepasst; die native Windows-/Chrome-Titelleiste bleibt unverändert.
- Taskleisten-Icon-Fix aus v1.17.10, Extension-ID, Manifest-Key, Permissions, Host-Permissions sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
- Neuer RED→GREEN-Vertrag `v1180-ui-workflow.cjs` schützt Version/Taskleistenidentität, Diagnose-Kollaps, Vier-Schritt-Massenworkflow, Zeilenauswahl, Reihenfolgensteuerung, Papierkorb-ZIP und Scrollbar-Styling.
<!-- KAR170-END:CHANGELOG:975 -->

<!-- KAR170-BEGIN:README:704 -->
### Historical README: v1.18.0 – Massen-Reihenfolge, Papierkorb-Sicherung und UI-Polish (source line 704)

Der Dialog **Mehrere Anzeigen neu inserieren** besitzt jetzt vier Schritte. Nach der Auswahl folgt **Reihenfolge festlegen**: Die gewählten Anzeigen werden zunächst exakt in der sichtbaren Tabellenreihenfolge aus Schritt 1 übernommen und können anschließend per Drag-and-drop oder über Hoch-/Runter-Schaltflächen umsortiert werden. Diese Reihenfolge wird unverändert an den strikt sequenziellen Massenlauf übergeben und bleibt in Fortschritt und Übersicht erhalten. In Schritt 1 kann zusätzlich die gesamte Tabellenzeile zur Auswahl angeklickt werden; die Checkbox bleibt synchron und direktes Anklicken verursacht keinen Doppel-Toggle.

Papierkorb-Einträge bieten nun ebenfalls **Als ZIP exportieren**. Der Export verwendet denselben integritätsgeprüften lokalen ZIP-Pfad wie das Inventar und verändert weder Papierkorb-Datensatz noch Wiederherstellungs- oder Löschzustand. Der Diagnosebereich reserviert im Leerzustand keinen unnötigen Ausgaberaum mehr. Scrollbars sind an das dunkle Cyan/Grün-Design der App angepasst; die native Windows-/Chrome-Titelleiste bleibt systemseitig unverändert.

Der in v1.17.10 nativ isolierte Taskleisten-Icon-Fix bleibt unverändert erhalten. Ebenso bleiben Profil-/Kontobindung, globaler Inserierungs-Lock, strikt sequenzielle Massenverarbeitung, unabhängige Phase-4-Abwesenheitsprüfung und alle Publish-Sicherheitsgrenzen bestehen.
<!-- KAR170-END:README:704 -->

## v1.17.10

<!-- KAR170-BEGIN:CHANGELOG:985 -->
### Original CHANGELOG: 1.17.10 – 2026-09-18 (source line 985)

- Behebt das falsche/generische separate Windows-Taskleisten-Icon des Popup-Appfensters durch die isoliert nativ verifizierte Probe-E-Änderung: `action.default_title` wird auf `Kleinanzeigen Renewal` zurückgesetzt.
- Der sichtbare Produktname bleibt überall dort, wo er dem Nutzer angezeigt wird, **„kleinanzeigen Manager“**: `manifest.name` und `app.html <title>` bleiben unverändert.
- `chrome.windows.create({ type: "popup" })` sowie sämtliche Icon-Assets bleiben unverändert; `type: "normal"` wird ausdrücklich nicht als Produktfix verwendet.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
- Neuer RED→GREEN-Vertrag `v11710-taskbar-icon-title.cjs` schützt die isolierte Identitätskombination und die Byteidentität aller Icon-Assets gegenüber v1.17.9.
<!-- KAR170-END:CHANGELOG:985 -->

<!-- KAR170-BEGIN:README:712 -->
### Historical README: v1.17.10 – Windows-Taskleisten-Icon ohne sichtbare Namensregression (source line 712)

Die native Windows-Isolation der Probes C/D/E hat gezeigt, dass `action.default_title` allein hinreichend ist, damit das separate Popup-Appfenster wieder das korrekte Taskleisten-Icon erhält. Deshalb bleibt der sichtbare Produktname vollständig **„kleinanzeigen Manager“** (`manifest.name` und `app.html <title>`); ausschließlich der interne Action-Titel wird auf den bewährten Identitätswert **„Kleinanzeigen Renewal“** zurückgesetzt.

`type: "popup"`, sämtliche Icon-Assets, Extension-ID, Manifest-Key, Permissions, Host-Permissions und alle fachlichen Sicherheitsgrenzen bleiben unverändert. Die Änderung basiert auf dem nativ erfolgreichen Probe-E-Test vom 18.09.2026.
<!-- KAR170-END:README:712 -->

## v1.17.9

<!-- KAR170-BEGIN:CHANGELOG:993 -->
### Original CHANGELOG: 1.17.9 – 2026-09-17 (source line 993)

- Manueller Inventar-Refresh ist account-gate-sicher sequenziert: erst frische Konto-/Tab-Prüfung, danach Inventar-Render; checking→ready synchronisiert accountgebundene Zeilenaktionen auch bei identischem Konto.
- Kontrolliert geschlossene Renewal-/Worker-Tabs werden über Registry-Tombstones als erwartetes Lifecycle-Ende klassifiziert; nachlaufende Bootstrap-/Background-/App-Health-Anfragen erzeugen dafür keine Warning/Error-Kaskade mehr.
- Windows-Fenster-/Taskleisten-Icon robuster: `favicon.ico` enthält 16/32/48/64/128/256 px und wird von App/Launcher mit den verfügbaren Größen deklariert.
- App-Header und Erweiterungsbeschreibung bilden den kontrollierten Neu-Einstell-/Prüf-/Austauschworkflow genauer ab.
- Mehr Abstand unter dem Hinweis zu „Versuche je Phase“ verbessert die Lesbarkeit vor der unteren Trennlinie.
<!-- KAR170-END:CHANGELOG:993 -->

<!-- KAR170-BEGIN:README:718 -->
### Historical README: v1.17.9 – UI-State-Fix, erwartete Tab-Enden und Windows-Icon (source line 718)

Der manuelle Aktualisieren-Button sequenziert die frische Kleinanzeigen-Konto-/Tab-Prüfung jetzt vor dem Inventar-Render. Dadurch werden accountgebundene Zeilenaktionen nach `checking → ready` zuverlässig wieder freigegeben, auch wenn dasselbe Konto erkannt wurde.

Kontrolliert geschlossene Renewal-/Worker-Tabs bleiben über den TabRegistry-Tombstone als erwartetes Lifecycle-Ende korreliert. Nachlaufende Content-Bootstrap-, Background- oder App-Health-Anfragen erzeugen dafür keine künstliche Warning/Error-Kaskade mehr; unerwartete Tab-Verluste bleiben Fehler.

Das Windows-Fenster-/Taskleisten-Icon verwendet nun ein echtes Multi-Resolution-ICO mit 16/32/48/64/128/256 px. App-Header und Erweiterungsbeschreibung beschreiben den kontrollierten Neu-Einstell-, Prüf- und Austauschworkflow genauer; der Prüfmodus-Hinweis zu den Versuchen je Phase erhält mehr Abstand zur unteren Trennlinie.
<!-- KAR170-END:README:718 -->

## v1.17.8

<!-- KAR170-BEGIN:CHANGELOG:1000 -->
### Original CHANGELOG: 1.17.8 – 2026-09-17 (source line 1000)

- Phase 1: Dynamische interaktive Merkmalsfelder (`attributeMap[...]`) erhalten bis zu drei lokale, zustandsgeprüfte Auswahlversuche, bevor ein kompletter Phase-1-Erstellversuch verworfen wird.
- Die lokalen Retries gelten sowohl für modal-/buttonbasierte Felder als auch für Such-/Autocomplete-Felder; vor jedem Versuch werden technischer Istwert und aktuelles Control erneut geprüft, und es wird weiterhin ausschließlich ein exakter Zielwert akzeptiert.
- Phase 3: Wenn nach Publish keine belastbare kanonische Public-URL vorliegt, startet die Vollprüfung direkt über „Meine Anzeigen“ und löst dort die echte öffentliche URL auf; der bisherige konstruierte `/s-anzeige/<adId>`-Direktversuch entfällt in diesem Zustand.
- Bestehende Prüf-, Profil-, Publish- und Phase-4-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1000 -->

<!-- KAR170-BEGIN:README:726 -->
### Historical README: v1.17.8 – lokale Feld-Retries und direkter Phase-3-My-Ads-Pfad (source line 726)

Phase 1 behandelt transiente UI-/DOM-Probleme bei interaktiven Merkmalen jetzt lokal, bevor ein kompletter Erstellversuch verworfen wird. Dynamische `attributeMap[...]`-Felder erhalten bis zu drei zustandsgeprüfte lokale Versuche. Das gilt sowohl für modal-/buttonbasierte Merkmale wie Farbe oder Zustand als auch für Such-/Autocomplete-Felder wie Marke. Vor jedem Versuch wird der technische Istwert erneut geprüft, das aktuelle Control frisch aufgelöst und weiterhin ausschließlich ein exakt passender Zielwert akzeptiert. Suchfelder werden bei Bedarf erneut fokussiert, geleert, schrittweise beschrieben und per `ArrowDown` nur zum Öffnen der Vorschlagsliste angestoßen; es wird nie nach Listenposition geraten. Erst nach drei lokalen Fehlschlägen darf der übergeordnete Phase-1-Versuch scheitern.

In der Vollprüfung startet Phase 3 ohne bereits bekannte kanonische Public-URL nicht mehr mit einer konstruierten `/s-anzeige/<adId>`-Adresse. Der frische Prüfworker öffnet stattdessen direkt **Meine Anzeigen**, löst dort die neue Anzeigen-ID auf und verwendet anschließend die echte öffentliche URL mit Slug für die Read-only-Prüfung. Wenn bereits eine belastbare kanonische Public-URL vorliegt, darf diese weiterhin direkt geprüft werden. Prüfsemantik, Profilbindung und Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:README:726 -->

## v1.17.7

<!-- KAR170-BEGIN:CHANGELOG:1007 -->
### Original CHANGELOG: 1.17.7 – 2026-09-17 (source line 1007)

- PERFORMANCE-1: Routine-Diagnosen werden für 350 ms bzw. bis 40 Einträge gepuffert und gebündelt gespeichert; Warning/Error- sowie Safety-/Recovery-/Terminal-Ereignisse flushen sofort.
- PERFORMANCE-2: Nicht-terminale Massenlauf-Fortschrittsupdates werden pro Renewal für 1,5 s zusammengefasst; terminale Zustände werden weiterhin unmittelbar reconciled.
- PERFORMANCE-3: Content-Script-Bootstrap wartet während laufender Navigation, prüft danach den bestehenden Receiver erneut und behandelt Navigation/Injektions-Races als retrybaren Zustand statt als Fehlerkaskade.
- PERFORMANCE-4: Phase-4-Vorprüfung und Delete laufen im selben frischen Worker; der unabhängige frische `VERIFY_OWN_AD_ABSENT_BY_ID`-Post-Delete-Vollscan bleibt verpflichtend.
- Sicherheitsgrenzen unverändert: kein Auto-Publish, kein `.submit()`/`requestSubmit()`, Profilbindung, sequenzieller Massenlauf, unabhängiger Löschbeweis und atomare Promotion bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1007 -->

<!-- KAR170-BEGIN:README:732 -->
### Historical README: v1.17.7 – PERFORMANCE-1 bis -4: weniger I/O, robustere Navigation und weniger Phase-4-Loads (source line 732)

Der erste PERFORMANCE-Block optimiert gezielt langsame Rechner, ohne Sicherheits- oder Sequenzialitätsgrenzen zu lockern. Routinemäßige Diagnoseereignisse werden kurz im Speicher gesammelt und gebündelt persistiert; Warning/Error-, Safety-, Recovery- und terminale Ereignisse bleiben sofort persistent. Nicht-terminale Fortschrittsupdates des Massenlaufs werden pro Renewal zusammengefasst, während terminale Zustände weiterhin unmittelbar in den Batch übernommen werden.

Der Content-Script-Bootstrap ist navigation-aware: Während ein Kleinanzeigen-Tab noch lädt, wird keine aggressive Vollinjektion gestartet. Stattdessen wartet die App auf einen stabilen Navigationszustand, prüft danach erneut die deklarativ geladenen Content-Scripts und injiziert nur bei Bedarf. Navigation-bedingte Rennen werden als retrybarer Lifecycle-Zustand behandelt statt eine Bootstrap-Fehlerkaskade zu erzeugen.

In Phase 4 sind die frische Vorprüfung und die Löschaktion in demselben frisch geöffneten Worker verbunden. `DELETE_OWN_AD_BY_ID` führt vor jeder möglichen Löschaktion weiterhin den vollständigen paginierten Scan nach der alten Anzeigen-ID aus und klickt nur bei eindeutigem Treffer. Der danach verpflichtende unabhängige frische `VERIFY_OWN_AD_ABSENT_BY_ID`-Vollscan bleibt unverändert autoritativ; Transportabbrüche sind weiterhin niemals Löschbeweis und die atomare Promotion bleibt an `source-delete-verified` gebunden.
<!-- KAR170-END:README:732 -->

## v1.17.6

<!-- KAR170-BEGIN:CHANGELOG:1015 -->
### Original CHANGELOG: 1.17.6 (source line 1015)

- Papierkorb-Aktion **Als Vorlage neu inserieren** in einen geführten Modal-Dialog überführt: Vorlagenvorschau und ausdrückliche Bestätigung vor der Vorbefüllung, klarer Abschluss-Hinweis zur manuellen Veröffentlichung.
- Der bekannte Vorlagen-Tab wird nach der Vorbefüllung passiv beobachtet. Eine neue eigene veröffentlichte Anzeigen-ID wird automatisch erkannt, ohne einen Publish auszulösen.
- Nach erkannter Veröffentlichung steht **Diese Anzeige inventarisieren** zur Verfügung; die Einzelinventur verwendet den bekannten Tab direkt und überspringt den sichtbaren Selektionsschritt. Der Papierkorb-Quelldatensatz bleibt unverändert.
- Accordion-Wechsel zwischen Aktionen, Konfiguration und Diagnose mit kurzer Smooth-Animation und `prefers-reduced-motion`-Fallback.
- Untere Header-Trennlinie als dezenter 1-px-Cyan-Akzent.
<!-- KAR170-END:CHANGELOG:1015 -->

<!-- KAR170-BEGIN:README:740 -->
### Historical README: v1.17.6 – Geführte Papierkorb-Vorlage und ruhigeres Accordion (source line 740)

**Als Vorlage neu inserieren** aus dem Papierkorb verwendet jetzt einen geführten Dialog. Vor dem Start wird die ausgewählte Vorlage mit Titelbild und Kerndaten nochmals gezeigt und ausdrücklich bestätigt. Nach erfolgreicher Vorbefüllung fordert der Dialog dazu auf, die Angaben im Kleinanzeigen-Tab zu prüfen und die Anzeige manuell über **Anzeige aufgeben** zu veröffentlichen; es gibt weiterhin keinen automatischen Publish.

Der bekannte Ziel-Tab wird danach passiv beobachtet. Sobald dort eindeutig eine eigene veröffentlichte Anzeige mit neuer Anzeigen-ID erkannt wird, schaltet der Dialog **Diese Anzeige inventarisieren** frei. Die Einzelinventur verwendet direkt diesen bekannten Tab und überspringt den sichtbaren Auswahl-Schritt; Profilbindung und die bestehenden Sicherheitsgrenzen bleiben erhalten. Der Papierkorb-Quelldatensatz bleibt unverändert.

Die Single-Open-Accordion-Bereiche **Aktionen**, **Konfiguration** und **Diagnose** öffnen und schließen jetzt mit einer kurzen, reduzierbaren Höhenanimation. Die Header-Trennlinie ist als dezenter 1-px-Cyan-Akzent ausgeführt.
<!-- KAR170-END:README:740 -->

## v1.17.5

<!-- KAR170-BEGIN:CHANGELOG:1024 -->
### Original CHANGELOG: 1.17.5 – 2026-09-17 (source line 1024)

- Verschiebt die globale Ansichts-Navigation `Inventar | Papierkorb` in den oberen App-Header und dockt sie an die horizontale Trennlinie zum Inhalt an.
- Richtet `Aktionen`, `Konfiguration` und `Diagnose` im Single-Open-Accordion einheitlich linksbündig aus; der aktuell geöffnete Header wird cyan dargestellt.
- Entfernt den redundanten großen Konto-Infoblock unter der Inventarprofil-Auswahl. Eine kompakte Statuszeile mit farbigem Punkt zeigt nur noch den Live-Kontostatus.
- Ausführliche Konto-/Profil-Mismatch-Hinweise bleiben im Bereich `Aktionen`; allgemeine Workflow-Meldungen werden dort weiterhin sichtbar angezeigt.
<!-- KAR170-END:CHANGELOG:1024 -->

<!-- KAR170-BEGIN:README:748 -->
### Historical README: v1.17.5 – Header-Navigation und kompakter Konto-Status (source line 748)

- `Inventar | Papierkorb` sitzt als globale Ansichts-Navigation rechts im App-Header direkt an der Trennlinie zum Content.
- Die Accordion-Header sind konsistent linksbündig; der geöffnete Bereich wird cyan hervorgehoben.
- Unter der Inventarprofil-Auswahl bleibt nur eine kompakte Kontozeile mit Statuspunkt; redundante Konto-Erklärtexte wurden entfernt.
<!-- KAR170-END:README:748 -->

## v1.17.4

<!-- KAR170-BEGIN:CHANGELOG:1031 -->
### Original CHANGELOG: 1.17.4 – 2026-09-17 (source line 1031)

- Sichtbare Produktidentität auf **„kleinanzeigen Manager“** umgestellt. Die bisherige Header-Redundanz aus „KLEINANZEIGEN INVENTAR“ plus großem „Inventar“ entfällt; der kompaktere Header zeigt nur Produktname, Version und Untertitel.
- Linke Seitenleiste als **Single-Open-Accordion** umgesetzt: **Aktionen**, **Konfiguration** und **Diagnose**; standardmäßig ist Aktionen geöffnet, beim Öffnen eines Bereichs schließen die anderen automatisch. Inventarprofil und Live-Konto bleiben oberhalb dauerhaft sichtbar.
- Solange eine konto-/workflowgebundene Aktion läuft, zeigt der Aktionen-Header einen kleinen pulsierenden Aktivitätspunkt. Der Punkt basiert auf Inserierungs-Lock sowie laufender Einzel-/Vollinventur und verschwindet wieder im Leerlauf.
- **Inventar / Papierkorb** sind aus dem globalen Header entfernt und als angedockte Inhaltsnavigation oberhalb des rechten Content-Bereichs platziert. **Aktualisieren** ist als kompakter Refresh-Icon-Button in den Inventar-Contentkopf gewandert; „Alle in Papierkorb“ bleibt als ausgeschriebene Sammelaktion daneben.
- Neue RED→GREEN-Verträge `v1174-sidebar-header-*`; bestehende Konto-, Modal-, Retry-, Publish-, Phase-4-, A1/A2- und Papierkorb-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1031 -->

<!-- KAR170-BEGIN:README:754 -->
### Historical README: v1.17.4 – kompakter Header, Content-Navigation und Single-Open-Seitenleiste (source line 754)

Der sichtbare Produktname lautet jetzt **„kleinanzeigen Manager“**. Der Header zeigt nur noch Produktname, Version und Untertitel; „Inventar“ bleibt als Inhaltsansicht bestehen, nicht mehr als redundanter Produkttitel.

Die linke Seitenleiste verwendet **Aktionen**, **Konfiguration** und **Diagnose** als Single-Open-Accordion. Standardmäßig ist Aktionen geöffnet. Inventarprofil und Live-Konto bleiben jederzeit sichtbar. Ein pulsierender Punkt am Aktionen-Header signalisiert laufende Workflows, auch wenn der Bereich eingeklappt ist.

Die Ansichten **Inventar** und **Papierkorb** sind als angedockte Navigation oberhalb des rechten Inhaltsbereichs angeordnet. Die manuelle Aktualisierung ist eine kompakte Icon-Aktion im Inventarkopf; weitreichende Aktionen wie **Alle in Papierkorb** bleiben ausgeschrieben.
<!-- KAR170-END:README:754 -->

## v1.17.3

<!-- KAR170-BEGIN:CHANGELOG:1039 -->
### Original CHANGELOG: 1.17.3 – 2026-09-17 (source line 1039)

- Profilwechsel löst jetzt sofort eine frische Live-Konto-Prüfung aus. Währenddessen sind kontoabhängige Aktionen gesperrt; danach werden globaler Kontostatus, Aktionsfreigaben und Tooltips konsistent neu gerendert. Das gewählte Inventarprofil bleibt unverändert und wird nie automatisch auf das Live-Konto umgeschaltet.
- Laufende Vollinventur-Statuskarten verwenden eine Chevron-Aktion **„Fortschritt minimieren“** statt des Schließen-`×`. Der Workflow läuft weiter und bleibt über den kompakten Reentry erreichbar; terminale Statuskarten behalten das `×` zum Ausblenden.
- Retry-Microcopy platzsparend auf **„Maximale Versuche je Phase · Standard: 3“** plus kurzen Laufzeit-Hinweis reduziert.
- Sichtbare UI-Texte auf Endanwender-Sprache vereinheitlicht: **Kleinanzeigen-Konto** statt Kleinanzeigen-Profil/Sitzung, verständliche Voll-/Schnellprüfungsbeschreibung und **Prüfung nötig/Prüfbedarf** statt „Aufmerksamkeit“.
- Neue RED→GREEN-Verträge `v1173-*`; bestehende Konto-, Modal-, Retry-, Publish-, Phase-4-, A1/A2- und Papierkorb-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1039 -->

<!-- KAR170-BEGIN:README:763 -->
### Historical README: v1.17.3 – Konsistenter Kontostatus und UI-Microcopy (source line 763)

Beim Wechsel des Inventarprofils prüft die App das aktuell angemeldete Kleinanzeigen-Konto jetzt unmittelbar neu. Während der kurzen Prüfung bleiben Live-Aktionen gesperrt; anschließend werden Kontostatus, Aktionsfreigaben und Tooltips gemeinsam aus dem frisch bestätigten Konto und dem frei gewählten Inventarprofil aufgebaut. Das Inventarprofil wird durch die Prüfung niemals automatisch umgeschaltet.

Laufende Vollinventur-Statuskarten verwenden statt des Schließen-`×` nun eine Chevron-Aktion **„Fortschritt minimieren“**. Der Lauf wird dadurch nicht beendet und bleibt über den kompakten **„Fortschritt anzeigen“**-Wiedereinstieg erreichbar. Terminale Meldungen behalten das `×` zum Ausblenden.

Die Konfigurationsbeschreibung **„Versuche je Phase“** wurde platzsparend formuliert. Zusätzlich wurden sichtbare Konto-, Prüf- und Fehlertexte vereinheitlicht: Live-Konto und Inventarprofil werden klar getrennt, technische Begriffe wie „Kleinanzeigen-Sitzung“ oder „Inhaltskontrolle“ wurden aus der Bedienoberfläche entfernt, und „Prüfbedarf/Prüfung nötig“ ersetzt uneinheitliche „Aufmerksamkeit“-Formulierungen.
<!-- KAR170-END:README:763 -->

## v1.17.2

<!-- KAR170-BEGIN:CHANGELOG:1047 -->
### Original CHANGELOG: 1.17.2 – 2026-09-17 (source line 1047)

- Globale Statuslogik auf **Kleinanzeigen-Konto** statt „Meine Anzeigen geöffnet?“ umgestellt. Eine beliebige geöffnete Kleinanzeigen-Seite reicht als Ausgangspunkt; falls der Kontoname dort nicht direkt lesbar ist, bestätigt ein kurzlebiger Hintergrund-Prüfworker das angemeldete Konto.
- Inventarprofil und Live-Konto sind getrennt: das lokale Inventarprofil bleibt jederzeit frei wechselbar. Alle Live-Aktionen werden nur freigegeben, wenn ausgewähltes Inventarprofil und bestätigtes Kleinanzeigen-Konto übereinstimmen. Eine kompakte Attention-Meldung im Bereich **Aktionen** plus konkrete Button-Tooltips erklären Sperrgründe.
- **Geöffnete Anzeige erfassen** benötigt zusätzlich mindestens eine erkannte eigene Anzeige. **Alle Anzeigen erfassen** benötigt keine vorab geöffnete „Meine Anzeigen“-Seite mehr; die App erzeugt bei Bedarf einen eigenen Hintergrund-Quelltab und räumt ihn nach dem Lauf wieder auf.
- Renewal, ZIP-Neuinserat, Massen-Neuinserat, Einzelinventur und manuelle Datenaktualisierung besitzen zusätzlich Background-seitige Profil-/Kontobindungsprüfungen; lokale Verwaltung, Profilwechsel, ZIP-Export und Papierkorb bleiben unabhängig vom Live-Konto nutzbar.
- Alle sechs nativen Modale sperren den Hintergrundscroll zentral und verschachtelungssicher. Interne Scrollbereiche unterbinden Scroll-Chaining; Profilmanagement und Modalflächen sind viewport-begrenzt.
- Microcopy für **„Versuche je Phase“** vereinfacht: Wirkung und mögliche längere Laufzeit höherer Werte werden erklärt, technische Sicherheitsdetails bleiben aus der Bedienoberfläche heraus.
- Neue RED→GREEN-Verträge `v1172-account-*`; Auto-Publish-, Phase-4-, A1/A2-, Inserierungs-Lock- und Papierkorb-Sicherheitsgrenzen bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1047 -->

<!-- KAR170-BEGIN:README:772 -->
### Historical README: v1.17.2 – Kontobindung und konsistente Modal-UX (source line 772)

Die App trennt jetzt konsequent das lokal ausgewählte **Inventarprofil** vom live erkannten **Kleinanzeigen-Konto**. Das Inventarprofil kann jederzeit frei gewechselt werden. Live-Aktionen werden nur dann freigegeben, wenn beide Konttexte übereinstimmen; lokale Funktionen wie Ansicht, Export, Profilverwaltung und Papierkorb bleiben davon unabhängig. Eine beliebige geöffnete Kleinanzeigen-Seite reicht für die Kontoerkennung.

**Alle Anzeigen erfassen** setzt keine manuell geöffnete „Meine Anzeigen“-Seite mehr voraus: falls erforderlich, öffnet die App den benötigten Quelltab selbst im Hintergrund. **Geöffnete Anzeige erfassen** bleibt zusätzlich daran gebunden, dass mindestens eine eigene konkrete Anzeige geöffnet und erkannt ist.

Alle sechs nativen Modalfenster besitzen nun einen zentralen Hintergrund-Scroll-Lock. Interne Listen stoppen Scroll-Chaining, verschachtelte Modale entsperren den Hintergrund erst nach dem Schließen des letzten Dialogs, und lange Inhalte bleiben innerhalb des Viewports scrollbar.

Die Einstellung **„Versuche je Phase“** bleibt bei 1–5 Versuchen mit Standard 3; ihre Erklärung wurde für Endanwender verkürzt und weist auf die mögliche längere Laufzeit bei höheren Werten hin.
<!-- KAR170-END:README:772 -->

## v1.17.1

<!-- KAR170-BEGIN:CHANGELOG:1057 -->
### Original CHANGELOG: 1.17.1 – 2026-09-17 (source line 1057)

- Neuer globaler Regler **„Versuche je Phase“** unter **Konfiguration → Prüfmodus**. Wertebereich 1–5, Standard 3. Der Wert wird beim Start eines Einzel- oder Massen-Renewals eingefroren und gilt als maximale Gesamtzahl der Versuche pro Phase.
- Phase 1 erhält vollständige frische Erstellversuche vor Publish. Feldspezifische lokale UI-Retries bleiben separat; nach Publish-Klick, persistiertem Publish-Zeitpunkt oder bestätigter neuer Anzeigen-ID ist ein erneuter Phase-1-Aufbau strikt gesperrt.
- Kategorieauswahl ist für langsame Systeme gehärtet: bis zu drei frische semantische Klickversuche mit jeweils bis zu 10 Sekunden Bestätigungszeit. Der bisherige hardcodierte Fallback auf `/p-kategorie-aendern.html` wurde entfernt.
- Phase 2 wiederholt bei transienten Fehlern ausschließlich die frische Detail-/Vollprüfung derselben bereits veröffentlichten neuen Anzeige. Phase 3 wiederholt ausschließlich die Presence-/Profil-Verifikation derselben neuen Anzeigen-ID; Schnellprüfung verwendet dafür pro Versuch einen frischen Worker.
- Phase 4 ist retryfähig, ohne Delete blind zu wiederholen: jeder Versuch prüft die Quellanzeige zuerst über einen frischen unabhängigen Vollscan. Nur wenn sie nachweislich noch vorhanden ist, wird ein weiterer Löschversuch ausgelöst; anschließend folgt erneut `VERIFY_OWN_AD_ABSENT_BY_ID`. Transportunterbrechung bleibt ausdrücklich kein Löschbeweis, Promotion erfolgt weiterhin erst nach `source-delete-verified`.
- Neue RED→GREEN-Verträge `v1171-phase-retries*`; bestehende Phase-4-Vertragstests wurden auf die neue Helper-Struktur aktualisiert, ohne Sicherheitsinvarianten abzuschwächen.
<!-- KAR170-END:CHANGELOG:1057 -->

<!-- KAR170-BEGIN:README:782 -->
### Historical README: v1.17.1 – Konfigurierbare Retry-Strategie für alle Renewal-Phasen (source line 782)

Unter **Konfiguration → Prüfmodus** steht jetzt **„Versuche je Phase“** mit einem Bereich von 1 bis 5 und dem Standardwert 3 zur Verfügung. Der eingestellte Wert ist die maximale Gesamtzahl der Versuche pro Phase, nicht die Zahl zusätzlicher Wiederholungen. Ein laufender Einzel- oder Massenlauf behält den beim Start übernommenen Wert, auch wenn die Konfiguration später geändert wird.

Phase 1 kann bei transienten Ausfüllproblemen den gesamten noch unveröffentlichten Erstellkontext frisch neu aufbauen. Lokale UI-Retries einzelner Felder bleiben davon getrennt. Die Kategorieauswahl verwendet bis zu drei frische semantische Klickversuche mit jeweils bis zu 10 Sekunden Bestätigungszeit und besitzt keinen hardcodierten Navigations-Fallback mehr. Sobald Publish ausgelöst wurde oder eine neue Anzeigen-ID bestätigt ist, darf Phase 1 nicht erneut gestartet werden.

Phase 2 und Phase 3 wiederholen nur ihre jeweilige Prüfung derselben bereits veröffentlichten neuen Anzeige; es wird nicht erneut inseriert. Im Schnellprüfungsmodus bedeutet das für Phase 3 mehrere begrenzte Fast-Presence-Versuche mit jeweils frischem Prüfworker. Eindeutige fachliche oder Sicherheitsabweichungen werden nicht blind wiederholt.

Phase 4 bleibt beweisorientiert: Vor jedem möglichen erneuten Delete wird die alte Anzeigen-ID mit einem frischen unabhängigen Vollscan geprüft. Ist sie bereits nachweislich verschwunden, wird nicht erneut gelöscht. Ist sie nachweislich noch vorhanden, darf ein weiterer Löschversuch erfolgen; danach ist erneut ein frischer `VERIFY_OWN_AD_ABSENT_BY_ID`-Nachweis erforderlich. Eine Transportunterbrechung ist niemals Löschbeweis, und die atomare Promotion bleibt an `source-delete-verified` gebunden.

Die bestehenden A1b-/A2-, Profilbindungs-, Inserierungs-Lock-, Auto-Publish-, Papierkorb- und Massenlauf-Sicherheitsgrenzen bleiben erhalten.
<!-- KAR170-END:README:782 -->

## v1.17.0

<!-- KAR170-BEGIN:CHANGELOG:1066 -->
### Original CHANGELOG: 1.17.0 – 2026-09-16 (source line 1066)

- A1b abgeschlossen: `TabRegistry` ist für weitere Lifecycle-Sonderfälle die autoritative Fassade und bietet guarded `releaseOwnership`, `closeTab` und `reloadTabOrThrow`.
- Bekannte `gone`-Tombstones terminalisieren Late Requests sofort als `KR_TAB_GONE`, ohne erneut `chrome.tabs.get()` aufzurufen; Correlation bleibt bis zum bestehenden 30-Sekunden-Prune erhalten.
- Bulk-Source-Ownership wird bei Abschluss, Fehler, Stale-Timeout sowie Retry-Ende owner-/generation-sicher freigegeben. Fehlgeschlagene Bulk-Preflights hinterlassen keine verwaiste Ownership; terminale Runs werden beim Service-Worker-Reconcile nicht reaktiviert.
- Discarded-Reaktivierung wird aus der UI an den Background delegiert und über die Registry neu geladen; es gibt weiterhin keinen stillen Fokuswechsel. Ausgewählte Worker-/Renewal-Cleanup-Pfade nutzen zentrale Registry-Close-Semantik.
- Neue RED→GREEN-Tests `v1170-a1b-authority*`; A2-Correlation sowie Publish-/Phase-4-/Profil-/Lock-/Papierkorb-Sicherheitsgrenzen bleiben unverändert. Nächster Architekturblock: A3a Renewal Mutation Boundary.
<!-- KAR170-END:CHANGELOG:1066 -->

<!-- KAR170-BEGIN:README:795 -->
### Historical README: v1.17.0 – A1b TabRegistry als autoritative Lifecycle-Schnittstelle (source line 795)

A1b schließt den schrittweisen Tab-Lifecycle-Ausbau auf Basis von A1a ab. Die `TabRegistry` besitzt jetzt owner-sichere terminale Ownership-Freigabe sowie zentrale Close-/Reload-Operationen. Bekannte `gone`-Tombstones werden bei verspäteten Requests unmittelbar als `KR_TAB_GONE` klassifiziert, ohne den bereits geschlossenen Tab erneut über `chrome.tabs.get()` aufzulösen.

Bulk-Source-Ownership wird bei Abschluss, Fehler, Stale-Timeout und Retry-Ende generation-/owner-sicher freigegeben. Ein fehlgeschlagener frischer Bulk-Preflight hinterlässt keine verwaiste Ownership; ein verspäteter alter Run kann die Ownership eines neueren Runs nicht löschen. Beim Service-Worker-Reconcile werden terminale Bulk-Runs nicht erneut als aktive Registry-Ownership rekonstruiert.

Discarded-Reaktivierung läuft über die Background-/Registry-Fassade statt direkt aus der UI; `chrome.tabs.reload()` bleibt dabei im Hintergrund und erzeugt keinen Fokuswechsel. Ausgewählte Bulk-/Renewal-Cleanup-Pfade verwenden die zentralen Registry-Close-Semantiken und erzeugen dadurch konsistente `gone`-Tombstones mit erhaltener Correlation. A2-Correlation, Auto-Publish-Hard-Gate, Profilbindung, Inserierungs-Lock, Voll-/Schnellprüfung, Phase-4-Löschbeweis, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.

Mit v1.17.0 gilt A1b implementierungsseitig als abgeschlossen. Der nächste Architekturblock ist **A3a – Renewal Mutation Boundary**.
<!-- KAR170-END:README:795 -->

## v1.16.9

<!-- KAR170-BEGIN:CHANGELOG:1074 -->
### Original CHANGELOG: 1.16.9 – 2026-09-16 (source line 1074)

- Einzel- und Vollinventur-Wiedereinstieg sind strikt nach Workflowtyp und Identität gebunden: Einzelinventur über `adId`, Vollinventur über `runId`. Ein alter terminaler Bulk-Run kann keinen Single-Reentry mehr übernehmen und umgekehrt.
- Während eine Inventarisierung läuft, ist der Start der jeweils anderen Inventarisierungsart gesperrt. Wiedereinstieg rekonstruiert ausschließlich die bestehende UI und startet weder `CAPTURE_SINGLE_INVENTORY` noch `START_BULK_INVENTORY_FRESH` erneut.
- Der kompakte Inventarisierungs-Wiedereinstieg pulsiert nur noch im aktiven Zustand. Erfolg ist statisch grün, Fehler statisch rot und Attention/Prüfbedarf statisch gold.
- Bei von Chrome pausierten (`discarded`) Kleinanzeigen-Tabs zeigt die Statuskarte jetzt **„Kleinanzeigen reaktivieren“**. Die bekannten pausierten Tabs werden ohne Fokuswechsel im Hintergrund neu geladen und anschließend automatisch erneut geprüft.
- Neue RED→GREEN-Tests `v1169-modal-discard-*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Sicherheitssemantik bleiben ansonsten unverändert.
<!-- KAR170-END:CHANGELOG:1074 -->

<!-- KAR170-BEGIN:README:806 -->
### Historical README: v1.16.9 – Entkoppelter Inventarisierungs-Reentry und Tab-Reaktivierung (source line 806)

Einzel- und Vollinventur teilen weiterhin denselben visuellen Dialog, ihr Wiedereinstieg ist jetzt jedoch strikt identitätsgebunden. Eine laufende bzw. abgeschlossene Einzelinventur wird ausschließlich über ihre Anzeigen-ID wieder geöffnet; eine Vollinventur ausschließlich über ihre Run-ID. Ein alter Bulk-Ergebniszustand kann dadurch keinen späteren Single-Workflow mehr übernehmen. Während eine Inventarisierungsart läuft, kann die andere nicht parallel gestartet werden.

Der kompakte Wiedereinstieg signalisiert den tatsächlichen Zustand: nur aktive Erfassung pulsiert; Erfolg ist statisch grün, Fehler statisch rot und Attention/Prüfbedarf statisch gold.

Wenn Chrome relevante Kleinanzeigen-Tabs pausiert (`discarded`), bietet die Statuskarte **„Kleinanzeigen reaktivieren“** an. Die bekannten pausierten Tabs werden im Hintergrund neu geladen, ohne sie zu fokussieren; danach übernimmt die normale Health-/Lifecycle-Prüfung wieder.
<!-- KAR170-END:README:806 -->

## v1.16.8

<!-- KAR170-BEGIN:CHANGELOG:1082 -->
### Original CHANGELOG: 1.16.8 – 2026-09-16 (source line 1082)

- Einzelinventur-Reentry bleibt während einer laufenden Erfassung fest an dieselbe Anzeige gebunden; Healthchecks können den Hauptbutton nicht erneut aktivieren und ein erneuter Einstieg öffnet direkt denselben Fortschritt statt der Kandidatenauswahl.
- Der Toolbar-Klick öffnet bzw. fokussiert das Inventarfenster direkt; das bisherige Zwischen-Popup wird nicht mehr über `default_popup` verwendet.
<!-- KAR170-END:CHANGELOG:1082 -->

<!-- KAR170-BEGIN:README:815 -->
### Historical README: v1.16.8 – Wiedereinstieg in laufende Inventarisierungen (source line 815)

Wird eines der Inventarisierungsmodale während der Bearbeitung geschlossen, läuft der Vorgang unverändert weiter und kann anschließend wieder geöffnet werden. Bei **Alle Anzeigen erfassen** bietet die persistente Statuskachel „Fortschritt anzeigen“ und nach einem terminalen Zustand „Ergebnis anzeigen“. Wird diese Kachel ausgeblendet, bleibt ein kompakter Wiedereinstieg erhalten. Bei **Geöffnete Anzeige erfassen** erscheint nach dem Ausblenden ebenfalls ein kompakter Wiedereinstieg, der während der Bearbeitung zum Fortschritt und nach Abschluss direkt zum Ergebnis führt. Der Wiedereinstieg startet niemals einen zweiten Inventarisierungsvorgang.
<!-- KAR170-END:README:815 -->

## v1.16.7

<!-- KAR170-BEGIN:CHANGELOG:1087 -->
### Original CHANGELOG: 1.16.7 – 2026-09-16 (source line 1087)

- Inventarisierungsmodale können nach dem Schließen während eines laufenden Vorgangs wieder geöffnet werden, ohne einen zweiten Workflow zu starten.
- Vollinventur: Die persistente Statuskachel bietet „Fortschritt anzeigen“ bzw. nach Abschluss „Ergebnis anzeigen“. Wird die Kachel ausgeblendet, bleibt ein kompakter Wiedereinstieg sichtbar.
- Einzelinventur: Nach Schließen des Modals bleibt ein kompakter Wiedereinstieg sichtbar; während der laufenden Erfassung öffnet er den Fortschritt, nach Abschluss direkt das Ergebnis.
- Reentry rekonstruiert bzw. bindet ausschließlich die bestehende UI an den vorhandenen Run/Status; `START_BULK_INVENTORY_FRESH` und `CAPTURE_SINGLE_INVENTORY` werden dadurch niemals erneut ausgelöst.
<!-- KAR170-END:CHANGELOG:1087 -->

## v1.16.6

<!-- KAR170-BEGIN:CHANGELOG:1094 -->
### Original CHANGELOG: 1.16.6 – 2026-09-16 (source line 1094)

- Vollinventur-Modal zeigt während „Erfassen“ die aktuell bearbeitete Anzeige als kompakte Vorschaukarte mit Titelbild, Titel und Anzeigen-ID.
- Vorschau wird aus dem frischen „Meine Anzeigen“-Snapshot gespeist und wechselt automatisch mit dem laufenden Item; keine Änderung der Bulk-Verarbeitung.
<!-- KAR170-END:CHANGELOG:1094 -->

<!-- KAR170-BEGIN:README:820 -->
### Historical README: v1.16.6 – Microcopy für Inventarisierungsdialoge (source line 820)

Die beiden Inventarisierungsdialoge verwenden konsistent die nutzernahen Begriffe **Prüfen → Erfassen → Ergebnis**. Technische Begriffe wie „Read-only“, „Hintergrund-Bearbeiten-Worker“ und „Inventurlauf“ wurden aus der normalen Dialogsprache entfernt, soweit sie für die Bedienentscheidung nicht erforderlich sind.

Bei **Geöffnete Anzeige erfassen** lautet die Aufgabe jetzt direkt „Geöffnete Anzeige auswählen“. Mehrfach geöffnete Ansichten derselben Anzeige werden in der Erklärung nutzerorientiert als eine einzige Anzeige beschrieben; in den Kandidatenkarten werden nur Titelbild, Titel und Anzeigen-ID gezeigt. Fortschrittstexte beschreiben das Auslesen und Speichern, ohne interne Worker-Begriffe.

Bei **Alle Anzeigen erfassen** bleiben Refresh, Profilbindung, sequentielle Verarbeitung und alle Sicherheits-/Lifecycle-Grenzen unverändert. Die sichtbaren Texte sprechen durchgehend von „Erfassung“ und erklären, dass immer nur eine Anzeige gleichzeitig verarbeitet wird.
<!-- KAR170-END:README:820 -->

<!-- KAR170-BEGIN:README:1832 -->
### Historical README: v1.16.6 (source line 1832)

Im Vollinventur-Modal wird die aktuell bearbeitete Anzeige während der Erfassung als kompakte Vorschaukarte mit Thumbnail, Titel und Anzeigen-ID dargestellt.
<!-- KAR170-END:README:1832 -->

## v1.16.5

<!-- KAR170-BEGIN:CHANGELOG:1099 -->
### Original CHANGELOG: 1.16.5 – 2026-09-16 (source line 1099)

- Reiner Microcopy-Patch für die beiden Inventarisierungsmodale; Workflow-, Tab-, Storage- und Sicherheitslogik bleiben unverändert.
- Gemeinsamer Stepper heißt jetzt **Prüfen → Erfassen → Ergebnis**.
- **Geöffnete Anzeige erfassen** erklärt Auswahl, Mehrfach-Tabs, Fortschritt und Speicherung ohne technische Begriffe wie Read-only oder Hintergrund-Worker. Kandidatenkarten zeigen nur noch Titelbild, Titel und Anzeigen-ID; der Ansichtsmodus bleibt intern.
- **Alle Anzeigen erfassen** verwendet durchgehend den Begriff „Erfassung“ statt „Inventurlauf“ und erklärt die strikt sequentielle Verarbeitung als „immer nur eine Anzeige gleichzeitig“.
- Erfolgs-, Fehler-, Prüf- und Vorbereitungsformulierungen wurden auf denselben Wortschatz vereinheitlicht.
<!-- KAR170-END:CHANGELOG:1099 -->

## v1.16.4

<!-- KAR170-BEGIN:CHANGELOG:1107 -->
### Original CHANGELOG: 1.16.4 – 2026-09-16 (source line 1107)

- Bugfix öffentliche Galerieerkennung: Ist ein vertrauenswürdiger Galerie-Root wie `#viewad-image` selbst ein `<img>`, wird der Root jetzt als eigener Bildkandidat ausgewertet; `Element.querySelectorAll()` hatte zuvor nur Nachfahren berücksichtigt und deshalb 0 Kandidaten geliefert.
- Behebt bildlose Kandidatenkarten bei realen öffentlichen Anzeigen wie der Schwalbe-Anzeige, wenn `og:image` das generische Kleinanzeigen-Logo enthält und das Titelbild direkt im `#viewad-image`-Element liegt.
- Neue RED→GREEN-Tests `v1164-gallery-root-img*`; übrige Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik unverändert.
<!-- KAR170-END:CHANGELOG:1107 -->

<!-- KAR170-BEGIN:README:828 -->
### Historical README: v1.16.4 – Galerie-Root-IMG-Fix für Kandidatenbilder (source line 828)

- Öffentliche Kleinanzeigen-Seiten, bei denen `#viewad-image` selbst ein `<img>` ist, werden jetzt korrekt ausgewertet: der Galerie-Root wird als eigener Bildkandidat berücksichtigt.
- Dadurch kann die Kandidatenauswahl das reale Titelbild auch dann verwenden, wenn `og:image` nur das generische Kleinanzeigen-Logo enthält und das Hauptbild direkt auf `#viewad-image` liegt.
- Der Fix liegt im gemeinsamen `image-extractor.js` und verbessert damit nicht nur die Kandidatenvorschau, sondern die öffentliche Galerieerkennung generell.
- Neue RED→GREEN-Tests `v1164-gallery-root-img*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik bleiben unverändert.
<!-- KAR170-END:README:828 -->

## v1.16.3

<!-- KAR170-BEGIN:CHANGELOG:1113 -->
### Original CHANGELOG: 1.16.3 – 2026-09-16 (source line 1113)

- Bugfix Kandidaten-Thumbnail: `og:image` wird vor Verwendung gegen `img.kleinanzeigen.de` validiert. Ein generisches Kleinanzeigen-Logo löst jetzt den Galerie-Fallback aus, statt eine bildlose Kandidatenkarte zu erzeugen.
- Kandidaten-Diagnose protokolliert pro `adId` nur noch `hasThumbnail` und die Quelle (`og-image`, `gallery`, `edit-images`, `none`), nicht die Bild-URL.
- Erfolgreiche Einzelinventur zeigt im Ergebnisdialog die tatsächlich persistierte Anzeige mit lokalem Titelbild, Titel, Kategorie, Art, Preis/Preistyp, Enddatum, Anzeigendatum, Speicherzeitpunkt und Anzeigen-ID.
- Neue RED→GREEN-Tests `v1163-single-inventory-result*`; bestehende Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik unverändert.
<!-- KAR170-END:CHANGELOG:1113 -->

<!-- KAR170-BEGIN:README:835 -->
### Historical README: v1.16.3 – Kandidatenbild-Fallback und Ergebnisdetails der Einzelinventur (source line 835)

- Die Kandidatenvorschau verwendet `og:image` nur noch, wenn es bereits ein echtes Anzeigenbild vom Host `img.kleinanzeigen.de` ist. Generische Kleinanzeigen-Logos von `static.kleinanzeigen.de` werden verworfen; anschließend wird das Titelbild aus der echten Galerie bzw. Edit-Bildstruktur verwendet.
- Nach erfolgreicher Einzelinventur zeigt das Ergebnis-Modal die tatsächlich persistierte Anzeige nochmals als Detailkarte mit lokalem Titelbild, Titel, Kategorie, Art, Preis/Preistyp, Enddatum, Anzeigendatum, Speicherzeitpunkt und Anzeigen-ID.
- Kandidatenauswahl, Edit-Worker-Unterbau und Sicherheitsarchitektur bleiben unverändert.
<!-- KAR170-END:README:835 -->

## v1.16.2

<!-- KAR170-BEGIN:CHANGELOG:1120 -->
### Original CHANGELOG: 1.16.2 – 2026-09-16 (source line 1120)

- **„Geöffnete Anzeige erfassen“** zeigt vor dem Start alle aktuell geöffneten eigenen Anzeigen als auswählbare Kandidatenkarten mit kleinem Titelbild, Titel und Anzeigen-ID.
- Kandidaten werden über die stabile `adId` dedupliziert: Read-only- und Bearbeiten-Ansicht derselben Anzeige erscheinen nur einmal. Der Ansichtsmodus beeinflusst die Kandidatenidentität nicht.
- Ist dieselbe Anzeige in mehreren Tabs geöffnet, bevorzugt die Ausführung intern eine vorhandene Bearbeiten-Ansicht; eine öffentliche Ansicht kann weiterhin ergänzend Titelbild/Metadaten liefern.
- Der aktuell aktive bzw. zuletzt verwendete geeignete Kandidat wird vorausgewählt, kann aber vor dem Start sichtbar geändert werden. Die ausgewählte Anzeige bleibt im Fortschrittsdialog mit Thumbnail/Titel/ID sichtbar.
- Der Einzelinventur-Button bleibt verfügbar, sobald irgendein geöffneter eigener Anzeigen-Tab mit stabiler ID erkannt wird; er hängt nicht mehr nur vom ersten Kleinanzeigen-Tab ab.
- Neue RED→GREEN-Tests `v1162-single-inventory-candidates*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Sicherheitssemantik bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1120 -->

<!-- KAR170-BEGIN:README:841 -->
### Historical README: v1.16.2 – Auswahl geöffneter Anzeigen für die Einzelinventur (source line 841)

Bei **„Geöffnete Anzeige erfassen“** wird die Zielanzeige jetzt sichtbar ausgewählt. Alle geöffneten eigenen Anzeigen mit stabiler Anzeigen-ID erscheinen als kompakte Kandidatenkarten mit Titelbild, Titel und Anzeigen-ID. Read-only- und Bearbeiten-Ansicht derselben `adId` werden zu genau einem Kandidaten zusammengeführt; die Anzeige ist die fachliche Identität, nicht der Tab oder Ansichtsmodus. Ist eine Bearbeiten-Ansicht bereits offen, wird sie intern als vollständige Quelle bevorzugt, ansonsten nutzt die bestehende Einzelinventur weiterhin einen verwalteten Edit-Worker. Die gewählte Anzeige bleibt auch während des Fortschritts sichtbar.
<!-- KAR170-END:README:841 -->

## v1.16.1

<!-- KAR170-BEGIN:CHANGELOG:1129 -->
### Original CHANGELOG: 1.16.1 – 2026-09-16 (source line 1129)

- Bugfix Einzelinventur: Eine geöffnete eigene öffentliche Anzeige wird nicht mehr direkt aus der wechselnden Read-only-Galerie vollständig inventarisiert. Stattdessen wird ihre stabile Anzeigen-ID erkannt und ein verwalteter inaktiver Bearbeiten-Worker als autoritative Datenquelle verwendet.
- Manuell geöffnete bestehende Bearbeiten-Seiten mit stabiler `adId` werden zuverlässig als zulässige Einzelinventurquelle erkannt und direkt ausgelesen.
- Öffentliche Read-only-Metadaten werden nur ergänzend zusammengeführt; fehlende Read-only-Metadaten blockieren die vollständige Edit-Erfassung nicht.
- Einzelinventur-Worker laufen als Managed Worker im Hintergrund und werden terminal sauber geschlossen. Öffentliche Benutzer-Tabs werden nicht verändert oder geschlossen.
- Neue RED→GREEN-Tests `v1161-single-inventory-edit-worker*`; Sicherheitsgrenzen unverändert.
<!-- KAR170-END:CHANGELOG:1129 -->

<!-- KAR170-BEGIN:README:845 -->
### Historical README: v1.16.1 – Einzelinventur über Bearbeiten-Daten (source line 845)

- **„Geöffnete Anzeige erfassen“** verwendet für eine eigene öffentliche Anzeige nicht mehr die unvollständige Detailansicht als Primärquelle. Die Anzeigen-ID wird aus dem geöffneten Tab übernommen und ein verwalteter, inaktiver Bearbeiten-Worker liest dieselbe Anzeige vollständig über `p-anzeige-bearbeiten.html?adId=...` aus.
- Eine bereits manuell geöffnete bestehende Bearbeiten-Seite wird direkt als vollständige Einzelinventurquelle akzeptiert; neue/ungespeicherte Formulare ohne stabile `adId` bleiben ausgeschlossen.
- Öffentliche Metadaten wie Anzeigen-/Enddatum werden ergänzend aus der öffentlichen Detailansicht bzw. einem separaten Read-only-Worker übernommen, soweit verfügbar. Ein Fehlen dieser Ergänzungsdaten verhindert die vollständige Edit-Erfassung nicht.
- Interne Einzelinventur-Worker sind verwaltete Hintergrund-Tabs und werden nach Erfolg oder Fehler geschlossen. Die geöffnete Benutzerseite bleibt unverändert.
- Keine Änderung an Publish-, Renewal-, Phase-4-, A1-/A2-, Profilbindungs- oder globaler Inserierungs-Lock-Semantik.
<!-- KAR170-END:README:845 -->

## v1.16.0

<!-- KAR170-BEGIN:CHANGELOG:1138 -->
### Original CHANGELOG: 1.16.0 – 2026-09-16 (source line 1138)

- Neue einheitliche Inventarisierungsmodale für **„Alle Anzeigen erfassen“** und **„Geöffnete Anzeige erfassen“**. Beide Aktionen starten nicht mehr unmittelbar beim Button-Klick, sondern durchlaufen im Dialog die drei sichtbaren Schritte **Bestätigen → Erfassen → Ergebnis**.
- Die Einzelinventarisierung zeigt ihren Fortschritt über Profilprüfung, Auslesen, lokales Speichern und anschließende Inventaraktualisierung. Erfolgs- und Fehlerzustand bleiben bis zum Schließen sichtbar.
- Der Vollinventurlauf spiegelt den bestehenden persistenten Bulk-State live in das Modal: frischer „Meine Anzeigen“-Preflight, aktueller Titel, verarbeitete/gesamte Anzeigen, Fortschrittsbalken und terminale Erfolgs-/Fehler-/Prüfmeldung. Die bestehende Statuskachel in der linken Spalte bleibt parallel erhalten.
- Das Schließen des Modals während eines laufenden Vorgangs stoppt den Workflow nicht; der vorhandene Bulk-/Einzelworkflow läuft unverändert weiter.
- Inventarisierungslogik, Profilbindung, Fresh-Snapshot-Semantik, A1-TabRegistry, A2-Correlation, Publish-/Phase-4-Sicherheitsgrenzen, Inserierungs-Lock und Papierkorb bleiben unverändert.
- Neue gezielte Tests `tests/v1160-inventory-capture-modal.cjs` und `tests/v1160-inventory-capture-runtime.cjs`.
<!-- KAR170-END:CHANGELOG:1138 -->

<!-- KAR170-BEGIN:README:853 -->
### Historical README: v1.16.0 – Inventarisierungsdialoge (source line 853)

Die Aktionen **„Alle Anzeigen erfassen“** und **„Geöffnete Anzeige erfassen“** verwenden jetzt einen gemeinsamen dreistufigen Modal-Workflow: **Bestätigen → Erfassen → Ergebnis**. Der Vollinventurlauf zeigt den persistenten Bulk-Fortschritt live mit Zähler, aktuellem Titel und Abschlussstatus; die Einzelinventarisierung visualisiert Profilprüfung, Auslesen, Speichern und Inventaraktualisierung. Das Schließen des Fensters während der Bearbeitung beendet den laufenden Vorgang nicht.
<!-- KAR170-END:README:853 -->

## v1.15.7

<!-- KAR170-BEGIN:CHANGELOG:1147 -->
### Original CHANGELOG: 1.15.7 (source line 1147)

- A1-Lifecycle-Fix: Ein aktiver Bulk-Bearbeiten-Worker, der geschlossen wird bzw. als Registry-Tombstone `gone` vorliegt, terminalisiert jetzt sofort mit `KR_TAB_GONE`; der 90-Sekunden-Worker-Timeout bleibt nur Safety-Net für vorhandene, aber noch nicht inventarisierbare Tabs.
- Verspätete Requests eines bereits entfernten, zum selben Bulk-Run gehörenden Workers werden über den TabRegistry-Tombstone als bekannter `gone`-Lifecycle erkannt statt als generischer Worker-Mismatch.
- Retry-/Failure-Karten in der Bulk-Statuskachel bleiben auch bei langen Titeln strikt innerhalb der Parent-Kachel und wurden kompakter gestaltet.
- Das Feedback-Popover auf „Meine Anzeigen“ besitzt nun ein `×`; eine geschlossene Meldungsinstanz bleibt verborgen, bis sich der fachliche Feedback-Key ändert und damit eine neue Meldung vorliegt.
- Keine Änderung an Publish-Hard-Gate, Phase-4-Löschverifikation, Profilbindung, globalem Inserierungs-Lock oder Fokus-Policy.
<!-- KAR170-END:CHANGELOG:1147 -->

<!-- KAR170-BEGIN:README:857 -->
### Historical README: v1.15.7 – A1 Lifecycle-Fix + UI-Polish (source line 857)

- Geschlossene aktive Bulk-Worker werden über die TabRegistry sofort als `KR_TAB_GONE` terminalisiert; kein 90-Sekunden-Warten mehr auf bereits entfernte Tabs.
- Tombstones klassifizieren verspätete Bulk-Worker-Requests weiterhin als bekannten `gone`-Lifecycle.
- Failure-/Retry-Karten können die Status-Parent-Kachel nicht mehr horizontal überlaufen.
- Das Bulk-Feedback-Popover auf „Meine Anzeigen“ kann per `×` ausgeblendet werden und erscheint erst wieder für eine neue Meldungsinstanz.
<!-- KAR170-END:README:857 -->

## v1.15.6

<!-- KAR170-BEGIN:CHANGELOG:1155 -->
### Original CHANGELOG: 1.15.6 (source line 1155)

- ARCHITEKTUR A1a: zentrale `tabRegistryV1`-Fassade im Shadow-/Facade-Modus eingeführt. Rollen/Ownership für User-/Source-/Renewal-/Archive-/Bulk-/Worker-Tabs sowie die Lifecycle-Zustände `active`, `discarded` und `gone` werden zentral gespiegelt.
- Bestehende `managedWorkerTabsV1`-Einträge werden verlustfrei in die Registry übernommen; der 30-Sekunden-Tombstone bleibt kompatibel. `GET_MANAGED_WORKER_TAB_IDS` läuft nun über die Registry.
- `KR_TAB_GONE` und `KR_TAB_DISCARDED` werden im zentralen Registry-Lifecycle erzeugt. `tabs.onUpdated`, `tabs.onActivated` und `tabs.onRemoved` aktualisieren die Registry; Service-Worker-Neustarts rekonstruieren bekannte Rollen/Ownership aus persistierten Renewal-/Fill-/Archive-/Bulk-Bindings.
- A1a bleibt bewusst Shadow/Facade: keine Fokus-Policy-Änderung, keine A3-State-Machine und keine umfassende Call-Site-Migration.
- UI-Fix: lange slash-getrennte Anzeigentitel können Status-/Meldungskacheln unter den Aktionsbuttons nicht mehr über die linke Spalte hinaus verbreitern; Text bricht innerhalb der Kachel um.
<!-- KAR170-END:CHANGELOG:1155 -->

<!-- KAR170-BEGIN:README:864 -->
### Historical README: v1.15.6 – A1a TabRegistry / Lifecycle-Fassade (source line 864)

Die zentrale `tabRegistryV1` spiegelt Tab-Rollen, Workflow-Ownership und Lifecycle-Zustände (`active`, `discarded`, `gone`) über eine persistente `chrome.storage.session`-Fassade. Bestehende Managed-Worker/Tombstones bleiben kompatibel. Dieser erste A1-Schritt verändert bewusst weder Fokus-Policy noch Workflow-State-Machine. Zusätzlich bleiben Meldungskacheln bei langen Titeln innerhalb der linken Steuerungsspalte.

Chrome-Erweiterung zum lokalen Erfassen eigener laufender Anzeigen auf Kleinanzeigen.de und zum kontrollierten automatischen Neu-Inserieren aus einer gespeicherten Vorlage.
Nach einer ausdrücklichen Bestätigung übernimmt die App die gespeicherten Angaben und Bilder und veröffentlicht die neue Anzeige ausschließlich hinter dem bestehenden Auto-Publish-Hard-Gate. Für den anschließenden Austausch stehen in der Oberfläche **Vollprüfung** und **Schnellprüfung** zur Verfügung. Intern bleiben die technischen Modi `safe`/`fast` erhalten. In beiden Varianten wird die alte Anzeige erst nach den jeweils vorgesehenen Prüfungen gelöscht, ihre Abwesenheit unabhängig bestätigt und ihre lokale Kopie 30 Tage im Papierkorb erhalten.
<!-- KAR170-END:README:864 -->

## v1.15.5

<!-- KAR170-BEGIN:CHANGELOG:1162 -->
### Original CHANGELOG: 1.15.5 – 2026-09-16 (source line 1162)

- UI-/Lifecycle-Patch vor A1: Der Button **„Alle Anzeigen erfassen“** verwendet jetzt eine einzige abgeleitete Enablement-Regel aus Seitenbereitschaft, laufendem Bulk-/Retry-Zustand und Start-in-Flight. Wiederkehrende Health-/Tab-Checks aktualisieren nur `pageReady` und können den Button während eines aktiven Vollinventurlaufs nicht mehr wieder aktivieren; das sichtbare Enable/Disable-Flackern entfällt.
- Meldungs-/Statuskacheln unter den Aktionsbuttons behalten Zeitstempel und `×`; das `×` ist nun bei allen dortigen Meldungstypen konsistent weiter oben/rechts direkt in der oberen rechten Kachelecke positioniert, ohne Text zu überlagern.
- Im Dialog **Mehrere neu inserieren** zeigt der linke Zeilenkreis nun den höchsten sichtbaren Ergebnis-/Attention-Schweregrad: erfolgreich = grün, `needs-review`/Attention = gold, Fehler = rot, laufend = aktiver Türkis-Stil, queued/cancelled = neutral grau. Die Nummer bleibt sichtbar.
- Keine A1-TabRegistry in diesem Build und keine Änderung an Renewal-, Publish-, Phase-4-, Correlation-, Profil-, Lock-, Fokus-, Papierkorb- oder IndexedDB-Semantik.
- Neue gezielte Tests `tests/v1155-ui-polish.cjs` und `tests/v1155-ui-polish-runtime.cjs`.
<!-- KAR170-END:CHANGELOG:1162 -->

<!-- KAR170-BEGIN:README:874 -->
### Historical README: UI-/Lifecycle-Nachschärfung v1.15.5 (source line 874)

Vor dem Start von A1 stabilisiert v1.15.5 drei sichtbare UI-Punkte: **Alle Anzeigen erfassen** bleibt während eines laufenden Bulk-Inventurlaufs zuverlässig deaktiviert, weil Health-/Tab-Checks die Button-Aktivierung nicht mehr direkt überschreiben. Die `×`-Aktion aller Statuskacheln unter den Aktionsbuttons sitzt einheitlich in der oberen rechten Ecke. Im Massenlauf zeigt der linke nummerierte Zeilenkreis den höchsten Schweregrad der Anzeige: grün bei Erfolg, gold bei Attention, rot bei Fehler, türkis während der Bearbeitung und grau für neutrale Zustände.

Die Workflow-/Sicherheitsarchitektur bleibt unverändert; A1 beginnt erst auf Basis dieser Version.
<!-- KAR170-END:README:874 -->

## v1.15.4

<!-- KAR170-BEGIN:CHANGELOG:1170 -->
### Original CHANGELOG: 1.15.4 (source line 1170)

- A2-Abschluss: Bulk-`operationId` wird bereits vor dem erzwungenen „Meine Anzeigen“-Refresh erzeugt und bis in den persistierten Bulk-Run übernommen.
- Diagnose-Summary rollt Warnungen/Fehler einer abgeschlossenen Parent-Operation über `parentOperationId` auch aus Child- und nachgelagerten Child-Operationen hoch.
- `RENEWAL_MY_ADS_FALLBACK_NOT_FOUND` wird bei der expliziten `VERIFY_OWN_AD_ABSENT_BY_ID`-Löschverifikation als erwartete Info statt als Warnung protokolliert; bei normalen Fallback-Suchen bleibt „nicht gefunden“ eine Warnung.
- Meldungs-/Statuskacheln unter den Aktionsbuttons zeigen Datum/Zeit und können per `×` rein visuell ausgeblendet werden; normale UI-Refreshes zeigen dieselbe Bulk-Meldungsinstanz nicht erneut. Neue Runs bzw. neue Statusinstanzen erscheinen wieder.
- Keine Änderungen an A1-TabRegistry, A3-State-Machine, Fokus-, Publish-, Phase-4-Sicherheits- oder IndexedDB-Semantik.
<!-- KAR170-END:CHANGELOG:1170 -->

<!-- KAR170-BEGIN:README:880 -->
### Historical README: A2-Abschluss v1.15.4 (source line 880)

Die Trace-/Correlation-Grundlage umfasst jetzt auch den Bulk-Preflight vor dem Source-Refresh. Diagnose-Summaries berücksichtigen bei einer Parent-Operation deren korrelierte Child-Operationen. Eine erfolgreiche Löschverifikation erzeugt für die erwartete Abwesenheit der Quellanzeige keine Warnung mehr.
Meldungs-/Statuskacheln direkt unter den Aktionsbuttons zeigen zusätzlich einen Zeitstempel und können per `×` ausgeblendet werden, ohne laufende Prozesse, Workflow-Zustände oder Diagnosen zu verändern.
<!-- KAR170-END:README:880 -->

## v1.15.3

<!-- KAR170-BEGIN:CHANGELOG:1178 -->
### Original CHANGELOG: 1.15.3 – 2026-09-16 (source line 1178)

- Architektur A2b umgesetzt: Die in v1.15.0 eingeführten Correlation-IDs werden jetzt durch die vollständigen Renewal-, Massen-Renewal- und Bulk-Lebenszyklen propagiert. Bestehende fachliche IDs bleiben unverändert; Legacy-Sessions ohne `operationId` werden weiterhin nicht künstlich nachgerüstet.
- Späte Renewal-Ereignisse ab `RENEWAL_NEW_ID_CONFIRMED` über Schnell-/Vollprüfung und Phase 4 bis `RENEWAL_REPLACEMENT_COMPLETED` verwenden den persistierten Renewal-Kontext. Phase-4-Requests transportieren die Correlation explizit bis in `inventory-runner.js`.
- Batch-Ereignisse von **Mehrere neu inserieren** tragen die Batch-Operation; Item-Ereignisse tragen die jeweilige Child-Operation mit Batch-Operation als `parentOperationId`. Recovery- und Watchdog-Pfade übernehmen vorhandene Correlation statt neue IDs zu erzeugen.
- Tiefe Bulk-Diagnosen einschließlich `BULK_WORKERS_OPENED`, `BULK_WORKER_SAVED`, `BULK_ITEM_FINISHED` und `BULK_INVENTORY_FINISHED` behalten `operationId`/`bulkRunId`/`runId`. Clientdiagnosen ohne eigenen Trace-Kontext werden anhand persistierter Source-/Worker-/Metadata-Tab-Bindings dem aktiven Workflow zugeordnet.
- Die Änderung basiert auf den realen RED-Befunden der nativen Tests 1–3 von v1.15.0–v1.15.2: verlorene Correlation im Renewal-Tail, in Mass-Terminalevents sowie bei tiefen Bulk-/Low-Level-Fehlerereignissen.
- Keine A1-TabRegistry, keine A3-State-Machine und keine Änderung an Auto-Publish-Hard-Gate, Submit-Verbot, Profilbindung, globalem Inserierungs-Lock, Voll-/Schnellprüfung, strikt sequenziellem Massenlauf, Phase-4-Verifikation, atomarer Promotion oder 30-Tage-Papierkorb.
- Neue gezielte Tests `tests/v1153-correlation-propagation.cjs` und `tests/v1153-correlation-runtime.cjs`.
<!-- KAR170-END:CHANGELOG:1178 -->

<!-- KAR170-BEGIN:README:885 -->
### Historical README: Version 1.15.3: A2b vollständige Correlation-Propagation (source line 885)

- A2b führt die in v1.15.0 eingeführten Trace-IDs jetzt durch die vollständigen Renewal-, Massen-Renewal- und Bulk-Lebenszyklen. `operationId`, `parentOperationId`, `renewalId`, `fillId`, `bulkRunId`, `runId` und `massBatchId` bleiben an den jeweiligen Workflow-Grenzen erhalten, ohne Legacy-Datensätzen nachträglich IDs zu erfinden.
- Späte Renewal-Ereignisse ab Publish-/New-ID-Bestätigung, Voll-/Schnellprüfung, Phase 4 und `RENEWAL_REPLACEMENT_COMPLETED` verwenden den persistierten Renewal-Kontext. Die Phase-4-Requests `DELETE_OWN_AD_BY_ID`, `FIND_OWN_AD_BY_ID` und `VERIFY_OWN_AD_ABSENT_BY_ID` transportieren die Correlation explizit bis in `inventory-runner.js`.
- Massen-Renewal trennt Batch- und Child-Operation sauber: Batch-Ereignisse tragen die Batch-`operationId`; Item-Ereignisse tragen die Child-`operationId` mit Batch-Operation als `parentOperationId`. Recovery und Watchdog übernehmen vorhandene IDs.
- Tiefe Bulk-Ereignisse wie `BULK_WORKERS_OPENED`, `BULK_WORKER_SAVED`, `BULK_ITEM_FINISHED` und `BULK_INVENTORY_FINISHED` tragen nun die persistierte Run-Correlation. Low-Level-Clientdiagnosen werden zusätzlich über persistierte Source-/Worker-/Metadata-Tab-Bindings dem aktiven Bulk-/Renewal-Workflow zugeordnet.
- Die Diagnose kann dadurch späte Fehler und Abschlussereignisse derselben Operation zuordnen. Das behebt die real beobachteten A2b-RED-Fälle aus den Tests 1–3; eine erneute native Abnahme bestätigt die Laufzeitwirkung.
- Keine A1-TabRegistry, keine A3-Transition-State-Machine und keine Änderung an Fokus-, Publish-, Löschverifikations-, Lock-, Profil- oder Papierkorb-Semantik.
- Neue gezielte Tests `tests/v1153-correlation-propagation.cjs` und `tests/v1153-correlation-runtime.cjs`.
<!-- KAR170-END:README:885 -->

## v1.15.2

<!-- KAR170-BEGIN:CHANGELOG:1188 -->
### Original CHANGELOG: 1.15.2 – 2026-09-16 (source line 1188)

- Kritischer Freshness-Fix für **Alle Anzeigen erfassen**: Ein vollständiger Bulk-Lauf wird nicht mehr aus einem möglicherweise lange offenen/stalen „Meine Anzeigen“-DOM gestartet. Der Background lädt denselben PROJECTS-Tab vor jedem neuen Vollinventurlauf mit Cache-Bypass neu, wartet auf den vollständigen Reload und stellt die Content-Verbindung wieder her, ohne den Tab unnötig zu fokussieren.
- Nach dem Reload werden Profilname, Online-Zähler und Anzeigenkarten neu gelesen. Bei einem Einseiten-Snapshot muss die Zahl eindeutiger Anzeigenkarten exakt `N Anzeigen online` entsprechen; bei Profilwechsel oder unvollständigem Snapshot startet der Lauf nicht. Mehrseitenläufe behalten die bestehende sequenzielle Pagination.
- `BULK_INIT_RUN` akzeptiert neue Vollinventurläufe nur noch mit explizitem Fresh-Source-Handschlag. Neue Diagnoseereignisse `BULK_SOURCE_REFRESH_STARTED`, `BULK_SOURCE_REFRESHED` und `BULK_SOURCE_SNAPSHOT_CREATED` dokumentieren den erzwungenen Reload und den daraus erzeugten Snapshot.
- Edit-Worker werden nicht mehr bis zu 90 Sekunden weiter gepollt, wenn ihre Navigation bereits vollständig auf einer öffentlichen oder sonst eindeutig nicht bearbeitbaren Seite gelandet ist. Dieser Zustand wird sofort als terminaler Item-Fehler `BULK_EDIT_WORKER_NOT_EDITABLE` behandelt; derselbe Schutz gilt für Einzel-Retrys.
- Die Änderung reagiert auf den real reproduzierten Stale-DOM-Fall, bei dem ein lange offener „Meine Anzeigen“-Tab noch IDs bereits ersetzter/gelöschter Anzeigen enthielt. Der Online-Zähler-Fix aus v1.15.1 bleibt unverändert erhalten.
- Renewal-, A2a-Correlation-, Publish-, Phase-4-Löschverifikations-, Profilbindungs-, globaler Inserierungs-Lock-, Fokus- und Papierkorb-Semantik bleiben unverändert.
- Neue gezielte Tests `tests/v1152-bulk-freshness.cjs` und `tests/v1152-bulk-freshness-runtime.cjs`.
<!-- KAR170-END:CHANGELOG:1188 -->

<!-- KAR170-BEGIN:README:895 -->
### Historical README: Version 1.15.2: frischer Bulk-Snapshot und frühe Worker-Terminalisierung (source line 895)

- **Alle Anzeigen erfassen** erzwingt vor jedem neuen vollständigen Lauf einen Reload desselben „Meine Anzeigen“-PROJECTS-Tabs mit Cache-Bypass. Erst nach abgeschlossenem Reload und erneut verbundener Content-Schicht wird der Snapshot gebildet.
- Das nach dem Reload erkannte Profil wird gegen das vor dem Start ausgewählte Profil geprüft. Bei einer einzelnen Seite muss der frische Snapshot exakt so viele eindeutige Anzeigenkarten enthalten wie `N Anzeigen online`; unvollständige/stale Snapshots werden vor dem Start abgewiesen.
- Der Quelltab wird für den Refresh nicht extra fokussiert. Mehrseitige Läufe bleiben sequenziell und verwenden die bestehende Pagination ab dem frisch geladenen Startzustand.
- Ein Edit-Worker, der nach vollständiger Navigation nicht mehr auf `p-anzeige-bearbeiten.html?adId=<erwartete ID>` steht, wird früh terminalisiert. Öffentliche `/s-anzeige/...`-Redirects erzeugen `BULK_EDIT_WORKER_NOT_EDITABLE` statt einer bis zu 90 Sekunden langen Extraktions-Retry-Schleife. Das gilt auch für manuelle Einzel-Retrys.
- Die Diagnose dokumentiert Fresh-Reload und Snapshot über `BULK_SOURCE_REFRESH_STARTED`, `BULK_SOURCE_REFRESHED` und `BULK_SOURCE_SNAPSHOT_CREATED`.
- Keine Änderung an Renewal-/Publish-/Phase-4-/Lock-/Papierkorb-/A2a-Grundsemantik.
<!-- KAR170-END:README:895 -->

## v1.15.1

<!-- KAR170-BEGIN:CHANGELOG:1198 -->
### Original CHANGELOG: 1.15.1 – 2026-09-16 (source line 1198)

- Gezielter Kompatibilitätsfix für **Alle Anzeigen erfassen**: Die Sollzahl wird nun sowohl aus dem real beobachteten kompakten Format `N Anzeigen online` als auch aus dem bisherigen Format `N Anzeigen online / M gesamt` erkannt.
- `expectedTotal` bleibt fachlich ausschließlich der Online-Zähler `N`; die optionale Gesamtzahl `M` wird nur weiterhin geparst, wenn sie tatsächlich vorhanden ist. Unqualifizierte Zahlen oder abweichende Wortreihenfolgen werden nicht als Sollzahl interpretiert.
- Das bisherige Verhalten für deutsche Tausenderpunkte bleibt erhalten.
- Der Fehler wurde mit dem real reproduzierten Einseiten-Konto als RED-Fall festgehalten und anschließend GREEN umgesetzt; das bisherige Mehrseiten-/Langformat bleibt durch Regressionstest geschützt.
- Renewal-, Correlation-, Publish-, Lösch-, Profil-, Lock-, Fokus- und Recovery-Logik bleiben unverändert.
- Neuer gezielter Test `tests/v1151-online-count.cjs`.
<!-- KAR170-END:CHANGELOG:1198 -->

<!-- KAR170-BEGIN:README:904 -->
### Historical README: Version 1.15.1: Bulk-Zähler-Kompatibilitätsfix (source line 904)

- **Alle Anzeigen erfassen** akzeptiert jetzt beide real beobachteten Kleinanzeigen-Zählerformate: `N Anzeigen online` sowie `N Anzeigen online / M gesamt`.
- Für `expectedTotal` wird weiterhin ausschließlich der eindeutig ausgewiesene Online-Zähler `N` verwendet; unqualifizierte oder umgestellte Zahlen werden nicht geraten.
- Das bisherige Langformat inklusive deutscher Tausenderpunkte bleibt vollständig unterstützt.
- Keine Änderung an Renewal, A2a-Correlation, Publish, Löschverifikation, Fokus-Policy, Profilbindung oder globalem Inserierungs-Lock.
- `tests/v1151-online-count.cjs` schützt beide real beobachteten Formate sowie Negativfälle.
<!-- KAR170-END:README:904 -->

## v1.15.0

<!-- KAR170-BEGIN:CHANGELOG:1207 -->
### Original CHANGELOG: 1.15.0 – 2026-09-16 (source line 1207)

- Start des Architekturblocks **A1–A9** mit **A2a Correlation Foundation** als bewusst additivem ersten Schritt; kein Big-Bang-Refactoring und keine Änderung der fachlichen Renewal-/Publish-/Lösch-Semantik.
- Neue persistierte Trace-Felder `operationId` und optional `parentOperationId`. Ein normaler Renewal und seine Fill-Sitzung teilen dieselbe `operationId`; ein Renewal innerhalb von **Mehrere neu inserieren** erhält eine eigene Operation mit der Batch-Operation als `parentOperationId`.
- Massen-Neuinserate besitzen zusätzlich zur unveränderten fachlichen `massBatchId` eine eigene `operationId`; gestartete Items übernehmen die Child-/Parent-Correlation in den persistenten Batch-Snapshot.
- Bulk-Inventarisierung behält `runId` unverändert und ergänzt `bulkRunId` zunächst kompatibel mit demselben Wert sowie eine separate `operationId`. Bestehende v1.14.5-Läufe/Sessions ohne neue Felder bleiben gültig und erhalten keine erfundenen IDs.
- Renewal-Skeleton, Renewal-/Fill-/ZIP-Neuinserat-Sessions und ihre öffentlichen Diagnose-Snapshots transportieren Correlation-Felder additiv. `template-filler.js` übernimmt die Session-Correlation in seine Diagnoseereignisse.
- Die zentrale Diagnose normalisiert bekannte Correlation-Felder in `context`; der Standard-Diagnoseexport korreliert bevorzugt über `operationId` und enthält die neuen Felder in Fill-/Renewal-/Bulk-/Mass-Batch-Snapshots. Info-Aggregation trennt operation-gebundene Live-Refresh-Ereignisse voneinander.
- Unverändert: feste Extension-ID/Manifest-Key, globaler Inserierungs-Lock, Auto-Publish-Hard-Gate, kein `.submit()`-/`requestSubmit()`-Bypass, Profilbindung, Voll-/Schnellprüfung, strikt sequenzieller Massenlauf, Phase-4-Löschverifikation mit frischem `VERIFY_OWN_AD_ABSENT_BY_ID`, atomare Promotion nach `source-delete-verified`, 30-Tage-Papierkorb, bestehende Recovery-/Watchdog-/monotone Fill-Guards.
- Neue gezielte Tests `tests/v1150-correlation.cjs` und `tests/v1150-correlation-runtime.cjs`.
<!-- KAR170-END:CHANGELOG:1207 -->

<!-- KAR170-BEGIN:README:912 -->
### Historical README: Version 1.15.0: A2a Correlation Foundation (source line 912)

- Additive Workflow-Korrelation über `operationId` und optional `parentOperationId`, ohne bestehende fachliche IDs zu ersetzen.
- Renewal und zugehöriger Fill teilen eine Operation; Massen-Neuinserate bilden eine Parent-Operation mit eigenen Child-Operationen pro Einzelworkflow.
- Bulk-Inventarisierung ergänzt `bulkRunId` kompatibel zum bestehenden `runId` und behält `runId` vollständig bei.
- Diagnoseexport und Template-Filler transportieren die neuen Correlation-Felder, damit Recovery-/Lifecycle-Ereignisse in den nächsten Architekturphasen eindeutig zugeordnet werden können.
- Alte v1.14.5-Sessions ohne Correlation-Felder bleiben lesbar/recoverbar. Sicherheits- und Publish-Grenzen sind unverändert.
<!-- KAR170-END:README:912 -->

## v1.14.5

<!-- KAR170-BEGIN:CHANGELOG:1218 -->
### Original CHANGELOG: 1.14.5 – 2026-09-16 (source line 1218)

- Diagnose-Qualität verbessert: sehr häufige gleichartige Info-Ereignisse `INVENTORY_LIVE_REFRESH_APPLIED` und `PROFILE_RECOGNIZED` werden innerhalb kurzer Zeitfenster zusammengeführt statt den Diagnoseverlauf mit nahezu identischen Zeilen zu dominieren. Aggregierte Einträge behalten `occurrences`, `firstTimestamp` und `lastTimestamp`; die jeweils letzten Details bleiben sichtbar.
- `summary.txt` unterscheidet nun zwischen exportierten Diagnoseeinträgen und den dadurch repräsentierten Rohereignissen und weist die Zahl aggregierter Wiederholungen separat aus. `environment.json` enthält dieselben Zähler.
- `mass-renewal-batch.json` enthält jetzt die persistierte monotone Batch-`revision`, sodass serialisierte Batch-State-Änderungen im Diagnose-ZIP direkt nachvollziehbar sind.
- UI-Fix für den bestätigten Stop-after-current-Fall: `cancelled / not-started-after-stop` zeigt in der Abschlussübersicht keine aktive/pulsierende Phase 1 mehr. Alle vier Phasen bleiben neutral, weil dieser Batch-Eintrag tatsächlich nie gestartet wurde.
- Batch-/Renewal-Geschäftslogik und alle bestehenden Sicherheitsgrenzen bleiben unverändert.
- Neuer Regressionstest `tests/v1145-contract.cjs`; bestehende Regressionen bis v1.14.4 bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1218 -->

<!-- KAR170-BEGIN:README:920 -->
### Historical README: Version 1.14.5: kompaktere Diagnose und korrekter Stop-Phasenstatus (source line 920)

- Wiederkehrende reine Info-Ereignisse für Live-Inventar-Refresh und wiederholte Profilerkennung werden in kurzen Zeitfenstern diagnostisch zusammengeführt. Ein Eintrag kann dadurch mehrere gleichartige Vorkommnisse repräsentieren und enthält deren Anzahl sowie ersten/letzten Zeitstempel.
- Der Diagnose-Summary zeigt sowohl die Zahl physisch exportierter Einträge als auch die Zahl der tatsächlich repräsentierten Ereignisse. Dadurch bleibt sichtbar, wie stark komprimiert wurde, ohne das Diagnose-ZIP mit Dutzenden gleichartigen Zeilen zu füllen.
- Der Massen-Neuinserat-Snapshot exportiert die monotone Batch-`revision`, damit State-Mutationen und Recovery besser nachvollzogen werden können.
- Nach **Nach aktueller Anzeige stoppen** bleiben nie gestartete Positionen in der Phasenanzeige vollständig neutral; insbesondere pulsiert Phase 1 nicht mehr irrtümlich.
- Die fachliche Batch-, Renewal-, Publish-, Lösch- und Recovery-Logik bleibt unverändert.
- `tests/v1145-contract.cjs` schützt Diagnoseaggregation, sichtbare Batch-Revision und den neutralen Phasenstatus nicht ausgeführter Positionen.
<!-- KAR170-END:README:920 -->

## v1.14.4

<!-- KAR170-BEGIN:CHANGELOG:1228 -->
### Original CHANGELOG: 1.14.4 – 2026-09-16 (source line 1228)

- Robustheits-Patch für **Mehrere neu inserieren**: Batch-State-Änderungen laufen jetzt über eine serialisierte Read-Modify-Write-Strecke mit monotoner `revision`, damit Stop-Wunsch, terminaler Einzelabschluss, Retry und Queue-Fortschritt sich nicht mehr durch konkurrierende Vollobjekt-Schreibvorgänge gegenseitig überschreiben können.
- Recovery-Lücke für `running / starting` ohne bereits angehängte `renewalId` geschlossen. Beim Service-Worker-Neustart wird zuerst nach einer passenden Renewal-Sitzung über `massBatchId + massBatchItemIndex` gesucht und sie wieder angebunden; existiert keine, wird der noch nicht eindeutig gestartete Artikel kontrolliert auf Queue zurückgesetzt und neu gestartet statt dauerhaft zu blockieren.
- Terminale Fill-Zustände sind jetzt monoton geschützt. Verspätete Content-Script-Nachrichten dürfen `complete`, `needs-review` oder `error` nicht wieder auf `running` bzw. einen älteren Stage zurücksetzen.
- Plattformfehler-Erkennung erweitert: Neben `/anzeige-aufgeben-fehler.html` werden auch semantisch eindeutige Kleinanzeigen-4xx-/5xx-Fehlerseiten anhand von URL-Pfad sowie – soweit verfügbar – Fehlercode, Seitentitel und Fehlerüberschrift erkannt. Erkannte Codes wie 400 oder 500 werden diagnostisch erfasst. Normale Formular-/Validierungsseiten bleiben von der Erkennung ausgeschlossen.
- Neuer Fortschritts-Watchdog für den aktiven Massenartikel: Bei mindestens fünf Minuten ohne bestätigten Workflow-Fortschritt wird der gebundene Tab nochmals auf eine Fehlerseite geprüft; andernfalls wird der festhängende Artikel kontrolliert auf Attention (`progress-watchdog-timeout`) terminalisiert. Der Watchdog führt keinen Hard-Cancel des aktiven Artikels aus. Content-Script-Heartbeats wecken die Prüfung, gelten aber selbst ausdrücklich nicht als Fortschritt.
- Neue Diagnoseereignisse unter anderem `MASS_RENEWAL_BATCH_MUTATION_FAILED`, `MASS_RENEWAL_RECOVERY_RENEWAL_REBOUND`, `MASS_RENEWAL_RECOVERY_STARTING_REQUEUED`, `TEMPLATE_FILL_TERMINAL_UPDATE_IGNORED` und `MASS_RENEWAL_WATCHDOG_TIMEOUT`; `KLEINANZEIGEN_ERROR_PAGE_DETECTED` enthält nun optional den erkannten HTTP-Fehlercode und die Erkennungsquelle.
- Alle bestehenden Publish-, Profil-, Löschverifikations-, atomaren Promotions-, Papierkorb- und Stop-after-current-Sicherheitsgrenzen bleiben unverändert.
- Neuer Regressionstest `tests/v1144-contract.cjs`; bestehende Regressionen bis v1.14.3 bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1228 -->

<!-- KAR170-BEGIN:README:929 -->
### Historical README: Version 1.14.4: Batch-Robustheit, 4xx/5xx-Erkennung und Fortschritts-Watchdog (source line 929)

- Die persistente Massenlauf-State-Mutation ist serialisiert. Stop-Wunsch, terminaler Einzelabschluss, Retry und Queue-Fortschritt schreiben nicht mehr konkurrierend auf veraltete Batch-Snapshots.
- Nach Service-Worker-Neustarts wird ein `running`-Artikel ohne gespeicherte `renewalId` anhand `massBatchId` und `massBatchItemIndex` wieder mit seiner Renewal-Sitzung verbunden. Falls noch keine Renewal-Sitzung existiert, wird ein reiner `starting`-Zwischenzustand kontrolliert neu eingequeued statt festzuhängen.
- Terminale Vorlagen-Fill-Zustände bleiben terminal; verspätete Nachrichten eines vorherigen Dokuments können einen bereits beendeten Fehler-/Attention-Zustand nicht wieder öffnen.
- Kleinanzeigen-Plattformfehler werden nicht mehr nur über eine einzelne 500er-URL erkannt. Eindeutige 4xx-/5xx-Fehlerseiten können zusätzlich über URL-Muster, HTTP-Fehlercode und Seitenmarker wie Titel/Überschrift erkannt werden; der erkannte Fehlercode wird in der Diagnose mitgeführt.
- Für unbekannte Hänger überwacht ein Watchdog den **bestätigten Workflow-Fortschritt** des aktuell laufenden Massenartikels. Fünf Minuten ohne echten Fortschritt lösen eine erneute Fehlerseitenprüfung und anschließend – nur wenn weiterhin kein Fortschritt vorliegt – einen sicheren Attention-Abschluss aus. Heartbeats dienen nur zum Wecken des Service Workers und zählen nicht selbst als Fortschritt.
- Der Watchdog ist kein Hard-Cancel. Bestehende Stop-after-current-, Auto-Publish-, Profil-, Phase-4-, Löschverifikations-, Promotions- und Papierkorb-Sicherheitsgrenzen bleiben bestehen.
- `tests/v1144-contract.cjs` schützt Serialisierung, Recovery, terminale Monotonie, 4xx/5xx-Erkennung und Watchdog-Vertrag.
<!-- KAR170-END:README:929 -->

## v1.14.3

<!-- KAR170-BEGIN:CHANGELOG:1240 -->
### Original CHANGELOG: 1.14.3 – 2026-09-15 (source line 1240)

- Kritischer Deadlock-Fix für den real beobachteten Kleinanzeigen-Pfad `/anzeige-aufgeben-fehler.html`: Ein gebundener laufender Vorlagen-/Renewal-Tab bleibt auf dieser Plattformfehlerseite nicht mehr mit einem veralteten laufenden Stage wie `category-continuing` hängen.
- Der Background erkennt die bekannte Inserierungs-Fehlerseite direkt aus der Tab-Navigation und terminalisiert die zugehörige aktive Fill-Sitzung als `error / platform-error-page`; diese Erkennung benötigt keinen erfolgreichen Content-Script-Fortschritt. Der Template-Filler besitzt zusätzlich eine defensive eigene `platform-error`-Erkennung.
- Gebundene Renewals wechseln auf `verification-failed / platform-error-page` mit verständlicher Fehlerursache. Dadurch greift die bestehende Massenlauf-Reconciliation wieder: Attention/Fehler statt Deadlock, normaler Weiterlauf zum nächsten Artikel oder – bei vorgemerkt **Nach aktueller Anzeige stoppen** – sauberer Abschluss als `stopped-with-attention` mit **Nicht ausgeführt** für verbleibende Queue-Einträge.
- ZIP-Neuinserate, die dieselbe Fehlerseite in Phase 1 erreichen, werden ebenfalls terminal und sicher als Fehler beendet.
- Neues Diagnoseereignis `KLEINANZEIGEN_ERROR_PAGE_DETECTED`; ein zusätzlicher `KLEINANZEIGEN_ERROR_PAGE_TERMINALIZATION_FAILED`-Fehler wird nur protokolliert, falls die interne Terminalisierung selbst unerwartet scheitert.
- Die bisherige Anzeige wird in diesem Pfad nicht gelöscht. Auto-Publish-Hard-Gate, kein direkter Submit-Bypass, Profilbindung, globale Inserierungs-Sperre, Phase-4-Löschverifikation, unabhängiger Abwesenheits-Vollscan, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer Regressionstest `tests/v1143-contract.cjs`; bestehende Regressionen bis v1.14.2 bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1240 -->

<!-- KAR170-BEGIN:README:939 -->
### Historical README: Version 1.14.3: Deadlock-Fix für Kleinanzeigen-Fehlerseite beim Inserieren (source line 939)

- Behebt den real reproduzierten Deadlock, wenn ein gebundener Neu-Inserat-/Renewal-Tab während Phase 1 auf Kleinanzeigen zu `/anzeige-aufgeben-fehler.html` navigiert. Der Einzelworkflow bleibt nicht mehr dauerhaft auf einem vorherigen laufenden Stage wie `category-continuing` stehen.
- Die bekannte Inserierungs-Fehlerseite wird sowohl im Background über die Tab-Navigation als auch defensiv im Template-Filler als eigener `platform-error` erkannt. Die Background-Erkennung ist nicht davon abhängig, dass der Content-Script-Ablauf auf der Fehlerseite erfolgreich fortgesetzt werden kann.
- Der aktive Fill wird terminal auf `error / platform-error-page` gesetzt. Ein gebundener Renewal wechselt auf `verification-failed / platform-error-page` und erhält eine verständliche Fehlerursache; ZIP-Neuinserate werden entsprechend in Phase 1 sicher beendet.
- Bei **Mehrere neu inserieren** greift danach wieder die bestehende terminale Batch-Reconciliation: Ohne Stop-Wunsch wird der fehlerhafte Artikel als Attention/Fehler markiert und der nächste Queue-Eintrag darf starten. Mit vorgemerkt **Nach aktueller Anzeige stoppen** endet der Batch nach diesem terminalen Fehler als `stopped-with-attention`; noch nicht gestartete Positionen werden **Nicht ausgeführt**.
- Die Fehlerseite erzeugt das eindeutige Diagnoseereignis `KLEINANZEIGEN_ERROR_PAGE_DETECTED`. Damit erscheint dieser reale Plattformfehler nicht mehr als scheinbar fehlerfreier, aber festhängender Lauf.
- Die bisherige Anzeige wird in diesem Fehlerpfad ausdrücklich nicht gelöscht; Publish-, Profil-, Phase-4-, Löschverifikations-, Papierkorb- und Promotions-Sicherheitsgrenzen bleiben unverändert.
- `tests/v1143-contract.cjs` schützt die Fehlerseiten-Erkennung, Terminalisierung und die Anbindung an den bestehenden Batch-/Stop-after-current-Pfad.
<!-- KAR170-END:README:939 -->

## v1.14.2

<!-- KAR170-BEGIN:CHANGELOG:1250 -->
### Original CHANGELOG: 1.14.2 – 2026-09-15 (source line 1250)

- Schritt 2 von **Mehrere neu inserieren** verwendet jetzt feste Layoutspalten für Inhalt, die vier Phasenkreise und Status/Aktion. Die Phasenkreise bleiben dadurch zeilenübergreifend exakt ausgerichtet und springen nicht mehr mit unterschiedlich breiten Badges oder Aktionsbuttons.
- In Schritt 3 erhalten vollständig erfolgreiche Positionen einen dezent grünen Zeilenhintergrund; Fehler-/Attention-Positionen werden dezent rot hinterlegt. Titelbild, Phasenstatus und konkrete Wiederaufnahmeaktion bleiben zusätzlich sichtbar.
- Das X oben rechts kommuniziert bei laufendem Batch jetzt ausdrücklich **„Fenster schließen – Vorgang läuft im Hintergrund weiter“** (Tooltip/ARIA). Das Schließen des Modals stoppt den Batch weiterhin nicht.
- Neue Aktion in Schritt 2: **Nach aktueller Anzeige stoppen**. Vor dem Vormerken erscheint der gestaltete App-Bestätigungsdialog; kein Browser-`confirm()`/`prompt()`. Die Bestätigung erklärt, dass die aktuell laufende Anzeige vollständig zu Ende geführt wird und erst danach keine weitere Anzeige mehr startet.
- Der Stopp ist geordnet und persistent: `stopAfterCurrentRequested` wird im Batch gespeichert. Der aktive Einzelworkflow wird niemals hart abgebrochen. Sobald er terminal erfolgreich oder mit Aufmerksamkeit endet, werden noch nicht gestartete Queue-Einträge als **Nicht ausgeführt** markiert und der Batch endet als `stopped` bzw. `stopped-with-attention`.
- Bereits abgeschlossene Anzeigen bleiben unverändert; ein späterer Retry eines Attention-Eintrags bleibt möglich. Nicht ausgeführte Positionen werden in der Abschlussübersicht separat gezählt.
- Neue Diagnoseereignisse `MASS_RENEWAL_BATCH_STOP_REQUESTED` und `MASS_RENEWAL_BATCH_STOPPED`; neuer Regressionstest `tests/v1142-contract.cjs`.
- Bestehende Einzelworkflow-, Publish-, Prüf-, Lösch-, Papierkorb-, Profil- und Recovery-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1250 -->

<!-- KAR170-BEGIN:README:950 -->
### Historical README: Version 1.14.2: ruhiger Fortschritt und geordneter Batch-Stopp (source line 950)

- Die vier Phasenindikatoren in Schritt 2 stehen jetzt in einer festen eigenen Spalte; rechts davon besitzt Status/Aktion ebenfalls einen festen Bereich. Unterschiedlich breite Badges oder Buttons verschieben den Phasenfortschritt nicht mehr.
- Die Abschlussübersicht signalisiert das Ergebnis zusätzlich über die ganze Zeile: erfolgreiche Positionen dezent grün, Fehler-/Attention-Positionen dezent rot.
- Beim laufenden Batch erklärt das X per Tooltip und zugänglicher Beschriftung: **Fenster schließen – Vorgang läuft im Hintergrund weiter**. Es bleibt ausschließlich ein Modal-Schließen.
- Schritt 2 besitzt neu **Nach aktueller Anzeige stoppen**. Ein gestalteter Bestätigungsdialog fragt den geordneten Stopp ab. Die aktuell laufende Anzeige wird nicht abgebrochen, sondern vollständig bis zu ihrem terminalen Zustand verarbeitet. Erst danach startet keine weitere ausgewählte Anzeige mehr.
- Noch nicht gestartete Positionen werden nach bestätigtem Stopp als **Nicht ausgeführt** markiert. Der persistierte Batch endet als `stopped` oder bei zusätzlich vorhandenen Attention-Fällen als `stopped-with-attention`.
- Der Stop-Wunsch ist persistent und überlebt Service-Worker-Neustarts; der normale Einzelworkflow und seine Sicherheitsgrenzen bleiben unangetastet.
- `tests/v1142-contract.cjs` schützt feste Phasenpositionen, Ergebnisfarben, X-Hinweis und den geordneten Stop-after-current-Vertrag.
<!-- KAR170-END:README:950 -->

## v1.14.1

<!-- KAR170-BEGIN:CHANGELOG:1261 -->
### Original CHANGELOG: 1.14.1 – 2026-09-15 (source line 1261)

- UI/UX-Finishing für **Mehrere neu inserieren**: Der Prüfmodus bleibt im Kicker über alle drei Schritte sichtbar; **SCHNELLPRÜFUNG** erhält wieder den gelben Modusakzent.
- Schritt 1 verwendet kompakte Footer-Aktionen: **Abbrechen** links und **Start** rechts, beide in normaler Buttonbreite statt Vollbreiten-CTA.
- Schritt 2 zeigt pro Anzeige zusätzlich das kleine Titelbild und einen kompakten Vier-Phasen-Fortschritt. Aktive Phasen pulsieren dezent, abgeschlossene Phasen sind vollflächig grün, Fehlerphasen rot und in der Schnellprüfung übersprungene Datenkontrolle wird neutral markiert. Die Phasenbeschreibung steht als Tooltip zur Verfügung.
- Sichtbare technische Statuswerte wie `queued` wurden entfernt. Wartende Anzeigen heißen **Wartet auf Start**; laufende Anzeigen zeigen die aktuelle Phase in verständlicher Sprache.
- Schritt 2 und Schritt 3 erhalten eigene, zum Zustand passende Erklärungstexte; die Abschlussliste heißt **Ergebnisse**.
- Schritt 3 zeigt bei erfolgreichen Anzeigen weiterhin das passive Badge **Erfolgreich**. Attention-/Fehlerfälle erhalten stattdessen möglichst eine konkrete Aktion: **Neu inserieren erneut starten**, **Prüfung erneut starten** oder **Austausch abschließen**. **Letzte Phase erneut starten** bleibt ausschließlich Fallback, wenn keine fachlich eindeutigere Bezeichnung möglich ist.
- **Schließen** ist in der Abschlussansicht wieder ein kompakter, rechtsbündiger Button.
- Neuer Regressionstest `tests/v1141-contract.cjs`; bestehende Batch-Orchestrierung und Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1261 -->

<!-- KAR170-BEGIN:README:960 -->
### Historical README: Version 1.14.1: Massen-Neuinserat UI/UX-Finishing (source line 960)

- **SCHNELLPRÜFUNG** wird im Modal-Kicker über Auswahl, Verarbeitung und Übersicht wieder gelb hervorgehoben.
- Start-/Abschlussaktionen sind kompakt ausgerichtet: **Abbrechen** links, **Start** bzw. **Schließen** rechts.
- Während der Verarbeitung zeigt jede ausgewählte Anzeige ihr Titelbild sowie vier nummerierte Phasen mit Tooltip. Aktiv = dezent pulsierend, abgeschlossen = grün, Fehler = rot, in der Schnellprüfung übersprungene Datenkontrolle = neutral.
- Sichtbare technische Statusbegriffe wurden entfernt; wartende Anzeigen heißen **Wartet auf Start**, laufende Anzeigen zeigen die aktuelle Phase.
- Die Abschlussansicht heißt **Ergebnisse**. Erfolgreiche Einträge behalten das Badge **Erfolgreich**; problematische Einträge bieten abhängig vom Zustand **Neu inserieren erneut starten**, **Prüfung erneut starten** oder **Austausch abschließen**. **Letzte Phase erneut starten** wird nur als Fallback verwendet.
- Die zugrunde liegende strikt sequenzielle Batch-Orchestrierung, Persistenz/Recovery und alle bestehenden Sicherheitsgrenzen bleiben unverändert.
- `tests/v1141-contract.cjs` schützt diese UI-/UX-Regeln.
<!-- KAR170-END:README:960 -->

## v1.14.0

<!-- KAR170-BEGIN:CHANGELOG:1272 -->
### Original CHANGELOG: 1.14.0 (source line 1272)

- Neues Feature **Mehrere neu inserieren** im bestehenden Bereich **AKTIONEN**, direkt unter **Aus ZIP neu inserieren**.
- Größeres Drei-Schritt-Modal: kompakte Auswahl-Tabelle (Checkbox, Titelbild, Anzeige, Preis, Endet am), strikt sequentielle Verarbeitung und Abschlussübersicht.
- Maximal 10 Anzeigen pro Massenlauf; Standardsortierung nach frühestem Ende. Keine Filter-/Sortiersteuerung in dieser ersten Version.
- Jeder Eintrag verwendet unverändert den normalen Neu-inserieren-/Renewal-Workflow im beim Batchstart gewählten Prüfmodus.
- Der nächste Eintrag startet erst nach vollständigem Erfolg oder terminalem Fehler/Benutzereingriff/needs-review des aktuellen Eintrags. Ein problematischer Eintrag stoppt die restliche Queue nicht.
- Persistenter Batch-Zustand `massRenewalBatchV1` mit Recovery nach Service-Worker-Neustart und Diagnoseexport `mass-renewal-batch.json`.
- Abschlussübersicht unterstützt passende Wiederholungen: erneute Prüfung, Austausch abschließen oder vollständigen Einzelvorgang neu starten.
- Bestehende Publish-, Profil-, Verifikations-, Lösch-, Papierkorb- und Recovery-Sicherheitsgrenzen bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1272 -->

<!-- KAR170-BEGIN:README:970 -->
### Historical README: Version 1.14.0: Mehrere neu inserieren (source line 970)

- Im Bereich **AKTIONEN** steht direkt unter **Aus ZIP neu inserieren** die neue Funktion **Mehrere neu inserieren**.
- Das Drei-Schritt-Modal bietet eine kompakte Auswahl bis maximal 10 Anzeigen, eine strikt sequenzielle Verarbeitung und eine Abschlussübersicht. Die Auswahl ist standardmäßig nach dem frühesten Enddatum sortiert.
- Jeder Eintrag verwendet unverändert den bestehenden normalen Neu-Inserat-/Renewal-Workflow im beim Batchstart gewählten Modus. Es läuft fachlich immer nur ein Einzelworkflow gleichzeitig.
- Der nächste Artikel startet erst nach vollständigem Erfolg oder nach einem terminalen Fehler-/Benutzereingriff-Zustand des aktuellen Artikels. Ein problematischer Artikel stoppt die restlichen ausgewählten Anzeigen nicht.
- Der Batchzustand wird persistent unter `massRenewalBatchV1` gespeichert und kann nach einem Service-Worker-Neustart fortgesetzt werden.
- Die Abschlussübersicht bietet zustandsabhängige Wiederaufnahmeaktionen über den bestehenden Einzelworkflow. Publish-, Profil-, Prüf-, Lösch-, Papierkorb- und Recovery-Sicherheitsgrenzen bleiben unverändert.
- `tests/v1140-contract.cjs` schützt den strikt sequenziellen Batchvertrag.
<!-- KAR170-END:README:970 -->

## v1.13.8

<!-- KAR170-BEGIN:CHANGELOG:1283 -->
### Original CHANGELOG: 1.13.8 – 2026-09-15 (source line 1283)

- **Anzeige ansehen/anzeigen** bevorzugt jetzt eine bereits bekannte kanonische Kleinanzeigen-URL des Inventardatensatzes. Der bisherige verkürzte Fallback `/s-anzeige/<ID>` wird nur noch verwendet, wenn keine belastbare öffentliche URL vorhanden ist.
- Eine bekannte öffentliche URL wird vor dem Öffnen strikt auf HTTPS, Kleinanzeigen-Host und die erwartete Anzeigen-ID geprüft. Dadurch kann eine fremde oder veraltete URL nicht als Ziel übernommen werden.
- `READONLY_AD_OPENED` dokumentiert jetzt die gewählte URL-Quelle; nach der Navigation protokolliert `READONLY_AD_NAVIGATION_RESOLVED` die tatsächlich erreichte URL und ob sie zur erwarteten Anzeigen-ID gehört. Ein noch laufender/geschlossener Tab wird nur informativ als `READONLY_AD_NAVIGATION_PENDING` dokumentiert.
- Im ZIP-Neuinserat-Modal befindet sich zwischen Artikelvorschau und gelbem Informationsbanner derselbe kleine vertikale Abstand wie zwischen erfolgreicher ZIP-Prüfung und Artikelvorschau.
- Neuer Regressionstest `tests/v1138-contract.cjs`; bestehende Sicherheitsgrenzen, Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1283 -->

## v1.13.7

<!-- KAR170-BEGIN:CHANGELOG:1291 -->
### Original CHANGELOG: 1.13.7 – 2026-09-15 (source line 1291)

- Export-/ZIP-Neuinserat-Texte wurden konsequent auf verständliche Nutzerbegriffe vereinheitlicht: **Als ZIP exportieren**, **Anzeige aus ZIP neu inserieren**, **ZIP erfolgreich geprüft**, **Anzeige inserieren** und **Unter „Meine Anzeigen“ finden** ersetzen technische bzw. uneinheitliche Begriffe wie Datensatz, Exportquelle, Archivversion oder Artikel.
- Der erfolgreiche ZIP-Prüfzustand zeigt nur noch die für den Nutzer relevanten Angaben (Bildanzahl und ursprüngliche Anzeigen-ID); die interne Archivversion wird bei erfolgreichem Import nicht mehr angezeigt. Inkompatible Archivversionen bleiben weiterhin als konkreter Fehler sichtbar.
- Schnell- und Vollprüfung erklären den Ablauf jetzt direkt aus Nutzersicht. Die Schnellprüfung kennzeichnet Schritt 3 als **Zusätzliche Inhaltsprüfung entfällt**; die Vollprüfung beschreibt den erneuten Vergleich im Bearbeiten-Modus als Abgleich mit den Daten aus dem ZIP.
- Recovery eines bereits veröffentlichten ZIP-Neuinserats ist idempotent: Ist die bestätigte neue Anzeigen-ID im gebundenen Zielprofil bereits als semantisch passende Anzeige inventarisiert, wird die Sitzung als bereits erfolgreich abgeschlossen markiert, ohne den vorhandenen Datensatz zu überschreiben, ohne Duplikat und ohne erneuten Publish. Abweichende Datensätze bzw. andere Zielprofile bleiben weiterhin echte Kollisionen.
- Bereits geschlossene Ziel-/Worker-Tabs werden bei nachlaufenden UI-/Content-Anfragen als normaler `gone`-Lifecycle-Zustand behandelt. `Receiving end does not exist` bzw. `No tab with id` erzeugen in diesem Fall kein Error-Level-Diagnoserrauschen mehr.
- Neuer Regressionstest `tests/v1137-contract.cjs` schützt UI-Texte, idempotente Recovery und Tab-Lifecycle-Nacharbeit. Feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1291 -->

<!-- KAR170-BEGIN:README:980 -->
### Historical README: Version 1.13.7: ZIP-Workflow sprachlich vereinheitlicht, Recovery idempotent, Tab-Lifecycle ruhiger (source line 980)

- **Als ZIP exportieren** beschreibt jetzt direkt, was die Aktion erzeugt. Fortschritt und Erfolg heißen **ZIP wird erstellt …** bzw. **ZIP erstellt**.
- Der Importdialog verwendet konsequent **ZIP** und **Anzeige** statt Datensatz/Archiv/Artikel: **Anzeige aus ZIP neu inserieren**, **ZIP hierher ziehen**, **ZIP erfolgreich geprüft**, **Anzeige inserieren** und **Unter „Meine Anzeigen“ finden**.
- Im erfolgreichen Prüfzustand wird keine interne Archivversion mehr angezeigt. Die ursprüngliche Anzeigen-ID bleibt als nachvollziehbare Herkunft sichtbar.
- **Schnellprüfung** erklärt, dass die Anzeige erstellt, veröffentlicht und anschließend unter „Meine Anzeigen“ bestätigt wird; die **zusätzliche Inhaltsprüfung entfällt**. **Vollprüfung** ergänzt den erneuten Vergleich der gespeicherten Inhalte mit den ZIP-Daten im Bearbeiten-Modus.
- Recovery ist für bereits inventarisierte veröffentlichte ZIP-Neuinserate idempotent. Passt ein vorhandener Datensatz mit derselben neuen Anzeigen-ID semantisch zur ZIP-Quelle und zum gebundenen Zielprofil, wird der Vorgang ohne Überschreiben, Duplikat oder erneuten Publish als abgeschlossen erkannt. Eine echte abweichende ID-Kollision bleibt gesperrt.
- Nachlaufende Zugriffe auf bereits geschlossene Ziel-/Worker-Tabs werden als normaler `gone`-Lifecycle-Zustand klassifiziert. Dadurch erscheinen erwartbare `Receiving end does not exist`-/`No tab with id`-Races nach erfolgreichem Abschluss nicht mehr als technische Fehler.
- `tests/v1137-contract.cjs` schützt diese drei Patch-Bereiche.
<!-- KAR170-END:README:980 -->

## v1.13.6

<!-- KAR170-BEGIN:CHANGELOG:1300 -->
### Original CHANGELOG: 1.13.6 – 2026-09-15 (source line 1300)

- ZIP-Neuinserate sind jetzt ausdrücklich **profilunabhängig vom Exportprofil**: `sourceProfileName` bleibt Provenienz, bestimmt aber nicht mehr das Konto, auf dem die neue Anzeige erstellt werden darf.
- Vor Phase 1 erkennt der Background das aktuell angemeldete Kleinanzeigen-Profil über **Meine Anzeigen**, bindet es persistent als Zielprofil der ZIP-Sitzung und startet erst danach den eigentlichen Inserier-Tab.
- Nach Publish wird die neue Anzeigen-ID ausschließlich im beim Start gebundenen Zielprofil gesucht. Nur ein echter Kontowechsel während des laufenden Vorgangs ist noch ein Profilkonflikt.
- Schnell- und Vollprüfung speichern den neuen Inventardatensatz unter dem erkannten Zielprofil und führen Quell-/Zielprofil getrennt in `archiveImport`.
- Der bisherige Abbruch **„… entspricht nicht dem Profil des exportierten Datensatzes“** wurde aus dem ZIP-Workflow entfernt. ZIPs ohne Quellprofilbezug werden nicht mehr allein deshalb abgewiesen.
- Bereits veröffentlichte v1.13.5-Sitzungen, die exakt an diesem alten Profil-Gate in Phase 2 scheiterten, werden nach dem Update ohne erneuten Publish in den Find-/Inventar-Pfad zurückgeführt.
- Die Sidebar-Meldung eines abgeschlossenen **Alle Anzeigen erfassen**-Laufs wird nur noch angezeigt, wenn dessen `profileId` zur aktuell gewählten Inventaransicht gehört. Ein Abschlussstatus von `sascha.petrovitsch@googlemail.com` erscheint damit nicht mehr in der Ansicht von `ka_percival@online.de`.
- Profilwechsel aktualisieren die Bulk-Statusanzeige sofort.
- Neuer Regressionstest `tests/v1136-contract.cjs`; feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1300 -->

<!-- KAR170-BEGIN:README:990 -->
### Historical README: Version 1.13.6: ZIP-Zielprofil und Bulk-Status korrekt profilgebunden (source line 990)

- **ZIP-Exporte sind portable Vorlagen.** Das Profil, von dem ein Datensatz ursprünglich exportiert wurde, wird nur noch als Provenienz gespeichert und ist kein Gleichheits-Gate für das Neu-Inserieren.
- Vor dem Start eines ZIP-Neuinserats wird das aktuell bei Kleinanzeigen angemeldete Profil über einen eigenen Hintergrund-Check von **Meine Anzeigen** eindeutig erkannt und als `targetProfileId` / `targetProfileName` in der ZIP-Neuinserat-Sitzung gebunden. Erst danach wird der Inserier-Tab geöffnet.
- Nach Publish muss **Neue Anzeige finden** weiterhin genau in diesem beim Start gebundenen Zielprofil stattfinden. Ein Kontowechsel während des Laufs führt zu einem sicheren Abbruch; ein Unterschied zwischen ZIP-Quellprofil und Zielprofil dagegen ausdrücklich nicht mehr.
- Schnell- und Vollprüfung speichern die neue Anzeige unter dem lokalen Zielprofil. `archiveImport` behält zusätzlich `sourceProfileName` als Herkunft und `targetProfileName` / `targetProfileId` als Zielprovenienz.
- Für ältere, bereits veröffentlichte ZIP-Sitzungen ohne `targetProfile*` kann das Zielprofil beim Recovery ausschließlich dann übernommen werden, wenn die bestätigte neue Anzeigen-ID tatsächlich unter **Meine Anzeigen** des aktuell erkannten Profils gefunden wird.
- Ein mit v1.13.5 bereits erfolgreich veröffentlichter Lauf, der ausschließlich am inzwischen entfernten Source-vs.-Target-Profil-Gate in Phase 2 scheiterte, wird nach dem Update einmalig in den sicheren Find-/Save-Pfad zurückgeführt; es wird dabei **keine zweite Anzeige veröffentlicht**.
- Der Status **Alle Anzeigen erfasst** ist jetzt an die Profil-ID des Bulk-Laufs gebunden. Nach Umschalten der Inventaransicht wird ein Abschluss-/Fehlerstatus eines anderen Profils nicht mehr angezeigt; beim Zurückwechseln in das zugehörige Profil kann er wieder erscheinen.
- Neuer Regressionstest `tests/v1136-contract.cjs` schützt portable ZIP-Neuinserate, Zielprofilbindung und profilbezogene Bulk-Statusanzeige.
<!-- KAR170-END:README:990 -->

## v1.13.5

<!-- KAR170-BEGIN:CHANGELOG:1312 -->
### Original CHANGELOG: 1.13.5 – 2026-09-15 (source line 1312)

- Fehler bei **Geöffnete Anzeige erfassen** behoben: Ein manuell inventarisierter Datensatz wird nicht mehr trotz eindeutig ausgewähltem und zugleich angemeldetem Profil mit `profileId = null` unter **Nicht zugeordnet** gespeichert.
- `PAGE_STATUS` erkennt den sichtbaren Wert **angemeldet als:** nun auch auf eigenen Bearbeiten-/Anzeigeseiten und nicht ausschließlich auf **Meine Anzeigen**.
- Vor dem Speichern einer manuellen Einzelinventarisierung wird die aktuelle Seitenidentität erneut aufgelöst. Die erkannte bestehende Profil-ID wird als verbindliche Profilbindung an den Inventardatensatz geschrieben.
- Als konservativer Fallback darf die bestehende Profilauswahl nur verwendet werden, wenn `selectedProfileId` und `detectedProfileId` identisch sind. Bei nicht eindeutig bestätigbarer Zuordnung wird nicht profil-los gespeichert.
- Neuer Regressionstest `tests/v1135-contract.cjs`; bestehende Sicherheitsgrenzen und alle anderen Workflows bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1312 -->

<!-- KAR170-BEGIN:README:1002 -->
### Historical README: Version 1.13.5: Manuelle Einzelinventarisierung behält die Profilzuordnung (source line 1002)

- Behebt einen real reproduzierten Fehler bei **Geöffnete Anzeige erfassen**: War ein Inventarprofil ausgewählt und dasselbe Kleinanzeigen-Konto im Bearbeiten-Modus angemeldet, konnte der neue Datensatz trotzdem mit leerer `profileId` unter **Nicht zugeordnet** gespeichert werden.
- `PAGE_STATUS` liefert den sichtbaren Wert hinter **angemeldet als:** jetzt auf jeder angemeldeten eigenen Kleinanzeigen-Seite, nicht nur unter **Meine Anzeigen**.
- Unmittelbar vor einer manuellen Einzelinventarisierung wird die Profilidentität der tatsächlich geöffneten Seite erneut erkannt und mit der bestehenden Profilverwaltung synchronisiert.
- Stimmen ausgewähltes Inventarprofil und zuletzt eindeutig erkanntes Kleinanzeigen-Profil überein, wird genau diese bestehende `profileId` verbindlich am neuen Datensatz gespeichert. Ein unnötiger neuer Bereich **Nicht zugeordnet** entsteht in diesem Fall nicht mehr.
- Kann bei vorhandener expliziter Profilauswahl keine eindeutige Zuordnung bestätigt werden, bricht die Einzelinventarisierung sicher mit einer verständlichen Meldung ab, statt profil-los zu speichern.
- Bestehende Bulk-, Renewal-, ZIP-Neuinserat-, Publish- und Löschpfade bleiben unverändert.
- `tests/v1135-contract.cjs` schützt den realen Profilbindungsfehler als Regression.
<!-- KAR170-END:README:1002 -->

## v1.13.4

<!-- KAR170-BEGIN:CHANGELOG:1320 -->
### Original CHANGELOG: 1.13.4 – 2026-09-15 (source line 1320)

- Hotfix für die ZIP-Neuinserat-**Vollprüfung**: Nach **Neue Anzeige finden** wird Schritt 3 jetzt ausschließlich über die unter **Meine Anzeigen** für genau die neue Anzeigen-ID gefundene Bearbeiten-URL gestartet. Die Vollprüfung konstruiert an dieser Stelle keine unabhängige URL mehr und arbeitet nicht auf einer öffentlichen `/s-anzeige/...`-Read-only-Ansicht weiter.
- Die gefundene Bearbeiten-URL wird als `newEditUrl` in der persistenten ZIP-Neuinserat-Sitzung festgehalten und für den anschließenden Bearbeiten-Prüfworker verwendet. Host, Pfad und `adId` werden strikt gegen die erwartete neue Anzeigen-ID validiert.
- Nach dem Laden bestätigt der Background nochmals, dass der Prüfworker tatsächlich auf `p-anzeige-bearbeiten.html?adId=<neueID>` steht. Ein Redirect auf eine öffentliche Anzeige oder eine andere ID beendet die Vollprüfung sicher statt dort eine Read-only-Inventarisierung zu versuchen.
- Neues Diagnoseereignis `ARCHIVE_INSERT_EDIT_MODE_CONFIRMED` dokumentiert den erfolgreichen Übergang in den Bearbeiten-Modus.
- Schnellprüfung, Auto-Publish-Hard-Gate, Profilbindung, ZIP-Archivvertrag, zusätzliche Inventaraufnahme sowie bestehende Renewal-/Delete-Sicherheitsgrenzen bleiben unverändert. Die in v1.13.3 ergänzte Galeriediagnose bleibt erhalten, ist aber nicht der Fix für diesen Workflowfehler.
- Neuer dependency-freier Regressionstest `tests/v1134-contract.cjs` schützt die Bearbeiten-URL-Bindung und weist öffentliche Read-only-URLs als ungültiges Vollprüfungsziel zurück.
<!-- KAR170-END:CHANGELOG:1320 -->

<!-- KAR170-BEGIN:README:1012 -->
### Historical README: Version 1.13.4: ZIP-Vollprüfung verwendet zuverlässig den Bearbeiten-Modus (source line 1012)

- Nach **Neue Anzeige finden** übernimmt die Vollprüfung jetzt die konkrete Bearbeiten-URL der neu gefundenen Anzeigenkarte unter **Meine Anzeigen** und verwendet genau diese URL für **Neue Anzeige überprüfen**.
- Die ZIP-Neuinserat-Sitzung speichert diese URL als `newEditUrl`. Vor der Extraktion wird nochmals geprüft, dass der Worker tatsächlich auf der Bearbeiten-Seite der erwarteten neuen Anzeigen-ID steht.
- Eine öffentliche `/s-anzeige/...`-Read-only-Seite ist für Schritt 3 ausdrücklich kein gültiges Ziel mehr. Wird der Worker dorthin oder auf eine andere Anzeigen-ID umgeleitet, bricht die Vollprüfung sicher und verständlich ab.
- Die Schnellprüfung bleibt unverändert und überspringt Schritt 3 weiterhin bewusst. Bestehende Publish-, Profil-, Inventar- und Renewal-Sicherheitsgrenzen bleiben erhalten.
- `tests/v1134-contract.cjs` schützt diesen real beobachteten Workflowfehler als Regression.
<!-- KAR170-END:README:1012 -->

## v1.13.3

<!-- KAR170-BEGIN:CHANGELOG:1329 -->
### Original CHANGELOG: 1.13.3 – 2026-09-15 (source line 1329)

- Diagnose-Hotfix für den realen Fehler **„Anzeigengalerie nicht eindeutig erkannt“**: Die Fehlermeldung verweist nicht mehr auf die entfernte UI-Funktion **Bilddiagnose der aktuellen Seite kopieren**, sondern auf **Support & Diagnose → Diagnosedaten herunterladen**.
- Bei einer fehlgeschlagenen öffentlichen Galerieerkennung wird automatisch eine bounded Galeriediagnose gespeichert. Neben der bisherigen Extractor-Entscheidung werden auch rohe `img`-/`source`-/`srcset`-Quellen, Hosts und relevante DOM-Merkmale erfasst, damit auch geänderte CDN-/DOM-Strukturen im Diagnose-ZIP sichtbar werden. URL-Queryparameter werden nicht übernommen.
- Die letzten maximal acht Galeriediagnosen werden 24 Stunden separat persistiert, sodass ein Service-Worker-Neustart zwischen Fehler und Diagnose-Download die entscheidenden Daten nicht mehr aus dem Export entfernt.
- Das normale Diagnose-ZIP enthält bei vorhandenen Fällen die zusätzliche Datei `image-gallery-diagnostics.json` und weist ihre Anzahl in `summary.txt` aus.
- Die eigentliche Galerie-/Inventar-Sicherheitsgrenze bleibt unverändert: Nicht eindeutig erkannte Bilder führen weiterhin zum Abbruch; v1.13.3 erfindet oder akzeptiert keine unsichere Galerie.
- Neuer dependency-freier Regressionstest `tests/v1133-contract.cjs`; bestehende Extension-ID, Manifest-Key, Berechtigungen, Host-Permissions sowie Renewal-/ZIP-Neuinserat-Workflows bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1329 -->

<!-- KAR170-BEGIN:README:1020 -->
### Historical README: Version 1.13.3: Galeriediagnose wieder im aktuellen Diagnose-ZIP verfügbar (source line 1020)

- Behebt die veraltete Fehlermeldung bei nicht eindeutig erkannter Anzeigengalerie: Die Extension verweist nicht mehr auf die entfernte Aktion **Bilddiagnose der aktuellen Seite kopieren**, sondern auf den tatsächlich vorhandenen Download unter **Support & Diagnose → Diagnosedaten herunterladen**.
- Wenn die öffentliche Anzeigengalerie sicherheitsbedingt nicht extrahiert werden kann, wird automatisch eine begrenzte strukturierte Galeriediagnose gespeichert. Sie enthält die Entscheidung des Extractors, erkannte Galeriecontainer, akzeptierte Bildkandidaten sowie zusätzlich rohe `img`-/`source`-/`srcset`-Quellen mit Host und DOM-Merkmalen. Queryparameter werden für die Diagnose entfernt bzw. redigiert.
- Die letzten Galeriediagnosen werden separat für maximal 24 Stunden und höchstens acht Fälle vorgehalten. Dadurch bleiben sie auch dann für den nächsten Diagnoseexport verfügbar, wenn der Manifest-v3-Service-Worker zwischen Fehler und ZIP-Download neu gestartet wurde.
- Das Standard-Diagnose-ZIP enthält bei vorhandenen Fällen zusätzlich `image-gallery-diagnostics.json`. Die eigentliche strikte Galerieerkennung wird dabei **nicht** gelockert: unbekannte Hosts oder nicht eindeutig zuordenbare Galerien werden weiterhin nicht als vollständiger Inventardatensatz akzeptiert.
- Auch die veraltete Aufforderung zur separaten Formular-/Bilddiagnose im Bearbeiten-Pfad wurde auf den aktuellen Diagnose-ZIP-Workflow umgestellt.
- Neuer dependency-freier Vertragstest `tests/v1133-contract.cjs` schützt die neue Diagnosepersistenz, ZIP-Aufnahme, Redigierung unbekannter Bildquellen und die unveränderte Extension-Identität/Berechtigungen.
<!-- KAR170-END:README:1020 -->

## v1.13.2

<!-- KAR170-BEGIN:CHANGELOG:1338 -->
### Original CHANGELOG: 1.13.2 – 2026-09-15 (source line 1338)

- Hotfix für den Stillstand nach erfolgreichem Auto-Publish: Die Kleinanzeigen-Bestätigungsseite `p-anzeige-aufgeben-bestaetigung.html` liefert die neue Anzeigen-ID als Queryparameter `addId`; v1.13.1 erkannte diesen URL-Typ noch nicht und blieb dadurch bei `publish-submitted` stehen.
- Die ID-Erkennung unterstützt die Bestätigungs-URL jetzt sowohl im Content-Script als auch direkt über die aktuelle Background-Tab-URL. Öffentliche Anzeigen- und Bearbeiten-URLs bleiben weiterhin unterstützt.
- Der Background verwendet für Publish-Erkennung und Recovery einen gemeinsamen robusten Erkennungspfad mit direktem Tab-URL-Fallback.
- Neuer dependency-freier Regressionstest `tests/v1132-contract.cjs` reproduziert die reale `addId`-Bestätigungs-URL und schützt den Übergang zur neuen Anzeigen-ID.
- Bestehende Publish-Hard-Gates, Profilbindung, Renewal-/ZIP-Semantik, Inventarregeln, feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1338 -->

<!-- KAR170-BEGIN:README:1029 -->
### Historical README: Version 1.13.2: Publish-Bestätigungsseite erkennt neue Anzeigen-ID zuverlässig (source line 1029)

- Behebt einen Hänger nach erfolgreichem Auto-Publish bei ZIP-Neuinseraten (und schützt denselben Erkennungspfad auch für Renewals): Kleinanzeigen liefert die neue Anzeigen-ID auf der Bestätigungsseite als Queryparameter `addId`. Diese URL wird jetzt ausdrücklich als bestätigte neue Anzeigen-ID erkannt.
- Der Background wertet die aktuelle Ziel-Tab-URL zusätzlich direkt aus, bevor er das Content-Script nach Canonical-/Link-Kandidaten fragt. Dadurch hängt der Übergang `publish-submitted` → `new-id-confirmed` nicht mehr davon ab, dass die Bestätigungsseite bereits einen öffentlichen Anzeigenlink enthält.
- Der bestehende Source-ID-Schutz bleibt aktiv: Eine erkannte ID muss numerisch sein und darf nicht mit der Quell-Anzeigen-ID identisch sein.
- Ein neuer Regressionstest simuliert die reale Bestätigungs-URL `/p-anzeige-aufgeben-bestaetigung.html?addId=...` und prüft die ID-Erkennung über den Content-Message-Pfad.
<!-- KAR170-END:README:1029 -->

## v1.13.1

<!-- KAR170-BEGIN:CHANGELOG:1346 -->
### Original CHANGELOG: 1.13.1 – 2026-09-15 (source line 1346)

- Phase 2 des Datensatz-Export/Import-Konzepts umgesetzt: Im bestehenden Sidebar-Bereich **Aktionen** steht unter **Geöffnete Anzeige erfassen** die Aktion **Aus ZIP neu inserieren**; es wurde bewusst keine neue Untergruppe angelegt.
- Der Import öffnet einen Modal-Dialog im Stil des bestehenden Neu-Inserieren-Dialogs. Ein v1-Export-ZIP kann per Drag & Drop oder Dateiauswahl übergeben werden. Erst nach lokaler Validierung werden Artikelvorschau und **Artikel inserieren** freigeschaltet.
- Die ZIP-Prüfung validiert Archivtyp/-version, sichere Dateipfade, Zentralverzeichnis/CRC, Größenlimits, `record.json`, `image-store.json`, SHA-256-Prüfsummen, Bildanzahl, Reihenfolge, Titelbild und jede enthaltene Bilddatei. Für den automatischen Füllpfad werden bestätigte JPEG-Vorlagen verlangt.
- Der eigentliche Ablauf verwendet vier sichtbare Schritte: **Neue Anzeige erstellen**, **Neue Anzeige finden**, **Neue Anzeige überprüfen**, **Ins Inventar aufnehmen**. In der **Schnellprüfung** wird ausschließlich Schritt 3 sichtbar übersprungen; Vollprüfung führt alle vier Schritte aus.
- Beide Modi verwenden nach vollständiger Vorabprüfung den bestehenden abgesicherten Auto-Publish-Pfad. Direkte `.submit()`-/`requestSubmit()`-Bypässe bleiben ausgeschlossen.
- Nach Publish wird die neue Anzeigen-ID ermittelt und die Anzeige profilgebunden unter **Meine Anzeigen** gesucht. In der Vollprüfung wird sie anschließend im Bearbeiten-Modus ausgelesen und gegen die ZIP-Quelle verglichen.
- Die neue Anzeige wird immer als zusätzlicher Inventardatensatz behandelt. Kein vorhandener Inventardatensatz und keine bestehende Kleinanzeigen-Anzeige wird durch den ZIP-Workflow ersetzt oder gelöscht. Bei Abweichungen der Vollprüfung bleibt der neu erfasste Datensatz erhalten und der Vorgang endet sichtbar mit Prüfbedarf.
- ZIP-Neuinserate besitzen persistente `archiveInsertionSessionsV1`-Sitzungen, nehmen am bestehenden globalen Inserierungs-Lock teil und können nach einem Service-Worker-Neustart aus Publish-/Find-/Check-/Save-Zuständen fortgesetzt werden.
- Neue Runtime-Komponente `inventory-import.js`; neuer dependency-freier Vertragstest `tests/v1131-contract.cjs` prüft UI, Archivkompatibilität Phase 1 → Phase 2, Fast-/Safe-Verzweigung, Sicherheitsgrenzen, feste Extension-Identität und unveränderte Berechtigungen.
<!-- KAR170-END:CHANGELOG:1346 -->

<!-- KAR170-BEGIN:README:1036 -->
### Historical README: Version 1.13.1: ZIP importieren und als neue Anzeige inserieren (Phase 2) (source line 1036)

- Im bestehenden Bereich **Aktionen** stehen nun direkt untereinander **Alle Anzeigen erfassen**, **Geöffnete Anzeige erfassen** und **Aus ZIP neu inserieren**. Der rechts angezeigte Prüfmodus gilt auch für den ZIP-Neuinserat-Workflow.
- **Aus ZIP neu inserieren** öffnet einen Modal-Dialog. Das Export-ZIP wird per Drag & Drop oder Dateiauswahl geladen und vollständig lokal geprüft, bevor eine Artikelvorschau und die Aktion **Artikel inserieren** verfügbar werden.
- Erwartet wird der Phase-1-Archivvertrag `kleinanzeigen-renewal-inventory-export`, `archiveVersion: 1`. Manifest, JSON-Dateien, Bildreihenfolge, Dateigrößen, CRC und SHA-256-Prüfsummen werden validiert; unvollständige, beschädigte oder intern inkonsistente Archive werden vor jedem Kleinanzeigen-Schritt abgewiesen.
- Der Ablauf besteht aus **Neue Anzeige erstellen → Neue Anzeige finden → Neue Anzeige überprüfen → Ins Inventar aufnehmen**.
- **Vollprüfung** führt alle vier Schritte aus. Nach dem automatischen Publish wird die neue Anzeige im gebundenen Profil unter **Meine Anzeigen** gefunden, im Bearbeiten-Modus erneut ausgelesen und gegen alle vom automatischen ZIP-Neuinserat verwalteten Felder der ZIP-Quelle geprüft (einschließlich Direkt-kaufen-Zustand sowie Standort-/Adresssichtbarkeit).
- **Schnellprüfung** führt Erstellung, Publish, Finden und Inventaraufnahme aus; die zusätzliche Bearbeiten-Kontrolle wird bewusst übersprungen und im Modal entsprechend markiert.
- Beide Modi verwenden den bereits bestehenden Auto-Publish-Hard-Gate: Nur eine vollständig und widerspruchsfrei vorgeprüfte Füllsitzung mit genau einem eindeutigen sichtbaren **Anzeige aufgeben**-Button darf automatisch veröffentlichen. Es wird kein direkter `submit()`-/`requestSubmit()`-Bypass eingeführt.
- Die importierte Anzeige wird **immer zusätzlich** ins Inventar aufgenommen. Der ZIP-Workflow ersetzt oder löscht weder den exportierten Ursprungsdatensatz noch andere Inventareinträge oder Anzeigen. Erkennt die Vollprüfung nach Veröffentlichung eine Abweichung, bleibt die neue Anzeige im Inventar und der Vorgang wird als prüfbedürftig markiert.
- Der Workflow besitzt persistente ZIP-Neuinserat-Sitzungen, nutzt den globalen Inserierungs-Lock und kann laufende Nachprüfungen nach einem Service-Worker-Neustart wiederaufnehmen.
<!-- KAR170-END:README:1036 -->

## v1.13.0

<!-- KAR170-BEGIN:CHANGELOG:1358 -->
### Original CHANGELOG: 1.13.0 – 2026-09-15 (source line 1358)

- Phase 1 des Datensatz-Export/Import-Konzepts umgesetzt: Jede Inventarkachel besitzt zwischen **Details anzeigen** und dem gespeicherten ID-/Zeitstempel die neue Aktion **Exportieren**.
- Der Export erzeugt genau für den gewählten Inventardatensatz ein eigenständiges ZIP-Archiv. Bestehende Inventardaten werden dabei ausschließlich gelesen und nicht verändert.
- Das Archiv enthält `record.json` mit dem vollständigen serialisierbaren Inventardatensatz, `image-store.json` mit den Metadaten der lokal gespeicherten Bildobjekte, `export-manifest.json` als versionierten Importvertrag sowie sämtliche lokalen Bilddateien unter `images/`.
- Die ursprüngliche Galerie-Reihenfolge wird explizit über `position` und die sortierte Bildliste im Manifest erhalten; das Titelbild wird zusätzlich über `isPrimary` gekennzeichnet.
- Vor dem ZIP-Bau wird jede lokale Bildkopie geladen und per SHA-256 geprüft, sofern bereits ein erwarteter Hash vorliegt. Fehlt eine Bildkopie oder stimmt ihre Integrität nicht, wird kein unvollständiges Exportarchiv erzeugt.
- `export-manifest.json` verwendet den stabilen Archivtyp `kleinanzeigen-renewal-inventory-export` und `archiveVersion: 1` als Grundlage für die spätere Phase 2. Zusätzlich werden Dateipfade, Prüfsummen, Bildreihenfolge, Bildformate und Vollständigkeitsangaben gespeichert.
- Der Export verwendet ausschließlich vorhandene lokale Inventar-/Bilddaten und führt keine Netzwerk-, Publish-, Delete- oder Renewal-Aktion aus. Die bestehenden Sicherheitsgrenzen, Profilbindung und Renewal-Workflows bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1130-contract.cjs` prüft Archivstruktur, Bildreihenfolge, Integritätsabbruch, UI-Position, Versionsstand sowie unveränderte Berechtigungen und Host-Permissions.
<!-- KAR170-END:CHANGELOG:1358 -->

<!-- KAR170-BEGIN:README:1049 -->
### Historical README: Version 1.13.0: Datensatz als ZIP exportieren (Phase 1) (source line 1049)

- Jede Inventarkachel besitzt zwischen **Details anzeigen** und dem gespeicherten Zeit-/ID-Stempel die Aktion **Exportieren**.
- Der Export erstellt ein ZIP ausschließlich aus dem ausgewählten lokalen Inventardatensatz; weder Kleinanzeigen noch andere Inventareinträge werden verändert.
- `record.json` enthält den vollständigen serialisierbaren Inventardatensatz.
- `image-store.json` enthält die Metadaten der lokal gespeicherten Bildobjekte ohne die Binärdaten.
- `export-manifest.json` definiert den versionierten Archivvertrag für die spätere Import-Phase und enthält Bildreihenfolge, Titelbild-Markierung, Dateipfade, Formate, Prüfsummen und Vollständigkeitsangaben.
- Alle lokal gespeicherten Bilder liegen zusätzlich als echte Dateien unter `images/` und werden in der ursprünglichen Galerie-Reihenfolge exportiert.
- Fehlende oder bei vorhandener Prüfsumme inkonsistente Bildkopien brechen den Export ab, damit kein unvollständiges Archiv als erfolgreich ausgegeben wird.
- Phase 2 – ZIP auswählen und daraus eine neue Anzeige erzeugen – ist in v1.13.0 ausdrücklich noch nicht umgesetzt.
<!-- KAR170-END:README:1049 -->

## v1.12.1

<!-- KAR170-BEGIN:CHANGELOG:1369 -->
### Original CHANGELOG: 1.12.1 – 2026-09-14 (source line 1369)

- Sichtbare Betriebsarten heißen in der Nutzeroberfläche jetzt **Vollprüfung** und **Schnellprüfung**; die technischen Persistenzwerte `safe`/`fast` bleiben intern unverändert. Vollprüfung bleibt Standard und wird als **Empfohlen** gekennzeichnet.
- Im Renewal-Dialog wird bei Schnellprüfung nur der Modusname gelb hervorgehoben. Die vier Schritte verwenden ausschließlich nutzerbezogene Kleinanzeigen-Begriffe: **Neue Anzeige einstellen**, **Neue Anzeige kontrollieren** bzw. **Zusätzliche Datenprüfung entfällt**, **Neue Anzeige finden**, **Bisherige Anzeige löschen**.
- Der Schnellprüfungs-Hinweis erklärt ohne interne Begriffe, dass die bisherige Anzeige online bleibt, bis die neue Anzeige unter **Meine Anzeigen** gefunden wurde, und dass nach dem Löschen weiterhin ihr Verschwinden geprüft wird.
- Die linke Sektion **Konfiguration** ist an den unteren Rand der Sidebar verschoben und steht direkt oberhalb von **Support & Diagnose**.
- Fast-/Schnellprüfungs-Renewals speichern den beobachteten Zeitpunkt der bestätigten neuen Anzeige separat als `insertionMeta.confirmedAt`; dieser Wert wird ausdrücklich nicht als echtes Kleinanzeigen-`listingDate` ausgegeben.
- Inventarkarten und Artikeldetails zeigen weiterhin **Anzeige vom**, wenn ein echtes Kleinanzeigen-Veröffentlichungsdatum vorhanden ist. Fehlt dieses nach einer Schnellprüfung, wird stattdessen **Neu inseriert am** mit dem bestätigten Neu-Inserier-Zeitpunkt angezeigt.
- Die Sortieroption heißt jetzt **Inseriert am**. Für die Sortierung hat ein echtes Kleinanzeigen-Veröffentlichungsdatum Vorrang; nur wenn es fehlt, wird der bestätigte Neu-Inserier-Zeitpunkt verwendet.
- Der separat gespeicherte Neu-Inserier-Zeitpunkt bleibt bei späteren Aktualisierungen erhalten; sobald ein echtes Veröffentlichungsdatum eingelesen wird, hat dieses automatisch Vorrang.
- Publish-Hard-Gate, Profilbindung, unabhängige Phase-4-Löschverifikation, atomare Promotion, 30-Tage-Papierkorb sowie die eigentliche Safe-/Fast-Mode-Ablauflogik bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1121-contract.cjs` schützt UI-Terminologie, Sidebar-Reihenfolge, gelbe Schnellprüfungs-Kennzeichnung, getrennte Datumsherkunft, effektive Inserier-Sortierung und die unveränderten Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1369 -->

<!-- KAR170-BEGIN:README:1060 -->
### Historical README: Version 1.12.1: verständlichere Prüfmodi und Inserierdatum-Fallback (source line 1060)

- Die UI verwendet **Vollprüfung** statt Safe-Mode und **Schnellprüfung** statt Fast-Mode. Vollprüfung bleibt Standard und ist als **Empfohlen** gekennzeichnet.
- Der Renewal-Dialog vermeidet technische Begriffe wie `adId`, Re-Inventarisierung oder semantischen Vergleich und beschreibt die Schritte aus Nutzersicht. Bei Schnellprüfung wird der Modusname im Dialog gelb hervorgehoben.
- **Konfiguration** steht in der linken Seitenleiste jetzt direkt oberhalb von **Support & Diagnose**.
- Nach einer Schnellprüfung bleibt das echte Kleinanzeigen-Veröffentlichungsdatum bewusst leer, wenn es nicht extern ausgelesen wurde. Stattdessen speichert die App den sicher beobachteten Neu-Inserier-Zeitpunkt separat und zeigt **Neu inseriert am**.
- Die Sortierung heißt **Inseriert am** und nutzt zuerst das echte Kleinanzeigen-Datum; fehlt es, wird der bestätigte Neu-Inserier-Zeitpunkt verwendet. Ein später eingelesenes echtes Datum übernimmt automatisch die Priorität.
- Die eigentliche Safe-/Fast-Mode-Logik und alle Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:README:1060 -->

## v1.12.0

<!-- KAR170-BEGIN:CHANGELOG:1382 -->
### Original CHANGELOG: 1.12.0 – 2026-09-14 (source line 1382)

- Neuer **Safe-Mode / Fast-Mode**-Schalter in der linken Sektion **Konfiguration**. Safe-Mode bleibt der Standard; die Auswahl wird persistent gespeichert und als sichtbarer Modus-Badge bei den Aktionen angezeigt.
- Der erstmalige Wechsel auf Fast-Mode verlangt eine ausdrückliche Bestätigung, dass Re-Inventarisierung und semantischer Alt-/Neu-Vergleich bewusst entfallen. Diese Bestätigung wird danach gespeichert.
- Der gewählte Modus wird beim tatsächlichen Start in Renewal-Sitzung, Fill-Sitzung und Renewal-Skeleton eingefroren. Eine spätere Änderung der Konfiguration beeinflusst laufende Vorgänge nicht.
- **Safe-Mode** behält den bisherigen vierphasigen Ablauf unverändert: Phase 1 erstellen/veröffentlichen, Phase 2 frisch re-inventarisieren, Phase 3 Online-/„Meine Anzeigen“-Nachweis plus semantischer Vergleich, Phase 4 alte Anzeige löschen und unabhängig auf Abwesenheit prüfen.
- **Fast-Mode** reduziert ausschließlich die externen Prüfungen: Phase 1 bleibt unverändert; Phase 2 entfällt; Phase 3 bestätigt ausschließlich die neue `adId` im erwarteten Profil unter „Meine Anzeigen“; Phase 4 verwendet weiterhin die bestehende Löschung der alten `adId` plus frischen unabhängigen Vollscan auf deren Abwesenheit.
- Im Fast-Mode wird für den lokalen neuen Inventareintrag auf die bereits vor Publish verifizierte Vorlage vertraut. Die lokalen Quellbilder werden bei der atomaren Promotion für die neue Anzeige geklont, während die alte Kopie inklusive Bilder vollständig im 30-Tage-Papierkorb erhalten bleibt.
- Fortschrittsdialog und Abschlussdarstellung kennzeichnen den aktiven Modus; die übersprungene Fast-Mode-Phase 2 wird sichtbar als übersprungen dargestellt.
- Profilbindung, Auto-Publish-Hard-Gate, globaler Inserierungs-Lock, Recovery/Diagnose, unabhängige Phase-4-Verifikation, atomare Promotion und 30-Tage-Papierkorb bleiben in beiden Modi identisch erhalten.
- `FIND_OWN_AD_BY_ID` liefert zusätzlich bereits auf der „Meine Anzeigen“-Karte vorhandene Enddatum-Metadaten für den Fast-Mode; es wird dafür kein zusätzlicher externer Prüfpfad geöffnet.
- Neuer dependency-freier Vertragstest `tests/v1120-contract.cjs` schützt Moduskonfiguration, Snapshot-Semantik, Fast-Mode-Verifikation, Bildpromotion sowie die unveränderten Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1382 -->

<!-- KAR170-BEGIN:README:1069 -->
### Historical README: Version 1.12.0: Safe-Mode und Fast-Mode (source line 1069)

- Unter **Konfiguration → Neu-Inserat-Modus** kann dauerhaft zwischen **Safe-Mode** und **Fast-Mode** gewählt werden. Safe-Mode ist der Default und der aktuell gewählte Modus bleibt bei den Aktionen sichtbar.
- Beim ersten Aktivieren des Fast-Mode erklärt ein Bestätigungsdialog ausdrücklich die reduzierte externe Prüftiefe.
- Die Auswahl wird beim Start eines Renewals in dessen persistierte Sitzung übernommen. Ein späterer Moduswechsel verändert einen bereits laufenden Austausch nicht.
- **Safe-Mode:** Phase 1 erstellt und veröffentlicht die neue Anzeige; Phase 2 liest sie vollständig frisch von Kleinanzeigen ein; Phase 3 prüft Online-/„Meine Anzeigen“-Evidenz und führt den semantischen Alt-/Neu-Vergleich aus; Phase 4 löscht die alte Anzeige und beweist ihre Abwesenheit mit einem frischen unabhängigen Vollscan.
- **Fast-Mode:** Phase 1 bleibt identisch; Phase 2 wird bewusst übersprungen; Phase 3 prüft nur, ob genau die neue `adId` im richtigen Profil unter **Meine Anzeigen** vorhanden ist; Phase 4 bleibt sicherheitsseitig identisch und löscht die alte `adId` erst anschließend mit unabhängiger Abwesenheitsprüfung.
- Fast-Mode vertraut damit bewusst darauf, dass Kleinanzeigen die vor Publish vollständig verifizierten Formularwerte gespeichert hat. Es findet keine frische Re-Inventarisierung und kein semantischer Alt-/Neu-Vergleich statt.
- Alle lokalen Schutzmechanismen bleiben gleich: Profilbindung, globaler Inserierungs-Lock, Recovery/Diagnose, atomare Promotion, eigenständige Bildkopie für den neuen Datensatz und vollständiger 30-Tage-Papierkorb.
<!-- KAR170-END:README:1069 -->

## v1.11.5

<!-- KAR170-BEGIN:CHANGELOG:1395 -->
### Original CHANGELOG: 1.11.5 – 2026-09-14 (source line 1395)

- Robustheit auf langsamen Windows-/Chrome-Systemen verbessert: kontextspezifische Tab-Ladebudgets (45 s Renewal/Refresh, 60 s Phase 4) ersetzen den starren 30-s-Timeout an kritischen Worker-Stellen.
- Tab-Ladezeiten und Content-Verbindungszeiten werden explizit diagnostiziert (`TAB_LOAD_TIMING`, `TAB_LOAD_TIMEOUT`, `CONTENT_CONNECTION_READY`), um Navigation/Page-Ready und Bootstrap getrennt messen zu können.
- App-Health ist stärker eventgetrieben (`tabs.onUpdated`, `tabs.onActivated`, `tabs.onRemoved`); der periodische Poll bleibt nur als 15-s-Safety-Net. Von Chrome verworfene Tabs werden bis Aktivierung/Reload nicht mehr alle fünf Sekunden erneut als Fehler angesprochen.
- Query→Tab-schließt- und Discard-Races werden als normale Lifecycle-Zustände (`KR_TAB_GONE`, `KR_TAB_DISCARDED`) behandelt und nicht mehr als `TAB_CONNECTION_FAILED`/`TAB_MESSAGE_FAILED`-Fehlerflut protokolliert.
- Erwartbarer Phase-4-Transportabbruch nach dem Löschklick ist informativer Zwischenzustand; nach erfolgreicher unabhängiger Verifikation wird er explizit als verifiziert protokolliert.
- `BULK_READONLY_METADATA_UNAVAILABLE` wird erst beim tatsächlichen finalen Speichern ohne Read-only-Metadaten ausgegeben, nicht bereits während eines langsamen Edit-Workers.
- Publish-Hard-Gate, Profilprüfung, unabhängige Phase-4-Abwesenheitsprüfung, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer Vertragstest `tests/v1115-contract.cjs` schützt Low-Performance-Robustheit und Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1395 -->

<!-- KAR170-BEGIN:README:1079 -->
### Historical README: Version 1.11.5: Robustheit auf langsamen Rechnern (source line 1079)

- Kritische Renewal-Worker erhalten kontextspezifische Ladebudgets: 45 Sekunden für Renewal-/Refresh-Navigationen und 60 Sekunden für Phase 4. Die Fehlermeldung benennt jetzt den tatsächlichen Worker statt generisch einen Bearbeiten-Tab.
- `TAB_LOAD_TIMING` und `CONTENT_CONNECTION_READY` trennen Seitenlade- und Content-Bootstrap-Zeiten in der Diagnose.
- Die App reagiert primär auf Tab-Ereignisse; ein 15-Sekunden-Poll bleibt nur als Safety-Net. Von Chrome verworfene Tabs gehen in Backoff, bis sie wieder aktiviert oder geladen werden.
- Geschlossene oder zwischen Query und Message verschwundene Tabs gelten als normaler Lifecycle-Zustand und erzeugen keine wiederholten Verbindungsfehler.
- Phase-4-Navigationsabbrüche nach dem Löschklick werden nach erfolgreicher unabhängiger Vollscan-Verifikation als erwartbar/verifiziert dokumentiert.
- Bulk-Read-only-Metadaten werden erst dann als nicht verfügbar gewarnt, wenn ein Datensatz tatsächlich ohne sie gespeichert wird.
- Sicherheitsgrenzen des Renewals bleiben unverändert.
<!-- KAR170-END:README:1079 -->

## v1.11.4

<!-- KAR170-BEGIN:CHANGELOG:1406 -->
### Original CHANGELOG: 1.11.4 – 2026-09-14 (source line 1406)

- Drei Findings aus dem erfolgreichen Fitness-Reifen-End-to-End-Lauf bereinigt: Read-only-Diagnoserauschen/Latenz, Worker-Tab-Race nach Phase 4 und veralteter Auto-Publish-Gate-Nachlauf.
- Direkter Read-only-ID-Probe auf 3,5 Sekunden nach geladener Seite begrenzt; danach frühzeitiger Wechsel auf den profilgeprüften „Meine Anzeigen“-Fallback. Renewal-Polling unterdrückt erwartete Einzelwarnungen und protokolliert stattdessen nur den zusammengefassten Fallback bzw. einen echten terminalen Read-only-Fehler.
- Renewal-Hintergrundworker werden in `chrome.storage.session` registriert und nach dem Schließen 30 Sekunden als Tombstone geführt. Die App filtert diese Worker aus ihrer normalen Kleinanzeigen-Seitenprüfung, damit bereits geschlossene Phase-4-Tabs nicht mehr über `ENSURE_CONTENT_CONNECTION` angesprochen werden.
- Bestätigungsseiten nach bereits ausgelöstem Publish überspringen das Auto-Publish-Gate. Der Background verwirft zusätzlich veraltete Stage-Rückschritte aus `publish-submitted`/`new-id-confirmed` in Vor-Publish-Zustände.
- Auto-Publish-Hard-Gate, Kategorieauswahl-Fix, Profilprüfung, unabhängige `VERIFY_OWN_AD_ABSENT_BY_ID`-Verifikation, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1114-contract.cjs` schützt alle drei Fixes und die Sicherheitsinvarianten.
<!-- KAR170-END:CHANGELOG:1406 -->

<!-- KAR170-BEGIN:README:1090 -->
### Historical README: Version 1.11.4: Ruhigerer Renewal-Nachlauf und saubere Worker-Lebenszyklen (source line 1090)

- Die direkte Read-only-Prüfung einer neuen Anzeigen-ID wartet nach vollständig geladener Seite nur noch kurz auf eindeutige Metadaten und wechselt danach früh zum belastbaren „Meine Anzeigen“-Fallback.
- Erwartete Fehlversuche während dieses Pollings werden nicht mehr dutzendfach als `READONLY_METADATA_FAILED` protokolliert; ein nicht erfolgreicher Direktversuch wird einmalig als informativer Fallback-Schritt erfasst.
- Renewal-Hintergrundworker werden zentral als verwaltete Worker markiert. Die App ignoriert diese Tabs bei ihrer normalen Seiten-/Verbindungsprüfung; geschlossene Worker bleiben kurz als Tombstone markiert, damit ein gleichzeitig laufender UI-Refresh keinen bereits entfernten Tab mehr anspricht.
- Nach ausgelöstem Auto-Publish werden Bestätigungsseiten nicht erneut als Publish-Gate behandelt. Zusätzlich blockiert der Background veraltete Stage-Rückschritte von `publish-submitted`/`new-id-confirmed` zurück in Vor-Publish-Zustände.
- Publish-Hard-Gate, Kategorie-Fix aus v1.11.3, Profilmanagement, unabhängige Phase-4-Abwesenheitsprüfung und 30-Tage-Papierkorb bleiben unverändert.
<!-- KAR170-END:README:1090 -->

## v1.11.3

<!-- KAR170-BEGIN:CHANGELOG:1415 -->
### Original CHANGELOG: 1.11.3 – 2026-09-14 (source line 1415)

- Hänger beim Wechsel vom neuen Anzeigenformular in die separate Kategorieauswahl behoben.
- Nach dem Klick auf **Kategorie wählen/ändern** wird die Navigation jetzt bis zu vier Sekunden aktiv bestätigt; der Fill-State bleibt nicht mehr unbegrenzt in `category-opening` stehen.
- Bei ausbleibender Bestätigung erfolgt eine kontrollierte Fallback-Navigation auf den bekannten gleich-originären Kleinanzeigen-Pfad `/p-kategorie-aendern.html`. Ein vorhandenes Linkziel wird nur akzeptiert, wenn Origin und exakter Kategoriepfad passen.
- Neue Diagnoseereignisse `CATEGORY_OPEN_CLICK_STARTED`, `CATEGORY_OPEN_CLICK_DISPATCHED`, `CATEGORY_OPEN_NAVIGATION_CONFIRMED`, `CATEGORY_OPEN_CLICK_UNCONFIRMED` und `CATEGORY_OPEN_FALLBACK_NAVIGATION_STARTED` machen den Übergang eindeutig nachvollziehbar.
- Kategoriepfad-/Pflichtmerkmal-Logik, Publish-Sicherheitsgrenzen, Phase-4-Löschverifikation, Profilmanagement und v1.11.2-Tab-Lebenszyklus bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1113-contract.cjs` schützt Fallback-Navigation, Origin-/Pfadbegrenzung, Diagnose und bestehende Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1415 -->

<!-- KAR170-BEGIN:README:1098 -->
### Historical README: Version 1.11.3: Robuste Kategorieöffnung beim Neu-Inserieren (source line 1098)

- Der Start der separaten Kleinanzeigen-Kategorieauswahl wird nach dem sichtbaren Klick jetzt aktiv bestätigt, statt die Navigation lediglich anzunehmen.
- Bleibt der Klick auf **Kategorie wählen/ändern** ohne bestätigte Navigation, wartet die Extension vier Sekunden und navigiert anschließend kontrolliert auf den bekannten, gleich-originären Kleinanzeigen-Kategoriepfad `/p-kategorie-aendern.html`.
- Ein eventuell vorhandenes `href` wird nur verwendet, wenn es auf derselben Kleinanzeigen-Origin exakt auf diesen Kategoriepfad zeigt; fremde Origins und andere Pfade werden verworfen.
- Neue Diagnoseereignisse unterscheiden Klick, bestätigte Navigation, nicht bestätigten Klick und kontrollierte Fallback-Navigation.
- Kategorieauswahl, Pflichtmerkmale, `Weiter`-Logik, Auto-Publish-Hard-Gate, Phase-4-Löschverifikation und die Tab-Optimierung aus v1.11.2 bleiben unverändert.
<!-- KAR170-END:README:1098 -->

## v1.11.2

<!-- KAR170-BEGIN:CHANGELOG:1424 -->
### Original CHANGELOG: 1.11.2 – 2026-09-14 (source line 1424)

- Renewal-Tab-Lebenszyklus deutlich reduziert, ohne die vier Sicherheitsphasen abzuschwächen.
- Phase 1 schließt den von der Extension erzeugten Inserat-Tab unmittelbar nach eindeutig bestätigter neuer Anzeigen-ID; persistierte Tab-Referenzen werden anschließend bereinigt.
- Phase 2/3 verwendet genau einen sequenziell wiederverwendeten Prüfworker: Bearbeiten-Inventarisierung, direkte Read-only-ID-URL, „Meine Anzeigen“-Fallback und gegebenenfalls die dort gefundene öffentliche URL laufen nacheinander im selben Tab.
- Phase 3 vergleicht die gespeicherten Datensätze weiterhin rein lokal und öffnet keinen eigenen Browser-Tab.
- Phase 4 behält die unabhängige autoritative Löschverifikation bei, beendet den Lösch-Worker jetzt aber vollständig, bevor der frische Verifikations-Worker geöffnet wird. Lösch- und Verifikations-Worker sind damit logisch getrennt, aber nicht mehr gleichzeitig offen.
- Auto-Publish-Hard-Gate, Profilprüfung vor Phase 4, unabhängige Abwesenheitsprüfung der Quellanzeige, atomare lokale Promotion und 30-Tage-Papierkorb bleiben unverändert streng.
- Neuer dependency-freier Vertragstest `tests/v1112-contract.cjs` schützt den reduzierten Tab-Lebenszyklus und die bestehenden Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1424 -->

<!-- KAR170-BEGIN:README:1106 -->
### Historical README: Version 1.11.2: Weniger Tabs im automatischen Austausch (source line 1106)

- Nach bestätigter neuer Anzeigen-ID wird der von der Extension erzeugte Inserat-Tab aus Phase 1 direkt geschlossen und aus der persistierten Renewal-/Fill-Sitzung freigegeben.
- Die erneute Inventarisierung und Online-Prüfung in Phase 2/3 nutzt einen einzigen Hintergrund-Worker. Derselbe Tab wird nacheinander von der Bearbeiten-Seite zur direkten öffentlichen ID-URL, bei Bedarf zu **Meine Anzeigen** und anschließend zur dort gefundenen öffentlichen URL navigiert.
- Der semantische Vergleich in Phase 3 läuft weiterhin ausschließlich lokal und benötigt keinen eigenen Tab.
- In Phase 4 bleibt die Löschverifikation bewusst unabhängig: Zuerst wird der Lösch-Worker beendet, danach wird ein neuer frischer Verifikations-Worker geöffnet. Dadurch bleibt die Sicherheitsgrenze erhalten, ohne beide Worker gleichzeitig offen zu halten.
- Die bestehende Profilprüfung, der Auto-Publish-Hard-Gate, die autoritative Prüfung auf Abwesenheit der alten Anzeigen-ID, der atomare Inventarwechsel und der 30-Tage-Papierkorb bleiben unverändert.
<!-- KAR170-END:README:1106 -->

## v1.11.1

<!-- KAR170-BEGIN:CHANGELOG:1434 -->
### Original CHANGELOG: 1.11.1 – 2026-09-14 (source line 1434)

- Chrome-Launcher/Popup zeigt die installierte Version nun sichtbar direkt neben „Inventar“.
- Versionsanzeige wird dynamisch aus `chrome.runtime.getManifest().version` gespeist und ist dadurch automatisch release-synchron.
- Kompakte, zurückgenommene Darstellung analog zur Versionsanzeige im App-Header.
- Keine Änderung an Inventar-, Profilmanagement-, Papierkorb-, Renewal-, Publish- oder Löschlogik.
- Neuer dependency-freier Vertragstest `tests/v1111-contract.cjs` schützt Versionsquelle, UI-Wiring, Identität, Sicherheitsgrenzen und Byteidentität des fachlichen Kern-Runtimes.
<!-- KAR170-END:CHANGELOG:1434 -->

<!-- KAR170-BEGIN:README:1115 -->
### Historical README: Version 1.11.1 (source line 1115)

- Der Chrome-Launcher zeigt die installierte Versionsnummer jetzt direkt neben „Inventar“ an.
- Die Anzeige wird dynamisch aus `chrome.runtime.getManifest().version` gelesen und muss bei künftigen Releases nicht separat hartcodiert gepflegt werden.
- Fachliche Inventar-, Profil-, Papierkorb- und Renewal-Logik bleibt gegenüber v1.11.0 unverändert.
<!-- KAR170-END:README:1115 -->

## v1.11.0

<!-- KAR170-BEGIN:CHANGELOG:1442 -->
### Original CHANGELOG: 1.11.0 – 2026-09-14 (source line 1442)

- Vollständiges lokales Profilmanagement ergänzt: erkannte Kleinanzeigen-Profile können in der App angezeigt, als lokale Inventaransicht ausgewählt und verwaltet werden.
- Inventarliste und Papierkorb sind profilbezogen getrennt; Massen-Leeren wirkt nur auf das ausgewählte Profil.
- Erfassungen werden vor dem Speichern an das tatsächlich erkannte angemeldete Profil gebunden, unabhängig davon, welche lokale Inventaransicht zuvor manuell gewählt war.
- Profilneutrale Altbestände bleiben als `Nicht zugeordnet` sichtbar; die bestehende Migration zu einem erkannten Profil bleibt ausdrücklich bestätigungspflichtig.
- Lokales Löschen eines Profils löscht keine Inventardaten: vorhandene aktive und Papierkorb-Einträge werden sicher auf `Nicht zugeordnet` gesetzt. Laufende Renewal-/Austausch- oder Erfassungsvorgänge schützen das Profil vor dem Löschen.
- Renewal-Sitzungen tragen die Profil-ID mit, damit Profilgrenzen und Schutzprüfungen stabil bleiben.
- Diagnoseexport um `profiles.json` erweitert; Profilnamen unterliegen weiterhin der bestehenden Redaktionslogik.
- Sichtbare Inventarisierungsaktionen heißen nun **Alle Anzeigen erfassen** und **Geöffnete Anzeige erfassen**.
- Keine neuen Berechtigungen oder Host-Permissions; feste Extension-ID, Manifest-Key sowie Auto-Publish- und Phase-4-Sicherheitsgrenzen bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1110-contract.cjs` schützt Profilscoping, sichere Profillöschung, Profilbindung von Erfassungen, Legacy-Migration, Diagnose-Redaktion und unveränderte Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1442 -->

<!-- KAR170-BEGIN:README:1122 -->
### Historical README: Version 1.11.0: Profilmanagement und getrennte lokale Inventare (source line 1122)

- Erkannte Kleinanzeigen-Konten werden als stabile lokale Profile geführt. Die linke Seitenleiste besitzt dafür einen Profilumschalter und einen eigenen Dialog **Profile verwalten**.
- Der Profilumschalter wechselt ausschließlich die **lokale Inventaransicht**; er meldet nicht bei Kleinanzeigen um und verändert keine Zugangsdaten.
- Inventarliste und Papierkorb werden pro ausgewähltem Profil getrennt angezeigt. Auch **Inventarliste leeren** wirkt nur auf das ausgewählte Profil.
- **Alle Anzeigen erfassen** und **Geöffnete Anzeige erfassen** werden vor dem Speichern an das tatsächlich erkannte angemeldete Kleinanzeigen-Profil gebunden. So kann eine manuell gewählte lokale Ansicht keine Daten versehentlich dem falschen Profil zuordnen.
- Bestehende profilneutrale Altbestände bleiben als **Nicht zugeordnet** sichtbar. Die schon vorhandene Zuordnung zu einem neu erkannten Profil erfolgt weiterhin nur nach ausdrücklicher Bestätigung.
- Profile können lokal gelöscht werden, ohne Inventardaten zu verlieren: zugehörige aktive und Papierkorb-Einträge wechseln zu **Nicht zugeordnet**. Ein Profil mit laufendem Renewal-/Austauschvorgang oder laufender Gesamterfassung kann nicht gelöscht werden.
- Diagnoseexporte enthalten zusätzlich den Profilzustand; Profilnamen bleiben von der bestehenden Redaktionslogik erfasst.
- Die UI-Bezeichnung für Inventarisierungsaktionen wurde von **sichern** auf **erfassen** umgestellt.
- Feste Extension-ID, Manifest-Key, Berechtigungen, Host-Permissions und die bestehenden Publish-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:README:1122 -->

## v1.10.4

<!-- KAR170-BEGIN:CHANGELOG:1455 -->
### Original CHANGELOG: 1.10.4 – 2026-09-14 (source line 1455)

- Linke Steuerleiste als zusammenhängenden, sticky Arbeitsbereich neu strukturiert.
- Statusanzeige kompakter und informationshierarchisch zurückhaltender gestaltet.
- Aktionshierarchie geschärft: Vollinventur primär, Einzelanzeige sekundär.
- Laufende Vorgänge, Erfolgsmeldungen und Bulk-Status in einem gemeinsamen Aktivitätsbereich gebündelt.
- Support & Diagnose am unteren Rand der Seitenleiste verankert; responsive Darstellung bleibt erhalten.
- Keine Änderung an fachlicher Runtime-Logik oder Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1455 -->

<!-- KAR170-BEGIN:README:1135 -->
### Historical README: Patch 1.10.4: Ruhigere, klar gegliederte linke Steuerleiste (source line 1135)

- Die linke Steuerleiste ist jetzt als zusammenhängender Arbeitsbereich statt als Folge gleichgewichtiger Karten gestaltet.
- Der aktuelle Kleinanzeigen-Status ist kompakter; technische Kontextdetails bleiben sichtbar, treten aber visuell zurück.
- Die Aktionen sind klar priorisiert: **Alle Anzeigen sichern** ist die primäre Aktion, **Geöffnete Anzeige sichern** die sekundäre kontextbezogene Aktion.
- Laufende Vorgänge, Abschlussmeldungen und Sammelstatus sind in einem gemeinsamen Aktivitätsbereich gebündelt und kompakter dargestellt.
- **Support & Diagnose** ist als ruhiger Footer am unteren Rand der Seitenleiste verankert.
- Fachliche Inventar-, Renewal-, Publish-, Lösch-, Papierkorb-, Recovery- und Diagnose-Logik bleibt unverändert.
<!-- KAR170-END:README:1135 -->

## v1.10.3

<!-- KAR170-BEGIN:CHANGELOG:1465 -->
### Original CHANGELOG: 1.10.3 – 2026-09-14 (source line 1465)

- 16/32/48-px-Toolbar-/Extension-Icons aus dem vorhandenen hochauflösenden Master enger beschnitten, sodass das Motiv in der Chrome-/App-Leiste sichtbar größer erscheint.
- Keine Änderung an Motivstil, 128-px-App-Icon, Favicon, Inventarisierung, Renewal-State-Machine, Auto-Publish-Gates, Phase-4-Löschlogik, Recovery, Diagnose oder Verbindungsstatus.
- Neuer dependency-freier Vertragstest `tests/v1103-contract.cjs` schützt Icon-Payload, Mindest-Footprint, feste Extension-ID/Manifest-Key sowie Byte-Identität ausgewählter Kern-Runtime-Dateien zu v1.10.2.
<!-- KAR170-END:CHANGELOG:1465 -->

<!-- KAR170-BEGIN:README:1145 -->
### Historical README: Patch 1.10.3: Größeres Toolbar-Symbol (source line 1145)

- Die kleinen 16/32/48-px-Icon-Assets nutzen dieselbe freigegebene Grafik jetzt mit deutlich engerem Beschnitt und damit größerer sichtbarer Fläche in der Chrome-/App-Leiste.
- Das Motiv selbst, das 128-px-App-Icon, Favicons und die fachliche Extension-Logik bleiben unverändert.
- Ein neuer dependency-freier Vertragstest prüft die Icon-Hashes, PNG-Abmessungen, die vergrößerte opake Bildfläche sowie die unveränderte feste Extension-ID und ausgewählte Kern-Runtime-Dateien.
<!-- KAR170-END:README:1145 -->

## v1.10.2

<!-- KAR170-BEGIN:CHANGELOG:1471 -->
### Original CHANGELOG: 1.10.2 – 2026-09-14 (source line 1471)

- Neue hochauflösende App-/Taskleisten-Icons im passenden Dark-Neon-Stil der Anwendung integriert.
- Manifest besitzt jetzt echte Extension-Icons in 16/32/48/128 px; die kleinen Größen verwenden die vereinfachte Taskleistenvariante, 128 px die detaillierte App-Variante.
- `app.html` und `popup.html` veröffentlichen zusätzlich Favicons, damit Fenster-/Tab-Darstellung und Taskleisten-Symbol konsistent wirken.
- Runtime-Paketierung und Validierung wurden um die Icon-Artefakte erweitert.
- Neuer dependency-freier Vertragstest `tests/v1102-contract.cjs` schützt Icon-Einbindung, Favicon-Links und Packaging.
<!-- KAR170-END:CHANGELOG:1471 -->

<!-- KAR170-BEGIN:README:1152 -->
### Historical README: Patch 1.10.2: App- und Taskleisten-Icons (source line 1152)

- Die Anwendung besitzt jetzt ein eigenes hochauflösendes Icon-Set im Stil der Oberfläche.
- Kleine Darstellungen wie Toolbar, Fenstersymbol und Taskleiste verwenden eine vereinfachte, klar lesbare Variante.
- Größere Darstellungen verwenden eine detailliertere App-Variante mit Karten-, Archiv- und Erneuern-Symbolik.
- App-Fenster und Launcher veröffentlichen zusätzlich Favicons, damit das Symbol auch in Fenstertitel und Tabs konsistent erscheint.
<!-- KAR170-END:README:1152 -->

## v1.10.1

<!-- KAR170-BEGIN:CHANGELOG:1479 -->
### Original CHANGELOG: 1.10.1 – 2026-09-14 (source line 1479)

- Statusmaschine korrigiert: Nur inventarrelevante Kleinanzeigen-Seiten gelten als gesunder Verbindungszustand; Start-/Benachrichtigungsseiten unterdrücken keine späteren Statuswechsel mehr.
- Hintergrundprüfungen aktualisieren den sichtbaren Status bei einem Wechsel zu „Meine Anzeigen“ oder einer eigenen Anzeige zuverlässig.
- In-Page-Fortschrittsmeldung trennt Vollautomatik und Papierkorb-Template: Manuelle Publish-Hinweise erscheinen standardmäßig nur noch im `templateOnly`-Flow.
- Startmodal-Aktionen: `Schließen` links, `Jetzt neu inserieren und austauschen` rechts.
- Erfolgsmodal-Aktionen: `Schließen` links; `Anzeige ansehen` und `Anzeige bearbeiten` gleich groß rechts.
- App-Modals verwenden einen zentralen SVG-Close-Button mit exakter Zentrierung und grünem Primärbutton-Hover.
- Neuer dependency-freier v1.10.1-Vertragstest schützt Statussemantik, Vollautomatik-/Template-Feedback und Modal-Layout.
<!-- KAR170-END:CHANGELOG:1479 -->

<!-- KAR170-BEGIN:README:1162 -->
### Historical README: Patch 1.10.1: Verbindungsstatus und Modal-Feinschliff (source line 1162)

- Der sichtbare Kleinanzeigen-Status gilt nur noch dann als verbunden/gesund, wenn tatsächlich **„Meine Anzeigen“** oder eine eigene Anzeige nutzbar erkannt wurde. Andere Kleinanzeigen-Seiten wie Startseite oder Benachrichtigungen können den Status nicht mehr auf einem veralteten Prüfzustand festhalten.
- Wechsel zwischen relevanten Ansichten aktualisieren den sichtbaren Status auch bei Hintergrundprüfungen sofort.
- Das In-Page-Statusfeld unterscheidet Vollautomatik und Papierkorb-Vorlage: Nur die Papierkorb-Vorlage weist auf manuelles Veröffentlichen hin; der normale Austausch zeigt den laufenden automatischen Ablauf.
- Startmodal: **Schließen** links, **Jetzt neu inserieren und austauschen** rechts.
- Erfolgsmodal: **Schließen** links; **Anzeige ansehen** und **Anzeige bearbeiten** gleich groß als rechte Aktionsgruppe.
- Alle App-Modal-Schließen-Buttons verwenden ein geometrisch zentriertes SVG-X und denselben grünen Hover-Akzent wie der Primärbutton.
<!-- KAR170-END:README:1162 -->

## v1.10.0

<!-- KAR170-BEGIN:CHANGELOG:1489 -->
### Original CHANGELOG: 1.10.0 – 2026-09-14 (source line 1489)

- Große Endanwender-UX-Überarbeitung: sichtbare Texte an Kleinanzeigen-Sprache angenähert und technische Begriffe aus normalen Status-, Karten-, Dialog- und Fehlermeldungen entfernt.
- Technische Fehler werden in der UI verständlich zusammengefasst; Detailursachen bleiben in Diagnosedaten und Ereignisprotokollen.
- Native `confirm()`-Dialoge durch ein einheitliches gestaltetes App-Bestätigungsmodal ersetzt.
- Bildflackern behoben: stabile Object-URL-Caches pro lokalem Bild, kein globales URL-Revoke bei Listenrendern und kein vollständiger Inventar-Rebuild bei reinen `renewal-updated`-Fortschrittsereignissen.
- Fortschrittsmodal behält sein Titelbild, solange sich das zugrunde liegende Bild nicht ändert.
- `ENDET AM` zeigt relative Resttage (`heute`, `morgen`, `in X Tagen`); Standardansicht ist `Endet am` aufsteigend.
- Startmodal-Aktionen kompakter angeordnet; der Primärbutton belegt nicht mehr die gesamte Restbreite.
- Erfolgsmodal bietet neben `Anzeige ansehen` zusätzlich `Anzeige bearbeiten`.
- Kartenklick bleibt die öffentliche Kontrollansicht; der Detail-Link heißt eindeutig `Anzeige bearbeiten`.
- Toolbar-Popup und Papierkorbtexte ebenfalls endanwenderfreundlich überarbeitet.
- Neuer dependency-freier v1.10.0-Vertragstest schützt UX-Texte, flackerfreie Bildbindung, Standard-Sortierung, relative Enddaten, modale Bestätigungen und die neuen Abschlussaktionen.
<!-- KAR170-END:CHANGELOG:1489 -->

<!-- KAR170-BEGIN:README:1171 -->
### Historical README: Version 1.10.0: UI-/UX-Überarbeitung und flackerfreie Bilder (source line 1171)

- Die sichtbare Oberfläche verwendet konsequent endanwenderfreundliche Begriffe nahe an Kleinanzeigen. Interne Begriffe wie Renewal, Recovery, Verifikation, Read-only, Content Script oder Retry bleiben auf Diagnose und Implementierung beschränkt.
- Technische Laufzeitfehler werden in der App auf verständliche Meldungen abgebildet; die vollständigen technischen Details bleiben in den Diagnosedaten.
- Native Browser-Bestätigungen wurden durch ein einheitliches App-Modal ersetzt.
- Bildvorschauen verwenden stabile, pro Bild gecachte Blob-URLs. Reine Fortschrittsereignisse aktualisieren nur den laufenden Austausch und bauen nicht mehr die gesamte Inventarliste neu auf. Dadurch verschwindet das beobachtete gemeinsame Bildflackern während Phase 1–4.
- `ENDET AM` zeigt zusätzlich die relative Restzeit, zum Beispiel `10.11.2026 (in 57 Tagen)`, mit `heute` und `morgen`. Standardsortierung bleibt `Endet am` aufsteigend.
- Das Startmodal verwendet kompaktere Aktionen mit sichtbarem Abstand. Der Erfolgszustand bietet `Anzeige ansehen`, `Anzeige bearbeiten` und `Schließen`.
- Inventarkarten öffnen beim Klick die öffentliche Anzeige; in den aufgeklappten Details führt `Anzeige bearbeiten` gezielt zur Bearbeiten-Seite.
<!-- KAR170-END:README:1171 -->

## v1.9.0

<!-- KAR170-BEGIN:CHANGELOG:1503 -->
### Original CHANGELOG: 1.9.0 (source line 1503)

- Globaler exklusiver Inserierungs-/Renewal-Lock: maximal ein Neu-Inserieren-/Austausch- oder Papierkorb-Template-Lauf gleichzeitig.
- Der Lock bleibt über Draft, Veröffentlichung, `WARTET AUF ONLINE`, `PRÜFUNG NÖTIG`, Verifikation und Phase 4 bestehen und wird aus persistenten Renewal-/Fill-Sessions rekonstruiert.
- Mehrere App-Fenster und direkte Runtime-Starts werden service-worker-seitig abgefangen; Startvorgänge sind zusätzlich serialisiert.
- Während eines aktiven Locks sind alle anderen „Neu inserieren“- und „Als Vorlage neu inserieren“-Aktionen deaktiviert und nennen den laufenden Artikel, sofern bekannt.
<!-- KAR170-END:CHANGELOG:1503 -->

<!-- KAR170-BEGIN:README:1822 -->
### Historical README: v1.9.0 – Exklusiver Inserierungs-Lock (source line 1822)

Es kann erweiterungsweit nur ein Inserierungs-/Renewal-Lauf gleichzeitig aktiv sein. Der Lock umfasst auch `WARTET AUF ONLINE`, `PRÜFUNG NÖTIG`, Phase 4 und Papierkorb-Template-Läufe und wird aus persistentem Laufzustand rekonstruiert.
<!-- KAR170-END:README:1822 -->

## v1.8.14

<!-- KAR170-BEGIN:CHANGELOG:1510 -->
### Original CHANGELOG: 1.8.14 – 2026-09-14 (source line 1510)

- UX: Das Bestätigungsmodal wird nach Start zum Live-Progress-Modal für Ausfüllen, Veröffentlichen, Verifizieren und Quellanzeige löschen.
- Fortschritt wird aus persistiertem Renewal-State abgeleitet; Modal kann geschlossen und über eine Statusfläche wieder geöffnet werden.
- Abschlusszustand zeigt Erfolg, neue Anzeigen-ID sowie `Anzeige ansehen` in der Read-only-Ansicht.
- Inventarklick öffnet standardmäßig `/s-anzeige/<adId>`; Detail-Link wurde zu `Anzeige bearbeiten` geändert und öffnet die Bearbeiten-Seite.
- Neuer dependency-freier v1.8.14-Vertragstest schützt Progress-State-Mapping, Modal-Lifecycle, Read-only-Karten und Bearbeiten-Link.
<!-- KAR170-END:CHANGELOG:1510 -->

<!-- KAR170-BEGIN:README:1204 -->
### Historical README: Patch 1.8.14: Live-Fortschrittsmodal und Read-only-Karten (source line 1204)

- Das v1.8.13-Startmodal bleibt nach der Freigabe geöffnet und wird zur echten Live-Fortschrittsanzeige für Phase 1–4.
- Die vier Phasen zeigen persistent pending/aktiv/erfolgreich/wartend/fehlgeschlagen und werden aus dem autoritativen Renewal-State rekonstruiert.
- Das Modal kann während des Laufs geschlossen werden, ohne den Lauf zu stoppen; eine Statusfläche in der App öffnet es wieder.
- Nach erfolgreichem Austausch zeigt dasselbe Modal den Abschlusszustand mit neuer Anzeigen-ID und `Anzeige ansehen`; die neue Karte ist dort ebenfalls klickbar.
- Inventarkarten öffnen per Kartenklick nun die öffentliche Read-only-ID-URL `/s-anzeige/<adId>`. Interaktive Kartenelemente behalten ihre eigene Aktion.
- Der Link in `Artikeldetails anzeigen` heißt nun `Anzeige bearbeiten` und führt deterministisch auf `/p-anzeige-bearbeiten.html?adId=<adId>`.
- Keine automatische Scrollpositionsänderung der Inventarliste.
<!-- KAR170-END:README:1204 -->

## v1.8.13

<!-- KAR170-BEGIN:CHANGELOG:1518 -->
### Original CHANGELOG: 1.8.13 – 2026-09-14 (source line 1518)

- **Neu inserieren** besitzt jetzt ein eigenes gestaltetes App-Modal statt eines Browser-Alerts. Es zeigt Titel, lokales Titelbild und Anzeigen-ID der Quellanzeige sowie die vier automatischen Phasen **Ausfüllen → Veröffentlichen → Verifizieren → Quellanzeige löschen**.
- Das Modal weist ausdrücklich darauf hin, dass die Quellanzeige erst nach erfolgreicher Verifikation gelöscht wird und ihre lokale Kopie anschließend 30 Tage im Papierkorb als Recovery-Vorlage verfügbar bleibt. Start erst über **Neu inserieren und austauschen**; Abbrechen startet keinerlei Renewal-Sitzung.
- Die ausdrückliche Freigabe wird als `autoReplacementAllowed`, `startConfirmedAt` und Confirmation-Version persistent in Renewal-/Fill-State geführt.
- Nach dem unverändert strengen Auto-Publish-Hard-Gate und einem vollständigen Phase-3-`match` wird Phase 4 nun automatisch gestartet. Damit läuft ein bestätigter **Neu inserieren**-Vorgang vollständig durch Phase 1–4.
- Service-Worker-Recovery nimmt automatisch freigegebene, bereits verifizierte bzw. in `source-delete...` befindliche Renewals wieder auf.
- Scheitert Auto-Phase-4, wird der Kandidat sicher auf `verified/replacement-ready` zurückgeführt; die bestehende manuelle Abschlussaktion bleibt als Recovery erhalten.
- Papierkorb-Template-Recovery bleibt unverändert `templateOnly` und erhält niemals `autoReplacementAllowed`; sie kann daher weiterhin weder Auto-Publish noch Phase 4 auslösen.
- Neuer dependency-freier v1.8.13-Vertragstest schützt Modalinhalt, explizite Freigabe, persistente Automatik, Auto-Phase-4, Resume und Papierkorb-Grenze.
<!-- KAR170-END:CHANGELOG:1518 -->

<!-- KAR170-BEGIN:README:1214 -->
### Historical README: Patch 1.8.13: bestätigter Vollautomatik-Lauf Phase 1–4 (source line 1214)

**Neu inserieren** startet nicht mehr unmittelbar. Vorher zeigt die App ein eigenes, gestaltetes Modal mit Titel und lokalem Titelbild der Quellanzeige. Das Modal erklärt die vier Phasen **Ausfüllen → Veröffentlichen → Verifizieren → Quellanzeige löschen**, weist ausdrücklich darauf hin, dass die alte Online-Anzeige erst nach vollständiger Verifikation gelöscht wird, und erklärt die 30-Tage-Recovery über den Papierkorb. Erst **Neu inserieren und austauschen** erteilt die Freigabe für den vollständigen Lauf.

Diese Freigabe wird als `autoReplacementAllowed` persistent an Renewal- und Fill-Session gebunden. Der bestehende Auto-Publish-Hard-Gate bleibt unverändert streng. Nach einem vollständigen `match` der erneut inventarisierten Bearbeiten-Seite und der öffentlichen Anzeige startet Phase 4 automatisch. Bei Service-Worker-Neustart werden bestätigte, bereits verifizierte automatische Renewals einschließlich laufender `source-delete...`-Phasen wieder aufgenommen.

Scheitert die automatische Phase 4, wird die Quellanzeige nicht ungeprüft lokal entfernt. Der Kandidat bleibt `verified/replacement-ready` und kann über die bestehende manuelle Aktion erneut abgeschlossen werden. Erfolgreiche Läufe verwenden weiterhin die persistente App-Erfolgsmeldung und den 30-Tage-Papierkorb aus v1.8.12. Papierkorb-Recovery selbst bleibt ausdrücklich Template-only und veröffentlicht weiterhin nicht automatisch.
<!-- KAR170-END:README:1214 -->

## v1.8.12

<!-- KAR170-BEGIN:CHANGELOG:1529 -->
### Original CHANGELOG: 1.8.12 – 2026-09-14 (source line 1529)

- Neuer 30-Tage-Papierkorb als Recovery-Archiv. Manuell aus dem aktiven Inventar entfernte Anzeigen werden nicht mehr sofort endgültig gelöscht; Datensatz und lokal gespeicherte Bilder bleiben bis `trash.expiresAt` erhalten und werden beim nächsten Extension-/Listen-Lifecycle nach Ablauf automatisch bereinigt.
- Erfolgreicher Phase-4-Austausch verschiebt die alte lokale Quellanzeige atomar in den Papierkorb, während der verifizierte neue Kandidat zum normalen Inventareintrag promoviert wird. Die alte Online-Anzeige bleibt wie bisher nach expliziter Bestätigung gelöscht.
- Eigene App-Ansicht **Papierkorb** mit Restlaufzeit, Recovery-Daten, **Als Vorlage neu inserieren** und **Endgültig löschen**. Eine Wiederherstellung zurück in die aktive Inventurliste ist bewusst nicht vorgesehen; Kleinanzeigen bleibt die autoritative aktive Datenbasis.
- **Als Vorlage neu inserieren** aus dem Papierkorb startet einen eigenständigen Template-only-Fill: gespeicherte Daten/Bilder werden übernommen und alle nicht veröffentlichenden Zwischenschritte dürfen ausgeführt werden, der finale Publish-Schritt wird jedoch niemals automatisch ausgelöst. Es entsteht keine Renewal-/Phase-2/3/4-Sitzung.
- **Inventarliste leeren** verschiebt reguläre aktive Inventareinträge ebenfalls in den 30-Tage-Papierkorb; bei vorhandenen Renewal-Sitzungen bleibt die Massenaktion gesperrt.
- Nach `RENEWAL_REPLACEMENT_COMPLETED` wird der von der Extension erzeugte Renewal-Zieltab best-effort geschlossen, sofern er noch eindeutig auf einem `/p-anzeige-aufgeben...`-Pfad derselben Session steht. Ein inzwischen anderweitig verwendeter Tab wird nicht geschlossen.
- Erfolgreicher Austausch schreibt eine persistente, in der App sichtbare Erfolgsmeldung **Austausch erfolgreich abgeschlossen**. Sie nennt den 30-Tage-Papierkorb und bleibt bis zum manuellen Schließen sichtbar.
- Neuer dependency-freier v1.8.12-Vertragstest schützt Papierkorb-Retention, Soft-Delete, atomare Phase-4-Sicherung, Template-only-Grenze, Erfolgsmeldung und Zieltab-Cleanup.
<!-- KAR170-END:CHANGELOG:1529 -->

<!-- KAR170-BEGIN:README:1222 -->
### Historical README: Patch 1.8.12: 30-Tage-Papierkorb, Recovery-Vorlage und Abschluss-UX (source line 1222)

Gelöschte aktive Inventareinträge werden ab v1.8.12 nicht mehr sofort endgültig entfernt. Sie wechseln mit ihren lokal gespeicherten Bildern für **30 Tage** in die eigene App-Ansicht **Papierkorb**. Nach Ablauf werden Datensatz und Bilder automatisch beim nächsten Extension-/Listen-Lifecycle bereinigt. Eine Rückverschiebung ins aktive Inventar gibt es bewusst nicht: Der aktive Kleinanzeigen-Bestand bleibt die autoritative Datenbasis.

Der Papierkorb dient ausschließlich als Recovery-Archiv. **Als Vorlage neu inserieren** übernimmt die gesicherten Formulardaten und Bilder in eine neue Anzeige, führt die notwendigen nicht veröffentlichenden Zwischenschritte aus und stoppt am finalen Publish-Schritt. Dieser Template-only-Lauf erzeugt keine Renewal-Sitzung und darf niemals automatisch auf **Anzeige aufgeben** klicken. **Endgültig löschen** entfernt den Papierkorb-Datensatz samt lokaler Bilder sofort.

Beim erfolgreichen **Austausch abschließen** wird die alte Quellanzeige weiterhin online gelöscht und autoritativ verifiziert. Der lokale Phase-4-Wechsel legt die alte Quelle nun jedoch atomar im 30-Tage-Papierkorb ab, während die neue Anzeige zum normalen Inventareintrag wird. Danach zeigt die App eine persistente Erfolgsmeldung **Austausch erfolgreich abgeschlossen** und schließt den von der Extension erzeugten Renewal-Zieltab best-effort, sofern dieser noch eindeutig auf dem Renewal-/Bestätigungsflow steht.
<!-- KAR170-END:README:1222 -->

## v1.8.11

<!-- KAR170-BEGIN:CHANGELOG:1540 -->
### Original CHANGELOG: 1.8.11 – 2026-09-14 (source line 1540)

- Phase 4 gegen den real beobachteten Chrome-Fehler `A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received` gehärtet. Ein solcher Abbruch nach dem Löschbefehl ist kein fachlicher Löschfehler mehr.
- Nach dem Löschversuch wird `source-delete-verification-pending` persistent gespeichert. Transportergebnis und optionales Toast-/Modal-Feedback bleiben diagnostische Evidenz; sie entscheiden nicht über den lokalen Abschluss.
- Die autoritative Löschverifikation läuft in einem separaten frischen `Meine Anzeigen`-Worker und ist dadurch unabhängig von Navigation/Unload des Tabs, in dem `Ja, Anzeige löschen` geklickt wurde.
- Die Quell-ID wird weiterhin profilgebunden über die vollständige Pagination gesucht. Zur Toleranz kurzer serverseitiger Konsistenzverzögerungen erfolgen bis zu drei vollständige Prüfversuche mit kurzen Abständen.
- Wird die Quell-ID nach allen Versuchen weiterhin gefunden, erfolgt kein lokaler Inventarwechsel; der Kandidat wird wieder auf `replacement-ready` gesetzt und bleibt sicher erneut ausführbar.
- Erst nach `source-delete-verified` wird der Kandidat atomar zum normalen Inventareintrag promoviert und die alte lokale Quelle entfernt.
- Neuer dependency-freier v1.8.11-Vertragstest schützt Channel-Loss-Toleranz, persistente Zwischenphase, unabhängigen Verifikations-Worker, Retry-Semantik, Cleanup und die atomare Sicherheitsgrenze.
<!-- KAR170-END:CHANGELOG:1540 -->

<!-- KAR170-BEGIN:README:1230 -->
### Historical README: Patch 1.8.11: robuste Phase-4-Verifikation nach Lösch-Navigation (source line 1230)

Nach dem Klick auf **Ja, Anzeige löschen** kann Kleinanzeigen die Seite unmittelbar navigieren oder neu laden. Dadurch darf ein geschlossener Chrome-Message-Channel nicht mehr als fachlicher Löschfehler interpretiert werden. v1.8.11 behandelt den beobachteten Post-Confirmation-Transportabbruch ausschließlich als **unklares Transportergebnis** und startet danach immer die unabhängige Löschverifikation.

Dafür wird der persistente Zwischenzustand `source-delete-verification-pending` geschrieben. Die autoritative Prüfung läuft in einem **separaten frischen Worker-Tab** auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`, prüft erneut das erwartete Profil und sucht die alte Quell-ID über die vollständige Pagination. Kurze serverseitige Konsistenzverzögerungen werden durch bis zu drei vollständige Prüfversuche abgefangen. Nur ein bestätigtes vollständiges Verschwinden der Quell-ID erlaubt den atomaren lokalen Inventarwechsel.

Bleibt die Quellanzeige nach allen Prüfversuchen vorhanden, wird nichts lokal gelöscht oder umgehängt; der Renewal-Kandidat kehrt in den sicheren Zustand **AUSTAUSCH BEREIT** zurück und kann erneut angestoßen werden. Lösch-Worker und Verifikations-Worker werden unabhängig voneinander aufgeräumt.
<!-- KAR170-END:README:1230 -->

## v1.8.10

<!-- KAR170-BEGIN:CHANGELOG:1550 -->
### Original CHANGELOG: 1.8.10 – 2026-09-14 (source line 1550)

- **Jetzt erneut prüfen** führt bei veröffentlichten Renewal-Kandidaten wieder eine vollständige, deterministische Verifikation aus: zuerst wird die bekannte neue Anzeigen-ID über `p-anzeige-bearbeiten.html?adId=<newAdId>` neu inventarisiert und inhaltlich gegen die Quellanzeige verglichen.
- Die öffentliche Primärprüfung verwendet keine geratenen Slug-/Kategorie-URLs mehr, sondern ausschließlich `https://www.kleinanzeigen.de/s-anzeige/<newAdId>`.
- Ist die direkte Read-only-Prüfung unklar, wird als Fallback `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` geöffnet und die neue Anzeigen-ID profilgebunden über die vollständige Pagination gesucht.
- Liefert die gefundene Karte in „Meine Anzeigen“ eine konkrete öffentliche URL, wird diese als zweiter Read-only-Versuch verwendet. So kann ein Redirect der kurzen ID-URL abgefangen werden, ohne eine URL aus Titel/Kategorie selbst zu konstruieren.
- Wird die neue Anzeige in „Meine Anzeigen“ gefunden, die öffentliche Seite aber noch nicht eindeutig erkannt, bleibt der sichere Zustand **WARTET AUF ONLINE** erhalten. Wird sie weder öffentlich noch im vollständig paginierten eigenen Anzeigenbestand bestätigt, entsteht **PRÜFUNG NÖTIG** statt eines falschen Online-Wartezustands.
- Der Fallback prüft den erkannten Profilnamen gegen den Profilbezug der Quellanzeige und bricht bei Profilwechsel/-Unklarheit ohne Freigabe ab.
- Neuer dependency-freier v1.8.10-Vertragstest schützt Bearbeiten→Read-only-ID→Meine-Anzeigen-Fallback, Pagination, Profilbindung und die weiterhin unveränderte Publish-Sicherheitsgrenze.
<!-- KAR170-END:CHANGELOG:1550 -->

<!-- KAR170-BEGIN:README:1238 -->
### Historical README: Patch 1.8.10: deterministische Retry-Verifikation mit „Meine Anzeigen“-Fallback (source line 1238)

**Erneut prüfen** validiert die bereits veröffentlichte neue Anzeige wieder vollständig. Zuerst wird die Bearbeiten-Seite `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=<newAdId>` geöffnet und die gespeicherte Anzeige erneut inventarisiert. Damit werden Titel, Beschreibung, Kategorie, Preis/Preisart, Attribute, Versand, Standort und Bilder erneut gegen die Quellanzeige geprüft.

Die öffentliche Prüfung verwendet anschließend ausschließlich die kurze, ID-basierte Read-only-URL `https://www.kleinanzeigen.de/s-anzeige/<newAdId>`. Eine öffentliche URL wird im Renewal-Retry nicht mehr aus Titel, Kategorie und Ort zusammengesetzt.

Bleibt die Read-only-Prüfung unklar, öffnet die Extension als Fallback `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`, bestätigt das erwartete Profil und sucht die neue Anzeigen-ID über alle erreichbaren Seiten. Wird die Karte gefunden und enthält sie eine konkrete öffentliche Anzeigen-URL, wird diese noch einmal als Read-only-Ziel geprüft. Eine gefundene eigene Anzeige bei weiterhin unklarer öffentlicher Erreichbarkeit bleibt **VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT**; fehlt sie auch im vollständigen „Meine Anzeigen“-Scan, wechselt der Vorgang zu **PRÜFUNG ERFORDERLICH**.
<!-- KAR170-END:README:1238 -->

## v1.8.9

<!-- KAR170-BEGIN:CHANGELOG:1560 -->
### Original CHANGELOG: 1.8.9 – 2026-09-14 (source line 1560)

- Renewal-Zustandsmaschine korrigiert: Wenn der fachliche Vergleich vollständig passt und ausschließlich `onlineConfirmed=false` ist, entsteht nun `waiting-for-online` / **WARTET AUF ONLINE** statt `verification-failed` / **PRÜFUNG NÖTIG**.
- **Jetzt erneut prüfen** ist für `waiting-for-online` aktiv und führt eine leichte Read-only-Onlineprüfung der bereits bekannten neuen Anzeigen-ID durch; ein erfolgreicher früherer Fachvergleich muss dafür nicht erneut über Bearbeiten-Seite und Bilder aufgebaut werden.
- **Verifikation erneut prüfen** ist auch für echte `verification-failed`-Kandidaten aktiv und startet dort bewusst eine vollständige Re-Inventarisierung/Verifikation.
- Persistierte v1.8.8-Dead-Locks mit genau einer `online`-Unsicherheit werden beim Resume automatisch nach `waiting-for-online` migriert und erneut geprüft. Der bestehende neue Kandidat bleibt erhalten; erneutes Inserieren ist nicht erforderlich.
- Sobald die Read-only-Seite erreichbar ist, wird der gespeicherte Online-only-Vergleich zu `match` vervollständigt, der Kandidat wird `verified/replacement-ready` und die UI wechselt zu **AUSTAUSCH BEREIT**.
- Ein vorhandener `newAdId` hält den Datensatz semantisch als `renewal-candidate`; ein Online-Wartezustand wird nicht mehr als Draft zurückgestuft.
- Neuer dependency-freier v1.8.9-Vertragstest schützt Zustandsklassifikation, Recovery-Aktion, Legacy-Migration, leichtgewichtige Online-Nachprüfung und die unveränderten Publish-/Phase-4-Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1560 -->

<!-- KAR170-BEGIN:README:1246 -->
### Historical README: Patch 1.8.9: veröffentlichte Anzeige ohne Dead-Lock nach Online-Latenz (source line 1246)

Ein fachlich vollständig übereinstimmender Renewal-Kandidat wird nicht mehr als `verification-failed` behandelt, wenn ausschließlich die öffentliche Read-only-Erreichbarkeit noch fehlt. Dieser reale Kleinanzeigen-Zwischenzustand erhält nun `waiting-for-online` und die sichtbare Kennzeichnung **VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT**.

Die zugehörige Aktion **Erneut prüfen** ist aktiv. Sie prüft bevorzugt nur die bekannte öffentliche URL der bereits erfassten neuen Anzeigen-ID und verwendet den bereits erfolgreichen fachlichen Vergleich weiter. Sobald die Read-only-Seite eindeutig erreichbar ist, wechselt der Kandidat ohne erneutes Inserieren zu **AUSTAUSCH BEREIT**. Echte Mismatches bzw. andere Unsicherheiten bleiben **PRÜFUNG ERFORDERLICH**, besitzen nun aber ebenfalls eine aktive Aktion **Erneut prüfen**, die eine vollständige Re-Inventarisierung auslöst.

Persistierte v1.8.8-Sitzungen, die nur wegen `onlineConfirmed=false` auf `verification-failed` stehen, werden beim Service-Worker-Resume automatisch nach `waiting-for-online` migriert und einmal erneut geprüft. Dadurch kann der bereits veröffentlichte Kandidat nach einem Update auf v1.8.9 weiterverwendet werden.
<!-- KAR170-END:README:1246 -->

## v1.8.8

<!-- KAR170-BEGIN:CHANGELOG:1570 -->
### Original CHANGELOG: 1.8.8 – 2026-09-14 (source line 1570)

- Phase-4-Nachlauf robust gegen die zwei real beobachteten Kleinanzeigen-Erfolgsdarstellungen gemacht: Toast `Anzeige wurde gelöscht` und Modal `Erledigt!` werden nur als optionale positive Diagnoseevidenz behandelt.
- Ein nach der bestätigten Löschung noch sichtbarer Karten-DOM ist kein unmittelbarer Fehler mehr. Das behebt den v1.8.7-Abbruch `Die Löschaktion wurde ausgelöst, aber die Quellanzeige blieb auf der aktuellen Seite sichtbar.`, der insbesondere beim `Erledigt!`-Modal auftrat.
- Fehlt Toast/Modal vollständig, wird dies als `RENEWAL_SOURCE_DELETE_NO_FEEDBACK` diagnostiziert, aber nicht als Löschfehler interpretiert.
- Die verbindliche Sicherheitsverifikation bleibt unverändert streng: `Meine Anzeigen` / `tab=PROJECTS` wird frisch ab Seite 1 geladen und die alte Quell-ID wird erneut über die vollständige Pagination gesucht. Nur wenn sie nirgends mehr vorkommt, erfolgt der atomare lokale Inventarwechsel.
- Neue Diagnoseereignisse `RENEWAL_SOURCE_DELETE_SUCCESS_TOAST`, `RENEWAL_SOURCE_DELETE_SUCCESS_MODAL` und `RENEWAL_SOURCE_DELETE_NO_FEEDBACK`; Phase-4-Zusammenfassung führt Feedbacktyp und Erkennungsmethode mit.
- Neuer dependency-freier v1.8.8-Vertragstest schützt Feedback-Semantik, Nicht-Abbruch bei stehenbleibender Karte und den weiterhin autoritativen Vollscan-Fallback.
<!-- KAR170-END:CHANGELOG:1570 -->

<!-- KAR170-BEGIN:README:1254 -->
### Historical README: Patch 1.8.8: variables Löschfeedback + autoritativer Vollscan-Fallback (source line 1254)

Nach dem bestätigten Klick auf **„Ja, Anzeige löschen“** akzeptiert Phase 4 die real beobachteten Kleinanzeigen-Erfolgsvarianten nur noch als optionale UI-Evidenz: den Toast **„Anzeige wurde gelöscht“** oder das Modal **„Erledigt!“**. Fehlt beides, ist das kein unmittelbarer Fehler. Ebenso darf ein beim Modal im Hintergrund noch sichtbarer Karten-DOM den Ablauf nicht mehr vorzeitig abbrechen.

Die eigentliche Sicherheitsentscheidung bleibt davon unabhängig: Der Worker lädt anschließend `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` frisch ab Seite 1 und sucht die alte Quell-ID erneut über alle erreichbaren Seiten. Nur wenn die Quell-ID im vollständigen paginierten Bestand nicht mehr gefunden wird, darf der lokale Phase-4-Inventarwechsel stattfinden. Toast, Modal und lokales DOM sind lediglich Diagnoseevidenz und können diese Prüfung nicht ersetzen.
<!-- KAR170-END:README:1254 -->

## v1.8.7

<!-- KAR170-BEGIN:CHANGELOG:1579 -->
### Original CHANGELOG: 1.8.7 – 2026-09-14 (source line 1579)

- Phase-4-Bestätigungsdialog an den real beobachteten Kleinanzeigen-DOM angepasst: Titel `Anzeige löschen`, Sicherheitsfrage und primär `#delete-celebration-sbmt` mit exaktem Text `Ja, Anzeige löschen`.
- Kontrollierter Fallback erlaubt ausschließlich genau einen aktiven Button mit exakt `Ja, Anzeige löschen`; Karten-Löschmatcher wird im Dialog nicht mehr wiederverwendet.
- Neues Diagnoseereignis `RENEWAL_SOURCE_DELETE_CONFIRMATION_RESOLVED` protokolliert Methode, Ablehnungsgrund und knappe Evidenz.
- Neuer dependency-freier v1.8.7-Vertragstest schützt die Dialoggrenzen und alle bestehenden Phase-4-Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1579 -->

<!-- KAR170-BEGIN:README:1260 -->
### Historical README: Patch 1.8.7: Löschbestätigungsdialog eindeutig bestätigen (source line 1260)

Phase 4 erkennt den aktuell beobachteten Kleinanzeigen-Dialog **„Anzeige löschen“** nun separat von der Kartenaktion. Primär wird ausschließlich der aktive Button `#delete-celebration-sbmt` mit dem exakten Text **„Ja, Anzeige löschen“** akzeptiert; zusätzlich müssen Dialogtitel und Sicherheitsfrage passen. Falls die ID fehlt, ist nur ein einzelner aktiver Button mit exakt demselben Text als kontrollierter Fallback zulässig. `Abbrechen` und `Schließen` sind dadurch keine Kandidaten.
<!-- KAR170-END:README:1260 -->

## v1.8.6

<!-- KAR170-BEGIN:CHANGELOG:1586 -->
### Original CHANGELOG: 1.8.6 – 2026-09-14 (source line 1586)

- Phase-4-Abbruch `diagnostic is not defined` behoben: `inventory-runner.js` besitzt jetzt einen eigenen fehlertoleranten `diagnostic()`-Helper für `LOG_DIAGNOSTIC_EVENT`.
- Diagnose bleibt strikt best-effort: Fehler beim Protokollieren dürfen den Seiten-/Löschablauf nicht beeinflussen.
- Die in 1.8.5 eingeführte Löschlogik bleibt fachlich unverändert: Quellanzeige ausschließlich unter `m-meine-anzeigen.html?tab=PROJECTS`, eindeutige `data-adid`-Bindung, Pagination und frische Vollverifikation vor lokalem Phase-4-Abschluss.
- Neuer dependency-freier v1.8.6-Vertragstest schützt Diagnose-Helper, Fehlerisolation und die unveränderten Phase-4-Sicherheitsgrenzen.
<!-- KAR170-END:CHANGELOG:1586 -->

<!-- KAR170-BEGIN:README:1264 -->
### Historical README: Patch 1.8.6: Phase-4-Diagnose darf die Löschung nicht abbrechen (source line 1264)

`inventory-runner.js` besitzt nun einen eigenen fehlertoleranten Diagnose-Helper. Die in 1.8.5 ergänzten Phase-4-Diagnoseereignisse werden best-effort über `LOG_DIAGNOSTIC_EVENT` protokolliert; ein Diagnosefehler oder ein nicht erreichbarer Runtime-Kanal darf den eigentlichen Löschablauf niemals beeinflussen. Damit ist der in 1.8.5 beobachtete Abbruch `diagnostic is not defined` behoben.

Die eigentliche Phase-4-Sicherheitslogik aus 1.8.5 bleibt unverändert: Suche der Quell-ID ausschließlich unter `Meine Anzeigen` / `tab=PROJECTS`, eindeutige Kartenbindung über `data-adid`, seitenübergreifende Suche und frische Vollverifikation vor dem lokalen Inventarwechsel.
<!-- KAR170-END:README:1264 -->

## v1.8.5

<!-- KAR170-BEGIN:CHANGELOG:1593 -->
### Original CHANGELOG: 1.8.5 – 2026-09-14 (source line 1593)

- Phase-4-Löschung auf die tatsächliche Kleinanzeigen-Verwaltungsansicht `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` festgelegt. Bearbeiten- und Read-only-Ansichten werden nicht für Löschaktionen verwendet.
- Aktuelle Anzeigenkarten werden primär über `[data-testid="ad-card"][data-adid]` erkannt. Der bisher mögliche Fehlgriff auf ein inneres Aktions-`<li>` ist damit beseitigt.
- Der Löschbutton wird weiterhin strikt innerhalb der Karte der erwarteten Quell-ID gesucht; zusätzlich zum Textsignal wird das aktuelle `trashOutline`-Icon als Evidenz akzeptiert. Mehrdeutige Kandidaten führen weiterhin zum Sicherheitsabbruch.
- Die Quell-ID wird über alle Seiten von „Meine Anzeigen“ gesucht; Seite 1 ist nicht mehr als Aufenthaltsort vorausgesetzt. Paging-Schleifen und mehr als 100 Seiten führen zu einem kontrollierten Abbruch.
- Nach einer Löschaktion reicht das lokale Entfernen der Karte nicht mehr als Phase-4-Verifikation. Der Worker lädt `tab=PROJECTS` frisch und führt einen zweiten vollständigen seitenübergreifenden Scan durch. Erst `not-in-my-ads-full-pagination-scan` erlaubt den atomaren lokalen Inventarwechsel.
- Erweiterte Diagnose für Karten-ID, Seitenzahl, Anzahl/Evidenz der Löschkandidaten sowie Umfang der Vollprüfung.
- Neuer Vertragstest `tests/v185-contract.cjs`.
<!-- KAR170-END:CHANGELOG:1593 -->

<!-- KAR170-BEGIN:README:1270 -->
### Historical README: Patch 1.8.5: robuste Phase-4-Löschung über alle „Meine Anzeigen“-Seiten (source line 1270)

Phase 4 verwendet für die Online-Löschung ausschließlich `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`. Anzeigenkarten werden primär über die von Kleinanzeigen gelieferte Kombination `data-testid="ad-card"` und `data-adid` gebunden. Dadurch kann ein inneres Aktions-`<li>` nicht mehr fälschlich als vollständige Anzeigenkarte erkannt werden.

Die Quell-Anzeigen-ID wird seitenübergreifend gesucht. Nach einer ausgelösten Löschung wird Seite 1 frisch geladen und die gesamte paginierte Liste erneut durchsucht. Erst wenn die Quell-ID auf keiner erreichbaren Seite mehr vorkommt, darf der atomare lokale Inventarwechsel stattfinden. Bei Paging-Schleifen, mehrdeutigen Löschaktionen, Profilwechsel oder weiterhin gefundener Quell-ID bricht Phase 4 ohne lokalen Abschluss ab.
<!-- KAR170-END:README:1270 -->

## v1.8.4

<!-- KAR170-BEGIN:CHANGELOG:1603 -->
### Original CHANGELOG: 1.8.4 – 2026-09-14 (source line 1603)

- Phase 4 implementiert: Ein verifizierter `replacement-ready`-Kandidat bietet jetzt die Aktion **Austausch abschließen**.
- Phase 4 löscht ausschließlich die alte Quellanzeige über die eigene „Meine Anzeigen“-Oberfläche, verlangt eine eindeutige Löschaktion und verifiziert anschließend, dass die Quellanzeige nicht mehr vorhanden ist. Direkte `submit()`-/`requestSubmit()`- oder private API-Löschpfade werden nicht verwendet.
- Erst nach bestätigter Online-Löschung erfolgt ein atomarer lokaler Inventarwechsel: alter Quell-Eintrag und seine Bilder werden entfernt, der neue Kandidat wird auf seine echte Anzeigen-ID migriert, `renewal`/`recordKind=renewal-*` werden entfernt und die neue Anzeige bleibt als normaler Inventareintrag erhalten.
- Nach Phase 4 erscheinen für die neue Anzeige wieder die normalen Aktionen **Neu inserieren**, **Aktualisieren** und **Löschen**; der Badge **AUSTAUSCH BEREIT** entfällt automatisch.
- `replacement-ready`-Kandidaten besitzen zusätzlich **Aktualisieren**. Die Aktualisierung bewahrt die Kandidaten-Identität und führt den Quell-/Zielvergleich erneut aus; nur ein erneutes `match` bleibt austauschbereit.
- `replacement-ready`-Kandidaten können mit **Aus Inventar entfernen** ausschließlich lokal entfernt werden. Dabei werden weder die neue noch die alte Anzeige auf Kleinanzeigen gelöscht oder verändert; die lokale Renewal-Sitzung wird verworfen und die Quellanzeige bleibt als normaler Inventareintrag bestehen.
- Neuer Vertragstest `tests/v184-contract.cjs`.
<!-- KAR170-END:CHANGELOG:1603 -->

<!-- KAR170-BEGIN:README:1277 -->
### Historical README: Patch 1.8.4: Phase 4 und Aktionen für austauschbereite Anzeigen (source line 1277)

Ein verifizierter Renewal-Kandidat zeigt nun **Austausch abschließen**, **Aktualisieren** und **Aus Inventar entfernen**. „Aus Inventar entfernen“ ist strikt lokal und verändert keine Anzeige auf Kleinanzeigen. „Aktualisieren“ erfasst die neue Anzeige erneut und wiederholt anschließend die Renewal-Verifikation.

**Austausch abschließen** ist Phase 4: Die alte Quellanzeige wird über „Meine Anzeigen“ anhand ihrer stabilen Anzeigen-ID gesucht und nur bei genau einer eindeutigen Löschaktion gelöscht. Die Erweiterung bestätigt die Löschung, bevor der lokale Bestand atomar umgestellt wird. Danach wird der neue Kandidat zu einem normalen Inventareintrag unter seiner neuen Anzeigen-ID, alle Renewal-Referenzen entfallen und die normalen Aktionen einschließlich **Neu inserieren** stehen wieder zur Verfügung. Kann die Online-Löschung oder deren Verifikation nicht eindeutig bestätigt werden, wird der lokale Phase-4-Abschluss nicht ausgeführt.
<!-- KAR170-END:README:1277 -->

## v1.8.3

<!-- KAR170-BEGIN:CHANGELOG:1613 -->
### Original CHANGELOG: 1.8.3 – 2026-09-14 (source line 1613)

- Verifizierte Renewal-Kandidaten werden nach erfolgreicher Veröffentlichung, Neu-Inventarisierung und semantischer Verifikation nicht mehr wie ein Draft/Skeleton dargestellt.
- Der Zustand `verified` / `replacement-ready` wird in der kompakten Inventaransicht als **AUSTAUSCH BEREIT** angezeigt.
- Eine verifizierte neue Anzeige nutzt wieder die normale Kartenoptik statt der Draft-/Renewal-Hintergrunddarstellung.
- In der kompakten Faktenliste wird die alte Quell-ID bei `replacement-ready` nicht mehr als primäre Information gezeigt; sie bleibt ausschließlich in den aufgeklappten Renewal-/Artikeldetails erhalten.
- Die Fußzeile verwendet für den verifizierten Kandidaten wieder das normale Schema `Inventarisiert <Zeit> · ID <neue Anzeigen-ID>`. Damit ist die neue ID die sichtbare primäre Anzeigen-ID.
- Draft-spezifische Aktion **Entwurf verwerfen** bleibt weiterhin ausschließlich für unveröffentlichte Renewals ohne bestätigte neue Anzeigen-ID verfügbar.
- Intern bleibt der verifizierte Kandidat bis Phase 4 mit seiner Quellanzeige und Renewal-Session verknüpft. Phase 4 / automatische Löschung der Quelle ist weiterhin nicht Bestandteil dieser Version.
<!-- KAR170-END:CHANGELOG:1613 -->

<!-- KAR170-BEGIN:README:1283 -->
### Historical README: Patch 1.8.3: verifizierte Renewal-Kandidaten normalisieren (source line 1283)

Nach erfolgreicher Veröffentlichung, automatischer Phase-2-Neuinventarisierung und semantischem `match` ist die neue Anzeige kein Draft mehr. Die Inventarzeile verwendet deshalb ab 1.8.3 wieder die normale Kartenoptik und zeigt den Status **AUSTAUSCH BEREIT**. Die neue Anzeigen-ID ist in der kompakten Ansicht die primäre ID; die alte Quell-ID bleibt als Renewal-Referenz nur in den Artikeldetails erhalten. Intern bleibt die Renewal-Verknüpfung bis zur späteren Phase 4 bestehen.

Unveröffentlichte Skeletons/Drafts bleiben weiterhin klar als Draft gekennzeichnet und können lokal über **Entwurf verwerfen** bereinigt werden. Sobald eine neue Anzeigen-ID bestätigt ist, gilt dieser einfache Draft-Löschpfad nicht mehr.
<!-- KAR170-END:README:1283 -->

## v1.8.2

<!-- KAR170-BEGIN:CHANGELOG:1623 -->
### Original CHANGELOG: 1.8.2 – 2026-09-14 (source line 1623)

- Finales Auto-Publish für Renewal Phase 1 aktiviert: **Anzeige aufgeben** wird nur dann automatisch geklickt, wenn der persistierte Fill vollständig (`complete`) und ohne Issues ist, alle kontrollierten Formular-/Bildprüfungen bestanden wurden und exakt ein sichtbarer, aktivierter Publish-Button eindeutig erkannt wird.
- Bei fehlendem oder mehrdeutigem Publish-Control wird nicht geraten. Der Fill wechselt in `awaiting-manual-publish`, zeigt einen Prüfstatus und veröffentlicht nicht automatisch.
- Der verifizierte Fill-Zustand wird über Seitennavigationen hinweg mitgeführt, damit der finale Publish-Schritt das Hard-Gate erneut belastbar prüfen kann. Publish-Erkennung, neue Anzeigen-ID-Ermittlung sowie automatische Phase 2/3 bleiben unverändert angeschlossen.
- Nicht veröffentlichte Renewal-Drafts ohne neue Anzeigen-ID können in der Inventarliste über **Entwurf verwerfen** lokal entfernt werden. Die App bestätigt ausdrücklich, dass die Quellanzeige erhalten bleibt und auf Kleinanzeigen nichts gelöscht wird.
- Beim Verwerfen werden Skeleton-Inventareintrag, zugehörige Renewal-/Fill-Sitzung und draftbezogene lokale Zustände bereinigt. Ein bereits `submitted`/veröffentlichtes Renewal oder ein Renewal mit neuer Anzeigen-ID ist für diesen einfachen Löschpfad gesperrt.
- Phase 4 bleibt weiterhin nicht implementiert: Die alte Quellanzeige wird in 1.8.2 nicht automatisch gelöscht.
<!-- KAR170-END:CHANGELOG:1623 -->

<!-- KAR170-BEGIN:README:1289 -->
### Historical README: Patch 1.8.2: sicheres Auto-Publish und lokale Draft-Bereinigung (source line 1289)

Nach vollständig verifiziertem Renewal-Fill darf die Extension den finalen sichtbaren Button **Anzeige aufgeben** jetzt automatisch betätigen. Das ist ausschließlich erlaubt, wenn der persistierte Fill `complete` ist, `issues` leer ist, alle kontrollierten Formularwerte und Bilder erfolgreich bestätigt wurden und **genau ein** sichtbarer, aktivierter Publish-Button eindeutig erkannt wird. Bei fehlendem oder mehrdeutigem Publish-Control wird nicht geraten; der Vorgang bleibt zur manuellen Prüfung stehen. Nach dem Auto-Publish läuft die bestehende Phase-1-Kette weiter: Submit erkennen, neue Anzeigen-ID bestätigen, Phase 2 re-inventarisieren und Phase 3 semantisch vergleichen. Die Quellanzeige bleibt bis auf Weiteres unangetastet; Phase 4 ist weiterhin nicht implementiert.

Nicht veröffentlichte Renewal-Skeletons ohne bestätigte neue Anzeigen-ID können jetzt über **Entwurf verwerfen** lokal bereinigt werden. Vorher bestätigt die App ausdrücklich, dass nur der lokale Draft und seine Renewal-Sitzung entfernt werden und auf Kleinanzeigen nichts gelöscht wird. Sobald ein Renewal bereits an die Veröffentlichung übergeben wurde oder eine neue Anzeigen-ID besitzt, ist dieser einfache Draft-Löschpfad gesperrt.
<!-- KAR170-END:README:1289 -->

## v1.8.1

<!-- KAR170-BEGIN:CHANGELOG:1632 -->
### Original CHANGELOG: 1.8.1 – 2026-09-14 (source line 1632)

- Nach vollständig verifiziertem Template-Fill (`complete`, keine Issues, alle Bilder stabil) betätigt die Extension jetzt automatisch genau einen eindeutig sichtbaren und aktivierten **„Weiter“**-Button des nicht-publizierenden Erstellflows. Vor dem Klick wird `post-fill-continuing` protokolliert; Navigation bzw. das Erscheinen des finalen Publish-Schritts wird anschließend bestätigt.
- Ist „Weiter“ nicht eindeutig vorhanden oder kann die Fortsetzung nicht sicher bestätigt werden, wird **nicht geraten**: Der Fill bleibt erhalten und das Feedback fordert zur manuellen Fortsetzung auf.
- **„Anzeige aufgeben“ bleibt strikt manuell.** Die Extension klickt den Publish-Button weiterhin niemals automatisch und ruft dafür weder `submit()` noch `requestSubmit()` auf. Nach dem automatischen „Weiter“ wird auf der Folgeseite die Publish-Erkennung erneut bewaffnet und zum Publish-Bereich gescrollt.
- Das Standard-**Diagnose-ZIP** exportiert jetzt ausschließlich die aktuelle Diagnose-Session seit dem letzten `DIAGNOSTIC_SESSION_STARTED`. Historische Retention-Events bleiben intern gespeichert, werden aber nicht mehr in jedes Standard-ZIP aufgenommen.
- `errors.json`, Fill-/Renewal-Sessions, Inventarzusammenfassung und optional `bulk-run.json` werden ebenfalls auf die aktuelle Session bzw. deren referenzierte IDs/Datensätze begrenzt. `environment.json` weist `exportScope: current-session` sowie interne Retention- und Exportanzahl getrennt aus.
- Die aktuell installierte Extension-Version wird im App-Header kompakt direkt aus `chrome.runtime.getManifest().version` angezeigt.
<!-- KAR170-END:CHANGELOG:1632 -->

<!-- KAR170-BEGIN:README:1295 -->
### Historical README: Patch 1.8.1: automatisches Weiter, Session-Diagnose und sichtbare Version (source line 1295)

Nach einer vollständig verifizierten Vorlagenübernahme darf die Extension nun den **nicht veröffentlichenden** Navigationsschritt **Weiter** automatisch auslösen, sofern genau ein sichtbarer und aktivierter Weiter-Button eindeutig erkannt wird. Anschließend wird entweder die Navigation bzw. der finale Prüfschritt bestätigt oder bei Unklarheit auf manuelle Fortsetzung zurückgefallen. In Version 1.8.1 blieb der Publish-Button **Anzeige aufgeben** noch eine bewusste Benutzeraktion. Diese Regel wurde in 1.8.2 durch das strikt verifizierte Auto-Publish-Hard-Gate ersetzt.

Das Standard-Diagnose-ZIP ist ab 1.8.1 sessionbezogen: Exportiert werden nur Ereignisse seit dem aktuellen `DIAGNOSTIC_SESSION_STARTED`, dazu nur die in dieser Session relevanten Fill-/Renewal-Sitzungen, Inventareinträge und gegebenenfalls der zugehörige Bulk-Run. Der interne 14-Tage-Retention-Puffer bleibt für Laufzeit/Recovery bestehen, wird aber nicht mehr pauschal in jedes ZIP kopiert.

Im App-Header wird außerdem die tatsächlich installierte Version direkt aus `chrome.runtime.getManifest().version` angezeigt.
<!-- KAR170-END:README:1295 -->

## v1.8.0

<!-- KAR170-BEGIN:CHANGELOG:1641 -->
### Original CHANGELOG: 1.8.0 – 2026-09-14 (source line 1641)

- Renewal-Workflow Phase 1–3 implementiert. Beim Start von **Neu inserieren** wird sofort ein persistenter lokaler Skeleton-/Draft-Eintrag mit eigener `renewalId`, Referenz auf den Quellartikel und sichtbarem Draft-Status im Inventar angelegt.
- Der bestehende Template-Fill bleibt manuell veröffentlichungssicher: Die Extension klickt **Anzeige aufgeben** weiterhin nicht automatisch. Nach erfolgreicher Formular-/Bildverifikation wartet der Renewal auf den ausdrücklichen Benutzer-Submit.
- Das In-Page-Feedback-Popover bleibt über den gesamten Renewal-Zyklus erhalten. Neu ist ein kleines **X** zum temporären Ausblenden; jede neue Extension-Feedbackmeldung blendet das Popover wieder ein.
- Nach dem Benutzer-Submit wird die neue Anzeigen-ID aus der navigierten Kleinanzeigen-Seite bzw. ihren öffentlichen/Bearbeiten-Links erkannt und gegen die Quell-ID abgegrenzt. Der bestehende Skeleton-Eintrag wird um die neue ID ergänzt.
- Phase 2 re-inventarisiert die neue Anzeige automatisch über Bearbeiten- und öffentliche Read-only-Seite. Beide Worker werden parallel geöffnet; die neuen tatsächlichen Formulardaten, dynamischen Merkmale, Bilder sowie `Endet am`/`Anzeige vom` ersetzen den Skeleton-Inhalt unter derselben lokalen Skeleton-ID.
- Phase 3 vergleicht Quelle und neue Anzeige fachlich: Titel, Beschreibung, Anzeigenart, Kategorie-ID/-pfad, Preis + Preisart, dynamische Merkmale, Versand-Grundstatus, Standort sowie Bilder in Anzahl/Reihenfolge/Inhalt. Neue technische IDs/URLs/Zeitstempel werden nicht als Abweichung gewertet.
- Bildvergleich ist re-encoding-tolerant: Bei identischem SHA-256 gilt ein Bild sofort als gleich; andernfalls wird ein 16×16-Graustufen-Fingerprint aus den lokal gespeicherten JPEGs verglichen. Nicht eindeutig vergleichbare Bilder führen zu `uncertain` statt zu einem falschen Erfolg.
- Nur wenn die öffentliche neue Anzeige bestätigt ist und der gesamte fachliche Vergleich `match` ergibt, erhält der Skeleton den Zustand **VERIFIZIERT / replacement-ready**. Bei Abweichungen oder Unsicherheit bleibt der Quellartikel unverändert.
- Phase 4 (automatisches Löschen der alten Anzeige und finaler Inventarwechsel) ist ausdrücklich **noch nicht** implementiert. In 1.8.0 wird keine Kleinanzeigen-Anzeige automatisch gelöscht.
- Diagnose-ZIP um `renewal-sessions.json` sowie Renewal-Zustände in der Inventarzusammenfassung erweitert.
- Persistente Renewal-Sitzungen werden nach einem Service-Worker-Neustart wieder aufgenommen: bestätigte neue IDs starten Phase 2/3 erneut aus einem sauberen Worker-Zustand; ein bereits veröffentlichter, aber noch nicht bestätigter Submit wird erneut auf eine neue ID geprüft.
- Aktive Renewal-Vorgänge schützen Quell- und Skeleton-Einträge vor lokalem Löschen/Clear bzw. Quell-Aktualisierung, damit die Vergleichsbasis während Phase 1–3 unverändert bleibt.
<!-- KAR170-END:CHANGELOG:1641 -->

<!-- KAR170-BEGIN:README:1303 -->
### Historical README: Renewal Phase 1–3 ab 1.8.0 (source line 1303)

Version 1.8.0 führt den sicheren Ersetzungsworkflow bis einschließlich Verifikation ein. Beim Klick auf **Neu inserieren** entsteht sofort zusätzlich zum Quellartikel ein persistenter **Draft/Skeleton** im Inventar. Der Skeleton besitzt zunächst nur eine lokale Renewal-ID und eine Referenz auf die Quell-Anzeige; Titel, Titelbild und weitere Sollwerte werden zur Orientierung aus der Quelle gespiegelt und sichtbar als Draft markiert.

In der ursprünglichen Phase-1–3-Einführung von 1.8.0 veröffentlichte der Template-Fill noch nicht selbst. Seit 1.8.2 darf der finale Publish-Schritt ausschließlich hinter dem vollständigen, abweichungsfreien Hard-Gate automatisch ausgelöst werden. Das Feedback-Popover begleitet den gesamten Ablauf und kann über ein kleines **X** nur bis zur nächsten neuen Statusmeldung ausgeblendet werden.

Nach dem Benutzer-Submit erkennt die Extension die neue Anzeigen-ID. Der bestehende Skeleton wird weiterverwendet; es entsteht kein zweiter Renewal-Datensatz. Anschließend werden Bearbeiten-Seite und öffentliche Read-only-Seite der neuen Anzeige parallel verarbeitet. Die frisch ausgelesenen Daten und lokal neu gespeicherten Bilder füllen den Skeleton unter derselben lokalen Inventar-ID.

Danach folgt ein semantischer Vergleich mit der Quelle. Verglichen werden Titel, Beschreibung, Anzeigenart, Kategorie, Preis/Preisart, dynamische Attribute, Versand-Grundstatus, Standort und Bilder in Reihenfolge und Inhalt. Technisch erwartbar neue Werte wie Anzeigen-ID, Bild-UUIDs, CDN-URLs und Datumswerte werden nicht als Inhaltsabweichung gewertet. Für Bilder wird zuerst der lokale SHA-256 genutzt; bei serverseitiger JPEG-Neukodierung fällt der Vergleich auf einen toleranten 16×16-Graustufen-Vergleich zurück.

Nur bei eindeutig bestätigter Online-Anzeige und vollständig passendem Inhalt wird der Renewal als **VERIFIZIERT / replacement-ready** markiert. Bei Abweichungen oder unklaren Prüfschritten bleibt der alte Quellartikel unverändert. Das automatische Löschen der alten Kleinanzeigen-Anzeige gehört bewusst noch nicht zu 1.8.0; Phase 4 folgt erst nach separater Freigabe und Praxiserprobung dieser Verifikationskette.

Renewal-Sitzungen werden persistent gespeichert. Nach einem Service-Worker-Neustart kann eine bereits bestätigte neue Anzeigen-ID Phase 2/3 aus einem sauberen Worker-Zustand fortsetzen; ein bereits ausgelöster Publish-Schritt wird erneut auf eine erkennbare neue Anzeigen-ID geprüft.
<!-- KAR170-END:README:1303 -->

## v1.7.1

<!-- KAR170-BEGIN:CHANGELOG:1656 -->
### Original CHANGELOG: 1.7.1 – 2026-09-14 (source line 1656)

- Inventarliste wächst während eines Vollinventurlaufs automatisch mit jedem erfolgreich gespeicherten Artikel; kein manueller Klick auf „Aktualisieren“ mehr erforderlich.
- Der Hintergrunddienst signalisiert Inventaränderungen best-effort an offene App-Fenster; die App lädt die Liste leicht debounced neu und erzwingt nach `BULK_INVENTORY_FINISHED` einen finalen Reload.
- Suche und Sortierung bleiben bei Live-Refresh erhalten, weil nur der lokale Datensatz neu geladen und anschließend mit dem bestehenden View-State gerendert wird.
- Read-only-URL-Erkennung im Vollinventurlauf korrigiert: Öffentliche `/s-anzeige/`-Links werden bei Bedarf im gesamten Dokument anhand derselben stabilen Anzeigen-ID gesucht, statt nur im lokal ermittelten Bearbeiten-Karten-Teilbaum.
- Dadurch kann der parallele Read-only-Metadaten-Worker für `Endet am` und `Anzeige vom` wieder gestartet werden, wenn Kleinanzeigen Bearbeiten-Aktion und öffentlichen Link in getrennten DOM-Bereichen rendert.
- Read-only-Metadaten bleiben ergänzend und dürfen bei Fehlern die primäre Bearbeiten-Inventarisierung weiterhin nicht scheitern lassen.
- Sicherheitsgrenzen unverändert: keine automatische Veröffentlichung und keine automatische Löschung einer Kleinanzeigen-Anzeige.
<!-- KAR170-END:CHANGELOG:1656 -->

<!-- KAR170-BEGIN:README:1317 -->
### Historical README: Live-Inventarliste und Read-only-Metadatenfix ab 1.7.1 (source line 1317)

Version 1.7.1 aktualisiert die Inventarliste während eines Vollinventurlaufs automatisch nach jedem erfolgreich gespeicherten Artikel. Die App empfängt dafür best-effort interne `INVENTORY_DATA_CHANGED`-Signale aus dem Hintergrunddienst und lädt die lokale Inventarliste leicht verzögert neu; Suche und Sortierung bleiben dabei aktiv. Nach `BULK_INVENTORY_FINISHED` erfolgt zusätzlich ein sofortiger finaler Reload, sodass die Liste nicht mehr manuell über „Aktualisieren“ nachgezogen werden muss.

Außerdem wurde die Ermittlung der öffentlichen Read-only-Anzeigen-URL im Vollinventurlauf robuster gemacht. Die Suche ist nicht mehr auf den vom „Bearbeiten“-Control abgeleiteten Karten-Teilbaum beschränkt, sondern fällt bei Bedarf auf das zugehörige Dokument zurück und sucht dort die öffentliche `/s-anzeige/`-URL mit exakt derselben stabilen Anzeigen-ID. Damit können Bearbeiten-Worker und Read-only-Metadaten-Worker wieder parallel geöffnet werden, auch wenn Kleinanzeigen Bearbeiten-Aktion und öffentlichen Anzeigenlink in getrennten DOM-Teilbereichen rendert.
<!-- KAR170-END:README:1317 -->

## v1.7.0

<!-- KAR170-BEGIN:CHANGELOG:1692 -->
### Original CHANGELOG: 1.7.0 – 2026-09-13 (source line 1692)

- Inventarliste um eine lokale **Titelsuche** erweitert. Die Suche arbeitet live auf den bereits inventarisierten Datensätzen, ist unabhängig von Groß-/Kleinschreibung und Akzenten und unterstützt mehrere Suchbegriffe im Titel. Es wird keine neue Kleinanzeigen-Abfrage ausgelöst.
- Neue kombinierbare Sortierung der Inventarliste nach **Name / Titel**, **Veröffentlichungsdatum / Anzeige vom**, **Endet am** und **Inventarisierungsdatum**. Jedes Kriterium kann auf- oder absteigend sortiert werden. Fehlende Datumswerte bleiben unabhängig von der Sortierrichtung gesammelt am Listenende.
- Standardsortierung bleibt funktional kompatibel zum bisherigen Verhalten: **Inventarisierungsdatum absteigend**. Während einer Titelsuche zeigt die Zählung zusätzlich die Anzahl sichtbarer Treffer gegenüber dem Gesamtbestand.
- Inventarzeilen kompakter gestaltet: Metadaten-Labels bleiben einzeilig; insbesondere `ANZEIGE VOM` bricht nicht mehr um. `Inventarisiert <Datum/Zeit> · ID <Anzeigen-ID>` wurde aus dem oberen Faktenblock entfernt und steht jetzt rechts neben **Artikeldetails anzeigen** in der unteren Kartenzeile.
- Preis in der kompakten Inventarzeile zeigt die gespeicherte Preisart konsequent als Kurz-/Langform, soweit bekannt: z. B. `5 € · FP / Festpreis` oder `15 € · VB / Verhandlungsbasis`. Fehlt eine gespeicherte Preisart, bleibt es beim Betrag. Dieselbe Darstellung wird in den Artikeldetails verwendet.
- Neue reine View-Logik `inventory-view.js` kapselt Suche, Sortierung, Datumsbehandlung und Preisart-Anzeige und wird dependency-frei getestet.
- Bestehende Funktionen aus 1.6.2 bleiben unverändert: Profil-Prerequisite, parallele Bearbeiten-/Read-only-Inventarisierung, Diagnose-ZIP, Kategorieabschlussfix, Content-Script-Bootstrap und stille Healthchecks. Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1692 -->

<!-- KAR170-BEGIN:README:1323 -->
### Historical README: Inventarsuche, Sortierung und kompaktere Zeilen ab 1.7.0 (source line 1323)

Version 1.7.0 ergänzt die einspaltige Inventarliste um eine lokale Titelsuche sowie eine kombinierbare Sortierung nach **Name / Titel**, **Veröffentlichungsdatum / Anzeige vom**, **Endet am** und **Inventarisierungsdatum**. Für jedes Kriterium kann auf- oder absteigend sortiert werden. Datensätze ohne das jeweils benötigte Datum bleiben unabhängig von der Richtung gesammelt am Listenende. Die Standardsortierung ist weiterhin das Inventarisierungsdatum absteigend. Suche und Sortierung verändern ausschließlich die lokale Ansicht und lösen keine neue Inventarisierung aus.

Die kompakte Inventarzeile nutzt weniger Höhe: Labels wie **ANZEIGE VOM** bleiben einzeilig, und `Inventarisiert … · ID …` steht nun in der unteren Zeile rechts neben **Artikeldetails anzeigen**. Der Preis zeigt bei vorhandener gespeicherter Preisart konsequent Kurz- und Langform, z. B. `5 € · FP / Festpreis` oder `15 € · VB / Verhandlungsbasis`. Fehlt bei einem älteren Datensatz die Preisart, wird weiterhin nur der Betrag dargestellt.
<!-- KAR170-END:README:1323 -->

## v1.6.2

<!-- KAR170-BEGIN:CHANGELOG:1703 -->
### Original CHANGELOG: 1.6.2 – 2026-09-13 (source line 1703)

- UI-Hotfix für den stillen 5-Sekunden-Healthcheck: Bei bereits bestätigter gesunder Verbindung werden `pageReady` und die Aktionsbuttons nicht mehr vorsorglich zurückgesetzt. **Inventurlauf starten** bleibt dadurch während der Hintergrundprüfung durchgehend in seinem bestehenden Zustand und flackert nicht mehr kurz deaktiviert.
- Erst ein tatsächlich beobachteter Verlust von **Meine Anzeigen**, ein fehlender Kleinanzeigen-Tab oder ein terminaler Content-Script-/Message-Fehler deaktiviert die betroffenen Aktionen und löscht den Ready-State.
- Vordergrundprüfungen beim Initialisieren und beim Benutzer-Button **Aktualisieren** dürfen weiterhin kurz sperren; die Single-Flight-/5-Sekunden-Polling-Architektur aus 1.6.1 bleibt erhalten.
- Neuer dependency-freier v1.6.2-Vertragstest schützt den Button-/`pageReady`-Zustand bei gesunden Hintergrundprüfungen sowie die Deaktivierung bei echten Verlustzuständen.
<!-- KAR170-END:CHANGELOG:1703 -->

<!-- KAR170-BEGIN:README:1329 -->
### Historical README: Stabile Aktionsbuttons bei stillen Healthchecks ab 1.6.2 (source line 1329)

Version 1.6.2 erweitert den stillen 5-Sekunden-Healthcheck aus 1.6.1 auf die Interaktionszustände. Solange die zuletzt bestätigte Verbindung zu **Meine Anzeigen** gesund ist, setzt eine planmäßige Hintergrundprüfung `pageReady` nicht mehr vorsorglich auf `false` und deaktiviert **Inventurlauf starten** nicht mehr kurzzeitig. Der bestehende Button-Zustand bleibt während des Healthchecks unverändert. Erst wenn die Prüfung tatsächlich feststellt, dass **Meine Anzeigen** nicht mehr geöffnet ist, kein Tab mehr vorhanden ist oder die Content-Script-Verbindung terminal fehlschlägt, werden Ready-State und Aktionen deaktiviert. Initialisierung und ein ausdrücklich vom Benutzer ausgelöstes **Aktualisieren** dürfen weiterhin als Vordergrundprüfung temporär sperren.
<!-- KAR170-END:README:1329 -->

## v1.6.1

<!-- KAR170-BEGIN:CHANGELOG:1710 -->
### Original CHANGELOG: 1.6.1 – 2026-09-13 (source line 1710)

- UI-Status-Flackern bei gesundem Kleinanzeigen-Handshake behoben: Der planmäßige 5-Sekunden-Healthcheck läuft jetzt still im Hintergrund, solange die zuletzt bestätigte Content-Script-Verbindung gesund ist.
- `Extension-Verbindung wird hergestellt` wird nur noch beim initialen/ausdrücklichen Vordergrund-Check oder nach einem echten Verbindungsverlust angezeigt.
- Ein erfolgreicher Hintergrund-Healthcheck überschreibt den bestehenden sichtbaren Ready-/Aktionsstatus nicht mehr alle fünf Sekunden.
- Bei terminalem Verbindungsfehler wird der Healthy-State zurückgesetzt; der nächste Wiederverbindungsversuch darf den Verbindungsaufbau wieder sichtbar anzeigen.
- Initialisierung und der Benutzer-Button **Aktualisieren** bleiben bewusste Vordergrundprüfungen und liefern weiterhin direktes sichtbares Verbindungsfeedback.
- Alle v1.6.0-Funktionen, Profil-Prerequisite, parallele Zwei-Quellen-Inventarisierung, Diagnose-ZIP und Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.
- Neuer dependency-freier v1.6.1-Vertragstest deckt Silent-Healthcheck, Verlust-/Recovery-Semantik und Vordergrundprüfungen ab.
<!-- KAR170-END:CHANGELOG:1710 -->

<!-- KAR170-BEGIN:README:1333 -->
### Historical README: Stiller Verbindungs-Healthcheck ab 1.6.1 (source line 1333)

Version 1.6.1 verhindert das sichtbare Statusflackern des regelmäßigen Verbindungs-Healthchecks. Solange die letzte Prüfung die Content-Script-Verbindung als gesund bestätigt hat, läuft die nächste planmäßige Prüfung im Hintergrund und lässt den sichtbaren App-Status unverändert. **Extension-Verbindung wird hergestellt** erscheint weiterhin beim initialen Start, beim ausdrücklichen Benutzer-Refresh oder nachdem ein echter Verbindungsfehler den Healthy-State zurückgesetzt hat.
<!-- KAR170-END:README:1333 -->

## v1.6.0

<!-- KAR170-BEGIN:CHANGELOG:1720 -->
### Original CHANGELOG: 1.6.0 – 2026-09-13 (source line 1720)

- Vollinventur pro Anzeige um eine parallele zweite Quelle erweitert: Bearbeiten-Worker und öffentliche Read-only-Detailseite werden gleichzeitig geöffnet. Die Bearbeiten-Seite bleibt maßgeblich für Formularwerte, dynamische Merkmale und Bilder; die Read-only-Seite liefert ergänzende Metadaten.
- Read-only-Metadaten erfassen im eingeloggten Zustand eigener Anzeigen getrennt **Endet am** (`listingMeta.endDateDisplay/endDateIso`) und das sichtbare **Anzeige vom**-Datum (`listingMeta.listingDateDisplay/listingDateIso`). Zusammenführung erfolgt ausschließlich bei passender stabiler Anzeigen-ID. Ein Read-only-Timeout/Fehler bricht die primäre Inventarisierung nicht ab.
- Die Einzelaktion **Aktualisieren** verwendet denselben parallelen Zwei-Quellen-Ansatz. Der lokale Datensatz wird weiterhin erst nach erfolgreicher Bearbeiten-Inventur atomar ersetzt; bei temporär fehlender Read-only-Quelle bleiben vorhandene Datumswerte erhalten.
- Falls das aus „Meine Anzeigen“ bekannte Ablaufdatum vom Read-only-Wert abweicht, wird die Abweichung diagnostisch protokolliert und der aktuelle Read-only-Wert als ergänzende Quelle übernommen.
- Prerequisite für das spätere **PROFIL-MANAGEMENT** implementiert: Auf `m-meine-anzeigen.html?tab=PROJECTS` wird `angemeldet als: <Profilname>` erkannt und lokal einem stabilen Profilobjekt mit eigener `profileId` zugeordnet.
- Bestehende profilneutrale Altinventare werden niemals automatisch migriert. Bei erkanntem Profil fragt die App ausdrücklich unter Nennung des erkannten Profilnamens, ob die bestehende Inventarliste diesem Profil zugeordnet werden soll. Nur nach Bestätigung werden unprofilierte Datensätze verlustfrei zugeordnet; Ablehnung lässt sie unverändert.
- Neue Vollinventur-Datensätze tragen bei erkanntem Profil direkt `profileId/profileName`; manuelle Einzelinventarisierung übernimmt das aktuell erkannte Profil, manuelles **Aktualisieren** bewahrt die bestehende Profilzuordnung. Vollständiger Profil-Umschalter/Löschverwaltung ist bewusst noch nicht Bestandteil dieser Version.
- Inventarliste und Artikeldetails zeigen zusätzlich **Anzeige vom**. Die Diagnose-Inventarübersicht enthält das neue Metadatum ebenfalls.
- `summary.txt` im Diagnose-ZIP trennt aktuelle Diagnose-Session bzw. aktuellsten korrelierten Run/Fill von historischen Retention-Ereignissen. Historische Logs bleiben erhalten, dominieren aber nicht mehr unkommentiert die aktuelle Fehlerzusammenfassung.
- Neue dependency-freie v1.6.0-Vertragstests und ein isolierter Read-only-Metadaten-Test decken parallele Worker, Datumsmerge, Profilbestätigung/Migration, Diagnose-Trennung und Publish-Sicherheitsgrenzen ab.
- Publish-/Delete-Sicherheitsgrenzen bleiben unverändert: kein automatischer Klick auf `Anzeige aufgeben`, kein Publish-`submit()`/`requestSubmit()` und keine automatische Änderung oder Löschung einer Kleinanzeigen-Anzeige.
<!-- KAR170-END:CHANGELOG:1720 -->

<!-- KAR170-BEGIN:README:1337 -->
### Historical README: Parallele Metadaten, Profil-Prerequisite und Diagnose ab 1.6.0 (source line 1337)

Version 1.6.0 erweitert die Inventarisierung pro Anzeige um eine zweite, ergänzende Quelle. Während die **Bearbeiten-Seite** weiterhin die maßgebliche Quelle für Formularwerte, dynamische Merkmale und lokale Bilder bleibt, kann gleichzeitig die öffentliche **Read-only-Detailseite** derselben Anzeige in einem zweiten inaktiven Worker-Tab verarbeitet werden. Beide Ergebnisse werden ausschließlich über die stabile Anzeigen-ID zusammengeführt.

Im eingeloggten Zustand eigener Anzeigen liest die Read-only-Seite zwei getrennte Datumswerte: **Endet am** aus dem Bereich „Deine Anzeige“ sowie das im öffentlichen Anzeigenbereich sichtbare **Anzeige vom**-Datum. Gespeichert werden jeweils Anzeige- und ISO-Wert in `listingMeta`. Ein Fehler oder Timeout der Read-only-Seite lässt die primäre Inventarisierung über die Bearbeiten-Seite weiterlaufen. Bei der Einzelaktion **Aktualisieren** gilt derselbe parallele Zwei-Quellen-Ablauf; bereits gespeicherte Datumswerte bleiben erhalten, falls die ergänzende Quelle vorübergehend nicht verfügbar ist.

Als technische Voraussetzung für das spätere **PROFIL-MANAGEMENT** erkennt die Extension auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` den sichtbaren Headerwert `angemeldet als: <Profilname>`. Daraus wird lokal ein Profilobjekt mit stabiler interner `profileId` erzeugt. Existieren ältere Inventareinträge ohne Profilbezug, erfolgt **keine stille Migration**: Die App nennt den konkret erkannten Profilnamen und fragt ausdrücklich, ob die bestehende profilneutrale Inventarliste diesem Profil zugeordnet werden soll. Nur nach Bestätigung werden die bestehenden Datensätze verlustfrei zugeordnet; Ablehnung lässt sie unverändert. Das vollständige Mehrprofil-Management mit Umschalter/Löschen ist noch nicht Bestandteil von 1.6.0.

Die Diagnose-Zusammenfassung trennt außerdem Ereignisse der aktuellen Diagnose-Session beziehungsweise des aktuellsten korrelierten Runs/Fills von älteren Ereignissen im Retention-Puffer. Dadurch kann ein aktueller erfolgreicher Lauf klar `0` Warnungen/Fehler ausweisen, auch wenn historische Verbindungswarnungen weiterhin im Diagnose-ZIP enthalten bleiben.
<!-- KAR170-END:README:1337 -->

## v1.5.1

<!-- KAR170-BEGIN:CHANGELOG:1734 -->
### Original CHANGELOG: 1.5.1 – 2026-09-13 (source line 1734)

- Legacy-Kategorieassistent korrigiert: Nach jeder finalen Kategorieauswahl wird nicht mehr automatisch angenommen, dass der Leaf-Klick selbst navigiert. Der Filler wartet mindestens die bestehende 100-ms-Aktionspause und prüft anschließend explizit auf Navigation, weitere Pflichtmerkmale oder einen sichtbaren aktiven **Weiter**-Button.
- Bestätigter zweistufiger Fall `Haus & Garten → Weiteres Haus & Garten` wird damit nach Auswahl des finalen Leafs über `category-continuing` und **Weiter** zu den Anzeigendetails fortgesetzt.
- Derselbe Abschluss-Gate gilt nun auch für final als Parent klassifizierte Pfadknoten; vorhandene zusätzliche Wizard-Pflichtmerkmale werden weiterhin zuerst exakt aus der Vorlage gewählt und erst danach **Weiter** betätigt.
- Wenn nach der finalen Auswahl weder Navigation noch Pflichtmerkmal noch **Weiter** verfügbar wird, bricht der Lauf mit einer klaren Fehlermeldung ab, statt dauerhaft in `category-leaf-selected` zu verbleiben.
- Neue dependency-freie Regressionstests decken den zweistufigen Leaf+Weiter-Fall sowie den bestehenden mehrstufigen Pflichtmerkmal+Weiter-Ablauf ab. Alle Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1734 -->

<!-- KAR170-BEGIN:README:1348 -->
### Historical README: Kategorieabschluss-Fix ab 1.5.1 (source line 1348)

Version 1.5.1 korrigiert den Legacy-Kategorieassistenten für finale Kategorien, deren Auswahl nicht automatisch zu den Anzeigendetails navigiert. Nach **jeder finalen Kategorieauswahl** wartet der Filler mindestens die bestehende 100-ms-Aktionspause und prüft anschließend explizit, ob Kleinanzeigen bereits navigiert hat, ob weitere erforderliche Wizard-Merkmale erschienen sind oder ob der sichtbare Button **Weiter** betätigt werden muss.

Damit wird insbesondere der bestätigte zweistufige Fall `Haus & Garten → Weiteres Haus & Garten` korrekt abgeschlossen. Der bestehende mehrstufige Flow mit zusätzlichen Pflichtmerkmalen bleibt erhalten und wird weiterhin vor dem finalen **Weiter** abgearbeitet. Bleibt die Seite nach der finalen Auswahl ohne Navigation, Pflichtmerkmal oder **Weiter**, endet der Lauf nun mit einer klaren Fehlermeldung statt im Status `category-leaf-selected` hängen zu bleiben.
<!-- KAR170-END:README:1348 -->

## v1.5.0

<!-- KAR170-BEGIN:CHANGELOG:1742 -->
### Original CHANGELOG: 1.5.0 – 2026-09-13 (source line 1742)

- App→Kleinanzeigen-Verbindung grundlegend robuster: Bei `Could not establish connection. Receiving end does not exist.` wird nicht mehr nur derselbe `sendMessage`-Aufruf wiederholt. Der Zieltab wird validiert, das Content-Script-Paket bei Bedarf über `chrome.scripting.executeScript` idempotent nachinjiziert und anschließend über `KR_CONTENT_READY` vollständig auf Image/Form/Template/Inventory-Module geprüft. Dafür kommt ausschließlich die Manifest-Berechtigung `scripting` hinzu; Host-Rechte und feste Extension-ID bleiben unverändert.
- Die App-Statusprüfung ist jetzt **single-flight**. Das frühere 5-Sekunden-`setInterval` wurde durch ein `setTimeout`-Polling ersetzt, das erst nach Abschluss der vorherigen Prüfung erneut startet. Dadurch können keine parallelen Retry-/Handshake-Ketten mehr entstehen. Transiente Einzelversuche werden nicht mehr als Warnungsflut geloggt; Diagnose unterscheidet Bootstrap-Start, Erfolg und terminalen Fehlschlag.
- Manuelles **Aktualisieren** protokolliert `USER_REFRESH_SUCCEEDED` nur noch nach tatsächlich erfolgreichem Content-Handshake. Die UI unterscheidet jetzt zwischen „Extension-Verbindung wird hergestellt“ und einem terminalen „Content Script nicht verbunden“, statt einen fehlenden Receiver als unerreichbare Kleinanzeigen-Seite zu bezeichnen.
- Die alten manuellen Diagnoseoberflächen **Bilddiagnose der aktuellen Seite kopieren**, **Formular- und Bilddiagnose kopieren** sowie die sichtbare Roh-JSON-Ausgabe wurden entfernt. Der strukturierte persistente Log bleibt erhalten; Nutzerweg ist ausschließlich **Diagnose-ZIP herunterladen**.
- Jede Inventarzeile besitzt zwischen **Neu inserieren** und **Löschen** die neue Aktion **Aktualisieren**. Sie öffnet ausschließlich für diese Anzeigen-ID einen inaktiven Bearbeiten-Worker, inventarisiert Formular, dynamische Attribute und Bilder neu und ersetzt den lokalen Datensatz erst nach vollständig erfolgreichem atomarem Commit. Bei einem Fehler bleibt der bisherige Inventarstand unverändert. Bereits bekanntes Enddatum bleibt erhalten, falls es auf der Bearbeiten-Seite nicht erneut verfügbar ist.
- Ein Klick auf die nicht-interaktive Fläche einer Inventarzeile öffnet die zugehörige Anzeige im Bearbeiten-Modus. Buttons, Links, `Artikeldetails anzeigen` und die komplette aufgeklappte Detailansicht sind ausdrücklich vom Karten-Klick ausgenommen. Dezenter Hover-/Fokuszustand kennzeichnet die Zeile als klickbar.
- Bestehende Sicherheitsgrenzen unverändert: keine automatische Veröffentlichung, kein Klick auf `Anzeige aufgeben`, kein Publish-`submit()`/`requestSubmit()` und keine Änderung/Löschung von Kleinanzeigen-Anzeigen durch Inventaraktionen.
- Bekannte Einschränkung bleibt bewusst bestehen: Der alte In-Page-Feedback-Zähler auf „Meine Anzeigen“ kann nach erfolgreichem Einzel-Retry noch einen veralteten Fehlerstand anzeigen; maßgeblich sind App-Fehlerliste und persistenter Run-State.
<!-- KAR170-END:CHANGELOG:1742 -->

<!-- KAR170-BEGIN:README:1354 -->
### Historical README: Verbindungs-Bootstrap und Inventar-Aktualisierung ab 1.5.0 (source line 1354)

Version 1.5.0 ersetzt den bisherigen reinen Message-Retry durch einen expliziten Content-Script-Handshake. Wenn ein Kleinanzeigen-Tab `Receiving end does not exist` meldet, prüft der Hintergrunddienst den Zieltab und injiziert das vollständige Content-Script-Paket bei Bedarf idempotent über `chrome.scripting`. Erst wenn `KR_CONTENT_READY` alle benötigten Module bestätigt, führt die App `PAGE_STATUS` oder weitere Seitenaktionen aus. Die Statusprüfung ist single-flight und plant die nächste Prüfung erst nach Abschluss der vorherigen; überlappende Retry-Schleifen sind damit ausgeschlossen.

Die Diagnoseoberfläche ist reduziert: Die früheren Kopierfunktionen für Bild-/Formulardiagnose und die sichtbare Roh-JSON-Ausgabe sind entfernt. Der persistente strukturierte Eventlog bleibt erhalten und wird ausschließlich über **Diagnose-ZIP herunterladen** exportiert.

In jeder Inventarzeile steht jetzt **Neu inserieren → Aktualisieren → Löschen**. **Aktualisieren** inventarisiert ausschließlich die gewählte Anzeige im Bearbeiten-Modus neu. Erst wenn Formular, Merkmale und Bilder vollständig gespeichert wurden, ersetzt der atomare Commit den vorhandenen lokalen Datensatz; bei Fehler bleibt der bisherige Stand erhalten. Ein bekanntes `Endet am`-Datum wird beim manuellen Update bewahrt, falls die Bearbeiten-Seite selbst kein neues Enddatum liefert.

Die nicht-interaktive Fläche einer Inventarzeile öffnet die Anzeige direkt im Bearbeiten-Modus. Aktionen, Links und die komplette aufklappbare Detailansicht lösen diesen Karten-Klick nicht aus.
<!-- KAR170-END:README:1354 -->

## v1.4.0

<!-- KAR170-BEGIN:CHANGELOG:1753 -->
### Original CHANGELOG: 1.4.0 – 2026-09-13 (source line 1753)

- Diagnose-/Loggingarchitektur erweitert: automatische Abläufe und Benutzeraktionen innerhalb der App werden als strukturierte, persistent begrenzte Ereignisse mit Zeit, Severity, Modul/Operation und verfügbaren Run-/Fill-/Anzeigen-/Tab-IDs protokolliert.
- Neue Aktion **Diagnose-ZIP herunterladen**. Export enthält `summary.txt`, `diagnostics.jsonl`, `errors.json`, aktuellen Bulk-Run-State, Fill-Sessions, datensparsame Inventar-Metadaten und Umgebungs-/Versionsdaten. CSRF-/Cookie-/Passwort-/Tokenwerte werden redigiert, URL-Queryparameter entfernt und vollständige Beschreibungs-/Kontaktwerte nicht exportiert.
- Verbindungsaufbau vom eigenen App-Fenster zu Kleinanzeigen-Tabs robuster: transiente `Could not establish connection. Receiving end does not exist.`-/Message-Port-Fehler werden mit begrenztem Retry/Backoff erneut versucht und diagnostisch erfasst.
- Inventarliste auf einspaltige Listenansicht umgestellt; breite Artikelzeilen bilden die Grundlage für spätere Filter-/Sortierfunktionen.
- Der Vollinventurlauf liest pro Anzeigenkarte zusätzlich das sichtbare `Endet am DD.MM.YYYY`, ordnet es über die stabile Anzeigen-ID dem Worker zu, speichert es als Listen-Metadatum und zeigt es in der Inventarliste sowie den Artikeldetails.
- `normalizeText is not defined` im Komfort-Scroll nach erfolgreichem Template-Fill behoben: `scrollToPublishButton()` nutzt die vorhandenen Helper `clean(...)` und `visible(...)`. Der Scroll ist vom fachlichen Fill-Abschluss entkoppelt; ein Scrollfehler wird nur noch als Warnung protokolliert und kann einen bereits verifizierten Erfolg nicht mehr in `error` umstufen.
- Bekannte Einschränkung: Der bereits beobachtete veraltete In-Page-Feedback-Zähler nach einem erfolgreichen Einzel-Retry wird in 1.4.0 bewusst noch nicht geändert; App-Fehlerliste und persistenter Run-State bleiben dafür die maßgebliche Anzeige.
- Publish-/Delete-Sicherheitsgrenzen unverändert: kein automatischer Klick auf `Anzeige aufgeben`, kein Publish-`submit()`/`requestSubmit()` und keine Änderung/Löschung von Kleinanzeigen-Anzeigen.
<!-- KAR170-END:CHANGELOG:1753 -->

<!-- KAR170-BEGIN:README:1364 -->
### Historical README: Diagnose, Listenansicht und Robustheit ab 1.4.0 (source line 1364)

Version 1.4.0 erweitert die Diagnose grundlegend. Automatische Abläufe wie Vollinventur, Paging, Worker-Tabs, Einzelinventarisierung, Template-Fill, Bildübernahme, Verifikation und Einzel-Retry erzeugen strukturierte Diagnoseereignisse. Benutzeraktionen innerhalb der Extension-App werden ebenfalls als Aktionen mit Zeitpunkt, Ergebnis und relevanten Anzeigen-/Run-IDs protokolliert. Die Diagnosehistorie wird begrenzt und persistent in `chrome.storage.local` gehalten, damit Service-Worker-Restarts oder das Schließen des App-Fensters den relevanten Ablauf nicht verlieren.

Unter **Diagnose** steht **Diagnose-ZIP herunterladen** zur Verfügung. Das ZIP enthält `summary.txt`, `diagnostics.jsonl`, `errors.json`, `bulk-run.json`, `fill-sessions.json`, `inventory-summary.json` und `environment.json`. CSRF-, Cookie-, Passwort-, Autorisierungs- und Tokenwerte werden redigiert, URL-Queryparameter entfernt und vollständige Beschreibungs-/Kontaktwerte nicht in den Export aufgenommen.

Die App wartet bei vorübergehend nicht erreichbaren Kleinanzeigen-Content-Scripts mit begrenztem Retry/Backoff, statt `Could not establish connection. Receiving end does not exist.` sofort als endgültigen Seitenfehler zu behandeln. Verbindungsversuche und Erholung werden diagnostisch protokolliert.

Die Inventarliste ist nun einspaltig. Jeder Artikel nutzt die verfügbare Breite als Listenzeile und zeigt Titelbild, Titel, Kategorie, Art, Preis und das beim Vollinventurlauf aus **Meine Anzeigen** übernommene sichtbare Datum **Endet am DD.MM.YYYY**. Die einspaltige Struktur ist die Basis für spätere Filter- und Sortierfunktionen.

Außerdem ist der Scroll-zum-`Anzeige aufgeben`-Schritt korrigiert: Er verwendet die vorhandenen Helper des Template-Fillers. Ein reiner Scrollfehler kann einen bereits vollständig verifizierten Fill nicht mehr nachträglich auf Fehler setzen; er wird nur als Diagnosewarnung erfasst.

Bekannte Einschränkung in 1.4.0: Der kleine In-Page-Feedback-Overlay auf „Meine Anzeigen“ kann nach einem erfolgreichen Einzel-Retry noch den alten Fehlerzähler zeigen. Dieser Darstellungsfehler ist bewusst nicht Teil dieses Builds; die Fehlerliste im App-Fenster und der persistente Run-State sind maßgeblich.
<!-- KAR170-END:README:1364 -->

## v1.3.0

<!-- KAR170-BEGIN:CHANGELOG:1764 -->
### Original CHANGELOG: 1.3.0 – 2026-09-13 (source line 1764)

- Inventarverwaltung aus dem schmalen Toolbar-Popup in ein eigenes, frei skalierbares Chrome-App-Fenster verlagert. Der Launcher öffnet bzw. fokussiert ein bestehendes Fenster statt Duplikate zu erzeugen; Startgröße 1180×860.
- Große App-Ansicht mit Vollinventur-Steuerung, kompakter Inventarliste, Artikeldetails, Diagnose und ausführlichem Fehlerbereich. Bestehende Aktionen **Neu inserieren**, **Löschen**, **Artikeldetails anzeigen** und **Inventarliste leeren** bleiben erhalten.
- Fehler aus einem Vollinventurlauf werden mit Titel, Anzeigen-ID und konkretem Fehlergrund sichtbar dargestellt. Pro Fehler gibt es **Erneut versuchen** für eine gezielte Einzelinventarisierung ohne Neustart des gesamten Laufs.
- Einzel-Retry öffnet nur den Bearbeiten-Worker für die betroffene stabile Anzeigen-ID. Erfolg entfernt den Fehler, übernimmt den Artikel in die Inventarliste und korrigiert `failedCount`/`successCount`; erneuter Fehlschlag aktualisiert Fehlergrund und Retry-Zeitpunkt. Gleichzeitige Retries sowie lokale Lösch-/Clear-Aktionen während eines Retry sind gesperrt.
- Fehlgeschlagene Anzeigen werden auf **Meine Anzeigen** anhand ihrer Anzeigen-ID mit transparent-rotem Hintergrund markiert. Die Markierung wird aus dem persistenten Run-State wiederhergestellt und über Paging hinweg aktualisiert; direkt an der Karte steht ebenfalls ein Retry-Button zur Verfügung.
- Die feste Extension-ID, Berechtigungen, Vollinventur-Workerlogik, lokale JPEG-Sicherung, Neu-inserieren-Flow, Scroll zum Veröffentlichungsbutton und die Sicherheitsgrenze ohne automatische Veröffentlichung/Löschung bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1764 -->

<!-- KAR170-BEGIN:README:1378 -->
### Historical README: Eigenes App-Fenster und Fehler-Retry ab 1.3.0 (source line 1378)

Die Toolbar öffnet nur noch einen kompakten Launcher. Die eigentliche Inventarverwaltung läuft in einem eigenen Chrome-App-Fenster (`app.html`), das mit 1180×860 Pixeln startet, frei skalierbar ist und beim erneuten Öffnen fokussiert statt dupliziert wird. Dadurch stehen Vollinventur, Fehlerliste, Artikeldetails, Diagnose und große Inventaransichten gleichzeitig zur Verfügung.

Fehler aus einem abgeschlossenen Vollinventurlauf werden jetzt mit Titel, Anzeigen-ID und konkretem Fehlergrund im App-Fenster angezeigt. Jede fehlgeschlagene Anzeige kann über **Erneut versuchen** einzeln neu inventarisiert werden. Der Retry öffnet ausschließlich für diese stabile Anzeigen-ID einen neuen inaktiven Bearbeiten-Worker-Tab. Bei Erfolg wird der Fehlerstatus entfernt, der Artikel normal gespeichert und die Laufstatistik konsistent von Fehler auf Erfolg umgebucht; bei erneutem Fehlschlag werden Fehlergrund und Retry-Zeitpunkt aktualisiert. Parallel laufende Retries werden verhindert.

Auf der ursprünglichen Seite **Meine Anzeigen** werden fehlgeschlagene Anzeigenkarten anhand ihrer stabilen Anzeigen-ID dezent transparent rot markiert. Die Markierung wird aus dem persistenten Bulk-Run-State wiederhergestellt und enthält zusätzlich eine direkte Aktion **Inventarisierung erneut versuchen**. Beim Paging wird die aktuelle Seite regelmäßig gegen den Fehlerzustand abgeglichen. Ein erfolgreicher Retry entfernt die Markierung automatisch.
<!-- KAR170-END:README:1378 -->

## v1.2.0

<!-- KAR170-BEGIN:CHANGELOG:1773 -->
### Original CHANGELOG: 1.2.0 – 2026-09-13 (source line 1773)

- Vollinventur auf `m-meine-anzeigen.html?tab=PROJECTS`: Soll-Gesamtzahl aus `N Anzeigen online / ... gesamt` lesen und alle eigenen laufenden Anzeigen über sämtliche Paging-Seiten sequenziell abarbeiten.
- Paging orientiert sich an der realen Navigation mit `aria-current="page"` und `aria-label="Nächste"`; keine fest codierte Seitenzahl. Anzeigen werden anhand stabiler Anzeigen-IDs dedupliziert.
- Jede Anzeige wird in einem separaten inaktiven Bearbeiten-Worker-Tab geöffnet, mit der bestehenden Einzelinventarisierung inklusive großer lokaler JPEGs gespeichert und danach wieder geschlossen. Erst erfolgreiche Einzelinventarisierungen erscheinen in der Inventarliste; Fehler werden positions-/anzeigenbezogen im Laufstatus geführt.
- Persistenter Bulk-Run-State mit erwarteter Gesamtzahl, aktueller Seite, bereits verarbeiteten IDs, Erfolgen/Fehlern, aktuellem Worker und Diagnose. Bei Quell-Tab-Schließen, Seitenwechselproblemen oder Count-Mismatch endet der Lauf mit Prüfstatus.
- Fortschrittsanzeige auf `Meine Anzeigen` und im Popup, z. B. `12/66 Anzeigen abgearbeitet`, inklusive Seite und aktuellem Titel. Abschluss nur, wenn erfolgreich + fehlgeschlagen exakt der erkannten Online-Anzeigenzahl entspricht.
- Neue Aktion **Inventarliste leeren** mit Bestätigung; löscht ausschließlich lokale Inventardaten und lokale Bilder. Einzelne Inventareinträge können ebenfalls lokal über **Löschen** entfernt werden. Keine Kleinanzeigen-Anzeige wird dadurch verändert oder gelöscht.
- Inventarliste kompakter: Titelbild, Titel, Kategorie, Art, Preis; Aktionen **Neu inserieren**, **Löschen** und die umbenannte Detailfunktion **Artikeldetails anzeigen**. Detailansicht behält vollständige Artikeldaten und Bilddetails.
- Nach vollständig erfolgreicher Vorbefüllung wird zum sichtbaren Button `Anzeige aufgeben` gescrollt; der Button wird weiterhin niemals automatisch geklickt.
- Bestehende Einzelinventarisierung, sequenzieller Bild-Upload, Marken-Autocomplete, Zustandsbestätigung, Kategorieassistent und Publish-Sicherheitsgrenze bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1773 -->

<!-- KAR170-BEGIN:README:1386 -->
### Historical README: Vollinventur aller laufenden Anzeigen ab 1.2.0 (source line 1386)

Auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` steht jetzt **Inventurlauf starten** bereit. Der Lauf liest die sichtbare Sollzahl `N Anzeigen online`, verarbeitet die Anzeigen sequentiell über alle Paging-Seiten und öffnet jede eigene Anzeige einzeln in einem inaktiven Bearbeiten-Worker-Tab. Dort wird die bewährte Einzelinventarisierung inklusive dynamischer Merkmale und großer lokaler JPEGs ausgeführt; danach wird der Worker-Tab geschlossen und der nächste Artikel verarbeitet.

Die Seitennavigation wird über die reale Struktur mit `aria-current="page"` und `aria-label="Nächste"` verfolgt. Anzeigen werden anhand stabiler Anzeigen-IDs dedupliziert. Der Lauf gilt nur dann als vollständig, wenn die Zahl aller erfolgreich oder mit Fehlerstatus abgearbeiteten eindeutigen Anzeigen mit der erkannten Zahl `Anzeigen online` übereinstimmt. Bei Abweichungen endet der Lauf mit einem Prüfstatus statt mit einem falschen Erfolg. Ein Statuspanel auf der Seite sowie das Popup zeigen Gesamtfortschritt, aktuelle Seite und aktuellen Titel.

Die Inventarliste ist kompakter aufgebaut und zeigt Titelbild, Titel, Kategorie, Art und Preis. Pro Artikel stehen **Neu inserieren**, **Löschen** (nur lokal) und **Artikeldetails anzeigen** zur Verfügung. `Artikeldetails anzeigen` enthält weiterhin die vollständigen inventarisierten Daten und Bilddetails. **Inventarliste leeren** löscht nach Bestätigung ausschließlich lokale Inventardaten und die zugehörigen lokalen Bilder; durch diese lokalen Aktionen wird keine Kleinanzeigen-Anzeige gelöscht. Der separat abgesicherte Renewal-Workflow kann eine alte Quellanzeige erst nach verifizierter Neuerstellung und unabhängiger Löschverifikation entfernen.

Beim manuellen bzw. Template-only-Neuinserieren scrollt die Extension nach vollständig erfolgreicher Vorbefüllung zum sichtbaren Button **Anzeige aufgeben** bzw. ans Seitenende; dieser Ablauf bleibt manuell. Im Renewal-Workflow darf der finale sichtbare Publish-Button seit v1.8.2 ausschließlich nach bestandenem vollständigem Hard-Gate automatisch geklickt werden; bei fehlender oder mehrdeutiger Freigabe pausiert der Ablauf für die manuelle Prüfung.
<!-- KAR170-END:README:1386 -->

## v1.1.6

<!-- KAR170-BEGIN:CHANGELOG:1785 -->
### Original CHANGELOG: 1.1.6 – 2026-09-13 (source line 1785)

- Bildübernahme auf strikt sequenziellen Ablauf umgestellt: jedes lokale JPEG wird einzeln an Kleinanzeigen übergeben; das nächste Bild beginnt erst nach serverseitiger Anlage und terminaler Vorschau des vorherigen Bildes.
- Pro Bild expliziter Lifecycle `pending -> server-created -> cdn-loaded | blob-fallback | failed`; serverseitige Anlage und visuelle Vorschau werden getrennt verifiziert.
- CDN-Vorschauen benötigen erfolgreiche Dekodierung plus 500-ms-Stabilitätsphase ohne erneute `src`-/`srcset`-Mutation oder Ladefehler. Einmal stabile Bilder werden nicht mehr verändert.
- Defekte CDN-Vorschauen werden pro Bild höchstens einmal erneut angestoßen. Falls weiterhin nötig, wird der lokale JPEG-Blob genau einmal als sichtbarer Fallback gesetzt und danach nicht wieder auf CDN zurückgeschaltet.
- Feedback-Popover zeigt den Fortschritt pro Bild (`Bild 1/5 wird hochgeladen`, `... Vorschau wird geprüft`, `... erfolgreich übernommen`) und benennt Bildfehler positionsgenau.
- `Vorlage vollständig übernommen` wird erst nach gemeinsamem Abschluss-Gate angezeigt: alle kontrollierten Formularwerte korrekt, alle erwarteten Server-Bilder vorhanden und sämtliche Thumbnails stabil terminal.
- Marken-Autocomplete, Zustands-`Bestätigen`, Kategorieassistent mit 100-ms-Taktung, Ignorieren konkreter Versandmethoden/-größen und Publish-Sicherheitsgrenze bleiben unverändert.
<!-- KAR170-END:CHANGELOG:1785 -->

<!-- KAR170-BEGIN:README:1515 -->
### Historical README: Sequenzieller Bild-Upload und Abschluss-Gate ab 1.1.6 (source line 1515)

Bilder werden beim Vorbefüllen nicht mehr als kompletter Mehrfachsatz gleichzeitig
angestoßen, sondern strikt in der gespeicherten Reihenfolge **einzeln** verarbeitet.
Bild 2 beginnt erst, nachdem Bild 1 serverseitig angelegt und seine Vorschau in einen
terminalen Zustand überführt wurde; entsprechend gilt dies für alle weiteren Bilder.
Der Seitenstatus zeigt den Fortschritt als `Bild 1/5 wird hochgeladen …`,
`Bild 1/5 hochgeladen – Vorschau wird geprüft …` und
`Bild 1/5 erfolgreich übernommen`.

Pro Bild wird zwischen serverseitiger Anlage und sichtbarer Vorschau unterschieden.
Eine CDN-Vorschau gilt erst als stabil, wenn das `img` erfolgreich dekodiert ist
(`complete`, `naturalWidth > 0`, `naturalHeight > 0`) und anschließend für mindestens
500 ms keine erneute `src`-/`srcset`-Mutation und kein Ladefehler auftritt. Bereits
stabile Vorschaubilder werden nicht mehr angefasst. Nur weiterhin defekte CDN-Previews
dürfen höchstens einmal neu angestoßen werden. Bleibt die CDN-Vorschau defekt, wird
für dieses Bild genau einmal die identische lokale JPEG-Datei als `blob:`-Vorschau
gesetzt und danach nicht wieder auf CDN zurückgeschaltet. Der serverseitige
Kleinanzeigen-Bildzustand bleibt dabei unverändert.

Der positive Feedback-Zustand **„Vorlage vollständig übernommen“** ist ab 1.1.6 ein
gemeinsames Abschluss-Gate für Formular und Bilder. Er erscheint erst, wenn alle
kontrollierten Formularwerte stimmen, die erwartete Zahl serverseitiger Bildobjekte
vorhanden ist und jedes erwartete Thumbnail einen stabilen terminalen Zustand
`cdn-loaded` oder `blob-fallback` erreicht hat. Solange ein Bild noch hochgeladen,
geprüft, erneut versucht oder auf Fallback umgestellt wird, wird kein positiver
Abschluss angezeigt.
<!-- KAR170-END:README:1515 -->

## v1.1.5

<!-- KAR170-BEGIN:CHANGELOG:1795 -->
### Original CHANGELOG: 1.1.5 – 2026-09-13 (source line 1795)

- Suchbare Comboboxen wie `Marke` werden benutzerähnlich bedient: fokussieren/leeren, schrittweise Eingabe mit `beforeinput`/`input` plus Tastaturereignissen, kurze Debounce-Wartezeit und exakte Auswahl aus der tatsächlich gerenderten Vorschlagsliste. Falls die Liste nicht automatisch öffnet, fordert ein `ArrowDown`-Signal sie an; es wird weiterhin nie nach Position geraten.
- Bild-Upload gilt nicht mehr allein wegen vorhandener `adImages[n].url`-Einträge als visuell abgeschlossen. Zusätzlich werden die erwarteten Kleinanzeigen-Preview-Images auf `complete && naturalWidth > 0 && naturalHeight > 0` geprüft.
- Noch nicht verfügbare signierte CDN-Vorschauen werden für einen begrenzten Zeitraum erneut geladen. Wenn Kleinanzeigen die Server-Bildobjekte bereits angelegt hat, die CDN-Vorschau aber weiterhin defekt bleibt, werden ausschließlich die sichtbaren Thumbnail-`img`-Elemente temporär auf die identischen lokalen JPEG-Dateien umgebogen. Der serverseitige Formular-/Bildzustand bleibt unverändert.
- Konkrete Versandmethoden/Paketgrößen bleiben weiterhin unberücksichtigt; Zustand-`Bestätigen`, Kategorieassistent, 100-ms-Taktung, automatische Legacy-`Weiter`-Fortsetzung und Publish-Sicherheitsgrenze bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1795 -->

<!-- KAR170-BEGIN:README:1496 -->
### Historical README: Autocomplete- und Bildvorschau-Robustheit ab 1.1.5 (source line 1496)

Suchbare Auswahlfelder wie **Marke** werden jetzt benutzerähnlicher bedient: Das Feld
wird fokussiert und geleert, der sichtbare Vorlagenwert wird schrittweise mit
`beforeinput`-/`input`- und Tastaturereignissen eingegeben und erst nach tatsächlich
gerenderter Vorschlagsliste wird der exakt passende Eintrag gewählt. Falls die Liste
nicht von selbst öffnet, wird sie zusätzlich mit einem `ArrowDown`-Öffnungssignal
angefordert. Ein technischer Wert gilt weiterhin nur nach echter Auswahl als übernommen.

Beim Bild-Upload reicht die Existenz von `adImages[n].url` nicht mehr als alleiniger
Erfolgsnachweis. Die Erweiterung wartet zusätzlich auf die erwarteten
`img[alt="Bild zur Anzeige"]`-Vorschauen und prüft `complete`, `naturalWidth` und
`naturalHeight`. Noch nicht verarbeitete signierte CDN-Vorschauen werden begrenzt erneut
geladen. Bleibt ausschließlich die CDN-Vorschau defekt, werden die bereits hochgeladenen
Server-Bildobjekte nicht verändert; stattdessen zeigt die Extension die identischen
lokalen JPEG-Dateien temporär als visuelle Vorschau an. Dadurch kann Reihenfolge und
Bildinhalt vor dem finalen Publish-Gate geprüft werden, ohne den serverseitigen
Uploadzustand zu manipulieren.
<!-- KAR170-END:README:1496 -->

## v1.1.4

<!-- KAR170-BEGIN:CHANGELOG:1802 -->
### Original CHANGELOG: 1.1.4 – 2026-09-13 (source line 1802)

- Suchbare dynamische Auswahlfelder wie `Marke` werden jetzt als echte Autocomplete-Auswahl behandelt: sichtbaren Vorlagenwert eingeben, gefilterte Vorschlagsliste abwarten, exakten sichtbaren Vorschlag anklicken und anschließend den technischen `attributeMap[...]`-Wert verifizieren.
- Referenzfall `Up Fashion`: reines Eintragen des Textes gilt nicht mehr als Erfolg; erst die Auswahl des Vorschlags darf `up_fashion` bestätigen.
- Modalbasierte Merkmale wie `Zustand` werden nach der exakten Optionswahl mit dem sichtbaren Button `Bestätigen` abgeschlossen. Erst nach Modal-Schließen bzw. technischem Wert-Update wird die Auswahl verifiziert.
- Konkrete Versandmethoden und Paketgrößen werden vorerst vollständig aus dem Template-Fill ausgeschlossen: keine Auswahl/Verifikation von `HERMES_*`, `DHL_*` oder `Klein`/`Mittel`/`Groß`, keine daraus entstehenden Warnungen. Die Grundeinstellung `Versand möglich` / `Nur Abholung` bleibt erhalten.
- Kategorieassistent, 100-ms-Taktung, lokale Bildübernahme und Sicherheitsgrenzen bleiben unverändert; weiterhin keine automatische Veröffentlichung.
<!-- KAR170-END:CHANGELOG:1802 -->

<!-- KAR170-BEGIN:README:1477 -->
### Historical README: Zustands- und Autocomplete-Auswahl ab 1.1.4 (source line 1477)

Suchbare Auswahlfelder wie **Marke** werden nicht mehr nur mit Text befüllt. Die
Extension wartet nach der Eingabe auf die gefilterte Vorschlagsliste, wählt dort nur
einen exakt passenden sichtbaren Eintrag und verifiziert anschließend den technischen
`attributeMap[...]`-Wert. Dadurch wird beispielsweise `Up Fashion` erst nach echter
Auswahl des Vorschlags als technischer Wert `up_fashion` akzeptiert.

Modalbasierte Merkmale wie **Zustand** werden ebenfalls vollständig abgeschlossen:
Nach exakter Auswahl des gespeicherten Werts (z. B. `Sehr Gut`) wird ein sichtbarer
Button **„Bestätigen“** im Auswahlmodal bedient, auf das Schließen/Übernehmen gewartet
und erst danach der technische Wert wie `like_new` verifiziert.

Konkrete Versandmethoden (`HERMES_*`, `DHL_*`) und Paketgrößen
(`Klein`/`Mittel`/`Groß`) gelten in 1.1.4 vorerst nicht als gepflegte Vorlagendaten.
Sie werden weder gesetzt noch verifiziert und erzeugen keine Warnungen. Die einfache
Grundeinstellung **Versand möglich / Nur Abholung** bleibt erhalten.
<!-- KAR170-END:README:1477 -->

## v1.1.3

<!-- KAR170-BEGIN:CHANGELOG:1810 -->
### Original CHANGELOG: 1.1.3 – 2026-09-13 (source line 1810)

- Legacy-Kategorieassistent nach erfolgreicher Pflichtmerkmalsauswahl abgeschlossen: Sobald keine weitere erforderliche Assistentenspalte offen ist und der sichtbare Button `Weiter` verfügbar ist, wird dieser genau einmal angeklickt und anschließend auf die Rückkehr zu `/p-anzeige-aufgeben-schritt2.html` gewartet.
- Der Referenzfall `Mode & Beauty → Damenbekleidung → Art: Weitere Damenbekleidung` wird damit nach der korrekt markierten Art-Auswahl fortgesetzt, statt fälschlich als unvollständig zu enden.
- Bereits erfolgreich gesetzte Assistentenmerkmale werden im Abschluss-/Fehlerpfad nicht mehr erneut als fehlend gemeldet. Unbekannte oder nicht eindeutig aus der Vorlage zuordenbare Pflichtspalten bleiben weiterhin ein harter Diagnosefehler.
- Zwischen allen programmgesteuerten Auswahlaktionen im Legacy-Kategorieassistenten gilt nun eine feste Mindestpause von 100 ms; dieselbe Mindestpause gilt vor dem Klick auf `Weiter`.
- Neue Session-Stufe `category-continuing` macht den Übergang vom Kategorieassistenten zurück zu Schritt 2 diagnostizierbar.
- Sicherheitsgrenze unverändert: Der automatische `Weiter`-Klick betrifft ausschließlich den Kategorieassistenten. Kein automatischer Klick auf `Anzeige aufgeben`, keine Veröffentlichung und keine Änderung/Löschung der Quellanzeige.
<!-- KAR170-END:CHANGELOG:1810 -->

<!-- KAR170-BEGIN:README:1461 -->
### Historical README: Weiter-Schritt und 100-ms-Taktung ab 1.1.3 (source line 1461)

Nachdem alle erforderlichen Kategorie- und Pflichtmerkmals-Spalten eindeutig aus der
Vorlage ausgewählt wurden, prüft 1.1.3 den sichtbaren Legacy-Button **„Weiter“**. Ist
keine weitere Pflichtauswahl offen, wird dieser Button genau einmal programmgesteuert
bedient und anschließend auf die Rückkehr zu
`/p-anzeige-aufgeben-schritt2.html` gewartet. Dieser Klick beendet nur den
Kategorieassistenten und veröffentlicht keine Anzeige.

Zwischen zwei programmgesteuerten Auswahlaktionen im Legacy-Kategorieassistenten gilt
eine feste Mindestpause von **100 ms**. Dieselbe Mindestpause gilt zwischen der letzten
erfolgreichen Pflichtmerkmalsauswahl und dem Klick auf **„Weiter“**. Die Verzögerung ist
in 1.1.3 bewusst fest eingestellt; eine spätere konfigurierbare Einstellung ist noch
nicht Bestandteil dieser Version. Veröffentlichung bleibt weiterhin ausschließlich
eine Benutzeraktion.
<!-- KAR170-END:README:1461 -->

## v1.1.2

<!-- KAR170-BEGIN:CHANGELOG:1819 -->
### Original CHANGELOG: 1.1.2 – 2026-09-13 (source line 1819)

- Kategorie-Assistent um integrierte Pflichtmerkmale erweitert: Zusätzliche sichtbare Spalten wie `Art *` werden anhand des gespeicherten dynamischen Merkmalslabels erkannt und nur bei exakter sichtbarer Wertübereinstimmung bedient.
- Referenzfall Damenbekleidung: Nach `Mode & Beauty → Damenbekleidung` wird nun `Art → Weitere Damenbekleidung` ausgewählt, bevor Kleinanzeigen selbst zu Schritt 2 zurücknavigiert.
- Die Auswahl bleibt generisch für andere Kategorien, z. B. `Art → Sandalen` oder `Art → Fitness`; es gibt keine fest codierten Kategorie- oder Optionsnamen.
- Parent-/Pfadlinks werden nicht erneut angeklickt, wenn bereits eine nachgelagerte Assistentenspalte sichtbar ist. Die direkte `cat_<categoryId>`-Auswahl wird nur noch als terminal behandelt, wenn der Link kein Parent ist.
- Nicht eindeutig aus der Vorlage zuordenbare zusätzliche Pflichtspalten brechen mit Diagnose ab, statt eine Auswahl zu raten. Neue Session-Stufe `category-attribute-selected`.
- Sicherheitsgrenze unverändert: kein automatisches Veröffentlichen, kein `submit()`/`requestSubmit()`, keine programmgesteuerte Übermittlung des Legacy-Kategorieformulars und keine Änderung/Löschung der Quellanzeige.
<!-- KAR170-END:CHANGELOG:1819 -->

<!-- KAR170-BEGIN:README:1447 -->
### Historical README: Pflichtmerkmale im Kategorie-Assistenten ab 1.1.2 (source line 1447)

Einige Kleinanzeigen-Kategorien sind auf der Legacy-Kategorie-Seite nicht mit dem
gespeicherten Kategoriepfad abgeschlossen. Bei Damenbekleidung folgt nach
`Mode & Beauty → Damenbekleidung` beispielsweise eine weitere Pflichtspalte
`Art *`. 1.1.2 erkennt solche sichtbaren Assistentenspalten generisch und gleicht
deren Überschrift mit den gespeicherten dynamischen Merkmalen ab. Ein Wert wird nur
dann automatisch gewählt, wenn Label und sichtbarer Vorlagenwert exakt zu einer
aktuell angebotenen Option passen. Beispiel: `Art` → `Weitere Damenbekleidung`.

Bereits durchlaufene Parent-/Pfadspalten werden nicht erneut angeklickt. Nicht eindeutig
zuordenbare zusätzliche Pflichtspalten führen zu einer klaren Fehlermeldung statt zu
einer geratenen Auswahl.
<!-- KAR170-END:README:1447 -->

## v1.1.1

<!-- KAR170-BEGIN:CHANGELOG:1828 -->
### Original CHANGELOG: 1.1.1 – 2026-09-13 (source line 1828)

- Kategorie-Navigationsregression aus 1.1.0 behoben: Die Fill-Session wird nun über Kleinanzeigens separate Legacy-Kategorie-Seite `/p-kategorie-aendern.html` fortgeführt.
- Auf der Kategorie-Seite werden ausschließlich die echten sichtbaren Kleinanzeigen-Kategorielinks verwendet; direkte Leaf-ID `cat_<categoryId>` hat Vorrang, ansonsten wird der gespeicherte Kategoriepfad Ebene für Ebene durchlaufen.
- Nach Wahl einer Parent-Kategorie wird auf die nächste sichtbare Unterkategorie bzw. einen DOM-/Seitenwechsel gewartet; nach Wahl der Leaf-Kategorie übernimmt Kleinanzeigen selbst die Navigation zurück zu Schritt 2.
- Zurück auf `/p-anzeige-aufgeben-schritt2.html` wird die erwartete `categoryId` bestätigt, bevor dynamische Kategorie-Merkmale, Versand, Preis und Bilder gesetzt werden.
- Die tabgebundene Fill-Session bleibt während des gesamten `Schritt 2 → Kategorieauswahl → Schritt 2`-Lifecycles aktiv; Statusstufen machen Parent-/Leaf-Auswahl diagnostizierbar.
- Sicherheitsgrenze unverändert: keine automatische Veröffentlichung, kein `submit()`/`requestSubmit()`, keine programmgesteuerte Übermittlung des Legacy-Kategorieformulars und keine Änderung/Löschung der Quellanzeige.
<!-- KAR170-END:CHANGELOG:1828 -->

<!-- KAR170-BEGIN:README:1429 -->
### Historical README: Kategorie-Lifecycle ab 1.1.1 (source line 1429)

Kleinanzeigen öffnet die Kategorieauswahl beim Erstellen einer neuen Anzeige nicht im
modernen `PostListingForm`, sondern navigiert auf die separate Legacy-Seite
`/p-kategorie-aendern.html`. 1.1.1 hält die tabgebundene Fill-Session über diesen
Seitenwechsel aktiv. Auf der Kategorie-Seite wird der gespeicherte Kategoriepfad über
die echten Kleinanzeigen-Kategorielinks (`cat_<id>`) Ebene für Ebene ausgewählt. Die
Extension bevorzugt die gespeicherte Leaf-`categoryId`, sobald sie sichtbar ist, und
fällt andernfalls auf die gespeicherten Pfadnamen zurück.

Nach Auswahl der Leaf-Kategorie lässt Kleinanzeigen selbst zurück nach
`/p-anzeige-aufgeben-schritt2.html` navigieren. Dort wird die erwartete `categoryId`
geprüft; erst danach werden dynamische Kategorie-Merkmale, Versand, Preis und Bilder
übernommen. Die Erweiterung manipuliert das versteckte Kategorie-Übergabeformular nicht direkt.
Ab 1.1.3 darf sie jedoch nach vollständig bestätigter Kategorieauswahl den sichtbaren
**„Weiter“**-Button dieses Assistenten genau einmal bedienen. Der Veröffentlichungsbutton
bleibt weiterhin unangetastet.
<!-- KAR170-END:README:1429 -->

## v1.1.0

<!-- KAR170-BEGIN:CHANGELOG:1837 -->
### Original CHANGELOG: 1.1.0 – 2026-09-13 (source line 1837)

- Im Inventar neue Aktion **„Als neue Anzeige verwenden“** für vollständig bestätigte Vorlagen ergänzt.
- Öffnet kontrolliert einen neuen Tab mit `https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html` und bindet die Vorlage tab-spezifisch an eine temporäre Fill-Session.
- Befüllung orientiert sich am gleichen `PostListingForm` wie die Bearbeiten-Seite: Anzeigenart und Titel, echte Kategorieauswahl, danach dynamische Kategorieattribute anhand technischer Keys/Werte und aktuell sichtbarer Optionen.
- Beschreibung, Preis, Preistyp, Versand/Paketgröße, Direkt-kaufen-Zustand soweit verfügbar sowie Standort-/Adresssichtbarkeit werden übernommen und anschließend verifiziert.
- Versand-Paketgröße wird generisch aus den gespeicherten Versandmethoden-IDs gegen den aktuellen `availableShippingOptions`-Katalog des Ziel-Formulars bestimmt; nicht eindeutige oder nicht mehr verfügbare Werte werden gemeldet statt geraten.
- Lokal gespeicherte JPEGs werden aus IndexedDB in begrenzten Datenblöcken an genau den gebundenen Ziel-Tab übertragen, dort als echte `File`-Objekte rekonstruiert und über Kleinanzeigens vorhandenen Mehrfach-Dateiupload in gespeicherter Reihenfolge hochgeladen.
- In-Page-Status zeigt Erfolg oder konkrete Soll/Ist-Abweichungen; Abschluss wird zusätzlich diagnostisch als `TEMPLATE_FILL_FINISHED` protokolliert.
- Sicherheitsgrenze: keine automatische Veröffentlichung, kein `submit()`/`requestSubmit()`, kein Klick auf „Anzeige aufgeben“, keine Änderung/Löschung der Quellanzeige. CSRF-/Tracking-/Session-Werte und Marketing-Opt-ins werden nicht aus dem Inventar übertragen.
- Feste Extension-ID und bestehende v0.1.7-Inventarisierungs-/Bildlogik bleiben erhalten.
<!-- KAR170-END:CHANGELOG:1837 -->

<!-- KAR170-BEGIN:README:1396 -->
### Historical README: Neuerstellung aus dem Inventar ab 1.1.0 (source line 1396)

Für vollständig inventarisierte Bearbeiten-Vorlagen steht im Inventar die Aktion
**Neu inserieren** bereit. Sie öffnet einen neuen Browser-Tab mit
`https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html` und übernimmt die
gespeicherten Werte kontrolliert in das neue Formular.

Der Füllablauf setzt zuerst Anzeigenart und Titel, wählt anschließend die gespeicherte
Kategorie über die echte Kleinanzeigen-Oberfläche und wartet auf die daraus dynamisch
erzeugten Kategorie-Merkmale. Diese werden anhand ihres technischen Keys und des
gespeicherten technischen Werts über die aktuell angebotenen sichtbaren Optionen
ausgewählt. Danach folgen Beschreibung, Preis/Preistyp, die Grundeinstellung Versand möglich/Nur Abholung, Direkt-kaufen-Zustand
soweit verfügbar sowie Standort-/Adresssichtbarkeit. Konkrete Versandmethoden und Paketgrößen werden weiterhin bewusst nicht aus der Vorlage übernommen oder verifiziert.

Die lokal in IndexedDB gespeicherten JPEGs werden blockweise aus dem Extension-Speicher
gelesen, im Ziel-Tab wieder zu `File`-Objekten zusammengesetzt und in der gespeicherten
Reihenfolge an Kleinanzeigens echten Mehrfach-Dateiupload übergeben. Bilddaten werden
nicht von alten CDN-URLs abhängig gemacht.

Nach dem Befüllen vergleicht die Erweiterung die zentralen Sollwerte der Vorlage mit
dem neuen Formular. Ein Statusfeld direkt auf der Seite meldet entweder eine vollständig
bestätigte Übernahme oder konkrete Punkte, die geprüft werden müssen. Die Erweiterung klickt **niemals** selbst auf „Anzeige aufgeben“ und ruft für die
Veröffentlichung weder `submit()` noch `requestSubmit()` auf. Der einzige automatisch
ausgelöste Submit-Übergang ist ab 1.1.3 der ausdrücklich begrenzte **„Weiter“**-Schritt
im separaten Legacy-Kategorieassistenten. Veröffentlichung bleibt eine bewusste
Benutzeraktion. Die alte Anzeige wird nicht
verändert oder gelöscht.

Sitzungswerte der Quellanzeige wie CSRF-, Tracking- oder Session-IDs werden nicht in die
neue Anzeige übernommen. Der Ziel-Tab verwendet ausschließlich seine eigenen aktuellen
Kleinanzeigen-Sitzungswerte. Marketing-Opt-ins werden ebenfalls nicht aus der Vorlage
übernommen.
<!-- KAR170-END:README:1396 -->

## v0.1.7

<!-- KAR170-BEGIN:CHANGELOG:1849 -->
### Original CHANGELOG: 0.1.7 – 2026-09-13 (source line 1849)

- Reale `PostListingForm`-Props der Bearbeiten-Seite als primäre strukturierte Quelle für Kategorie-Metadaten, ausgewählte technische Werte und explizite Großbild-URLs eingebunden; DOM-Auswertung bleibt Gegenprüfung/Fallback.
- Kategoriepfad wird aus `category.parentName` + `category.name` übernommen; dynamische Merkmale werden aus den kategorieabhängigen Definitionen generisch mit den tatsächlich ausgewählten technischen Werten zusammengeführt. Vollständige Optionslisten werden nicht pro Anzeige persistiert; gespeichert werden ausgewählter technischer/sichtbarer Wert sowie relevante Feldmetadaten und Optionsanzahl.
- Sichtwerte ignorieren Screenreader-/Hidden-Texte. Dadurch wird z. B. `like_new` sauber als `Sehr Gut` statt `Zustand auswählenSehr Gut` inventarisiert.
- Native `role="radiogroup"`-Fieldsets mit echten Radio-Inputs werden nur noch als Strukturcontainer behandelt. Die falschen Warnungen für Gebot/Gesuch, Versand und Direkt kaufen entfallen.
- Versandmethoden können über den strukturierten Optionskatalog anhand ihrer IDs benannt werden; bisherige DOM-Zuordnung bleibt Fallback.
- `adData.images[].dynamicRuleXXLargeUrl` wird per stabiler Bild-UUID mit der Galerie verknüpft und als bevorzugte, exakt abzurufende große JPEG-Quelle verwendet. Der bewährte `$_57.JPG`-Rewrite bleibt nur Fallback. JPEG-Signatur-, Dekodier-, Großbild- und atomare Rollback-Prüfungen bleiben unverändert.
- Formular-/Bilddiagnose zeigt nur eine datensparsame Zusammenfassung der strukturierten Quelle; signierte Bild-Queryparameter und persönliche Standort-/Kontaktwerte bleiben redigiert.
- Keine Veröffentlichung, kein Löschen und keine automatische Formularbefüllung hinzugefügt.
<!-- KAR170-END:CHANGELOG:1849 -->

<!-- KAR170-BEGIN:README:1671 -->
### Historical README: Strukturierte Bearbeiten-Daten 0.1.7 (source line 1671)

Der reale HTML-Stand der Bearbeiten-Seite enthält im Astro-`PostListingForm` bereits
einen strukturierten Serverzustand. 0.1.7 liest diesen Zustand ausschließlich
read-only und verwendet ihn für technische Metadaten, die im sichtbaren DOM nur
indirekt oder fehleranfällig ablesbar sind. Die DOM-Auswertung bleibt vollständig
als Gegenprüfung und Fallback erhalten, falls Kleinanzeigen die Astro-Struktur ändert.

Für Kategorien werden `category.id`, `parentName`, `name` und die dynamischen
Attributdefinitionen verwendet. Pro tatsächlich angebotenem Merkmal bleiben der
technische Key, der ausgewählte technische Wert, sichtbarer Wert, Label, Required-/
Selectability-/Render-Metadaten und die Anzahl aktuell angebotener Optionen erhalten.
Große Optionslisten (z. B. Marken) werden bewusst nicht in jede Vorlage kopiert;
beim späteren Ausfüllen müssen die dann aktuell angebotenen Zielseitenoptionen neu
gelesen und gegen den gespeicherten Wert validiert werden.

Native `fieldset[role="radiogroup"]`-Container, die echte Radio-Inputs enthalten,
werden nicht mehr als eigenes unresolved Feld behandelt. Dadurch entstehen für
Anzeigenart, Versand und Direkt kaufen keine doppelten Warnungen. Bei sichtbaren
Custom-Controls werden `.sr-only`, `[aria-hidden="true"]` und `[hidden]` aus dem
Anzeige-Text entfernt; der Zustand `like_new` wird damit sauber als `Sehr Gut`
gespeichert.

Für Bilder wird `adData.images[].dynamicRuleXXLargeUrl` als bevorzugte große JPEG-
Quelle verwendet und über die stabile Bild-UUID mit der sichtbaren Galerie verknüpft.
Diese explizit von Kleinanzeigen gelieferte XXLarge-URL wird zuerst unverändert
abgerufen. Nur wenn sie fehlschlägt, greifen die bestehenden verifizierten JPEG-
Fallbacks. JPEG-Signatur, erfolgreiche Dekodierung und deutliche Größe oberhalb des
Thumbnails bleiben zwingende Commit-Bedingungen.

Die kopierbare Diagnose enthält aus der strukturierten Quelle nur Zähler, Kategorie-
identität/-pfad und Bildquellen ohne signierte Queryparameter. Persönliche Standort-
und Kontaktwerte werden weiterhin maskiert.
<!-- KAR170-END:README:1671 -->

## v0.1.6

<!-- KAR170-BEGIN:CHANGELOG:1860 -->
### Original CHANGELOG: 0.1.6 – 2026-09-13 (source line 1860)

- Großbild-Abrufregression aus 0.1.5 korrigiert: Für strikt verifizierte Kleinanzeigen-CDN-Pfade `https://img.kleinanzeigen.de/api/v1/prod-ads/images/<UUID>` wird wieder zuerst die bewährte JPEG-Variante `rule=$_57.JPG` versucht, auch wenn die Hidden-`adImages[n].url`-Quelle keinen sichtbaren `rule`-Parameter enthält.
- Das Rewrite ist bewusst auf den vertrauenswürdigen `prod-ads/images/<UUID>`-Endpunkt begrenzt; andere CDN-Pfade ohne vorhandenen `rule`-Parameter werden nicht verändert.
- Signierte Query-Parameter der realen Hidden-Quelle bleiben beim Großbildkandidaten erhalten.
- Strikte JPEG-Signaturprüfung, Dekodierung, Großbildprüfung gegen die Thumbnail-Geometrie, stabile Bild-UUID, Reihenfolge/Titelbild und atomarer Rollback bleiben unverändert.
- Keine Änderungen an Formularmodell, Veröffentlichung oder Löschlogik.
<!-- KAR170-END:CHANGELOG:1860 -->

<!-- KAR170-BEGIN:README:1706 -->
### Historical README: Großbild-Abrufkorrektur 0.1.6 (source line 1706)

Der reale Bearbeiten-Seiten-Test von 0.1.5 zeigte eine Regression: Die versteckten
`adImages[n].url`-Quellen enthielten keinen sichtbaren `rule`-Parameter und lieferten
beim rohen Abruf nur die bereits bekannte kleine Bearbeiten-Vorschau. 0.1.6 versucht
für den strikt verifizierten Kleinanzeigen-CDN-Endpunkt
`https://img.kleinanzeigen.de/api/v1/prod-ads/images/<UUID>` deshalb wieder zuerst
`rule=$_57.JPG`. Dieser Pfad hatte im vorherigen realen Inventar große lokale JPEGs
mit Abmessungen deutlich oberhalb der 72–96-px-Thumbnails geliefert.

Das Rewrite gilt ausschließlich für diesen vertrauenswürdigen UUID-Pfad oder für
URLs, die bereits explizit einen `rule`-Parameter besitzen. Alle Schutzmechanismen
aus 0.1.5 bleiben aktiv: JPEG-Signaturprüfung, `createImageBitmap`-Dekodierung,
Großbildvergleich gegen die Thumbnail-Geometrie und atomarer Commit. Liefert auch
der große Kandidat kein ausreichend großes JPEG, wird das bestehende Inventar nicht
verändert.
<!-- KAR170-END:README:1706 -->

## v0.1.5

<!-- KAR170-BEGIN:CHANGELOG:1868 -->
### Original CHANGELOG: 0.1.5 – 2026-09-13 (source line 1868)

- Kategorieabhängige `attributeMap[...]`-Merkmale generisch mit sichtbaren Controls zu einem kanonischen Datenmodell zusammengeführt.
- Technische Identität, technischer Wert, Label, sichtbarer Wert, Control-Typ, Status und verfügbare Optionen pro dynamischem Merkmal gespeichert.
- Doppelte False-Positive-Warnungen für Container/Custom-Controls beseitigt; nur vorlagenrelevante Lücken blockieren die Vollständigkeit.
- `priceType`, `addressVisibility`, `locationId`, `buyNowEligible`, `posterType` und Versandmethoden gezielt klassifiziert.
- Stabile Bild-UUID aus dem Kleinanzeigen-CDN-Pfad als `imageId`; signierte Query-Parameter nicht mehr Teil der Bildidentität.
- Versteckte `adImages[n].url`-Quellen mit Galeriebildern verknüpft und als bevorzugte Quelle für große JPEGs verwendet.
- Thumbnail-Größe wird gegen die dekodierte lokale JPEG-Datei geprüft; reine 96×96-Bilder werden nicht als Großbild akzeptiert.
- Reihenfolge und Titelbildposition gespeichert; Diagnose-URLs redigiert und Kontakt-/Standortwerte in kopierbaren Formulardiagnosen maskiert.
- Fester Manifest-Key, atomarer Commit und rein lokale Inventarisierung ohne Veröffentlichung/Löschung beibehalten.
<!-- KAR170-END:CHANGELOG:1868 -->

<!-- KAR170-BEGIN:README:1723 -->
### Historical README: Kategorie-/Merkmalsmodell und Großbilder 0.1.5 (source line 1723)

Die Bearbeiten-Ansicht wird jetzt in ein kanonisches Vorlagenmodell überführt.
Kategorieattribute werden nicht über eine feste Liste wie Art, Marke, Größe, Farbe
oder Zustand definiert. Stattdessen werden alle vorhandenen `attributeMap[...]`-
Felder generisch erkannt und mit dem zugehörigen sichtbaren Control zusammengeführt.
Pro Merkmal werden technische Identität, technischer Wert, sichtbare Beschriftung,
sichtbarer Wert, Control-Typ, Status und – soweit im DOM vorhanden – Optionen gespeichert.
Damit kann eine spätere Wiederbefüllung nach dem Schema Kategorie setzen → dynamische
Felder laden lassen → anhand der technischen Identität zuordnen erfolgen.

Technische und sichtbare Repräsentationen desselben Feldes erzeugen keine doppelten
Unresolved-Warnungen mehr. `priceType`, `addressVisibility`, `locationId`,
`buyNowEligible` und `posterType` werden gezielt klassifiziert. Versandmethoden-IDs
werden in ihrer Reihenfolge erfasst und, wenn die sichtbaren Einträge eindeutig
ermittelt werden können, mit ihren Bezeichnungen zusammengeführt. Irrelevante Aktions-
und Hilfsbuttons blockieren die Vorlagenvollständigkeit nicht.

Im Bearbeiten-Modus werden die kleinen Galerie-Thumbnails nur noch zur Identifikation
und Reihenfolge verwendet. Die versteckten `adImages[n].url`-Quellen werden anhand
der stabilen Bild-UUID aus dem CDN-Pfad mit dem jeweiligen Galeriebild verknüpft und
als bevorzugte Downloadquelle verwendet. Die lokal gespeicherte Datei muss weiterhin
ein dekodierbares JPEG sein und gegenüber der bekannten Thumbnail-Geometrie deutlich
größer sein; andernfalls bricht die Inventarisierung ohne Änderung des bisherigen
Bestands ab. Ein unbewiesenes `rule`-Override wird bei signierten URLs ohne vorhandenen
`rule`-Parameter nicht mehr erfunden. Reihenfolge und Titelbildposition bleiben erhalten.

Kopierdiagnosen entfernen Query-Parameter signierter Bild-URLs und redigieren Kontakt-
und Standortwerte. Die stabile Bild-UUID bleibt als Diagnose- und Inventaridentität
erhalten.
<!-- KAR170-END:README:1723 -->

## v0.1.4

<!-- KAR170-BEGIN:CHANGELOG:1880 -->
### Original CHANGELOG: 0.1.4 – 2026-09-13 (source line 1880)

- Eigene Erfassung für bestehende Anzeigen im Bearbeiten-Formular.
- Dynamische Felder einschließlich technischer Werte, Labels und Zustand inventarisieren.
- Formular-/Bilddiagnose für nicht erkannte Komponenten.
- Bilder aus Upload-Containern auswählen und nur als geprüfte dekodierbare JPEGs übernehmen.
- Fehlende JPEGs und unsichere Bildauswahl erhalten den bisherigen Bestand.
- Formulartests und strikte JPEG-Fehlerpfadtests ergänzt.
- Fester Manifest-Key und atomarer Datenbank-Commit beibehalten.
<!-- KAR170-END:CHANGELOG:1880 -->

<!-- KAR170-BEGIN:README:1754 -->
### Historical README: Bearbeiten-Ansicht 0.1.4 (source line 1754)

Die Bearbeiten-Ansicht ist jetzt die Hauptquelle für eine Formularvorlage.
Zum Test eine bestehende eigene Anzeige öffnen, „Anzeige bearbeiten“ anklicken,
die vollständig geladene Seite neu laden und im Erweiterungs-Popup
„Geöffnete Anzeige inventarisieren“ wählen. Die Erweiterung klickt keine
Website-Schaltflächen, öffnet keine Dropdowns, speichert keine Änderungen auf
Kleinanzeigen und veröffentlicht nichts. Sie erfasst den aktuell im Formular
angezeigten Zustand, einschließlich eigener noch nicht gespeicherter Texteingaben.

Erkannt werden native Eingabe-, Auswahl-, Radio- und Checkboxfelder sowie
beschriftete/ARIA-basierte benutzerdefinierte Auswahlfelder. Gespeichert werden
Feldname, ID, Beschriftung, Wert, sichtbarer Text, vorhandene Optionen, Required- und
Disabled-Zustand. Neue Kategorie-Felder werden generisch aufgenommen. Die Zustände
captured, empty und unresolved unterscheiden erfasste, leere und nicht auslesbare
Werte. Nicht angebotene Felder gehören nicht zum Snapshot dieser Kategorie.
Unbekannte interne Werte werden nicht aus sichtbaren Bezeichnungen erfunden.
Kategorie-ID, Titel, Beschreibung und Preis werden zusätzlich separat zugeordnet;
Versand, Direkt kaufen, Kontakt und weitere Einstellungen bleiben in den
Formularfeldern enthalten. Bekannte Token-/Loginfelder und erkannte kostenpflichtige
Werbe-/Newsletter-Steuerungen sind von den Vorlagendaten ausgeschlossen.

Eine Bearbeiten-Erkennung setzt ein Formular mit Beschreibungseingabe,
Bearbeiten-/Speichern-Signal und eindeutiger bestehender Anzeigen-ID voraus.
Widersprüchliche IDs, fehlende Kernfelder, laufende aria-busy-Ladevorgänge und
nicht zuordenbare Bildbereiche führen zum Abbruch. Diese DOM-Signale sind keine
zusätzliche serverseitige Berechtigungsprüfung. Unbekannte Komponenten werden in
der Diagnose ausgewiesen. Die reale Bearbeiten-Seite wurde inzwischen für den aktuellen Testfall vermessen.
Weitere Kategorien können andere Sonderfelder besitzen; deshalb bleiben generische
Erkennung, strukturierte Metadaten und DOM-Fallbacks erforderlich.
<!-- KAR170-END:README:1754 -->

## v0.1.3

<!-- KAR170-BEGIN:CHANGELOG:1890 -->
### Original CHANGELOG: 0.1.3 – 2026-09-13 (source line 1890)

- Beschreibung aus dem eigentlichen DOM-Bereich priorisieren.
- Zeilenumbrüche, Leerzeilen und Absätze statt Whitespace-Zusammenziehung erhalten.
- BR-/Blockgrenzen verhindern zusammengezogene Wörter.
- Herkunft und Zeilenumbruchanzahl als Extraktionsmetadaten speichern.
- Ersatzquellen kennzeichnen, sieben Beschreibungstests ergänzen.
- Bildlogik, Oberfläche, Manifest-Key und Datenbankschema unverändert.
<!-- KAR170-END:CHANGELOG:1890 -->

<!-- KAR170-BEGIN:README:1651 -->
### Historical README: Beschreibungskorrektur 0.1.3 (source line 1651)

Der eigentliche Beschreibungsbereich hat Vorrang vor JSON-LD und Meta-Daten.
Zeilenumbrüche, Leerzeilen und Absätze werden als Klartextstruktur gespeichert;
BR-, P-, DIV- und Listenelemente werden mit passenden Zeilengrenzen ausgelesen.
HTML-Zeichenreferenzen werden vom DOM aufgelöst. Skripte und explizit versteckte
Elemente werden ausgelassen. Es wird kein fremdes HTML im Popup ausgeführt.
Die Darstellung erfolgt weiterhin mit textContent und white-space: pre-wrap.
Schriftarten, Farben und andere HTML-Stile werden nicht als Rich Text übernommen.
Ersatzquellen werden in den Extraktionsmetadaten und als Warnung ausgewiesen.

Nach dem Update Erweiterung und Anzeigenseite neu laden und die Anzeige erneut
inventarisieren. Bereits verlorene Absatzgrenzen im Altbestand können nicht ohne
die Originalseite rekonstruiert werden. Bildauswahl, MIME-Anzeige und Bilddiagnose
sind gegenüber 0.1.2 unverändert. Der Source-Build enthält sieben zusätzliche
Beschreibungstests sowie eine Prüfung des mehrzeiligen Textes im Storage-Test.
Die Tests sind emulierte DOM-/Datenbanktests, kein Live-Test der Nutzeranzeige.
<!-- KAR170-END:README:1651 -->

## v0.1.2

<!-- KAR170-BEGIN:CHANGELOG:1899 -->
### Original CHANGELOG: 0.1.2 – 2026-09-13 (source line 1899)

- Bildsuche auf zuordenbare Galerie oder passende JSON-LD-Anzeige begrenzt.
- Auslieferungsvarianten nach CDN-Pfad und Identitätsparametern zusammengeführt.
- Alle gespeicherten Bilder mit Nummer, MIME-Format und Dateigröße sichtbar.
- Dateisignaturprüfung für JPEG, PNG, GIF, WebP und AVIF; Original-AUTO bleibt unbekannt.
- Kopierbare, begrenzte DOM-Bilddiagnose auch ohne erfolgreiche Inventarisierung.
- 25-zu-5-Regressionsfall, Quellenauswahl, Format- und UI-Tests ergänzt.
- Bestehende Inventare werden erst bei erneuter erfolgreicher Inventarisierung korrigiert.
- Fester Manifest-Key und atomare Speicherung beibehalten.
<!-- KAR170-END:CHANGELOG:1899 -->

<!-- KAR170-BEGIN:README:1611 -->
### Historical README: Bildkorrektur 0.1.2 (source line 1611)

Die neue Bildauswahl verwendet einen dedizierten Anzeigen-Galeriecontainer oder
strukturiertes JSON-LD, das der aktuellen Anzeige zugeordnet werden kann. Eine
allgemeine Suche nach sämtlichen Bildern im Hauptinhalt entfällt. Varianten mit
gleichem CDN-Pfad werden unter Beibehaltung unbekannter Identitätsparameter
zusammengeführt; bekannte Darstellungsparameter wie `rule` ändern die Bild-ID
nicht. Die erste Fundstelle bestimmt die Reihenfolge. Falls keine Galerie sicher
zugeordnet werden kann, wird der Vorgang mit einem Diagnosehinweis abgebrochen.
Die genaue Galerie-Vollständigkeit auf der echten Kleinanzeigen-Seite bleibt zu
verifizieren; die Tests verwenden synthetische DOM-Fälle.

Alle gespeicherten Bilder werden im Popup als Raster angezeigt (keine Begrenzung
auf sechs Bilder). Unter jedem Bild stehen Nummer, gespeichertes MIME-Format und
Dateigröße. Neue Downloads werden anhand der Dateisignatur geprüft. Bei Altbeständen
wird die bisherige Serverangabe entsprechend gekennzeichnet. Der URL-Hinweis AUTO
bezeichnet kein nachgewiesenes Originalformat; die Originaldatei wird nicht allein
zur Formatbestimmung zusätzlich heruntergeladen. Für JPEG wird wie bisher eine
CDN-Variante bevorzugt.
<!-- KAR170-END:README:1611 -->

## v0.1.1

<!-- KAR170-BEGIN:CHANGELOG:1910 -->
### Original CHANGELOG: 0.1.1 (source line 1910)

- Bilder zunächst separat im Arbeitsspeicher sammeln.
- Bildbestand und Metadaten atomar übernehmen; Rollback bei Speicherfehlern.
- Leere Extraktion schützt vorhandene Bilder.
- Vorschau aus lokalen Blobs mit Freigabe der Objekt-URLs.
- Gleichzeitige Speicherdurchläufe verhindern.
- Download-Zeitlimit und Speichergrenzen; Diagnosefehler beeinflussen Commit-Erfolg nicht.
- Feste Extension-ID und Datenbankschema 1 bleiben erhalten.
- Speicherregressionen und deterministisches Packaging hinzugefügt.
<!-- KAR170-END:CHANGELOG:1910 -->

<!-- KAR170-BEGIN:README:1576 -->
### Historical README: Sichere Bildaktualisierung ab 0.1.1 (source line 1576)

Alle erkannten Bilder werden zuerst im Arbeitsspeicher gesammelt (maximal 128 MiB
pro Durchlauf, 20 MiB pro Datei). Erst wenn alle Downloads erfolgreich sind,
werden Metadaten und Bilddateien gemeinsam in einer IndexedDB-Transaktion ersetzt.
Ein Downloadfehler oder Transaktionsabbruch lässt den alten Stand unverändert.
Bei einem Browser-/Worker-Abbruch vor dem Commit muss der Durchlauf neu gestartet
werden; der Zwischenstand wird nicht über Neustarts fortgesetzt.
Eine leere Bildliste überschreibt keinen vorhandenen Bildbestand. Eine tatsächlich
bildlose neue Anzeige kann weiterhin gespeichert werden. Die Vollständigkeit der
vom Website-Parser erkannten Bildliste kann dieser Speicherschutz nicht beweisen.
Die Vorschau verwendet ausschließlich lokale Blob-Dateien; fehlende Altbestände
werden als nicht verfügbar markiert. Bestehende 0.1.0-Bildschlüssel bleiben lesbar.
<!-- KAR170-END:README:1576 -->

## v0.1.0

<!-- KAR170-BEGIN:CHANGELOG:1921 -->
### Original CHANGELOG: 0.1.0 – 2026-09-12 (source line 1921)

- Initiale kanonische Chrome-MV3-Basis angelegt.
- Feste Entwicklungs-ID `hafahjhhgiipdegfkgacchmnacgblnah` verankert.
- Einzel-Inventarisierung eigener geöffneter Anzeigen implementiert.
- Lokale Bildarchivierung mit bevorzugter JPEG-CDN-Variante implementiert.
- Inventarübersicht und kompakte Diagnosehistorie implementiert.
- Login- und Eigentümersignale als Voraussetzung für die Inventarisierung eingebaut.
- Keine Veröffentlichung, Löschung oder Speicherung von Zugangsdaten.
<!-- KAR170-END:CHANGELOG:1921 -->

## Historical cross-version notes without their own original version headings

The following original README sections contain version references but lacked a dedicated version heading. Their exact text remains in the [historical guidance provenance](docs/history/README_GUIDANCE_PRE_KAR170.md) without being assigned to an invented release.

- Historical README line 164, **Kleinanzeigen Renewal** (checksum `c19e9a2a1c108c5d`).
- Historical README line 1631, **Aktualisieren und testen** (checksum `44afcb13fa6bd18b`).
- Historical README line 1785, **Bilder im Bearbeiten-Modus** (checksum `b1379bc9e81e7593`).
