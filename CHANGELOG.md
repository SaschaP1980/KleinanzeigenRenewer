# v1.23.22

Correction für flüchtige Titel-Mismatches beim Template-Fill. Das aktive sichtbare Inserierformular wird für Titel-Readback und finale Verifikation explizit aufgelöst. Der Titel wird bounded gegen Controlled-Input-/DOM-Resets nachgelesen und bei Bedarf höchstens dreimal erneut exakt gesetzt; unmittelbar vor der finalen Verifikation erfolgt ein weiterer Stabilitätscheck. Bleibt der Titel abweichend, stoppt der Ablauf weiterhin fail-closed. Neue Diagnosen liefern Expected/Actual- und Feldkandidaten-Evidence. Keine neue IPC-/Runtime-Grenze und keine Änderung an Publish-/Delete-Safety. Nächster Architektur-Build nach nativer Abnahme bleibt v1.24.0 / EPIC-REF-003.

# v1.23.20_c1

Correction für einen im finalen nativen Performance-Smoke gefundenen UI-State-Recovery-Fehler. Ein vorbereiteter, aber noch nicht gestarteter Massen-Neuinserat-Draft konnte beim Visibility-/Actions-Resync von einem historischen terminalen `complete`-/`stopped`-Batch überlagert und dadurch fälschlich als abgeschlossen dargestellt werden. Automatische Startup-/Resync-/Storage-Rehydration verwendet nun Recovery-only-Semantik: aktive Batches bleiben recoverable; terminale Snapshots werden automatisch nur übernommen, wenn sie zur bereits lokal getrackten Batch-ID gehören. Explizite Review-Anwendung terminaler Snapshots bleibt möglich. Es wird kein Batch ohne Nutzeraktion gestartet und keine Publish-/Delete-/Account-/Profil-Safety verändert. Zusätzlich normalisiert der Public-API-Coverage-Report laufabhängige V8-Aufrufszähler auf binäre 0/1-Ausführungsevidenz, damit Source-Checkpoints und Source-ZIPs über identische Release-Läufe byte-stabil bleiben.

# v1.23.19

- Architektur-/Cleanup-/Coverage-Closure über alle Runtime-Module.
- Globaler Public-vs-Private-Audit: 897 -> 805 im jeweiligen Modul implementierte Public Functions; unnötige Exporte privatisiert, ein totes Content-Policy-Modul entfernt.
- Dynamic Public Function Coverage: 805/805 (100 %). Safety-kritische Public APIs besitzen explizite Negativ-/Fail-closed-Evidenz.
- Neue echte V8-Line-/Branch-Coverage mit Gold-Baseline und permanentem No-Regression-Gate; modul- und bereichsbezogene Reports unter `coverage/`.
- Runtime-Reachability/Dependency-Audit: 100/100 Runtime-Module erreichbar, 0 fehlende KRDeps-Provider, 0 Zyklen.
- Keine neue Runtime-/IPC-Grenze; Publish-Safety unverändert. Nächster planmäßiger Build: v1.23.20 finaler Gesamt-Soak/Performance.

# v1.23.18

- Inventory Runner in fünf fachliche in-process Module zerlegt: Roster/Parser, Readiness, Status-/Failure-Overlay, Delete/Verification Operations und Bulk/Reconciliation Run Loop.
- `src/content/inventory-runner.js` bleibt kompatible Message-/Lifecycle-/Composition-Facade.
- Neue Modul-Public-API-Closure: 28 echte Public Methods, 28/28 dynamisch über Public APIs getestet; Delete, Readiness und Reconciliation besitzen explizite fail-closed Negativverträge.
- Keine neue Runtime-/IPC-Grenze; Publish-Safety unverändert. Nächster planmäßiger Build: v1.23.19 Architektur-/Coverage-Closure.

# v1.23.17_c3

- Correction für den nativen Extension-/Content-Rebootstrap: fünf bislang nicht reentry-sichere Shared-/Content-Dependencies verwenden bei Same-Document-Reinjektion die bereits registrierte KRDeps-API statt ein zweites Objekt zu registrieren.
- Betroffen: `KRMessageContractRegistry`, `KRManagedNavigation`, `KRPlatformHardening`, `KRPaidInsertionGuard`, `KRMyAdsReadiness`.
- `KRDeps.register()` bleibt unverändert strikt und erkennt echte Dependency-Konflikte weiterhin als Fehler.
- Kein Seiten-Reload, kein Polling, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze; Publish-Safety bleibt unverändert.

# v1.23.17_c2

- Correction für den Awaiting-Publish-Status einer Papierkorb-Vorlage: Die Recovery-/Status-Aktion öffnet das zuvor geschlossene Modal jetzt wieder zuverlässig, solange der Vorgang fortsetzbar ist.
- Status-Reopen und Zieltab-Fokus sind getrennt: Das Modal enthält im Zustand „Anzeige ist vorbereitet“ eine separate Aktion „Anzeige prüfen“, die den bereits getrackten Kleinanzeigen-Tab explizit fokussiert.
- Beim Reopen wird der gespeicherte Zieltab nur auf Existenz und Kleinanzeigen-Zugehörigkeit geprüft; es erfolgt kein impliziter Fokuswechsel. Fehlt der Tab, greift weiterhin der bestehende fail-closed Target-Loss-/Restart-Pfad.
- Kein Polling, kein Auto-Publish, keine automatische Tab-Adoption, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze.
- Die v1.23.17_c1 Public-API-Closure der fünf Template-Filler-Module bleibt unverändert bei 28/28 dynamisch ausgeführten Public Methods.

# v1.23.17_c1

- Correction zur v1.23.17-Template-Filler-Modularisierung: `KRTemplateVerification.verifyTemplate()` ist kein Public Contract mehr, sondern internes Implementierungsdetail.
- Public-API-Audit der fünf neuen Template-Filler-Module: 29 -> 28 Public Methods; alle 28 verbleibenden Methoden werden dynamisch über ihre öffentlichen Modul-APIs getestet.
- Keine neue Runtime-/IPC-Grenze, keine Publish-Safety-Änderung; `.submit()`/`requestSubmit()` bleiben 0/0.
- Für v1.23.19 ist zusätzlich ein globaler Public-vs-Private-Audit über alle Runtime-Module verbindlich.

## 1.23.17

- Template Filler in fünf fachliche in-process Content-Module zerlegt: Category Flow, Form Fields/Attributes, Image Upload/Preview Stability, Verification und Publish/Paid-Insertion Flow.
- `src/content/template-filler.js` bleibt Lifecycle-Orchestrator und behält die bestehende `KRTemplateFill`-Public-API.
- Keine neue Runtime-/IPC-Grenze; Manifest, bestehender dynamischer Content-Bootstrap und Packaging laden die fünf Module vor dem Orchestrator.
- Publish-Safety unverändert: `.submit()` / `requestSubmit()` bleiben 0 / 0; Template-only veröffentlicht nie automatisch; Paid-Insertion bleibt fail-closed.
- Testarchitektur: neue Ownership-/Runtime-Verträge gegen Modul-APIs; historische lexikalische Tests verwenden ausschließlich testseitig eine zusammengesetzte Template-Filler-Source-Surface.
- Direkte Basis: technisch RELEASE_GREEN und für den c2-Correction-Scope nativ GREEN `1.23.16_c2`. Nächster planmäßiger Build: v1.23.18 – Inventory Runner modularisieren.

## 1.23.16_c2

- Correction-Patch für den verbleibenden c1-Lifecycle-Restfehler: Wird der bereits vorbereitete Papierkorb-Template-Zieltab geschlossen, während „Anzeige ist vorbereitet“ offen bleibt, wechselt das Modal jetzt sofort in-place auf „Vorbereiteter Tab wurde geschlossen“.
- Eventgetrieben über den bestehenden `chrome.tabs.onRemoved`-Listener; kein Polling. Nur die exakt getrackte `targetTabId` im Zustand `awaiting-publish` wird verarbeitet. Fremde Tab-Schließungen bleiben wirkungslos.
- Der Tab-Lifecycle-Listener verwendet nur einen bereits instanziierten Archive/Trash-UI-Controller und erzeugt für beliebige Tab-Schließungen keine neue UI-Komposition.
- Der c1-Recovery bleibt unverändert: „Anzeige neu vorbereiten“ öffnet nur nach Background-bestätigtem Target-Loss einen neuen Tab, veröffentlicht nichts automatisch und beendet den alten Fill kontrolliert als superseded. Kein automatisches Rebind eines wiederhergestellten Tabs.
- Kein neuer Message-Typ, keine neue Runtime-/IPC-Grenze und keine Änderung an Publish-/Account-/Profil-Safety (`.submit()` / `requestSubmit()` = 0 / 0).
- Technisch bleibt `manifest.version = 1.23.16`; sichtbar und in Artefakten wird `version_name = 1.23.16_c2` verwendet. Der reguläre nächste Build bleibt v1.23.17.

## 1.23.16_c1

- Correction-Patch für den im nativen v1.23.16-UI-Smoke gefundenen Papierkorb-Template-Recovery-Bug: Ein `template-only-complete`-Vorgang konnte nach Schließen seines Ziel-Tabs weiterhin den normalen Dialog „Anzeige ist vorbereitet“ öffnen, obwohl die Session an der alten `targetTabId` nicht mehr sicher fortsetzbar war.
- UI-Fix: Beim Status-Reopen wird der gespeicherte Zieltab geprüft. Ist er nicht mehr vorhanden, erscheint „Vorbereiteter Tab wurde geschlossen“ mit einem klaren, fail-closed Recovery-Hinweis. „Ins Inventar aufnehmen“ bleibt in diesem Zustand ausgeblendet/gesperrt.
- Recovery: „Anzeige neu vorbereiten“ öffnet nach expliziter Bestätigung einen neuen Kleinanzeigen-Tab mit derselben Papierkorb-Vorlage. Es wird weiterhin nichts automatisch veröffentlicht. Der Dialog weist darauf hin, vorher „Meine Anzeigen“ zu prüfen, falls die geschlossene Anzeige möglicherweise bereits manuell veröffentlicht wurde.
- Background-Safety: Der bestehende `START_TRASH_TEMPLATE_FILL`-Contract erhält optional `supersedeFillId`. Der alte Fill wird nur dann als `cancelled / template-only-target-tab-lost-superseded` markiert, wenn der Background selbst bestätigt, dass genau dessen `targetTabId` nicht mehr existiert. Ist der Tab noch offen oder nicht sicher prüfbar, wird kein zweiter Zieltab gestartet.
- Kein automatisches Rebind eines per Strg+Umschalt+T oder anderweitig wiederhergestellten Tabs anhand bloßer URL.
- Kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze; Publish-Safety bleibt unverändert (`.submit()` / `requestSubmit()` = 0 / 0).
- Technisch bleibt `manifest.version = 1.23.16`; sichtbar und in Artefakten wird `version_name = 1.23.16_c1` verwendet. Der reguläre nächste Build bleibt v1.23.17.

## v1.23.15 – Renewal Workflow Controller zerlegt

- `renewal-verification-flow.js`, `renewal-reinventory-flow.js` und `paid-checkout-recovery-service.js` aus dem bisherigen Controller extrahiert.
- `renewal-workflow-controller.js` hält weiter Retry-/Resume-/Publish-/Auto-Replacement-Ownership.
- Capability-Port-Dependencies statt neuer Runtime-/Message-/IPC-Grenzen; `renewalAttemptDetails` im Background nun explizit verdrahtet.
- Verhaltens-Characterization und neue Runtime-/Wiring-Regressionstests; finaler Gesamt-Soak/Performance erst v1.23.20.

# Changelog

## 1.23.14

- Inventory- und Trash-Rendering aus dem bisherigen großen Render-Controller in `inventory-card-renderer.js` und `trash-card-renderer.js` getrennt; gemeinsame belegte Card-Primitiven liegen in `record-card-view.js`.
- `inventory-render-controller.js` bleibt als kleine in-process Kompositions-/Kompatibilitätsfassade erhalten.
- Archive-Insertion-UI und Trash-Template-UI in getrennte Controller zerlegt; die bisherige kombinierte Fassade komponiert nur noch beide Owner.
- IndexedDB-Snapshot/Restore des Profil-Backups inklusive Collision-Checks und atomarem Inventories+Images-Replace in `profile-backup-storage-service.js` verschoben; UI-Lock/Picker/Import-/Export-Orchestrierung bleibt im Profil-Backup-Controller.
- Keine neue Runtime-/IPC-Grenze; Account-/Profil-, Publish-/Delete- und Workflow-Safety bleiben unverändert.
- Build-Recovery: externe GREEN-Checkpoint-ZIPs werden während des laufenden Builds direkt unter `/mnt/data` behalten und erst nach vollständig verifiziertem `RELEASE_GREEN` entbehrlich.
- Nächster regulärer Refactoring-Build: v1.23.15 – Renewal Workflow Controller zerlegen.


## 1.23.13_c2

- Correction-Build für den verbleibenden nativen Reentry-UI-Fehler aus v1.23.13_c1: Der Capture-State wurde bereits korrekt rehydriert, aber eine gleichzeitig aktive Activity konnte den sichtbaren Inventory-Progress-Shortcut durch die Single-currentActivity-Arbitration wieder ausblenden.
- Fix: Der Inventory-Progress-Shortcut bleibt sichtbarkeitsseitig beim `KRInventoryCaptureController`/`KRInventoryCaptureView` und wird nicht mehr vom zentralen Single-Slot-Visibility-Loop verdeckt.
- Bulk-Status-Activity und Inventory-Shortcut verwenden getrennte Activity-Identitäten, sodass ihre Slots sich nicht gegenseitig überschreiben. Background-Run, Reentry-Bindung, Stop-after-current, Reconciliation und Safety bleiben unverändert.
- Release-Recovery zusätzlich gehärtet: der detached Supervisor schreibt alle 120 Sekunden einen persistenten Status-Snapshot; lange Phasen werden wieder selbstständig bis zum nächsten belastbaren Meilenstein fortgeführt. Kurze Status-Polls, sichtbares Statusfeedback ungefähr alle fünf Minuten und externe hashverifizierte GREEN-Checkpoints bleiben verbindlich.
- Browser-E2E-Härtung: `bulk-runtime-lease-recovery` weist nach dem absichtlichen MV3-Service-Worker-Abbruch zuerst einen tatsächlich neuen Background-Epoch nach und prüft erst danach den Recovery-State. Damit wird eine reproduzierte Timing-Flake des Test-Harnesses beseitigt; der Produkt-/Runtime-Recovery-Code bleibt unverändert.
- Browser-E2E-Startup zusätzlich gehärtet: Der Szenario-Bootstrap triggert den MV3-Background aktiv über `GET_BACKGROUND_EPOCH` und verlangt einen gültigen Epoch plus registrierten Service-Worker. Der sporadische `bottom-clamp-four-views`-INFRA-Fail durch rein passive Worker-Erkennung wird damit im Harness geschlossen; Produktcode bleibt unverändert.
- Technisch bleibt `manifest.version = 1.23.13`; sichtbar und in Artefakten wird `version_name = 1.23.13_c2` verwendet. Der nächste reguläre Build bleibt v1.23.14.

## 1.23.13_c1

- Correction-Build für den nativen v1.23.13-Reentry-Fehler bei „Anzeigen erfassen“: Ein laufender Bulk-Inventurlauf blieb im Background korrekt aktiv, wurde nach Schließen und erneutem Öffnen der Manager-App aber nicht wieder in den Inventory-Capture-UI-State gebunden.
- Fix: `renderBulkState()` rehydriert einen laufenden, profilpassenden Run nur bei fehlendem/stalem Capture-State über den bestehenden `bindExistingBulkInventoryCapture()`-Pfad. Normale In-Session-Updates werden nicht wiederholt neu gebunden.
- Nach Rehydration bleibt bei geschlossenem Dialog ein kompakter „Fortschritt anzeigen“-Einstieg verfügbar. Reentry startet keinen zweiten Bulk-Workflow.
- Neues Diagnoseevent `UI_INVENTORY_CAPTURE_BULK_REENTRY_BOUND` dokumentiert den lokalen Rebind. Background-Run, Stop-after-current, Reconciliation, Account-/Profil-Safety und Runtime-/IPC-Grenzen bleiben unverändert.
- Technisch bleibt `manifest.version = 1.23.13`; sichtbar und in Artefakten wird `version_name = 1.23.13_c1` verwendet. Der nächste reguläre Build bleibt v1.23.14.

## 1.23.13

- Inventory Capture intern zerlegt: `src/app/inventory-capture-view.js` besitzt Dialog-, Step-, Progress-, Result- und Candidate-Rendering; `src/app/inventory-candidate-model.js` besitzt pure Kandidaten-Deduplizierung, Source-Priorisierung und stabile Inventar-/Papierkorb-/Neu-Klassifikation.
- `src/app/inventory-capture-controller.js` bleibt autoritativer Owner für Single-/Bulk-Start, Stop-after-current, Candidate-Discovery, Reentry, Emergency-Reset und Workflow-State-Transitions.
- App-Komposition verdrahtet beide neuen Module in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze.
- Historische Inventory-Capture-Characterizations wurden ausschließlich auf die neue Source-Ownership migriert; fachliche Assertions bleiben erhalten.
- v1.23.12_c1 ist direkte technisch und nativ grüne Basis; der `normalizeInventoryScope`-Regressionstest bleibt dauerhaft aktiv.
- Reale 3er-Performance-Abnahme bleibt planmäßig v1.23.20 vorbehalten, sofern vorher kein konkreter Performanceverdacht entsteht.

## 1.23.12_c1

- Correction-Build auf Basis des ausgelieferten v1.23.12: „Anzeigen erfassen“ scheiterte nativ beim Aufbau des Bulk-Inventar-Controllers mit `ReferenceError: normalizeInventoryScope is not defined`.
- Root Cause: Beim v1.23.12-Composition-Root-Refactor wurde der lokale Helper entfernt, während `requireBulkInventoryController()` den Dependency-Namen weiterhin übergab.
- Fix: `normalizeInventoryScope` wird im Background-Composition-Root direkt aus der bereits autoritativen `KRInventoryScope.normalizeInventoryScope`-Policy gebunden; keine neue Policy und keine Runtime-/IPC-Grenze.
- Neuer Regressionstest sichert die beiden betroffenen Bulk-Erfassungsrouten, den definierten Composition-Root-Binding und die unveränderte `all`/`new-only`-Semantik.
- Technisch bleibt `manifest.version = 1.23.12`; sichtbar und in Artefakten wird `version_name = 1.23.12_c1` verwendet. Der reguläre Buildplan bleibt unverändert; nächster regulärer Build ist v1.23.13.

# v1.23.12

- Composition Roots & Routing Cleanup auf der technisch und nativ grünen v1.23.11-Basis.
- `src/app/app-elements.js` übernimmt 233 Top-Level-DOM-Bindings aus `app.js` in strukturierte Gruppen; Verhalten und Selektoren bleiben unverändert.
- `src/app/profile-account-ui-controller.js` übernimmt Account-/Profil-Präsentationsprimitiven und Profilmanager-Rendering. Die belegten Compatibility-Mirrors `currentProfile`, `liveAccountState` und `liveAccountAmbiguousNames` wurden entfernt; `accountGateState` bleibt autoritativ und Profil-Mismatch bleibt fail-closed.
- `src/background/background-message-router.js` besitzt die explizite 82-Typen-Routentabelle. Message-Contract-Enforcement, Plattform-Safety-Gate und Fehlerdiagnose bleiben unverändert.
- `src/shared/renewal-policy.js` zentralisiert Safe/Fast-Normalisierung, 1..5-Attempt-Clamping, Attempt-/Retry-Policy und nicht-retrybare Safety-Klassifikation.
- Keine neue Runtime-/IPC-Grenze; neue Module laufen in-process über `KRDeps`. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben 0/0.
- Recovery-Härtung erweitert: wichtige GREEN-Zwischenstände werden während laufender Builds extern hashverifiziert gesichert; nach vollständig verifiziertem `RELEASE_GREEN` dürfen temporäre Zwischen-Checkpoints entfallen und die finale Release-Struktur wird alleinige Recovery-Authority.
- Der reale 3er-Performance-Lauf ist nicht Teil von v1.23.12; verbindlicher Abschluss bleibt v1.23.20, sofern vorher kein konkreter Performanceverdacht entsteht.

# Changelog

## 1.23.10

- EPIC-REF-002: Inventory Capture Controller vervollständigt; Single-Start, Bulk-Start, Stop-after-current und Reentry-Orchestrierung liegen nun im bestehenden in-process Controller.
- `app.js` delegiert Capture-Lifecycle-Aktionen nur noch dünn; keine neue Runtime-/IPC-Grenze.
- Bestehende Account-/Profilbindung, Reentry-Sicherheit, Bulk-Locks und kontrollierter Stop bleiben erhalten.
- Build-/Recovery-Härtung aus v1.23.9 bleibt verbindlich: kurze Status-Polls, sichtbarer 5-Minuten-Heartbeat und selbstenthaltende Release-Closure.

# v1.23.9

- `Control Accordion Controller` übernimmt Accordion-Zustand, kontrollierte/native Open-Semantik, Animation, Watchdog-/Stale-State-Recovery und Accordion-Diagnosesnapshot aus `app.js`.
- `Diagnostics Controls Controller` übernimmt Diagnose-ZIP-Download, fail-closed Diagnose-Reset-Sperren und den zweistufig bestätigten lokalen Emergency-Workflow-Reset aus `app.js`.
- `Renewal Settings Controller` übernimmt Voll-/Schnellprüfung, Fast-Mode-Erstbestätigung und begrenzte Versuche je Phase einschließlich Persistenz-/UI-Synchronisation.
- Alle drei Controller laufen in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze. Historische Tests wurden nur an die neue Source-Ownership angepasst.
- Packaged Browser-E2E deckte vor Release einen App-Boot-Fehler durch eine beim Accordion-Refactor verlorene `controlAccordionReducedMotion()`-Fassade auf. Der Fehler wurde gemäß RED→GREEN-Regel mit dauerhaftem Regressionstest behoben; die Fassade delegiert nun wieder an den Controller.
- Der Finalizer spiegelt den finalen Recovery-Checkpoint jetzt zusätzlich in den Release-Ordner, prüft `SHA256SUMS.txt` vor `RELEASE_GREEN` als vollständig lokale Closure und nimmt den Checkpoint in das Übergabepaket auf.
- Der gehärtete `release-finalize`-Gate und die verkettete Release-Pipeline bleiben verbindlich.

# v1.23.8

- `Account Session Controller` übernimmt Account-Probe-Integration, Account-Gate-Diagnosesnapshot und fail-closed Profil/Konto-Bindungsprüfung aus `background.js`.
- `Profile Management Controller` übernimmt Profilzustand, Auswahl, Erkennung, Legacy-Zuordnung, Backup-Import und sichere Profil-Löschung einschließlich bestehender Bulk-/Renewal-Sperren.
- Beide Controller laufen in-process über `KRDeps`; keine neue Runtime-/IPC-Grenze.
- Historische Characterization-Verträge wurden nur an die neue Source-Ownership angepasst; Safety-Assertions bleiben erhalten.
- Der seit v1.23.7 materialisierte `release-finalize`-Gate bleibt Teil der verbindlichen Release-Pipeline.

# v1.23.7

- EPIC-REF-002: Den vollständigen Diagnose-ZIP-Aufbau aus `background.js` in `src/background/services/diagnostic-export-service.js` extrahiert. `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze und delegiert `GET_DIAGNOSTIC_EXPORT` in-process über `KRDeps`.
- Source-Struktur bereinigt: alle 64 bisherigen Root-`*.js`-Dateien fachlich unter `src/shared/`, `src/background/{controllers,services,repositories,lib}/`, `src/content/`, `src/app/` und `src/popup/` organisiert; im Source-Root verbleiben 0 `*.js`. `scripts/source-layout.json` dokumentiert die Migration.
- Sämtliche Runtime-Referenzen wurden auf die neue Struktur migriert: Manifest-Service-Worker/Content-Scripts, App-/Popup-Scriptreihenfolge, Service-Worker-`importScripts()`, dynamischer Content-Bootstrap sowie Packaging-Dateiliste.
- Packaging-Closure wurde um deklarierte Runtime-Referenzen aus Manifest und HTML ergänzt; relative lokale `importScripts()`-Abhängigkeiten werden normalisiert und gegen das tatsächlich gepackte Chrome-Inventar geprüft.
- Historische Characterization-/Safety-Verträge wurden nur hinsichtlich der neuen Source-Ownership/Pfade angepasst; die fachlichen Assertions bleiben erhalten. Neue v1.23.7-Tests sichern Diagnostic-Export-Runtime, Path-Closure, Root-Layout und rekursiv 0 direkte `.submit()`/`requestSubmit()`-Bypässe.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; Gold-Baseline bleibt v1.21.15. Der reale 3er-Performance-Lauf bleibt für v1.23.12 reserviert, sofern vorher kein konkreter Performanceverdacht entsteht.
- Ab v1.23.7 ist ein eigener kontrollierter `release-finalize`-Gate mit Stage-State, RC/Wall/PID und eindeutigem `RELEASE_GREEN`-/DONE-Sentinel verbindlich.

# v1.23.6

- EPIC-REF-002: Verbliebene Bulk-Inventarisierungs-Orchestrierung aus `background.js` in den bestehenden `bulk-inventory-controller.js` überführt; Bulk-State/Persistenz bleibt über den bestehenden Guard abgesichert.
- Öffentliche Anzeigen-/Datums-Evidenz in `public-listing-evidence-service.js` extrahiert (öffentliche URL, Read-only-Metadaten, Ableitung/Erhalt des Anzeigendatums, Public-Availability-Snapshot).
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze.
- UI/UX: Recovery-Kachel ist zustandsabhängig: „Anzeige prüfen“, „Inventarisierung fortsetzen“, „Problem prüfen“ bzw. „Status öffnen“. Bei vorbereitetem Template-Fill fokussiert „Anzeige prüfen“ nach Möglichkeit direkt den vorhandenen Kleinanzeigen-Tab; sonst Fallback auf Recovery-Dialog.
- Packaging-Closure und packaged Browser-E2E bleiben verbindliche Release-Gates; kein realer 3er-Performance-Lauf für diesen Refactoring-Schritt.

# v1.23.5

- EPIC-REF-002: Archive-Insertion-State-Machine aus `background.js` nach `archive-insertion-controller.js` extrahiert. `archive-insertion-service.js` bleibt Owner der revisionierten Session-Persistenz.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; `background.js` bleibt Service-Worker-Router und globale Lifecycle-/Emergency-Reset-Grenze.
- Lifecycle-Fix: `complete / template-only-complete` wird durch einen späteren Emergency Reset nicht mehr rückwirkend auf `cancelled / manual-emergency-reset` umgeschrieben. `template-only-published` bleibt bis zur Inventarisierung weiterhin recovery-/reset-fähig.
- Neue RED→GREEN-Verträge für Archive-Ownership, Controller-Runtime, terminale Template-Fills und v1.23.5-Architektur.
- Packaging-Closure und packaged Browser-E2E bleiben verbindliche Release-Gates.

# v1.23.4

- EPIC-REF-002: Template-Fill-Orchestrierung aus `background.js` in `template-fill-controller.js` extrahiert.
- Globalen Inserierungs-/Austausch-Lock in `insertion-lock-service.js` extrahiert.
- Keine neue Chrome-Runtime-/Message-/IPC-Grenze; Safety-/Publish-Semantik unverändert.
- Packaged-E2E- und importScripts-Closure-Gates bleiben verbindlich.

# v1.23.3

- EPIC-REF-002 Schritt 2: Die Mass-Renewal-Ablaufsteuerung wurde aus `background.js` in den neuen `mass-renewal-workflow-controller.js` extrahiert. Der bestehende `mass-renewal-controller.js` bleibt Eigentümer von Batch-State/Persistenz; der neue Controller besitzt Start/Next/Retry/Resume/Stop/Watchdog und die Verknüpfung zum Einzel-Renewal.
- Keine neue Runtime-/IPC-Grenze: der Workflow-Controller läuft im selben MV3-Service-Worker und wird über `KRDeps` verdrahtet. `background.js` behält Routing, globale Lifecycle-Hoheit und delegierende Brücken.
- Die v1.23.2-Packaging-Härtung bleibt verbindlich: lokale `importScripts()`-Dependency-Closure und Browser-E2E gegen den entpackten erzeugten Chrome-ZIP.
- Kein realer 3er-Performance-Lauf für diesen Refactoring-Schritt; das verbindliche reale Performance-Gate bleibt v1.23.12, sofern vorher kein konkreter Verdacht entsteht.

# v1.23.2

- Correction-Build für den defekten v1.23.1-Chrome-Release: `renewal-workflow-controller.js` wird jetzt tatsächlich in das Chrome-Paket aufgenommen.
- Neuer dauerhafter Packaging-Closure-Gate: jede lokale `importScripts()`-Abhängigkeit einer gepackten Runtime-Datei muss ebenfalls im Chrome-Paket enthalten sein.
- Browser-E2E kann über `KR_E2E_EXTENSION_ROOT` gegen den entpackten **erzeugten Chrome-ZIP** laufen; Release-Abnahme testet damit nicht mehr nur den Source-Root.
- Keine Änderung der Renewal-Fachsemantik oder Runtime-Topologie gegenüber der korrigierten v1.23.1-Source.
- Der ursprünglich für v1.23.2 geplante Mass-Renewal-Refactor verschiebt sich auf v1.23.3; der finale EPIC-REF-002-Soak/3er-Performance-Gate verschiebt sich entsprechend auf v1.23.12.

# v1.23.1

- EPIC-REF-002 Schritt 1: Die Renewal-Workflow-State-Machine wurde aus `background.js` in den neuen `renewal-workflow-controller.js` extrahiert. `background.js` behält nur delegierende Brücken sowie die Service-Worker-/Emergency-Reset-Lifecycle-Hoheit.
- Keine neue Runtime-/IPC-Grenze: der Controller läuft im selben MV3-Service-Worker und wird über `KRDeps` verdrahtet.
- Renewal-Characterization, Ownership- und Runtime-Tests sichern Skeleton/Persistenz, Fast-/Safe-Verifikation, Publish-Bestätigung, Checkout-Recovery und Service-Worker-Resume. Historische Source-Surface-Tests wurden ausschließlich an die neue Ownership angepasst.
- Browser-E2E fand vor Release eine fehlende explizite `globalThis.KRDeps`-Bindung im neuen `importScripts`-Modul. Der MV3-Bootfehler wurde test-/E2E-gesichert behoben; Haupt- und Fresh-Source-Browser-E2E sind 9/9 grün.
- Safety unverändert: globaler Emergency Reset bleibt account-unabhängig und lokal; Remote-Mutations-/Account-/Profil-/Publish-/Delete-Gates bleiben unverändert; keine neue `.submit()`-/`requestSubmit()`-Grenze.
- Kein realer 3er-Performance-Lauf für diesen Patch; das verbindliche reale Performance-Gate bleibt v1.23.11, sofern vorher kein konkreter Verdacht entsteht.

# v1.23.0

- Start von **EPIC-REF-002** als zweite vollständige Modularisierungswelle für die verbliebenen Verantwortungen in `app.js` und `background.js`.
- v1.23.0 verschiebt bewusst **noch keine Produkt-/Runtime-Logik**. Die Runtime-Bytes von `app.js` und `background.js` bleiben gegenüber der kanonischen v1.22.30-Basis unverändert.
- Neue versionsübergreifende Characterization deckt alle 14 vorgesehenen Extraktionsspots ab und ist vor der Versionierung auf unverändertem v1.22.30 grün festgeschrieben.
- Neues `architecture-baseline-v1.23.0.json` dokumentiert Source-Hash/LOC-Baseline, 14 Ownership-Ziele, v1.23.1–v1.23.11-Wellenplan und die Regel, dass Modularisierung keine neue Chrome-Runtime-/IPC-Grenze erzeugen darf.
- Reale 3er-Performance-Läufe werden wegen der knappen freien Anzeigen **nicht pro Patch** erzwungen. Verbindliches Real-Performance-Gate ist v1.23.11; ein Zwischenlauf erfolgt nur bei konkretem Performanceverdacht. Referenzwerte auf dem langsamen Rechner: v1.20.3 = 93,744 s, v1.22.30 = 99,332 s.
- Safety unverändert: account-unabhängiger lokaler Emergency Reset, Publish-/Delete-/Replacement-/Account-/Profil-Gates und 0 direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verbindlich.

# v1.22.30

- `Alle Prozesse abbrechen` ist jetzt eine rein lokale, account-unabhängige Lifecycle-Grenze. Der Reset führt keine Remote-/Account-Verifikation aus und gibt globale Workflow-/Inserierungs-Locks frei.
- Remote-unsichere Post-Publish-Zustände werden lokal terminal als `cancelled / emergency-reset-unverified` mit `remoteVerification=unverified` und `remoteVerificationRequired=true` markiert; sichere Pre-Publish-Zustände bleiben `cancelled / manual-emergency-reset`.
- Reset-Generation-Fences verhindern nach einem parallelen Notfall-Reset spätere Single-/Bulk-Starts sowie insbesondere einen Phase-4-Delete. Persistente Reset-Tombstones schützen Renewal-, Fill-, Archive-, Bulk- und Mass-Zustände vor stale asynchronen Writes.
- Lokale UI-Zustände für Profiltransfer, Inventory-Capture, Renewal-/Mass-Dialoge und Archive-/Trash-Insertion werden beim Reset ebenfalls freigegeben. Managed Workflow-Tabs werden geschlossen; Remote-Safety-Gates und der getrennte read-only Checkout-Recovery-Pfad aus v1.22.29 bleiben erhalten.
- Release-Recovery verwendet durable Checkpoint-ZIPs und `BUILD-STATE-v1.22.30.json` zwischen den Gates.

# v1.22.29

- Neuer fail-closed Recovery-Pfad für einen abgebrochenen kostenpflichtigen Checkout nach bereits überschrittener Publish-Grenze. Ein alter `needs-review / manual-emergency-reset`-Renewal wird nicht mehr dauerhaft nur deshalb gesperrt, weil nach dem Publish-Klick `/m-bestellung-aufnehmen.html` erreicht wurde; er wird aber ausdrücklich **nicht** allein aufgrund von `newAdId=null` oder des Checkout-Pfads freigegeben.
- Recovery ist nur nach unabhängiger read-only Remote-Prüfung zulässig: Ein frischer, vollständiger Mehrseiten-Scan von „Meine Anzeigen“ muss im ursprünglich gebundenen Konto erfolgen, die Quellanzeige muss weiterhin remote vorhanden sein und jede aktuell gefundene Anzeigen-ID muss bereits vor `publishClickedAt` lokal nachweisbar gewesen sein. Falsches Konto, unvollständiger Roster/Count-Mismatch, fehlende Quellanzeige oder auch nur eine unbekannte Remote-ID halten den Lock fail-closed.
- Der Recovery-Worker verwendet den bestehenden `MY_ADS_STATUS`-Vertrag mit `fullRoster:true`; er führt keine Veröffentlichung, Zahlung, Löschung oder sonstige Remote-Mutation aus. Nach bestätigter Evidenz wird ausschließlich der lokale Renewal zu `cancelled / checkout-aborted-verified` terminalisiert; ein zugehöriges Mass-Renewal-Item wird ebenfalls lokal terminalisiert.
- Neue Diagnoseevents: `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_STARTED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_CONFIRMED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_BLOCKED`, `RENEWAL_CHECKOUT_RECOVERY_VERIFICATION_FAILED` und `RENEWAL_CHECKOUT_ABORT_RECOVERED`. Künftige Checkout-Fälle persistieren zusätzlich `checkoutObservedAt`/`checkoutPath`; öffentliche Renewal-Snapshots enthalten `publishClickedAt` und Checkout-Recovery-Evidenz.
- Die seit v1.22.27 etablierte Browser-E2E-Supervisor/Child-Prozessarchitektur bleibt unverändert. Lange Release-Schritte werden weiterhin als kontrollierte lokale Prozesse mit Log, Return-Code, Wall-Clock und kurzen Statusabfragen ausgeführt; diese Regel bleibt verpflichtender Bestandteil jedes zukünftigen Handovers.

# v1.22.28

- Behebt einen Legacy-/Migration-Lifecycle-Bug aus v1.22.26/v1.22.27: Ein bereits per Notfall-Reset beendeter Renewal in `needs-review / manual-emergency-reset` ohne jede Publish-Grenze blockiert den globalen Inserierungs-Lock und damit den Diagnose-Reset nicht mehr.
- Die Freigabe ist konservativ: `newAdId`, `publishClickedAt`, `submitted`/`publish-submitted`, `newIdConfirmedAt`, öffentliche Ziel-URL, Vergleichs-/Public-Availability-Evidenz oder Phase-2+-Versuche gelten als Publish-/Post-Publish-Evidenz und halten den Lock weiterhin fail-closed.
- Beim Service-Worker-Recovery wird ein eindeutig unveröffentlichter Legacy-Notfall-Reset lokal zu `cancelled / manual-emergency-reset` migriert; bei Mass-Renewal-Zuordnung wird die Session terminal markiert. Es erfolgt keine Remote-Mutation.
- Der Diagnosebereich zeigt bei blockiertem Reset nun den konkreten Workflow-/Lock-Grund; bei Inserierungs-Locks werden Lock-Typ, Owner-ID sowie Status/Stage sichtbar ausgegeben.
- Build-/Testausführung bleibt auf dem v1.22.27 eingeführten Supervisor-/Child-Modell. Lange Release-Schritte werden zusätzlich als kontrollierte Prozesse mit kurzen Statusabfragen ausgeführt, damit Chat-/Tool-Unterbrechungen nicht mit echten Build-Hängern verwechselt werden. Diese Regel ist dauerhaft in zukünftigen Handovers zu dokumentieren.

# v1.22.27

- Behebt den nativen v1.22.26-Restfehler, bei dem ein eindeutig **vor Publish** erkannter `paid-insertion-required`-Renewal den globalen Inserierungs-Lock weiter halten konnte. Die Lock-Policy liegt jetzt in `renewal-state-repository.js` und gibt ausschließlich eindeutig unveröffentlichte Paid-Insertion-Fälle frei; Checkout-/`publish-submitted`-/New-ID-Fälle bleiben fail-closed gesperrt.
- Paid-Insertion-Provenienz (`phase`, `source`, `pathname`, `amount`, `detectedAt`) wird aus `template-filler.js` in Fill- und Renewal-State persistiert. Bereits unter v1.22.26 gespeicherte Paid-Insertion-Zustände ohne diese Metadaten können ebenfalls sicher erkannt werden, sofern keine Publish-Grenze nachweisbar ist.
- Der Notfall-Reset setzt einen sicher unveröffentlichten Paid-Insertion-Fill und den zugehörigen Renewal auf `cancelled / manual-emergency-reset`; lokale Quelldaten bleiben erhalten und es erfolgt keine Remote-Mutation. Unsichere Post-Publish-Fälle werden dadurch nicht entsperrt.
- Browser-E2E läuft ab v1.22.27 über `tests/e2e/run_browser_e2e_supervisor.py`: jedes Szenario eigener Python-/Playwright-/Chromium-Prozess, eigenes Temp-Profil, harter Szenario- und Cleanup-Timeout, gezieltes Process-Tree-Kill und aggregierter Report mit getrenntem `scenarioStatus` / `cleanupStatus`.
- Die Chromium-Policy bleibt außerhalb des Supervisors; Release-Orchestrierung muss jede temporäre Policy-Änderung weiterhin durch einen äußeren `try/finally`/Trap schützen und den ursprünglichen Policy-Hash restaurieren.

## 1.22.26

- Stabilisierung / Soak / Gold-Parität: behebt die wiederholt beobachteten `UI_ACTION_STATE_DESYNC_DETECTED`-Fenster bei `insertion-lock-sync` und unmittelbar beim Bulk-Start. Einzel- und Vollerfassungsaktionen verwenden nun dieselbe autoritative Disable-Ableitung; ein gemeinsamer `syncInventoryActionStates()`-Pfad synchronisiert beide Buttons vor dem Diagnose-Snapshot.
- Paid-Insertion-Safety: neue `paid-insertion-guard.js` erkennt den real beobachteten Kleinanzeigen-Hinweis „Anzeigenlimit erreicht. Das Einstellen dieser Anzeige ist kostenpflichtig.“ bereits nach Kategorieauswahl sowie als Fallback die Checkout-Seite `/m-bestellung-aufnehmen.html` mit Warenkorb/Einstellgebühr/„Zur Bezahlung“.
- Bei erkannter Kostenpflicht wird Auto-Publish fail-closed gestoppt. Die Fill-/Renewal-Position wird `paid-insertion-required`, „Mehrere neu inserieren“ hält kontrolliert mit Attention an, weitere queued Positionen werden nicht automatisch gestartet und die alte Quellanzeige bleibt unangetastet.
- Die Extension wählt niemals eine Zahlungsart, bestätigt keine Zahlungs-/Widerrufscheckbox und klickt niemals „Zur Bezahlung“. Diagnoseevents unterscheiden Pre-Publish- und Checkout-Erkennung (`PAID_INSERTION_REQUIRED_DETECTED_PRE_PUBLISH`, `PAID_INSERTION_CHECKOUT_DETECTED`, `MASS_RENEWAL_PAID_INSERTION_STOPPED`).
- Message-Contract-Enforcement und der v1.22.25_c1-Bootstrap-Fix bleiben erhalten; `paid-insertion-guard.js` ist sowohl im Manifest- als auch im dynamischen Content-Script-Stack und im Chrome-Paket enthalten.
- Test-first: neue Characterization sowie RED→GREEN-Regressionssuiten für Action-State-Synchronisierung und Paid-Insertion. Historische Test-Harnesses wurden nur an die neue explizite Action-State-Dependency/Ownership angepasst; fachliche und Safety-Assertions bleiben erhalten.
- Keine neuen Remote-Mutationen, keine automatische Zahlung und keine Submit-Bypässe.

## 1.22.25_c1

- Correction-Build auf v1.22.25: repariert den dynamischen Content-Script-Bootstrap für bereits geöffnete Kleinanzeigen-Tabs nach einem Extension-Update.
- `CONTENT_SCRIPT_FILES` spiegelt wieder exakt den Manifest-Stack und injiziert `message-contract-registry.js` direkt nach `runtime-deps.js`.
- `content.js` und `inventory-runner.js` akzeptieren einen alten partiellen Boolean-Bootstrap-Guard nicht mehr als vollständige Initialisierung; `ready` wird erst nach erfolgreicher Registry-Auflösung gesetzt. Dadurch kann ein unter v1.22.25 fehlgeschlagener Bootstrap im selben Tab erneut sauber initialisiert werden.
- Message-Contract-Enforcement, Account-/Profil-Safety und Remote-Mutationsgrenzen bleiben unverändert.

## 1.22.25

- Message-Contract-Enforcement aktiviert: `message-contract-registry.js` bleibt die zentrale Registry der 102 bekannten Verträge, meldet jetzt aber `mode=enforced` und `enforcement=true`.
- Background-Router lehnt unbekannte oder an den falschen Ziel-Router adressierte Runtime-Requests vor jeder fachlichen Verarbeitung fail-closed mit stabilen Fehlercodes (`KR_MESSAGE_CONTRACT_UNKNOWN` / `KR_MESSAGE_CONTRACT_TARGET_MISMATCH`) ab und protokolliert `MESSAGE_CONTRACT_REJECTED`.
- Die parallel im Kleinanzeigen-Tab geladenen Router `content.js` und `inventory-runner.js` akzeptieren ausschließlich ihre registrierten Zielverträge. Ein für den jeweils anderen registrierter Contract wird bewusst nur ignoriert, damit kein Response-Race entsteht; wirklich unbekannte Message-Typen werden fail-closed beantwortet und diagnostiziert.
- Der App-Broadcast-Listener akzeptiert ausschließlich die drei registrierten App-Broadcasts; andere registrierte Zieltypen werden ignoriert, unbekannte Typen diagnostiziert.
- Der Contract-Inventarbestand bleibt unverändert bei 102 Typen: 82 Background, 10 Content, 7 My-Ads-Content, 3 App-Broadcasts.
- Test-first: unveränderte Pre-Enforcement-Characterization 5/5 PASS; neue Enforcement-Contract- und Runtime-Suiten waren auf v1.22.24 bewusst RED und sind nach Umsetzung 7/7 bzw. 6/6 PASS. Historische VM-Tests erhalten ausschließlich testseitig eine minimale Registry-Kompatibilitätsdependency; die v1.22.25-Enforcement-Tests laden die echte Registry.
- v1.22.24 wurde nativ als grün bestätigt. Die dort ergänzte Diagnoseausgabe `versionName` bleibt erhalten.
- Publish-/Renewal-/Delete-/Account-/Profil-/Notfall-Reset-Safety unverändert; keine neuen Remote-Mutationen und keine Submit-Bypässe.

## 1.22.24

- Architektur: neue `message-contract-registry.js` als zentrale, explizite Registry der derzeit bekannten Extension-Message-Verträge. Die Registry wird über `KRDeps` bereitgestellt und katalogisiert Background-, Content-, My-Ads-Content- und App-Broadcast-Typen.
- v1.22.24 ist bewusst kompatibel/diagnostisch: `enforcement=false`; bestehende Router und Safety-Gates bleiben fachlich unverändert. Unbekannte Nachrichten werden weiterhin durch die bisherigen Router behandelt bzw. fail-closed abgewiesen, nicht durch die Registry.
- Diagnose: `environment.json` enthält den Registry-Snapshot (`schemaVersion`, Modus, Enforcement-Status, Typanzahl je Ziel) und zusätzlich `versionName`; Summary/Diagnose-ZIP verwenden die sichtbare Manifest-Version, wenn `version_name` vorhanden ist.
- Background-Fehlerdiagnosen enthalten zusätzlich den Message-Contract-Status des fehlgeschlagenen Requests.
- Test-first: Pre-Refactor-Characterization, Registry-Contract und Runtime-Coverage sichern die bestehende Router-Semantik und die Registry-Abdeckung.
- Publish-/Renewal-/Delete-/Account-/Profil-/Notfall-Reset-Safety unverändert; keine neuen Remote-Mutationen.

## 1.22.23_c1

- Correction-Build auf Basis v1.22.23: Ein bereits archivierter, unveränderter terminaler Bulk-Erfassungsstatus wird bei späteren allgemeinen Refreshes nicht erneut als aktuelle Meldung hervorgeholt. Er bleibt im Meldungsverlauf erhalten.
- Inhaltlich geänderte terminale Bulk-Ergebnisse dürfen weiterhin erneut als aktuelle Meldung erscheinen; laufende Bulk-Vorgänge bleiben unverändert sichtbar/recoverable.
- Der v1.22.23-Notfall-Reset und sämtliche Backend-/Remote-/Safety-Gates bleiben unverändert.
- Sichtbare Versionsbezeichnung ist `v1.22.23_c1`; das Chrome-konforme technische Manifest bleibt `1.22.23` und nutzt `version_name: 1.22.23_c1`.


## v1.22.23_c2

- Korrektur auf v1.22.23_c1: Beim erfolgreichen Notfall-Reset wird die aktive Trash-Template-Recovery-Meldung vor dem Entfernen aus dem aktiven Slot als terminale Historienmeldung „Vorlagen-Inserat zurückgesetzt“ archiviert.
- Der Archiveintrag enthält keine Fortsetzen-Aktion; lokale Quelldaten bleiben unverändert, Remote-/Reset-Safety bleibt unverändert.
- Der reguläre Buildplan bleibt unverändert; technisch bleibt `manifest.version` Chrome-konform auf `1.22.23`, sichtbar ist `version_name=1.22.23_c2`.

## 1.22.23

- Hotfix: Der Notfall-Reset entfernt nach erfolgreichem Reset jetzt auch die persistente Trash-Template-Recovery-Meldung sofort und räumt den zugehörigen UI-Trackingzustand auf. Ein zusätzlicher Broadcast-Hook verhindert, dass die veraltete Recovery-Kachel nach dem Reset sichtbar bleibt. Backend-/Safety-/Remote-Mutationslogik bleibt unverändert.

# v1.22.22

- Notfall-Reset-Fix: fachlich offene Trash-Template-Sessions `complete / template-only-complete` und `complete / template-only-published` werden von „Laufende Vorgänge zurücksetzen“ erfasst und als `cancelled / manual-emergency-reset` terminalisiert. `template-only-inventoried`, `needs-review` und `error` bleiben terminal und werden nicht erneut resetbar gemacht.
- Der Reset evictet den kurzlebigen Template-Bildtransfer-Cache; Inventar, Papierkorb, lokale Bilder, Profile und Einstellungen bleiben erhalten, und es wird keine Remote-Mutation auf Kleinanzeigen ausgelöst.
- Legacy-/Facade-/Global-Cleanup: `KRDeps` ist die einzige produktive Registry für KR-Modul-APIs; redundante `globalThis.KR…`-/`root.KR…`-Publikationen und der Legacy-Global-Fallback von `runtime-deps.js` wurden entfernt.
- `background.js`, `content.js` und `platform-guard-content.js` verlangen die Runtime-Registry explizit; historische VM-Tests erhalten Legacy-Aliase ausschließlich testseitig über `tests/v12222-vm-legacy-bridge.cjs`.
- Die tote `MANAGED_WORKER_TABS_KEY`-/`readManagedWorkerTabs`-/`writeManagedWorkerTabs`-Fassade wurde entfernt.
- Test-first: die v1.22.22-Pre-Refactor-Characterization/Runtime-Dateien bleiben SHA-256-byteidentisch; zusätzliche Reset-, Cleanup- und Runtime-Ownership-Regressionen sichern die neue Grenze.
- Keine Abschwächung der Publish-/Renewal-/Delete-/Account-/Profil-Safety; direkte Runtime-`.submit()`-/`requestSubmit()`-Bypässe bleiben 0.

# v1.22.21

- Architektur: Remote-Delete-/Replacement-Fachlogik aus `background.js` in `remote-delete-replacement-service.js` ausgelagert; `background.js` bleibt Service-Worker-Orchestrator mit dünnen Kompatibilitätsfassaden.
- Safety unverändert: Remote-Löschen gilt erst nach unabhängiger frischer Abwesenheitsprüfung als erfolgreich; lokale Promotion erfolgt erst danach atomar inklusive Bilddaten.
- Target-Tab-Ownership, Transport-Unterbrechungsbehandlung, Replacement-Cleanup und lokales Entfernen eines verifizierten Replacement-Candidates liegen im neuen Service.
- Keine neue Remote-Löschfunktion für Endnutzer hinzugefügt; bestehende Renewal-Safety- und Account-/Profil-Gates bleiben unverändert.

# v1.22.20

- Stabilitätsfix: Papierkorb-Template-Recovery lädt den Quelldatensatz bei leerem lokalen Trash-Cache frisch nach, bevor Titel/Metadaten/Titelbild gerendert werden.
- Behebt fehlendes Vorschaubild im Recovery-Dialog nach App-/Extension-Neustart.
- Keine Änderung an Publish-, Account-, Profil- oder Capture-Safety-Gates.

# v1.22.19

- Stabilitätsfix: Ein neu geöffneter Papierkorb-Vorlagen-Draft besitzt jetzt eine explizite Dialog-Ownership/Revision und kann nicht mehr durch eine ältere recoverable Session überschrieben werden.
- Passive periodische Recovery-/Lock-Synchronisation aktualisiert weiterhin die Meldungs-Kachel, übernimmt aber keinen konkurrierenden lokalen Draft.
- Verspätete asynchrone Recovery-Antworten werden über die Dialogrevision verworfen. Nur der explizite Nutzerpfad „Vorgang fortsetzen“ darf die persistierte Recovery-Session in das Modal übernehmen.
- Bestehende Recovery-Preview, Activity-Kachel, Confirmation→Capture-Safety und finaler Publish-Hinweis bleiben erhalten.

# v1.22.18

- Stabilitäts-/UI-Fix: Papierkorb-Template-Recovery rekonstruiert Titel, Metadaten und Titelbild vollständig aus dem lokalen Papierkorb-Datensatz.
- Recovery-Einstieg ist keine permanente Hauptaktion mehr; stattdessen erscheint eine persistente Meldungs-Kachel mit „Vorgang fortsetzen“ für aktive, `template-only-complete`- und `template-only-published`-Sessions.
- Nach `template-only-inventoried` verschwindet die Recovery-Kachel.
- Template-Only-Zwischenstep-Toasts zeigen den cyanfarbenen Hinweis „Nicht veröffentlicht …“ nicht mehr; der Hinweis bleibt ausschließlich im finalen `template-only-complete`-Endzustand.

# v1.22.17

- Stabilitätsfix: Papierkorb-Template-Fill kann nach Extension-Neustart über „Vorlagen-Inserat fortsetzen“ wieder geöffnet werden.
- Finaler Capture wechselt nach bestätigter `addId` kontrolliert in die eigene Bearbeiten-Ansicht und prüft Own-Ad/ID erneut.
- Erfolgreicher finaler Capture terminalisiert die Template-Session als `template-only-inventoried`.

## 1.22.16

- Extrahiert Renewal-Session-Persistenz/Retention/Snapshot-Semantik in `renewal-state-repository.js`; `persistRenewalSession()` und die separat geplante A3a-Mutationsgrenze bleiben bewusst im Orchestrator bzw. Backlog.
- Extrahiert Template-Fill-State, serielle Fill-Mutationen, Source-Readiness/Payload, Watchdog-Terminalisierung und den kurzlebigen Bildtransfer-Cache in `template-fill-service.js`.
- Extrahiert Archive-Insertion-Session-Persistenz, monotone Revisionen, öffentliche Snapshots und Meta/Status in `archive-insertion-service.js`; Browser-/Publish-/Verification-Orchestrierung bleibt im `background.js`.
- Historische Source-Location-Verträge wurden auf die neuen Modulbesitzer umgestellt, ohne fachliche/Safety-Assertions abzuschwächen.
- Keine beabsichtigte fachliche Änderung; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten.

## 1.22.15

- Behoben: Einzelinventur konnte nach erfolgreichem Speichern beim Ergebnis-Rendering mit `appendDerivedListingDateBadge is not defined` scheitern.
- Refactoring: Mass-Renewal State/Progress/Stop/Finalisierung in `mass-renewal-controller.js` ausgelagert.
- Refactoring: Renewal-Semantikvergleich und Verification-Outcomes in `renewal-verification-service.js` ausgelagert.
- Browser-/Safety-Orchestrierung der Verifikation bleibt bewusst in `background.js`.

## 1.22.14 – Single-/Bulk-Inventur-Controller + Notfall-Reset-UX

- Single-Inventur-Workflow in `single-inventory-controller.js` ausgelagert; Account-/Profilbindung, Own-Ad-Prüfung, Edit-/Read-only-Worker und garantiertes Worker-Cleanup bleiben semantisch unverändert.
- Bulk-Inventur-State-Machine in `bulk-inventory-controller.js` ausgelagert: Run-Initialisierung, Progress-Patches, Existing-Skip-/Result-Accounting, kontrollierter Stop, Worker-Close und Fail-Transition. Browser-/DOM-nahe Worker-Extraktion, Fresh-Source-Orchestrierung, Reconciliation-Finalisierung und Retry bleiben bewusst im Service-Worker-Orchestrator.
- Notfall-Reset-UI korrigiert: Normal- und Bestätigungszustand besitzen erklärende Tooltips und `aria-label`; nach Ablauf des 10-Sekunden-Fensters werden Buttontext, Tooltip/ARIA und der zugehörige Bestätigungshinweis gemeinsam zurückgesetzt. Ein Revision-Guard verhindert, dass dabei ein inzwischen neuerer Diagnose-/Statushinweis überschrieben wird.
- Erwartbarer verspäteter `BULK_CLOSE_WORKER` nach bereits erfolgter Runtime-Recovery wird als `BACKGROUND_REQUEST_EXPECTED_BULK_CLOSE` auf Info-Level klassifiziert statt als Fehler.
- v1.22.13 bleibt funktional nativ bestanden; v1.22.14 benötigt native Smoke-Abnahme für Single/Bulk-Controller und Notfall-Reset-UX.

## 1.22.13 – Bulk-Inventur Deadlock-/Recovery-Härtung

- Behebt den nativen v1.22.12-Smoke-Test-Fehler, bei dem ein `BULK_EXTRACT_SAVE_WORKER`-Request unbegrenzt hängen konnte und dadurch die nominelle 90-Sekunden-Worker-Deadline nicht mehr erreicht wurde. `inventory-runner.js` verwendet nun einen separaten 15-Sekunden-Request-Timeout, jeweils gedeckelt durch die verbleibende absolute Item-Deadline.
- Neues `bulk-run-guard.js`: serialisiert persistente Bulk-State-Schreibvorgänge, verhindert die Wiederbelebung terminaler Runs durch veraltete `running`-Snapshots und führt eine monotone `stateRevision`.
- `tab-lifecycle-observer.js` mutiert Bulk-Zustände atomar. Parallele `tabs.onRemoved`-Ereignisse für Source-/Worker-/Metadata-Tabs können `needs-review` nicht mehr mit einem älteren `running`-Stand überschreiben.
- Independent Background-Watchdog mit 110-Sekunden-Hard-Limit für `opening-worker`/`worker-open`/`saving-worker`. Bei Überschreitung wird der Run fail-safe `needs-review / worker-timeout`, Worker werden geschlossen und Source-Ownership wird freigegeben bzw. ein automatisch erzeugter Source-Tab geschlossen.
- Laufende Bulk-Runs besitzen eine Runtime-Lease in `chrome.storage.session`. Fehlt diese Lease nach Extension-Reload, Browser-Neustart oder vergleichbarem Runtime-Verlust, wird ein persistiertes `running` automatisch zu `needs-review / runtime-session-lost` statt die UI dauerhaft zu sperren.
- Unter „Diagnose“ gibt es zusätzlich „Laufende Vorgänge zurücksetzen“. Die Aktion benötigt einen zweiten Bestätigungsklick und beendet ausschließlich Laufzeit-/Workflow-Zustände und Managed Worker; Inventar, Papierkorb, Profile, lokale Bilder und Einstellungen bleiben erhalten und auf Kleinanzeigen werden keine Anzeigen verändert oder gelöscht.
- RED→GREEN: neue Deadlock-/Timeout-, Guard- und parallele Lifecycle-Race-Regressionen. Alle bestehenden v1.22.12-Verträge bleiben grün; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben 0.
- v1.22.13 ist bewusst ein Stabilitätsrelease. Der zuvor für v1.22.13 geplante Refactoring-Schritt „Single Inventory + Bulk Inventory Controller“ rückt auf v1.22.14; die folgenden Refactoring-Ziele verschieben sich entsprechend um eine Version.

## 1.22.12 – Managed Tabs/Workers, Content Connection, Account Probe, Platform Safety und Tab Lifecycle modularisiert

- **Test-vor-Refactoring strikt eingehalten:** 10/10 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.11 grün festgeschrieben und bleiben nach der Extraktion byteidentisch. Anschließend kamen 11/11 Ownership-/Architektur- und 5/5 Runtime-Modultests hinzu.
- Neue `managed-tab-worker-service.js`, `content-connection-manager.js`, `account-probe-service.js`, `platform-safety-controller.js` und `tab-lifecycle-observer.js` übernehmen technische Tab-/Worker-, Content-Verbindungs-, Kontoprüf-, Plattform-Safety- und Lifecycle-Zustände.
- `background.js` bleibt Service-Worker-Orchestrator: fachliche Workflow-, Account-/Profil- und Remote-Mutationsentscheidungen bleiben dort bzw. in den bereits bestehenden Services; die neuen Module werden per Dependency Injection eingebunden.
- Managed Worker werden weiterhin zuerst als `about:blank` registriert und erst danach zum Ziel navigiert; Content-Bootstrap behält Loading-Deferral, kontrollierte Close-Semantik und Handshake-Retries; Account-Probes bleiben isoliert, retry-begrenzt und schließen ihren Worker zuverlässig.
- Plattformzugriffssperren bleiben fail-closed: Remote-Aktionen werden blockiert, laufende Workflows sicher in Review-/Stop-Zustände überführt und verwaltete Worker beendet. Tab-Lifecycle behandelt weiterhin verworfene/discarded Worker und unerwartet geschlossene Tabs kontrolliert.
- Keine beabsichtigte Produktsemantik geändert. Die gewünschte neue Profil-Löschsemantik bleibt Backlog. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten; v1.21.15 bleibt unveränderliches Gold-Release.

## 1.22.11 – Profile/Inventory/Trash Repositories und Services modularisiert

- **Test-vor-Refactoring strikt eingehalten:** 8/8 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.10 grün festgeschrieben. Die beiden Pre-Refactor-Testdateien bleiben nach der Extraktion byteidentisch; anschließend kamen 11/11 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Neue `profile-repository.js`, `inventory-repository.js`, `inventory-image-store.js` und `trash-service.js` übernehmen die persistente Storage-Mechanik; `background.js` behält Workflow-, Safety-, Account-/Profil- und Diagnose-Orchestrierung sowie dünne Kompatibilitätsfassaden.
- Bestehende IndexedDB-Hot-Paths wurden ausdrücklich erhalten: profilindizierte Reads, `trashExpiresAt`-Index mit Next-Due-Cache, cursorbasierter Unassigned-Count und Shared-DB-Verbindung. Ein zunächst erkannter Scan-Fallback wurde vor Release korrigiert.
- Historische Implementierungsort-Tests wurden nur auf die neuen Modulgrenzen erweitert; fachliche und Safety-Erwartungen wurden nicht abgeschwächt.
- Keine beabsichtigte Produktsemantik geändert. Die bestehende Profil-Löschsemantik (lokale Datensätze → „Nicht zugeordnet“) bleibt in v1.22.11 bestehen; die neue gewünschte Voll-Löschsemantik bleibt Backlog. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten. v1.21.15 bleibt unveränderliches Gold-Release.

## 1.22.10 – Profile Backup + Inventory Render/Formatting modularisiert

- **Test-vor-Refactoring strikt eingehalten:** Zwei neue v1.22.10-Pre-Refactor-Suites wurden auf unverändertem v1.22.9 erstellt und mit 9/9 Characterization- sowie 6/6 Runtime-Checks grün festgeschrieben. Ihre SHA-256-Hashes blieben nach der Extraktion unverändert; anschließend kamen 10/10 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Neuer `profile-backup-controller.js`: besitzt exklusiven Profil-Transfer-Lock, Native-File-Picker-Zustand, Export/Import, profilbezogene IndexedDB-Snapshots, collision-sicheren atomaren Inventar-/Bild-Replace und Rollback-Schutz. Workflow-/Insertion-/Capture-Blocker bleiben im `app.js`-Orchestrator.
- Neuer `inventory-formatting.js`: besitzt die inventarbezogene Präsentationssemantik für Preis/Kategorie, Listing-/Enddatum, Renewal-Status und Papierkorb-Retention. `app.js` hält nur kleine kompatible Fassaden; die Render-Runtime konsumiert das Modul direkt.
- Neuer `inventory-render-controller.js`: besitzt detaillierte und kompakte Inventar-/Papierkorb-Renderpfade, Lazy-Details, Karten-/Zeilenaktionen, lokale Bilddarstellung und ZIP-Export-UI. Fachliche Account-/Profil-/Insertion-/Renewal-Gates werden injiziert und nicht in den Controller verschoben.
- `app.js` sinkt von 5.323 auf rund 3.860 Zeilen. Historische source-location-Verträge lesen für ihre unveränderten Verhaltenserwartungen eine test-only zusammengesetzte Source-Surface aus den realen neuen Modulen statt Dead-Code in `app.js` zu halten.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal-, Trash- oder Backup-Safety-Semantik geändert. Direkte `.submit()`/`requestSubmit()`-Bypässe bleiben verboten. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.

## 1.22.9 – Mass-Renewal UI und Archive-/Trash-Insertion UI modularisiert

- **Test-vor-Refactoring strikt eingehalten:** Die fehlenden v1.22.9-Characterization-/Runtime-Verträge wurden zuerst auf dem unveränderten v1.22.8-Stand erstellt und dort 8/8 bzw. 5/5 grün bestätigt. Dieselben Testdateien blieben nach der Extraktion unverändert und erneut grün; erst danach wurden Ownership-/Architekturtests ergänzt.
- Neuer `mass-renewal-ui-controller.js`: besitzt Auswahl, Reihenfolge/Drag-and-drop, Batch-Snapshot, Safe-/Fast-Phasenmodell, Fortschritt, Summary, Retry, kontrollierten Stop und den kompletten Mass-Renewal-Dialog-Lifecycle. `app.js` behält Account-/Workflow-Orchestrierung und die Runtime-Brücke.
- Neuer `archive-trash-insertion-ui-controller.js`: besitzt ZIP-Validierung und Archive-Insertion-Dialogzustand, revisionsgeschützte Progress-Snapshots sowie Trash-Template-Dialog, manuelle Publish-/Erfassungsfreigabe und zugehörige UI-Lifecycle-Events. Storage-/Image-Staging und die workflow-/accountgebundene Start-Orchestrierung bleiben in `app.js`.
- Historische Verträge wurden nur dort auf die neuen Implementierungsorte erweitert, wo sie zuvor bewusst `app.js` als Speicherort geprüft hatten. Die fachlichen und Safety-Assertions blieben unverändert.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal- oder Trash-Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.

## 1.22.8 – Inventory Capture und Renewal Dialog modularisiert

- **Test-vor-Refactoring strikt eingehalten:** Fehlende Characterization-/Runtime-Verträge wurden zuerst auf dem unveränderten v1.22.7-Stand erstellt und dort 8/8 bzw. 5/5 grün bestätigt. Dieselben Dateien blieben nach der Extraktion unverändert und erneut grün; erst danach wurden Ownership-/Architekturtests ergänzt.
- Neuer `inventory-capture-controller.js`: besitzt Dialogzustand, Single-Candidate-Auswahl, Bulk-Reentry, Membership-Snapshot, Fortschritts-/Result-Darstellung und Capture-Modal-Lifecycle. `app.js` behält die accountgebundene Single-/Bulk-Orchestrierung und Runtime-Kommunikation.
- Neuer `renewal-dialog-controller.js`: besitzt Renewal-Dialogzustand, Tracking, Safe-/Fast-Phasenanzeige, Bestätigung, Fortschritt, Abschlussdarstellung und Dialog-Listener. Die eigentliche Renewal-Workflow-/Safety-Orchestrierung bleibt außerhalb des Dialogcontrollers.
- Bestehende historische UI-/Workflow-Verträge wurden nur dort auf die neuen Implementierungsorte umgestellt, wo sie zuvor bewusst `app.js` als Speicherort geprüft hatten. Die Verhaltenserwartungen und Safety-Negativverträge wurden nicht gelockert.
- Keine fachliche Workflow-, Publish-, Delete-, Account- oder Renewal-Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.

## 1.22.7 – Sticky/Layout, Tab/Page Inspection und Shared UI Helpers modularisiert

- **Test-vor-Refactoring erstmals formal angewendet:** Vor jeder Codeverschiebung wurde die bestehende Abdeckung inventarisiert. Fehlende Characterization-/Runtime-Verträge (`v1227-pre-refactor-*`) wurden auf dem unveränderten v1.22.6-Stand erstellt und dort 7/7 bzw. 4/4 grün bestätigt. Dieselben Tests blieben nach der Extraktion unverändert und grün; erst anschließend kamen Ownership-/Architekturtests hinzu.
- Neuer `app-layout-controller.js`: besitzt Sticky-Header-Sync sowie die temporäre `UI_SIDEBAR_*`-Bottom-of-page-Diagnose. `app.js` behält dünne Fassaden und View-Orchestrierung.
- Neuer `tab-page-inspection-controller.js`: besitzt Tab-Messaging, Content-Connection-Recovery, Lifecycle-Klassifikation und die Abfrage nutzerseitiger Kleinanzeigen-Tabs. Bestehende erwartete-close/gone/discarded-Semantik und Diagnoseevents bleiben erhalten.
- Neuer `shared-ui-helpers.js`: bündelt wiederverwendbare Preis-, Kategorie-, Datums- und Compact-Action-Formatierung/DOM-Helfer.
- Die bestehenden Sticky-/Bottom-Clamp-, Tab-Lifecycle- und UI-Verhaltensverträge wurden auf die neuen Implementierungsorte umgestellt, ohne die fachlichen Erwartungen zu lockern.
- Keine fachliche Funktionalität oder Safety-Semantik geändert. `UI_ACTIONS_*` bleibt aktiv; `UI_SIDEBAR_*` bleibt bis zur formalen nativen Bottom-Clamp-Abnahme aktiv. v1.21.15 bleibt unveränderliches Gold-Release.

# Changelog

## 1.22.6 – Diagnose- und Actions-Diagnose modularisiert

- Extrahiert den zustandsbehafteten Diagnose-Store aus `background.js` nach `diagnostics-service.js`. Session-ID, Buffer, Flush-Queue, Cache, Retention, Aggregation, Redaction, Gallery-Diagnose sowie Reset-/Boundary-State liegen nun im eigenen Service; `background.js` behält dünne Fassaden und workflow-nahe Korrelation/Blocker.
- Extrahiert die umfangreiche Actions-/UI-Stuck-Instrumentierung aus `app.js` nach `actions-diagnostics-controller.js`. State-Snapshots, Pointer-/Hit-Test-Capture, Desync-Erkennung, Background-Epoch, Resync-Lifecycle und Karten-Interaktionsdiagnose liegen nun im eigenen Controller.
- Beide Module werden über `KRDeps` geladen und erhalten ihre konkreten Abhängigkeiten per Factory/Dependency-Injection. Bestehende Eventnamen, Diagnosefelder, Retention, Export-/Reset-Verhalten und Actions-Recovery-Semantik bleiben erhalten.
- Historische Verträge wurden nur dort auf die neuen Modulgrenzen angepasst, wo sie Implementierungsorte statt Verhalten geprüft hatten. Neue statische und Runtime-Verträge sichern State-Besitz, Aggregation/Redaction/Reset sowie Actions-Snapshot/Epoch/Resync-Verhalten.
- Keine fachliche Workflow- oder Safety-Semantik geändert. `UI_ACTIONS_*` bleibt aktiv; `UI_SIDEBAR_*` bleibt bis zur formalen nativen Bottom-Clamp-Abnahme aktiv. v1.21.15 bleibt unveränderliches Gold-Release.

## 1.22.5 – Erste inkrementelle Modularisierung

- Extrahiert den zustandsbehafteten Meldungs-/Activity-Center aus `app.js` nach `app-activity-center.js`. Persistenz, Retention, Priorisierung, Verlauf, Dismiss-Fingerprints und Rendering liegen im eigenen Controller; `app.js` bleibt UI-Orchestrator mit dünnen Kompatibilitätsfassaden.
- Extrahiert die eventgetriebene Tab-Load-/Target-Navigation-Wartekoordination aus `background.js` nach `tab-load-coordinator.js`. Waiter-/Versionszustand, Event-Wakeup, Timing-/Timeout-Diagnose und Off-Target-Erkennung liegen im eigenen Controller; `background.js` bleibt Service-Worker-Orchestrator.
- Beide neuen Module werden über `KRDeps` eingebunden und erhalten ihre konkreten Laufzeitabhängigkeiten per Factory/Dependency-Injection. Das reduziert versteckten gemeinsamen Zustand und bereitet weitere modulare Extraktionen vor.
- Bestehende interne Call-Sites bleiben über dünne Fassaden kompatibel; keine fachliche Workflow- oder Safety-Semantik geändert.
- Neue Architektur- und Runtime-Verträge sichern die Modulgrenzen sowie Activity-Center- und Tab-Readiness-Verhalten. Die Browser-/MV3-E2E-Suite bleibt unverändert Release-Gate.
- v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.


## 1.22.4 – Runtime-Dependency-Boundary

- Führt `runtime-deps.js` als kleine zentrale Runtime-Registry ein und lädt sie vor allen abhängigen Scripts in App, Content-Scripts, dynamischem Content-Bootstrap und Service Worker.
- App, Content-Einstieg und Service Worker lösen Kernabhängigkeiten über `KRDeps.require(...)`; optionale Helper verwenden `KRDeps.optional(...)`. Direkte benannte `globalThis.KR…`-Reads werden an diesen Consumer-Grenzen reduziert.
- Bestehende `KR…`-Producer bleiben in v1.22.4 bewusst unverändert. Die Registry adoptiert diese Legacy-Aliase lazy beim ersten Zugriff. Das hält den Refactor inkrementell und reduziert den Runtime-Diff.
- Die Registry verhindert konfliktbehaftete Doppelregistrierungen und liefert bei fehlenden strikten Abhängigkeiten einen klaren Load-Order-Fehler.
- Neue statische und Runtime-Verträge sichern Reihenfolge, Consumer-Grenzen, Legacy-Brücke, Duplicate-/Missing-Verhalten sowie Packaging ab.
- Keine fachliche Funktionalität oder Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.


## 1.22.3 – Fokus-Modality für Actions

- Der Actions-Bereich unterscheidet Pointer- und Keyboard-Modality jetzt explizit statt sich allein auf Chromes `:focus-visible`-Heuristik zu verlassen.
- Jede Pointer-Eingabe setzt die Actions-Fokusdarstellung auf `pointer`; Tab sowie Tastaturaktivierung im Actions-Bereich schalten auf `keyboard`.
- Nach einer Maus-/Pointer-Aktion bleibt am ausgelösten Action-Button kein sichtbarer Outline zurück – auch dann nicht, wenn ein Dialog den Fokus später programmgesteuert auf den auslösenden Button zurückgibt.
- Echter Tastaturfokus bleibt weiterhin mit dem vorhandenen 2-px-Mint-Outline sichtbar. Kein `blur()`-Workaround; Fokus selbst und Tastaturbedienbarkeit bleiben erhalten.
- Der echte Browser-/MV3-E2E-Test prüft zusätzlich die simulierte Fokus-Rückgabe nach Pointer-Aktion sowie den anschließenden Wechsel auf Keyboard-Modality per Tab.
- Der strukturelle Actions-Accordion-Fix aus v1.22.1 sowie sämtliche Publish-, Delete-, Account-, Renewal- und Workflow-Safety-Grenzen bleiben unverändert. v1.21.15 bleibt unveränderliches Gold-Release.

## 1.22.2 – Fokusdarstellung und Safety-Dokumentations-Cleanup

- Action-Buttons im Bereich `Aktionen` entfernen bei Pointer-Fokus den Chromium-UA-Outline über `:focus:not(:focus-visible)`, behalten aber einen expliziten mintfarbenen `:focus-visible`-Indikator für Tastaturbedienung. Kein programmatisches `blur()`.
- Der Browser-E2E-Test des Actions-Accordions prüft zusätzlich Pointer-Fokus ohne UA-Rahmen sowie sichtbaren Tastaturfokus.
- Der sachlich falsche Modulkommentar in `template-filler.js` wurde an die seit v1.8.2 bestehende Safety-Semantik angepasst: Template-only veröffentlicht nie automatisch; Renewal-/Archive-Insertion darf nur hinter dem vollständigen Hard-Gate automatisch den eindeutigen sichtbaren Publish-Button klicken. `.submit()`/`requestSubmit()` bleiben ausgeschlossen.
- Zwei überholte globale README-Aussagen zu Remote-Löschung und automatischem Publish wurden auf die tatsächlichen, workflow-spezifischen Grenzen präzisiert. Keine Runtime-Safety- oder Workflow-Semantik geändert.
- Das Source-Packaging schließt `__pycache__`/`.pyc` explizit aus, damit lokale Python-Testcaches nicht versehentlich in Release-Sources gelangen.
- v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und die bis zur nativen Bottom-Clamp-Abnahme benötigte `UI_SIDEBAR_*`-Diagnose bleiben aktiv.

## 1.22.1 – Actions-Accordion Hit-Test-Fix

- Native Diagnose aus v1.21.15 bestätigte einen Hit-Test-/Rendering-State-Desync im Bereich „Aktionen“: sichtbare/enabled Button-Rechtecke waren vorhanden, `elementFromPoint()` traf jedoch wiederholt das übergeordnete native `<details>` statt Button-/Wrapper-Subtree. Fachlicher Disabled-/Busy-State, externes Overlay und verwaister eigener WAAPI-State waren für diesen Fall ausgeschlossen.
- Der Bereich „Aktionen“ wurde deshalb vom nativen `<details>/<summary>`-Open-State entkoppelt. Er verwendet nun einen normalen fokussierbaren Button mit `aria-expanded`/`aria-controls` und ein explizit kontrolliertes Panel. „Konfiguration“ und „Diagnose“ bleiben unverändert native Details.
- Der bestehende gemeinsame Accordion-Controller abstrahiert jetzt nativen und kontrollierten Open-State; Animation, Single-Open-Verhalten, Watchdog/Sanitizer und bestehende Actions-Diagnose bleiben erhalten.
- Der v1.22.0 Browser-E2E-Test `accordion-rapid-toggle` prüft zusätzlich den realen Hit-Test der vier Action-Buttons nach Rapid-Toggle. Für den Test werden nur synchron im Testkontext deaktivierte Buttons kurz pointer-aktiv gemacht; es wird keine Aktion ausgelöst und keine Remote-Mutation ausgeführt.
- Die Browser-Harness-Wartebedingungen wurden auf CSP-sichere Funktionsprädikate umgestellt; reine Testinfrastruktur, keine Produktionssemantik.
- Gold-Referenz bleibt unverändert v1.21.15. Alle Gold-Runtime-Dateien außer `app.html`, `app.css` und `app.js` bleiben in v1.22.1 byteidentisch. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.

## 1.22.0

- Quality-of-Life test foundation on immutable Gold baseline v1.21.15; no production runtime logic changes beyond the version metadata/docs.
- Added real Chrome/Chromium MV3 E2E harness (`npm run test:e2e`) with isolated temporary profiles and locally intercepted Kleinanzeigen fixtures; no real account or remote mutation is required.
- Added 8 browser scenarios: MV3 boot, service-worker restart/reconnect, rapid Actions accordion toggles, app close/reopen persistence, profile-switch action lock, unexpected worker-tab close, Bottom-Clamp in all four inventory/trash × detailed/compact combinations, and remote publish/delete safety negative.
- Added immutable Gold baseline manifest with canonical v1.21.15 artifact hashes and SHA-256 parity for 39 production runtime files. v1.22.0 statically proves these runtime files are byte-identical to Gold.
- Browser infrastructure failures (missing browser/Playwright or enterprise policy blocking unpacked extensions) are hard failures, never false PASS/SKIP.
- `scripts/build.sh` can execute the browser gate with `KR_RUN_BROWSER_E2E=1`; default builds remain portable across machines without browser-test prerequisites.

## 1.21.15 – Actions-Stuck-Hardening und UI-Feinschliff

- Actions-/UI-Stuck-Diagnose erweitert: document-level Capture protokolliert Pointerdown/Click im geometrischen Actions-Bereich auch dann, wenn das Ereignis `.primary-actions` oder den erwarteten Button nicht erreicht. Erfasst werden Event-/Hit-Target, `elementsFromPoint`-Stack, erwarteter Button, mögliche Overlay-Situation, Accordion-/Panel-/Primary-Actions-Geometrie, `overflow`, `pointer-events`, Web-Animation-State, Background-Epoch und Zeit seit letztem erfolgreichen Actions-State-Sync.
- Actions-State-Snapshots enthalten zusätzlich den Zustand des Aktionen-Accordions (`open`, effektiver Zielzustand, `is-animating`, Panel-/Summary-/Body-Geometrie, `scrollHeight`, Inline-Höhe/-Opacity sowie WAAPI-Status).
- Accordion-Animationen besitzen einen Failsafe-Watchdog. Verwaiste oder zu alte `is-animating`-/Inline-Zustände werden bei Pointerdown im Actions-Bereich, App-Focus, Rückkehr zur sichtbaren Seite und Actions-Re-Sync bereinigt und mit `UI_ACTIONS_ACCORDION_*_RECOVERED` diagnostiziert.
- Accordion-Summaries bleiben während Animationen anklickbar; Rapid-Clicks orientieren sich am angeforderten Zielzustand und können eine laufende Öffnen-/Schließen-Animation kontrolliert umkehren.
- Papierkorb-Detailbezeichnung wurde von `Im Papierkorb seit` auf `Im Papierkorb` verkürzt; Datum/Uhrzeit bleiben unverändert.
- Die drei Schritt-Kacheln im Papierkorb-Vorlagenworkflow nutzen auf Desktop die volle verfügbare Breite mit drei gleich großen Spalten; bestehendes Responsive-Verhalten bleibt erhalten.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt bewusst aktiv. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.

## 1.21.14 – Verständlichere UI-Texte und konsistente Papierkorb-Aktionen

- Erfassung sprachlich neutralisiert: Haupteinstieg und Dialog heißen `Anzeigen erfassen`, Start-CTA `Erfassung starten`; die bewusste Umfangsunterscheidung `Nur neue Anzeigen erfassen` / `Gesamten Bestand neu einlesen` bleibt unverändert.
- Papierkorb-Texte beschreiben den lokalen Zustand eindeutig als `Im Papierkorb seit`; Einleitung stellt klar, dass Kleinanzeigen-Anzeigen unverändert bleiben und neue Anzeigen nicht automatisch veröffentlicht werden.
- Papierkorb-Kachel- und Listenansicht verwenden dieselbe Aktionsreihenfolge: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Endgültig löschen`. Aktionslogik und Safety-Semantik bleiben unverändert.
- Neu-Inserieren-, Massen-Neuinserieren-, Profil-, Leerzustands-, Such-, Online-Status-, Sortier- und Prüfmodus-Texte wurden für Endbenutzer vereinfacht; verschachtelte Erfassungsfortschritte heißen `Fortschritt X von 4`.
- Laufende Dialoge weisen sichtbar darauf hin, dass ein Vorgang beim Schließen des Fensters im Hintergrund weiterläuft. Vor dem Start heißt die sekundäre Aktion konsistent `Abbrechen`.
- Diagnoseaktion heißt `Diagnose zurücksetzen`; Download und Reset stehen untereinander, damit beide Beschriftungen vollständig lesbar bleiben.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten. Keine Änderung an Publish-, Account-, Renewal-, Delete-, ZIP- oder sonstigen Safety-Grenzen.

## 1.21.13 – Papierkorb-Listenaktionen vervollständigt

- Papierkorb-Listenansicht ergänzt `30 Tage neu starten` und `Als ZIP exportieren` zwischen `Neu inserieren` und `Entfernen`.
- `30 Tage neu starten` nutzt das bestehende Update-Icon der Inventar-Aktualisierung; ZIP verwendet das bestehende `action-zip-export.svg`.
- Vorhandene Runtime-Funktionen, Bestätigungsdialoge, Statusmeldungen und Papierkorb-Diagnoseevents werden wiederverwendet; keine Remote-/Safety-Semantik geändert.
- `UI_SIDEBAR_*`-Bottom-Diagnose und ausführliche Actions-/UI-Stuck-Diagnose bleiben unverändert aktiv.

## 1.21.12 – Sidebar-Bottom-Clamp, Refresh-Feedback und Erfassungs-Badges

- Behebt den diagnostisch bestätigten Sidebar-Bottom-Clamp am Dokumentende durch einen gemeinsamen unteren Shell-Abstand (`--app-shell-bottom-gap`) und dynamische Control-Panel-Mindesthöhe aus Sticky-Top + Bottom-Gap.
- Globaler Refresh zeigt Busy-Rotation, Disabled-State und temporäres Success-Häkchen; Normal-Tooltip „Ansicht und Kontostatus aktualisieren“.
- Content-Überschriften Inventar/Papierkorb einzeilig mit inline Eintragszahl.
- Meldungsverlauf erhält 2 px untere Scrollreserve, damit die letzte Kartenborder dauerhaft sichtbar bleibt.
- „Geöffnete Anzeige erfassen“ kennzeichnet per frischem lokalen Profil-Snapshot sicher neue Kandidaten mit `NEU` und nur im Papierkorb vorhandene Kandidaten mit `PAPIERKORB`.
- `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur Praxisbestätigung aktiv; Actions-Stuck-Diagnose und sämtliche Safety-Grenzen unverändert.

## 1.21.11 – Globale Ansichtsauswahl und Sidebar-Ende-Diagnose

- Globaler gemeinsamer View-Modus für Inventar und Papierkorb im App-Header; Content-Umschalter entfernt.
- Header-3er-Set `Kachelansicht | Listenansicht | Aktualisieren`; Inventar-Tab erhält Anzahl-Badge.
- Migration von `inventoryListViewModeV1`/`trashListViewModeV1` auf `globalListViewModeV1`, danach Entfernung der Altkeys.
- Globaler Live-Kontostatus weitere 3 px nach oben verschoben.
- Temporäre `UI_SIDEBAR_*`-Diagnose für den Restfehler am Dokumentende, detailliert nur in der letzten 250-px-Zone; allgemeine `UI_STICKY_*`-Diagnose bleibt entfernt.
- Actions-/UI-Stuck-Diagnose und sämtliche Safety-Grenzen unverändert.

## 1.21.10 – UI-Feinschliff und ZIP-Aktionskonsistenz

- Globaler Kleinanzeigen-Kontostatus höher und breiter nutzbar im App-Header; vollständige Kontoadresse wird nicht mehr unnötig durch eine enge Ellipsis-Grenze abgeschnitten.
- Inventarprofil-Select typografisch leicht verdichtet, ohne separate Narrow-Schrift.
- Sidebar-Control-Panel verwendet denselben dynamisch gemessenen Sticky-Zielpunkt wie die Listenheader und vermeidet den in der Papierkorb-Kompaktansicht beobachteten ca. 6-px-Y-Sprung.
- „Als ZIP exportieren“ ist in Inventar-Detailkarten wieder eine echte rechte Aktion zwischen Aktualisieren/Online-Status und Papierkorb; veraltete absolute Footer-CSS-Positionierung ist neutralisiert.
- Inventar-Kompaktansicht besitzt ein eigenes ZIP-/Archivexport-Icon an derselben logischen Aktionsposition.
- Meldungs-Dock in der Sidebar unter „Diagnose“ verschoben; Meldungsfunktionalität unverändert.
- Actions-/UI-Stuck-Diagnose bleibt aktiv, Sticky-/Wheel-Tracing bleibt entfernt.
- Keine Änderung an Remote-/Workflow-/Safety-Semantik.

## 1.21.9 – UI-Konsolidierung und Sticky-Diagnose-Rückbau

- Globaler Live-Kontostatus oben rechts über der Inventar-/Papierkorb-Navigation: `Kleinanzeigen-Konto: <E-Mail-Adresse>`; der Status ist damit als globale Session-Information klar vom lokalen Inventarprofil getrennt.
- Inventarprofil-Block beruhigt: klarere Abschnittsüberschrift, Profil-Combobox mit `… · <n> Anzeigen`, kompakter Zahnrad-Button „Inventarprofile verwalten“ direkt rechts daneben sowie systematisierte Abstände.
- Select-/Combobox-Chevrons werden kontrolliert mit symmetrischer rechter Innenpolsterung dargestellt.
- Detailkarten: Aktionsbuttons kompakter; Inventar zeigt `Neu inserieren`, `Daten aktualisieren`/`Online Status prüfen`, `Als ZIP exportieren`, `In Papierkorb` im rechten Aktionsstapel. Der ZIP-Export entfällt im Kartenfuß. Papierkorb-Aktionen verwenden dieselbe kompakte Höhe.
- Gespeicherte Detailbilder in Inventar und Papierkorb sind anklickbar und öffnen – sofern eine lokale vollständige Bildquelle verfügbar ist – sicher in einem neuen Tab.
- Sidebar erhält einen dauerhaft sichtbaren Meldungs-Dock mit einer priorisierten aktiven Meldung und „Weitere Meldungen anzeigen“ samt Badge. Manuell geschlossene Meldungen bleiben bei unverändertem Inhalt geschlossen und öffnen erst bei echter Inhaltsänderung erneut.
- Die nach erfolgreicher v1.21.8-Praxisabnahme nicht mehr benötigte temporäre Sticky-/Wheel-Diagnose (`UI_STICKY_*`) wird entfernt; Sticky-, Occlusion-, Fixed-Slot- und Wheel-Funktionalität bleibt unverändert.
- Die temporär erweiterte Actions-/UI-Stuck-Diagnose und der defensive Read-only Actions-Re-Sync bleiben aktiv, bis der Actions-Stuck-Bug ursächlich abgeschlossen ist.
- Keine Änderung an Account-, Renewal-, Publish-, Delete-, ZIP- oder sonstiger Remote-/Safety-Semantik.

## 1.21.8 – Sticky-Occlusion und Actions-State-Diagnose

- Inventar/Papierkorb: fixed Occlusion-Maske deckt beim angehefteten Header exakt den Spalt zwischen globalem App-Header und Listenheader ab; Karteninhalte können dort nicht mehr sichtbar hindurchscrollen.
- Occlusion verwendet denselben `--app-canvas-background`, ist `pointer-events:none` und übernimmt X/Width/Height dynamisch aus der bestehenden Sticky-Geometrie.
- Temporär stark erweiterte Actions-Diagnose mit State-Snapshots, Klickversuchen auch bei nativen `disabled`-Buttons, Hit-Target/Overlay-Daten, Desync-Erkennung, Background-Epoch-Korrelation und Re-Sync-Events.
- Idempotenter Read-only Actions-Re-Sync auf Focus, Visibility-Rückkehr und Background-Reconnect; keine automatische Remote-Aktion und keine Abschwächung bestehender Safety-Gates.
- Die erhöhte Actions-Diagnose soll nach erfolgreicher Praxisabnahme wieder reduziert/aggregiert werden.

## 1.21.7 – Sticky-Zielposition und Geometriestabilisierung

- Pin-Schwelle und fixed Header-Position verwenden jetzt dieselbe dynamisch gemessene Zielposition aus App-Header-Unterkante plus `--app-shell-top-gap`.
- `--list-sticky-top` verbindet die JS-Messung direkt mit CSS; der Header bleibt beim Scrollen an seiner natürlichen Y-Position.
- `display: flow-root` stabilisiert die Header-Box zwischen normalem und fixed Zustand und verhindert den zuvor diagnostizierten 12-px-Höhen-/ScrollHeight-Shift durch Margin-Collapse.
- v1.21.6-Wheel-/Background-Hardening und die temporär erweiterte Sticky-Diagnose bleiben unverändert.
- Keine Änderung an Workflow-/Remote-/Safety-Semantik.

## 1.21.6 – Sticky-Slot- und Diagnose-Hardening

- Sticky-/Wheel-Scroll-Härtung: stabiler Header-Slot hält die natürliche Dokumenthöhe konstant; der sichtbare angeheftete Header ist ein separater fixed/elevated Layer. Keine dynamische Flow-Spacer-Höhenänderung mehr im Wheel-Pfad.
- `overflow-anchor: none` auf Slot/Header zur zusätzlichen Absicherung gegen Browser-Scroll-Anchoring.
- Gemeinsamer viewport-verankerter `--app-canvas-background` für Body und fixed Sticky-Layer; die v1.21.5-Hintergrundnachbildung entfällt.
- Papierkorb-Amber-Hinweis bleibt im normalen Flow vollständig; nur der sichtbare pinned Layer zeigt die kompakte Einzeile.
- Temporär erweiterte Diagnoseevents `UI_STICKY_PINNED`, `UI_STICKY_UNPINNED`, `UI_STICKY_GEOMETRY_SAMPLE`, `UI_STICKY_WHEEL_SAMPLE`, `UI_STICKY_OSCILLATION_DETECTED` mit detaillierten Scroll-/Geometriefeldern. Diagnosevolumen soll nach Praxisabnahme wieder reduziert werden.
- Keine Änderung an Renewal-/Publish-/Delete-/Account-/ZIP-/Profil-Safety.

## 1.21.5 – Sticky-Scroll-Hardening

- Behebt den Papierkorb-Wheel-Scroll-Feedback-Loop durch unabhängigen Sentinel statt Self-Measurement des sticky Headers.
- Verschiebt die Höhenkompensation hinter den Sticky-Header, sodass der Pin-Anker unverändert bleibt.
- Entfernt die flache schwarze Sticky-Fläche und integriert den angehefteten Header wieder in den bestehenden dunklen Grünverlauf; nur eine dezente untere Elevation bleibt sichtbar.
- Der Amber-Hinweis kondensiert weiterhin ausschließlich im angehefteten Zustand und expandiert beim Zurückscrollen wieder vollständig.
- Keine Änderung an Workflow-/Remote-/Safety-Logik.

## 1.21.4 – Sticky-Gold-Line

- Stellt die natürliche Listensteuerungs-Optik von vor v1.21.3 wieder her; Sticky-Elevation wird nur im angehefteten Zustand aktiv.
- Papierkorb-Hinweis wird ausschließlich im angehefteten Zustand auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ kondensiert.
- Höhenkompensation verhindert einen sichtbaren Listen-Sprung beim Umschalten zwischen vollem und kompaktem Papierkorb-Hinweis.
- Keine Änderung an Workflow-/Remote-/Safety-Logik.

## 1.21.3 – Sticky Listensteuerung, Papierkorb-Aufbewahrung und Interaction-Hardening

- Inventar/Papierkorb: kompletter Listen-Steuerungsblock sticky unter dem globalen Header; Papierkorb inklusive amberfarbenem Aufbewahrungshinweis.
- Ansichtsumschalter: Tooltips/Accessible Labels heißen jetzt „Detailansicht“ und „Kompakte Ansicht“.
- Kompakte Ansicht: Preis- und Zeitmetadaten nutzen eine feste erste Spalte; die Zeitinformation beginnt dadurch über alle Karten hinweg an derselben X-Position.
- Papierkorb: statt des Kleinanzeigen-Enddatums wird die lokale 30-Tage-Aufbewahrung als „Im Papierkorb bis <Datum> (noch N Tage)“ priorisiert.
- Interaction-Hardening: transiente Kontoprüfungen führen nicht mehr zu unnötigem Re-Render der Kartenaktionen, solange die effektive Account-/Profilfreigabe unverändert bleibt; echte Gate-Wechsel bleiben fail-closed.
- Diagnose: Kartenaktionen protokollieren Pointerdown/Click, disabled-State, Gate-Kind sowie Profilbindung.
- Keine Änderung an Publish-, Renewal-, Phase-4-Delete-, ZIP- oder Remote-Safety-Logik.

## 1.21.2 – Verdichtete Schmalansicht und neue View-/Inserieren-Icons

- Schmale Listenansicht auf drei Informationszeilen verdichtet: letzte Kategorieebene oben, Titel mittig, Preis und Enddatum gemeinsam in einer zweigeteilten unteren Zeile.
- Titelbildgröße und rechtsbündige Hauptaktionen unverändert.
- Textschalter „Kachel mit Details“/„Schmal“ durch zugängliche SVG-View-Icons ersetzt.
- „Neu inserieren“-Icon als Tag/Inserieren-Symbol mit Spark-Stern statt Plus neu gezeichnet.
- Keine Änderung an Workflow-, Publish-, Renewal-, Delete- oder Safety-Logik.
- Handover-Regel ergänzt: Bei Builds spätestens alle fünf Minuten oder nach Meilensteinen Fortschritt melden.

## 1.21.1 – Endnutzerfreundliche Meldungs-Gold-Line

- Zentrale Meldungsdarstellung um strukturierte Faktenzeilen und semantische Badge-Bezeichnungen erweitert; `waiting` bedeutet nicht mehr automatisch „Prüfung erforderlich“.
- Bestandserfassung unterscheidet erfolgreiche Abschlüsse, Count-Mismatch, teilweise Erfassung, Bestandsabgleich, kontrollierten Stopp und technische Unterbrechung mit jeweils eigener kurzer Nutzerbotschaft.
- Count-Mismatch ohne Einzelfehler: **Erfassung abgeschlossen – Anzahl prüfen** mit gefunden/neu/vorhanden/Fehler-Fakten und separat angezeigter Kleinanzeigen-Sollzahl.
- `Bald Online`/Online-Status, Einzel-/Mehrfach-Renewal, ZIP-Inserierung, Profiltransfer und Account-Gates auf die kurze Gold-Line vereinheitlicht. Sicherheitsrelevante Renewal-Fälle benennen weiterhin ausdrücklich, dass die alte Anzeige nicht entfernt wurde.
- Normale Kacheln geben keine rohen `Error.message`, `lastError`, Stacktraces, Diagnose-Eventnamen oder internen Status-/Reason-Werte aus. Diagnoseprotokollierung bleibt vollständig erhalten.
- Kontrolliert geschlossene Workflow-Tabs bleiben still; echte Lifecycle-/Timeoutfehler werden endanwenderfreundlich übersetzt.
- Bilder bleiben optional; die Meldungslogik führt fehlende Bilder nicht pauschal als ZIP-/Vollständigkeitsfehler an.
- Keine Änderung an Publish-, Edit-Verifikations-, Phase-4-Delete-, Account-Binding- oder sonstigen Safety-Gates.

## 1.21.0 – Detail-/Schmalansichten und Meldungsverlauf leeren

- Inventar und Papierkorb besitzen jeweils unabhängig persistierbare Darstellungsarten **Kachel mit Details** (Default) und **Schmal**.
- Die schmale Ansicht zeigt nur Bild, Titel, letzte Kategorieebene, Preis, Enddatum und Hauptaktionen. Detailbereich und ZIP-Export bleiben ausschließlich in der Detailansicht verfügbar.
- Hauptaktionen werden in der schmalen Ansicht als hochauflösende SVG-Icons dargestellt. Neu sind Icons für **Neu inserieren**, **Daten aktualisieren**, **Löschen/Entfernen** und **Erneut prüfen**; für den seltenen Zustand **Austausch abschließen** existiert zusätzlich ein eigenes Vektor-Icon.
- Im Inventar bedeutet das Löschen-Icon ausschließlich **In Papierkorb**; im Papierkorb ausschließlich **Entfernen** aus der lokalen Verwaltung. Keine dieser Aktionen löscht eine Anzeige bei Kleinanzeigen.
- Bestehende Gates bleiben erhalten, insbesondere `Bald Online`, Account-/Profilbindung und Workflow-Locks. `Online Status prüfen` verwendet in der schmalen Ansicht das Prüf-/Retry-Icon.
- Im Dialog **Meldungsverlauf** steht unten links **Alles löschen** mit Mülleimer-Icon. Nach gestaltetem Bestätigungsdialog werden ausschließlich Verlaufseinträge geleert; Diagnose, Inventar, Papierkorb und Workflowdaten bleiben unverändert. Der Meldungszähler wird auf 0 zurückgesetzt/ausgeblendet.
- Keine Änderung an Renewal-, Publish-, Phase-4-Delete- oder Remote-Safety-Logik.


## 1.20.22 – Optionale 0-Bilder-Anzeigen

- Fix: Anzeigen ohne Bilder werden im Bearbeiten-Modus nicht mehr allein wegen `images.length === 0` abgewiesen.
- Safety: 0 Bilder gilt nur bei explizitem strukturiertem `post-listing-props`-Bildarray mit Länge 0 und ohne widersprüchliche Preview-/Hidden-/Local-Preview-Evidenz als vollständig.
- `blob:`-/`data:`-Previews bleiben blockierend; unklare leere Bildzustände bleiben fail-closed.
- Explizit bestätigte leere Bildbestände dürfen vorhandene lokale Bilder bei einer Datenaktualisierung atomar auf 0 reduzieren.
- Direktes Neu-Inserieren akzeptiert bestätigte 0-Bilder-Vorlagen.
- ZIP-Export/-Neu-Inserat unterstützt bestätigte 0-Bilder-Vorlagen; unbestätigt leere ZIP-Bildbestände bleiben gesperrt.
- Vollprüfungs-Bildvergleich: explizit leer ↔ explizit leer = Match; explizit leer ↔ Bilder = Mismatch; unbestätigt leer = Unsicherheit.
- Keine Änderung an Schnellprüfung, Public-Readiness/`Bald Online` oder Phase-4-Löschsicherheit.

## 1.20.21 – „Bald Online“ in Mehrfachlauf-Übersicht

- Die Abschlussübersicht von **Mehrere neu inserieren** zeigt einen erfolgreich ersetzten Datensatz mit noch ausstehender öffentlicher Bereitstellung jetzt sichtbar als **Bald Online** statt nur als generisch **Erfolgreich**. Die vier erfolgreich abgeschlossenen Phasen bleiben weiterhin grün abgehakt; `Bald Online` ist ein nachgelagerter Public-Readiness-Status und kein Prüfbedarf.
- Der Mehrfachlauf übernimmt `publicAvailabilityPending` aus der Renewal-Session in den persistierten Batch-Item-State und liefert den Wert auch im Public-Snapshot. Recovery aus einem bereits promotierten Inventardatensatz rekonstruiert denselben Zustand.
- Für bereits unter v1.20.20 gespeicherte Batch-Abschlüsse ohne dieses neue Feld verwendet die UI als Fallback den **neuen** Inventardatensatz (`newInventoryId`/`newAdId`) vor der alten Papierkorb-Quelle. Dadurch kann ein bestehender `Bald Online`-Datensatz nach dem Upgrade ebenfalls korrekt in der Übersicht erkannt werden.
- Die Statuspille verwendet dieselbe gelb/amberfarbene Pending-Semantik wie das Inventar-Badge. Batch-Zähler bleiben fachlich unverändert: der Austausch zählt weiterhin als erfolgreich, solange kein echter Prüfbedarf vorliegt.
- Schnellprüfung, Vollprüfungs-Edit-Gate, `Online Status prüfen`, Neu-Inserieren-Sperre bei `Bald Online` und Phase-4-Delete-Safety bleiben unverändert.


## 1.20.20 – „Bald Online“-Aktionskarte korrigiert

- Normale Inventarkarten mit dem Badge **Bald Online** beschriften die Aktualisierungsaktion jetzt korrekt mit **Online Status prüfen** statt **Daten aktualisieren**. Die Aktion bleibt auf den öffentlichen Read-only-Check beschränkt und öffnet den Bearbeiten-Modus nicht erneut.
- **Neu inserieren** ist in diesem Zustand zusätzlich direkt in der normalen Inventarkarten-UI an `Bald Online` gebunden gesperrt. Auch nach einem fehlgeschlagenen Online-Status-Check kann ein Re-Render/Fehlerpfad den Button nicht versehentlich wieder freigeben.
- Der bestehende Background-Hard-Gate gegen Neu-Inserieren bei `Bald Online`, die v1.20.19-Vollprüfungs-/Delete-Semantik und die Schnellprüfung bleiben unverändert.


## 1.20.19 – Edit-Verifikation, „Bald Online“ und Retry-UI

- Die Vollprüfung behandelt den frischen Edit-Recheck und den semantischen Vergleich gegen die Ursprungsanzeige als maßgebliche Inhaltsverifikation. Ein vollständiger Match gibt Phase 4 frei; öffentliche Read-only-Erreichbarkeit ist kein Delete-Gate mehr.
- Noch nicht öffentlich erreichbare, aber inhaltlich vollständig verifizierte Neu-Anzeigen werden als **Bald Online** markiert. **Online Status prüfen** versucht kanonische und ID-Direkt-Route erneut und ergänzt fehlende Read-only-Metadaten; bei Erfolg verschwindet das Badge.
- `Bald Online` sperrt **Neu inserieren** in UI und Background. Die Schnellprüfung bleibt unverändert und führt weiterhin keinen Edit-Recheck durch.
- Die Phase-4-Sicherheitskette bleibt bestehen: exakte Quell-ID, Profilbindung, bestätigte Löschung, frischer unabhängiger MyAds-Abwesenheitsnachweis und Promotion erst nach `source-delete-verified`.
- Der Batch-Button **Erneut prüfen** bleibt nun auch über Storage-/UI-Re-Renders während des laufenden Retries gesperrt und zeigt **Prüfung läuft …**.
- Der verbleibende 1-px-Sticky-Versatz links wurde korrigiert; die rechte Außenlücke des v1.20.18-Refresh-Buttons wurde reduziert, ohne seine Gold-Line-Gestaltung oder den Abstand zu den Tabs zu ändern.


## 1.20.18 – Ansichts-Refresh, Sticky-Geometrie und Meldungsverlauf

- Der bestehende umfassende manuelle Refresh wurde aus der Inventarüberschrift in die rechte Header-/Ansichtsleiste verschoben. Er bleibt technisch unverändert umfassend, ist nun aber als eigener gerahmter Icon-Button mit **Ansicht aktualisieren** semantisch passend platziert.
- Headerhöhe und oberer Shell-Abstand sind gemeinsame CSS-Geometrie-Tokens; die Sticky-Schwelle der linken Steuerung ist deren Summe. Damit entfällt der sichtbare wenige-Pixel-Sprung beim Scrollen.
- `uiActivityHistoryV1`/`uiCurrentActivityV1` werden beim App-Bootstrap geladen. Der Öffnen-Handler des Meldungsverlaufs wartet ebenfalls auf `ensureUiActivityLoaded()`, bevor er Zähler/Liste rendert. Persistierte Meldungen bleiben nach App-Neustart unmittelbar sichtbar.
- Keine fachliche Änderung an Renewal-, Publish-, Delete-, Phase-4-, Inventur- oder Account-Safety-Gates.


## 1.20.17 – Aktionen-Meldungen und MyAds-Inkonsistenz

- Generische aktuelle Aktionen-Statuskarten erhalten ein `×`; Ausblenden verschiebt die Meldung in den Meldungsverlauf statt sie zu löschen.
- Neue Readiness-Fehlerklasse `KR_MY_ADS_INCONSISTENT` für widersprüchliche MyAds-Zähler/Karten-Zustände.
- Endanwendertext nennt bei bekannten Counts den konkreten Zustand (z. B. 10 gemeldet, 9 vollständig sichtbar), erklärt den sicheren Nicht-Start und empfiehlt einen späteren erneuten Versuch.
- Strukturierte Readiness-Fehlerdetails (`expectedOnline`, `listingCount`, `listingIds`, Fingerprint, Reason-Code) werden Content → Background → App erhalten und in den Bulk-Source-Diagnoseevents protokolliert.
- Keine Änderung an Renewal-/Publish-/Phase-4-Safety oder eigentlicher Inventarisierungslogik.


## 1.20.16 – Stabilisierung Phase 3, Batch-Recovery und Header-Kontur

- Fresh Public Verification wartet nach bestätigter Ziel-Ad-ID im selben frisch erzeugten Tab auf Read-only-Readiness (30-s-Grenze), statt vorschnell weitere Verification-Tabs zu erzeugen.
- Mehrfachlauf normalisiert nach erfolgreicher manueller Recovery den Batch-Top-Level aus den Item-Zuständen und diagnostiziert dies als `MASS_RENEWAL_BATCH_STATUS_NORMALIZED`; bereits persistierte stale Terminalzustände werden beim nächsten Statusabruf ebenfalls selbstheilend normalisiert.
- Header-/Tab-Kontur durchgehend Bright Cyan: inaktive Tab-Unterkante, Inventar-Rechtskante und Papierkorb-Linkskante.
- Keine Änderung an Publish-/Delete-/Phase-4-Safety.

## 1.20.15 – Header-Navigationslinie Bright Cyan

- Die horizontale Trennlinie des App-Headers verwendet jetzt `#4de0b7`, exakt dieselbe Farbe wie die Border des aktiven `Inventar`-/`Papierkorb`-Tabs.
- Position, Dicke, Tab-Geometrie und aktive/inaktive Tab-Semantik bleiben unverändert.
- Es existiert bereits ein gezielter Test für diese Linie (`tests/v1176-accordion-motion.cjs`); sein Contract wurde von der bisherigen subtilen Cyan-Variante auf Bright Cyan aktualisiert.
- Auf ausdrücklichen Wunsch wurde für diesen rein visuellen Patch auf die vollständige Regression, Syntax-Gesamtlauf und Fresh-Source-Testmatrix verzichtet.


## 1.20.14 – Stabilisierung ID-Route, Batch-Zähler und Prüf-Terminologie

- **Öffentliche ID-Route auch im Content-/Read-only-Pfad:** Die bereits in v1.20.13 verwendete Fresh-Tab-ID-Route `https://www.kleinanzeigen.de/s-anzeige/<adId>` wird nun auch von der eigentlichen Read-only-Metadatenextraktion als gültige Anzeigen-Detailseite erkannt. Der Content-Kontext verwendet dafür denselben `managed-navigation.js`-Ad-ID-Parser wie die zielgebundene Phase-3-Navigation; kanonische URL und ID-Route teilen damit dieselbe autoritative Anzeigen-ID-Semantik.
- `managed-navigation.js` wird deshalb vor `content.js` auch im Content-Script-Kontext geladen. Kategorie-/Location-IDs werden weiterhin nur aus der langen kanonischen URL abgeleitet; die Ad-ID selbst ist in beiden öffentlichen URL-Formen autoritativ.
- **Mehrfachlauf-Zähler normalisiert:** Die UI leitet `total`, `success`, `attention`, `cancelled`, `queued` und `running` immer aus `batch.items` ab. Rohe Storage-Events und Background-Public-Snapshots werden vor dem Rendern auf dieselbe Form normalisiert; ein späteres Storage-Event kann korrekte Counts nicht mehr zu `0 von 0` zurücksetzen.
- **Prüf-CTA vereinheitlicht:** Wiederholungen desselben Verifikationsworkflows heißen überall `Erneut prüfen`. Varianten wie `Jetzt erneut prüfen` und `Prüfung erneut starten` wurden entfernt.
- **Statussprache endanwenderfreundlich:** `NOCH NICHT ONLINE` wird zu `VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT`, `PRÜFUNG NÖTIG` zu `PRÜFUNG ERFORDERLICH`. Passive Wartezustände formulieren nicht mehr irreführend, dass im Hintergrund weiter geprüft werde.
- Die v1.20.13-Fresh-Tab-only-Phase-3-Architektur, Gold-Line, Publish-/Bild-/Phase-4-/Inventur-/Account-Gate-Safety bleiben unverändert.

## 1.20.13 – Stabilisierung Phase 3 + Mehrfachlauf-Gold-Linie

- **Phase-3-Verifikation ID-zentriert und Fresh-Tab-only:** Jede öffentliche Prüf-URL wird in einem neu erzeugten, dedizierten Managed-Tab geprüft. Publish-/Target-Tabs, „Meine Anzeigen“-Tabs, frühere Verification-Tabs und vorhandene Nutzertabs werden nicht recycelt.
- Die bekannte kanonische öffentliche URL bleibt der erste Prüfweg. Bei Off-Target, Navigations-/Transportfehler oder fehlender eindeutiger Evidenz folgt ein zweiter **separater frischer Tab** über `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Redirects zwischen ID-Route und kanonischer URL gelten als erfolgreich, wenn die erwartete Anzeigen-ID eindeutig übereinstimmt.
- „Meine Anzeigen“ wird ebenfalls über einen eigenen frischen Prüftab aufgelöst. Liefert dieser eine abweichende kanonische URL, wird auch diese URL erneut in einem weiteren frischen Public-Verification-Tab geprüft.
- Öffentliche Navigation ist zielgebunden: `about:blank`, Stadt-/Suchseiten, Browserfehler und fremde Anzeigen-IDs werden nicht als erfolgreicher `complete`-Zustand akzeptiert. Jeder Verifikationstab wird nach Erfolg, Fehler oder Safety-Stop kontrolliert geschlossen.
- Phase 3 trennt transiente Navigations-/Transportprobleme (`transient-navigation-failure`, `off-target`, `temporarily-unavailable`) von fachlichen Mismatches. Reine Sichtbarkeitsunsicherheit darf die konfigurierten Phase-3-Retries nutzen; echte Inhaltsabweichungen bleiben autoritativ und fail-closed.
- Die Phase-4-Sicherheitsgrenze bleibt unverändert: Die alte Anzeige wird erst nach eindeutig bestätigter öffentlicher neuer Anzeigen-ID und erfolgreicher semantischer Prüfung weiterverarbeitet.
- **Mehrfach-Neuinserate folgen der Gold-Linie:** Im globalen Stepper und in jeder Anzeigenzeile wird ein erfolgreich abgeschlossener Schritt sofort als `✓` mit grünlichem Erfolgszustand dargestellt. Der laufende Schritt bleibt nummeriert/aktiv, zukünftige Schritte bleiben neutral; abgeschlossene Schritte fallen visuell nicht zurück.
- Diagnoseevents dokumentieren pro öffentlichem Versuch frische `tabId`, Versuch, URL-Variante, angeforderte/finale URL, erwartete/erkannte Anzeigen-ID, Ergebnis und Close-Grund.

## 1.20.12

- ZIP-Einzeldurchlauf: Die wechselnden Inhaltskarten liegen jetzt in einem gemeinsamen vertikalen Flow-Stack mit konstantem Abstand. Dadurch überlappen ZIP-Vorschau, Hinweis und Fortschritts-/Ergebniskarte in keiner Phase mehr.
- Der Hinweis „Es wird eine neue Anzeige erstellt.“ verwendet die neutrale Info-Darstellung statt der amberfarbenen Warnungsdarstellung.
- Die laufende ZIP-Inserierung erzeugt keine generische persistente Statuskarte „Anzeige aus ZIP wird inseriert“ mehr. Der Workflow wird über Dialog, Lock und Aktionen-Aktivitätsindikator abgebildet; nach Terminalzustand bleibt keine falsche „läuft“-Meldung stehen.
- Beim Upgrade wird eine eventuell aus v1.20.11 persistierte aktuelle Legacy-Meldung „Anzeige aus ZIP wird inseriert“ einmalig aus der aktiven Statusfläche entfernt und in den Meldungsverlauf überführt.
- ZIP-Workflow-State, Inserierungs-/Publish-/Prüf-/Inventarlogik und die in v1.20.11 eingeführte monotone Schrittfortschrittslogik bleiben fachlich unverändert.


## 1.20.11

- ZIP-Neuinserierung: Workflow-Fortschritt ist jetzt vom allgemeinen Inventar-Live-Refresh entkoppelt. Persistierte Session-Transitions werden über `ARCHIVE_INSERTION_STATE_CHANGED` direkt an die UI übertragen.
- ZIP-Neuinserierungs-Snapshots besitzen eine monotone `revision`; verspätete ältere UI-Snapshots können keinen bereits neueren Schritt oder Terminalzustand mehr zurücksetzen.
- Der erfolgreiche Terminalzustand (`complete`) wird dadurch nicht mehr von einem nachfolgenden `archive-insertion-completed`-Inventarrefresh verdrängt.
- Die Schrittanzeige des ZIP-Einzeldurchlaufs sitzt dauerhaft im oberen Dialogbereich direkt unter Titel/Einleitung und vor den wechselnden Inhalten; abgeschlossene Schritte bleiben gemäß Gold-Linie abgehakt.
- Renewal-/Publish-/Delete-/Vollinventur-Abläufe bleiben fachlich unverändert.


## 1.20.10 – 2026-09-21

- **Aktionen-/Account-Gate architektonisch zentralisiert:** Der UI-Zustand für accountgebundene Aktionen besitzt mit `account-gate.js` eine einzige State-Authority (`checking`, `confirmed`, `transient-unavailable`, `missing`, `ambiguous`, `restricted`). Sichtbares Button-Enablement, Tooltips und Klick-Guard leiten sich aus demselben Gate-Modell ab.
- Passive Health-Checks degradieren eine zuletzt bestätigte Profilbindung bei transienten Tab-/Content-/Navigationsfehlern nicht mehr zu `missing`. Die bestätigte Identität bleibt erhalten; bei passender Profilbindung bleiben Aktionen im Zustand `ready-transient` nutzbar. Autoritative Belege wie Logout, kein Kleinanzeigen-Tab, Mehrdeutigkeit oder Plattform-Safety sperren weiterhin sofort.
- **Managed Account-Probe zielgebunden:** `managed-navigation.js` trennt das alte `about:blank`-Dokument von der angeforderten Zielnavigation. Ein beliebiges `tab.status === complete` reicht nicht mehr; erst die erwartete Kleinanzeigen-Ziel-URL plus `complete` gilt als bereit. Browser-Fehlerseiten/Fremdziele werden als off-target klassifiziert. Der Probe-Pfad hat höchstens zwei Versuche und retried H1/H2-Plattform-Safety ausdrücklich nicht.
- Der 60-s-Healthcheck bleibt Safety-Fallback. Kurze Recovery-Checks (z. B. 650 ms) können nicht mehr durch den nachgelagerten 60-s-Timer überschrieben werden; der Scheduler behält immer den früheren fälligen Check.
- **Diagnose erweitert:** `ACCOUNT_GATE_TRANSITION`, `PROFILE_BINDING_TRANSITION` und `ACCOUNT_GATE_ACTION_BLOCKED` dokumentieren State-/Profil-/Freigabewechsel. Der Diagnose-ZIP enthält zusätzlich `account-gate-state.json` mit aktuellem Gate, ausgewähltem Profil, zuletzt bestätigtem Live-Profil, Quelle, Grund und Generation.
- **Scope-Isolation:** Vollinventur-/Reconciliation-Readiness aus v1.20.9 sowie Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Abläufe werden fachlich nicht umgebaut. Backend-Account-Binding vor echten Remote-Aktionen bleibt als frische Sicherheitsprüfung erhalten.


## 1.20.9 – 2026-09-21

- **Inventarisierungs-Readiness architektonisch vereinheitlicht:** `tab.status === "complete"` bleibt das eventgetriebene Navigationssignal aus P6a. Danach prüft eine gemeinsame fachliche `MyAds`-Readiness, ob Seite 1, Profilbindung, Online-Zähler und Anzeigenkarten tatsächlich konsistent verfügbar sind.
- Die Readiness läuft im Content-Kontext primär über einen kurzlebigen `MutationObserver`; ein 1-s-Recheck bleibt nur Safety-/Recovery-Fallback. Pro frischem Source-Tab gilt ein 12-s-Limit. Ein echter Nullbestand wird unterstützt und 1,2 s stabilisiert; `null`/nicht erkannt bleibt semantisch unbekannt und wird nicht länger über `Number(null)` zu 0.
- Der Vollinventurstart besitzt nur noch eine autoritative Background-Operation (`START_BULK_INVENTORY_OPERATION`). Der frühere aktive Split aus `PREPARE_BULK_INVENTORY_SOURCE` und `START_BULK_INVENTORY_FRESH` wurde aus dem Router entfernt. Source-Erzeugung, Readiness und `BULK_INIT_RUN` teilen sich dieselbe `operationId`.
- Transiente Readiness-Timeouts dürfen höchstens einen zweiten frischen „Meine Anzeigen“-Source verwenden. Falsche Seite, falsches Profil und Plattform-Safety (`KR_PLATFORM_ACCESS_RESTRICTED`) werden nicht durch zusätzliche Source-Retries kaschiert.
- Die unabhängige zweite Bestandsprüfung verwendet dieselbe Readiness-Primitive und übernimmt den verifizierten `readySnapshot` direkt in den Reconciliation-Scan. Der in v1.20.7 eingeführte lokale 500-ms-Polling-Sonderpfad entfällt. Dauerhafte Unsicherheit bleibt `needs-review` mit `movedToTrash = 0`.
- A2-Korrelation ist für diesen Workflow durchgängig: Source-Operation und resultierender Bulk-Run bleiben demselben Vorgang zugeordnet. Inventur-Source-Tabs werden über die TabRegistry kontrolliert verwaltet/geschlossen.
- **Scope-Isolation:** Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Verifikationspfade wurden bewusst nicht auf die neue Inventur-Readiness migriert. Der bewährte Renewal-Stand sowie der v1.20.8-Worker-Tab-Create-Retry bleiben erhalten.

## 1.20.8 – 2026-09-21

- **Transienten Bulk-Worker-Tab-Erzeugungsfehler abgefangen:** Der zwingende Bearbeiten-Worker erhält genau einen lokalen Wiederholungsversuch nach 200 ms, wenn `chrome.tabs.create()` transient fehlschlägt oder keinen gültigen Tab zurückgibt. Ein erfolgreicher zweiter Versuch verarbeitet dieselbe Anzeige weiter; es wird nicht zur nächsten Anzeige gesprungen.
- H1/H2-Plattform-Safety bleibt autoritativ: `KR_PLATFORM_ACCESS_RESTRICTED` wird niemals wiederholt. Nach zwei fehlgeschlagenen Erzeugungsversuchen bleibt die Anzeige weiterhin fail-closed als Fehler markiert.
- Der ursprüngliche `chrome.tabs.create()`-Fehler wird jetzt in `BULK_WORKER_TAB_CREATE_RETRY` bzw. `BULK_WORKER_TAB_CREATE_FAILED` diagnostisch erhalten. Ein erfolgreicher Recovery-Versuch wird mit `BULK_WORKER_TAB_CREATE_RECOVERED` dokumentiert.
- Wenn der optionale Metadaten-Tab bereits erfolgreich erzeugt wurde, der zwingende Bearbeiten-Worker aber endgültig scheitert, wird der Metadaten-Tab sofort kontrolliert geschlossen. Dadurch bleibt kein unregistrierter/orphaned Worker-Tab zurück.
- Der manuelle Einzel-Retry eines fehlgeschlagenen Inventareintrags verwendet denselben begrenzten Worker-Erzeugungs-Recovery-Pfad.
- Die v1.20.7-Reconciliation-Readiness-Korrektur sowie Publish-/Delete-/Account-/H1/H2-Safety-Gates bleiben unverändert.

## 1.20.7 – 2026-09-21

- **QA-01 Reconciliation-Readiness-Race behoben:** Ein frischer „Meine Anzeigen“-Tab wird nach `tab.status === "complete"` nicht mehr wegen eines transienten, noch nicht hydrierten `0 Anzeigen online`-Status sofort verworfen.
- Bei ansonsten korrekter Seite 1 und passender Profilbindung wird ein abweichender/noch nicht erkannter Online-Zähler lokal und begrenzt bis zu 12-mal im Abstand von 500 ms erneut gelesen. Sobald der erwartete Bestand stabil sichtbar ist, startet die unabhängige zweite Bestandsprüfung auf demselben frischen Tab.
- Falsche Seite, falsches Profil oder dauerhaft abweichender Bestand bleiben Fail-Closed. Nach maximal zwei frischen Quellen endet der Lauf weiterhin mit `needs-review`; `movedToTrash` bleibt 0. Ein tatsächlich erwarteter leerer Bestand (`expectedTotal = 0`) wird ohne künstliche Wartezeit akzeptiert.
- Safety-, Account-, H1/H2-, Lösch-, Publish- und Reconciliation-Mutationsgates bleiben unverändert. Basis ist ausdrücklich die kanonische v1.20.5; die frühere v1.20.6-Diagnoseversion wurde nicht als Source verwendet.

## 1.20.5 – 2026-09-21

- **Lifecycle-Race-Fix nach Low-Resource Phase 2:** Ein bereits gestarteter Content-Bootstrap wird nach einem planmäßigen Renewal-Target-Close nicht mehr als technischer Bootstrap-/Connection-Fehler protokolliert.
- `expectedControlledTabCloseEntry()` erkennt neben finalen `goneReason`-Tombstones jetzt auch den bereits vor `chrome.tabs.remove()` persistierten `closeIntentReason`. Damit ist der kontrollierte Close bereits während des physischen Tab-Schließens neutral klassifizierbar; ein aktiver Close-Intent gilt dafür höchstens 10 Sekunden.
- Sowohl der `executeScript`-Inject-Pfad (`No tab with id`) als auch der nachgelagerte Handshake (`Receiving end does not exist`) reklassifizieren einen inzwischen planmäßig geschlossenen Tab **vor** `CONTENT_SCRIPT_BOOTSTRAP_FAILED` zu `CONTENT_SCRIPT_BOOTSTRAP_EXPECTED_TAB_CLOSE` / `KR_TAB_EXPECTED_CLOSED`.
- Keine neue Performanceoptimierung: P6a, Bildtransport/IPC, Bildreihenfolge, Settling-, Publish-, Delete-, Reconciliation-, H1/H2- und Account-Semantik bleiben gegenüber v1.20.4 unverändert.

## 1.20.4 – 2026-09-20

- **Low-Resource Performance II / Phase 2:** P6a stellt Tab-Readiness von 250-ms-Polling auf `chrome.tabs.onUpdated` als Primärsignal um. Die fachliche Bedingung bleibt bewusst unverändert `tab.status === "complete"`; ein 2-s-Safety-/Recovery-Check bleibt erhalten.
- Eine Signal-Generation schließt den Race zwischen letzter Tab-Abfrage und dem Scharfschalten des Event-Waiters, ohne einen zusätzlichen Polling-Takt einzuführen. `tabs.onRemoved` weckt wartende Operationen ebenfalls sofort; vorhandene TabRegistry-/Expected-Close-Semantik bleibt erhalten.
- Der lokale Bildtransport Background → Content nutzt **512-KiB-Chunks** statt 256 KiB. Uploadreihenfolge, serverseitige Anlage und überlappende CDN-/Preview-Stabilisierung bleiben unverändert.
- Pro aktivem Bild wird Session-/Ownership-Berechtigung einmal validiert und das lokale Blob kurzzeitig in einem streng begrenzten Worker-Cache gehalten. Folgechunks lesen weder `templateFillSessions` noch dasselbe IndexedDB-Bild erneut. Nach dem letzten Chunk, Terminalzustand, Tab-Close oder TTL wird das Blob freigegeben.
- `getInventoryImage()` verwendet die bereits vorhandene geteilte IndexedDB-Verbindung. Bei Service-Worker-Neustart ist der Cache leer und der bestehende persistente Fallback greift automatisch.
- **Phase 3 – Manager UI/RAM** (P8 Preview-Lazy-Loading/LRU und P9 inkrementelles Rendering) bleibt bewusst offen.

## 1.20.3 – 2026-09-20

- **Low-Resource Performance II / Phase 1:** Der Renewal-/Storage-Hot-Path wird reduziert, ohne fachliche Workflow- oder Safety-Gates zu lockern.
- Normale Bild-Mikrofortschritte (`queued`, `uploading`, `checking`, `stable`) werden nicht mehr bei jedem Schritt als Recovery-Zustand durch `templateFillSessions`, Renewal-Session und Renewal-Skeleton persistiert. Fehler-, Verify-, Publish- und Terminalzustände bleiben dauerhaft.
- Der frühere direkte `touchMassRenewalProgressForFill()`-Pfad entfällt. Transienter Bildfortschritt wird pro Renewal über die bestehende 1,5-s-Mass-Batch-Koaleszierung zusammengefasst; terminale Zustände werden weiterhin sofort reconciled.
- Profilindex-Reads sowie Renewal-Skeleton-Reads/-Writes verwenden eine wiederverwendete IndexedDB-Verbindung für die Lebenszeit des Background-Service-Workers. Bei `versionchange` wird die Verbindung kontrolliert geschlossen und beim nächsten Zugriff neu geöffnet.
- Die indexbasierte 30-Tage-Papierkorb-Bereinigung cached den nächsten relevanten Expiry-Zeitpunkt. Solange kein Eintrag fällig sein kann, überspringen normale Inventar-/Papierkorb-Reads die zusätzliche Expiry-Abfrage. Neue Trash-Einträge und Frist-Resets invalidieren den Cache.
- Routine-Diagnoseevents werden stärker gebündelt: 1,2-s-Fenster und bis zu 120 Pending-Events. Der bereits persistierte Diagnosebestand wird pro Worker-Lebenszeit im Speicher gecacht, sodass Routine-Flushes nicht jedes Mal zuerst `chrome.storage.local` lesen. Warning/Error-, Safety-, Recovery- und terminale Events bleiben sofort persistent.
- **H3/P11 Event-driven Inventory DOM Scanning** ist als späterer Backlogpunkt festgehalten und bewusst nicht Teil dieses Releases.


## 1.20.2 – 2026-09-20

- **Expected-Close-Race behoben:** Die TabRegistry persistiert den beabsichtigten kontrollierten Close-Grund jetzt vor `chrome.tabs.remove()`. Ein unmittelbar eintreffendes `tabs.onRemoved` kann den Grund dadurch nicht mehr temporär zu einem generischen `tabs.onRemoved`/`KR_TAB_GONE` degradieren. Planmäßig geschlossene Renewal-/Worker-Tabs bleiben auch in diesem Race neutral diagnostiziert.
- **A7 IndexedDB-Indizes umgesetzt:** Das Datenbankschema steigt kontrolliert auf Version 2. Der Inventar-Store besitzt zusätzlich `profileId` sowie `trashExpiresAt` (`trash.expiresAt`) als Indizes; bestehende Datensätze werden von IndexedDB beim Schema-Upgrade automatisch in die Indizes aufgenommen, ohne fachliche Datenmigration.
- Profilbezogene `LIST_INVENTORIES`-/`LIST_TRASH`-Reads verwenden für normale Profile den `profileId`-Index statt den gesamten Inventar-Store per `getAll()` zu materialisieren. Nicht zugeordnete Legacy-Datensätze behalten einen sicheren Fallback.
- Die 30-Tage-Papierkorb-Bereinigung fragt abgelaufene Einträge direkt über `trashExpiresAt` ab, statt vor normalen Listenabfragen den gesamten Inventar-Store zu scannen.
- Weitere profilgebundene Pfade wurden auf den Index umgestellt: Profil löschen, Inventar leeren, Reconciliation-Kandidaten und der Delta-Erfassungs-Snapshot bekannter Anzeigen-IDs.
- Die Profil-Erkennung zählt nicht zugeordnete aktive Einträge per Cursor, ohne dafür `listInventories()` samt Papierkorb-Purge und globalen Array-Reads aufzurufen.
- Profilbackup/-Restore nutzt im Manager den Profilindex sowie den vorhandenen `images.inventoryId`-Index für Snapshots; direkte App-Datenbankzugriffe sind versionsneutral, damit ausschließlich der Background die Schema-Migration besitzt.
- **A6/P7 bleibt unverändert aktiv.** Renewal-Filler, 200-ms-Settling, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates werden durch A7 nicht gelockert.

## 1.20.1 – 2026-09-20

- **A6/P7 Event-driven Lifecycle/Health** ist als erster Low-Resource-Optimierungsblock umgesetzt. Fachliche Renewal-, Publish-, Delete-, Reconciliation-, H1/H2- und Account-Gates bleiben unverändert.
- Der Manager fragt `GET_BULK_RUN_STATUS` nicht mehr jede Sekunde ab. Der persistierte Bulk-Status wird einmal beim Start geladen und danach direkt über `chrome.storage.onChanged` für `bulkInventoryRun` aktualisiert.
- Änderungen am Massen-Neuinserierungs-Batch werden direkt aus `massRenewalBatchV1` übernommen. Das bisherige `mass-renewal-updated`-Signal löst dadurch keinen vollständigen Inventar-/Papierkorb-Refresh mehr aus. Inventaränderungen des eigentlichen Renewals bleiben weiterhin über die vorhandenen Renewal-Events sichtbar.
- Normale Inventar-Refreshes führen keinen zusätzlichen Bulk-Status-Read mehr aus. Dadurch entfallen weitere redundante Storage-/Background-Roundtrips.
- Die Account-/Tab-Gesundheitsprüfung bleibt ereignisgetrieben über `tabs.onUpdated`, `tabs.onActivated`, `tabs.onRemoved` und Plattform-Safety-Events. Der periodische Safety-/Recovery-Fallback wurde von 15 Sekunden auf **60 Sekunden** verlangsamt.
- Managed Worker werden im Manager aus dem persistenten `tabRegistryV1`-Session-Cache verfolgt. Account-Inspektionen müssen dafür nicht mehr bei jedem Health-Check `GET_MANAGED_WORKER_TAB_IDS` beim Background abfragen.
- Tab-Events von verwalteten Worker-Tabs und unbekannten inaktiven Tabs lösen keine teure Account-Inspektion mehr aus. Bekannte User-Tabs, aktive User-Tabs und relevante „Meine Anzeigen“-Tabs bleiben ereignisgetrieben beobachtet.
- A7 IndexedDB-Indizes ist bewusst **noch nicht** enthalten. Damit kann der definierte 3er-Benchmark auf dem alten Rechner den Effekt von A6/P7 isoliert gegen die v1.20.0-Baseline messen.

## 1.20.0 – 2026-09-19

- Der Bereich **Diagnose** besitzt zusätzlich die Aktion **Reset**. Sie beginnt bewusst eine neue persistente Diagnose-Messgrenze für reproduzierbare Benchmark- und Fehlerläufe.
- Beim Reset werden zuvor gepufferte Diagnoseeinträge zuerst abgeschlossen; anschließend werden alte Diagnose-/Galeriedaten aus dem aktiven Exportkontext entfernt und `DIAGNOSTIC_SESSION_RESET` als erster neuer Diagnosepunkt geschrieben.
- Der manuelle Diagnose-Beginn wird persistent gespeichert. Ein Service-Worker-Neustart während des anschließenden Laufs beendet daher nicht die bewusst gestartete Messgrenze; der Diagnoseexport umfasst weiterhin nur Daten ab dem letzten Reset.
- Reset ist während laufender Erfassung, Einzel-Erfassung, Neu-Inserierung/Massen-Neuinserierung oder Profiltransfer deaktiviert und wird im Background zusätzlich gegen persistierte laufende Workflows abgesichert. Eine Rückfrage ist bewusst nicht erforderlich.
- A6/P7 und A7 sind in dieser Version noch **nicht** umgesetzt. v1.20.0 dient als unveränderte funktionale Benchmark-Basis auf v1.19.8, bevor die Low-Resource-Optimierungen beginnen.
- Workflow-, Publish-, Delete-, Reconciliation-, H1/H2-, Account- und Safety-Gates bleiben unverändert.

## 1.19.8 – 2026-09-18

- Profil-Backups deduplizieren identische Bildpayloads physisch per SHA-256, ohne logische `imageKey`-/Inventarzuordnungen beim Restore zu verlieren; Manifest/Diagnose unterscheiden Bildreferenzen, eindeutige Bilddateien und eingesparte Bytes.
- Profil-Export und -Wiederherstellung verwenden einen exklusiven operationsgebundenen Transfer-Lock; parallele zustandsverändernde Manager-Aktionen sind währenddessen gesperrt.
- Abbruch des nativen Restore-Dateipickers lässt das Profilmanagement geöffnet und unverändert.
- Ungültige Profilbackup- und Anzeigen-ZIPs zeigen in Dialog und Activity Center verständliche Endanwendertexte; technische Ursachen bleiben diagnostisch protokolliert.
- Der reine Sicherheitshinweis im Renewal-Dialog verwendet neutrale Info-Semantik statt Amber-Warnoptik.
- Template-Fill führt nach erfolgreichen Feldinteraktionen eine 200-ms-Settling-Phase aus. Kategorie-Öffnungen erhalten kurze lokale Versuche entsprechend der bestehenden Einstellung `Versuche je Phase`, bevor der übergeordnete Retry-Pfad greift.
- Die DOM-/IndexedDB-Suite bleibt optional und wird bei fehlenden `linkedom`/`fake-indexeddb` explizit als SKIPPED behandelt.

## 1.19.7 – 2026-09-18
- Der geöffnete Bereich **Aktionen** verwendet nach seiner Öffnungs-/Schließanimation wieder die natürliche Inhaltshöhe. Neue Status-/Ergebniskacheln vergrößern den Bereich dadurch automatisch; entfernte Kacheln lassen ihn ohne Leerraum wieder schrumpfen.
- **Weitere Meldungen anzeigen** bleibt als stabiler Verlaufszugang immer sichtbar und zeigt rechts einen kompakten Bestandszähler. Ein leerer Verlauf zeigt bewusst `0`; bei einer wegen der Obergrenze gekürzten Historie wird `250+` angezeigt.
- Der Meldungsverlauf wird automatisch auf **30 Tage** und höchstens **250 gespeicherte Einträge** begrenzt. Ein persistierter Overflow-Status unterscheidet exakt `250` von `250+`.
- Jede historische Meldung besitzt oben rechts ein kleines **×** und kann ohne Rückfrage einzeln dauerhaft gelöscht werden. Das Entfernen blendet und klappt die Karte kurz aus; bei `prefers-reduced-motion` erfolgt es ohne Animation.
- Workflow-, Publish-, Delete-, Reconciliation-, H1/H2-, Account- und Safety-Gates bleiben unverändert.

## 1.19.6 – 2026-09-18
- Die Seitenleiste zeigt im Bereich Aktionen nur noch eine aktuelle Status- oder Ergebniskachel. Frühere Meldungen werden beim Wechsel in einen persistenten Meldungsverlauf verschoben und über die kompakte Aktion „Weitere Meldungen anzeigen“ in einem Modal zugänglich.
- Laufende Erfassungen, minimierte Erfassungen, Renewal-Fortschritt und Abschlussmeldungen werden über eine gemeinsame Anzeige-Arbitration geführt, sodass keine konkurrierenden Kacheln mehr gleichzeitig Platz belegen.
- Der Erfassungsdialog verwendet „Auswahl im Überblick“ als dynamische Zusammenfassung aller vier Kombinationen aus Erfassungsumfang und Prüfmodus. In Fortschritt und Ergebnis erscheint dieselbe Auswahl neutral statt als gelbe Hinweisleiste; im Ergebnis wird in Vergangenheitsform zusammengefasst.
- Das Manager-Fenster startet mit einer festen ergonomischen Größe von 1180 × 900 Pixeln. Die Chrome-Extension-API bietet keine native minWidth/minHeight-Grenze; bewusst wird keine Resize-Rücksprung-Emulation eingesetzt.

## 1.19.5 – 2026-09-18
- Jede neue Erfassung startet in einem frisch geöffneten, verwalteten „Meine Anzeigen“-Tab; paginierte Tabs vorheriger Erfassungen werden nicht wiederverwendet oder neu geladen.
- Der frische Inventur-Tab wird intern auf Konto, PROJECTS-Ansicht und Seite 1 geprüft. Der Start-Recovery ist auf zwei frische Tabs begrenzt; Reload-Schleifen sind ausgeschlossen.
- Der Erfassungs-Stepper steht jetzt stabil direkt unter der Einleitung; Schritt 1 heißt „Einstellungen“. Wechselnde Inhalte scrollen in einem eigenen Inhaltsbereich, während Orientierung und Aktionen stabil bleiben.

## 1.19.4 – 2026-09-18

- **Phase 3 / Bestand bestätigen:** Der zweite unabhängige Bestandsabgleich verwendet immer einen frisch erzeugten, verwalteten „Meine Anzeigen“-Hintergrundtab statt den vom ersten Scan paginierten Quelltab wiederzuverwenden.
- Vor dem zweiten Scan werden PROJECTS-Ansicht, bestätigtes Kleinanzeigen-Konto, `currentPage === 1` und die erwartete Online-Anzahl explizit geprüft. Erst danach startet die zweite vollständige ID-Prüfung.
- Der bisherige Page-1-Reset per `location.replace(MY_ADS_PROJECTS_URL)` und die daraus mögliche Reload-Schleife wurden entfernt.
- Recovery ist streng begrenzt: maximal zwei frische Phase-3-Quelltabs insgesamt. Scheitern beide, endet die Erfassung mit **Prüfung nötig**, `movedToTrash: 0` und ohne Reconciliation-Mutation.
- Der erste paginierte Quelltab wird nach erfolgreichem Übergang kontrolliert beendet; der Phase-3-Tab läuft über die bestehende TabRegistry-/Controlled-Close-Logik. H1/H2 gelten auch für diesen neuen Source-Lifecycle.
- Neuer RED→GREEN-Regressionstest deckt den realen Mehrseitenfall ab: erster Scan endet auf Seite 3, erster frischer Recovery-Versuch kann ungültig sein, zweiter frischer Tab auf Seite 1 startet den Bestandsabgleich; zwei ungültige frische Starts führen sicher zu `needs-review`.
- Delta-Erfassung, Schnell-/Vollprüfung, Reconciliation-Gates, Publish-/Delete-Gates, Extension-ID, Manifest-Key, Permissions und Host-Permissions bleiben unverändert.

## 1.19.3 – 2026-09-18

- Der Dialog **Alle laufenden Anzeigen erfassen** fasst **Erfassungsumfang** und **Prüfmodus** jetzt in einer gemeinsamen Box **Einstellungen für diese Erfassung** zusammen. Die Reihenfolge bleibt bewusst **Was → Wie**.
- Beim **Erfassungsumfang** steht der feste Standard **Nur neue Anzeigen erfassen** jetzt an erster Stelle. Die vollständige Alternative heißt endanwenderfreundlich **Gesamten Bestand neu einlesen**.
- Die Beschreibungstexte beider Erfassungsumfänge wurden gekürzt und klar gegeneinander abgegrenzt. Ein zusätzlicher Hinweis erklärt, dass für regelmäßige Erfassungen meist **Nur neue Anzeigen erfassen** ausreicht.
- Die Texte für **Schnellprüfung** und **Vollprüfung** wurden ebenfalls vereinfacht: Schnellprüfung beschreibt den schnelleren Ablauf mit weniger Zusatzprüfungen und möglichen abgeleiteten Angaben; Vollprüfung nennt die direkte Prüfung aller verfügbaren Angaben.
- Sichtbare Begriffe **Massenlauf** und **Inventurlauf** wurden aus Runtime-Meldungen entfernt. Inventurmeldungen verwenden konsequent **Erfassung**; beim gemeinsamen Neu-Inserieren werden je nach Kontext **Neu inserieren** oder **Vorgang** verwendet.
- Die in v1.19.2 eingeführte Delta-/Vollerfassungslogik, Reconciliation, H1/H2, kontrollierter Stopp sowie Publish-/Delete-Sicherheitsgrenzen bleiben funktional unverändert.

## 1.19.2 – 2026-09-18

- Der Dialog **Alle laufenden Anzeigen erfassen** trennt jetzt nach dem Prinzip „Was, dann Wie“ zuerst den **Erfassungsumfang** und anschließend den **Prüfmodus**.
- **Nur neue Anzeigen erfassen** ist bei jedem Öffnen des Dialogs bewusst der Standard. Bereits aktive Einträge desselben Inventarprofils werden ausschließlich anhand ihrer numerischen Anzeigen-ID erkannt und ohne Bearbeiten-/Detail-Worker übersprungen; nur unbekannte Anzeigen-IDs werden vollständig neu erfasst. Bei einem neuen oder leeren Profil sind dadurch automatisch alle gefundenen Anzeigen neu und werden vollständig erfasst.
- **Alle Anzeigen aktualisieren** muss für jeden Lauf ausdrücklich neu gewählt werden und entspricht der bisherigen vollständigen Erfassung aller laufenden Anzeigen. Die Auswahl des Erfassungsumfangs wird nicht persistent gespeichert.
- Der **Prüfmodus** wird beim Öffnen einmalig aus der Konfiguration übernommen. Eine Umschaltung zwischen Schnellprüfung und Vollprüfung im Dialog gilt ausschließlich für diesen Lauf und verändert die Konfiguration nicht.
- Delta-/Neu-Erfassung reduziert nur die Detail-Inventarisierung. Der erste vollständige ID-Bestand und die zweite unabhängige Bestandsbestätigung bleiben über alle laufenden Anzeigen erhalten; Reconciliation-/Papierkorb-Gates werden nicht gelockert.
- Fortschritt und Ergebnis weisen übersprungene, bereits vorhandene Anzeigen separat aus. Der kontrollierte Stopp aus v1.19.1 und H1/H2 bleiben unverändert wirksam.


## 1.19.1 – 2026-09-18

- **HARDENING H1:** Die bekannte Sperrseite „IP-Bereich vorübergehend gesperrt“ wird über einen gemeinsamen, bewusst engen Detector als eigener Plattform-Sperrstatus klassifiziert; generische Hilfe-/Fehlertexte werden nicht fälschlich als Sperre erkannt.
- **HARDENING H2:** Eine bestätigte Plattform-Sperre setzt einen persistenten globalen Safety-Stop. Neue automatisierte Kleinanzeigen-Tabs/-Navigationen und Remote-Workflow-Aktionen werden blockiert; laufende Bulk-, Renewal-, Archiv-, Fill- und Massenläufe werden sicher terminalisiert. Nach Service-Worker-Neustart erfolgt keine automatische Wiederaufnahme.
- Lokale Funktionen bleiben nutzbar. Eine erneute Plattformprüfung wird nicht automatisch geplant, sondern ausschließlich durch die sichtbare Nutzeraktion **Erneut prüfen** ausgelöst.
- Vollinventur erhält **Nach aktueller Anzeige stoppen**: Die aktuelle Anzeige wird vollständig abgeschlossen, danach startet keine weitere Anzeige; der Bestandsabgleich wird übersprungen und das Ergebnis weist bearbeitete sowie nicht bearbeitete Anzeigen transparent aus.
- Plattform-Sperren erzeugen einen eigenen Diagnose-/Fehlercode statt als gewöhnlicher Ladefehler in normale Retry-Schleifen zu fallen.
- PERFORMANCE-5 aus v1.19.0, Reconciliation-Gates, Profil-Backup, Publish-/Delete-Sicherheitsgrenzen, Extension-ID, Manifest-Key, Permissions und Host-Permissions bleiben unverändert.

## 1.19.0 – 2026-09-18

- **PERFORMANCE-5:** Bild-Uploads beim Neu-Inserieren bleiben strikt sequenziell; nach bestätigter serverseitiger Anlage wird die Preview-/CDN-Stabilisierung eines Bildes jedoch vom nächsten Upload entkoppelt und darf überlappend weiterlaufen.
- Vor dem finalen Erfolgsgate werden alle ausstehenden Preview-Stabilisierungen vollständig abgewartet. Die bestehende Endprüfung auf vollständige Bildanzahl, terminal stabile Vorschauen und Reihenfolge bleibt verpflichtend.
- Keine parallelen Bild-Uploads; ein fehlgeschlagener serverseitiger Upload bricht weiterhin ab, bevor nachfolgende Positionen verschoben werden könnten.
- PERFORMANCE-6 bleibt offen. PERFORMANCE-7 wird künftig als Teilpaket von A6 „Event-driven Lifecycle/Health“ geführt und ist nicht Bestandteil dieses Builds.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions, Renewal-/Publish-/Delete-Gates, Reconciliation, Profil-Backup und Prüfmodi bleiben unverändert.

## 1.18.4 – 2026-09-18

- UX-/Text-Polish ohne Änderung der Workflow- oder Sicherheitslogik: sichtbare Schnell-/Vollprüfungs-Hinweise erklären Nutzen und Konsequenz ohne interne Begriffe wie Read-only-Tab, Remote-Bestand oder Vollscan.
- Die Badge **Abgeleitet** ist kompakter und als gelb/amberfarbener Hinweis gestaltet. Ihr Tooltip lautet kurz und handlungsorientiert: **„Aus Enddatum berechnet. Mit „Daten aktualisieren“ direkt prüfen.“**
- Der Bestandsabgleich wird in der Oberfläche als zweite Sicherheitsprüfung erklärt; bei Abweichung wird verständlich mitgeteilt, dass nichts automatisch in den Papierkorb verschoben wurde.
- Profilverwaltung verwendet **Profil sichern**, **Profil aus Sicherung wiederherstellen** und **Profil entfernen**. Sicherungs-/Wiederherstellungs-Fehlertexte folgen derselben Endanwender-Terminologie.
- Massen-Neuinserat verwendet kürzere Texte wie **Reihenfolge**, **Die Anzeigen werden von oben nach unten neu inseriert.** und **Anzeigen werden neu inseriert …**; die ZIP-Schnellprüfung nennt den übersprungenen Schritt **Zusätzliche Inhaltsprüfung wird übersprungen**.
- Renewal-Fortschritt verzichtet auf die unnötige Vorsilbe „Automatischer“; sichtbare Inventarisierungs-Texte werden auf **Erfassung** vereinheitlicht.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions, Prüfmodi, Retry-Semantik, Reconciliation, Profil-Backup-Datenformat, Publish-/Delete-Gates und Taskleisten-Identität bleiben unverändert.

## 1.18.3 – 2026-09-18

- **In Papierkorb** behebt den nach erfolgreichem IndexedDB-Commit auftretenden `ReferenceError: trashed is not defined`: `moveInventoryToTrash()` verwendet nach der Transaktion ausschließlich den aufgelösten Promise-Rückgabewert. Der Fehler wurde mit einem gezielten Runtime-Regressionstest gegen v1.18.2 reproduziert und anschließend GREEN abgesichert.
- Der Dialog **Alle laufenden Anzeigen erfassen** zeigt den aktiven Prüfmodus vor dem Start sowie während Fortschritt und Ergebnis sichtbar an. Schnellprüfung erklärt den entfallenden öffentlichen Read-only-Tab und die mögliche Ableitung von `Anzeige vom`; Vollprüfung erklärt die direkte Read-only-Verifikation. Laufende/reopenete Bulk-Läufe verwenden dafür ihren persistierten `verificationMode`.
- Im Massen-Neuinserat stehen die drei Reihenfolgeaktionen ganz rechts als gemeinsame Gruppe **[Drag][↑][↓]**.
- Schnellinventur-Heuristik, Reconciliation, Profil-Backup/-Restore, globale Retry-Konfiguration, Modal-Scroll-Lock, Taskleisten-Identität sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.

## 1.18.2 – 2026-09-18

- Inventur-Dialog benennt die vier Schritte klarer als **Bestand laden → Anzeigen erfassen → Bestand bestätigen → Ergebnis**.
- Im aktuell gewählten **Schnellprüfungs-Modus** verzichtet die Vollinventur auf den separaten öffentlichen Read-only-Metadaten-Tab pro Anzeige. `Anzeige vom` wird stattdessen aus dem auf „Meine Anzeigen“ sichtbaren `Endet am`-Datum mit der derzeit bewusst angenommenen 60-Tage-Regel abgeleitet. Die Vollprüfung behält den direkten Read-only-Pfad unverändert.
- Heuristisch abgeleitete Veröffentlichungsdaten werden persistent als abgeleitet markiert und in der Inventaransicht mit der neutralen Badge **Abgeleitet** samt Erklärung gekennzeichnet; direkt verifizierte Read-only-Werte haben weiterhin Vorrang. Verlängerungs-/Wiederveröffentlichungs-Sonderfälle werden in dieser ersten Optimierung bewusst nicht zusätzlich verifiziert.
- Der wiederholte Papierkorb-Hinweis wird aus den einzelnen Karten entfernt und einmal zentral im gelben Hinweisbereich angezeigt.
- Jeder Papierkorb-Eintrag erhält **30 Tage neu starten**: Nach Bestätigung wird ausschließlich seine lokale `expiresAt`-Frist ab dem aktuellen Zeitpunkt auf volle 30 Tage gesetzt. Der Eintrag bleibt im Papierkorb; Inventar und Kleinanzeigen bleiben unverändert.
- Reconciliation, Profil-Backup/-Restore, globale Retry-Konfiguration, Modal-Scroll-Lock, Taskleisten-Identität sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.

## 1.18.1 – 2026-09-18

- Vollinventur erhält einen abgesicherten Bestandsabgleich: Der erste vollständige Remote-ID-Bestand wird separat vom Detail-Import erfasst und nach der Inventarisierung durch einen zweiten unabhängigen Vollscan von „Meine Anzeigen“ bestätigt.
- Der zweite Vollscan ist im Inventur-Modaldialog als eigener Schritt **Bestand prüfen** transparent sichtbar. Nur zwei vollständige, identische Remote-Roster dürfen eine Bereinigung freigeben; bei Abweichung, Unterbrechung, Count-/Paging-Fehler oder nicht vollständiger Inventarisierung wird die Bereinigung vollständig übersprungen.
- Erst nach bestätigtem Doppel-Roster werden aktive lokale Einträge desselben Profils, deren numerische Anzeigen-ID remote fehlt, atomar in den 30-Tage-Papierkorb verschoben. Titel-/Preisähnlichkeit wird niemals als Bereinigungsbeweis verwendet; workflowgeschützte Datensätze bleiben ausgenommen und Bilder erhalten.
- Profilmanagement erhält vollständigen Profil-Backup-Export und -Import als versioniertes ZIP mit Profilmetadaten, aktivem Inventar, komplettem Papierkorb samt Löschmetadaten sowie allen referenzierten lokalen Bildern inklusive SHA-256-Integritätsdaten.
- Bei bereits vorhandener Profilidentität ist ausschließlich **Bestehendes Profil vollständig ersetzen** nach ausdrücklicher Sicherheitsabfrage möglich; kein Merge und kein Duplikatprofil. Der lokale Inventar-/Papierkorb-/Bildbestand wird transaktional ersetzt und bei einem nachfolgenden Importfehler rückgesichert.
- Profil-Backups enthalten und reaktivieren keine Renewal-/Massenlauf-/temporären Workflow-Sessions. Kontoabhängige Aktionen bleiben nach Restore weiterhin den bestehenden Live-Konto-Gates unterworfen.
- Neuer RED→GREEN-Vertrag plus Runtime-Tests schützen Reconciliation, Roster-Gates, workflowgeschützte Einträge, Profil-Backup-Roundtrip und Replace-only-Semantik.

## 1.18.0 – 2026-09-18

- Diagnosebereich kompakter: Der Statusbereich unter „Diagnosedaten herunterladen“ belegt im Leerzustand keinen Platz mehr und wird erst bei tatsächlicher Ausgabe sichtbar.
- „Mehrere Anzeigen neu inserieren“ erhält einen vierstufigen Ablauf mit neuem Schritt **Reihenfolge festlegen**. Die Auswahl startet dort exakt in der sichtbaren Tabellenreihenfolge aus Schritt 1 und kann per Drag-and-drop sowie Hoch-/Runter-Steuerung angepasst werden; diese Reihenfolge steuert verbindlich die strikt sequenzielle Batch-Verarbeitung und die Ergebnisdarstellung.
- In Schritt 1 lässt sich die Auswahl zusätzlich durch Klick auf die gesamte Tabellenzeile umschalten; Checkbox, Zeilenstatus und Tastaturbedienung bleiben synchron und direkte Checkbox-Klicks lösen keinen Doppel-Toggle aus.
- Papierkorb-Einträge können über **Als ZIP exportieren** inklusive ihrer lokal gespeicherten Bilder als letzte Sicherung exportiert werden, ohne Datensätze, Wiederherstellung oder Löschlogik zu verändern.
- Scrollbars des App-Inhalts und der internen Scrollbereiche sind farblich an das dunkle Cyan/Grün-Design der App angepasst; die native Windows-/Chrome-Titelleiste bleibt unverändert.
- Taskleisten-Icon-Fix aus v1.17.10, Extension-ID, Manifest-Key, Permissions, Host-Permissions sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
- Neuer RED→GREEN-Vertrag `v1180-ui-workflow.cjs` schützt Version/Taskleistenidentität, Diagnose-Kollaps, Vier-Schritt-Massenworkflow, Zeilenauswahl, Reihenfolgensteuerung, Papierkorb-ZIP und Scrollbar-Styling.

## 1.17.10 – 2026-09-18

- Behebt das falsche/generische separate Windows-Taskleisten-Icon des Popup-Appfensters durch die isoliert nativ verifizierte Probe-E-Änderung: `action.default_title` wird auf `Kleinanzeigen Renewal` zurückgesetzt.
- Der sichtbare Produktname bleibt überall dort, wo er dem Nutzer angezeigt wird, **„kleinanzeigen Manager“**: `manifest.name` und `app.html <title>` bleiben unverändert.
- `chrome.windows.create({ type: "popup" })` sowie sämtliche Icon-Assets bleiben unverändert; `type: "normal"` wird ausdrücklich nicht als Produktfix verwendet.
- Extension-ID, Manifest-Key, Permissions, Host-Permissions sowie Publish-/Renewal-/Phase-4-Sicherheitsgrenzen bleiben unverändert.
- Neuer RED→GREEN-Vertrag `v11710-taskbar-icon-title.cjs` schützt die isolierte Identitätskombination und die Byteidentität aller Icon-Assets gegenüber v1.17.9.

## 1.17.9 – 2026-09-17
- Manueller Inventar-Refresh ist account-gate-sicher sequenziert: erst frische Konto-/Tab-Prüfung, danach Inventar-Render; checking→ready synchronisiert accountgebundene Zeilenaktionen auch bei identischem Konto.
- Kontrolliert geschlossene Renewal-/Worker-Tabs werden über Registry-Tombstones als erwartetes Lifecycle-Ende klassifiziert; nachlaufende Bootstrap-/Background-/App-Health-Anfragen erzeugen dafür keine Warning/Error-Kaskade mehr.
- Windows-Fenster-/Taskleisten-Icon robuster: `favicon.ico` enthält 16/32/48/64/128/256 px und wird von App/Launcher mit den verfügbaren Größen deklariert.
- App-Header und Erweiterungsbeschreibung bilden den kontrollierten Neu-Einstell-/Prüf-/Austauschworkflow genauer ab.
- Mehr Abstand unter dem Hinweis zu „Versuche je Phase“ verbessert die Lesbarkeit vor der unteren Trennlinie.

## 1.17.8 – 2026-09-17

- Phase 1: Dynamische interaktive Merkmalsfelder (`attributeMap[...]`) erhalten bis zu drei lokale, zustandsgeprüfte Auswahlversuche, bevor ein kompletter Phase-1-Erstellversuch verworfen wird.
- Die lokalen Retries gelten sowohl für modal-/buttonbasierte Felder als auch für Such-/Autocomplete-Felder; vor jedem Versuch werden technischer Istwert und aktuelles Control erneut geprüft, und es wird weiterhin ausschließlich ein exakter Zielwert akzeptiert.
- Phase 3: Wenn nach Publish keine belastbare kanonische Public-URL vorliegt, startet die Vollprüfung direkt über „Meine Anzeigen“ und löst dort die echte öffentliche URL auf; der bisherige konstruierte `/s-anzeige/<adId>`-Direktversuch entfällt in diesem Zustand.
- Bestehende Prüf-, Profil-, Publish- und Phase-4-Sicherheitsgrenzen bleiben unverändert.

## 1.17.7 – 2026-09-17

- PERFORMANCE-1: Routine-Diagnosen werden für 350 ms bzw. bis 40 Einträge gepuffert und gebündelt gespeichert; Warning/Error- sowie Safety-/Recovery-/Terminal-Ereignisse flushen sofort.
- PERFORMANCE-2: Nicht-terminale Massenlauf-Fortschrittsupdates werden pro Renewal für 1,5 s zusammengefasst; terminale Zustände werden weiterhin unmittelbar reconciled.
- PERFORMANCE-3: Content-Script-Bootstrap wartet während laufender Navigation, prüft danach den bestehenden Receiver erneut und behandelt Navigation/Injektions-Races als retrybaren Zustand statt als Fehlerkaskade.
- PERFORMANCE-4: Phase-4-Vorprüfung und Delete laufen im selben frischen Worker; der unabhängige frische `VERIFY_OWN_AD_ABSENT_BY_ID`-Post-Delete-Vollscan bleibt verpflichtend.
- Sicherheitsgrenzen unverändert: kein Auto-Publish, kein `.submit()`/`requestSubmit()`, Profilbindung, sequenzieller Massenlauf, unabhängiger Löschbeweis und atomare Promotion bleiben erhalten.

## 1.17.6

- Papierkorb-Aktion **Als Vorlage neu inserieren** in einen geführten Modal-Dialog überführt: Vorlagenvorschau und ausdrückliche Bestätigung vor der Vorbefüllung, klarer Abschluss-Hinweis zur manuellen Veröffentlichung.
- Der bekannte Vorlagen-Tab wird nach der Vorbefüllung passiv beobachtet. Eine neue eigene veröffentlichte Anzeigen-ID wird automatisch erkannt, ohne einen Publish auszulösen.
- Nach erkannter Veröffentlichung steht **Diese Anzeige inventarisieren** zur Verfügung; die Einzelinventur verwendet den bekannten Tab direkt und überspringt den sichtbaren Selektionsschritt. Der Papierkorb-Quelldatensatz bleibt unverändert.
- Accordion-Wechsel zwischen Aktionen, Konfiguration und Diagnose mit kurzer Smooth-Animation und `prefers-reduced-motion`-Fallback.
- Untere Header-Trennlinie als dezenter 1-px-Cyan-Akzent.


## 1.17.5 – 2026-09-17

- Verschiebt die globale Ansichts-Navigation `Inventar | Papierkorb` in den oberen App-Header und dockt sie an die horizontale Trennlinie zum Inhalt an.
- Richtet `Aktionen`, `Konfiguration` und `Diagnose` im Single-Open-Accordion einheitlich linksbündig aus; der aktuell geöffnete Header wird cyan dargestellt.
- Entfernt den redundanten großen Konto-Infoblock unter der Inventarprofil-Auswahl. Eine kompakte Statuszeile mit farbigem Punkt zeigt nur noch den Live-Kontostatus.
- Ausführliche Konto-/Profil-Mismatch-Hinweise bleiben im Bereich `Aktionen`; allgemeine Workflow-Meldungen werden dort weiterhin sichtbar angezeigt.

## 1.17.4 – 2026-09-17

- Sichtbare Produktidentität auf **„kleinanzeigen Manager“** umgestellt. Die bisherige Header-Redundanz aus „KLEINANZEIGEN INVENTAR“ plus großem „Inventar“ entfällt; der kompaktere Header zeigt nur Produktname, Version und Untertitel.
- Linke Seitenleiste als **Single-Open-Accordion** umgesetzt: **Aktionen**, **Konfiguration** und **Diagnose**; standardmäßig ist Aktionen geöffnet, beim Öffnen eines Bereichs schließen die anderen automatisch. Inventarprofil und Live-Konto bleiben oberhalb dauerhaft sichtbar.
- Solange eine konto-/workflowgebundene Aktion läuft, zeigt der Aktionen-Header einen kleinen pulsierenden Aktivitätspunkt. Der Punkt basiert auf Inserierungs-Lock sowie laufender Einzel-/Vollinventur und verschwindet wieder im Leerlauf.
- **Inventar / Papierkorb** sind aus dem globalen Header entfernt und als angedockte Inhaltsnavigation oberhalb des rechten Content-Bereichs platziert. **Aktualisieren** ist als kompakter Refresh-Icon-Button in den Inventar-Contentkopf gewandert; „Alle in Papierkorb“ bleibt als ausgeschriebene Sammelaktion daneben.
- Neue RED→GREEN-Verträge `v1174-sidebar-header-*`; bestehende Konto-, Modal-, Retry-, Publish-, Phase-4-, A1/A2- und Papierkorb-Sicherheitsgrenzen bleiben unverändert.

## 1.17.3 – 2026-09-17

- Profilwechsel löst jetzt sofort eine frische Live-Konto-Prüfung aus. Währenddessen sind kontoabhängige Aktionen gesperrt; danach werden globaler Kontostatus, Aktionsfreigaben und Tooltips konsistent neu gerendert. Das gewählte Inventarprofil bleibt unverändert und wird nie automatisch auf das Live-Konto umgeschaltet.
- Laufende Vollinventur-Statuskarten verwenden eine Chevron-Aktion **„Fortschritt minimieren“** statt des Schließen-`×`. Der Workflow läuft weiter und bleibt über den kompakten Reentry erreichbar; terminale Statuskarten behalten das `×` zum Ausblenden.
- Retry-Microcopy platzsparend auf **„Maximale Versuche je Phase · Standard: 3“** plus kurzen Laufzeit-Hinweis reduziert.
- Sichtbare UI-Texte auf Endanwender-Sprache vereinheitlicht: **Kleinanzeigen-Konto** statt Kleinanzeigen-Profil/Sitzung, verständliche Voll-/Schnellprüfungsbeschreibung und **Prüfung nötig/Prüfbedarf** statt „Aufmerksamkeit“.
- Neue RED→GREEN-Verträge `v1173-*`; bestehende Konto-, Modal-, Retry-, Publish-, Phase-4-, A1/A2- und Papierkorb-Sicherheitsgrenzen bleiben unverändert.

## 1.17.2 – 2026-09-17

- Globale Statuslogik auf **Kleinanzeigen-Konto** statt „Meine Anzeigen geöffnet?“ umgestellt. Eine beliebige geöffnete Kleinanzeigen-Seite reicht als Ausgangspunkt; falls der Kontoname dort nicht direkt lesbar ist, bestätigt ein kurzlebiger Hintergrund-Prüfworker das angemeldete Konto.
- Inventarprofil und Live-Konto sind getrennt: das lokale Inventarprofil bleibt jederzeit frei wechselbar. Alle Live-Aktionen werden nur freigegeben, wenn ausgewähltes Inventarprofil und bestätigtes Kleinanzeigen-Konto übereinstimmen. Eine kompakte Attention-Meldung im Bereich **Aktionen** plus konkrete Button-Tooltips erklären Sperrgründe.
- **Geöffnete Anzeige erfassen** benötigt zusätzlich mindestens eine erkannte eigene Anzeige. **Alle Anzeigen erfassen** benötigt keine vorab geöffnete „Meine Anzeigen“-Seite mehr; die App erzeugt bei Bedarf einen eigenen Hintergrund-Quelltab und räumt ihn nach dem Lauf wieder auf.
- Renewal, ZIP-Neuinserat, Massen-Neuinserat, Einzelinventur und manuelle Datenaktualisierung besitzen zusätzlich Background-seitige Profil-/Kontobindungsprüfungen; lokale Verwaltung, Profilwechsel, ZIP-Export und Papierkorb bleiben unabhängig vom Live-Konto nutzbar.
- Alle sechs nativen Modale sperren den Hintergrundscroll zentral und verschachtelungssicher. Interne Scrollbereiche unterbinden Scroll-Chaining; Profilmanagement und Modalflächen sind viewport-begrenzt.
- Microcopy für **„Versuche je Phase“** vereinfacht: Wirkung und mögliche längere Laufzeit höherer Werte werden erklärt, technische Sicherheitsdetails bleiben aus der Bedienoberfläche heraus.
- Neue RED→GREEN-Verträge `v1172-account-*`; Auto-Publish-, Phase-4-, A1/A2-, Inserierungs-Lock- und Papierkorb-Sicherheitsgrenzen bleiben erhalten.

## 1.17.1 – 2026-09-17

- Neuer globaler Regler **„Versuche je Phase“** unter **Konfiguration → Prüfmodus**. Wertebereich 1–5, Standard 3. Der Wert wird beim Start eines Einzel- oder Massen-Renewals eingefroren und gilt als maximale Gesamtzahl der Versuche pro Phase.
- Phase 1 erhält vollständige frische Erstellversuche vor Publish. Feldspezifische lokale UI-Retries bleiben separat; nach Publish-Klick, persistiertem Publish-Zeitpunkt oder bestätigter neuer Anzeigen-ID ist ein erneuter Phase-1-Aufbau strikt gesperrt.
- Kategorieauswahl ist für langsame Systeme gehärtet: bis zu drei frische semantische Klickversuche mit jeweils bis zu 10 Sekunden Bestätigungszeit. Der bisherige hardcodierte Fallback auf `/p-kategorie-aendern.html` wurde entfernt.
- Phase 2 wiederholt bei transienten Fehlern ausschließlich die frische Detail-/Vollprüfung derselben bereits veröffentlichten neuen Anzeige. Phase 3 wiederholt ausschließlich die Presence-/Profil-Verifikation derselben neuen Anzeigen-ID; Schnellprüfung verwendet dafür pro Versuch einen frischen Worker.
- Phase 4 ist retryfähig, ohne Delete blind zu wiederholen: jeder Versuch prüft die Quellanzeige zuerst über einen frischen unabhängigen Vollscan. Nur wenn sie nachweislich noch vorhanden ist, wird ein weiterer Löschversuch ausgelöst; anschließend folgt erneut `VERIFY_OWN_AD_ABSENT_BY_ID`. Transportunterbrechung bleibt ausdrücklich kein Löschbeweis, Promotion erfolgt weiterhin erst nach `source-delete-verified`.
- Neue RED→GREEN-Verträge `v1171-phase-retries*`; bestehende Phase-4-Vertragstests wurden auf die neue Helper-Struktur aktualisiert, ohne Sicherheitsinvarianten abzuschwächen.

## 1.17.0 – 2026-09-16

- A1b abgeschlossen: `TabRegistry` ist für weitere Lifecycle-Sonderfälle die autoritative Fassade und bietet guarded `releaseOwnership`, `closeTab` und `reloadTabOrThrow`.
- Bekannte `gone`-Tombstones terminalisieren Late Requests sofort als `KR_TAB_GONE`, ohne erneut `chrome.tabs.get()` aufzurufen; Correlation bleibt bis zum bestehenden 30-Sekunden-Prune erhalten.
- Bulk-Source-Ownership wird bei Abschluss, Fehler, Stale-Timeout sowie Retry-Ende owner-/generation-sicher freigegeben. Fehlgeschlagene Bulk-Preflights hinterlassen keine verwaiste Ownership; terminale Runs werden beim Service-Worker-Reconcile nicht reaktiviert.
- Discarded-Reaktivierung wird aus der UI an den Background delegiert und über die Registry neu geladen; es gibt weiterhin keinen stillen Fokuswechsel. Ausgewählte Worker-/Renewal-Cleanup-Pfade nutzen zentrale Registry-Close-Semantik.
- Neue RED→GREEN-Tests `v1170-a1b-authority*`; A2-Correlation sowie Publish-/Phase-4-/Profil-/Lock-/Papierkorb-Sicherheitsgrenzen bleiben unverändert. Nächster Architekturblock: A3a Renewal Mutation Boundary.

## 1.16.9 – 2026-09-16

- Einzel- und Vollinventur-Wiedereinstieg sind strikt nach Workflowtyp und Identität gebunden: Einzelinventur über `adId`, Vollinventur über `runId`. Ein alter terminaler Bulk-Run kann keinen Single-Reentry mehr übernehmen und umgekehrt.
- Während eine Inventarisierung läuft, ist der Start der jeweils anderen Inventarisierungsart gesperrt. Wiedereinstieg rekonstruiert ausschließlich die bestehende UI und startet weder `CAPTURE_SINGLE_INVENTORY` noch `START_BULK_INVENTORY_FRESH` erneut.
- Der kompakte Inventarisierungs-Wiedereinstieg pulsiert nur noch im aktiven Zustand. Erfolg ist statisch grün, Fehler statisch rot und Attention/Prüfbedarf statisch gold.
- Bei von Chrome pausierten (`discarded`) Kleinanzeigen-Tabs zeigt die Statuskarte jetzt **„Kleinanzeigen reaktivieren“**. Die bekannten pausierten Tabs werden ohne Fokuswechsel im Hintergrund neu geladen und anschließend automatisch erneut geprüft.
- Neue RED→GREEN-Tests `v1169-modal-discard-*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Sicherheitssemantik bleiben ansonsten unverändert.

## 1.16.8 – 2026-09-16

- Einzelinventur-Reentry bleibt während einer laufenden Erfassung fest an dieselbe Anzeige gebunden; Healthchecks können den Hauptbutton nicht erneut aktivieren und ein erneuter Einstieg öffnet direkt denselben Fortschritt statt der Kandidatenauswahl.
- Der Toolbar-Klick öffnet bzw. fokussiert das Inventarfenster direkt; das bisherige Zwischen-Popup wird nicht mehr über `default_popup` verwendet.

## 1.16.7 – 2026-09-16

- Inventarisierungsmodale können nach dem Schließen während eines laufenden Vorgangs wieder geöffnet werden, ohne einen zweiten Workflow zu starten.
- Vollinventur: Die persistente Statuskachel bietet „Fortschritt anzeigen“ bzw. nach Abschluss „Ergebnis anzeigen“. Wird die Kachel ausgeblendet, bleibt ein kompakter Wiedereinstieg sichtbar.
- Einzelinventur: Nach Schließen des Modals bleibt ein kompakter Wiedereinstieg sichtbar; während der laufenden Erfassung öffnet er den Fortschritt, nach Abschluss direkt das Ergebnis.
- Reentry rekonstruiert bzw. bindet ausschließlich die bestehende UI an den vorhandenen Run/Status; `START_BULK_INVENTORY_FRESH` und `CAPTURE_SINGLE_INVENTORY` werden dadurch niemals erneut ausgelöst.

## 1.16.6 – 2026-09-16

- Vollinventur-Modal zeigt während „Erfassen“ die aktuell bearbeitete Anzeige als kompakte Vorschaukarte mit Titelbild, Titel und Anzeigen-ID.
- Vorschau wird aus dem frischen „Meine Anzeigen“-Snapshot gespeist und wechselt automatisch mit dem laufenden Item; keine Änderung der Bulk-Verarbeitung.

## 1.16.5 – 2026-09-16

- Reiner Microcopy-Patch für die beiden Inventarisierungsmodale; Workflow-, Tab-, Storage- und Sicherheitslogik bleiben unverändert.
- Gemeinsamer Stepper heißt jetzt **Prüfen → Erfassen → Ergebnis**.
- **Geöffnete Anzeige erfassen** erklärt Auswahl, Mehrfach-Tabs, Fortschritt und Speicherung ohne technische Begriffe wie Read-only oder Hintergrund-Worker. Kandidatenkarten zeigen nur noch Titelbild, Titel und Anzeigen-ID; der Ansichtsmodus bleibt intern.
- **Alle Anzeigen erfassen** verwendet durchgehend den Begriff „Erfassung“ statt „Inventurlauf“ und erklärt die strikt sequentielle Verarbeitung als „immer nur eine Anzeige gleichzeitig“.
- Erfolgs-, Fehler-, Prüf- und Vorbereitungsformulierungen wurden auf denselben Wortschatz vereinheitlicht.

## 1.16.4 – 2026-09-16

- Bugfix öffentliche Galerieerkennung: Ist ein vertrauenswürdiger Galerie-Root wie `#viewad-image` selbst ein `<img>`, wird der Root jetzt als eigener Bildkandidat ausgewertet; `Element.querySelectorAll()` hatte zuvor nur Nachfahren berücksichtigt und deshalb 0 Kandidaten geliefert.
- Behebt bildlose Kandidatenkarten bei realen öffentlichen Anzeigen wie der Schwalbe-Anzeige, wenn `og:image` das generische Kleinanzeigen-Logo enthält und das Titelbild direkt im `#viewad-image`-Element liegt.
- Neue RED→GREEN-Tests `v1164-gallery-root-img*`; übrige Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik unverändert.

## 1.16.3 – 2026-09-16

- Bugfix Kandidaten-Thumbnail: `og:image` wird vor Verwendung gegen `img.kleinanzeigen.de` validiert. Ein generisches Kleinanzeigen-Logo löst jetzt den Galerie-Fallback aus, statt eine bildlose Kandidatenkarte zu erzeugen.
- Kandidaten-Diagnose protokolliert pro `adId` nur noch `hasThumbnail` und die Quelle (`og-image`, `gallery`, `edit-images`, `none`), nicht die Bild-URL.
- Erfolgreiche Einzelinventur zeigt im Ergebnisdialog die tatsächlich persistierte Anzeige mit lokalem Titelbild, Titel, Kategorie, Art, Preis/Preistyp, Enddatum, Anzeigendatum, Speicherzeitpunkt und Anzeigen-ID.
- Neue RED→GREEN-Tests `v1163-single-inventory-result*`; bestehende Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik unverändert.

## 1.16.2 – 2026-09-16

- **„Geöffnete Anzeige erfassen“** zeigt vor dem Start alle aktuell geöffneten eigenen Anzeigen als auswählbare Kandidatenkarten mit kleinem Titelbild, Titel und Anzeigen-ID.
- Kandidaten werden über die stabile `adId` dedupliziert: Read-only- und Bearbeiten-Ansicht derselben Anzeige erscheinen nur einmal. Der Ansichtsmodus beeinflusst die Kandidatenidentität nicht.
- Ist dieselbe Anzeige in mehreren Tabs geöffnet, bevorzugt die Ausführung intern eine vorhandene Bearbeiten-Ansicht; eine öffentliche Ansicht kann weiterhin ergänzend Titelbild/Metadaten liefern.
- Der aktuell aktive bzw. zuletzt verwendete geeignete Kandidat wird vorausgewählt, kann aber vor dem Start sichtbar geändert werden. Die ausgewählte Anzeige bleibt im Fortschrittsdialog mit Thumbnail/Titel/ID sichtbar.
- Der Einzelinventur-Button bleibt verfügbar, sobald irgendein geöffneter eigener Anzeigen-Tab mit stabiler ID erkannt wird; er hängt nicht mehr nur vom ersten Kleinanzeigen-Tab ab.
- Neue RED→GREEN-Tests `v1162-single-inventory-candidates*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Sicherheitssemantik bleiben unverändert.

## 1.16.1 – 2026-09-16

- Bugfix Einzelinventur: Eine geöffnete eigene öffentliche Anzeige wird nicht mehr direkt aus der wechselnden Read-only-Galerie vollständig inventarisiert. Stattdessen wird ihre stabile Anzeigen-ID erkannt und ein verwalteter inaktiver Bearbeiten-Worker als autoritative Datenquelle verwendet.
- Manuell geöffnete bestehende Bearbeiten-Seiten mit stabiler `adId` werden zuverlässig als zulässige Einzelinventurquelle erkannt und direkt ausgelesen.
- Öffentliche Read-only-Metadaten werden nur ergänzend zusammengeführt; fehlende Read-only-Metadaten blockieren die vollständige Edit-Erfassung nicht.
- Einzelinventur-Worker laufen als Managed Worker im Hintergrund und werden terminal sauber geschlossen. Öffentliche Benutzer-Tabs werden nicht verändert oder geschlossen.
- Neue RED→GREEN-Tests `v1161-single-inventory-edit-worker*`; Sicherheitsgrenzen unverändert.


## 1.16.0 – 2026-09-16

- Neue einheitliche Inventarisierungsmodale für **„Alle Anzeigen erfassen“** und **„Geöffnete Anzeige erfassen“**. Beide Aktionen starten nicht mehr unmittelbar beim Button-Klick, sondern durchlaufen im Dialog die drei sichtbaren Schritte **Bestätigen → Erfassen → Ergebnis**.
- Die Einzelinventarisierung zeigt ihren Fortschritt über Profilprüfung, Auslesen, lokales Speichern und anschließende Inventaraktualisierung. Erfolgs- und Fehlerzustand bleiben bis zum Schließen sichtbar.
- Der Vollinventurlauf spiegelt den bestehenden persistenten Bulk-State live in das Modal: frischer „Meine Anzeigen“-Preflight, aktueller Titel, verarbeitete/gesamte Anzeigen, Fortschrittsbalken und terminale Erfolgs-/Fehler-/Prüfmeldung. Die bestehende Statuskachel in der linken Spalte bleibt parallel erhalten.
- Das Schließen des Modals während eines laufenden Vorgangs stoppt den Workflow nicht; der vorhandene Bulk-/Einzelworkflow läuft unverändert weiter.
- Inventarisierungslogik, Profilbindung, Fresh-Snapshot-Semantik, A1-TabRegistry, A2-Correlation, Publish-/Phase-4-Sicherheitsgrenzen, Inserierungs-Lock und Papierkorb bleiben unverändert.
- Neue gezielte Tests `tests/v1160-inventory-capture-modal.cjs` und `tests/v1160-inventory-capture-runtime.cjs`.

## 1.15.7

- A1-Lifecycle-Fix: Ein aktiver Bulk-Bearbeiten-Worker, der geschlossen wird bzw. als Registry-Tombstone `gone` vorliegt, terminalisiert jetzt sofort mit `KR_TAB_GONE`; der 90-Sekunden-Worker-Timeout bleibt nur Safety-Net für vorhandene, aber noch nicht inventarisierbare Tabs.
- Verspätete Requests eines bereits entfernten, zum selben Bulk-Run gehörenden Workers werden über den TabRegistry-Tombstone als bekannter `gone`-Lifecycle erkannt statt als generischer Worker-Mismatch.
- Retry-/Failure-Karten in der Bulk-Statuskachel bleiben auch bei langen Titeln strikt innerhalb der Parent-Kachel und wurden kompakter gestaltet.
- Das Feedback-Popover auf „Meine Anzeigen“ besitzt nun ein `×`; eine geschlossene Meldungsinstanz bleibt verborgen, bis sich der fachliche Feedback-Key ändert und damit eine neue Meldung vorliegt.
- Keine Änderung an Publish-Hard-Gate, Phase-4-Löschverifikation, Profilbindung, globalem Inserierungs-Lock oder Fokus-Policy.

## 1.15.6
- ARCHITEKTUR A1a: zentrale `tabRegistryV1`-Fassade im Shadow-/Facade-Modus eingeführt. Rollen/Ownership für User-/Source-/Renewal-/Archive-/Bulk-/Worker-Tabs sowie die Lifecycle-Zustände `active`, `discarded` und `gone` werden zentral gespiegelt.
- Bestehende `managedWorkerTabsV1`-Einträge werden verlustfrei in die Registry übernommen; der 30-Sekunden-Tombstone bleibt kompatibel. `GET_MANAGED_WORKER_TAB_IDS` läuft nun über die Registry.
- `KR_TAB_GONE` und `KR_TAB_DISCARDED` werden im zentralen Registry-Lifecycle erzeugt. `tabs.onUpdated`, `tabs.onActivated` und `tabs.onRemoved` aktualisieren die Registry; Service-Worker-Neustarts rekonstruieren bekannte Rollen/Ownership aus persistierten Renewal-/Fill-/Archive-/Bulk-Bindings.
- A1a bleibt bewusst Shadow/Facade: keine Fokus-Policy-Änderung, keine A3-State-Machine und keine umfassende Call-Site-Migration.
- UI-Fix: lange slash-getrennte Anzeigentitel können Status-/Meldungskacheln unter den Aktionsbuttons nicht mehr über die linke Spalte hinaus verbreitern; Text bricht innerhalb der Kachel um.

## 1.15.5 – 2026-09-16

- UI-/Lifecycle-Patch vor A1: Der Button **„Alle Anzeigen erfassen“** verwendet jetzt eine einzige abgeleitete Enablement-Regel aus Seitenbereitschaft, laufendem Bulk-/Retry-Zustand und Start-in-Flight. Wiederkehrende Health-/Tab-Checks aktualisieren nur `pageReady` und können den Button während eines aktiven Vollinventurlaufs nicht mehr wieder aktivieren; das sichtbare Enable/Disable-Flackern entfällt.
- Meldungs-/Statuskacheln unter den Aktionsbuttons behalten Zeitstempel und `×`; das `×` ist nun bei allen dortigen Meldungstypen konsistent weiter oben/rechts direkt in der oberen rechten Kachelecke positioniert, ohne Text zu überlagern.
- Im Dialog **Mehrere neu inserieren** zeigt der linke Zeilenkreis nun den höchsten sichtbaren Ergebnis-/Attention-Schweregrad: erfolgreich = grün, `needs-review`/Attention = gold, Fehler = rot, laufend = aktiver Türkis-Stil, queued/cancelled = neutral grau. Die Nummer bleibt sichtbar.
- Keine A1-TabRegistry in diesem Build und keine Änderung an Renewal-, Publish-, Phase-4-, Correlation-, Profil-, Lock-, Fokus-, Papierkorb- oder IndexedDB-Semantik.
- Neue gezielte Tests `tests/v1155-ui-polish.cjs` und `tests/v1155-ui-polish-runtime.cjs`.

## 1.15.4

- A2-Abschluss: Bulk-`operationId` wird bereits vor dem erzwungenen „Meine Anzeigen“-Refresh erzeugt und bis in den persistierten Bulk-Run übernommen.
- Diagnose-Summary rollt Warnungen/Fehler einer abgeschlossenen Parent-Operation über `parentOperationId` auch aus Child- und nachgelagerten Child-Operationen hoch.
- `RENEWAL_MY_ADS_FALLBACK_NOT_FOUND` wird bei der expliziten `VERIFY_OWN_AD_ABSENT_BY_ID`-Löschverifikation als erwartete Info statt als Warnung protokolliert; bei normalen Fallback-Suchen bleibt „nicht gefunden“ eine Warnung.
- Meldungs-/Statuskacheln unter den Aktionsbuttons zeigen Datum/Zeit und können per `×` rein visuell ausgeblendet werden; normale UI-Refreshes zeigen dieselbe Bulk-Meldungsinstanz nicht erneut. Neue Runs bzw. neue Statusinstanzen erscheinen wieder.
- Keine Änderungen an A1-TabRegistry, A3-State-Machine, Fokus-, Publish-, Phase-4-Sicherheits- oder IndexedDB-Semantik.

## 1.15.3 – 2026-09-16

- Architektur A2b umgesetzt: Die in v1.15.0 eingeführten Correlation-IDs werden jetzt durch die vollständigen Renewal-, Massen-Renewal- und Bulk-Lebenszyklen propagiert. Bestehende fachliche IDs bleiben unverändert; Legacy-Sessions ohne `operationId` werden weiterhin nicht künstlich nachgerüstet.
- Späte Renewal-Ereignisse ab `RENEWAL_NEW_ID_CONFIRMED` über Schnell-/Vollprüfung und Phase 4 bis `RENEWAL_REPLACEMENT_COMPLETED` verwenden den persistierten Renewal-Kontext. Phase-4-Requests transportieren die Correlation explizit bis in `inventory-runner.js`.
- Batch-Ereignisse von **Mehrere neu inserieren** tragen die Batch-Operation; Item-Ereignisse tragen die jeweilige Child-Operation mit Batch-Operation als `parentOperationId`. Recovery- und Watchdog-Pfade übernehmen vorhandene Correlation statt neue IDs zu erzeugen.
- Tiefe Bulk-Diagnosen einschließlich `BULK_WORKERS_OPENED`, `BULK_WORKER_SAVED`, `BULK_ITEM_FINISHED` und `BULK_INVENTORY_FINISHED` behalten `operationId`/`bulkRunId`/`runId`. Clientdiagnosen ohne eigenen Trace-Kontext werden anhand persistierter Source-/Worker-/Metadata-Tab-Bindings dem aktiven Workflow zugeordnet.
- Die Änderung basiert auf den realen RED-Befunden der nativen Tests 1–3 von v1.15.0–v1.15.2: verlorene Correlation im Renewal-Tail, in Mass-Terminalevents sowie bei tiefen Bulk-/Low-Level-Fehlerereignissen.
- Keine A1-TabRegistry, keine A3-State-Machine und keine Änderung an Auto-Publish-Hard-Gate, Submit-Verbot, Profilbindung, globalem Inserierungs-Lock, Voll-/Schnellprüfung, strikt sequenziellem Massenlauf, Phase-4-Verifikation, atomarer Promotion oder 30-Tage-Papierkorb.
- Neue gezielte Tests `tests/v1153-correlation-propagation.cjs` und `tests/v1153-correlation-runtime.cjs`.

## 1.15.2 – 2026-09-16

- Kritischer Freshness-Fix für **Alle Anzeigen erfassen**: Ein vollständiger Bulk-Lauf wird nicht mehr aus einem möglicherweise lange offenen/stalen „Meine Anzeigen“-DOM gestartet. Der Background lädt denselben PROJECTS-Tab vor jedem neuen Vollinventurlauf mit Cache-Bypass neu, wartet auf den vollständigen Reload und stellt die Content-Verbindung wieder her, ohne den Tab unnötig zu fokussieren.
- Nach dem Reload werden Profilname, Online-Zähler und Anzeigenkarten neu gelesen. Bei einem Einseiten-Snapshot muss die Zahl eindeutiger Anzeigenkarten exakt `N Anzeigen online` entsprechen; bei Profilwechsel oder unvollständigem Snapshot startet der Lauf nicht. Mehrseitenläufe behalten die bestehende sequenzielle Pagination.
- `BULK_INIT_RUN` akzeptiert neue Vollinventurläufe nur noch mit explizitem Fresh-Source-Handschlag. Neue Diagnoseereignisse `BULK_SOURCE_REFRESH_STARTED`, `BULK_SOURCE_REFRESHED` und `BULK_SOURCE_SNAPSHOT_CREATED` dokumentieren den erzwungenen Reload und den daraus erzeugten Snapshot.
- Edit-Worker werden nicht mehr bis zu 90 Sekunden weiter gepollt, wenn ihre Navigation bereits vollständig auf einer öffentlichen oder sonst eindeutig nicht bearbeitbaren Seite gelandet ist. Dieser Zustand wird sofort als terminaler Item-Fehler `BULK_EDIT_WORKER_NOT_EDITABLE` behandelt; derselbe Schutz gilt für Einzel-Retrys.
- Die Änderung reagiert auf den real reproduzierten Stale-DOM-Fall, bei dem ein lange offener „Meine Anzeigen“-Tab noch IDs bereits ersetzter/gelöschter Anzeigen enthielt. Der Online-Zähler-Fix aus v1.15.1 bleibt unverändert erhalten.
- Renewal-, A2a-Correlation-, Publish-, Phase-4-Löschverifikations-, Profilbindungs-, globaler Inserierungs-Lock-, Fokus- und Papierkorb-Semantik bleiben unverändert.
- Neue gezielte Tests `tests/v1152-bulk-freshness.cjs` und `tests/v1152-bulk-freshness-runtime.cjs`.

## 1.15.1 – 2026-09-16

- Gezielter Kompatibilitätsfix für **Alle Anzeigen erfassen**: Die Sollzahl wird nun sowohl aus dem real beobachteten kompakten Format `N Anzeigen online` als auch aus dem bisherigen Format `N Anzeigen online / M gesamt` erkannt.
- `expectedTotal` bleibt fachlich ausschließlich der Online-Zähler `N`; die optionale Gesamtzahl `M` wird nur weiterhin geparst, wenn sie tatsächlich vorhanden ist. Unqualifizierte Zahlen oder abweichende Wortreihenfolgen werden nicht als Sollzahl interpretiert.
- Das bisherige Verhalten für deutsche Tausenderpunkte bleibt erhalten.
- Der Fehler wurde mit dem real reproduzierten Einseiten-Konto als RED-Fall festgehalten und anschließend GREEN umgesetzt; das bisherige Mehrseiten-/Langformat bleibt durch Regressionstest geschützt.
- Renewal-, Correlation-, Publish-, Lösch-, Profil-, Lock-, Fokus- und Recovery-Logik bleiben unverändert.
- Neuer gezielter Test `tests/v1151-online-count.cjs`.

## 1.15.0 – 2026-09-16

- Start des Architekturblocks **A1–A9** mit **A2a Correlation Foundation** als bewusst additivem ersten Schritt; kein Big-Bang-Refactoring und keine Änderung der fachlichen Renewal-/Publish-/Lösch-Semantik.
- Neue persistierte Trace-Felder `operationId` und optional `parentOperationId`. Ein normaler Renewal und seine Fill-Sitzung teilen dieselbe `operationId`; ein Renewal innerhalb von **Mehrere neu inserieren** erhält eine eigene Operation mit der Batch-Operation als `parentOperationId`.
- Massen-Neuinserate besitzen zusätzlich zur unveränderten fachlichen `massBatchId` eine eigene `operationId`; gestartete Items übernehmen die Child-/Parent-Correlation in den persistenten Batch-Snapshot.
- Bulk-Inventarisierung behält `runId` unverändert und ergänzt `bulkRunId` zunächst kompatibel mit demselben Wert sowie eine separate `operationId`. Bestehende v1.14.5-Läufe/Sessions ohne neue Felder bleiben gültig und erhalten keine erfundenen IDs.
- Renewal-Skeleton, Renewal-/Fill-/ZIP-Neuinserat-Sessions und ihre öffentlichen Diagnose-Snapshots transportieren Correlation-Felder additiv. `template-filler.js` übernimmt die Session-Correlation in seine Diagnoseereignisse.
- Die zentrale Diagnose normalisiert bekannte Correlation-Felder in `context`; der Standard-Diagnoseexport korreliert bevorzugt über `operationId` und enthält die neuen Felder in Fill-/Renewal-/Bulk-/Mass-Batch-Snapshots. Info-Aggregation trennt operation-gebundene Live-Refresh-Ereignisse voneinander.
- Unverändert: feste Extension-ID/Manifest-Key, globaler Inserierungs-Lock, Auto-Publish-Hard-Gate, kein `.submit()`-/`requestSubmit()`-Bypass, Profilbindung, Voll-/Schnellprüfung, strikt sequenzieller Massenlauf, Phase-4-Löschverifikation mit frischem `VERIFY_OWN_AD_ABSENT_BY_ID`, atomare Promotion nach `source-delete-verified`, 30-Tage-Papierkorb, bestehende Recovery-/Watchdog-/monotone Fill-Guards.
- Neue gezielte Tests `tests/v1150-correlation.cjs` und `tests/v1150-correlation-runtime.cjs`.

## 1.14.5 – 2026-09-16

- Diagnose-Qualität verbessert: sehr häufige gleichartige Info-Ereignisse `INVENTORY_LIVE_REFRESH_APPLIED` und `PROFILE_RECOGNIZED` werden innerhalb kurzer Zeitfenster zusammengeführt statt den Diagnoseverlauf mit nahezu identischen Zeilen zu dominieren. Aggregierte Einträge behalten `occurrences`, `firstTimestamp` und `lastTimestamp`; die jeweils letzten Details bleiben sichtbar.
- `summary.txt` unterscheidet nun zwischen exportierten Diagnoseeinträgen und den dadurch repräsentierten Rohereignissen und weist die Zahl aggregierter Wiederholungen separat aus. `environment.json` enthält dieselben Zähler.
- `mass-renewal-batch.json` enthält jetzt die persistierte monotone Batch-`revision`, sodass serialisierte Batch-State-Änderungen im Diagnose-ZIP direkt nachvollziehbar sind.
- UI-Fix für den bestätigten Stop-after-current-Fall: `cancelled / not-started-after-stop` zeigt in der Abschlussübersicht keine aktive/pulsierende Phase 1 mehr. Alle vier Phasen bleiben neutral, weil dieser Batch-Eintrag tatsächlich nie gestartet wurde.
- Batch-/Renewal-Geschäftslogik und alle bestehenden Sicherheitsgrenzen bleiben unverändert.
- Neuer Regressionstest `tests/v1145-contract.cjs`; bestehende Regressionen bis v1.14.4 bleiben erhalten.


## 1.14.4 – 2026-09-16

- Robustheits-Patch für **Mehrere neu inserieren**: Batch-State-Änderungen laufen jetzt über eine serialisierte Read-Modify-Write-Strecke mit monotoner `revision`, damit Stop-Wunsch, terminaler Einzelabschluss, Retry und Queue-Fortschritt sich nicht mehr durch konkurrierende Vollobjekt-Schreibvorgänge gegenseitig überschreiben können.
- Recovery-Lücke für `running / starting` ohne bereits angehängte `renewalId` geschlossen. Beim Service-Worker-Neustart wird zuerst nach einer passenden Renewal-Sitzung über `massBatchId + massBatchItemIndex` gesucht und sie wieder angebunden; existiert keine, wird der noch nicht eindeutig gestartete Artikel kontrolliert auf Queue zurückgesetzt und neu gestartet statt dauerhaft zu blockieren.
- Terminale Fill-Zustände sind jetzt monoton geschützt. Verspätete Content-Script-Nachrichten dürfen `complete`, `needs-review` oder `error` nicht wieder auf `running` bzw. einen älteren Stage zurücksetzen.
- Plattformfehler-Erkennung erweitert: Neben `/anzeige-aufgeben-fehler.html` werden auch semantisch eindeutige Kleinanzeigen-4xx-/5xx-Fehlerseiten anhand von URL-Pfad sowie – soweit verfügbar – Fehlercode, Seitentitel und Fehlerüberschrift erkannt. Erkannte Codes wie 400 oder 500 werden diagnostisch erfasst. Normale Formular-/Validierungsseiten bleiben von der Erkennung ausgeschlossen.
- Neuer Fortschritts-Watchdog für den aktiven Massenartikel: Bei mindestens fünf Minuten ohne bestätigten Workflow-Fortschritt wird der gebundene Tab nochmals auf eine Fehlerseite geprüft; andernfalls wird der festhängende Artikel kontrolliert auf Attention (`progress-watchdog-timeout`) terminalisiert. Der Watchdog führt keinen Hard-Cancel des aktiven Artikels aus. Content-Script-Heartbeats wecken die Prüfung, gelten aber selbst ausdrücklich nicht als Fortschritt.
- Neue Diagnoseereignisse unter anderem `MASS_RENEWAL_BATCH_MUTATION_FAILED`, `MASS_RENEWAL_RECOVERY_RENEWAL_REBOUND`, `MASS_RENEWAL_RECOVERY_STARTING_REQUEUED`, `TEMPLATE_FILL_TERMINAL_UPDATE_IGNORED` und `MASS_RENEWAL_WATCHDOG_TIMEOUT`; `KLEINANZEIGEN_ERROR_PAGE_DETECTED` enthält nun optional den erkannten HTTP-Fehlercode und die Erkennungsquelle.
- Alle bestehenden Publish-, Profil-, Löschverifikations-, atomaren Promotions-, Papierkorb- und Stop-after-current-Sicherheitsgrenzen bleiben unverändert.
- Neuer Regressionstest `tests/v1144-contract.cjs`; bestehende Regressionen bis v1.14.3 bleiben erhalten.


## 1.14.3 – 2026-09-15

- Kritischer Deadlock-Fix für den real beobachteten Kleinanzeigen-Pfad `/anzeige-aufgeben-fehler.html`: Ein gebundener laufender Vorlagen-/Renewal-Tab bleibt auf dieser Plattformfehlerseite nicht mehr mit einem veralteten laufenden Stage wie `category-continuing` hängen.
- Der Background erkennt die bekannte Inserierungs-Fehlerseite direkt aus der Tab-Navigation und terminalisiert die zugehörige aktive Fill-Sitzung als `error / platform-error-page`; diese Erkennung benötigt keinen erfolgreichen Content-Script-Fortschritt. Der Template-Filler besitzt zusätzlich eine defensive eigene `platform-error`-Erkennung.
- Gebundene Renewals wechseln auf `verification-failed / platform-error-page` mit verständlicher Fehlerursache. Dadurch greift die bestehende Massenlauf-Reconciliation wieder: Attention/Fehler statt Deadlock, normaler Weiterlauf zum nächsten Artikel oder – bei vorgemerkt **Nach aktueller Anzeige stoppen** – sauberer Abschluss als `stopped-with-attention` mit **Nicht ausgeführt** für verbleibende Queue-Einträge.
- ZIP-Neuinserate, die dieselbe Fehlerseite in Phase 1 erreichen, werden ebenfalls terminal und sicher als Fehler beendet.
- Neues Diagnoseereignis `KLEINANZEIGEN_ERROR_PAGE_DETECTED`; ein zusätzlicher `KLEINANZEIGEN_ERROR_PAGE_TERMINALIZATION_FAILED`-Fehler wird nur protokolliert, falls die interne Terminalisierung selbst unerwartet scheitert.
- Die bisherige Anzeige wird in diesem Pfad nicht gelöscht. Auto-Publish-Hard-Gate, kein direkter Submit-Bypass, Profilbindung, globale Inserierungs-Sperre, Phase-4-Löschverifikation, unabhängiger Abwesenheits-Vollscan, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer Regressionstest `tests/v1143-contract.cjs`; bestehende Regressionen bis v1.14.2 bleiben erhalten.

## 1.14.2 – 2026-09-15

- Schritt 2 von **Mehrere neu inserieren** verwendet jetzt feste Layoutspalten für Inhalt, die vier Phasenkreise und Status/Aktion. Die Phasenkreise bleiben dadurch zeilenübergreifend exakt ausgerichtet und springen nicht mehr mit unterschiedlich breiten Badges oder Aktionsbuttons.
- In Schritt 3 erhalten vollständig erfolgreiche Positionen einen dezent grünen Zeilenhintergrund; Fehler-/Attention-Positionen werden dezent rot hinterlegt. Titelbild, Phasenstatus und konkrete Wiederaufnahmeaktion bleiben zusätzlich sichtbar.
- Das X oben rechts kommuniziert bei laufendem Batch jetzt ausdrücklich **„Fenster schließen – Vorgang läuft im Hintergrund weiter“** (Tooltip/ARIA). Das Schließen des Modals stoppt den Batch weiterhin nicht.
- Neue Aktion in Schritt 2: **Nach aktueller Anzeige stoppen**. Vor dem Vormerken erscheint der gestaltete App-Bestätigungsdialog; kein Browser-`confirm()`/`prompt()`. Die Bestätigung erklärt, dass die aktuell laufende Anzeige vollständig zu Ende geführt wird und erst danach keine weitere Anzeige mehr startet.
- Der Stopp ist geordnet und persistent: `stopAfterCurrentRequested` wird im Batch gespeichert. Der aktive Einzelworkflow wird niemals hart abgebrochen. Sobald er terminal erfolgreich oder mit Aufmerksamkeit endet, werden noch nicht gestartete Queue-Einträge als **Nicht ausgeführt** markiert und der Batch endet als `stopped` bzw. `stopped-with-attention`.
- Bereits abgeschlossene Anzeigen bleiben unverändert; ein späterer Retry eines Attention-Eintrags bleibt möglich. Nicht ausgeführte Positionen werden in der Abschlussübersicht separat gezählt.
- Neue Diagnoseereignisse `MASS_RENEWAL_BATCH_STOP_REQUESTED` und `MASS_RENEWAL_BATCH_STOPPED`; neuer Regressionstest `tests/v1142-contract.cjs`.
- Bestehende Einzelworkflow-, Publish-, Prüf-, Lösch-, Papierkorb-, Profil- und Recovery-Sicherheitsgrenzen bleiben unverändert.

## 1.14.1 – 2026-09-15

- UI/UX-Finishing für **Mehrere neu inserieren**: Der Prüfmodus bleibt im Kicker über alle drei Schritte sichtbar; **SCHNELLPRÜFUNG** erhält wieder den gelben Modusakzent.
- Schritt 1 verwendet kompakte Footer-Aktionen: **Abbrechen** links und **Start** rechts, beide in normaler Buttonbreite statt Vollbreiten-CTA.
- Schritt 2 zeigt pro Anzeige zusätzlich das kleine Titelbild und einen kompakten Vier-Phasen-Fortschritt. Aktive Phasen pulsieren dezent, abgeschlossene Phasen sind vollflächig grün, Fehlerphasen rot und in der Schnellprüfung übersprungene Datenkontrolle wird neutral markiert. Die Phasenbeschreibung steht als Tooltip zur Verfügung.
- Sichtbare technische Statuswerte wie `queued` wurden entfernt. Wartende Anzeigen heißen **Wartet auf Start**; laufende Anzeigen zeigen die aktuelle Phase in verständlicher Sprache.
- Schritt 2 und Schritt 3 erhalten eigene, zum Zustand passende Erklärungstexte; die Abschlussliste heißt **Ergebnisse**.
- Schritt 3 zeigt bei erfolgreichen Anzeigen weiterhin das passive Badge **Erfolgreich**. Attention-/Fehlerfälle erhalten stattdessen möglichst eine konkrete Aktion: **Neu inserieren erneut starten**, **Prüfung erneut starten** oder **Austausch abschließen**. **Letzte Phase erneut starten** bleibt ausschließlich Fallback, wenn keine fachlich eindeutigere Bezeichnung möglich ist.
- **Schließen** ist in der Abschlussansicht wieder ein kompakter, rechtsbündiger Button.
- Neuer Regressionstest `tests/v1141-contract.cjs`; bestehende Batch-Orchestrierung und Sicherheitsgrenzen bleiben unverändert.

## 1.14.0

- Neues Feature **Mehrere neu inserieren** im bestehenden Bereich **AKTIONEN**, direkt unter **Aus ZIP neu inserieren**.
- Größeres Drei-Schritt-Modal: kompakte Auswahl-Tabelle (Checkbox, Titelbild, Anzeige, Preis, Endet am), strikt sequentielle Verarbeitung und Abschlussübersicht.
- Maximal 10 Anzeigen pro Massenlauf; Standardsortierung nach frühestem Ende. Keine Filter-/Sortiersteuerung in dieser ersten Version.
- Jeder Eintrag verwendet unverändert den normalen Neu-inserieren-/Renewal-Workflow im beim Batchstart gewählten Prüfmodus.
- Der nächste Eintrag startet erst nach vollständigem Erfolg oder terminalem Fehler/Benutzereingriff/needs-review des aktuellen Eintrags. Ein problematischer Eintrag stoppt die restliche Queue nicht.
- Persistenter Batch-Zustand `massRenewalBatchV1` mit Recovery nach Service-Worker-Neustart und Diagnoseexport `mass-renewal-batch.json`.
- Abschlussübersicht unterstützt passende Wiederholungen: erneute Prüfung, Austausch abschließen oder vollständigen Einzelvorgang neu starten.
- Bestehende Publish-, Profil-, Verifikations-, Lösch-, Papierkorb- und Recovery-Sicherheitsgrenzen bleiben erhalten.

## 1.13.8 – 2026-09-15

- **Anzeige ansehen/anzeigen** bevorzugt jetzt eine bereits bekannte kanonische Kleinanzeigen-URL des Inventardatensatzes. Der bisherige verkürzte Fallback `/s-anzeige/<ID>` wird nur noch verwendet, wenn keine belastbare öffentliche URL vorhanden ist.
- Eine bekannte öffentliche URL wird vor dem Öffnen strikt auf HTTPS, Kleinanzeigen-Host und die erwartete Anzeigen-ID geprüft. Dadurch kann eine fremde oder veraltete URL nicht als Ziel übernommen werden.
- `READONLY_AD_OPENED` dokumentiert jetzt die gewählte URL-Quelle; nach der Navigation protokolliert `READONLY_AD_NAVIGATION_RESOLVED` die tatsächlich erreichte URL und ob sie zur erwarteten Anzeigen-ID gehört. Ein noch laufender/geschlossener Tab wird nur informativ als `READONLY_AD_NAVIGATION_PENDING` dokumentiert.
- Im ZIP-Neuinserat-Modal befindet sich zwischen Artikelvorschau und gelbem Informationsbanner derselbe kleine vertikale Abstand wie zwischen erfolgreicher ZIP-Prüfung und Artikelvorschau.
- Neuer Regressionstest `tests/v1138-contract.cjs`; bestehende Sicherheitsgrenzen, Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.

## 1.13.7 – 2026-09-15

- Export-/ZIP-Neuinserat-Texte wurden konsequent auf verständliche Nutzerbegriffe vereinheitlicht: **Als ZIP exportieren**, **Anzeige aus ZIP neu inserieren**, **ZIP erfolgreich geprüft**, **Anzeige inserieren** und **Unter „Meine Anzeigen“ finden** ersetzen technische bzw. uneinheitliche Begriffe wie Datensatz, Exportquelle, Archivversion oder Artikel.
- Der erfolgreiche ZIP-Prüfzustand zeigt nur noch die für den Nutzer relevanten Angaben (Bildanzahl und ursprüngliche Anzeigen-ID); die interne Archivversion wird bei erfolgreichem Import nicht mehr angezeigt. Inkompatible Archivversionen bleiben weiterhin als konkreter Fehler sichtbar.
- Schnell- und Vollprüfung erklären den Ablauf jetzt direkt aus Nutzersicht. Die Schnellprüfung kennzeichnet Schritt 3 als **Zusätzliche Inhaltsprüfung entfällt**; die Vollprüfung beschreibt den erneuten Vergleich im Bearbeiten-Modus als Abgleich mit den Daten aus dem ZIP.
- Recovery eines bereits veröffentlichten ZIP-Neuinserats ist idempotent: Ist die bestätigte neue Anzeigen-ID im gebundenen Zielprofil bereits als semantisch passende Anzeige inventarisiert, wird die Sitzung als bereits erfolgreich abgeschlossen markiert, ohne den vorhandenen Datensatz zu überschreiben, ohne Duplikat und ohne erneuten Publish. Abweichende Datensätze bzw. andere Zielprofile bleiben weiterhin echte Kollisionen.
- Bereits geschlossene Ziel-/Worker-Tabs werden bei nachlaufenden UI-/Content-Anfragen als normaler `gone`-Lifecycle-Zustand behandelt. `Receiving end does not exist` bzw. `No tab with id` erzeugen in diesem Fall kein Error-Level-Diagnoserrauschen mehr.
- Neuer Regressionstest `tests/v1137-contract.cjs` schützt UI-Texte, idempotente Recovery und Tab-Lifecycle-Nacharbeit. Feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.

## 1.13.6 – 2026-09-15

- ZIP-Neuinserate sind jetzt ausdrücklich **profilunabhängig vom Exportprofil**: `sourceProfileName` bleibt Provenienz, bestimmt aber nicht mehr das Konto, auf dem die neue Anzeige erstellt werden darf.
- Vor Phase 1 erkennt der Background das aktuell angemeldete Kleinanzeigen-Profil über **Meine Anzeigen**, bindet es persistent als Zielprofil der ZIP-Sitzung und startet erst danach den eigentlichen Inserier-Tab.
- Nach Publish wird die neue Anzeigen-ID ausschließlich im beim Start gebundenen Zielprofil gesucht. Nur ein echter Kontowechsel während des laufenden Vorgangs ist noch ein Profilkonflikt.
- Schnell- und Vollprüfung speichern den neuen Inventardatensatz unter dem erkannten Zielprofil und führen Quell-/Zielprofil getrennt in `archiveImport`.
- Der bisherige Abbruch **„… entspricht nicht dem Profil des exportierten Datensatzes“** wurde aus dem ZIP-Workflow entfernt. ZIPs ohne Quellprofilbezug werden nicht mehr allein deshalb abgewiesen.
- Bereits veröffentlichte v1.13.5-Sitzungen, die exakt an diesem alten Profil-Gate in Phase 2 scheiterten, werden nach dem Update ohne erneuten Publish in den Find-/Inventar-Pfad zurückgeführt.
- Die Sidebar-Meldung eines abgeschlossenen **Alle Anzeigen erfassen**-Laufs wird nur noch angezeigt, wenn dessen `profileId` zur aktuell gewählten Inventaransicht gehört. Ein Abschlussstatus von `sascha.petrovitsch@googlemail.com` erscheint damit nicht mehr in der Ansicht von `ka_percival@online.de`.
- Profilwechsel aktualisieren die Bulk-Statusanzeige sofort.
- Neuer Regressionstest `tests/v1136-contract.cjs`; feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.

## 1.13.5 – 2026-09-15

- Fehler bei **Geöffnete Anzeige erfassen** behoben: Ein manuell inventarisierter Datensatz wird nicht mehr trotz eindeutig ausgewähltem und zugleich angemeldetem Profil mit `profileId = null` unter **Nicht zugeordnet** gespeichert.
- `PAGE_STATUS` erkennt den sichtbaren Wert **angemeldet als:** nun auch auf eigenen Bearbeiten-/Anzeigeseiten und nicht ausschließlich auf **Meine Anzeigen**.
- Vor dem Speichern einer manuellen Einzelinventarisierung wird die aktuelle Seitenidentität erneut aufgelöst. Die erkannte bestehende Profil-ID wird als verbindliche Profilbindung an den Inventardatensatz geschrieben.
- Als konservativer Fallback darf die bestehende Profilauswahl nur verwendet werden, wenn `selectedProfileId` und `detectedProfileId` identisch sind. Bei nicht eindeutig bestätigbarer Zuordnung wird nicht profil-los gespeichert.
- Neuer Regressionstest `tests/v1135-contract.cjs`; bestehende Sicherheitsgrenzen und alle anderen Workflows bleiben unverändert.

## 1.13.4 – 2026-09-15

- Hotfix für die ZIP-Neuinserat-**Vollprüfung**: Nach **Neue Anzeige finden** wird Schritt 3 jetzt ausschließlich über die unter **Meine Anzeigen** für genau die neue Anzeigen-ID gefundene Bearbeiten-URL gestartet. Die Vollprüfung konstruiert an dieser Stelle keine unabhängige URL mehr und arbeitet nicht auf einer öffentlichen `/s-anzeige/...`-Read-only-Ansicht weiter.
- Die gefundene Bearbeiten-URL wird als `newEditUrl` in der persistenten ZIP-Neuinserat-Sitzung festgehalten und für den anschließenden Bearbeiten-Prüfworker verwendet. Host, Pfad und `adId` werden strikt gegen die erwartete neue Anzeigen-ID validiert.
- Nach dem Laden bestätigt der Background nochmals, dass der Prüfworker tatsächlich auf `p-anzeige-bearbeiten.html?adId=<neueID>` steht. Ein Redirect auf eine öffentliche Anzeige oder eine andere ID beendet die Vollprüfung sicher statt dort eine Read-only-Inventarisierung zu versuchen.
- Neues Diagnoseereignis `ARCHIVE_INSERT_EDIT_MODE_CONFIRMED` dokumentiert den erfolgreichen Übergang in den Bearbeiten-Modus.
- Schnellprüfung, Auto-Publish-Hard-Gate, Profilbindung, ZIP-Archivvertrag, zusätzliche Inventaraufnahme sowie bestehende Renewal-/Delete-Sicherheitsgrenzen bleiben unverändert. Die in v1.13.3 ergänzte Galeriediagnose bleibt erhalten, ist aber nicht der Fix für diesen Workflowfehler.
- Neuer dependency-freier Regressionstest `tests/v1134-contract.cjs` schützt die Bearbeiten-URL-Bindung und weist öffentliche Read-only-URLs als ungültiges Vollprüfungsziel zurück.

## 1.13.3 – 2026-09-15

- Diagnose-Hotfix für den realen Fehler **„Anzeigengalerie nicht eindeutig erkannt“**: Die Fehlermeldung verweist nicht mehr auf die entfernte UI-Funktion **Bilddiagnose der aktuellen Seite kopieren**, sondern auf **Support & Diagnose → Diagnosedaten herunterladen**.
- Bei einer fehlgeschlagenen öffentlichen Galerieerkennung wird automatisch eine bounded Galeriediagnose gespeichert. Neben der bisherigen Extractor-Entscheidung werden auch rohe `img`-/`source`-/`srcset`-Quellen, Hosts und relevante DOM-Merkmale erfasst, damit auch geänderte CDN-/DOM-Strukturen im Diagnose-ZIP sichtbar werden. URL-Queryparameter werden nicht übernommen.
- Die letzten maximal acht Galeriediagnosen werden 24 Stunden separat persistiert, sodass ein Service-Worker-Neustart zwischen Fehler und Diagnose-Download die entscheidenden Daten nicht mehr aus dem Export entfernt.
- Das normale Diagnose-ZIP enthält bei vorhandenen Fällen die zusätzliche Datei `image-gallery-diagnostics.json` und weist ihre Anzahl in `summary.txt` aus.
- Die eigentliche Galerie-/Inventar-Sicherheitsgrenze bleibt unverändert: Nicht eindeutig erkannte Bilder führen weiterhin zum Abbruch; v1.13.3 erfindet oder akzeptiert keine unsichere Galerie.
- Neuer dependency-freier Regressionstest `tests/v1133-contract.cjs`; bestehende Extension-ID, Manifest-Key, Berechtigungen, Host-Permissions sowie Renewal-/ZIP-Neuinserat-Workflows bleiben unverändert.

## 1.13.2 – 2026-09-15

- Hotfix für den Stillstand nach erfolgreichem Auto-Publish: Die Kleinanzeigen-Bestätigungsseite `p-anzeige-aufgeben-bestaetigung.html` liefert die neue Anzeigen-ID als Queryparameter `addId`; v1.13.1 erkannte diesen URL-Typ noch nicht und blieb dadurch bei `publish-submitted` stehen.
- Die ID-Erkennung unterstützt die Bestätigungs-URL jetzt sowohl im Content-Script als auch direkt über die aktuelle Background-Tab-URL. Öffentliche Anzeigen- und Bearbeiten-URLs bleiben weiterhin unterstützt.
- Der Background verwendet für Publish-Erkennung und Recovery einen gemeinsamen robusten Erkennungspfad mit direktem Tab-URL-Fallback.
- Neuer dependency-freier Regressionstest `tests/v1132-contract.cjs` reproduziert die reale `addId`-Bestätigungs-URL und schützt den Übergang zur neuen Anzeigen-ID.
- Bestehende Publish-Hard-Gates, Profilbindung, Renewal-/ZIP-Semantik, Inventarregeln, feste Extension-ID, Manifest-Key, Berechtigungen und Host-Permissions bleiben unverändert.

## 1.13.1 – 2026-09-15

- Phase 2 des Datensatz-Export/Import-Konzepts umgesetzt: Im bestehenden Sidebar-Bereich **Aktionen** steht unter **Geöffnete Anzeige erfassen** die Aktion **Aus ZIP neu inserieren**; es wurde bewusst keine neue Untergruppe angelegt.
- Der Import öffnet einen Modal-Dialog im Stil des bestehenden Neu-Inserieren-Dialogs. Ein v1-Export-ZIP kann per Drag & Drop oder Dateiauswahl übergeben werden. Erst nach lokaler Validierung werden Artikelvorschau und **Artikel inserieren** freigeschaltet.
- Die ZIP-Prüfung validiert Archivtyp/-version, sichere Dateipfade, Zentralverzeichnis/CRC, Größenlimits, `record.json`, `image-store.json`, SHA-256-Prüfsummen, Bildanzahl, Reihenfolge, Titelbild und jede enthaltene Bilddatei. Für den automatischen Füllpfad werden bestätigte JPEG-Vorlagen verlangt.
- Der eigentliche Ablauf verwendet vier sichtbare Schritte: **Neue Anzeige erstellen**, **Neue Anzeige finden**, **Neue Anzeige überprüfen**, **Ins Inventar aufnehmen**. In der **Schnellprüfung** wird ausschließlich Schritt 3 sichtbar übersprungen; Vollprüfung führt alle vier Schritte aus.
- Beide Modi verwenden nach vollständiger Vorabprüfung den bestehenden abgesicherten Auto-Publish-Pfad. Direkte `.submit()`-/`requestSubmit()`-Bypässe bleiben ausgeschlossen.
- Nach Publish wird die neue Anzeigen-ID ermittelt und die Anzeige profilgebunden unter **Meine Anzeigen** gesucht. In der Vollprüfung wird sie anschließend im Bearbeiten-Modus ausgelesen und gegen die ZIP-Quelle verglichen.
- Die neue Anzeige wird immer als zusätzlicher Inventardatensatz behandelt. Kein vorhandener Inventardatensatz und keine bestehende Kleinanzeigen-Anzeige wird durch den ZIP-Workflow ersetzt oder gelöscht. Bei Abweichungen der Vollprüfung bleibt der neu erfasste Datensatz erhalten und der Vorgang endet sichtbar mit Prüfbedarf.
- ZIP-Neuinserate besitzen persistente `archiveInsertionSessionsV1`-Sitzungen, nehmen am bestehenden globalen Inserierungs-Lock teil und können nach einem Service-Worker-Neustart aus Publish-/Find-/Check-/Save-Zuständen fortgesetzt werden.
- Neue Runtime-Komponente `inventory-import.js`; neuer dependency-freier Vertragstest `tests/v1131-contract.cjs` prüft UI, Archivkompatibilität Phase 1 → Phase 2, Fast-/Safe-Verzweigung, Sicherheitsgrenzen, feste Extension-Identität und unveränderte Berechtigungen.

## 1.13.0 – 2026-09-15

- Phase 1 des Datensatz-Export/Import-Konzepts umgesetzt: Jede Inventarkachel besitzt zwischen **Details anzeigen** und dem gespeicherten ID-/Zeitstempel die neue Aktion **Exportieren**.
- Der Export erzeugt genau für den gewählten Inventardatensatz ein eigenständiges ZIP-Archiv. Bestehende Inventardaten werden dabei ausschließlich gelesen und nicht verändert.
- Das Archiv enthält `record.json` mit dem vollständigen serialisierbaren Inventardatensatz, `image-store.json` mit den Metadaten der lokal gespeicherten Bildobjekte, `export-manifest.json` als versionierten Importvertrag sowie sämtliche lokalen Bilddateien unter `images/`.
- Die ursprüngliche Galerie-Reihenfolge wird explizit über `position` und die sortierte Bildliste im Manifest erhalten; das Titelbild wird zusätzlich über `isPrimary` gekennzeichnet.
- Vor dem ZIP-Bau wird jede lokale Bildkopie geladen und per SHA-256 geprüft, sofern bereits ein erwarteter Hash vorliegt. Fehlt eine Bildkopie oder stimmt ihre Integrität nicht, wird kein unvollständiges Exportarchiv erzeugt.
- `export-manifest.json` verwendet den stabilen Archivtyp `kleinanzeigen-renewal-inventory-export` und `archiveVersion: 1` als Grundlage für die spätere Phase 2. Zusätzlich werden Dateipfade, Prüfsummen, Bildreihenfolge, Bildformate und Vollständigkeitsangaben gespeichert.
- Der Export verwendet ausschließlich vorhandene lokale Inventar-/Bilddaten und führt keine Netzwerk-, Publish-, Delete- oder Renewal-Aktion aus. Die bestehenden Sicherheitsgrenzen, Profilbindung und Renewal-Workflows bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1130-contract.cjs` prüft Archivstruktur, Bildreihenfolge, Integritätsabbruch, UI-Position, Versionsstand sowie unveränderte Berechtigungen und Host-Permissions.

## 1.12.1 – 2026-09-14

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

## 1.12.0 – 2026-09-14

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

## 1.11.5 – 2026-09-14

- Robustheit auf langsamen Windows-/Chrome-Systemen verbessert: kontextspezifische Tab-Ladebudgets (45 s Renewal/Refresh, 60 s Phase 4) ersetzen den starren 30-s-Timeout an kritischen Worker-Stellen.
- Tab-Ladezeiten und Content-Verbindungszeiten werden explizit diagnostiziert (`TAB_LOAD_TIMING`, `TAB_LOAD_TIMEOUT`, `CONTENT_CONNECTION_READY`), um Navigation/Page-Ready und Bootstrap getrennt messen zu können.
- App-Health ist stärker eventgetrieben (`tabs.onUpdated`, `tabs.onActivated`, `tabs.onRemoved`); der periodische Poll bleibt nur als 15-s-Safety-Net. Von Chrome verworfene Tabs werden bis Aktivierung/Reload nicht mehr alle fünf Sekunden erneut als Fehler angesprochen.
- Query→Tab-schließt- und Discard-Races werden als normale Lifecycle-Zustände (`KR_TAB_GONE`, `KR_TAB_DISCARDED`) behandelt und nicht mehr als `TAB_CONNECTION_FAILED`/`TAB_MESSAGE_FAILED`-Fehlerflut protokolliert.
- Erwartbarer Phase-4-Transportabbruch nach dem Löschklick ist informativer Zwischenzustand; nach erfolgreicher unabhängiger Verifikation wird er explizit als verifiziert protokolliert.
- `BULK_READONLY_METADATA_UNAVAILABLE` wird erst beim tatsächlichen finalen Speichern ohne Read-only-Metadaten ausgegeben, nicht bereits während eines langsamen Edit-Workers.
- Publish-Hard-Gate, Profilprüfung, unabhängige Phase-4-Abwesenheitsprüfung, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer Vertragstest `tests/v1115-contract.cjs` schützt Low-Performance-Robustheit und Sicherheitsgrenzen.

## 1.11.4 – 2026-09-14

- Drei Findings aus dem erfolgreichen Fitness-Reifen-End-to-End-Lauf bereinigt: Read-only-Diagnoserauschen/Latenz, Worker-Tab-Race nach Phase 4 und veralteter Auto-Publish-Gate-Nachlauf.
- Direkter Read-only-ID-Probe auf 3,5 Sekunden nach geladener Seite begrenzt; danach frühzeitiger Wechsel auf den profilgeprüften „Meine Anzeigen“-Fallback. Renewal-Polling unterdrückt erwartete Einzelwarnungen und protokolliert stattdessen nur den zusammengefassten Fallback bzw. einen echten terminalen Read-only-Fehler.
- Renewal-Hintergrundworker werden in `chrome.storage.session` registriert und nach dem Schließen 30 Sekunden als Tombstone geführt. Die App filtert diese Worker aus ihrer normalen Kleinanzeigen-Seitenprüfung, damit bereits geschlossene Phase-4-Tabs nicht mehr über `ENSURE_CONTENT_CONNECTION` angesprochen werden.
- Bestätigungsseiten nach bereits ausgelöstem Publish überspringen das Auto-Publish-Gate. Der Background verwirft zusätzlich veraltete Stage-Rückschritte aus `publish-submitted`/`new-id-confirmed` in Vor-Publish-Zustände.
- Auto-Publish-Hard-Gate, Kategorieauswahl-Fix, Profilprüfung, unabhängige `VERIFY_OWN_AD_ABSENT_BY_ID`-Verifikation, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1114-contract.cjs` schützt alle drei Fixes und die Sicherheitsinvarianten.

## 1.11.3 – 2026-09-14

- Hänger beim Wechsel vom neuen Anzeigenformular in die separate Kategorieauswahl behoben.
- Nach dem Klick auf **Kategorie wählen/ändern** wird die Navigation jetzt bis zu vier Sekunden aktiv bestätigt; der Fill-State bleibt nicht mehr unbegrenzt in `category-opening` stehen.
- Bei ausbleibender Bestätigung erfolgt eine kontrollierte Fallback-Navigation auf den bekannten gleich-originären Kleinanzeigen-Pfad `/p-kategorie-aendern.html`. Ein vorhandenes Linkziel wird nur akzeptiert, wenn Origin und exakter Kategoriepfad passen.
- Neue Diagnoseereignisse `CATEGORY_OPEN_CLICK_STARTED`, `CATEGORY_OPEN_CLICK_DISPATCHED`, `CATEGORY_OPEN_NAVIGATION_CONFIRMED`, `CATEGORY_OPEN_CLICK_UNCONFIRMED` und `CATEGORY_OPEN_FALLBACK_NAVIGATION_STARTED` machen den Übergang eindeutig nachvollziehbar.
- Kategoriepfad-/Pflichtmerkmal-Logik, Publish-Sicherheitsgrenzen, Phase-4-Löschverifikation, Profilmanagement und v1.11.2-Tab-Lebenszyklus bleiben unverändert.
- Neuer dependency-freier Vertragstest `tests/v1113-contract.cjs` schützt Fallback-Navigation, Origin-/Pfadbegrenzung, Diagnose und bestehende Sicherheitsgrenzen.

## 1.11.2 – 2026-09-14

- Renewal-Tab-Lebenszyklus deutlich reduziert, ohne die vier Sicherheitsphasen abzuschwächen.
- Phase 1 schließt den von der Extension erzeugten Inserat-Tab unmittelbar nach eindeutig bestätigter neuer Anzeigen-ID; persistierte Tab-Referenzen werden anschließend bereinigt.
- Phase 2/3 verwendet genau einen sequenziell wiederverwendeten Prüfworker: Bearbeiten-Inventarisierung, direkte Read-only-ID-URL, „Meine Anzeigen“-Fallback und gegebenenfalls die dort gefundene öffentliche URL laufen nacheinander im selben Tab.
- Phase 3 vergleicht die gespeicherten Datensätze weiterhin rein lokal und öffnet keinen eigenen Browser-Tab.
- Phase 4 behält die unabhängige autoritative Löschverifikation bei, beendet den Lösch-Worker jetzt aber vollständig, bevor der frische Verifikations-Worker geöffnet wird. Lösch- und Verifikations-Worker sind damit logisch getrennt, aber nicht mehr gleichzeitig offen.
- Auto-Publish-Hard-Gate, Profilprüfung vor Phase 4, unabhängige Abwesenheitsprüfung der Quellanzeige, atomare lokale Promotion und 30-Tage-Papierkorb bleiben unverändert streng.
- Neuer dependency-freier Vertragstest `tests/v1112-contract.cjs` schützt den reduzierten Tab-Lebenszyklus und die bestehenden Sicherheitsgrenzen.

## 1.11.1 – 2026-09-14

- Chrome-Launcher/Popup zeigt die installierte Version nun sichtbar direkt neben „Inventar“.
- Versionsanzeige wird dynamisch aus `chrome.runtime.getManifest().version` gespeist und ist dadurch automatisch release-synchron.
- Kompakte, zurückgenommene Darstellung analog zur Versionsanzeige im App-Header.
- Keine Änderung an Inventar-, Profilmanagement-, Papierkorb-, Renewal-, Publish- oder Löschlogik.
- Neuer dependency-freier Vertragstest `tests/v1111-contract.cjs` schützt Versionsquelle, UI-Wiring, Identität, Sicherheitsgrenzen und Byteidentität des fachlichen Kern-Runtimes.

## 1.11.0 – 2026-09-14

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

## 1.10.4 – 2026-09-14

- Linke Steuerleiste als zusammenhängenden, sticky Arbeitsbereich neu strukturiert.
- Statusanzeige kompakter und informationshierarchisch zurückhaltender gestaltet.
- Aktionshierarchie geschärft: Vollinventur primär, Einzelanzeige sekundär.
- Laufende Vorgänge, Erfolgsmeldungen und Bulk-Status in einem gemeinsamen Aktivitätsbereich gebündelt.
- Support & Diagnose am unteren Rand der Seitenleiste verankert; responsive Darstellung bleibt erhalten.
- Keine Änderung an fachlicher Runtime-Logik oder Sicherheitsgrenzen.


## 1.10.3 – 2026-09-14

- 16/32/48-px-Toolbar-/Extension-Icons aus dem vorhandenen hochauflösenden Master enger beschnitten, sodass das Motiv in der Chrome-/App-Leiste sichtbar größer erscheint.
- Keine Änderung an Motivstil, 128-px-App-Icon, Favicon, Inventarisierung, Renewal-State-Machine, Auto-Publish-Gates, Phase-4-Löschlogik, Recovery, Diagnose oder Verbindungsstatus.
- Neuer dependency-freier Vertragstest `tests/v1103-contract.cjs` schützt Icon-Payload, Mindest-Footprint, feste Extension-ID/Manifest-Key sowie Byte-Identität ausgewählter Kern-Runtime-Dateien zu v1.10.2.

## 1.10.2 – 2026-09-14

- Neue hochauflösende App-/Taskleisten-Icons im passenden Dark-Neon-Stil der Anwendung integriert.
- Manifest besitzt jetzt echte Extension-Icons in 16/32/48/128 px; die kleinen Größen verwenden die vereinfachte Taskleistenvariante, 128 px die detaillierte App-Variante.
- `app.html` und `popup.html` veröffentlichen zusätzlich Favicons, damit Fenster-/Tab-Darstellung und Taskleisten-Symbol konsistent wirken.
- Runtime-Paketierung und Validierung wurden um die Icon-Artefakte erweitert.
- Neuer dependency-freier Vertragstest `tests/v1102-contract.cjs` schützt Icon-Einbindung, Favicon-Links und Packaging.

## 1.10.1 – 2026-09-14

- Statusmaschine korrigiert: Nur inventarrelevante Kleinanzeigen-Seiten gelten als gesunder Verbindungszustand; Start-/Benachrichtigungsseiten unterdrücken keine späteren Statuswechsel mehr.
- Hintergrundprüfungen aktualisieren den sichtbaren Status bei einem Wechsel zu „Meine Anzeigen“ oder einer eigenen Anzeige zuverlässig.
- In-Page-Fortschrittsmeldung trennt Vollautomatik und Papierkorb-Template: Manuelle Publish-Hinweise erscheinen standardmäßig nur noch im `templateOnly`-Flow.
- Startmodal-Aktionen: `Schließen` links, `Jetzt neu inserieren und austauschen` rechts.
- Erfolgsmodal-Aktionen: `Schließen` links; `Anzeige ansehen` und `Anzeige bearbeiten` gleich groß rechts.
- App-Modals verwenden einen zentralen SVG-Close-Button mit exakter Zentrierung und grünem Primärbutton-Hover.
- Neuer dependency-freier v1.10.1-Vertragstest schützt Statussemantik, Vollautomatik-/Template-Feedback und Modal-Layout.

## 1.10.0 – 2026-09-14

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

## 1.9.0

- Globaler exklusiver Inserierungs-/Renewal-Lock: maximal ein Neu-Inserieren-/Austausch- oder Papierkorb-Template-Lauf gleichzeitig.
- Der Lock bleibt über Draft, Veröffentlichung, `WARTET AUF ONLINE`, `PRÜFUNG NÖTIG`, Verifikation und Phase 4 bestehen und wird aus persistenten Renewal-/Fill-Sessions rekonstruiert.
- Mehrere App-Fenster und direkte Runtime-Starts werden service-worker-seitig abgefangen; Startvorgänge sind zusätzlich serialisiert.
- Während eines aktiven Locks sind alle anderen „Neu inserieren“- und „Als Vorlage neu inserieren“-Aktionen deaktiviert und nennen den laufenden Artikel, sofern bekannt.

## 1.8.14 – 2026-09-14

- UX: Das Bestätigungsmodal wird nach Start zum Live-Progress-Modal für Ausfüllen, Veröffentlichen, Verifizieren und Quellanzeige löschen.
- Fortschritt wird aus persistiertem Renewal-State abgeleitet; Modal kann geschlossen und über eine Statusfläche wieder geöffnet werden.
- Abschlusszustand zeigt Erfolg, neue Anzeigen-ID sowie `Anzeige ansehen` in der Read-only-Ansicht.
- Inventarklick öffnet standardmäßig `/s-anzeige/<adId>`; Detail-Link wurde zu `Anzeige bearbeiten` geändert und öffnet die Bearbeiten-Seite.
- Neuer dependency-freier v1.8.14-Vertragstest schützt Progress-State-Mapping, Modal-Lifecycle, Read-only-Karten und Bearbeiten-Link.

## 1.8.13 – 2026-09-14

- **Neu inserieren** besitzt jetzt ein eigenes gestaltetes App-Modal statt eines Browser-Alerts. Es zeigt Titel, lokales Titelbild und Anzeigen-ID der Quellanzeige sowie die vier automatischen Phasen **Ausfüllen → Veröffentlichen → Verifizieren → Quellanzeige löschen**.
- Das Modal weist ausdrücklich darauf hin, dass die Quellanzeige erst nach erfolgreicher Verifikation gelöscht wird und ihre lokale Kopie anschließend 30 Tage im Papierkorb als Recovery-Vorlage verfügbar bleibt. Start erst über **Neu inserieren und austauschen**; Abbrechen startet keinerlei Renewal-Sitzung.
- Die ausdrückliche Freigabe wird als `autoReplacementAllowed`, `startConfirmedAt` und Confirmation-Version persistent in Renewal-/Fill-State geführt.
- Nach dem unverändert strengen Auto-Publish-Hard-Gate und einem vollständigen Phase-3-`match` wird Phase 4 nun automatisch gestartet. Damit läuft ein bestätigter **Neu inserieren**-Vorgang vollständig durch Phase 1–4.
- Service-Worker-Recovery nimmt automatisch freigegebene, bereits verifizierte bzw. in `source-delete...` befindliche Renewals wieder auf.
- Scheitert Auto-Phase-4, wird der Kandidat sicher auf `verified/replacement-ready` zurückgeführt; die bestehende manuelle Abschlussaktion bleibt als Recovery erhalten.
- Papierkorb-Template-Recovery bleibt unverändert `templateOnly` und erhält niemals `autoReplacementAllowed`; sie kann daher weiterhin weder Auto-Publish noch Phase 4 auslösen.
- Neuer dependency-freier v1.8.13-Vertragstest schützt Modalinhalt, explizite Freigabe, persistente Automatik, Auto-Phase-4, Resume und Papierkorb-Grenze.

## 1.8.12 – 2026-09-14

- Neuer 30-Tage-Papierkorb als Recovery-Archiv. Manuell aus dem aktiven Inventar entfernte Anzeigen werden nicht mehr sofort endgültig gelöscht; Datensatz und lokal gespeicherte Bilder bleiben bis `trash.expiresAt` erhalten und werden beim nächsten Extension-/Listen-Lifecycle nach Ablauf automatisch bereinigt.
- Erfolgreicher Phase-4-Austausch verschiebt die alte lokale Quellanzeige atomar in den Papierkorb, während der verifizierte neue Kandidat zum normalen Inventareintrag promoviert wird. Die alte Online-Anzeige bleibt wie bisher nach expliziter Bestätigung gelöscht.
- Eigene App-Ansicht **Papierkorb** mit Restlaufzeit, Recovery-Daten, **Als Vorlage neu inserieren** und **Endgültig löschen**. Eine Wiederherstellung zurück in die aktive Inventurliste ist bewusst nicht vorgesehen; Kleinanzeigen bleibt die autoritative aktive Datenbasis.
- **Als Vorlage neu inserieren** aus dem Papierkorb startet einen eigenständigen Template-only-Fill: gespeicherte Daten/Bilder werden übernommen und alle nicht veröffentlichenden Zwischenschritte dürfen ausgeführt werden, der finale Publish-Schritt wird jedoch niemals automatisch ausgelöst. Es entsteht keine Renewal-/Phase-2/3/4-Sitzung.
- **Inventarliste leeren** verschiebt reguläre aktive Inventareinträge ebenfalls in den 30-Tage-Papierkorb; bei vorhandenen Renewal-Sitzungen bleibt die Massenaktion gesperrt.
- Nach `RENEWAL_REPLACEMENT_COMPLETED` wird der von der Extension erzeugte Renewal-Zieltab best-effort geschlossen, sofern er noch eindeutig auf einem `/p-anzeige-aufgeben...`-Pfad derselben Session steht. Ein inzwischen anderweitig verwendeter Tab wird nicht geschlossen.
- Erfolgreicher Austausch schreibt eine persistente, in der App sichtbare Erfolgsmeldung **Austausch erfolgreich abgeschlossen**. Sie nennt den 30-Tage-Papierkorb und bleibt bis zum manuellen Schließen sichtbar.
- Neuer dependency-freier v1.8.12-Vertragstest schützt Papierkorb-Retention, Soft-Delete, atomare Phase-4-Sicherung, Template-only-Grenze, Erfolgsmeldung und Zieltab-Cleanup.

## 1.8.11 – 2026-09-14

- Phase 4 gegen den real beobachteten Chrome-Fehler `A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received` gehärtet. Ein solcher Abbruch nach dem Löschbefehl ist kein fachlicher Löschfehler mehr.
- Nach dem Löschversuch wird `source-delete-verification-pending` persistent gespeichert. Transportergebnis und optionales Toast-/Modal-Feedback bleiben diagnostische Evidenz; sie entscheiden nicht über den lokalen Abschluss.
- Die autoritative Löschverifikation läuft in einem separaten frischen `Meine Anzeigen`-Worker und ist dadurch unabhängig von Navigation/Unload des Tabs, in dem `Ja, Anzeige löschen` geklickt wurde.
- Die Quell-ID wird weiterhin profilgebunden über die vollständige Pagination gesucht. Zur Toleranz kurzer serverseitiger Konsistenzverzögerungen erfolgen bis zu drei vollständige Prüfversuche mit kurzen Abständen.
- Wird die Quell-ID nach allen Versuchen weiterhin gefunden, erfolgt kein lokaler Inventarwechsel; der Kandidat wird wieder auf `replacement-ready` gesetzt und bleibt sicher erneut ausführbar.
- Erst nach `source-delete-verified` wird der Kandidat atomar zum normalen Inventareintrag promoviert und die alte lokale Quelle entfernt.
- Neuer dependency-freier v1.8.11-Vertragstest schützt Channel-Loss-Toleranz, persistente Zwischenphase, unabhängigen Verifikations-Worker, Retry-Semantik, Cleanup und die atomare Sicherheitsgrenze.

## 1.8.10 – 2026-09-14

- **Jetzt erneut prüfen** führt bei veröffentlichten Renewal-Kandidaten wieder eine vollständige, deterministische Verifikation aus: zuerst wird die bekannte neue Anzeigen-ID über `p-anzeige-bearbeiten.html?adId=<newAdId>` neu inventarisiert und inhaltlich gegen die Quellanzeige verglichen.
- Die öffentliche Primärprüfung verwendet keine geratenen Slug-/Kategorie-URLs mehr, sondern ausschließlich `https://www.kleinanzeigen.de/s-anzeige/<newAdId>`.
- Ist die direkte Read-only-Prüfung unklar, wird als Fallback `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` geöffnet und die neue Anzeigen-ID profilgebunden über die vollständige Pagination gesucht.
- Liefert die gefundene Karte in „Meine Anzeigen“ eine konkrete öffentliche URL, wird diese als zweiter Read-only-Versuch verwendet. So kann ein Redirect der kurzen ID-URL abgefangen werden, ohne eine URL aus Titel/Kategorie selbst zu konstruieren.
- Wird die neue Anzeige in „Meine Anzeigen“ gefunden, die öffentliche Seite aber noch nicht eindeutig erkannt, bleibt der sichere Zustand **WARTET AUF ONLINE** erhalten. Wird sie weder öffentlich noch im vollständig paginierten eigenen Anzeigenbestand bestätigt, entsteht **PRÜFUNG NÖTIG** statt eines falschen Online-Wartezustands.
- Der Fallback prüft den erkannten Profilnamen gegen den Profilbezug der Quellanzeige und bricht bei Profilwechsel/-Unklarheit ohne Freigabe ab.
- Neuer dependency-freier v1.8.10-Vertragstest schützt Bearbeiten→Read-only-ID→Meine-Anzeigen-Fallback, Pagination, Profilbindung und die weiterhin unveränderte Publish-Sicherheitsgrenze.

## 1.8.9 – 2026-09-14

- Renewal-Zustandsmaschine korrigiert: Wenn der fachliche Vergleich vollständig passt und ausschließlich `onlineConfirmed=false` ist, entsteht nun `waiting-for-online` / **WARTET AUF ONLINE** statt `verification-failed` / **PRÜFUNG NÖTIG**.
- **Jetzt erneut prüfen** ist für `waiting-for-online` aktiv und führt eine leichte Read-only-Onlineprüfung der bereits bekannten neuen Anzeigen-ID durch; ein erfolgreicher früherer Fachvergleich muss dafür nicht erneut über Bearbeiten-Seite und Bilder aufgebaut werden.
- **Verifikation erneut prüfen** ist auch für echte `verification-failed`-Kandidaten aktiv und startet dort bewusst eine vollständige Re-Inventarisierung/Verifikation.
- Persistierte v1.8.8-Dead-Locks mit genau einer `online`-Unsicherheit werden beim Resume automatisch nach `waiting-for-online` migriert und erneut geprüft. Der bestehende neue Kandidat bleibt erhalten; erneutes Inserieren ist nicht erforderlich.
- Sobald die Read-only-Seite erreichbar ist, wird der gespeicherte Online-only-Vergleich zu `match` vervollständigt, der Kandidat wird `verified/replacement-ready` und die UI wechselt zu **AUSTAUSCH BEREIT**.
- Ein vorhandener `newAdId` hält den Datensatz semantisch als `renewal-candidate`; ein Online-Wartezustand wird nicht mehr als Draft zurückgestuft.
- Neuer dependency-freier v1.8.9-Vertragstest schützt Zustandsklassifikation, Recovery-Aktion, Legacy-Migration, leichtgewichtige Online-Nachprüfung und die unveränderten Publish-/Phase-4-Sicherheitsgrenzen.

## 1.8.8 – 2026-09-14

- Phase-4-Nachlauf robust gegen die zwei real beobachteten Kleinanzeigen-Erfolgsdarstellungen gemacht: Toast `Anzeige wurde gelöscht` und Modal `Erledigt!` werden nur als optionale positive Diagnoseevidenz behandelt.
- Ein nach der bestätigten Löschung noch sichtbarer Karten-DOM ist kein unmittelbarer Fehler mehr. Das behebt den v1.8.7-Abbruch `Die Löschaktion wurde ausgelöst, aber die Quellanzeige blieb auf der aktuellen Seite sichtbar.`, der insbesondere beim `Erledigt!`-Modal auftrat.
- Fehlt Toast/Modal vollständig, wird dies als `RENEWAL_SOURCE_DELETE_NO_FEEDBACK` diagnostiziert, aber nicht als Löschfehler interpretiert.
- Die verbindliche Sicherheitsverifikation bleibt unverändert streng: `Meine Anzeigen` / `tab=PROJECTS` wird frisch ab Seite 1 geladen und die alte Quell-ID wird erneut über die vollständige Pagination gesucht. Nur wenn sie nirgends mehr vorkommt, erfolgt der atomare lokale Inventarwechsel.
- Neue Diagnoseereignisse `RENEWAL_SOURCE_DELETE_SUCCESS_TOAST`, `RENEWAL_SOURCE_DELETE_SUCCESS_MODAL` und `RENEWAL_SOURCE_DELETE_NO_FEEDBACK`; Phase-4-Zusammenfassung führt Feedbacktyp und Erkennungsmethode mit.
- Neuer dependency-freier v1.8.8-Vertragstest schützt Feedback-Semantik, Nicht-Abbruch bei stehenbleibender Karte und den weiterhin autoritativen Vollscan-Fallback.

## 1.8.7 – 2026-09-14

- Phase-4-Bestätigungsdialog an den real beobachteten Kleinanzeigen-DOM angepasst: Titel `Anzeige löschen`, Sicherheitsfrage und primär `#delete-celebration-sbmt` mit exaktem Text `Ja, Anzeige löschen`.
- Kontrollierter Fallback erlaubt ausschließlich genau einen aktiven Button mit exakt `Ja, Anzeige löschen`; Karten-Löschmatcher wird im Dialog nicht mehr wiederverwendet.
- Neues Diagnoseereignis `RENEWAL_SOURCE_DELETE_CONFIRMATION_RESOLVED` protokolliert Methode, Ablehnungsgrund und knappe Evidenz.
- Neuer dependency-freier v1.8.7-Vertragstest schützt die Dialoggrenzen und alle bestehenden Phase-4-Sicherheitsgrenzen.

## 1.8.6 – 2026-09-14

- Phase-4-Abbruch `diagnostic is not defined` behoben: `inventory-runner.js` besitzt jetzt einen eigenen fehlertoleranten `diagnostic()`-Helper für `LOG_DIAGNOSTIC_EVENT`.
- Diagnose bleibt strikt best-effort: Fehler beim Protokollieren dürfen den Seiten-/Löschablauf nicht beeinflussen.
- Die in 1.8.5 eingeführte Löschlogik bleibt fachlich unverändert: Quellanzeige ausschließlich unter `m-meine-anzeigen.html?tab=PROJECTS`, eindeutige `data-adid`-Bindung, Pagination und frische Vollverifikation vor lokalem Phase-4-Abschluss.
- Neuer dependency-freier v1.8.6-Vertragstest schützt Diagnose-Helper, Fehlerisolation und die unveränderten Phase-4-Sicherheitsgrenzen.

## 1.8.5 – 2026-09-14

- Phase-4-Löschung auf die tatsächliche Kleinanzeigen-Verwaltungsansicht `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` festgelegt. Bearbeiten- und Read-only-Ansichten werden nicht für Löschaktionen verwendet.
- Aktuelle Anzeigenkarten werden primär über `[data-testid="ad-card"][data-adid]` erkannt. Der bisher mögliche Fehlgriff auf ein inneres Aktions-`<li>` ist damit beseitigt.
- Der Löschbutton wird weiterhin strikt innerhalb der Karte der erwarteten Quell-ID gesucht; zusätzlich zum Textsignal wird das aktuelle `trashOutline`-Icon als Evidenz akzeptiert. Mehrdeutige Kandidaten führen weiterhin zum Sicherheitsabbruch.
- Die Quell-ID wird über alle Seiten von „Meine Anzeigen“ gesucht; Seite 1 ist nicht mehr als Aufenthaltsort vorausgesetzt. Paging-Schleifen und mehr als 100 Seiten führen zu einem kontrollierten Abbruch.
- Nach einer Löschaktion reicht das lokale Entfernen der Karte nicht mehr als Phase-4-Verifikation. Der Worker lädt `tab=PROJECTS` frisch und führt einen zweiten vollständigen seitenübergreifenden Scan durch. Erst `not-in-my-ads-full-pagination-scan` erlaubt den atomaren lokalen Inventarwechsel.
- Erweiterte Diagnose für Karten-ID, Seitenzahl, Anzahl/Evidenz der Löschkandidaten sowie Umfang der Vollprüfung.
- Neuer Vertragstest `tests/v185-contract.cjs`.

## 1.8.4 – 2026-09-14

- Phase 4 implementiert: Ein verifizierter `replacement-ready`-Kandidat bietet jetzt die Aktion **Austausch abschließen**.
- Phase 4 löscht ausschließlich die alte Quellanzeige über die eigene „Meine Anzeigen“-Oberfläche, verlangt eine eindeutige Löschaktion und verifiziert anschließend, dass die Quellanzeige nicht mehr vorhanden ist. Direkte `submit()`-/`requestSubmit()`- oder private API-Löschpfade werden nicht verwendet.
- Erst nach bestätigter Online-Löschung erfolgt ein atomarer lokaler Inventarwechsel: alter Quell-Eintrag und seine Bilder werden entfernt, der neue Kandidat wird auf seine echte Anzeigen-ID migriert, `renewal`/`recordKind=renewal-*` werden entfernt und die neue Anzeige bleibt als normaler Inventareintrag erhalten.
- Nach Phase 4 erscheinen für die neue Anzeige wieder die normalen Aktionen **Neu inserieren**, **Aktualisieren** und **Löschen**; der Badge **AUSTAUSCH BEREIT** entfällt automatisch.
- `replacement-ready`-Kandidaten besitzen zusätzlich **Aktualisieren**. Die Aktualisierung bewahrt die Kandidaten-Identität und führt den Quell-/Zielvergleich erneut aus; nur ein erneutes `match` bleibt austauschbereit.
- `replacement-ready`-Kandidaten können mit **Aus Inventar entfernen** ausschließlich lokal entfernt werden. Dabei werden weder die neue noch die alte Anzeige auf Kleinanzeigen gelöscht oder verändert; die lokale Renewal-Sitzung wird verworfen und die Quellanzeige bleibt als normaler Inventareintrag bestehen.
- Neuer Vertragstest `tests/v184-contract.cjs`.

## 1.8.3 – 2026-09-14

- Verifizierte Renewal-Kandidaten werden nach erfolgreicher Veröffentlichung, Neu-Inventarisierung und semantischer Verifikation nicht mehr wie ein Draft/Skeleton dargestellt.
- Der Zustand `verified` / `replacement-ready` wird in der kompakten Inventaransicht als **AUSTAUSCH BEREIT** angezeigt.
- Eine verifizierte neue Anzeige nutzt wieder die normale Kartenoptik statt der Draft-/Renewal-Hintergrunddarstellung.
- In der kompakten Faktenliste wird die alte Quell-ID bei `replacement-ready` nicht mehr als primäre Information gezeigt; sie bleibt ausschließlich in den aufgeklappten Renewal-/Artikeldetails erhalten.
- Die Fußzeile verwendet für den verifizierten Kandidaten wieder das normale Schema `Inventarisiert <Zeit> · ID <neue Anzeigen-ID>`. Damit ist die neue ID die sichtbare primäre Anzeigen-ID.
- Draft-spezifische Aktion **Entwurf verwerfen** bleibt weiterhin ausschließlich für unveröffentlichte Renewals ohne bestätigte neue Anzeigen-ID verfügbar.
- Intern bleibt der verifizierte Kandidat bis Phase 4 mit seiner Quellanzeige und Renewal-Session verknüpft. Phase 4 / automatische Löschung der Quelle ist weiterhin nicht Bestandteil dieser Version.

## 1.8.2 – 2026-09-14

- Finales Auto-Publish für Renewal Phase 1 aktiviert: **Anzeige aufgeben** wird nur dann automatisch geklickt, wenn der persistierte Fill vollständig (`complete`) und ohne Issues ist, alle kontrollierten Formular-/Bildprüfungen bestanden wurden und exakt ein sichtbarer, aktivierter Publish-Button eindeutig erkannt wird.
- Bei fehlendem oder mehrdeutigem Publish-Control wird nicht geraten. Der Fill wechselt in `awaiting-manual-publish`, zeigt einen Prüfstatus und veröffentlicht nicht automatisch.
- Der verifizierte Fill-Zustand wird über Seitennavigationen hinweg mitgeführt, damit der finale Publish-Schritt das Hard-Gate erneut belastbar prüfen kann. Publish-Erkennung, neue Anzeigen-ID-Ermittlung sowie automatische Phase 2/3 bleiben unverändert angeschlossen.
- Nicht veröffentlichte Renewal-Drafts ohne neue Anzeigen-ID können in der Inventarliste über **Entwurf verwerfen** lokal entfernt werden. Die App bestätigt ausdrücklich, dass die Quellanzeige erhalten bleibt und auf Kleinanzeigen nichts gelöscht wird.
- Beim Verwerfen werden Skeleton-Inventareintrag, zugehörige Renewal-/Fill-Sitzung und draftbezogene lokale Zustände bereinigt. Ein bereits `submitted`/veröffentlichtes Renewal oder ein Renewal mit neuer Anzeigen-ID ist für diesen einfachen Löschpfad gesperrt.
- Phase 4 bleibt weiterhin nicht implementiert: Die alte Quellanzeige wird in 1.8.2 nicht automatisch gelöscht.

## 1.8.1 – 2026-09-14

- Nach vollständig verifiziertem Template-Fill (`complete`, keine Issues, alle Bilder stabil) betätigt die Extension jetzt automatisch genau einen eindeutig sichtbaren und aktivierten **„Weiter“**-Button des nicht-publizierenden Erstellflows. Vor dem Klick wird `post-fill-continuing` protokolliert; Navigation bzw. das Erscheinen des finalen Publish-Schritts wird anschließend bestätigt.
- Ist „Weiter“ nicht eindeutig vorhanden oder kann die Fortsetzung nicht sicher bestätigt werden, wird **nicht geraten**: Der Fill bleibt erhalten und das Feedback fordert zur manuellen Fortsetzung auf.
- **„Anzeige aufgeben“ bleibt strikt manuell.** Die Extension klickt den Publish-Button weiterhin niemals automatisch und ruft dafür weder `submit()` noch `requestSubmit()` auf. Nach dem automatischen „Weiter“ wird auf der Folgeseite die Publish-Erkennung erneut bewaffnet und zum Publish-Bereich gescrollt.
- Das Standard-**Diagnose-ZIP** exportiert jetzt ausschließlich die aktuelle Diagnose-Session seit dem letzten `DIAGNOSTIC_SESSION_STARTED`. Historische Retention-Events bleiben intern gespeichert, werden aber nicht mehr in jedes Standard-ZIP aufgenommen.
- `errors.json`, Fill-/Renewal-Sessions, Inventarzusammenfassung und optional `bulk-run.json` werden ebenfalls auf die aktuelle Session bzw. deren referenzierte IDs/Datensätze begrenzt. `environment.json` weist `exportScope: current-session` sowie interne Retention- und Exportanzahl getrennt aus.
- Die aktuell installierte Extension-Version wird im App-Header kompakt direkt aus `chrome.runtime.getManifest().version` angezeigt.

## 1.8.0 – 2026-09-14

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

## 1.7.1 – 2026-09-14

- Inventarliste wächst während eines Vollinventurlaufs automatisch mit jedem erfolgreich gespeicherten Artikel; kein manueller Klick auf „Aktualisieren“ mehr erforderlich.
- Der Hintergrunddienst signalisiert Inventaränderungen best-effort an offene App-Fenster; die App lädt die Liste leicht debounced neu und erzwingt nach `BULK_INVENTORY_FINISHED` einen finalen Reload.
- Suche und Sortierung bleiben bei Live-Refresh erhalten, weil nur der lokale Datensatz neu geladen und anschließend mit dem bestehenden View-State gerendert wird.
- Read-only-URL-Erkennung im Vollinventurlauf korrigiert: Öffentliche `/s-anzeige/`-Links werden bei Bedarf im gesamten Dokument anhand derselben stabilen Anzeigen-ID gesucht, statt nur im lokal ermittelten Bearbeiten-Karten-Teilbaum.
- Dadurch kann der parallele Read-only-Metadaten-Worker für `Endet am` und `Anzeige vom` wieder gestartet werden, wenn Kleinanzeigen Bearbeiten-Aktion und öffentlichen Link in getrennten DOM-Bereichen rendert.
- Read-only-Metadaten bleiben ergänzend und dürfen bei Fehlern die primäre Bearbeiten-Inventarisierung weiterhin nicht scheitern lassen.
- Sicherheitsgrenzen unverändert: keine automatische Veröffentlichung und keine automatische Löschung einer Kleinanzeigen-Anzeige.

# Changelog

## 1.17.1 – 2026-09-17

- Neuer globaler Regler **„Versuche je Phase“** unter **Konfiguration → Prüfmodus**. Wertebereich 1–5, Standard 3. Der Wert wird beim Start eines Einzel- oder Massen-Renewals eingefroren und gilt als maximale Gesamtzahl der Versuche pro Phase.
- Phase 1 erhält vollständige frische Erstellversuche vor Publish. Feldspezifische lokale UI-Retries bleiben separat; nach Publish-Klick, persistiertem Publish-Zeitpunkt oder bestätigter neuer Anzeigen-ID ist ein erneuter Phase-1-Aufbau strikt gesperrt.
- Kategorieauswahl ist für langsame Systeme gehärtet: bis zu drei frische semantische Klickversuche mit jeweils bis zu 10 Sekunden Bestätigungszeit. Der bisherige hardcodierte Fallback auf `/p-kategorie-aendern.html` wurde entfernt.
- Phase 2 wiederholt bei transienten Fehlern ausschließlich die frische Detail-/Vollprüfung derselben bereits veröffentlichten neuen Anzeige. Phase 3 wiederholt ausschließlich die Presence-/Profil-Verifikation derselben neuen Anzeigen-ID; Schnellprüfung verwendet dafür pro Versuch einen frischen Worker.
- Phase 4 ist retryfähig, ohne Delete blind zu wiederholen: jeder Versuch prüft die Quellanzeige zuerst über einen frischen unabhängigen Vollscan. Nur wenn sie nachweislich noch vorhanden ist, wird ein weiterer Löschversuch ausgelöst; anschließend folgt erneut `VERIFY_OWN_AD_ABSENT_BY_ID`. Transportunterbrechung bleibt ausdrücklich kein Löschbeweis, Promotion erfolgt weiterhin erst nach `source-delete-verified`.
- Neue RED→GREEN-Verträge `v1171-phase-retries*`; bestehende Phase-4-Vertragstests wurden auf die neue Helper-Struktur aktualisiert, ohne Sicherheitsinvarianten abzuschwächen.

## 1.16.6 – 2026-09-16

- Vollinventur-Modal zeigt während „Erfassen“ die aktuell bearbeitete Anzeige als kompakte Vorschaukarte mit Titelbild, Titel und Anzeigen-ID.
- Vorschau wird aus dem frischen „Meine Anzeigen“-Snapshot gespeist und wechselt automatisch mit dem laufenden Item; keine Änderung der Bulk-Verarbeitung.

## 1.13.4 – 2026-09-15

- Hotfix für die ZIP-Neuinserat-**Vollprüfung**: Nach **Neue Anzeige finden** wird Schritt 3 jetzt ausschließlich über die unter **Meine Anzeigen** für genau die neue Anzeigen-ID gefundene Bearbeiten-URL gestartet. Die Vollprüfung konstruiert an dieser Stelle keine unabhängige URL mehr und arbeitet nicht auf einer öffentlichen `/s-anzeige/...`-Read-only-Ansicht weiter.
- Die gefundene Bearbeiten-URL wird als `newEditUrl` in der persistenten ZIP-Neuinserat-Sitzung festgehalten und für den anschließenden Bearbeiten-Prüfworker verwendet. Host, Pfad und `adId` werden strikt gegen die erwartete neue Anzeigen-ID validiert.
- Nach dem Laden bestätigt der Background nochmals, dass der Prüfworker tatsächlich auf `p-anzeige-bearbeiten.html?adId=<neueID>` steht. Ein Redirect auf eine öffentliche Anzeige oder eine andere ID beendet die Vollprüfung sicher statt dort eine Read-only-Inventarisierung zu versuchen.
- Neues Diagnoseereignis `ARCHIVE_INSERT_EDIT_MODE_CONFIRMED` dokumentiert den erfolgreichen Übergang in den Bearbeiten-Modus.
- Schnellprüfung, Auto-Publish-Hard-Gate, Profilbindung, ZIP-Archivvertrag, zusätzliche Inventaraufnahme sowie bestehende Renewal-/Delete-Sicherheitsgrenzen bleiben unverändert. Die in v1.13.3 ergänzte Galeriediagnose bleibt erhalten, ist aber nicht der Fix für diesen Workflowfehler.
- Neuer dependency-freier Regressionstest `tests/v1134-contract.cjs` schützt die Bearbeiten-URL-Bindung und weist öffentliche Read-only-URLs als ungültiges Vollprüfungsziel zurück.


## 1.7.0 – 2026-09-13

- Inventarliste um eine lokale **Titelsuche** erweitert. Die Suche arbeitet live auf den bereits inventarisierten Datensätzen, ist unabhängig von Groß-/Kleinschreibung und Akzenten und unterstützt mehrere Suchbegriffe im Titel. Es wird keine neue Kleinanzeigen-Abfrage ausgelöst.
- Neue kombinierbare Sortierung der Inventarliste nach **Name / Titel**, **Veröffentlichungsdatum / Anzeige vom**, **Endet am** und **Inventarisierungsdatum**. Jedes Kriterium kann auf- oder absteigend sortiert werden. Fehlende Datumswerte bleiben unabhängig von der Sortierrichtung gesammelt am Listenende.
- Standardsortierung bleibt funktional kompatibel zum bisherigen Verhalten: **Inventarisierungsdatum absteigend**. Während einer Titelsuche zeigt die Zählung zusätzlich die Anzahl sichtbarer Treffer gegenüber dem Gesamtbestand.
- Inventarzeilen kompakter gestaltet: Metadaten-Labels bleiben einzeilig; insbesondere `ANZEIGE VOM` bricht nicht mehr um. `Inventarisiert <Datum/Zeit> · ID <Anzeigen-ID>` wurde aus dem oberen Faktenblock entfernt und steht jetzt rechts neben **Artikeldetails anzeigen** in der unteren Kartenzeile.
- Preis in der kompakten Inventarzeile zeigt die gespeicherte Preisart konsequent als Kurz-/Langform, soweit bekannt: z. B. `5 € · FP / Festpreis` oder `15 € · VB / Verhandlungsbasis`. Fehlt eine gespeicherte Preisart, bleibt es beim Betrag. Dieselbe Darstellung wird in den Artikeldetails verwendet.
- Neue reine View-Logik `inventory-view.js` kapselt Suche, Sortierung, Datumsbehandlung und Preisart-Anzeige und wird dependency-frei getestet.
- Bestehende Funktionen aus 1.6.2 bleiben unverändert: Profil-Prerequisite, parallele Bearbeiten-/Read-only-Inventarisierung, Diagnose-ZIP, Kategorieabschlussfix, Content-Script-Bootstrap und stille Healthchecks. Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.


## 1.6.2 – 2026-09-13

- UI-Hotfix für den stillen 5-Sekunden-Healthcheck: Bei bereits bestätigter gesunder Verbindung werden `pageReady` und die Aktionsbuttons nicht mehr vorsorglich zurückgesetzt. **Inventurlauf starten** bleibt dadurch während der Hintergrundprüfung durchgehend in seinem bestehenden Zustand und flackert nicht mehr kurz deaktiviert.
- Erst ein tatsächlich beobachteter Verlust von **Meine Anzeigen**, ein fehlender Kleinanzeigen-Tab oder ein terminaler Content-Script-/Message-Fehler deaktiviert die betroffenen Aktionen und löscht den Ready-State.
- Vordergrundprüfungen beim Initialisieren und beim Benutzer-Button **Aktualisieren** dürfen weiterhin kurz sperren; die Single-Flight-/5-Sekunden-Polling-Architektur aus 1.6.1 bleibt erhalten.
- Neuer dependency-freier v1.6.2-Vertragstest schützt den Button-/`pageReady`-Zustand bei gesunden Hintergrundprüfungen sowie die Deaktivierung bei echten Verlustzuständen.

## 1.6.1 – 2026-09-13

- UI-Status-Flackern bei gesundem Kleinanzeigen-Handshake behoben: Der planmäßige 5-Sekunden-Healthcheck läuft jetzt still im Hintergrund, solange die zuletzt bestätigte Content-Script-Verbindung gesund ist.
- `Extension-Verbindung wird hergestellt` wird nur noch beim initialen/ausdrücklichen Vordergrund-Check oder nach einem echten Verbindungsverlust angezeigt.
- Ein erfolgreicher Hintergrund-Healthcheck überschreibt den bestehenden sichtbaren Ready-/Aktionsstatus nicht mehr alle fünf Sekunden.
- Bei terminalem Verbindungsfehler wird der Healthy-State zurückgesetzt; der nächste Wiederverbindungsversuch darf den Verbindungsaufbau wieder sichtbar anzeigen.
- Initialisierung und der Benutzer-Button **Aktualisieren** bleiben bewusste Vordergrundprüfungen und liefern weiterhin direktes sichtbares Verbindungsfeedback.
- Alle v1.6.0-Funktionen, Profil-Prerequisite, parallele Zwei-Quellen-Inventarisierung, Diagnose-ZIP und Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.
- Neuer dependency-freier v1.6.1-Vertragstest deckt Silent-Healthcheck, Verlust-/Recovery-Semantik und Vordergrundprüfungen ab.

## 1.6.0 – 2026-09-13

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

## 1.5.1 – 2026-09-13

- Legacy-Kategorieassistent korrigiert: Nach jeder finalen Kategorieauswahl wird nicht mehr automatisch angenommen, dass der Leaf-Klick selbst navigiert. Der Filler wartet mindestens die bestehende 100-ms-Aktionspause und prüft anschließend explizit auf Navigation, weitere Pflichtmerkmale oder einen sichtbaren aktiven **Weiter**-Button.
- Bestätigter zweistufiger Fall `Haus & Garten → Weiteres Haus & Garten` wird damit nach Auswahl des finalen Leafs über `category-continuing` und **Weiter** zu den Anzeigendetails fortgesetzt.
- Derselbe Abschluss-Gate gilt nun auch für final als Parent klassifizierte Pfadknoten; vorhandene zusätzliche Wizard-Pflichtmerkmale werden weiterhin zuerst exakt aus der Vorlage gewählt und erst danach **Weiter** betätigt.
- Wenn nach der finalen Auswahl weder Navigation noch Pflichtmerkmal noch **Weiter** verfügbar wird, bricht der Lauf mit einer klaren Fehlermeldung ab, statt dauerhaft in `category-leaf-selected` zu verbleiben.
- Neue dependency-freie Regressionstests decken den zweistufigen Leaf+Weiter-Fall sowie den bestehenden mehrstufigen Pflichtmerkmal+Weiter-Ablauf ab. Alle Publish-/Delete-Sicherheitsgrenzen bleiben unverändert.

## 1.5.0 – 2026-09-13

- App→Kleinanzeigen-Verbindung grundlegend robuster: Bei `Could not establish connection. Receiving end does not exist.` wird nicht mehr nur derselbe `sendMessage`-Aufruf wiederholt. Der Zieltab wird validiert, das Content-Script-Paket bei Bedarf über `chrome.scripting.executeScript` idempotent nachinjiziert und anschließend über `KR_CONTENT_READY` vollständig auf Image/Form/Template/Inventory-Module geprüft. Dafür kommt ausschließlich die Manifest-Berechtigung `scripting` hinzu; Host-Rechte und feste Extension-ID bleiben unverändert.
- Die App-Statusprüfung ist jetzt **single-flight**. Das frühere 5-Sekunden-`setInterval` wurde durch ein `setTimeout`-Polling ersetzt, das erst nach Abschluss der vorherigen Prüfung erneut startet. Dadurch können keine parallelen Retry-/Handshake-Ketten mehr entstehen. Transiente Einzelversuche werden nicht mehr als Warnungsflut geloggt; Diagnose unterscheidet Bootstrap-Start, Erfolg und terminalen Fehlschlag.
- Manuelles **Aktualisieren** protokolliert `USER_REFRESH_SUCCEEDED` nur noch nach tatsächlich erfolgreichem Content-Handshake. Die UI unterscheidet jetzt zwischen „Extension-Verbindung wird hergestellt“ und einem terminalen „Content Script nicht verbunden“, statt einen fehlenden Receiver als unerreichbare Kleinanzeigen-Seite zu bezeichnen.
- Die alten manuellen Diagnoseoberflächen **Bilddiagnose der aktuellen Seite kopieren**, **Formular- und Bilddiagnose kopieren** sowie die sichtbare Roh-JSON-Ausgabe wurden entfernt. Der strukturierte persistente Log bleibt erhalten; Nutzerweg ist ausschließlich **Diagnose-ZIP herunterladen**.
- Jede Inventarzeile besitzt zwischen **Neu inserieren** und **Löschen** die neue Aktion **Aktualisieren**. Sie öffnet ausschließlich für diese Anzeigen-ID einen inaktiven Bearbeiten-Worker, inventarisiert Formular, dynamische Attribute und Bilder neu und ersetzt den lokalen Datensatz erst nach vollständig erfolgreichem atomarem Commit. Bei einem Fehler bleibt der bisherige Inventarstand unverändert. Bereits bekanntes Enddatum bleibt erhalten, falls es auf der Bearbeiten-Seite nicht erneut verfügbar ist.
- Ein Klick auf die nicht-interaktive Fläche einer Inventarzeile öffnet die zugehörige Anzeige im Bearbeiten-Modus. Buttons, Links, `Artikeldetails anzeigen` und die komplette aufgeklappte Detailansicht sind ausdrücklich vom Karten-Klick ausgenommen. Dezenter Hover-/Fokuszustand kennzeichnet die Zeile als klickbar.
- Bestehende Sicherheitsgrenzen unverändert: keine automatische Veröffentlichung, kein Klick auf `Anzeige aufgeben`, kein Publish-`submit()`/`requestSubmit()` und keine Änderung/Löschung von Kleinanzeigen-Anzeigen durch Inventaraktionen.
- Bekannte Einschränkung bleibt bewusst bestehen: Der alte In-Page-Feedback-Zähler auf „Meine Anzeigen“ kann nach erfolgreichem Einzel-Retry noch einen veralteten Fehlerstand anzeigen; maßgeblich sind App-Fehlerliste und persistenter Run-State.

## 1.4.0 – 2026-09-13

- Diagnose-/Loggingarchitektur erweitert: automatische Abläufe und Benutzeraktionen innerhalb der App werden als strukturierte, persistent begrenzte Ereignisse mit Zeit, Severity, Modul/Operation und verfügbaren Run-/Fill-/Anzeigen-/Tab-IDs protokolliert.
- Neue Aktion **Diagnose-ZIP herunterladen**. Export enthält `summary.txt`, `diagnostics.jsonl`, `errors.json`, aktuellen Bulk-Run-State, Fill-Sessions, datensparsame Inventar-Metadaten und Umgebungs-/Versionsdaten. CSRF-/Cookie-/Passwort-/Tokenwerte werden redigiert, URL-Queryparameter entfernt und vollständige Beschreibungs-/Kontaktwerte nicht exportiert.
- Verbindungsaufbau vom eigenen App-Fenster zu Kleinanzeigen-Tabs robuster: transiente `Could not establish connection. Receiving end does not exist.`-/Message-Port-Fehler werden mit begrenztem Retry/Backoff erneut versucht und diagnostisch erfasst.
- Inventarliste auf einspaltige Listenansicht umgestellt; breite Artikelzeilen bilden die Grundlage für spätere Filter-/Sortierfunktionen.
- Der Vollinventurlauf liest pro Anzeigenkarte zusätzlich das sichtbare `Endet am DD.MM.YYYY`, ordnet es über die stabile Anzeigen-ID dem Worker zu, speichert es als Listen-Metadatum und zeigt es in der Inventarliste sowie den Artikeldetails.
- `normalizeText is not defined` im Komfort-Scroll nach erfolgreichem Template-Fill behoben: `scrollToPublishButton()` nutzt die vorhandenen Helper `clean(...)` und `visible(...)`. Der Scroll ist vom fachlichen Fill-Abschluss entkoppelt; ein Scrollfehler wird nur noch als Warnung protokolliert und kann einen bereits verifizierten Erfolg nicht mehr in `error` umstufen.
- Bekannte Einschränkung: Der bereits beobachtete veraltete In-Page-Feedback-Zähler nach einem erfolgreichen Einzel-Retry wird in 1.4.0 bewusst noch nicht geändert; App-Fehlerliste und persistenter Run-State bleiben dafür die maßgebliche Anzeige.
- Publish-/Delete-Sicherheitsgrenzen unverändert: kein automatischer Klick auf `Anzeige aufgeben`, kein Publish-`submit()`/`requestSubmit()` und keine Änderung/Löschung von Kleinanzeigen-Anzeigen.

## 1.3.0 – 2026-09-13

- Inventarverwaltung aus dem schmalen Toolbar-Popup in ein eigenes, frei skalierbares Chrome-App-Fenster verlagert. Der Launcher öffnet bzw. fokussiert ein bestehendes Fenster statt Duplikate zu erzeugen; Startgröße 1180×860.
- Große App-Ansicht mit Vollinventur-Steuerung, kompakter Inventarliste, Artikeldetails, Diagnose und ausführlichem Fehlerbereich. Bestehende Aktionen **Neu inserieren**, **Löschen**, **Artikeldetails anzeigen** und **Inventarliste leeren** bleiben erhalten.
- Fehler aus einem Vollinventurlauf werden mit Titel, Anzeigen-ID und konkretem Fehlergrund sichtbar dargestellt. Pro Fehler gibt es **Erneut versuchen** für eine gezielte Einzelinventarisierung ohne Neustart des gesamten Laufs.
- Einzel-Retry öffnet nur den Bearbeiten-Worker für die betroffene stabile Anzeigen-ID. Erfolg entfernt den Fehler, übernimmt den Artikel in die Inventarliste und korrigiert `failedCount`/`successCount`; erneuter Fehlschlag aktualisiert Fehlergrund und Retry-Zeitpunkt. Gleichzeitige Retries sowie lokale Lösch-/Clear-Aktionen während eines Retry sind gesperrt.
- Fehlgeschlagene Anzeigen werden auf **Meine Anzeigen** anhand ihrer Anzeigen-ID mit transparent-rotem Hintergrund markiert. Die Markierung wird aus dem persistenten Run-State wiederhergestellt und über Paging hinweg aktualisiert; direkt an der Karte steht ebenfalls ein Retry-Button zur Verfügung.
- Die feste Extension-ID, Berechtigungen, Vollinventur-Workerlogik, lokale JPEG-Sicherung, Neu-inserieren-Flow, Scroll zum Veröffentlichungsbutton und die Sicherheitsgrenze ohne automatische Veröffentlichung/Löschung bleiben unverändert.

## 1.2.0 – 2026-09-13

- Vollinventur auf `m-meine-anzeigen.html?tab=PROJECTS`: Soll-Gesamtzahl aus `N Anzeigen online / ... gesamt` lesen und alle eigenen laufenden Anzeigen über sämtliche Paging-Seiten sequenziell abarbeiten.
- Paging orientiert sich an der realen Navigation mit `aria-current="page"` und `aria-label="Nächste"`; keine fest codierte Seitenzahl. Anzeigen werden anhand stabiler Anzeigen-IDs dedupliziert.
- Jede Anzeige wird in einem separaten inaktiven Bearbeiten-Worker-Tab geöffnet, mit der bestehenden Einzelinventarisierung inklusive großer lokaler JPEGs gespeichert und danach wieder geschlossen. Erst erfolgreiche Einzelinventarisierungen erscheinen in der Inventarliste; Fehler werden positions-/anzeigenbezogen im Laufstatus geführt.
- Persistenter Bulk-Run-State mit erwarteter Gesamtzahl, aktueller Seite, bereits verarbeiteten IDs, Erfolgen/Fehlern, aktuellem Worker und Diagnose. Bei Quell-Tab-Schließen, Seitenwechselproblemen oder Count-Mismatch endet der Lauf mit Prüfstatus.
- Fortschrittsanzeige auf `Meine Anzeigen` und im Popup, z. B. `12/66 Anzeigen abgearbeitet`, inklusive Seite und aktuellem Titel. Abschluss nur, wenn erfolgreich + fehlgeschlagen exakt der erkannten Online-Anzeigenzahl entspricht.
- Neue Aktion **Inventarliste leeren** mit Bestätigung; löscht ausschließlich lokale Inventardaten und lokale Bilder. Einzelne Inventareinträge können ebenfalls lokal über **Löschen** entfernt werden. Keine Kleinanzeigen-Anzeige wird dadurch verändert oder gelöscht.
- Inventarliste kompakter: Titelbild, Titel, Kategorie, Art, Preis; Aktionen **Neu inserieren**, **Löschen** und die umbenannte Detailfunktion **Artikeldetails anzeigen**. Detailansicht behält vollständige Artikeldaten und Bilddetails.
- Nach vollständig erfolgreicher Vorbefüllung wird zum sichtbaren Button `Anzeige aufgeben` gescrollt; der Button wird weiterhin niemals automatisch geklickt.
- Bestehende Einzelinventarisierung, sequenzieller Bild-Upload, Marken-Autocomplete, Zustandsbestätigung, Kategorieassistent und Publish-Sicherheitsgrenze bleiben erhalten.

## 1.1.6 – 2026-09-13

- Bildübernahme auf strikt sequenziellen Ablauf umgestellt: jedes lokale JPEG wird einzeln an Kleinanzeigen übergeben; das nächste Bild beginnt erst nach serverseitiger Anlage und terminaler Vorschau des vorherigen Bildes.
- Pro Bild expliziter Lifecycle `pending -> server-created -> cdn-loaded | blob-fallback | failed`; serverseitige Anlage und visuelle Vorschau werden getrennt verifiziert.
- CDN-Vorschauen benötigen erfolgreiche Dekodierung plus 500-ms-Stabilitätsphase ohne erneute `src`-/`srcset`-Mutation oder Ladefehler. Einmal stabile Bilder werden nicht mehr verändert.
- Defekte CDN-Vorschauen werden pro Bild höchstens einmal erneut angestoßen. Falls weiterhin nötig, wird der lokale JPEG-Blob genau einmal als sichtbarer Fallback gesetzt und danach nicht wieder auf CDN zurückgeschaltet.
- Feedback-Popover zeigt den Fortschritt pro Bild (`Bild 1/5 wird hochgeladen`, `... Vorschau wird geprüft`, `... erfolgreich übernommen`) und benennt Bildfehler positionsgenau.
- `Vorlage vollständig übernommen` wird erst nach gemeinsamem Abschluss-Gate angezeigt: alle kontrollierten Formularwerte korrekt, alle erwarteten Server-Bilder vorhanden und sämtliche Thumbnails stabil terminal.
- Marken-Autocomplete, Zustands-`Bestätigen`, Kategorieassistent mit 100-ms-Taktung, Ignorieren konkreter Versandmethoden/-größen und Publish-Sicherheitsgrenze bleiben unverändert.

## 1.1.5 – 2026-09-13

- Suchbare Comboboxen wie `Marke` werden benutzerähnlich bedient: fokussieren/leeren, schrittweise Eingabe mit `beforeinput`/`input` plus Tastaturereignissen, kurze Debounce-Wartezeit und exakte Auswahl aus der tatsächlich gerenderten Vorschlagsliste. Falls die Liste nicht automatisch öffnet, fordert ein `ArrowDown`-Signal sie an; es wird weiterhin nie nach Position geraten.
- Bild-Upload gilt nicht mehr allein wegen vorhandener `adImages[n].url`-Einträge als visuell abgeschlossen. Zusätzlich werden die erwarteten Kleinanzeigen-Preview-Images auf `complete && naturalWidth > 0 && naturalHeight > 0` geprüft.
- Noch nicht verfügbare signierte CDN-Vorschauen werden für einen begrenzten Zeitraum erneut geladen. Wenn Kleinanzeigen die Server-Bildobjekte bereits angelegt hat, die CDN-Vorschau aber weiterhin defekt bleibt, werden ausschließlich die sichtbaren Thumbnail-`img`-Elemente temporär auf die identischen lokalen JPEG-Dateien umgebogen. Der serverseitige Formular-/Bildzustand bleibt unverändert.
- Konkrete Versandmethoden/Paketgrößen bleiben weiterhin unberücksichtigt; Zustand-`Bestätigen`, Kategorieassistent, 100-ms-Taktung, automatische Legacy-`Weiter`-Fortsetzung und Publish-Sicherheitsgrenze bleiben erhalten.

## 1.1.4 – 2026-09-13

- Suchbare dynamische Auswahlfelder wie `Marke` werden jetzt als echte Autocomplete-Auswahl behandelt: sichtbaren Vorlagenwert eingeben, gefilterte Vorschlagsliste abwarten, exakten sichtbaren Vorschlag anklicken und anschließend den technischen `attributeMap[...]`-Wert verifizieren.
- Referenzfall `Up Fashion`: reines Eintragen des Textes gilt nicht mehr als Erfolg; erst die Auswahl des Vorschlags darf `up_fashion` bestätigen.
- Modalbasierte Merkmale wie `Zustand` werden nach der exakten Optionswahl mit dem sichtbaren Button `Bestätigen` abgeschlossen. Erst nach Modal-Schließen bzw. technischem Wert-Update wird die Auswahl verifiziert.
- Konkrete Versandmethoden und Paketgrößen werden vorerst vollständig aus dem Template-Fill ausgeschlossen: keine Auswahl/Verifikation von `HERMES_*`, `DHL_*` oder `Klein`/`Mittel`/`Groß`, keine daraus entstehenden Warnungen. Die Grundeinstellung `Versand möglich` / `Nur Abholung` bleibt erhalten.
- Kategorieassistent, 100-ms-Taktung, lokale Bildübernahme und Sicherheitsgrenzen bleiben unverändert; weiterhin keine automatische Veröffentlichung.

## 1.1.3 – 2026-09-13

- Legacy-Kategorieassistent nach erfolgreicher Pflichtmerkmalsauswahl abgeschlossen: Sobald keine weitere erforderliche Assistentenspalte offen ist und der sichtbare Button `Weiter` verfügbar ist, wird dieser genau einmal angeklickt und anschließend auf die Rückkehr zu `/p-anzeige-aufgeben-schritt2.html` gewartet.
- Der Referenzfall `Mode & Beauty → Damenbekleidung → Art: Weitere Damenbekleidung` wird damit nach der korrekt markierten Art-Auswahl fortgesetzt, statt fälschlich als unvollständig zu enden.
- Bereits erfolgreich gesetzte Assistentenmerkmale werden im Abschluss-/Fehlerpfad nicht mehr erneut als fehlend gemeldet. Unbekannte oder nicht eindeutig aus der Vorlage zuordenbare Pflichtspalten bleiben weiterhin ein harter Diagnosefehler.
- Zwischen allen programmgesteuerten Auswahlaktionen im Legacy-Kategorieassistenten gilt nun eine feste Mindestpause von 100 ms; dieselbe Mindestpause gilt vor dem Klick auf `Weiter`.
- Neue Session-Stufe `category-continuing` macht den Übergang vom Kategorieassistenten zurück zu Schritt 2 diagnostizierbar.
- Sicherheitsgrenze unverändert: Der automatische `Weiter`-Klick betrifft ausschließlich den Kategorieassistenten. Kein automatischer Klick auf `Anzeige aufgeben`, keine Veröffentlichung und keine Änderung/Löschung der Quellanzeige.

## 1.1.2 – 2026-09-13

- Kategorie-Assistent um integrierte Pflichtmerkmale erweitert: Zusätzliche sichtbare Spalten wie `Art *` werden anhand des gespeicherten dynamischen Merkmalslabels erkannt und nur bei exakter sichtbarer Wertübereinstimmung bedient.
- Referenzfall Damenbekleidung: Nach `Mode & Beauty → Damenbekleidung` wird nun `Art → Weitere Damenbekleidung` ausgewählt, bevor Kleinanzeigen selbst zu Schritt 2 zurücknavigiert.
- Die Auswahl bleibt generisch für andere Kategorien, z. B. `Art → Sandalen` oder `Art → Fitness`; es gibt keine fest codierten Kategorie- oder Optionsnamen.
- Parent-/Pfadlinks werden nicht erneut angeklickt, wenn bereits eine nachgelagerte Assistentenspalte sichtbar ist. Die direkte `cat_<categoryId>`-Auswahl wird nur noch als terminal behandelt, wenn der Link kein Parent ist.
- Nicht eindeutig aus der Vorlage zuordenbare zusätzliche Pflichtspalten brechen mit Diagnose ab, statt eine Auswahl zu raten. Neue Session-Stufe `category-attribute-selected`.
- Sicherheitsgrenze unverändert: kein automatisches Veröffentlichen, kein `submit()`/`requestSubmit()`, keine programmgesteuerte Übermittlung des Legacy-Kategorieformulars und keine Änderung/Löschung der Quellanzeige.

## 1.1.1 – 2026-09-13

- Kategorie-Navigationsregression aus 1.1.0 behoben: Die Fill-Session wird nun über Kleinanzeigens separate Legacy-Kategorie-Seite `/p-kategorie-aendern.html` fortgeführt.
- Auf der Kategorie-Seite werden ausschließlich die echten sichtbaren Kleinanzeigen-Kategorielinks verwendet; direkte Leaf-ID `cat_<categoryId>` hat Vorrang, ansonsten wird der gespeicherte Kategoriepfad Ebene für Ebene durchlaufen.
- Nach Wahl einer Parent-Kategorie wird auf die nächste sichtbare Unterkategorie bzw. einen DOM-/Seitenwechsel gewartet; nach Wahl der Leaf-Kategorie übernimmt Kleinanzeigen selbst die Navigation zurück zu Schritt 2.
- Zurück auf `/p-anzeige-aufgeben-schritt2.html` wird die erwartete `categoryId` bestätigt, bevor dynamische Kategorie-Merkmale, Versand, Preis und Bilder gesetzt werden.
- Die tabgebundene Fill-Session bleibt während des gesamten `Schritt 2 → Kategorieauswahl → Schritt 2`-Lifecycles aktiv; Statusstufen machen Parent-/Leaf-Auswahl diagnostizierbar.
- Sicherheitsgrenze unverändert: keine automatische Veröffentlichung, kein `submit()`/`requestSubmit()`, keine programmgesteuerte Übermittlung des Legacy-Kategorieformulars und keine Änderung/Löschung der Quellanzeige.

## 1.1.0 – 2026-09-13

- Im Inventar neue Aktion **„Als neue Anzeige verwenden“** für vollständig bestätigte Vorlagen ergänzt.
- Öffnet kontrolliert einen neuen Tab mit `https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html` und bindet die Vorlage tab-spezifisch an eine temporäre Fill-Session.
- Befüllung orientiert sich am gleichen `PostListingForm` wie die Bearbeiten-Seite: Anzeigenart und Titel, echte Kategorieauswahl, danach dynamische Kategorieattribute anhand technischer Keys/Werte und aktuell sichtbarer Optionen.
- Beschreibung, Preis, Preistyp, Versand/Paketgröße, Direkt-kaufen-Zustand soweit verfügbar sowie Standort-/Adresssichtbarkeit werden übernommen und anschließend verifiziert.
- Versand-Paketgröße wird generisch aus den gespeicherten Versandmethoden-IDs gegen den aktuellen `availableShippingOptions`-Katalog des Ziel-Formulars bestimmt; nicht eindeutige oder nicht mehr verfügbare Werte werden gemeldet statt geraten.
- Lokal gespeicherte JPEGs werden aus IndexedDB in begrenzten Datenblöcken an genau den gebundenen Ziel-Tab übertragen, dort als echte `File`-Objekte rekonstruiert und über Kleinanzeigens vorhandenen Mehrfach-Dateiupload in gespeicherter Reihenfolge hochgeladen.
- In-Page-Status zeigt Erfolg oder konkrete Soll/Ist-Abweichungen; Abschluss wird zusätzlich diagnostisch als `TEMPLATE_FILL_FINISHED` protokolliert.
- Sicherheitsgrenze: keine automatische Veröffentlichung, kein `submit()`/`requestSubmit()`, kein Klick auf „Anzeige aufgeben“, keine Änderung/Löschung der Quellanzeige. CSRF-/Tracking-/Session-Werte und Marketing-Opt-ins werden nicht aus dem Inventar übertragen.
- Feste Extension-ID und bestehende v0.1.7-Inventarisierungs-/Bildlogik bleiben erhalten.

## 0.1.7 – 2026-09-13

- Reale `PostListingForm`-Props der Bearbeiten-Seite als primäre strukturierte Quelle für Kategorie-Metadaten, ausgewählte technische Werte und explizite Großbild-URLs eingebunden; DOM-Auswertung bleibt Gegenprüfung/Fallback.
- Kategoriepfad wird aus `category.parentName` + `category.name` übernommen; dynamische Merkmale werden aus den kategorieabhängigen Definitionen generisch mit den tatsächlich ausgewählten technischen Werten zusammengeführt. Vollständige Optionslisten werden nicht pro Anzeige persistiert; gespeichert werden ausgewählter technischer/sichtbarer Wert sowie relevante Feldmetadaten und Optionsanzahl.
- Sichtwerte ignorieren Screenreader-/Hidden-Texte. Dadurch wird z. B. `like_new` sauber als `Sehr Gut` statt `Zustand auswählenSehr Gut` inventarisiert.
- Native `role="radiogroup"`-Fieldsets mit echten Radio-Inputs werden nur noch als Strukturcontainer behandelt. Die falschen Warnungen für Gebot/Gesuch, Versand und Direkt kaufen entfallen.
- Versandmethoden können über den strukturierten Optionskatalog anhand ihrer IDs benannt werden; bisherige DOM-Zuordnung bleibt Fallback.
- `adData.images[].dynamicRuleXXLargeUrl` wird per stabiler Bild-UUID mit der Galerie verknüpft und als bevorzugte, exakt abzurufende große JPEG-Quelle verwendet. Der bewährte `$_57.JPG`-Rewrite bleibt nur Fallback. JPEG-Signatur-, Dekodier-, Großbild- und atomare Rollback-Prüfungen bleiben unverändert.
- Formular-/Bilddiagnose zeigt nur eine datensparsame Zusammenfassung der strukturierten Quelle; signierte Bild-Queryparameter und persönliche Standort-/Kontaktwerte bleiben redigiert.
- Keine Veröffentlichung, kein Löschen und keine automatische Formularbefüllung hinzugefügt.

## 0.1.6 – 2026-09-13

- Großbild-Abrufregression aus 0.1.5 korrigiert: Für strikt verifizierte Kleinanzeigen-CDN-Pfade `https://img.kleinanzeigen.de/api/v1/prod-ads/images/<UUID>` wird wieder zuerst die bewährte JPEG-Variante `rule=$_57.JPG` versucht, auch wenn die Hidden-`adImages[n].url`-Quelle keinen sichtbaren `rule`-Parameter enthält.
- Das Rewrite ist bewusst auf den vertrauenswürdigen `prod-ads/images/<UUID>`-Endpunkt begrenzt; andere CDN-Pfade ohne vorhandenen `rule`-Parameter werden nicht verändert.
- Signierte Query-Parameter der realen Hidden-Quelle bleiben beim Großbildkandidaten erhalten.
- Strikte JPEG-Signaturprüfung, Dekodierung, Großbildprüfung gegen die Thumbnail-Geometrie, stabile Bild-UUID, Reihenfolge/Titelbild und atomarer Rollback bleiben unverändert.
- Keine Änderungen an Formularmodell, Veröffentlichung oder Löschlogik.

## 0.1.5 – 2026-09-13

- Kategorieabhängige `attributeMap[...]`-Merkmale generisch mit sichtbaren Controls zu einem kanonischen Datenmodell zusammengeführt.
- Technische Identität, technischer Wert, Label, sichtbarer Wert, Control-Typ, Status und verfügbare Optionen pro dynamischem Merkmal gespeichert.
- Doppelte False-Positive-Warnungen für Container/Custom-Controls beseitigt; nur vorlagenrelevante Lücken blockieren die Vollständigkeit.
- `priceType`, `addressVisibility`, `locationId`, `buyNowEligible`, `posterType` und Versandmethoden gezielt klassifiziert.
- Stabile Bild-UUID aus dem Kleinanzeigen-CDN-Pfad als `imageId`; signierte Query-Parameter nicht mehr Teil der Bildidentität.
- Versteckte `adImages[n].url`-Quellen mit Galeriebildern verknüpft und als bevorzugte Quelle für große JPEGs verwendet.
- Thumbnail-Größe wird gegen die dekodierte lokale JPEG-Datei geprüft; reine 96×96-Bilder werden nicht als Großbild akzeptiert.
- Reihenfolge und Titelbildposition gespeichert; Diagnose-URLs redigiert und Kontakt-/Standortwerte in kopierbaren Formulardiagnosen maskiert.
- Fester Manifest-Key, atomarer Commit und rein lokale Inventarisierung ohne Veröffentlichung/Löschung beibehalten.

## 0.1.4 – 2026-09-13

- Eigene Erfassung für bestehende Anzeigen im Bearbeiten-Formular.
- Dynamische Felder einschließlich technischer Werte, Labels und Zustand inventarisieren.
- Formular-/Bilddiagnose für nicht erkannte Komponenten.
- Bilder aus Upload-Containern auswählen und nur als geprüfte dekodierbare JPEGs übernehmen.
- Fehlende JPEGs und unsichere Bildauswahl erhalten den bisherigen Bestand.
- Formulartests und strikte JPEG-Fehlerpfadtests ergänzt.
- Fester Manifest-Key und atomarer Datenbank-Commit beibehalten.

## 0.1.3 – 2026-09-13

- Beschreibung aus dem eigentlichen DOM-Bereich priorisieren.
- Zeilenumbrüche, Leerzeilen und Absätze statt Whitespace-Zusammenziehung erhalten.
- BR-/Blockgrenzen verhindern zusammengezogene Wörter.
- Herkunft und Zeilenumbruchanzahl als Extraktionsmetadaten speichern.
- Ersatzquellen kennzeichnen, sieben Beschreibungstests ergänzen.
- Bildlogik, Oberfläche, Manifest-Key und Datenbankschema unverändert.

## 0.1.2 – 2026-09-13

- Bildsuche auf zuordenbare Galerie oder passende JSON-LD-Anzeige begrenzt.
- Auslieferungsvarianten nach CDN-Pfad und Identitätsparametern zusammengeführt.
- Alle gespeicherten Bilder mit Nummer, MIME-Format und Dateigröße sichtbar.
- Dateisignaturprüfung für JPEG, PNG, GIF, WebP und AVIF; Original-AUTO bleibt unbekannt.
- Kopierbare, begrenzte DOM-Bilddiagnose auch ohne erfolgreiche Inventarisierung.
- 25-zu-5-Regressionsfall, Quellenauswahl, Format- und UI-Tests ergänzt.
- Bestehende Inventare werden erst bei erneuter erfolgreicher Inventarisierung korrigiert.
- Fester Manifest-Key und atomare Speicherung beibehalten.

## 0.1.1

- Bilder zunächst separat im Arbeitsspeicher sammeln.
- Bildbestand und Metadaten atomar übernehmen; Rollback bei Speicherfehlern.
- Leere Extraktion schützt vorhandene Bilder.
- Vorschau aus lokalen Blobs mit Freigabe der Objekt-URLs.
- Gleichzeitige Speicherdurchläufe verhindern.
- Download-Zeitlimit und Speichergrenzen; Diagnosefehler beeinflussen Commit-Erfolg nicht.
- Feste Extension-ID und Datenbankschema 1 bleiben erhalten.
- Speicherregressionen und deterministisches Packaging hinzugefügt.

## 0.1.0 – 2026-09-12

- Initiale kanonische Chrome-MV3-Basis angelegt.
- Feste Entwicklungs-ID `hafahjhhgiipdegfkgacchmnacgblnah` verankert.
- Einzel-Inventarisierung eigener geöffneter Anzeigen implementiert.
- Lokale Bildarchivierung mit bevorzugter JPEG-CDN-Variante implementiert.
- Inventarübersicht und kompakte Diagnosehistorie implementiert.
- Login- und Eigentümersignale als Voraussetzung für die Inventarisierung eingebaut.
- Keine Veröffentlichung, Löschung oder Speicherung von Zugangsdaten.
## 1.23.1

- EPIC-REF-002: Renewal-Workflow-Orchestrierung aus `background.js` nach `renewal-workflow-controller.js` extrahiert.
- Der Controller übernimmt Skeleton/Persistenz/Feedback, Fast-/Safe-Verifikation, Retry, Publish-Bestätigung, automatische Replacement-Orchestrierung, Checkout-Recovery und Resume.
- `background.js` bleibt Service-Worker-Router/Lifecycle-Grenze; globaler account-unabhängiger Emergency Reset bleibt dort.
- Keine neue Chrome-Runtime-/Tab-/Message-/IPC-Grenze; Controller-Aufrufe bleiben in-process über `KRDeps`.
- Neue v1.23.1 Characterization-, Modularisierungs- und Runtime-Verträge.


### v1.23.10 Release-/Stream-Härtung
- Lange Release-Pipelines können jetzt über `scripts/release-supervisor.sh` detached vom Chat-/Tool-Stream gestartet werden; Supervisor-PID, RC, Wall-Clock und Log bleiben persistent.
- Vor dem langen Release-Lauf wird ein exakter `source-before-release`-Checkpoint erzeugt. Ein alter `RELEASE_GREEN` wird bei neuem Source-Stand entfernt und der Stage-State auf `source-dirty` gesetzt.
- Status-Polls sind ausdrücklich kurz und nicht blockierend; ein `STREAM_TIMEOUT` wird getrennt von Gate-/Buildfehlern behandelt und erst anhand von PID/RC/Stage/Log klassifiziert.
- Diese Regeln sowie der spätestens ungefähr fünfminütige sichtbare Europe/Berlin-Heartbeat werden in Handover und Initial-Prompt fortgeschrieben.

## 1.23.16
- Bulk Worker und Reconciliation in eigene in-process Services extrahiert.
- Archive Recovery und Verification/Promotion getrennt.
- Mass-Renewal-Watchdog separat; globaler Emergency Reset als expliziter Safety-Controller.
- Keine neue Runtime-/IPC-Grenze; Safety-/Tombstone-Semantik unverändert.

## 1.23.20

- Finaler v1.23.x-Closure-Build: Runtime-Code bleibt byteidentisch zu v1.23.19; Coverage-/Architecture-/Safety-/Reproduzierbarkeits-Gates werden erneut vollständig erzwungen.
- Nach technischem RELEASE_GREEN ist der native Gesamt-Soak inklusive verbindlichem realen 3er-Performance-Lauf (5/11/20 Bilder) durchzuführen.
