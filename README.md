## v1.23.22 – Title Field Stabilization Correction

v1.23.22 behebt einen real beobachteten flüchtigen Titel-Fill-Fehler in Massen-Renewals. Der Titel wird nach dem Setzen bounded zurückgelesen, bei einem Controlled-Input-/DOM-Reset erneut exakt gesetzt und vor der finalen Verifikation nochmals stabilisiert. Die Verifikation arbeitet dabei gegen das aufgelöste aktive Inserierformular. Exakte Gleichheit und fail-closed Safety bleiben unverändert; es gibt keinen Publish-Bypass und keine neue IPC-Grenze.

## v1.23.20_c1 – stale terminal Mass-Renewal Rehydration Correction

Der finale v1.23.20-Native-Smoke fand vor dem Start des 3er-Performance-Laufs einen UI-State-Bug: Ein lokaler Selection-/Order-Draft konnte beim Zurückkehren zur App durch den zuletzt persistierten historischen terminalen Mass-Batch ersetzt werden. v1.23.20_c1 schützt automatische Startup-/Actions-/Visibility-/Storage-Rehydration vor solchen fremden terminalen Snapshots. Der Abschluss derselben tatsächlich laufenden Batch-ID wird weiterhin automatisch übernommen. Der Performance-Lauf bleibt auf `fast` mit 5/11/20 Bildern verpflichtend und wird erst nach diesem Correction-Smoke durchgeführt. Der Release-Report speichert Public-API-Ausführung außerdem deterministisch als 0/1-Evidenz statt als laufabhängige rohe V8-Aufrufszähler; dies ändert keine Runtime-Semantik.

## v1.23.19 – Architektur-/Coverage-Closure

Die Refactoring-Serie ist architektonisch geschlossen: sämtliche Runtime-Module wurden auf echte Public Contracts geprüft, unnötige Exporte privatisiert und ein totes Modul entfernt. 805/805 verbleibende implementierte Public Functions werden dynamisch ausgeführt. V8-basierte Line-/Branch-Coverage ist als Gold-Baseline mit No-Regression-Gate etabliert. Die Runtime ist vollständig erreichbar und der KRDeps-Graph enthält keine fehlenden Provider oder Zyklen. v1.23.20 bleibt der finale Gesamt-Soak inklusive realem 3er-Performance-Lauf.

## v1.23.18 – Inventory Runner modularisiert

Der My-Ads/Inventory-Content-Runner ist in Roster/Parser, Readiness, Status/Failure-Overlay, Delete/Verification und Bulk/Reconciliation-Run-Loop getrennt. `inventory-runner.js` bleibt die kompatible KRInventoryRun-Facade. Alle 28 neuen Modul-Public-Methods werden dynamisch contract-orientiert ausgeführt; Safety-Negativpfade bleiben fail-closed. Keine neue Runtime-/IPC-Grenze. Nächster planmäßiger Schritt: v1.23.19 Architektur-/Cleanup-/Coverage-Closure.

## v1.23.17_c3 – Content-Rebootstrap-Härtung

Der bestehende manifestseitige und dynamische Content-Bootstrap kann bei bereits offenen Kleinanzeigen-Tabs zeitlich überlappen. Die fünf Shared-/Content-Module, die bislang keine eigene Same-Document-Reentry-Absicherung hatten, verwenden bei erneuter Ausführung jetzt ihre bereits registrierte KRDeps-API weiter. Die zentrale Dependency Registry bleibt absichtlich strikt; echte gleichnamige Konflikte werden nicht toleriert. Es gibt keinen Seiten-Reload, kein Polling, keinen neuen Message-Contract und keine neue Runtime-/IPC-Grenze.

# v1.23.17_c2 – Trash-Template Modal-Reopen Correction

Die Recovery-/Status-Aktion eines bereits vorbereiteten Papierkorb-Templates öffnet den Statusdialog wieder, statt bei noch vorhandenem Zieltab ausschließlich dorthin zu fokussieren. Der Zieltab wird nun nur über die separate Modal-Aktion **„Anzeige prüfen“** fokussiert. Target-Loss, Restart, manuelle Veröffentlichung und alle Publish-Safety-Grenzen bleiben unverändert fail-closed.

## v1.23.17_c1 – Public-API-Closure

Diese Correction privatisiert den unnötigen Export `verifyTemplate()` im Verification-Modul und schließt die dynamische Public-API-Testabdeckung der fünf in v1.23.17 extrahierten Template-Filler-Module. Nach dem Audit verbleiben 28 echte Public Methods; alle 28 werden dynamisch ausgeführt. Für v1.23.19 ist derselbe Public-vs-Private-Audit für sämtliche Runtime-Module verbindlich.

## v1.23.17 – Template Filler modularisiert

Regulärer Refactoring-Build auf Basis von v1.23.16_c2. Der bisherige `src/content/template-filler.js` wird entlang fachlicher Grenzen in fünf über `KRDeps` komponierte Content-Module zerlegt: Kategoriefluss, Formularfelder/Merkmale, Bild-Upload/Preview-Stabilität, Verifikation und Publish/Paid-Insertion. Der verbleibende Template Filler orchestriert Session-/Page-Lifecycle und UI-Feedback. Es entsteht keine neue Chrome-/Message-/IPC-Grenze; Publish-Safety und der c2-Target-Loss-Recovery bleiben unverändert. Nächster planmäßiger Build ist v1.23.18 – Inventory Runner modularisieren.

## v1.23.16_c2 – Live-Recovery bei geschlossenem vorbereiteten Tab

Correction-Patch auf Basis von v1.23.16_c1. Wird der getrackte Kleinanzeigen-Zieltab geschlossen, während das Modal „Anzeige ist vorbereitet“ bereits offen ist, wechselt genau dieses Modal jetzt sofort über den bestehenden `chrome.tabs.onRemoved`-Pfad in den Zustand „Vorbereiteter Tab wurde geschlossen“. Kein Polling, kein neuer Message-Typ und keine neue Runtime-/IPC-Grenze. Der c1-Recovery „Anzeige neu vorbereiten“ bleibt unverändert fail-closed: kein Auto-Publish, alter Fill nur nach Background-bestätigtem Target-Loss superseded, kein automatisches Rebind eines wiederhergestellten Tabs. Technische Manifest-Version bleibt 1.23.16, sichtbare Version/Artefakte sind 1.23.16_c2. Der reguläre nächste Refactor bleibt v1.23.17.

## v1.23.16_c1 – Recovery bei geschlossenem Papierkorb-Template-Tab

Correction-Patch auf Basis der technisch RELEASE_GREEN v1.23.16. Wird der fertig vorbereitete Kleinanzeigen-Zieltab eines Papierkorb-Template-Vorgangs geschlossen, zeigt der Manager beim Wiederöffnen des Status jetzt einen expliziten Recovery-Zustand statt weiterhin „Anzeige ist vorbereitet“. „Anzeige neu vorbereiten“ öffnet bewusst einen neuen Zieltab; veröffentlicht wird weiterhin nichts automatisch. Der Background supersediert den alten Fill nur, wenn er selbst bestätigt, dass genau dessen gespeicherte `targetTabId` nicht mehr existiert. Ein wiederhergestellter oder anderer Tab wird nicht allein anhand seiner URL automatisch übernommen. Technische Manifest-Version bleibt 1.23.16, sichtbare Version/Artefakte sind 1.23.16_c1. Der reguläre nächste Refactor bleibt v1.23.17.

## v1.23.15 – Renewal Workflow Controller zerlegt

Auf der nativ grünen v1.23.14-Basis sind Fast-Verifikation, Safe-Reinventarisierung und Paid-/Checkout-Recovery in drei kleine fachliche in-process Owner extrahiert. Der Controller bleibt für Skeleton/Persistenz, Retry, Publish, Auto-Replacement und Resume autoritativ. Die Ports werden explizit komponiert; keine zusätzliche Runtime-/IPC-Grenze. Der reale 3er-Performance-Lauf bleibt v1.23.20 vorbehalten.

## v1.23.14 – Inventory-/Trash-Rendering + Backup/UI-Trennung

Refactoring-Build auf der technisch und nativ grünen v1.23.13_c2-Basis. Inventory- und Trash-Karten besitzen getrennte Renderer; echte gemeinsame Card-Primitiven liegen in `record-card-view.js`. Archive-Insertion-UI und Trash-Template-UI sind getrennte Owner, während die bisherige kombinierte Fassade nur noch in-process komponiert. Der Profil-Backup-Controller delegiert IndexedDB-Snapshot/Restore an `profile-backup-storage-service.js`. Fachliche Workflows, Account-/Profil-Safety, Publish-/Delete-Safety und IPC-Grenzen bleiben unverändert. Nächster regulärer Build ist v1.23.15.

## v1.23.13_c2 – Inventory-Reentry trotz konkurrierender Meldung

Correction-Build auf Basis von v1.23.13_c1. Der laufende Inventory-Capture wird nach App-Neustart weiterhin korrekt rehydriert; zusätzlich bleibt der kompakte „Fortschritt anzeigen“-Einstieg jetzt sichtbar, auch wenn gleichzeitig eine andere aktive Meldung wie „Vorlagen-Inserat ist vorbereitet“ den aktuellen Activity-Slot belegt. Die Shortcut-Sichtbarkeit bleibt beim Capture-Controller, Bulk-Status und Shortcut verwenden getrennte Activity-Identitäten. Technische Manifest-Version bleibt 1.23.13, sichtbare Version ist 1.23.13_c2. Der reguläre Refactorplan setzt danach mit v1.23.14 fort. Das packaged Browser-E2E `bulk-runtime-lease-recovery` wartet außerdem explizit auf einen neuen Service-Worker-/Background-Epoch, bevor der Recovery-State geprüft wird; dies härtet nur den Test-Harness gegen eine nachgewiesene Timing-Flake und ändert keine Produkt-Runtime-Semantik.

## v1.23.13_c1 – Bulk-Capture-Reentry nach App-Neustart

Correction-Build auf Basis von v1.23.13. Ein laufender Bulk-Inventurlauf wird nach Schließen und erneutem Öffnen der Manager-App wieder lokal in den bestehenden Inventory-Capture-Progress gebunden. Der Reentry verwendet denselben Run und startet keinen zweiten Workflow. Technische Manifest-Version bleibt 1.23.13, sichtbare Version ist 1.23.13_c1. Der reguläre Refactorplan setzt danach mit v1.23.14 fort.

## v1.23.13 – Inventory Capture intern zerlegt

**Aktueller Stand:** v1.23.13 basiert auf der technisch und nativ grünen v1.23.12_c1. `inventory-capture-view.js` übernimmt die reine Darstellung des Erfassungsdialogs, `inventory-candidate-model.js` die pure Kandidaten-/Membership-Logik. `inventory-capture-controller.js` behält die autoritative Lifecycle-Ownership für Single/Bulk, Stop-after-current und Reentry. Es entsteht keine neue Runtime-/IPC-Grenze. Nächster regulärer Refactoring-Build ist v1.23.14.

## v1.23.12 – Composition Roots & Routing Cleanup

**Aktueller Correction-Stand:** v1.23.12_c1 behebt ausschließlich den nativen Bulk-Erfassungs-Wiringfehler `normalizeInventoryScope is not defined`; der reguläre nächste Refactoring-Build bleibt v1.23.13.


v1.23.12 setzt die nativ grüne v1.23.11-Basis fort. `app-elements.js` übernimmt die 233 Top-Level-DOM-Bindings, `profile-account-ui-controller.js` bündelt Account-Gate-/Profil-Präsentation, `background-message-router.js` besitzt die explizite 82-Typen-Routentabelle und `shared/renewal-policy.js` zentralisiert Safe/Fast- und Attempts-Policy. Die belegten Account/Profile-Compatibility-Mirrors wurden entfernt; `accountGateState` bleibt autoritativ. Es entsteht keine neue Runtime-/IPC-Grenze.

Während laufender Builds werden wichtige GREEN-Meilensteine zusätzlich extern hashverifiziert gesichert, damit ein vollständiger Sandbox-/Runtime-Wechsel keine Zwischenbytes verliert. Nach vollständig verifiziertem `RELEASE_GREEN` werden diese Zwischenstände nicht mehr benötigt; die finalen Release-Artefakte bilden dann die Recovery-Authority. Der reale 3er-Performance-Lauf bleibt für v1.23.20 reserviert.

## v1.23.8 – Account Session Controller + Profile Management Controller

v1.23.8 setzt EPIC-REF-002 auf der nativ grünen v1.23.7-Basis fort. Account-Session-/Live-Account-Binding und Profilverwaltung werden aus `background.js` in die in-process Controller `src/background/controllers/account-session-controller.js` und `src/background/controllers/profile-management-controller.js` verschoben. Profilwahl, Backup-/Restore-Safety, Profil-Löschung, Legacy-Zuordnung, Live-Account-Probe und fail-closed Account-Binding bleiben fachlich unverändert. Es wird keine neue Runtime-/IPC-Grenze eingeführt. Der gehärtete `release-finalize`-Gate aus v1.23.7 bleibt verbindlich.

## v1.23.7 – Diagnostic Export Service + organisierte Source-Struktur

Der Diagnoseexport wird jetzt durch `src/background/services/diagnostic-export-service.js` aufgebaut; der Service Worker delegiert weiterhin innerhalb derselben Runtime über `KRDeps`. Gleichzeitig wurden alle bisherigen Root-JavaScript-Dateien fachlich unter `src/` organisiert. Manifest, HTML, dynamischer Content-Bootstrap, `importScripts()` und Packaging verwenden die neuen kanonischen Pfade; `scripts/source-layout.json` hält die Altpfad→Neupfad-Migration fest.

Die Packaging-Closure prüft zusätzlich die im Manifest und in HTML deklarierten Runtime-Skripte. Die Source-Reorganisation verändert keine fachliche Runtime-/IPC-Topologie und keine Publish-/Delete-/Account-/Profil-Safety-Grenze. Ab diesem Release wird die Release-Dokumentation nach den technischen Gates über einen kontrollierten `release-finalize`-Ablauf mit Stage-State und DONE-Sentinel abgeschlossen.

## v1.23.6 – Bulk + Public Listing Evidence

Der Bulk-Inventarisierungsworkflow liegt nun vollständig im `bulk-inventory-controller.js`; wiederverwendete öffentliche Anzeigen-/Datums-Evidenz lebt in `public-listing-evidence-service.js`. `background.js` bleibt Router/Lifecycle-Grenze. Die Template-Fill-Recovery-Kachel verwendet zustandsabhängige Aktionen und fokussiert bei `template-only-complete` nach Möglichkeit den bestehenden Kleinanzeigen-Tab.

## v1.23.0 – EPIC-REF-002 Baseline und Characterization

v1.23.0 eröffnet die zweite vollständige Modularisierungswelle für die verbliebenen Verantwortungen in `app.js` und `background.js`. Dieser Baseline-Release verschiebt noch keine Produktlogik. Stattdessen friert er das aktuelle Verhalten über versionsübergreifende Characterization-Tests ein und dokumentiert alle 14 vorgesehenen Ownership-Extraktionen in `architecture-baseline-v1.23.0.json`.

Dauerhafte 1.23.x-Regel: Eine Modularisierung darf **keine neue Chrome-Runtime-, Tab-, Message- oder IPC-Grenze** allein wegen der Dateiaufteilung erzeugen. `app.js` bleibt UI-Entry-Point; `background.js` bleibt Service-Worker-Router und Lifecycle-Grenze; Fachlogik wandert nur in In-Process-JavaScript-Module über `KRDeps`.

Der reale 3er-Performance-Smoke auf dem langsamen Rechner wird nicht pro Patch verbraucht. Pflicht-Gate ist v1.23.20; ein Zwischenlauf erfolgt nur bei konkretem Performanceverdacht. Automatisierte Hot-Path-, Message-, Storage-, Retry-, Safety- und Browser-E2E-Gates laufen weiterhin pro Release.

Aktualisierter Verlauf: v1.23.1 Renewal Workflow (Chrome-Release verworfen), v1.23.2 Packaging-Correction, v1.23.3 Mass Renewal Workflow, v1.23.4 Template Fill + Insertion Lock, v1.23.5 Archive Insertion, v1.23.6 Bulk + Public Listing Evidence, v1.23.7 Diagnostic Export, v1.23.8 Account/Profile, v1.23.10 UI-Restkomponenten, v1.23.10 Capture-Grenze, v1.23.11 Facade-/Dead-Code-Cleanup, v1.23.12 Composition Roots & Routing Cleanup, v1.23.13–v1.23.19 weitere Refactorings, v1.23.20 Gesamt-Soak/Performance-Gate.

## v1.22.30 – account-unabhängiger lokaler Emergency Reset

`Alle Prozesse abbrechen` benötigt kein bestimmtes Kleinanzeigen-Konto und keine Remote-Verifikation. Der Manager kann lokale Einzel-/Massen-Renewals, Inventuren, Profiltransfers, Insertion- und Worker-Zustände terminalisieren und seine globalen Locks freigeben, selbst wenn das ursprüngliche Konto nicht mehr erreichbar ist.

Hat ein betroffener Datensatz bereits eine mögliche Publish-/Remote-Grenze überschritten, wird ausdrücklich kein Remote-Erfolg behauptet: er bleibt lokal `cancelled / emergency-reset-unverified` und kann später separat read-only reconciled werden. Sichere Pre-Publish-Fälle werden ohne erfundene Remote-Unsicherheit beendet. Generation-Fences und Reset-Tombstones verhindern, dass parallele/stale Arbeit nach dem Reset wieder Remote-Delete oder alte Workflow-Zustände aktiviert.

Alle bisherigen Publish-, Account-/Profil-, Delete-/Replacement-, Captcha-/Rate-Limit- und Submit-Bypass-Sicherheitsgrenzen bleiben bestehen.

## v1.22.29 – verifizierte Recovery für abgebrochenen kostenpflichtigen Checkout

Ein historischer Renewal, der nach dem automatischen Publish-Klick nur den kostenpflichtigen Kleinanzeigen-Checkout erreicht hat, darf nur nach unabhängiger read-only Remote-Verifikation entsperrt werden. `newAdId=null` und der Checkout-Pfad allein reichen nicht. Die Extension öffnet dafür einen versteckten frischen „Meine Anzeigen“-Prüftab, liest den vollständigen Roster über alle Seiten und vergleicht ihn mit den lokal bereits vor dem Publish-Klick nachweisbaren Anzeigen-IDs des ursprünglich gebundenen Profils. Die Quellanzeige muss weiterhin vorhanden sein; falsches Konto, Count-Mismatch, fehlende Quellanzeige oder eine unbekannte Remote-ID blockieren die Recovery.

Bei bestätigter Evidenz wird ausschließlich der lokale Renewal als `cancelled / checkout-aborted-verified` abgeschlossen. Der Recovery-Pfad klickt weder Publish noch Zahlung noch Löschung und verändert keine Remote-Anzeige. Für einen Legacy-Fall muss bei der Prüfung das ursprünglich gebundene Kleinanzeigen-Konto angemeldet sein; andernfalls bleibt der Lock bewusst bestehen.

Release-Builds und lange Tests laufen weiterhin als kontrollierte Prozesse mit kurzen Statusabfragen; Browser-E2E bleibt im Supervisor-/Child-Prozessmodell.

## v1.22.28 – Legacy-Reset-Migration und transparenter Diagnose-Blocker

Ein alter `needs-review / manual-emergency-reset`-Renewal ohne nachweisbare Publish-Grenze wird beim Recovery lokal terminalisiert und hält keinen Inserierungs-Lock mehr. Post-Publish-Evidenz bleibt fail-closed gesperrt. Der Diagnosebereich nennt bei einem blockierten Reset den konkreten Workflow bzw. Inserierungs-Lock inklusive Owner und Status/Stage.

Release-Builds und lange Tests laufen kontrolliert mit kurzen Statusabfragen; Browser-E2E bleibt im Supervisor-/Child-Prozessmodell.

## v1.22.27 – Paid-Insertion Lock-Härtung und isolierter Browser-E2E-Supervisor

Ein vor der Veröffentlichung eindeutig erkanntes kostenpflichtiges Inserat ist terminal und blockiert keine weiteren Inserierungsaktionen mehr. Die Ausnahme gilt nur ohne Publish-Grenze (`newAdId`, `publishClickedAt`, `submitted`/`publish-submitted` usw.); Checkout-/Post-Publish-Zustände bleiben konservativ gesperrt. Der Notfall-Reset kann diesen sicheren lokalen Fall vollständig beenden, ohne die Quellanzeige auf Kleinanzeigen zu verändern.

Die Browser-E2E-Infrastruktur startet jedes der neun Szenarien separat über einen Supervisor. Dadurch kann ein Playwright-/Chromium-Cleanup-Hänger nur noch das betroffene Child treffen und blockiert nicht den restlichen Lauf. Der Report trennt fachlichen Szenariostatus und Cleanupstatus. Temporäre Chromium-Policy-Änderungen bleiben Aufgabe der äußeren Release-Orchestrierung und müssen immer per `try/finally`/Trap restauriert werden.

# Kleinanzeigen Renewal

## v1.23.3 – Mass Renewal Workflow Controller

Die Mass-Renewal-Orchestrierung ist in `mass-renewal-workflow-controller.js` ausgelagert. `mass-renewal-controller.js` bleibt für Batch-State/Persistenz zuständig; `background.js` bleibt Service-Worker-Entry-Point, Router und Lifecycle-Grenze. Die Modularisierung erzeugt keine zusätzliche Chrome-Runtime-/IPC-Grenze.


Aktueller Stand: **v1.23.7**. Dieser Stabilisierung-/Soak-Release behält das Message-Contract-Enforcement aus v1.22.25 und den dynamischen Bootstrap-Fix aus v1.22.25_c1 bei. Zusätzlich werden die bekannten Action-State-Desync-Fenster bei `insertion-lock-sync` und Bulk-Start über einen gemeinsamen autoritativen Inventory-Action-Sync geschlossen. Kostenpflichtige Inserate nach Erreichen des Kleinanzeigen-Anzeigenlimits werden bereits am sichtbaren Kostenbanner und als Fallback auf der Checkout-Seite erkannt; Auto-Publish stoppt fail-closed, „Mehrere neu inserieren“ hält kontrolliert an, und die Extension führt keinerlei Zahlungsaktion aus. Die Diagnoseausgabe `versionName` und der Registry-Snapshot bleiben erhalten.

# v1.22.23 Hotfix

Der Notfall-Reset synchronisiert nun nach erfolgreichem Backend-Reset auch den Trash-Template-Recovery-UI-Zustand. Die persistente „Vorgang fortsetzen“-Kachel wird entfernt; bei einem bewusst neu geöffneten, noch nicht gestarteten Draft bleibt dessen Dialog-Ownership unangetastet.

## v1.22.22

- Fix: „Laufende Vorgänge zurücksetzen“ beendet jetzt auch fachlich noch offene Trash-Template-Sessions in `complete / template-only-complete` und `complete / template-only-published` als `cancelled / manual-emergency-reset`; `template-only-inventoried`, `needs-review` und `error` bleiben terminal.
- Der Notfall-Reset bereinigt zugehörige kurzlebige Bildtransfer-Caches, verändert aber weder Inventar/Papierkorb/Bilder/Profile noch Remote-Anzeigen auf Kleinanzeigen.
- Architektur: `KRDeps` ist die einzige produktive Registry für KR-Modul-APIs; doppelte `globalThis.KR…`-/`root.KR…`-Publikationen und der Legacy-Fallback in `runtime-deps.js` sind entfernt.
- Runtime-Entrypoints verlangen `KRDeps` explizit/fail-fast; historische VM-Tests erhalten Legacy-Aliase ausschließlich über die testseitige Bridge.
- Die alte Managed-Worker-Storage-Fassade in `background.js` wurde entfernt; Safety-, Account-/Profil-, Publish-, Delete- und Replacement-Gates bleiben unverändert.

## v1.22.21

- Architektur: `remote-delete-replacement-service.js` übernimmt die bestehende Phase-4-Remote-Delete-/Replacement-Mechanik hinter expliziten Dependencies; `background.js` bleibt Router und Orchestrator.
- Safety: Der alte Anzeigen-Datensatz wird erst nach unabhängiger frischer Abwesenheitsverifikation als gelöscht behandelt; erst danach erfolgt die atomare lokale Candidate-Promotion inklusive Bilddaten.
- Die bestehenden Account-/Profil-/Own-Ad-/Publish-/Delete-Gates und die Remote-Mutationsgrenzen werden nicht abgeschwächt.
- Dauerhafte Architekturregel: `app.js` und `background.js` bleiben Orchestratoren; stateful Fachlogik und komplexe Workflows gehören in klar abgegrenzte Module mit expliziten Dependencies.

## v1.22.17

- Architektur: `renewal-state-repository.js` besitzt Renewal-Session-Persistenz, Retention sowie öffentliche/Insertion-Snapshots. Die getrennte A3a-Mutationsgrenze bleibt bewusst außerhalb dieses Refactoring-Schritts.
- Architektur: `template-fill-service.js` besitzt Template-Fill-Session-State, serialisierte Fill-Mutationen, Source-Readiness/Payload, Watchdog-Terminalisierung und den gebundenen Bildtransfer-Cache.
- Architektur: `archive-insertion-service.js` besitzt Archive-Insertion-Session-Persistenz, revisionsgeschützte Snapshots und Status-/Meta-Semantik; browser- und remote-nahe Insertion-Orchestrierung bleibt im Service Worker.
- Safety: Publish-/Delete-/Account-/Profil-/Insertion-Gates sowie Remote-Mutationsgrenzen bleiben im Orchestrator unverändert.

## v1.22.15

- Fix: Die Einzelinventur rendert den erfolgreichen Ergebnisdialog wieder zuverlässig; die abgeleitete Datums-Badge-Hilfe wird explizit aus dem Inventory-Render-Controller injiziert.
- Architektur: Mass-Renewal-Zustand/Mutation/Progress/Stop/Finalisierung liegt in `mass-renewal-controller.js`.
- Architektur: semantischer Renewal-Datensatz-/Bildvergleich und Verification-Outcomes liegen in `renewal-verification-service.js`; browsernahe Safe-/Fast-Verifikation und Lösch-/Publish-Safety bleiben im Service-Worker-Orchestrator.
- Safety-/Account-/Profil-/Remote-Mutationsgrenzen bleiben unverändert.

# Kleinanzeigen Renewal

Aktueller Stand: **v1.22.23_c2**. Correction-Build auf Basis v1.22.23 gegen das Wiederhochholen archivierter terminaler Bulk-Meldungen; Safety-Gates unverändert.

# Kleinanzeigen Renewal 1.22.11

## Version 1.22.11: Profile/Inventory/Trash Repositories und Services modularisiert

- Neue `profile-repository.js`, `inventory-repository.js`, `inventory-image-store.js` und `trash-service.js` übernehmen die persistente Profil-, Inventar-/Bild- und Papierkorb-Storage-Mechanik hinter `KRDeps`; `background.js` bleibt Service-Worker-Orchestrator für Workflow-, Account-/Profil- und Safety-Gates.
- `inventory-repository.js` besitzt IndexedDB-Schema/Connection, profilindizierte Reads, atomare Inventar-/Bild-Commits und Löschungen sowie Profilzuordnungs-Mutationen. Die bestehenden Hot-Paths bleiben erhalten: `profileId`-Index, `trashExpiresAt`-Index, wiederverwendete Shared-DB-Verbindung und cursorbasierter Legacy-Unassigned-Count.
- `trash-service.js` besitzt Retention-Schedule, Soft-Delete/Retention-Reset, endgültige lokale Löschung und Ablaufbereinigung; `inventory-image-store.js` besitzt lokale Bildreads und bildbezogene Cleanup-Operationen; `profile-repository.js` besitzt Profil-/Selected-/Active-Metadaten inklusive Import-Metadaten.
- Strikt test-first: 8/8 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.10 grün festgeschrieben und blieben nach dem Refactor SHA-256-identisch. Danach kamen 11/11 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Ein alter Hot-Path-Vertrag deckte während der Regression einen unbeabsichtigten Scan-Fallback in der ersten Refactor-Fassung auf; die Implementierung wurde korrigiert, sodass Trash-Expiry und Unassigned-Count die bisherigen indizierten/cursorbasierten Pfade beibehalten.
- Keine beabsichtigte fachliche Änderung: Insbesondere bleibt die bestehende Profil-Löschsemantik in v1.22.11 unverändert (Datensätze werden weiterhin zu „Nicht zugeordnet“). Die gewünschte künftige Semantik „Profil löschen = lokalen Profilbestand vollständig löschen, ZIP als Erhaltungsweg“ bleibt separater Backlogpunkt. Publish-/Delete-/Renewal-/Account-Safety bleibt unverändert; direkte `.submit()`/`requestSubmit()`-Bypässe bleiben ausgeschlossen.

## Version 1.22.10: Profile Backup + Inventory Render/Formatting modularisiert

- Neuer `profile-backup-controller.js`: besitzt Profil-Transfer-Lock, Native-Picker-Zustand, Export/Import, profilbezogene IndexedDB-Snapshots sowie den atomaren Inventar-/Bild-Replace mit Rollback-Schutz. `app.js` behält die workflowgebundenen Start-Blocker und dünne Orchestrierungsfassaden.
- Neuer `inventory-formatting.js`: bündelt die Inventar-/Papierkorb-spezifische Preis-, Kategorie-, Datums-, Renewal- und Retention-Präsentationssemantik hinter `KRDeps`.
- Neuer `inventory-render-controller.js`: besitzt detaillierte und kompakte Inventar-/Papierkorb-Darstellung einschließlich Karten-/Zeilenaktionen, Lazy-Details, Bildstreifen, ZIP-Aktionen und Render-Kontext. Account-/Profil-/Workflow-Gates bleiben injizierte Orchestrator-Abhängigkeiten.
- Strikt test-first: 9/9 Characterization- und 6/6 Runtime-Checks wurden auf unverändertem v1.22.9 vor dem Refactor grün festgeschrieben; beide Pre-Refactor-Testdateien sind nach dem Umbau SHA-256-identisch. Danach kamen 10/10 Ownership-/Architektur- und 4/4 Runtime-Modultests hinzu.
- Historische lexikalische Verträge wurden ausschließlich hinsichtlich der neuen Implementierungsorte auf eine test-only zusammengesetzte Source-Surface umgestellt; fachliche und Safety-Assertions wurden nicht gelockert.
- Keine fachliche Workflow-, Publish-, Delete-, Account-, Renewal-, Trash- oder Backup-Semantik bewusst geändert. v1.21.15 bleibt unveränderliches Gold-Release; `UI_ACTIONS_*` und `UI_SIDEBAR_*` bleiben aktiv.

## Version 1.22.9: Mass-Renewal UI und Archive-/Trash-Insertion UI modularisiert

- `mass-renewal-ui-controller.js` besitzt jetzt den zustandsbehafteten Mehrfach-Neuinserat-Dialog: Auswahl, Reihenfolge, Fortschritt, Summary, Retry und kontrollierten Stop.
- `archive-trash-insertion-ui-controller.js` besitzt ZIP-/Archive-Insertion-UI und Trash-Template-UI einschließlich Validierung, Fortschritt und manueller Erfassungsfreigabe.
- `app.js` bleibt Orchestrator und behält Storage-/Image-Staging, Account-/Profilbindung sowie die eigentlichen Workflow-Startbrücken.
- Die Extraktion wurde strikt test-first durchgeführt: 8/8 Characterization + 5/5 Runtime auf unverändertem v1.22.8 vor dem Refactor; dieselben Tests unverändert danach erneut grün.
- Keine fachliche oder Safety-Semantik wurde bewusst verändert. v1.21.15 bleibt unveränderliches Gold-Release.

## Version 1.22.7: Layout-, Tab-Inspection- und Shared-UI-Grenzen modularisiert

- Die neue verbindliche **Test-vor-Refactoring-Regel** wurde erstmals vollständig angewendet: Testinventur → fehlende Characterization-/Runtime-Tests auf unverändertem v1.22.6 grün → Refactoring → dieselben Tests unverändert grün → Ownership-/Architekturtests → Vollregression/E2E.
- `app-layout-controller.js` besitzt jetzt Sticky-Header-Geometrie/Sync und die temporäre Bottom-of-page-`UI_SIDEBAR_*`-Diagnose.
- `tab-page-inspection-controller.js` besitzt Tab-Messaging, Content-Bootstrap-Recovery, Lifecycle-Klassifikation und die nutzerseitige Kleinanzeigen-Tab-Abfrage.
- `shared-ui-helpers.js` bündelt wiederverwendbare Preis-, Kategorie-, Datums- und kompakte Action-UI-Helfer.
- `app.js` bleibt Orchestrator und hält für bestehende Call-Sites bewusst dünne Fassaden. Keine Workflow-, Publish-, Delete-, Account-, Renewal- oder sonstige Safety-Semantik wurde geändert.


## Version 1.22.6: Diagnose- und Actions-Diagnose modularisiert

- `background.js` gibt den zustandsbehafteten Diagnose-Store an `diagnostics-service.js` ab. Session-Grenzen, Buffer/Flush, Cache, Retention, Aggregation, Redaction, Gallery-Diagnose und Reset-State liegen damit außerhalb des Service-Worker-Orchestrators.
- `app.js` gibt die ausführliche Actions-/UI-Stuck-Instrumentierung an `actions-diagnostics-controller.js` ab. Snapshots, Pointer-/Hit-Test-Diagnose, Desync-Erkennung, Background-Epoch, Resync und Karten-Interaktionsdiagnose besitzen jetzt einen eigenen Controller.
- Beide Module nutzen `KRDeps` und Dependency Injection; die bisherigen internen Aufrufer bleiben über dünne Fassaden kompatibel. Diagnoseevent-Namen und fachliche Semantik bleiben unverändert.
- Neue Architektur- und Runtime-Verträge sichern die Modulgrenzen sowie Diagnose-Aggregation/Redaction/Reset und Actions-Resync/Epoch-Verhalten.
- Keine Workflow-, Publish-, Delete-, Account-, Renewal-, ZIP- oder sonstige Safety-Semantik geändert. v1.21.15 bleibt unveränderliches Gold-Release.

## Version 1.22.5: erste inkrementelle Modularisierungswelle

- `app.js` gibt den zustandsbehafteten Meldungs-/Activity-Center-Bereich an `app-activity-center.js` ab. Persistenz, Retention, Priorisierung, Verlauf, Dismiss-Fingerprints und Rendering dieses Bereichs liegen damit in einem eigenen Controller; `app.js` behält nur dünne Fassaden und UI-Orchestrierung.
- `background.js` gibt die eventgetriebene Tab-Load-/Target-Navigation-Wartekoordination an `tab-load-coordinator.js` ab. Waiter-/Versions-Maps, Signal-Wakeup, Timing-/Timeout-Diagnose und target-bound Off-Target-Erkennung liegen damit außerhalb des Service-Worker-Monolithen.
- Beide Module werden über die in v1.22.4 eingeführte `KRDeps`-Grenze konsumiert und erhalten ihre Laufzeitabhängigkeiten explizit per Factory-/Dependency-Injection. Legacy-interne Funktionsnamen bleiben als dünne Fassaden erhalten, damit bestehende Call-Sites und Verhalten stabil bleiben.
- Die Extraktion ist bewusst die erste, kleine Welle: keine Big-Bang-Zerlegung, keine neue fachliche Funktion, keine Änderung an Publish-, Delete-, Account-, Renewal-, ZIP- oder Workflow-Safety.
- Neue statische und Runtime-Verträge prüfen die Modulgrenzen sowie Activity-Center- und Tab-Readiness-Semantik. Die reale Browser-/MV3-Suite bleibt Release-Gate. v1.21.15 bleibt unveränderliches Gold-Release.

## Version 1.22.4: explizite Runtime-Abhängigkeitsgrenze

- Neue kleine `runtime-deps.js`-Registry als zentrale Abhängigkeitsgrenze für App, Content-Scripts und Service Worker.
- `runtime-deps.js` wird in allen drei Runtime-Kontexten garantiert zuerst geladen: App-Scriptreihenfolge, Manifest-Content-Scripts, dynamischer Content-Bootstrap und Service-Worker-`importScripts`.
- Zentrale Verbraucher lesen Kernabhängigkeiten nicht mehr direkt über viele `globalThis.KR…`-Namen, sondern über `KRDeps.require(...)` bzw. für bewusst optionale Helper über `KRDeps.optional(...)`.
- Bestehende `KR…`-Globals bleiben in dieser inkrementellen Phase als unveränderte Kompatibilitäts-Aliase bestehen. Die Registry übernimmt sie beim ersten Zugriff lazy; dadurch mussten die stabilen Producer-Module nicht gleichzeitig refactort werden.
- Die Registry erkennt widersprüchliche Doppelregistrierungen, meldet fehlende strikte Abhängigkeiten eindeutig und hält registrierte Namen deterministisch.
- Keine fachliche Workflow-, UI-, Publish-, Delete-, Account- oder Renewal-Semantik geändert. Der strukturelle Actions-Fix und die Fokus-Modality bleiben unverändert. v1.21.15 bleibt das unveränderliche Gold-Release.

## Version 1.22.3: deterministische Fokus-Modality im Actions-Bereich

- Nach einer per Maus/Pointer ausgelösten Aktion zeigt der auslösende Button keinen persistenten Fokusrahmen mehr – weder den Chromium-UA-Rahmen noch den mintfarbenen Tastaturindikator. Das gilt auch nach einer späteren Fokus-Rückgabe aus einem Dialog.
- Der Actions-Bereich führt dafür explizit die letzte Eingabemodalität `pointer` oder `keyboard`. Tab bzw. Tastaturaktivierung schalten zuverlässig zurück auf Keyboard-Modality.
- Tastaturbedienung bleibt vollständig sichtbar: echter Keyboard-Fokus behält den 2-px-Mint-Rahmen. Es wird kein `blur()` eingesetzt.
- Der Browser-E2E-Test deckt Pointer-Klick, simulierte Fokus-Rückgabe und anschließende Tab-Navigation ab.
- Keine Workflow-, Account-, Renewal-, Delete-, ZIP- oder sonstige Safety-Grenze wurde verändert. v1.21.15 bleibt unveränderliches Gold-Release.

## Version 1.22.2: Fokusdarstellung und Safety-Dokumentation

- Action-Buttons zeigen nach einem normalen Mausklick keinen persistenten weißen Chromium-UA-Fokusrahmen mehr. Pointer-Fokus blendet nur den UA-Outline aus; echter Tastaturfokus bleibt mit einem expliziten mintfarbenen `:focus-visible`-Indikator sichtbar. Kein `blur()`-Workaround.
- Die Safety-Dokumentation wurde gegen den realen Runtime-Stand abgeglichen. `template-filler.js` dokumentiert jetzt korrekt, dass Template-only-Abläufe nicht automatisch veröffentlichen, während verifizierte Renewal-/ZIP-Insertion-Abläufe den finalen sichtbaren Publish-Button ausschließlich hinter dem bestehenden vollständigen Hard-Gate automatisch klicken dürfen. `.submit()`/`requestSubmit()` bleiben verboten.
- Historisch überholte globale Aussagen in der README wurden präzisiert: lokale Inventar-Löschaktionen verändern Kleinanzeigen nicht; der separat abgesicherte Renewal-Workflow kann dagegen nach verifizierter Neuerstellung die alte Quellanzeige entfernen. Ebenso bleibt manuelles/Template-only-Neuinserieren manuell, während der Renewal-Hard-Gate-Pfad seit v1.8.2 automatisches Veröffentlichen erlaubt.
- Keine Workflow-, Account-, Renewal-, Delete-, ZIP- oder sonstige Safety-Grenze wurde verändert. v1.21.15 bleibt unveränderliches Gold-Release.

## Version 1.22.1: Actions-Accordion Hit-Test-Fix

- **v1.21.15 bleibt unveränderliche Gold-Referenz.** v1.22.1 ist ein gezielter QoL-/Stabilitätspatch auf der v1.22.0-E2E-Basis.
- Der native Actions-Freeze wurde diagnostisch auf einen Hit-Test-/Rendering-State des nativen `<details>` eingegrenzt: Button-Geometrie und Enable-State waren korrekt, Chrome traf im eingefrorenen Zustand aber das übergeordnete `details#actionsAccordion`.
- Nur der Bereich **„Aktionen“** verwendet deshalb jetzt einen kontrollierten Accordion-Container mit normalem Button (`aria-expanded`, `aria-controls`) und explizitem Panel-State; Konfiguration und Diagnose bleiben unverändert.
- Bestehende Accordion-Animation, Single-Open-Verhalten, Watchdog/Sanitizer und die ausführliche `UI_ACTIONS_*`-Diagnose bleiben erhalten.
- Der echte Browser-E2E-Test prüft nach Rapid-Toggle zusätzlich, dass alle vier Action-Flächen im Chrome-Hit-Test tatsächlich ihre Buttons treffen und nicht den Accordion-Container.
- Keine fachliche Workflow-, Publish-, Delete-, Account- oder Renewal-Semantik wurde verändert.

## Version 1.21.15: Actions-Stuck-Hardening und UI-Feinschliff

- Die Actions-/UI-Stuck-Diagnose erfasst jetzt Pointer-Ereignisse auf Dokumentebene im gesamten geometrischen Actions-Bereich. Dadurch werden auch Klicks sichtbar, die wegen Overlay, Clipping oder Hit-Test-Problemen die eigentlichen Aktionsbuttons nie erreichen.
- Diagnoseeinträge enthalten Hit-Target und Hit-Stack, erwarteten Button, mögliche Overlay-Erkennung, Actions-/Panel-Geometrie, `overflow`, `pointer-events`, Accordion-`open`/`is-animating`, `scrollHeight`, Inline-Geometrie und Web-Animation-State.
- Actions-State-Snapshots enthalten den Accordion-Zustand, damit fachlich korrekte Button-States mit der tatsächlichen UI-Geometrie korreliert werden können.
- Accordion-Animationen besitzen einen Watchdog und eine defensive Sanierung auf Actions-Pointerdown, App-Focus, Visibility-Rückkehr und Actions-Re-Sync. Ein verwaister Animationszustand wird bereinigt und separat diagnostiziert.
- Accordion-Köpfe werden während einer Animation nicht mehr per `pointer-events:none` blockiert. Schnelle Gegenklicks verwenden den angeforderten Zielzustand und starten die Animation kontrolliert aus der aktuellen gemessenen Höhe neu.
- Im Papierkorb heißt das Datumsfeld jetzt kurz `Im Papierkorb`; Datum und Uhrzeit bleiben identisch.
- Die drei Schritt-Kacheln des Vorlagen-Neuinserierens nutzen die volle Dialogbreite als drei gleich große Spalten, sodass insbesondere Schritt 3 mehr Platz erhält.
- Die temporäre `UI_SIDEBAR_*`-Bottom-of-page-Diagnose bleibt bis zur erfolgreichen nativen Bottom-Clamp-Abnahme erhalten. Die erweiterte Actions-/UI-Stuck-Diagnose bleibt für die nächste Reproduktion aktiv.
- Alle Publish-, Account-, Renewal-, Delete-, ZIP- und sonstigen Safety-Gates bleiben unverändert.

## Version 1.21.14: Verständlichere UI-Texte und konsistente Papierkorb-Aktionen

- Der zentrale Einstieg und der Erfassungsdialog heißen jetzt `Anzeigen erfassen`; der Startbutton heißt `Erfassung starten`. Die bestehende, bewusst klar getrennte Auswahl `Nur neue Anzeigen erfassen` / `Gesamten Bestand neu einlesen` bleibt erhalten.
- Papierkorb-Texte verwenden eindeutige lokale Begriffe wie `Im Papierkorb seit` und erklären, dass der Papierkorb nur lokal wirkt: die Anzeige bei Kleinanzeigen bleibt unverändert, und neue Anzeigen werden nicht automatisch veröffentlicht.
- Detail- und Listenansicht des Papierkorbs verwenden dieselbe Reihenfolge: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Endgültig löschen`. Es wurde nur die Darstellung/Reihenfolge vereinheitlicht; die vorhandenen Aktionen und Safety-Gates bleiben identisch.
- Der Neu-Inserieren-Flow, Massen-Neuinserieren, Profil-Sicherung, Leerzustände, Suche, Online-Status, Sortiertexte und Prüfmodus-Beschreibungen verwenden verständlichere Endnutzerbegriffe. Die zweite interne Erfassungszählung heißt nun `Fortschritt X von 4`.
- Laufende Workflow-Dialoge weisen sichtbar darauf hin, dass der Vorgang nach dem Schließen des Fensters im Hintergrund weiterläuft. Vor dem Start wird `Abbrechen` statt `Schließen` verwendet.
- In der Diagnose heißt die Reset-Aktion `Diagnose zurücksetzen`; Download und Reset sind untereinander angeordnet.
- `UI_SIDEBAR_*` bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten. Keine Remote-, Publish-, Delete-, Renewal-, Account- oder Workflow-Safety-Semantik wurde geändert.

## Version 1.21.13: Papierkorb-Listenaktionen vervollständigt

- In der Listenansicht des Papierkorbs stehen jetzt zusätzlich `30 Tage neu starten` und `Als ZIP exportieren` als kompakte Icon-Aktionen zur Verfügung.
- Reihenfolge der Papierkorb-Listenaktionen: `Neu inserieren` → `30 Tage neu starten` → `Als ZIP exportieren` → `Entfernen`.
- `30 Tage neu starten` verwendet bewusst dasselbe Update-Symbol wie `Daten aktualisieren` in der Inventaransicht; der ZIP-Export verwendet das bestehende ZIP-/Archivsymbol.
- Beide Aktionen verwenden exakt die bereits vorhandene Papierkorb-Funktionalität (`RESET_TRASH_RETENTION` bzw. lokaler ZIP-Export) samt bestehender Bestätigung, Statusmeldungen und Diagnoseevents; keine Remote-/Safety-Semantik wurde geändert.
- `UI_SIDEBAR_*` bleibt bis zur nativen Bottom-Clamp-Abnahme aktiv; die ausführliche Actions-/UI-Stuck-Diagnose bleibt unverändert erhalten.

## Version 1.21.12: Sidebar-Bottom-Clamp, Refresh-Feedback und Erfassungs-Badges

- Der Sidebar-Höhenvertrag verwendet jetzt denselben dynamischen Sticky-Geometrie-Contract wie die Listensteuerung. `--app-shell-bottom-gap: 28px` steuert sowohl das untere App-Shell-Padding als auch die Mindesthöhe des linken Control-Panels. Dadurch bleibt vor der Unterkante des Sticky-Containing-Blocks eine kleine Sicherheitsreserve und der diagnostizierte ca. 5–5,8-px-Sprung am exakten Seitenende soll entfallen. Die temporäre `UI_SIDEBAR_*`-Bottom-Diagnose bleibt bis zur nativen Bestätigung aktiv.
- Der globale Aktualisieren-Button zeigt nun einen klaren Busy-/Success-Zustand: während des Refreshs rotiert das Symbol und der Button ist kurz deaktiviert; nach erfolgreichem Abschluss erscheint ca. 1,5 s ein Häkchen. Tooltip/ARIA heißen im Normalzustand „Ansicht und Kontostatus aktualisieren“ und während des Laufs „Wird aktualisiert …“. Kein künstliches UI-Flackern.
- Inventar- und Papierkorb-Bereichsüberschriften sind im normalen Desktoplayout einzeilig: `Gespeicherte Anzeigen · N Einträge` bzw. `Papierkorb · N Einträge`. Der Titel bleibt visuell führend, die Anzahl kleiner/gedeckter.
- Der Meldungsverlauf besitzt 2 px untere Innen-/Scrollreserve, damit die untere Border der letzten Kachel am maximalen Scrollstand nicht mehr an der Scrollport-Kante abgeschnitten wird.
- Im Dialog „Geöffnete Anzeige erfassen“ wird bei jedem Öffnen ein frischer, rein lokaler read-only Snapshot von aktivem Inventar und Papierkorb des ausgewählten Profils gelesen. Kandidaten mit stabiler `adId`, die in keinem der beiden lokalen Bereiche vorkommen, erhalten die Badge `NEU`; nur im Papierkorb vorhandene Anzeigen erhalten `PAPIERKORB`; bereits aktive oder unklare IDs werden nicht als neu markiert. Keine Remote-Navigation oder Inventaränderung.
- Die temporär ausführliche Actions-/UI-Stuck-Diagnose bleibt aktiv; Account-, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Grenzen bleiben unverändert.

## Version 1.21.11: globale Ansichtsauswahl und Sidebar-Ende-Diagnose

- Eine gemeinsame Ansichtsauswahl für Inventar und Papierkorb sitzt jetzt global im App-Header als 3er-Set `Kachelansicht | Listenansicht | Aktualisieren`. Die bisherigen Content-internen Umschalter entfallen.
- Der View-Modus wird unter `globalListViewModeV1` gemeinsam persistiert. Bestehende getrennte Inventar-/Papierkorb-Zustände werden einmalig migriert; bei widersprüchlichen Altwerten hat der bisherige Inventarzustand Vorrang, weil Inventar die Startansicht ist. Die Altkeys werden danach entfernt.
- Der Inventar-Tab besitzt nun wie der Papierkorb eine Anzahl-Badge mit dem aktuellen aktiven Inventarbestand.
- Der globale Kleinanzeigen-Kontostatus wurde gegenüber v1.21.10 um weitere 3 px nach oben verschoben.
- Für den noch offenen leichten Sprung des linken Inventarprofilbereichs exakt am Dokumentende wurde eine temporäre, auf die letzten 250 px fokussierte Diagnose ergänzt (`UI_SIDEBAR_*`). Sie protokolliert Scroll-/Dokument-/Viewport-/Sidebar-Geometrie, Sticky-Zustand und Vorher-/Nachher-Snapshots beim Erreichen des Seitenendes. Außerhalb der Bottom-Zone wird nur sparsam gesampelt.
- Die alte breite `UI_STICKY_*`-Diagnose bleibt entfernt; die erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv.
- Workflow-, Renewal-, Publish-, Delete-, Account- und sonstige Safety-Semantik bleibt unverändert.

## Version 1.21.10: UI-Feinschliff und ZIP-Aktionskonsistenz

- Globaler Kleinanzeigen-Kontostatus im App-Header höher und mit gelockerter Breitenbegrenzung platziert; die Adresse bleibt rechtsbündig und kann den verfügbaren Headerraum weiter nach links nutzen.
- Inventarprofil-Select typografisch leicht verdichtet (10 px, dezentes engeres Letter-Spacing), ohne eine fremde Narrow-Schrift einzuführen.
- Linke Sidebar nutzt für ihre Sticky-Y-Position denselben dynamisch gemessenen App-Header-Unterkanten-/Shell-Gap-Contract wie die Listenheader; der in der Papierkorb-Kompaktansicht beobachtete ca. 6-px-Sprung soll damit entfallen.
- Inventar-Detailkarten zeigen „Als ZIP exportieren“ wieder als echte rechte Aktion zwischen „Daten aktualisieren“/„Online Status prüfen“ und „In Papierkorb“. Alte absolute Footer-Positionierungsreste werden neutralisiert.
- Inventar-Kompaktansicht erhält ein eigenes ZIP-/Archiv-Icon als Aktion an derselben logischen Position. ZIP-Export bleibt lokal und fachlich unverändert.
- Sidebar-Reihenfolge nach Aktionen: Konfiguration → Diagnose → Meldungen. Die Meldungs-Dock-Semantik selbst bleibt unverändert.
- Temporär erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv; Sticky-/Wheel-Diagnose bleibt entfernt.
- Keine Änderung an Account-, Renewal-, Publish-, Delete-, ZIP- oder sonstiger Remote-/Safety-Semantik.

## Version 1.21.9: UI-Konsolidierung und Sticky-Diagnose-Rückbau

- Der aktuell live erkannte Kleinanzeigen-Account wird als globale Session-Information oben rechts über der Inventar-/Papierkorb-Navigation angezeigt: `Kleinanzeigen-Konto: <E-Mail-Adresse>`. Der lokale Inventarprofil-Block enthält nur noch Profilauswahl und Verwaltung.
- Der Inventarprofil-Block nutzt eine klarere Abschnittsüberschrift, `… · <n> Anzeigen`, einen kompakten Zahnrad-Button direkt rechts neben der Combobox und systematisierte Abstände. Selects verwenden einen kontrollierten Chevron mit symmetrischer Innenpolsterung.
- In der Detailansicht sind die rechten Kartenaktionen kompakter. Im normalen Inventar stehen `Neu inserieren`, `Daten aktualisieren`, `Als ZIP exportieren` und `In Papierkorb` gemeinsam im rechten Stapel; der Kartenfuß enthält nur noch Details sowie Gespeichert/ID. Papierkorb-Aktionen verwenden dieselbe kompakte Höhe.
- Bilder im Bereich „Gespeicherte Daten anzeigen“ sind in Inventar und Papierkorb anklickbar. Ist die gespeicherte lokale Vollbildquelle verfügbar, öffnet sie sich sicher in einem neuen Tab; Reihenfolge, Titelbildkennzeichnung und Metadaten bleiben unverändert.
- Die Sidebar besitzt einen dauerhaft sichtbaren Meldungs-Dock mit genau einer priorisierten aktiven Meldung und „Weitere Meldungen anzeigen“ inklusive Badge. Eine manuell geschlossene Meldung bleibt geschlossen, solange ihr fachlicher Inhalt unverändert ist; echte Inhaltsänderungen dürfen sie erneut öffnen.
- Nach erfolgreicher nativer Sticky-/Scroll-Praxisabnahme von v1.21.8 wird die temporäre `UI_STICKY_*`-Wheel-/Geometrie-Diagnose zurückgebaut. Die funktionalen Sticky-, Occlusion-, Fixed-Slot- und Wheel-Fixes bleiben unverändert.
- Die temporär erweiterte Actions-/UI-Stuck-Diagnose bleibt aktiv; der exakte Root Trigger des seltenen Actions-Stuck-Falls ist noch nicht abschließend bewiesen.
- Account-/Profilbindung, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Gates bleiben unverändert.

## Version 1.21.8: Sticky-Occlusion und Actions-State-Diagnose

### v1.21.8 – Sticky-Occlusion und Actions-State-Diagnose

- Inventar und Papierkorb besitzen beim angehefteten Listenheader eine nicht-interaktive Occlusion-Maske zwischen App-Header-Unterkante und Sticky-Zielposition. Sie verwendet exakt denselben viewport-verankerten `--app-canvas-background`, liegt über scrollenden Karten und unter dem Listenheader und verhindert dadurch sichtbares Hindurchscrollen oberhalb des Headers.
- Breite, X-Position und Höhe der Maske werden aus derselben gemessenen Sticky-Geometrie wie der Header abgeleitet; es wird kein zusätzlicher 20-px-Wert hartcodiert. Die v1.21.7-Y-Position und der v1.21.6-Wheel-Fix bleiben unverändert.
- Die Actions-/UI-Stuck-Diagnose ist temporär erweitert: `UI_ACTIONS_STATE_SNAPSHOT`, `UI_ACTION_ATTEMPT`, `UI_ACTION_STATE_DESYNC_DETECTED`, `UI_ACTIONS_RESYNC_STARTED`, `UI_ACTIONS_RESYNC_COMPLETED`, `UI_ACTIONS_RESYNC_FAILED` sowie Background-Epoch-Korrelation.
- Klickversuche auf native deaktivierte Sidebar-Aktionen werden über diagnostische Wrapper erfasst, inklusive Disable-Grund, Button-/Hit-Target-Geometrie, `elementFromPoint`, `pointer-events`, Sichtbarkeit, Account-Gate, Profilbindung, Busy-/Lock-Zustand und Zeit seit letztem erfolgreichen Actions-State-Sync. Die Wrapper lösen selbst keine Aktion aus und umgehen kein Safety-Gate.
- Auf App-Focus, Rückkehr zu sichtbarer Seite und erkanntem Background-Epoch-Wechsel erfolgt ein idempotenter Read-only Actions-Re-Sync aus Profil-, Account-, Insertion-Lock-, Bulk- und Mass-Status. Es wird keine Remote-Aktion automatisch gestartet.
- Die erhöhte Actions-Diagnose ist ausdrücklich temporär und soll nach erfolgreicher Praxisabnahme wieder reduziert bzw. aggregiert werden. Workflow-, Publish-, Renewal-, Delete-, ZIP- und sonstige Safety-Semantik bleibt unverändert.

## Version 1.21.7: Sticky-Zielposition und Geometriestabilisierung

### v1.21.7 – Sticky-Zielposition und Geometriestabilisierung

- Inventar und Papierkorb verwenden für Pin-Schwelle und fixed `top` dieselbe dynamisch gemessene Zielposition: Unterkante des globalen App-Headers plus `--app-shell-top-gap`. Dadurch bleibt der Listenheader beim Scrollen exakt an seiner natürlichen Y-Position und fährt nicht mehr um ca. 20 px nach oben.
- Die Zielposition wird als `--list-sticky-top` an CSS und JavaScript gemeinsam weitergegeben; separate Hardcodierungen entfallen.
- `.list-sticky-header` erzeugt mit `display: flow-root` einen stabilen Block Formatting Context. Dadurch ändert sich die unbeabsichtigte Headerhöhe beim Wechsel relative ↔ fixed nicht mehr und die Dokumentgeometrie bleibt stabil.
- Die v1.21.6-Slot-/Wheel-/Background-Härtung und die temporär erweiterte `UI_STICKY_*`-Diagnose bleiben unverändert erhalten.
- Workflow-, Account-, Renewal-, Publish-, Delete-, ZIP- und sonstige Safety-Logik bleibt unverändert.

## Version 1.21.6: Sticky-Slot- und Diagnose-Hardening

### v1.21.6 – Sticky-Slot- und Diagnose-Hardening

- Inventar und Papierkorb verwenden einen geometrisch stabilen Header-Slot. Beim Pinning bleibt die Dokumenthöhe unverändert; der sichtbare Header wird als fixed/elevated Layer über dem Slot dargestellt.
- Dynamische Flow-Spacer-Anpassungen im Wheel-Scroll-Pfad entfallen. `overflow-anchor: none` schützt Slot und Header zusätzlich gegen Browser-Scroll-Anchoring.
- Body/App-Canvas und angehefteter Header verwenden exakt denselben viewport-verankerten `--app-canvas-background`-Contract, damit beim Pinning kein nahezu schwarzer Rechteck-Hintergrund mehr erscheint.
- Der Papierkorb darf im sichtbaren fixed Layer weiterhin auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ kondensieren, während der Slot die volle natürliche Höhe hält.
- Temporär stark erweiterte Scroll-/Sticky-Diagnose: Pin/Unpin, Geometrie-Samples, gedrosselte Wheel-Samples und Oszillationserkennung mit Sentinel-, Slot-, Header-, Scroll- und `overflow-anchor`-Werten. Diese Datenmenge ist ausdrücklich nur für die aktuelle Fehleranalyse vorgesehen und soll nach erfolgreicher Praxisabnahme wieder reduziert werden.
- Renewal-, Publish-, Delete-, Account-, ZIP- und sonstige Workflow-Safety bleibt unverändert.

## Version 1.21.5: Sticky-Scroll-Hardening

- Sticky-Pin/Unpin wird nicht mehr aus der bereits veränderten Header-Geometrie abgeleitet, sondern aus einem unabhängigen Sentinel vor dem Header. Damit kann das Kondensieren des Papierkorb-Hinweises keinen Scroll-Feedback-Loop mehr erzeugen.
- Der Höhenausgleich für den kompakten Papierkorb-Hinweis liegt hinter dem Sticky-Header und hält die Kartenposition stabil, ohne den Sticky-Anker zu verschieben.
- Der angeheftete Header verwendet keinen flachen schwarzen Block mehr. Stattdessen wird ein viewport-verankerter Hintergrund im bestehenden dunklen Grünverlauf verwendet; sichtbar bleibt nur eine sehr dezente untere Elevation.
- Der vollständige Amber-Hinweis bleibt in natürlicher Position erhalten und wird nur im tatsächlich angehefteten Zustand auf „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ reduziert.
- Interaction-Hardening und alle Workflow-/Remote-/Safety-Gates bleiben unverändert.

## Version 1.21.4: Sticky-Gold-Line

- Die Listensteuerung sieht in ihrer natürlichen Position wieder exakt wie vor dem Sticky-Umbau aus; Hintergrund/Schatten werden erst im tatsächlich angehefteten Zustand zugeschaltet.
- Inventar und Papierkorb bleiben sticky unter dem globalen App-Header und erhalten dort nur einen dezenten Elevated-Effekt ohne zusätzliche Geometrie.
- Der vollständige Papierkorb-Hinweis bleibt in der natürlichen Position unverändert; im angehefteten Zustand wird er zu „Papierkorb: Einträge werden 30 Tage aufbewahrt.“ verkürzt.
- Ein Flow-Ausgleich kompensiert die Höhenänderung des Papierkorb-Hinweises, damit die Liste beim Anheften nicht sichtbar springt.
- Keine Änderungen an Renewal-, Publish-, Delete-, ZIP-, Account- oder Safety-Semantik.


## Version 1.21.3: Sticky Listensteuerung, Papierkorb-Aufbewahrung und Interaction-Hardening

- Inventar und Papierkorb besitzen einen sticky Bereichs-Header unterhalb des globalen App-Headers. Im Papierkorb gehört der amberfarbene 30-Tage-Hinweis zum sticky Bereich.
- Die Ansichtsumschaltung verwendet die Endnutzerbegriffe „Detailansicht“ und „Kompakte Ansicht“.
- In der kompakten Ansicht beginnt die rechte Zeitspalte über alle Karten hinweg an einer stabilen Position. Im Inventar zeigt sie weiterhin „Endet am“, im Papierkorb stattdessen „Im Papierkorb bis … (noch N Tage)“.
- Transiente Account-Rechecks ersetzen vorhandene Karten-/Action-DOMs nicht mehr, solange sich die effektive Profilbindung und Aktionsfreigabe nicht ändert. Safety-relevante Gate-Wechsel sperren weiterhin sofort.
- Pointerdown/Click auf Kartenaktionen werden strukturiert diagnostiziert, damit verlorene Interaktionen, disabled UI und Gate-Ablehnungen künftig unterscheidbar sind.
- Workflow-, Publish-, Renewal-, Delete-, ZIP- und Account-Safety-Semantik bleibt unverändert.


## Version 1.21.2: Verdichtete Schmalansicht und Icon-Umschalter

- Schmale Inventar-/Papierkorbzeilen verwenden jetzt eine feste Drei-Zeilen-Hierarchie: Kategorie, Titel, danach Preis und Enddatum in einer zweigeteilten Metazeile.
- Titelbildgröße und rechtsbündige Hauptaktionen bleiben unverändert.
- Die Ansichtswahl ist icon-only mit zugänglichen Tooltips/ARIA-Labels; neue SVG-Icons unterscheiden Detailkarten und schmale Liste.
- Das Icon „Neu inserieren“ orientiert sich stärker am Kleinanzeigen-Inserieren-Symbol und verwendet einen Spark/Stern als Neu-Akzent statt eines Pluszeichens.
- Workflow-, Account-, Renewal-, Delete- und Safety-Logik bleiben unverändert.
- Build-Regel: Während künftiger Builds spätestens alle fünf Minuten oder nach sinnvollen Meilensteinen Fortschritt melden; diese Regel wird in Handovers fortgeführt.


## Version 1.21.1: Meldungs-Gold-Line

- Meldungskacheln folgen jetzt einer einheitlichen Endnutzerstruktur: kurzer Titel, optionale Faktenzeile mit `·`, höchstens ein kurzer Erklärungssatz und nur bei Bedarf eine Aktion.
- Farbe und Bedeutung sind getrennt: Gelb kann einen Hinweis, **Bald Online** oder echten Prüfbedarf bedeuten und wird im Meldungsverlauf nicht mehr pauschal als „Prüfung erforderlich“ beschriftet.
- Der reine Count-Mismatch der Bestandserfassung besitzt eine eigene Gold-Line. Beispiel: **Erfassung abgeschlossen – Anzahl prüfen** mit `67 gefunden · 2 neu · 65 vorhanden · 0 Fehler` und dem Hinweis `Kleinanzeigen meldet 66 laufende Anzeigen.`
- Erfassungs-, Online-Status-, Renewal-, Mehrfach-Renewal-, ZIP-, Profil- und Konto-Meldungen verwenden kurze, konsistente Nutzertexte. Sicherheitsrelevante Fälle nennen weiterhin ausdrücklich, wenn die alte Anzeige nicht entfernt oder ein Austausch nicht abgeschlossen wurde.
- Normale Meldungskacheln geben keine rohen `Error.message`-/`lastError`-Texte, Diagnose-Eventnamen, Stacktraces oder internen `status`/`reason`-Werte aus. Technische Details bleiben in der Diagnose.
- Kontrolliert geschlossene Workflow-Tabs erzeugen keine Warnkachel; echte Verbindungs-/Timeoutfälle werden als **Seite konnte nicht gelesen werden**, **Vorgang unterbrochen** bzw. **Kleinanzeigen antwortet nicht** übersetzt.
- Bilder bleiben optional: ZIP-/Vollständigkeitsmeldungen behaupten nicht pauschal, dass fehlende Bilder einen unvollständigen Datensatz bedeuten.
- Workflow-, Publish-, Edit-Vergleich-, Phase-4-Delete-, Account-Binding- und sonstige Safety-Gates bleiben fachlich unverändert.


## Version 1.21.0: Detail-/Schmalansichten und Meldungsverlauf leeren

- **Inventar** und **Papierkorb** können unabhängig zwischen **Kachel mit Details** und **Schmal** umgeschaltet werden; beide Einstellungen werden getrennt gespeichert. Default bleibt die bisherige Detailansicht.
- **Schmal** zeigt Bild, Titel, letzte Kategorieebene, Preis, Enddatum und nur die Hauptaktionen als Vektor-Icons. ZIP-Export und ausklappbare Detaildaten bleiben der Detailansicht vorbehalten.
- Das Löschen-Icon ist rein lokal: im Inventar **In Papierkorb**, im Papierkorb **Entfernen**. Auf Kleinanzeigen wird dadurch nichts gelöscht.
- Bestehende Zustände/Gates wie **Bald Online**, **Online Status prüfen**, Retry- und Account-/Profil-Sperren bleiben fachlich unverändert.
- Der **Meldungsverlauf** besitzt unten links **Alles löschen**. Nach bestätigtem, gestaltetem Dialog werden nur Verlaufseinträge gelöscht; Diagnose-, Inventar-, Papierkorb- und Workflowdaten bleiben erhalten.


## Version 1.20.22: Anzeigen ohne Bilder korrekt erfassen

- Bilder sind weiterhin optional: Ein Bearbeiten-Snapshot mit **explizit strukturiert bestätigtem leerem Bildarray** wird nun als gültiger 0-Bilder-Bestand erfasst.
- Unklare leere Bildzustände bleiben fail-closed. Vorhandene, aber nicht eindeutig extrahierbare Bilder werden nicht als „0 Bilder“ umgedeutet.
- `blob:`-/`data:`-Previews bzw. sonstige lokale, nicht sicher persistierbare Preview-Zustände bleiben blockierend.
- Die explizite 0-Bilder-Evidenz wird im Inventardatensatz gespeichert. Dadurch darf ein bestätigter leerer Bildbestand bei einer Aktualisierung auch einen früheren Bildbestand ersetzen.
- Direktes „Neu inserieren“ akzeptiert explizit bestätigte 0-Bilder-Vorlagen; der Template-Filler hatte den 0-Bilder-Fall bereits als vollständig unterstützt.
- ZIP-Export/-Neu-Inserat akzeptiert ebenfalls explizit bestätigte 0-Bilder-Vorlagen; ein unbestätigt leerer ZIP-Bildbestand bleibt blockiert.
- In der Vollprüfung gilt 0 Bilder gegen 0 Bilder nur dann als Bild-Match, wenn beide Seiten ihren leeren Bildbestand explizit bestätigt haben. Ein bestätigtes 0↔N bleibt ein Mismatch, ein nicht bestätigtes leeres Set bleibt unsicher.
- Schnellprüfung, `Bald Online`, öffentliche Read-only-Enrichment-Logik und Phase-4-Delete-Safety bleiben unverändert.

## Version 1.20.21: „Bald Online“ in der Mehrfachlauf-Übersicht

Die Abschluss-**Übersicht** von **Mehrere neu inserieren** unterscheidet jetzt zwischen vollständig abgeschlossenem Austausch und noch ausstehender öffentlicher Bereitstellung. Hat ein erfolgreich ersetzter Datensatz `publicAvailabilityPending`, bleiben alle vier Workflow-Phasen als erfolgreich markiert, die sichtbare Statuspille lautet jedoch **Bald Online** statt **Erfolgreich**. Der Eintrag zählt weiterhin als erfolgreicher Austausch und nicht als Prüfbedarf.

Der Pending-Zustand wird im Batch-Item persistiert und im Public-Snapshot transportiert. Für bereits mit v1.20.20 erzeugte Abschlusszustände ohne dieses Feld kann die UI den Zustand aus dem promotierten neuen Inventardatensatz ableiten; dafür wird bei der Vorschau die neue Inventar-ID vor der alten Quell-/Papierkorb-ID bevorzugt. Voll-/Schnellprüfung, Delete-Safety und die v1.20.20-Inventarkartenlogik bleiben unverändert.


## Version 1.20.20: „Bald Online“-Aktionskarte korrigiert

Normale Inventarkarten mit **Bald Online** zeigen jetzt **Online Status prüfen** statt **Daten aktualisieren**. Der Check bleibt ein reiner öffentlicher Read-only-Status-/Metadaten-Refresh. **Neu inserieren** ist in diesem Zustand explizit deaktiviert und bleibt auch nach einem fehlgeschlagenen Online-Status-Check gesperrt. Background-Hard-Gate, Vollprüfungs-/Delete-Semantik aus v1.20.19 und Schnellprüfung bleiben unverändert.

## v1.20.19 – Edit-Vergleich als Vollprüfungs-Gate und „Bald Online“

- **Schnellprüfung bleibt unverändert:** Sie prüft die neue Anzeigen-ID weiterhin nur kontoseitig unter „Meine Anzeigen“ und öffnet die neue Anzeige nicht erneut im Bearbeiten-Modus.
- **Vollprüfung:** Der frische Bearbeiten-Recheck der exakten neuen Anzeigen-ID wird vollständig gegen die Ursprungsanzeige verglichen. Ein vollständiger semantischer Match setzt den Kandidaten auf `verified / replacement-ready`; die öffentliche Read-only-Erreichbarkeit ist kein Lösch-Gate mehr. Semantische Mismatches oder andere inhaltliche Unsicherheiten bleiben fail-closed.
- Kann die neue Anzeige über die kanonische oder ID-Direkt-URL noch nicht eindeutig im Read-only-Modus geöffnet werden, bleibt der inhaltlich verifizierte Datensatz mit `listingMeta.publicAvailability.status = pending` und dem Inventar-Badge **Bald Online** erhalten. Nach erfolgreicher Read-only-Erreichbarkeit wird der Status auf `online` gesetzt.
- Solange **Bald Online** besteht, heißt **Daten aktualisieren** stattdessen **Online Status prüfen**. Diese Aktion prüft nur die öffentlichen Routen und ergänzt die dort noch fehlenden Read-only-Daten; sie öffnet den Bearbeiten-Modus nicht erneut. Ein erfolgreicher Lauf entfernt den Pending-Status und damit das Badge.
- **Neu inserieren** ist für einen `Bald Online`-Datensatz sowohl in der UI als auch im Background-Hard-Gate gesperrt.
- Phase 4 behält die bestehenden Safety-Invarianten: profilgebundene Löschung der alten ID, frischer unabhängiger MyAds-Abwesenheitsnachweis und lokale Promotion erst nach `source-delete-verified`.
- **Mehrere neu inserieren:** „Erneut prüfen“ bleibt über Re-Renders hinweg gesperrt, solange derselbe Retry lokal oder im persistenten Item-State `running/retrying` ist.
- UI-Feinschliff: verbleibender 1-px-Sticky-Versatz links korrigiert; nur die rechte Außenlücke zwischen Refresh-Button und Scrollbalken verkleinert. Die v1.20.18-Bright-Cyan-Refresh-Gestaltung und der Abstand zwischen Tabs und Refresh bleiben unverändert.


## v1.20.18 – Ansichts-Refresh, Sticky-Geometrie und Meldungsverlauf

- Der umfassende manuelle Refresh bleibt funktional unverändert (`inspectPage({ forceFresh: true })` gefolgt von `refreshInventories()`), sitzt aber nicht mehr irreführend in der Inventar-Überschrift. Er befindet sich jetzt rechts in der gemeinsamen Header-/Ansichtsleiste als eigener kompakter Bright-Cyan-Icon-Button mit dem Tooltip **Ansicht aktualisieren** und sichtbarem Abstand zu `Inventar | Papierkorb`.
- Die linke Steuerung verwendet für ihre Sticky-Schwelle dieselben expliziten Geometrie-Tokens wie Headerhöhe und oberer App-Shell-Abstand. Dadurch stimmt die anfängliche natürliche Position mit der Sticky-Position überein und das wenige Pixel große Hoch-/Runterspringen beim An- und Ablösen entfällt.
- Der persistente Activity-Center-Zustand wird beim App-Start proaktiv aus `chrome.storage.local` geladen. Zusätzlich wartet **Weitere Meldungen anzeigen** vor dem Rendern explizit auf diesen Load. Bereits gespeicherte Meldungen erscheinen dadurch nach Reload/Neustart wieder zuverlässig im Zähler und im Meldungsverlauf, statt bis zur nächsten neuen Activity nur im Storage zu liegen.
- Renewal-, Publish-, Phase-3/4-, Inventur-, Account-Gate- und Safety-Logik bleiben fachlich unverändert.


## v1.20.17 – Aktionen-Meldungen und MyAds-Inkonsistenz

- Der generische aktuelle Status im Bereich **Aktionen** besitzt jetzt wie die übrigen Meldungskarten ein `×`. Ausblenden archiviert die Meldung in **Weitere Meldungen anzeigen**; sie wird nicht gelöscht. Damit sind insbesondere Erfolgs- und Fehlerkarten aus **Geöffnete Anzeige erfassen** einheitlich dismissbar.
- Ein fachlich inkonsistenter „Meine Anzeigen“-Stand wird als eigene Readiness-Fehlerklasse `KR_MY_ADS_INCONSISTENT` bis zur UI propagiert. Wenn Kleinanzeigen beispielsweise 10 Online-Anzeigen meldet, aber nur 9 Karten vollständig liefert, erklärt die Oberfläche den sicheren Abbruch ausdrücklich und empfiehlt, kurz zu warten und erneut zu versuchen.
- Die Readiness-Diagnose bewahrt bei solchen Fällen erwartete/erkannte Counts, erkannte Anzeigen-IDs, Seiten-Fingerprint und den konkreten Reason-Code. Fehlende IDs werden nur ausgewiesen, wenn sie belastbar bekannt sind; andernfalls bleibt `missingIdsKnown=false`.
- Der fachliche Inventur-, Renewal-, Publish- und Phase-4-Ablauf bleibt unverändert; der Patch verbessert ausschließlich Meldungs-UX und Diagnose/Fehlerpropagation der MyAds-Readiness.


## v1.20.16 – Stabilisierung Phase 3, Batch-Recovery und Header-Kontur

- Phase 3 behält die Fresh-Tab-only-Invariante bei. Sobald ein frischer öffentlicher Prüftab eindeutig die erwartete Anzeigen-ID erreicht hat, wartet derselbe frische Tab bis zu 30 Sekunden auf die fachliche Read-only-Bereitschaft, bevor ein weiterer Verifikationsweg geöffnet wird.
- Erfolgreiche manuelle Recoveries normalisieren den Top-Level-Status des Mehrfach-Neuinserats aus den finalen Item-Zuständen; ein stale `complete-with-attention` bleibt nach `2/2 success, attention=0` nicht bestehen. Bereits aus älteren Builds gespeicherte stale Terminalzustände werden beim nächsten Statusabruf ebenfalls aus den Items selbst geheilt.
- Die Header-Navigationslinie ist durchgehend Bright Cyan: Unterkante beider Tabs sowie die gemeinsame Trennkante Inventar↔Papierkorb verwenden `#4de0b7`.
- Publish-, Bild-, Inventur-, Account-Gate- und Phase-4-Safety bleiben unverändert.


## v1.20.15 – Header-Navigationslinie Bright Cyan

Die horizontale Header-Trennlinie, auf der die beiden Ansichts-Tabs sitzen, verwendet jetzt exakt dasselbe **Bright Cyan `#4de0b7`** wie die Border des aktiven Tabs. Höhe, Position, Tab-Geometrie sowie aktive/inaktive Tab-Semantik bleiben unverändert.

**Bewusst enger Patch-Scope:** ausschließlich diese visuelle Header-Anpassung; keine funktionalen Workflow- oder Safety-Änderungen. Auf ausdrücklichen Wunsch wurde für diesen Patch auf die vollständige Test-/Fresh-Source-Matrix verzichtet; der bereits vorhandene gezielte Header-Contract `tests/v1176-accordion-motion.cjs` wurde auf die neue Farbregel aktualisiert und separat ausgeführt.


## v1.20.14 – Stabilisierung ID-Route, Batch-Zähler und Prüf-Terminologie

Die öffentliche Fresh-Tab-Verifikation aus v1.20.13 verwendet bereits die Anzeigen-ID als autoritative Identität. v1.20.14 schließt den letzten Parser-Widerspruch: Auch die Content-/Read-only-Metadatenextraktion akzeptiert nun sowohl die lange kanonische Anzeigen-URL als auch `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Beide Pfade verwenden denselben `managed-navigation.js`-Ad-ID-Parser; damit kann eine korrekt erreichte ID-Route nicht mehr fälschlich als „keine öffentliche Anzeigen-Detailseite“ abgewiesen werden.

Der Fortschritt von **Mehrere neu inserieren** normalisiert seine Zähler jetzt ausschließlich aus `batch.items`. Storage-Events und Runtime-Responses besitzen dadurch dieselbe abgeleitete UI-Form; die Fortschrittszeile bleibt beispielsweise bei zwei Anzeigen korrekt `0 von 2`, `1 von 2`, `2 von 2` statt nach Storage-Updates auf `0 von 0` zurückzufallen.

Prüfaktionen sind sprachlich vereinheitlicht: dieselbe Verifikation heißt überall **Erneut prüfen**. Der Status **Noch nicht online** entfällt zugunsten von **Veröffentlichung noch nicht bestätigt**; unsichere Prüfzustände heißen **Prüfung erforderlich**. Dadurch beschreibt die UI nur, was tatsächlich bewiesen ist, ohne eine noch laufende Hintergrundprüfung oder eine sicher nicht öffentliche Anzeige zu suggerieren.

**Stabilisierungsscope:** Die Fresh-Tab-only-Architektur aus v1.20.13, Gold-Line, Publish-/Template-Fill-, Bild-, Phase-4-, Vollinventur-, Actions-/Account-Gate- und ZIP-Pfade bleiben fachlich unverändert.

## v1.20.13 – Stabilisierung Phase 3 und Mehrfachlauf-Gold-Linie

Die Safe-/Vollprüfung der neu erzeugten Anzeige verifiziert öffentliche Evidenz nun **ID-zentriert und ausschließlich über frische dedizierte Tabs**. Zuerst wird eine bekannte kanonische Anzeigen-URL geprüft; wenn dieser Pfad off-target oder technisch uneindeutig endet, folgt in einem anderen frisch erzeugten Tab die ID-Route `https://www.kleinanzeigen.de/s-anzeige/<adId>`. Ein Redirect auf die kanonische URL ist zulässig, solange die tatsächlich erreichte öffentliche URL eindeutig dieselbe Anzeigen-ID trägt. Kein Publish-, Nutzer-, MyAds- oder früherer Prüftab wird für öffentliche Evidenz recycelt.

Transiente Navigations-/Transportfehler sind von semantischen Inhaltsabweichungen getrennt und können innerhalb der bestehenden begrenzten Phase-3-Versuche erneut geprüft werden. Die Safety-Grenze bleibt unverändert: Phase 4 wird erst nach eindeutiger öffentlicher ID-Bestätigung und erfolgreichem Inhaltsvergleich freigegeben. Jeder Prüftab wird kontrolliert geschlossen und die Diagnose enthält Versuch, frische Tab-ID, URL-Variante, angeforderte/finale URL sowie erwartete und beobachtete Anzeigen-ID.

Der Fortschritt von **Mehrere neu inserieren** verwendet jetzt dieselbe Gold-Linie wie Einzeldurchläufe. Global und je Anzeigenzeile erscheinen abgeschlossene Schritte sofort als `✓` mit grünlichem Erfolgszustand; der aktuelle Schritt bleibt nummeriert aktiv, zukünftige Schritte neutral.

**Stabilisierungsscope:** Publish-/Template-Fill-, Bild-, Phase-4-, Vollinventur-, Actions-/Account-Gate- und ZIP-Einzeldurchlaufpfade werden nicht breit refaktoriert.


## v1.20.10 – zentraler Account-Gate-/Actions-Lifecycle

Der Bereich **Aktionen** verwendet jetzt eine zentrale Account-Gate-State-Authority. UI-Freigabe, Tooltips und Klick-Guard werden aus demselben Zustand abgeleitet; dynamisch gerenderte Inventarkarten werden bei relevanten Gate-Transitions ebenfalls synchron aktualisiert. Transiente Health-/Tab-Fehler löschen eine zuletzt bestätigte Profilidentität nicht mehr. Solange ausgewähltes Inventarprofil und zuletzt bestätigtes Live-Konto übereinstimmen, bleibt die Oberfläche in einem expliziten `ready-transient`-Zustand nutzbar; definitive Zustände wie Logout, Mehrdeutigkeit, falsches Profil oder Plattform-Safety sperren weiterhin.

Die verwaltete Account-Probe ist nun an die tatsächlich angeforderte Navigation gebunden. Der zunächst erzeugte `about:blank`-Tab kann nicht mehr mit seinem alten `complete`-Status als erfolgreiche Kleinanzeigen-Navigation gelten. Erst die erwartete Ziel-URL mit anschließendem `complete` wird akzeptiert; Browser-Fehlerseiten und Fremdziele werden sauber als off-target behandelt. Ein begrenzter Retry bleibt Recovery, nicht primäre Readiness.

Die Diagnose enthält zusätzlich `ACCOUNT_GATE_TRANSITION`, `PROFILE_BINDING_TRANSITION`, `ACCOUNT_GATE_ACTION_BLOCKED` sowie `account-gate-state.json`. Damit lässt sich künftig nachvollziehen, wann und warum Aktionen zwischen freigegeben, prüfend, transient, mismatch oder gesperrt wechseln. Kurze Recovery-Checks behalten Vorrang vor dem 60-s-Safety-Fallback, sodass ein 650-ms-Recheck nicht mehr versehentlich durch den nächsten 60-s-Timer ersetzt wird.

**Bewusst unverändert:** die v1.20.9-Vollinventur-/Reconciliation-Architektur sowie Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Workflows. Echte Remote-Aktionen behalten zusätzlich die frische Background-Profil-/Live-Konto-Verifikation.

## v1.20.9 – gemeinsame eventgetriebene „Meine Anzeigen“-Readiness für Inventarisierung

Die Vollinventur und ihre unabhängige zweite Bestandsprüfung verwenden jetzt dieselbe fachliche Readiness-Schicht für „Meine Anzeigen“. Browser-`tab.status === "complete"` bleibt weiterhin die Navigationsgrenze; erst danach wartet der Content-Kontext zusätzlich darauf, dass Seite 1, Profilbindung, Online-Zähler und Anzeigenkarten einen konsistenten fachlichen Zustand bilden. Ein kurzlebiger `MutationObserver` ist das Primärsignal, ein 1-s-Recheck nur Safety-Net; nach 12 s endet ein Versuch begrenzt und fail-closed. Ein expliziter echter Nullbestand wird unterstützt, muss aber 1,2 s stabil bleiben. `null`/nicht erkannt wird niemals mehr als `0` interpretiert.

Der Start einer Vollinventur ist nun eine einzige autoritative Background-Operation (`START_BULK_INVENTORY_OPERATION`). Der frühere erreichbare Split aus `PREPARE_BULK_INVENTORY_SOURCE` und `START_BULK_INVENTORY_FRESH` wurde entfernt. Source-Tab-Erzeugung, semantische Readiness und `BULK_INIT_RUN` behalten dadurch dieselbe `operationId`. Transiente Readiness-Probleme dürfen höchstens einen zweiten frischen Source-Tab verwenden; falsche Seite, falsches Profil und Plattform-Safety scheitern sofort.

Die Reconciliation verwendet dieselbe Readiness-Primitive und übergibt den einmal verifizierten Snapshot an den zweiten Scan. Der lokale v1.20.7-500-ms-Polling-Sonderpfad entfällt. H4 bleibt unverändert fail-closed: Ohne zwei vollständige bestätigte Bestände erfolgt keine automatische Papierkorbmutation.

**Bewusst nicht verändert:** Renewal-/Neuinserierungs-, Bild-, Publish-, Delete- und Phase-4-Verifikationspfade. Der v1.20.8-Worker-Tab-Create-Retry bleibt erhalten. Diese Version glättet ausschließlich die Inventarisierungs-/Reconciliation-Architektur.


## v1.20.8 – robuster Bulk-Worker-Tab-Start

Ein transienter Fehler beim Erzeugen des zwingenden Bearbeiten-Worker-Tabs beendet eine Anzeige nicht mehr sofort. `chrome.tabs.create()` erhält in diesem eng begrenzten Bulk-Pfad genau einen Wiederholungsversuch nach 200 ms. Schlägt auch dieser fehl, bleibt die bestehende Fail-Closed-Semantik erhalten. Plattform-Safety (`KR_PLATFORM_ACCESS_RESTRICTED`) wird ausdrücklich nicht wiederholt.

Der echte Chrome-Fehler wird in der Diagnose erhalten. Falls der optionale öffentliche Metadaten-Tab parallel bereits geöffnet wurde, der Bearbeiten-Worker aber endgültig nicht erzeugt werden kann, wird dieser Gegenpart kontrolliert geschlossen, statt als unregistrierter Tab zurückzubleiben. Der manuelle Einzel-Retry nutzt denselben Recovery-Pfad. Die Reconciliation-Readiness aus v1.20.7 und alle Safety-Gates bleiben unverändert.

## v1.20.7 – QA-01 Reconciliation-Readiness

Auf Basis der kanonischen v1.20.5 wartet die unabhängige zweite Bestandsprüfung nach einem vollständig geladenen frischen „Meine Anzeigen“-Tab zusätzlich auf einen stabilen lokalen Bestandsstatus. Ein transienter `0 Anzeigen online`-Zustand während der DOM-Hydrierung verbraucht dadurch nicht sofort einen Fresh-Source-Versuch. Dauerhafte Bestandsabweichungen bleiben unverändert sicher und führen ohne Papierkorbmutation zu `needs-review`.

## v1.20.5 – Lifecycle-Race-Fix nach Phase 2

v1.20.5 ist ein bewusst kleiner Stabilitäts-Patch auf v1.20.4 und enthält **keine neue Performancephase**. Zwei im nativen v1.20.4-3er-Lauf beobachtete Expected-Close-Races werden geschlossen: Ein bereits gestarteter Content-Bootstrap kann nicht mehr nach einem planmäßigen `renewal-target-published`-Close als `CONTENT_SCRIPT_BOOTSTRAP_FAILED`/`BACKGROUND_REQUEST_*` eskalieren, weder beim `executeScript`-Inject (`No tab with id`) noch im anschließenden Handshake (`Receiving end does not exist`).

Die TabRegistry-Close-Intention aus v1.20.2 gilt nun bereits während des physischen `tabs.remove()` als erwarteter kontrollierter Close; aktive Close-Intents werden dabei auf ein 10-s-Fenster begrenzt, damit ein veralteter Intent keinen späteren echten Connection-Fehler neutralisieren kann. Bootstrap-/Handshake-Fehler prüfen diese Korrelation erneut **bevor** ein Fehlerdiagnoseevent geschrieben wird und enden neutral mit `KR_TAB_EXPECTED_CLOSED`. Dadurch entfallen auch unnötige Rest-Retries gegen einen bereits planmäßig geschlossenen Renewal-Target-Tab.

P6a Event-driven Tab Readiness, der 512-KiB-Bildtransport-Cache, die strikt sequenzielle serverseitige Bildanlage, 200-ms-Settling, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates bleiben gegenüber v1.20.4 unverändert.

## v1.20.4 – Low-Resource Performance II, Phase 2: Event-driven Tab Readiness + Bildtransport/IPC

v1.20.4 lässt die fachliche Readiness-Bedingung bewusst unverändert bei `tab.status === "complete"`, wartet darauf aber primär ereignisgetrieben über `chrome.tabs.onUpdated` statt alle 250 ms `chrome.tabs.get()`/TabRegistry-Prüfungen auszulösen. Ein 2-s-Safety-/Recovery-Check bleibt als konservativer Fallback bestehen. Eine Signal-Generation verhindert, dass ein `complete`-Event im engen Fenster zwischen letzter Abfrage und Waiter-Registrierung erst beim Fallback bemerkt wird.

Der lokale Bildtransport verwendet 512-KiB-Chunks. Ein aktives Bild wird beim ersten Chunk gegen Fill-Session, Target-Tab und Inventory validiert und anschließend kurzzeitig im Background gecacht. Folgechunks desselben Bildes verursachen dadurch keine erneuten `templateFillSessions`-Reads und keine erneuten IndexedDB-Reads desselben Blobs. Der Cache ist auf zwei Einträge und 60 Sekunden begrenzt und wird nach dem letzten Chunk, Terminalzuständen und Tab-Schließung sofort bereinigt. Bei Service-Worker-Neustart fällt der Pfad automatisch auf die persistente IndexedDB zurück.

**Unverändert bleiben:** die 200-ms-Settling-Pausen, lokale Kategorie-Retries, strikte Bild-Uploadreihenfolge, serverseitige Bestätigung jeder Bildanlage, überlappende Preview-/CDN-Stabilisierung, Publish-/Delete-/Reconciliation-, H1/H2- und Account-Gates.

Für den Low-Resource-Vergleich gilt erneut derselbe definierte 3er-Batch auf demselben alten Rechner nach Diagnose-Reset: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. Die kontrollierte Reihe liegt vor Phase 2 bei v1.20.0 = 134,17 s, v1.20.1 = 108,49 s, v1.20.2 = 110,26 s und v1.20.3 = **86,24 s**.


## v1.20.3 – Low-Resource Performance II, Phase 1: Renewal-/Storage-Hot-Path

v1.20.3 reduziert lokale CPU-, Storage- und IndexedDB-Arbeit während laufender Renewals, ohne die bewährte 200-ms-Settling-, Upload-, Publish-, Delete-, Reconciliation-, H1/H2- oder Account-Semantik zu verändern. Normale Bild-Mikrofortschritte (`queued`, `uploading`, `checking`, `stable`) bleiben sichtbar und werden für den Massenlauf koalesziert, werden aber nicht mehr bei jedem Schritt als Recovery-Zustand durch Fill-Session, Renewal-Session und Inventory-Skeleton persistiert. Fehlgeschlagene Bilder sowie Verify-/Publish-/Terminal-Meilensteine bleiben weiterhin dauerhaft.

Der bisherige direkte Mass-Batch-Touch aus jedem Template-Fill-Update entfällt. Nichtterminale Batch-Fortschritte laufen ausschließlich über die vorhandene 1,5-s-Koaleszierung; terminale Zustände bleiben sofort persistent. Profilbezogene Hot-Reads sowie Renewal-Skeleton-Reads/-Writes verwenden innerhalb der Service-Worker-Lebenszeit eine wiederverwendete IndexedDB-Verbindung mit sauberem `onversionchange`-Close.

Die automatische 30-Tage-Papierkorb-Bereinigung merkt sich nach einem indexbasierten Check den nächsten relevanten Ablaufzeitpunkt. Normale `LIST_INVENTORIES`-/`LIST_TRASH`-Reads führen dadurch bis zu diesem Zeitpunkt keine erneute Expiry-Query aus; neue oder verlängerte Papierkorb-Fristen invalidieren den Cache sicher. Routine-Diagnoseevents werden in größeren Batches gesammelt (1,2 s / bis 120 pending), und der bereits persistierte Diagnosebestand wird pro Service-Worker-Lebenszeit im Speicher gehalten, sodass nicht jeder Flush zuvor erneut `chrome.storage.local` lesen muss. Warning/Error- und Safety-/Recovery-/Terminalevents bleiben sofort persistent.

Für den Low-Resource-Vergleich gilt weiterhin derselbe definierte 3er-Batch auf demselben alten Rechner nach Diagnose-Reset: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**.

**Backlog H3/P11 – Event-driven Inventory DOM Scanning:** Die Vollinventur-/Listing-Erkennung soll später schrittweise von wiederholten 250-/500-ms-DOM-Scans auf `MutationObserver` als Primärsignal umgestellt werden; Polling bleibt Safety-/Recovery-Fallback. Dieser Punkt ist nicht Bestandteil von v1.20.3.

## v1.20.2 – A7 IndexedDB-Indizes + Expected-Close-Race

Auf der in v1.20.1 event-driven reduzierten Lifecycle-Arbeit setzt v1.20.2 **A7 IndexedDB-Indizes** um. Profilbezogene Inventar- und Papierkorb-Abfragen lesen reguläre Profile direkt über einen `profileId`-Index; die automatische Papierkorb-Bereinigung nutzt `trash.expiresAt` statt globaler Vollscans. Reconciliation, Delta-Erfassung und weitere profilgebundene Reads verwenden denselben gezielten Pfad. Bestehende Daten bleiben erhalten; das IndexedDB-Schema wird auf Version 2 angehoben und die neuen Indizes werden im Schema-Upgrade aufgebaut.

Zusätzlich ist der im v1.20.1-Low-Resource-Benchmark beobachtete **Expected-Close-Race** behoben. Der kontrollierte Close-Grund wird vor dem physischen Tab-Schließen persistiert, sodass ein nahezu gleichzeitig eintreffendes `tabs.onRemoved` keinen planmäßigen Renewal-Tab-Abschluss mehr als Warning/Error klassifizieren kann.

Für den Low-Resource-Vergleich soll auf demselben alten Rechner nach Diagnose-Reset wieder exakt der definierte 3er-Batch ausgeführt werden: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. v1.20.0 bleibt die kanonische Voroptimierungs-Baseline; v1.20.1 dokumentiert isoliert A6/P7; v1.20.2 zeigt den zusätzlichen A7-Effekt.

## v1.20.1 – A6/P7 Event-driven Lifecycle/Health

Die erste Low-Resource-Phase reduziert wiederkehrende Hintergrundarbeit, ohne den bewährten Renewal-Ablauf aus v1.20.0 anzutasten. Der Manager pollt den Bulk-Erfassungsstatus nicht mehr im Sekundentakt, sondern übernimmt Änderungen direkt aus dem persistenten Storage-Event. Auch der Fortschritt von **Mehrere neu inserieren** wird aus dem Batch-Storage aktualisiert und löst nicht länger bei jedem Batch-Fortschritt einen vollständigen Inventar-/Papierkorb-Refresh aus.

Die Account-/Tab-Gesundheit bleibt primär ereignisgetrieben. Der periodische Safety-/Recovery-Check läuft nur noch alle **60 Sekunden** statt alle 15 Sekunden. Verwaltete Worker-Tabs werden aus dem `tabRegistryV1`-Session-Cache erkannt; ihre häufigen Navigations-/Lifecycle-Events lösen keine unnötige Account-Inspektion aus. Bekannte beziehungsweise aktive Nutzer-Tabs bleiben sofort beobachtet.

**A7 IndexedDB-Indizes ist in v1.20.1 noch nicht umgesetzt.** Nach Installation soll auf dem alten Rechner exakt derselbe Diagnose-Reset + 3er-Batch wie bei der v1.20.0-Baseline ausgeführt werden: **IKEA Tischleuchte (5 Bilder) → Weihnachtsfiguren (11 Bilder) → Hartan Kinderwagen (20 Bilder)**. Erst danach folgt A7, damit beide Effekte getrennt messbar bleiben.

## v1.20.0 – Diagnose-Reset als Benchmark-Basis

Der Bereich **Diagnose** besitzt jetzt zusätzlich **Reset**. Damit kann unmittelbar vor einem definierten Test- oder Fehlerlauf eine neue Diagnose-Messgrenze begonnen werden. Zuvor gepufferte Diagnosen werden sauber abgeschlossen; ältere Diagnose- und Galeriedaten werden aus dem neuen Exportkontext entfernt. Der nächste Diagnoseexport enthält anschließend nur Daten ab diesem Reset.

Die Reset-Grenze wird persistent gespeichert. Ein Neustart des Extension-Service-Workers während des anschließenden Laufs verliert daher nicht die bewusst gesetzte Messgrenze. Während laufender Erfassung, Einzel-Erfassung, Neu-Inserierung/Massen-Neuinserierung oder Profiltransfer ist Reset gesperrt; eine Bestätigungsabfrage ist nicht erforderlich.

**A6/P7 Event-driven Lifecycle/Health und A7 IndexedDB-Indizes sind in v1.20.0 noch nicht umgesetzt.** Diese Version dient bewusst als funktional unveränderte Benchmark-Basis auf dem v1.19.8-Verhalten, bevor die Low-Resource-Optimierungen beginnen.

## v1.19.8 – Profiltransfer-Härtung und ruhigere Renewal-Interaktionen

Profil-Backups speichern identische Bildinhalte im ZIP jetzt physisch nur noch einmal, wenn ihre SHA-256-Prüfsumme identisch ist. Die logischen Bildreferenzen pro Anzeige bleiben vollständig erhalten und werden beim Restore wieder separat hergestellt. Das Backup-Manifest dokumentiert Bildreferenzen, eindeutige Bilddateien und die durch Deduplizierung eingesparten Bytes. Bestehende Profilsicherungen bleiben importierbar.

Profil sichern und Profil aus Sicherung wiederherstellen verwenden während der laufenden Operation einen exklusiven, operationsgebundenen Transfer-Lock. Währenddessen sind andere zustandsverändernde Manager-Aktionen gesperrt. Abbruch des nativen Dateipickers lässt das Profilmanagement geöffnet und verändert keine Daten. Ungültige Profilsicherungen bzw. Anzeigenexporte zeigen in Dialog und Activity Center nur verständliche Endanwendertexte; technische Parserdetails bleiben in der Diagnose.

Beim Renewal wartet der Template-Filler nach erfolgreich gesetzten interaktiven Feldern bewusst **200 ms**, bevor die nächste UI-Interaktion beginnt. Das Öffnen der Kategorie verwendet zunächst kurze lokale Interaktionsversuche gemäß der bestehenden Konfiguration **Versuche je Phase**; jedes Mal wird das Control frisch aus dem DOM aufgelöst. Erst nach Ausschöpfen dieser lokalen Versuche greift der übergeordnete Retry-/Recovery-Pfad. Der reine Sicherheitshinweis im Renewal-Dialog wird neutral statt amber dargestellt.

Die DOM-/IndexedDB-Suite bleibt bewusst **optional**: Ist `linkedom`/`fake-indexeddb` vorhanden, wird sie mit ausgeführt; fehlen die Pakete, wird sie als SKIPPED dokumentiert und blockiert den Release nicht.

## v1.19.7 – dynamischer Aktionenbereich und begrenzter Meldungsverlauf

Der geöffnete Bereich **Aktionen** passt seine Höhe nach der Akkordeonanimation wieder automatisch an den tatsächlichen Inhalt an. Wird eine Status-/Ergebniskachel eingeblendet, wächst der Bereich; wird sie entfernt, schrumpft er wieder. Die Animationshöhe bleibt nach dem Öffnen nicht mehr als wirksamer WAAPI-Fill-Effekt stehen.

**Weitere Meldungen anzeigen** bleibt dauerhaft sichtbar und zeigt einen kompakten Zähler. Bei leerem Verlauf steht dort bewusst **0**. Die Historie wird automatisch auf die letzten **30 Tage** und höchstens **250 gespeicherte Meldungen** begrenzt; wenn wegen der Obergrenze ältere Meldungen verworfen wurden, zeigt der Zähler **250+**. Jede historische Meldung kann über ein kleines **×** ohne Rückfrage dauerhaft entfernt werden. Die Karte blendet dabei kurz aus und klappt zusammen; reduzierte Bewegungseinstellungen werden respektiert.

Die Sicherheits- und Workflow-Gates aus v1.19.6 bleiben unverändert.

## v1.19.6 – kompakter Statusbereich, Meldungsverlauf und Auswahlübersicht

Im Bereich **Aktionen** ist jetzt höchstens eine aktuelle Status- oder Ergebniskachel sichtbar. Beginnt ein neuer Vorgang oder ersetzt ein neuer Zustand das bisherige Ergebnis, wandert die vorherige Meldung in den persistenten **Meldungsverlauf**. Die schmale Aktion **Weitere Meldungen anzeigen** öffnet dafür ein eigenes Modal. Technische Diagnoseereignisse bleiben weiterhin getrennt im Diagnoseexport.

Der Dialog **Alle laufenden Anzeigen erfassen** fasst die gewählte Kombination aus Erfassungsumfang und Prüfmodus unter **Auswahl im Überblick** verständlich zusammen. Während Fortschritt und Ergebnis wird dieselbe Auswahl neutral dargestellt; nach Abschluss verwendet die Zusammenfassung Vergangenheitsform statt Warnfarb-Semantik.

Das Manager-Fenster öffnet neu mit **1180 × 900 Pixeln**. Chrome Extensions unterstützen bei `chrome.windows` keine echte native Mindestbreite/-höhe; deshalb wird bewusst keine Resize-Emulation verwendet, die das Fenster beim Verkleinern sichtbar zurückspringen lassen würde. Das bestehende responsive Layout bleibt erhalten.


## v1.19.5 – frischer Start jeder Erfassung und stabiler Fortschritt

Jede neue Erfassung öffnet jetzt einen eigenen verwalteten „Meine Anzeigen“-Hintergrundtab. Ein Tab aus einer vorherigen Erfassung wird nicht mehr wiederverwendet oder neu geladen. Vor dem Start prüft die Erweiterung intern weiterhin das erwartete Kleinanzeigen-Konto, die PROJECTS-Ansicht und Seite 1. Ein fehlgeschlagener Start ist auf höchstens zwei frische Tabs begrenzt; Reload-Schleifen sind ausgeschlossen.

Der Erfassungsdialog wurde außerdem strukturell harmonisiert: Der Fortschritt steht direkt unter der Einleitung und bleibt beim Wechsel zwischen den Schritten an derselben Stelle. Schritt 1 heißt **Einstellungen**. Nur der wechselnde Schrittinhalt scrollt; die Orientierung und die Aktionsleiste bleiben stabil.

Das bestehende Account-Gate vor dem Start, Delta-/Vollerfassung, Schnell-/Vollprüfung, H1/H2 und die sichere Phase-3-Reconciliation bleiben unverändert.

## v1.19.4 – frischer Phase-3-Tab für den sicheren Bestandsabgleich

Die zweite Bestandsprüfung **Bestand bestätigen** verwendet nicht mehr den bereits durch Seite 1, 2, 3 usw. navigierten Quelltab. Nach Abschluss der eigentlichen Erfassung wird für Phase 3 ein **frischer Hintergrundtab** mit „Meine Anzeigen“ geöffnet. Dadurch hängt der zweite Scan nicht mehr vom im vorherigen Tab erhaltenen Paginierungszustand ab.

Vor Beginn des zweiten Scans werden die neue „Meine Anzeigen“-Ansicht, der PROJECTS-Tab, das erwartete Kleinanzeigen-Konto, **Seite 1** und die erwartete Online-Anzahl ausdrücklich geprüft. Erst nach erfolgreicher Verifikation beginnt der zweite vollständige ID-Bestandsabgleich. Die ID-Menge der ersten Seite wird nicht als Gleichheits-Gate verwendet; maßgeblich bleibt der vollständige Vergleich beider Bestände.

Der bisherige Reset über `location.replace()` entfällt vollständig. Schlägt der frische Start transient fehl, ist genau ein weiterer frischer Tab als Recovery erlaubt. Danach endet die Erfassung sicher mit **Prüfung nötig**; bereits gespeicherte Daten bleiben erhalten und es findet keine automatische Reconciliation beziehungsweise Papierkorb-Verschiebung statt. Damit werden H3 (keine Reload-Schleifen) und H4 (keine Bereinigung nach unvollständigem Bestandsabgleich) weiter gehärtet.

Delta-Erfassung, Schnell-/Vollprüfung, H1/H2, kontrollierter Stopp, Publish-/Delete-Gates und die übrige v1.19.3-Logik bleiben unverändert.

## v1.19.3 – kompakter Erfassungsdialog und konsistente Endanwender-Sprache

Der Dialog **Alle laufenden Anzeigen erfassen** bündelt die beiden Einstellungen für den aktuellen Vorgang in einer gemeinsamen Box **Einstellungen für diese Erfassung**. Zuerst wird unter **Erfassungsumfang** festgelegt, was eingelesen werden soll; darunter bestimmt der **Prüfmodus**, wie geprüft wird.

Der Standard **Nur neue Anzeigen erfassen** steht bei jedem Öffnen an erster Stelle. Die bewusste Vollerfassung heißt **Gesamten Bestand neu einlesen**. Die Begleittexte sind kürzer und erklären direkt, ob bereits gespeicherte Anzeigen unangetastet bleiben oder vollständig neu eingelesen werden. Schnellprüfung und Vollprüfung verwenden ebenfalls kürzere, nutzenorientierte Beschreibungen.

Sichtbare technische Begriffe wie **Massenlauf** und **Inventurlauf** wurden aus Runtime-Meldungen entfernt. Inventurmeldungen sprechen konsequent von **Erfassung**; das gemeinsame Neu-Inserieren wird konkret als **Neu inserieren** oder neutral als **Vorgang** bezeichnet.

Die Logik aus v1.19.2 bleibt unverändert: Delta-Erfassung erkennt bestehende Anzeigen weiterhin ausschließlich über die Anzeigen-ID, der vollständige doppelte Bestandsabgleich bleibt erhalten, und Prüfmodusänderungen im Dialog wirken nur auf die aktuelle Erfassung. H1/H2, kontrollierter Stopp und alle Publish-/Delete-Sicherheitsgrenzen bleiben bestehen.

## v1.19.2 – Erfassungsumfang: neue Anzeigen oder vollständige Aktualisierung

Der Dialog **Alle laufenden Anzeigen erfassen** fragt jetzt zuerst **was** erfasst werden soll und danach **wie** geprüft werden soll. Unter **Erfassungsumfang** stehen **Nur neue Anzeigen erfassen** und **Alle Anzeigen aktualisieren** zur Wahl. **Nur neue Anzeigen erfassen** ist bei jedem Öffnen des Dialogs erneut der Standard und wird nicht als dauerhafte Einstellung gespeichert.

Im Standardmodus werden bereits aktive Anzeigen des ausgewählten Inventarprofils anhand ihrer Anzeigen-ID erkannt und bei der Detail-Erfassung übersprungen. Nur bislang unbekannte Anzeigen-IDs werden vollständig eingelesen. Bei einem neuen oder leeren Profil sind keine Anzeigen-IDs bekannt; deshalb werden dort automatisch alle gefundenen laufenden Anzeigen vollständig erfasst. Wer auch bereits gespeicherte Anzeigen neu einlesen möchte, wählt für den jeweiligen Lauf ausdrücklich **Alle Anzeigen aktualisieren**.

Der darunterliegende **Prüfmodus** übernimmt beim Öffnen den in der Konfiguration hinterlegten Standard für Schnellprüfung oder Vollprüfung. Eine Änderung im Erfassungsdialog gilt nur für den gestarteten Lauf und schreibt nicht in die Konfiguration zurück. Beide Erfassungsumfänge können mit beiden Prüfmodi kombiniert werden.

Die Optimierung betrifft ausschließlich die teure Detail-Erfassung. Der vollständige erste Anzeigen-ID-Bestand und die unabhängige zweite Bestandsbestätigung bleiben bestehen. Dadurch bleiben die Reconciliation-Sicherheitsgrenzen erhalten: Nur zwei vollständige, übereinstimmende Bestände dürfen eine automatische Verschiebung nicht mehr online vorhandener lokaler Anzeigen in den Papierkorb freigeben. H1/H2 und der kontrollierte Inventur-Stopp aus v1.19.1 bleiben unverändert.

## v1.19.1 – HARDENING H1/H2: Plattform-Sperren und kontrollierter Safety-Stop

v1.19.1 erkennt die bekannte Kleinanzeigen-Sperrseite **„IP-Bereich vorübergehend gesperrt“** als eigenen Safety-Zustand. Eine erkannte Sperre wird nicht wie ein normaler Lade- oder Transportfehler behandelt und deshalb nicht von den üblichen Retry-Schleifen erneut angefragt. Der Zustand wird persistent gespeichert, damit ein Service-Worker-Neustart keine automatischen Abläufe wieder aufnimmt.

Sobald die Sperre eindeutig erkannt ist, greift ein globaler Kleinanzeigen-Safety-Stop: Neue automatisierte Kleinanzeigen-Tabs, Navigationen und Remote-Workflow-Aktionen werden blockiert; laufende Inventur-, Renewal-, Vorlagen-, Archiv- und Massenläufe werden in einen sicheren Endzustand überführt. Lokale Funktionen wie Inventar/Papierkorb ansehen, Sicherungen und Diagnose bleiben verfügbar. Eine erneute Prüfung erfolgt ausschließlich auf ausdrückliche Nutzeraktion über **Erneut prüfen**.

Die Vollinventur erhält zusätzlich **Nach aktueller Anzeige stoppen**. Ein angeforderter Stopp lässt die gerade bearbeitete Anzeige vollständig zu Ende laufen, startet danach keine weitere Anzeige und überspringt den Bestandsabgleich. Bereits aktualisierte Anzeigen bleiben erhalten; das Ergebnis zeigt transparent, wie viele Anzeigen abgeschlossen und wie viele nicht mehr bearbeitet wurden.

PERFORMANCE-5 aus v1.19.0 bleibt unverändert. PERFORMANCE-6 bleibt offen; P7 bleibt als Teilpaket von A6 geführt.

## v1.19.0 – PERFORMANCE-5: schnellere Bildpipeline

Beim Neu-Inserieren bleiben Bild-Uploads weiterhin strikt nacheinander. Sobald ein Bild serverseitig angelegt ist, muss seine Vorschau-/CDN-Stabilisierung den Upload des nächsten Bildes jedoch nicht mehr blockieren. Bereits angelegte Bilder dürfen im Hintergrund weiter stabilisieren, während das nächste Bild hochgeladen wird.

Vor einem erfolgreichen Abschluss werden weiterhin alle ausstehenden Vorschauprüfungen zusammengeführt. Die verpflichtende Endkontrolle auf vollständige Bildanzahl, stabile Vorschauen und korrekte Reihenfolge bleibt unverändert. Es gibt weiterhin keine parallelen Bild-Uploads.

PERFORMANCE-6 bleibt offen. Das frühere PERFORMANCE-7 wird nicht mehr separat geführt, sondern als Teilpaket von **A6 – Event-driven Lifecycle/Health**.

## v1.18.4 – Endanwenderfreundliche Texte und kompaktere Hinweise

v1.18.4 überarbeitet ausschließlich sichtbare UX-Texte und die Darstellung der **Abgeleitet**-Kennzeichnung. Schnell- und Vollprüfung erklären jetzt den jeweiligen Nutzen ohne interne Browser-/Workflow-Begriffe. Der Bestandsabgleich wird als zweite Sicherheitsprüfung beschrieben und nennt bei Abweichungen direkt die Konsequenz: Es wird nichts automatisch in den Papierkorb verschoben.

Die Badge **Abgeleitet** ist kleiner und gelb/amberfarben. Der Tooltip führt direkt zur passenden Aktion: **„Aus Enddatum berechnet. Mit „Daten aktualisieren“ direkt prüfen.“**

Im Profilmanagement heißen die Aktionen **Profil sichern**, **Profil aus Sicherung wiederherstellen** und **Profil entfernen**. Massen-Neuinserat, Austauschfortschritt und Erfassungsdialoge verwenden kürzere, konsistente Begriffe. Der ZIP-Schnellmodus bezeichnet die ausgelassene Kontrolle als **Zusätzliche Inhaltsprüfung wird übersprungen**.

Die zugrunde liegende Workflow-, Prüf-, Backup-, Reconciliation-, Retry-, Publish- und Löschlogik ist gegenüber v1.18.3 unverändert.

## v1.18.3 – Papierkorb-Fix, transparenter Inventur-Prüfmodus und kompakte Reihenfolgeaktionen

Der manuelle **In Papierkorb**-Pfad gibt nach erfolgreichem IndexedDB-Commit wieder den tatsächlich verschobenen Datensatz zurück. Damit kann ein bereits erfolgreich in den Papierkorb geschriebener Datensatz nicht mehr durch den nachgelagerten `ReferenceError: trashed is not defined` als fehlgeschlagen gemeldet werden. Derselbe Helper ist damit auch für den lokalen Renewal-Kandidaten-Entfernungspfad wieder korrekt.

Der Dialog **Alle laufenden Anzeigen erfassen** zeigt den für den Lauf geltenden Prüfmodus jetzt dauerhaft sichtbar an. In der **Schnellprüfung** wird transparent erklärt, dass der öffentliche Read-only-Tab pro Anzeige entfällt und `Anzeige vom` bei Bedarf aus `Endet am` abgeleitet wird; in der **Vollprüfung** wird die zusätzliche direkte Read-only-Verifikation erklärt. Bei einem laufenden oder wieder geöffneten Bulk-Lauf stammt die Anzeige aus dem im Lauf gespeicherten `verificationMode`, nicht aus einer eventuell später geänderten Konfiguration.

Im Schritt **Reihenfolge festlegen** bilden Drag-Handle, Hoch- und Runter-Pfeil nun rechts außen eine gemeinsame kompakte Aktionsgruppe in der Reihenfolge **[Drag][↑][↓]**. Positionsnummer, Titelbild und Anzeigendaten bleiben links.

## v1.18.2 – Schnellinventur ohne Read-only-Tab und Papierkorb-Friststeuerung

Der Inventur-Dialog verwendet jetzt die eindeutigen Schritte **Bestand laden**, **Anzeigen erfassen**, **Bestand bestätigen** und **Ergebnis**. Ist in der Konfiguration **Schnellprüfung** gewählt, öffnet die Vollinventur pro Anzeige keinen zusätzlichen öffentlichen Read-only-Metadaten-Tab mehr. Das sichtbare `Endet am`-Datum aus „Meine Anzeigen“ bleibt die Remote-Quelle; daraus wird `Anzeige vom` heuristisch mit einer bewusst angenommenen Laufzeit von 60 Tagen abgeleitet. Dieser Wert wird intern als abgeleitet gespeichert und in der UI mit **Abgeleitet** gekennzeichnet. Die Vollprüfung behält den direkten Read-only-Pfad und kann einen heuristischen Wert durch direkt verifizierte Metadaten ersetzen. Verlängerungen und Wiederveröffentlichungen werden für diese erste Schnellprüfungs-Optimierung bewusst nicht gesondert verifiziert.

Im Papierkorb steht der allgemeine Hinweis zur fehlenden Rückverschiebung ins Inventar jetzt einmal zentral. Pro Eintrag gibt es zusätzlich **30 Tage neu starten**. Die Aktion setzt ausschließlich die lokale Aufbewahrungsfrist ab dem aktuellen Zeitpunkt zurück; der Eintrag bleibt im Papierkorb und löst weder eine Inventar-Wiederherstellung noch eine Kleinanzeigen-Aktion aus.

Die Sicherheitsmechanismen aus v1.18.1 bleiben unverändert: doppelter unabhängiger Remote-Roster vor Reconciliation, vollständiger Profil-Backup/-Restore, Konto-/Profilbindung, globaler Inserierungs-Lock, konfigurierbare Phase-Retries, Modal-Scroll-Lock und unabhängige Phase-4-Abwesenheitsprüfung.

## v1.18.1 – sicherer Bestandsabgleich und vollständige Profil-Backups

Ein erfolgreicher Vollinventurlauf endet jetzt nicht mehr beim Upsert der gefundenen Anzeigen. Parallel wird ein expliziter Remote-ID-Bestand aufgebaut. Nach Abschluss der eigentlichen Inventarisierung führt die App einen **zweiten unabhängigen Vollscan** von „Meine Anzeigen“ durch und zeigt diesen Sicherheitscheck im Modal als eigenen Schritt **Bestand prüfen**. Nur wenn beide vollständigen Remote-Roster exakt übereinstimmen, dürfen lokal aktive Einträge desselben Profils, deren Anzeigen-ID remote nicht mehr existiert, kontrolliert in den 30-Tage-Papierkorb verschoben werden. Bei Abweichungen, unvollständigem Paging, Count-Mismatch, Accountwechsel oder Unterbrechung bleibt der lokale Bestand unangetastet und der Lauf zeigt Prüfbedarf. Workflowgeschützte Datensätze werden nicht bereinigt; Titel- oder Inhaltsähnlichkeit ist niemals Löschbeweis.

Das Profilmanagement bietet zusätzlich einen vollständigen **Profil-Backup-Export/-Import** als versioniertes ZIP. Gesichert werden Profilmetadaten, das gesamte aktive Inventar, der komplette Papierkorb einschließlich 30-Tage-/Löschmetadaten sowie alle referenzierten lokalen Bilder mit Integritätsprüfungen. Existiert dieselbe Profilidentität bereits lokal, gibt es ausschließlich die ausdrücklich zu bestätigende Option **Bestehendes Profil vollständig ersetzen** – keinen Merge und kein Duplikatprofil. Laufende oder terminale Renewal-/Massenlauf-Sessions werden nicht aus dem Backup als Workflowzustand importiert oder reaktiviert.

Die Sicherheitsgrenzen aus v1.18.0 bleiben erhalten: keine direkte Publish-Submission, Konto-/Profilbindung, globaler Inserierungs-Lock, strikt sequenzielle Massenverarbeitung und die unabhängige Phase-4-Abwesenheitsprüfung bleiben unverändert.

## v1.18.0 – Massen-Reihenfolge, Papierkorb-Sicherung und UI-Polish

Der Dialog **Mehrere Anzeigen neu inserieren** besitzt jetzt vier Schritte. Nach der Auswahl folgt **Reihenfolge festlegen**: Die gewählten Anzeigen werden zunächst exakt in der sichtbaren Tabellenreihenfolge aus Schritt 1 übernommen und können anschließend per Drag-and-drop oder über Hoch-/Runter-Schaltflächen umsortiert werden. Diese Reihenfolge wird unverändert an den strikt sequenziellen Massenlauf übergeben und bleibt in Fortschritt und Übersicht erhalten. In Schritt 1 kann zusätzlich die gesamte Tabellenzeile zur Auswahl angeklickt werden; die Checkbox bleibt synchron und direktes Anklicken verursacht keinen Doppel-Toggle.

Papierkorb-Einträge bieten nun ebenfalls **Als ZIP exportieren**. Der Export verwendet denselben integritätsgeprüften lokalen ZIP-Pfad wie das Inventar und verändert weder Papierkorb-Datensatz noch Wiederherstellungs- oder Löschzustand. Der Diagnosebereich reserviert im Leerzustand keinen unnötigen Ausgaberaum mehr. Scrollbars sind an das dunkle Cyan/Grün-Design der App angepasst; die native Windows-/Chrome-Titelleiste bleibt systemseitig unverändert.

Der in v1.17.10 nativ isolierte Taskleisten-Icon-Fix bleibt unverändert erhalten. Ebenso bleiben Profil-/Kontobindung, globaler Inserierungs-Lock, strikt sequenzielle Massenverarbeitung, unabhängige Phase-4-Abwesenheitsprüfung und alle Publish-Sicherheitsgrenzen bestehen.

## v1.17.10 – Windows-Taskleisten-Icon ohne sichtbare Namensregression

Die native Windows-Isolation der Probes C/D/E hat gezeigt, dass `action.default_title` allein hinreichend ist, damit das separate Popup-Appfenster wieder das korrekte Taskleisten-Icon erhält. Deshalb bleibt der sichtbare Produktname vollständig **„kleinanzeigen Manager“** (`manifest.name` und `app.html <title>`); ausschließlich der interne Action-Titel wird auf den bewährten Identitätswert **„Kleinanzeigen Renewal“** zurückgesetzt.

`type: "popup"`, sämtliche Icon-Assets, Extension-ID, Manifest-Key, Permissions, Host-Permissions und alle fachlichen Sicherheitsgrenzen bleiben unverändert. Die Änderung basiert auf dem nativ erfolgreichen Probe-E-Test vom 18.09.2026.

## v1.17.9 – UI-State-Fix, erwartete Tab-Enden und Windows-Icon

Der manuelle Aktualisieren-Button sequenziert die frische Kleinanzeigen-Konto-/Tab-Prüfung jetzt vor dem Inventar-Render. Dadurch werden accountgebundene Zeilenaktionen nach `checking → ready` zuverlässig wieder freigegeben, auch wenn dasselbe Konto erkannt wurde.

Kontrolliert geschlossene Renewal-/Worker-Tabs bleiben über den TabRegistry-Tombstone als erwartetes Lifecycle-Ende korreliert. Nachlaufende Content-Bootstrap-, Background- oder App-Health-Anfragen erzeugen dafür keine künstliche Warning/Error-Kaskade mehr; unerwartete Tab-Verluste bleiben Fehler.

Das Windows-Fenster-/Taskleisten-Icon verwendet nun ein echtes Multi-Resolution-ICO mit 16/32/48/64/128/256 px. App-Header und Erweiterungsbeschreibung beschreiben den kontrollierten Neu-Einstell-, Prüf- und Austauschworkflow genauer; der Prüfmodus-Hinweis zu den Versuchen je Phase erhält mehr Abstand zur unteren Trennlinie.

## v1.17.8 – lokale Feld-Retries und direkter Phase-3-My-Ads-Pfad

Phase 1 behandelt transiente UI-/DOM-Probleme bei interaktiven Merkmalen jetzt lokal, bevor ein kompletter Erstellversuch verworfen wird. Dynamische `attributeMap[...]`-Felder erhalten bis zu drei zustandsgeprüfte lokale Versuche. Das gilt sowohl für modal-/buttonbasierte Merkmale wie Farbe oder Zustand als auch für Such-/Autocomplete-Felder wie Marke. Vor jedem Versuch wird der technische Istwert erneut geprüft, das aktuelle Control frisch aufgelöst und weiterhin ausschließlich ein exakt passender Zielwert akzeptiert. Suchfelder werden bei Bedarf erneut fokussiert, geleert, schrittweise beschrieben und per `ArrowDown` nur zum Öffnen der Vorschlagsliste angestoßen; es wird nie nach Listenposition geraten. Erst nach drei lokalen Fehlschlägen darf der übergeordnete Phase-1-Versuch scheitern.

In der Vollprüfung startet Phase 3 ohne bereits bekannte kanonische Public-URL nicht mehr mit einer konstruierten `/s-anzeige/<adId>`-Adresse. Der frische Prüfworker öffnet stattdessen direkt **Meine Anzeigen**, löst dort die neue Anzeigen-ID auf und verwendet anschließend die echte öffentliche URL mit Slug für die Read-only-Prüfung. Wenn bereits eine belastbare kanonische Public-URL vorliegt, darf diese weiterhin direkt geprüft werden. Prüfsemantik, Profilbindung und Sicherheitsgrenzen bleiben unverändert.

## v1.17.7 – PERFORMANCE-1 bis -4: weniger I/O, robustere Navigation und weniger Phase-4-Loads

Der erste PERFORMANCE-Block optimiert gezielt langsame Rechner, ohne Sicherheits- oder Sequenzialitätsgrenzen zu lockern. Routinemäßige Diagnoseereignisse werden kurz im Speicher gesammelt und gebündelt persistiert; Warning/Error-, Safety-, Recovery- und terminale Ereignisse bleiben sofort persistent. Nicht-terminale Fortschrittsupdates des Massenlaufs werden pro Renewal zusammengefasst, während terminale Zustände weiterhin unmittelbar in den Batch übernommen werden.

Der Content-Script-Bootstrap ist navigation-aware: Während ein Kleinanzeigen-Tab noch lädt, wird keine aggressive Vollinjektion gestartet. Stattdessen wartet die App auf einen stabilen Navigationszustand, prüft danach erneut die deklarativ geladenen Content-Scripts und injiziert nur bei Bedarf. Navigation-bedingte Rennen werden als retrybarer Lifecycle-Zustand behandelt statt eine Bootstrap-Fehlerkaskade zu erzeugen.

In Phase 4 sind die frische Vorprüfung und die Löschaktion in demselben frisch geöffneten Worker verbunden. `DELETE_OWN_AD_BY_ID` führt vor jeder möglichen Löschaktion weiterhin den vollständigen paginierten Scan nach der alten Anzeigen-ID aus und klickt nur bei eindeutigem Treffer. Der danach verpflichtende unabhängige frische `VERIFY_OWN_AD_ABSENT_BY_ID`-Vollscan bleibt unverändert autoritativ; Transportabbrüche sind weiterhin niemals Löschbeweis und die atomare Promotion bleibt an `source-delete-verified` gebunden.

## v1.17.6 – Geführte Papierkorb-Vorlage und ruhigeres Accordion

**Als Vorlage neu inserieren** aus dem Papierkorb verwendet jetzt einen geführten Dialog. Vor dem Start wird die ausgewählte Vorlage mit Titelbild und Kerndaten nochmals gezeigt und ausdrücklich bestätigt. Nach erfolgreicher Vorbefüllung fordert der Dialog dazu auf, die Angaben im Kleinanzeigen-Tab zu prüfen und die Anzeige manuell über **Anzeige aufgeben** zu veröffentlichen; es gibt weiterhin keinen automatischen Publish.

Der bekannte Ziel-Tab wird danach passiv beobachtet. Sobald dort eindeutig eine eigene veröffentlichte Anzeige mit neuer Anzeigen-ID erkannt wird, schaltet der Dialog **Diese Anzeige inventarisieren** frei. Die Einzelinventur verwendet direkt diesen bekannten Tab und überspringt den sichtbaren Auswahl-Schritt; Profilbindung und die bestehenden Sicherheitsgrenzen bleiben erhalten. Der Papierkorb-Quelldatensatz bleibt unverändert.

Die Single-Open-Accordion-Bereiche **Aktionen**, **Konfiguration** und **Diagnose** öffnen und schließen jetzt mit einer kurzen, reduzierbaren Höhenanimation. Die Header-Trennlinie ist als dezenter 1-px-Cyan-Akzent ausgeführt.

## v1.17.5 – Header-Navigation und kompakter Konto-Status

- `Inventar | Papierkorb` sitzt als globale Ansichts-Navigation rechts im App-Header direkt an der Trennlinie zum Content.
- Die Accordion-Header sind konsistent linksbündig; der geöffnete Bereich wird cyan hervorgehoben.
- Unter der Inventarprofil-Auswahl bleibt nur eine kompakte Kontozeile mit Statuspunkt; redundante Konto-Erklärtexte wurden entfernt.

## v1.17.4 – kompakter Header, Content-Navigation und Single-Open-Seitenleiste

Der sichtbare Produktname lautet jetzt **„kleinanzeigen Manager“**. Der Header zeigt nur noch Produktname, Version und Untertitel; „Inventar“ bleibt als Inhaltsansicht bestehen, nicht mehr als redundanter Produkttitel.

Die linke Seitenleiste verwendet **Aktionen**, **Konfiguration** und **Diagnose** als Single-Open-Accordion. Standardmäßig ist Aktionen geöffnet. Inventarprofil und Live-Konto bleiben jederzeit sichtbar. Ein pulsierender Punkt am Aktionen-Header signalisiert laufende Workflows, auch wenn der Bereich eingeklappt ist.

Die Ansichten **Inventar** und **Papierkorb** sind als angedockte Navigation oberhalb des rechten Inhaltsbereichs angeordnet. Die manuelle Aktualisierung ist eine kompakte Icon-Aktion im Inventarkopf; weitreichende Aktionen wie **Alle in Papierkorb** bleiben ausgeschrieben.


## v1.17.3 – Konsistenter Kontostatus und UI-Microcopy

Beim Wechsel des Inventarprofils prüft die App das aktuell angemeldete Kleinanzeigen-Konto jetzt unmittelbar neu. Während der kurzen Prüfung bleiben Live-Aktionen gesperrt; anschließend werden Kontostatus, Aktionsfreigaben und Tooltips gemeinsam aus dem frisch bestätigten Konto und dem frei gewählten Inventarprofil aufgebaut. Das Inventarprofil wird durch die Prüfung niemals automatisch umgeschaltet.

Laufende Vollinventur-Statuskarten verwenden statt des Schließen-`×` nun eine Chevron-Aktion **„Fortschritt minimieren“**. Der Lauf wird dadurch nicht beendet und bleibt über den kompakten **„Fortschritt anzeigen“**-Wiedereinstieg erreichbar. Terminale Meldungen behalten das `×` zum Ausblenden.

Die Konfigurationsbeschreibung **„Versuche je Phase“** wurde platzsparend formuliert. Zusätzlich wurden sichtbare Konto-, Prüf- und Fehlertexte vereinheitlicht: Live-Konto und Inventarprofil werden klar getrennt, technische Begriffe wie „Kleinanzeigen-Sitzung“ oder „Inhaltskontrolle“ wurden aus der Bedienoberfläche entfernt, und „Prüfbedarf/Prüfung nötig“ ersetzt uneinheitliche „Aufmerksamkeit“-Formulierungen.


## v1.17.2 – Kontobindung und konsistente Modal-UX

Die App trennt jetzt konsequent das lokal ausgewählte **Inventarprofil** vom live erkannten **Kleinanzeigen-Konto**. Das Inventarprofil kann jederzeit frei gewechselt werden. Live-Aktionen werden nur dann freigegeben, wenn beide Konttexte übereinstimmen; lokale Funktionen wie Ansicht, Export, Profilverwaltung und Papierkorb bleiben davon unabhängig. Eine beliebige geöffnete Kleinanzeigen-Seite reicht für die Kontoerkennung.

**Alle Anzeigen erfassen** setzt keine manuell geöffnete „Meine Anzeigen“-Seite mehr voraus: falls erforderlich, öffnet die App den benötigten Quelltab selbst im Hintergrund. **Geöffnete Anzeige erfassen** bleibt zusätzlich daran gebunden, dass mindestens eine eigene konkrete Anzeige geöffnet und erkannt ist.

Alle sechs nativen Modalfenster besitzen nun einen zentralen Hintergrund-Scroll-Lock. Interne Listen stoppen Scroll-Chaining, verschachtelte Modale entsperren den Hintergrund erst nach dem Schließen des letzten Dialogs, und lange Inhalte bleiben innerhalb des Viewports scrollbar.

Die Einstellung **„Versuche je Phase“** bleibt bei 1–5 Versuchen mit Standard 3; ihre Erklärung wurde für Endanwender verkürzt und weist auf die mögliche längere Laufzeit bei höheren Werten hin.

## v1.17.1 – Konfigurierbare Retry-Strategie für alle Renewal-Phasen

Unter **Konfiguration → Prüfmodus** steht jetzt **„Versuche je Phase“** mit einem Bereich von 1 bis 5 und dem Standardwert 3 zur Verfügung. Der eingestellte Wert ist die maximale Gesamtzahl der Versuche pro Phase, nicht die Zahl zusätzlicher Wiederholungen. Ein laufender Einzel- oder Massenlauf behält den beim Start übernommenen Wert, auch wenn die Konfiguration später geändert wird.

Phase 1 kann bei transienten Ausfüllproblemen den gesamten noch unveröffentlichten Erstellkontext frisch neu aufbauen. Lokale UI-Retries einzelner Felder bleiben davon getrennt. Die Kategorieauswahl verwendet bis zu drei frische semantische Klickversuche mit jeweils bis zu 10 Sekunden Bestätigungszeit und besitzt keinen hardcodierten Navigations-Fallback mehr. Sobald Publish ausgelöst wurde oder eine neue Anzeigen-ID bestätigt ist, darf Phase 1 nicht erneut gestartet werden.

Phase 2 und Phase 3 wiederholen nur ihre jeweilige Prüfung derselben bereits veröffentlichten neuen Anzeige; es wird nicht erneut inseriert. Im Schnellprüfungsmodus bedeutet das für Phase 3 mehrere begrenzte Fast-Presence-Versuche mit jeweils frischem Prüfworker. Eindeutige fachliche oder Sicherheitsabweichungen werden nicht blind wiederholt.

Phase 4 bleibt beweisorientiert: Vor jedem möglichen erneuten Delete wird die alte Anzeigen-ID mit einem frischen unabhängigen Vollscan geprüft. Ist sie bereits nachweislich verschwunden, wird nicht erneut gelöscht. Ist sie nachweislich noch vorhanden, darf ein weiterer Löschversuch erfolgen; danach ist erneut ein frischer `VERIFY_OWN_AD_ABSENT_BY_ID`-Nachweis erforderlich. Eine Transportunterbrechung ist niemals Löschbeweis, und die atomare Promotion bleibt an `source-delete-verified` gebunden.

Die bestehenden A1b-/A2-, Profilbindungs-, Inserierungs-Lock-, Auto-Publish-, Papierkorb- und Massenlauf-Sicherheitsgrenzen bleiben erhalten.


## v1.17.0 – A1b TabRegistry als autoritative Lifecycle-Schnittstelle

A1b schließt den schrittweisen Tab-Lifecycle-Ausbau auf Basis von A1a ab. Die `TabRegistry` besitzt jetzt owner-sichere terminale Ownership-Freigabe sowie zentrale Close-/Reload-Operationen. Bekannte `gone`-Tombstones werden bei verspäteten Requests unmittelbar als `KR_TAB_GONE` klassifiziert, ohne den bereits geschlossenen Tab erneut über `chrome.tabs.get()` aufzulösen.

Bulk-Source-Ownership wird bei Abschluss, Fehler, Stale-Timeout und Retry-Ende generation-/owner-sicher freigegeben. Ein fehlgeschlagener frischer Bulk-Preflight hinterlässt keine verwaiste Ownership; ein verspäteter alter Run kann die Ownership eines neueren Runs nicht löschen. Beim Service-Worker-Reconcile werden terminale Bulk-Runs nicht erneut als aktive Registry-Ownership rekonstruiert.

Discarded-Reaktivierung läuft über die Background-/Registry-Fassade statt direkt aus der UI; `chrome.tabs.reload()` bleibt dabei im Hintergrund und erzeugt keinen Fokuswechsel. Ausgewählte Bulk-/Renewal-Cleanup-Pfade verwenden die zentralen Registry-Close-Semantiken und erzeugen dadurch konsistente `gone`-Tombstones mit erhaltener Correlation. A2-Correlation, Auto-Publish-Hard-Gate, Profilbindung, Inserierungs-Lock, Voll-/Schnellprüfung, Phase-4-Löschbeweis, atomare Promotion und 30-Tage-Papierkorb bleiben unverändert.

Mit v1.17.0 gilt A1b implementierungsseitig als abgeschlossen. Der nächste Architekturblock ist **A3a – Renewal Mutation Boundary**.


## v1.16.9 – Entkoppelter Inventarisierungs-Reentry und Tab-Reaktivierung

Einzel- und Vollinventur teilen weiterhin denselben visuellen Dialog, ihr Wiedereinstieg ist jetzt jedoch strikt identitätsgebunden. Eine laufende bzw. abgeschlossene Einzelinventur wird ausschließlich über ihre Anzeigen-ID wieder geöffnet; eine Vollinventur ausschließlich über ihre Run-ID. Ein alter Bulk-Ergebniszustand kann dadurch keinen späteren Single-Workflow mehr übernehmen. Während eine Inventarisierungsart läuft, kann die andere nicht parallel gestartet werden.

Der kompakte Wiedereinstieg signalisiert den tatsächlichen Zustand: nur aktive Erfassung pulsiert; Erfolg ist statisch grün, Fehler statisch rot und Attention/Prüfbedarf statisch gold.

Wenn Chrome relevante Kleinanzeigen-Tabs pausiert (`discarded`), bietet die Statuskarte **„Kleinanzeigen reaktivieren“** an. Die bekannten pausierten Tabs werden im Hintergrund neu geladen, ohne sie zu fokussieren; danach übernimmt die normale Health-/Lifecycle-Prüfung wieder.


## v1.16.8 – Wiedereinstieg in laufende Inventarisierungen

Wird eines der Inventarisierungsmodale während der Bearbeitung geschlossen, läuft der Vorgang unverändert weiter und kann anschließend wieder geöffnet werden. Bei **Alle Anzeigen erfassen** bietet die persistente Statuskachel „Fortschritt anzeigen“ und nach einem terminalen Zustand „Ergebnis anzeigen“. Wird diese Kachel ausgeblendet, bleibt ein kompakter Wiedereinstieg erhalten. Bei **Geöffnete Anzeige erfassen** erscheint nach dem Ausblenden ebenfalls ein kompakter Wiedereinstieg, der während der Bearbeitung zum Fortschritt und nach Abschluss direkt zum Ergebnis führt. Der Wiedereinstieg startet niemals einen zweiten Inventarisierungsvorgang.


## v1.16.6 – Microcopy für Inventarisierungsdialoge

Die beiden Inventarisierungsdialoge verwenden konsistent die nutzernahen Begriffe **Prüfen → Erfassen → Ergebnis**. Technische Begriffe wie „Read-only“, „Hintergrund-Bearbeiten-Worker“ und „Inventurlauf“ wurden aus der normalen Dialogsprache entfernt, soweit sie für die Bedienentscheidung nicht erforderlich sind.

Bei **Geöffnete Anzeige erfassen** lautet die Aufgabe jetzt direkt „Geöffnete Anzeige auswählen“. Mehrfach geöffnete Ansichten derselben Anzeige werden in der Erklärung nutzerorientiert als eine einzige Anzeige beschrieben; in den Kandidatenkarten werden nur Titelbild, Titel und Anzeigen-ID gezeigt. Fortschrittstexte beschreiben das Auslesen und Speichern, ohne interne Worker-Begriffe.

Bei **Alle Anzeigen erfassen** bleiben Refresh, Profilbindung, sequentielle Verarbeitung und alle Sicherheits-/Lifecycle-Grenzen unverändert. Die sichtbaren Texte sprechen durchgehend von „Erfassung“ und erklären, dass immer nur eine Anzeige gleichzeitig verarbeitet wird.

## v1.16.4 – Galerie-Root-IMG-Fix für Kandidatenbilder

- Öffentliche Kleinanzeigen-Seiten, bei denen `#viewad-image` selbst ein `<img>` ist, werden jetzt korrekt ausgewertet: der Galerie-Root wird als eigener Bildkandidat berücksichtigt.
- Dadurch kann die Kandidatenauswahl das reale Titelbild auch dann verwenden, wenn `og:image` nur das generische Kleinanzeigen-Logo enthält und das Hauptbild direkt auf `#viewad-image` liegt.
- Der Fix liegt im gemeinsamen `image-extractor.js` und verbessert damit nicht nur die Kandidatenvorschau, sondern die öffentliche Galerieerkennung generell.
- Neue RED→GREEN-Tests `v1164-gallery-root-img*`; Inventarisierungs-, A1-/A2-, Publish- und Phase-4-Semantik bleiben unverändert.

## v1.16.3 – Kandidatenbild-Fallback und Ergebnisdetails der Einzelinventur

- Die Kandidatenvorschau verwendet `og:image` nur noch, wenn es bereits ein echtes Anzeigenbild vom Host `img.kleinanzeigen.de` ist. Generische Kleinanzeigen-Logos von `static.kleinanzeigen.de` werden verworfen; anschließend wird das Titelbild aus der echten Galerie bzw. Edit-Bildstruktur verwendet.
- Nach erfolgreicher Einzelinventur zeigt das Ergebnis-Modal die tatsächlich persistierte Anzeige nochmals als Detailkarte mit lokalem Titelbild, Titel, Kategorie, Art, Preis/Preistyp, Enddatum, Anzeigendatum, Speicherzeitpunkt und Anzeigen-ID.
- Kandidatenauswahl, Edit-Worker-Unterbau und Sicherheitsarchitektur bleiben unverändert.

## v1.16.2 – Auswahl geöffneter Anzeigen für die Einzelinventur

Bei **„Geöffnete Anzeige erfassen“** wird die Zielanzeige jetzt sichtbar ausgewählt. Alle geöffneten eigenen Anzeigen mit stabiler Anzeigen-ID erscheinen als kompakte Kandidatenkarten mit Titelbild, Titel und Anzeigen-ID. Read-only- und Bearbeiten-Ansicht derselben `adId` werden zu genau einem Kandidaten zusammengeführt; die Anzeige ist die fachliche Identität, nicht der Tab oder Ansichtsmodus. Ist eine Bearbeiten-Ansicht bereits offen, wird sie intern als vollständige Quelle bevorzugt, ansonsten nutzt die bestehende Einzelinventur weiterhin einen verwalteten Edit-Worker. Die gewählte Anzeige bleibt auch während des Fortschritts sichtbar.

## v1.16.1 – Einzelinventur über Bearbeiten-Daten

- **„Geöffnete Anzeige erfassen“** verwendet für eine eigene öffentliche Anzeige nicht mehr die unvollständige Detailansicht als Primärquelle. Die Anzeigen-ID wird aus dem geöffneten Tab übernommen und ein verwalteter, inaktiver Bearbeiten-Worker liest dieselbe Anzeige vollständig über `p-anzeige-bearbeiten.html?adId=...` aus.
- Eine bereits manuell geöffnete bestehende Bearbeiten-Seite wird direkt als vollständige Einzelinventurquelle akzeptiert; neue/ungespeicherte Formulare ohne stabile `adId` bleiben ausgeschlossen.
- Öffentliche Metadaten wie Anzeigen-/Enddatum werden ergänzend aus der öffentlichen Detailansicht bzw. einem separaten Read-only-Worker übernommen, soweit verfügbar. Ein Fehlen dieser Ergänzungsdaten verhindert die vollständige Edit-Erfassung nicht.
- Interne Einzelinventur-Worker sind verwaltete Hintergrund-Tabs und werden nach Erfolg oder Fehler geschlossen. Die geöffnete Benutzerseite bleibt unverändert.
- Keine Änderung an Publish-, Renewal-, Phase-4-, A1-/A2-, Profilbindungs- oder globaler Inserierungs-Lock-Semantik.

## v1.16.0 – Inventarisierungsdialoge

Die Aktionen **„Alle Anzeigen erfassen“** und **„Geöffnete Anzeige erfassen“** verwenden jetzt einen gemeinsamen dreistufigen Modal-Workflow: **Bestätigen → Erfassen → Ergebnis**. Der Vollinventurlauf zeigt den persistenten Bulk-Fortschritt live mit Zähler, aktuellem Titel und Abschlussstatus; die Einzelinventarisierung visualisiert Profilprüfung, Auslesen, Speichern und Inventaraktualisierung. Das Schließen des Fensters während der Bearbeitung beendet den laufenden Vorgang nicht.

## v1.15.7 – A1 Lifecycle-Fix + UI-Polish

- Geschlossene aktive Bulk-Worker werden über die TabRegistry sofort als `KR_TAB_GONE` terminalisiert; kein 90-Sekunden-Warten mehr auf bereits entfernte Tabs.
- Tombstones klassifizieren verspätete Bulk-Worker-Requests weiterhin als bekannten `gone`-Lifecycle.
- Failure-/Retry-Karten können die Status-Parent-Kachel nicht mehr horizontal überlaufen.
- Das Bulk-Feedback-Popover auf „Meine Anzeigen“ kann per `×` ausgeblendet werden und erscheint erst wieder für eine neue Meldungsinstanz.

## v1.15.6 – A1a TabRegistry / Lifecycle-Fassade

Die zentrale `tabRegistryV1` spiegelt Tab-Rollen, Workflow-Ownership und Lifecycle-Zustände (`active`, `discarded`, `gone`) über eine persistente `chrome.storage.session`-Fassade. Bestehende Managed-Worker/Tombstones bleiben kompatibel. Dieser erste A1-Schritt verändert bewusst weder Fokus-Policy noch Workflow-State-Machine. Zusätzlich bleiben Meldungskacheln bei langen Titeln innerhalb der linken Steuerungsspalte.

Chrome-Erweiterung zum lokalen Erfassen eigener laufender Anzeigen auf Kleinanzeigen.de und zum kontrollierten automatischen Neu-Inserieren aus einer gespeicherten Vorlage.
Nach einer ausdrücklichen Bestätigung übernimmt die App die gespeicherten Angaben und Bilder und veröffentlicht die neue Anzeige ausschließlich hinter dem bestehenden Auto-Publish-Hard-Gate. Für den anschließenden Austausch stehen in der Oberfläche **Vollprüfung** und **Schnellprüfung** zur Verfügung. Intern bleiben die technischen Modi `safe`/`fast` erhalten. In beiden Varianten wird die alte Anzeige erst nach den jeweils vorgesehenen Prüfungen gelöscht, ihre Abwesenheit unabhängig bestätigt und ihre lokale Kopie 30 Tage im Papierkorb erhalten.




### UI-/Lifecycle-Nachschärfung v1.15.5

Vor dem Start von A1 stabilisiert v1.15.5 drei sichtbare UI-Punkte: **Alle Anzeigen erfassen** bleibt während eines laufenden Bulk-Inventurlaufs zuverlässig deaktiviert, weil Health-/Tab-Checks die Button-Aktivierung nicht mehr direkt überschreiben. Die `×`-Aktion aller Statuskacheln unter den Aktionsbuttons sitzt einheitlich in der oberen rechten Ecke. Im Massenlauf zeigt der linke nummerierte Zeilenkreis den höchsten Schweregrad der Anzeige: grün bei Erfolg, gold bei Attention, rot bei Fehler, türkis während der Bearbeitung und grau für neutrale Zustände.

Die Workflow-/Sicherheitsarchitektur bleibt unverändert; A1 beginnt erst auf Basis dieser Version.

### A2-Abschluss v1.15.4

Die Trace-/Correlation-Grundlage umfasst jetzt auch den Bulk-Preflight vor dem Source-Refresh. Diagnose-Summaries berücksichtigen bei einer Parent-Operation deren korrelierte Child-Operationen. Eine erfolgreiche Löschverifikation erzeugt für die erwartete Abwesenheit der Quellanzeige keine Warnung mehr.
Meldungs-/Statuskacheln direkt unter den Aktionsbuttons zeigen zusätzlich einen Zeitstempel und können per `×` ausgeblendet werden, ohne laufende Prozesse, Workflow-Zustände oder Diagnosen zu verändern.

## Version 1.15.3: A2b vollständige Correlation-Propagation

- A2b führt die in v1.15.0 eingeführten Trace-IDs jetzt durch die vollständigen Renewal-, Massen-Renewal- und Bulk-Lebenszyklen. `operationId`, `parentOperationId`, `renewalId`, `fillId`, `bulkRunId`, `runId` und `massBatchId` bleiben an den jeweiligen Workflow-Grenzen erhalten, ohne Legacy-Datensätzen nachträglich IDs zu erfinden.
- Späte Renewal-Ereignisse ab Publish-/New-ID-Bestätigung, Voll-/Schnellprüfung, Phase 4 und `RENEWAL_REPLACEMENT_COMPLETED` verwenden den persistierten Renewal-Kontext. Die Phase-4-Requests `DELETE_OWN_AD_BY_ID`, `FIND_OWN_AD_BY_ID` und `VERIFY_OWN_AD_ABSENT_BY_ID` transportieren die Correlation explizit bis in `inventory-runner.js`.
- Massen-Renewal trennt Batch- und Child-Operation sauber: Batch-Ereignisse tragen die Batch-`operationId`; Item-Ereignisse tragen die Child-`operationId` mit Batch-Operation als `parentOperationId`. Recovery und Watchdog übernehmen vorhandene IDs.
- Tiefe Bulk-Ereignisse wie `BULK_WORKERS_OPENED`, `BULK_WORKER_SAVED`, `BULK_ITEM_FINISHED` und `BULK_INVENTORY_FINISHED` tragen nun die persistierte Run-Correlation. Low-Level-Clientdiagnosen werden zusätzlich über persistierte Source-/Worker-/Metadata-Tab-Bindings dem aktiven Bulk-/Renewal-Workflow zugeordnet.
- Die Diagnose kann dadurch späte Fehler und Abschlussereignisse derselben Operation zuordnen. Das behebt die real beobachteten A2b-RED-Fälle aus den Tests 1–3; eine erneute native Abnahme bestätigt die Laufzeitwirkung.
- Keine A1-TabRegistry, keine A3-Transition-State-Machine und keine Änderung an Fokus-, Publish-, Löschverifikations-, Lock-, Profil- oder Papierkorb-Semantik.
- Neue gezielte Tests `tests/v1153-correlation-propagation.cjs` und `tests/v1153-correlation-runtime.cjs`.

## Version 1.15.2: frischer Bulk-Snapshot und frühe Worker-Terminalisierung

- **Alle Anzeigen erfassen** erzwingt vor jedem neuen vollständigen Lauf einen Reload desselben „Meine Anzeigen“-PROJECTS-Tabs mit Cache-Bypass. Erst nach abgeschlossenem Reload und erneut verbundener Content-Schicht wird der Snapshot gebildet.
- Das nach dem Reload erkannte Profil wird gegen das vor dem Start ausgewählte Profil geprüft. Bei einer einzelnen Seite muss der frische Snapshot exakt so viele eindeutige Anzeigenkarten enthalten wie `N Anzeigen online`; unvollständige/stale Snapshots werden vor dem Start abgewiesen.
- Der Quelltab wird für den Refresh nicht extra fokussiert. Mehrseitige Läufe bleiben sequenziell und verwenden die bestehende Pagination ab dem frisch geladenen Startzustand.
- Ein Edit-Worker, der nach vollständiger Navigation nicht mehr auf `p-anzeige-bearbeiten.html?adId=<erwartete ID>` steht, wird früh terminalisiert. Öffentliche `/s-anzeige/...`-Redirects erzeugen `BULK_EDIT_WORKER_NOT_EDITABLE` statt einer bis zu 90 Sekunden langen Extraktions-Retry-Schleife. Das gilt auch für manuelle Einzel-Retrys.
- Die Diagnose dokumentiert Fresh-Reload und Snapshot über `BULK_SOURCE_REFRESH_STARTED`, `BULK_SOURCE_REFRESHED` und `BULK_SOURCE_SNAPSHOT_CREATED`.
- Keine Änderung an Renewal-/Publish-/Phase-4-/Lock-/Papierkorb-/A2a-Grundsemantik.

## Version 1.15.1: Bulk-Zähler-Kompatibilitätsfix

- **Alle Anzeigen erfassen** akzeptiert jetzt beide real beobachteten Kleinanzeigen-Zählerformate: `N Anzeigen online` sowie `N Anzeigen online / M gesamt`.
- Für `expectedTotal` wird weiterhin ausschließlich der eindeutig ausgewiesene Online-Zähler `N` verwendet; unqualifizierte oder umgestellte Zahlen werden nicht geraten.
- Das bisherige Langformat inklusive deutscher Tausenderpunkte bleibt vollständig unterstützt.
- Keine Änderung an Renewal, A2a-Correlation, Publish, Löschverifikation, Fokus-Policy, Profilbindung oder globalem Inserierungs-Lock.
- `tests/v1151-online-count.cjs` schützt beide real beobachteten Formate sowie Negativfälle.

## Version 1.15.0: A2a Correlation Foundation

- Additive Workflow-Korrelation über `operationId` und optional `parentOperationId`, ohne bestehende fachliche IDs zu ersetzen.
- Renewal und zugehöriger Fill teilen eine Operation; Massen-Neuinserate bilden eine Parent-Operation mit eigenen Child-Operationen pro Einzelworkflow.
- Bulk-Inventarisierung ergänzt `bulkRunId` kompatibel zum bestehenden `runId` und behält `runId` vollständig bei.
- Diagnoseexport und Template-Filler transportieren die neuen Correlation-Felder, damit Recovery-/Lifecycle-Ereignisse in den nächsten Architekturphasen eindeutig zugeordnet werden können.
- Alte v1.14.5-Sessions ohne Correlation-Felder bleiben lesbar/recoverbar. Sicherheits- und Publish-Grenzen sind unverändert.

## Version 1.14.5: kompaktere Diagnose und korrekter Stop-Phasenstatus

- Wiederkehrende reine Info-Ereignisse für Live-Inventar-Refresh und wiederholte Profilerkennung werden in kurzen Zeitfenstern diagnostisch zusammengeführt. Ein Eintrag kann dadurch mehrere gleichartige Vorkommnisse repräsentieren und enthält deren Anzahl sowie ersten/letzten Zeitstempel.
- Der Diagnose-Summary zeigt sowohl die Zahl physisch exportierter Einträge als auch die Zahl der tatsächlich repräsentierten Ereignisse. Dadurch bleibt sichtbar, wie stark komprimiert wurde, ohne das Diagnose-ZIP mit Dutzenden gleichartigen Zeilen zu füllen.
- Der Massen-Neuinserat-Snapshot exportiert die monotone Batch-`revision`, damit State-Mutationen und Recovery besser nachvollzogen werden können.
- Nach **Nach aktueller Anzeige stoppen** bleiben nie gestartete Positionen in der Phasenanzeige vollständig neutral; insbesondere pulsiert Phase 1 nicht mehr irrtümlich.
- Die fachliche Batch-, Renewal-, Publish-, Lösch- und Recovery-Logik bleibt unverändert.
- `tests/v1145-contract.cjs` schützt Diagnoseaggregation, sichtbare Batch-Revision und den neutralen Phasenstatus nicht ausgeführter Positionen.

## Version 1.14.4: Batch-Robustheit, 4xx/5xx-Erkennung und Fortschritts-Watchdog

- Die persistente Massenlauf-State-Mutation ist serialisiert. Stop-Wunsch, terminaler Einzelabschluss, Retry und Queue-Fortschritt schreiben nicht mehr konkurrierend auf veraltete Batch-Snapshots.
- Nach Service-Worker-Neustarts wird ein `running`-Artikel ohne gespeicherte `renewalId` anhand `massBatchId` und `massBatchItemIndex` wieder mit seiner Renewal-Sitzung verbunden. Falls noch keine Renewal-Sitzung existiert, wird ein reiner `starting`-Zwischenzustand kontrolliert neu eingequeued statt festzuhängen.
- Terminale Vorlagen-Fill-Zustände bleiben terminal; verspätete Nachrichten eines vorherigen Dokuments können einen bereits beendeten Fehler-/Attention-Zustand nicht wieder öffnen.
- Kleinanzeigen-Plattformfehler werden nicht mehr nur über eine einzelne 500er-URL erkannt. Eindeutige 4xx-/5xx-Fehlerseiten können zusätzlich über URL-Muster, HTTP-Fehlercode und Seitenmarker wie Titel/Überschrift erkannt werden; der erkannte Fehlercode wird in der Diagnose mitgeführt.
- Für unbekannte Hänger überwacht ein Watchdog den **bestätigten Workflow-Fortschritt** des aktuell laufenden Massenartikels. Fünf Minuten ohne echten Fortschritt lösen eine erneute Fehlerseitenprüfung und anschließend – nur wenn weiterhin kein Fortschritt vorliegt – einen sicheren Attention-Abschluss aus. Heartbeats dienen nur zum Wecken des Service Workers und zählen nicht selbst als Fortschritt.
- Der Watchdog ist kein Hard-Cancel. Bestehende Stop-after-current-, Auto-Publish-, Profil-, Phase-4-, Löschverifikations-, Promotions- und Papierkorb-Sicherheitsgrenzen bleiben bestehen.
- `tests/v1144-contract.cjs` schützt Serialisierung, Recovery, terminale Monotonie, 4xx/5xx-Erkennung und Watchdog-Vertrag.

## Version 1.14.3: Deadlock-Fix für Kleinanzeigen-Fehlerseite beim Inserieren

- Behebt den real reproduzierten Deadlock, wenn ein gebundener Neu-Inserat-/Renewal-Tab während Phase 1 auf Kleinanzeigen zu `/anzeige-aufgeben-fehler.html` navigiert. Der Einzelworkflow bleibt nicht mehr dauerhaft auf einem vorherigen laufenden Stage wie `category-continuing` stehen.
- Die bekannte Inserierungs-Fehlerseite wird sowohl im Background über die Tab-Navigation als auch defensiv im Template-Filler als eigener `platform-error` erkannt. Die Background-Erkennung ist nicht davon abhängig, dass der Content-Script-Ablauf auf der Fehlerseite erfolgreich fortgesetzt werden kann.
- Der aktive Fill wird terminal auf `error / platform-error-page` gesetzt. Ein gebundener Renewal wechselt auf `verification-failed / platform-error-page` und erhält eine verständliche Fehlerursache; ZIP-Neuinserate werden entsprechend in Phase 1 sicher beendet.
- Bei **Mehrere neu inserieren** greift danach wieder die bestehende terminale Batch-Reconciliation: Ohne Stop-Wunsch wird der fehlerhafte Artikel als Attention/Fehler markiert und der nächste Queue-Eintrag darf starten. Mit vorgemerkt **Nach aktueller Anzeige stoppen** endet der Batch nach diesem terminalen Fehler als `stopped-with-attention`; noch nicht gestartete Positionen werden **Nicht ausgeführt**.
- Die Fehlerseite erzeugt das eindeutige Diagnoseereignis `KLEINANZEIGEN_ERROR_PAGE_DETECTED`. Damit erscheint dieser reale Plattformfehler nicht mehr als scheinbar fehlerfreier, aber festhängender Lauf.
- Die bisherige Anzeige wird in diesem Fehlerpfad ausdrücklich nicht gelöscht; Publish-, Profil-, Phase-4-, Löschverifikations-, Papierkorb- und Promotions-Sicherheitsgrenzen bleiben unverändert.
- `tests/v1143-contract.cjs` schützt die Fehlerseiten-Erkennung, Terminalisierung und die Anbindung an den bestehenden Batch-/Stop-after-current-Pfad.


## Version 1.14.2: ruhiger Fortschritt und geordneter Batch-Stopp

- Die vier Phasenindikatoren in Schritt 2 stehen jetzt in einer festen eigenen Spalte; rechts davon besitzt Status/Aktion ebenfalls einen festen Bereich. Unterschiedlich breite Badges oder Buttons verschieben den Phasenfortschritt nicht mehr.
- Die Abschlussübersicht signalisiert das Ergebnis zusätzlich über die ganze Zeile: erfolgreiche Positionen dezent grün, Fehler-/Attention-Positionen dezent rot.
- Beim laufenden Batch erklärt das X per Tooltip und zugänglicher Beschriftung: **Fenster schließen – Vorgang läuft im Hintergrund weiter**. Es bleibt ausschließlich ein Modal-Schließen.
- Schritt 2 besitzt neu **Nach aktueller Anzeige stoppen**. Ein gestalteter Bestätigungsdialog fragt den geordneten Stopp ab. Die aktuell laufende Anzeige wird nicht abgebrochen, sondern vollständig bis zu ihrem terminalen Zustand verarbeitet. Erst danach startet keine weitere ausgewählte Anzeige mehr.
- Noch nicht gestartete Positionen werden nach bestätigtem Stopp als **Nicht ausgeführt** markiert. Der persistierte Batch endet als `stopped` oder bei zusätzlich vorhandenen Attention-Fällen als `stopped-with-attention`.
- Der Stop-Wunsch ist persistent und überlebt Service-Worker-Neustarts; der normale Einzelworkflow und seine Sicherheitsgrenzen bleiben unangetastet.
- `tests/v1142-contract.cjs` schützt feste Phasenpositionen, Ergebnisfarben, X-Hinweis und den geordneten Stop-after-current-Vertrag.

## Version 1.14.1: Massen-Neuinserat UI/UX-Finishing

- **SCHNELLPRÜFUNG** wird im Modal-Kicker über Auswahl, Verarbeitung und Übersicht wieder gelb hervorgehoben.
- Start-/Abschlussaktionen sind kompakt ausgerichtet: **Abbrechen** links, **Start** bzw. **Schließen** rechts.
- Während der Verarbeitung zeigt jede ausgewählte Anzeige ihr Titelbild sowie vier nummerierte Phasen mit Tooltip. Aktiv = dezent pulsierend, abgeschlossen = grün, Fehler = rot, in der Schnellprüfung übersprungene Datenkontrolle = neutral.
- Sichtbare technische Statusbegriffe wurden entfernt; wartende Anzeigen heißen **Wartet auf Start**, laufende Anzeigen zeigen die aktuelle Phase.
- Die Abschlussansicht heißt **Ergebnisse**. Erfolgreiche Einträge behalten das Badge **Erfolgreich**; problematische Einträge bieten abhängig vom Zustand **Neu inserieren erneut starten**, **Prüfung erneut starten** oder **Austausch abschließen**. **Letzte Phase erneut starten** wird nur als Fallback verwendet.
- Die zugrunde liegende strikt sequenzielle Batch-Orchestrierung, Persistenz/Recovery und alle bestehenden Sicherheitsgrenzen bleiben unverändert.
- `tests/v1141-contract.cjs` schützt diese UI-/UX-Regeln.

## Version 1.14.0: Mehrere neu inserieren

- Im Bereich **AKTIONEN** steht direkt unter **Aus ZIP neu inserieren** die neue Funktion **Mehrere neu inserieren**.
- Das Drei-Schritt-Modal bietet eine kompakte Auswahl bis maximal 10 Anzeigen, eine strikt sequenzielle Verarbeitung und eine Abschlussübersicht. Die Auswahl ist standardmäßig nach dem frühesten Enddatum sortiert.
- Jeder Eintrag verwendet unverändert den bestehenden normalen Neu-Inserat-/Renewal-Workflow im beim Batchstart gewählten Modus. Es läuft fachlich immer nur ein Einzelworkflow gleichzeitig.
- Der nächste Artikel startet erst nach vollständigem Erfolg oder nach einem terminalen Fehler-/Benutzereingriff-Zustand des aktuellen Artikels. Ein problematischer Artikel stoppt die restlichen ausgewählten Anzeigen nicht.
- Der Batchzustand wird persistent unter `massRenewalBatchV1` gespeichert und kann nach einem Service-Worker-Neustart fortgesetzt werden.
- Die Abschlussübersicht bietet zustandsabhängige Wiederaufnahmeaktionen über den bestehenden Einzelworkflow. Publish-, Profil-, Prüf-, Lösch-, Papierkorb- und Recovery-Sicherheitsgrenzen bleiben unverändert.
- `tests/v1140-contract.cjs` schützt den strikt sequenziellen Batchvertrag.

## Version 1.13.7: ZIP-Workflow sprachlich vereinheitlicht, Recovery idempotent, Tab-Lifecycle ruhiger

- **Als ZIP exportieren** beschreibt jetzt direkt, was die Aktion erzeugt. Fortschritt und Erfolg heißen **ZIP wird erstellt …** bzw. **ZIP erstellt**.
- Der Importdialog verwendet konsequent **ZIP** und **Anzeige** statt Datensatz/Archiv/Artikel: **Anzeige aus ZIP neu inserieren**, **ZIP hierher ziehen**, **ZIP erfolgreich geprüft**, **Anzeige inserieren** und **Unter „Meine Anzeigen“ finden**.
- Im erfolgreichen Prüfzustand wird keine interne Archivversion mehr angezeigt. Die ursprüngliche Anzeigen-ID bleibt als nachvollziehbare Herkunft sichtbar.
- **Schnellprüfung** erklärt, dass die Anzeige erstellt, veröffentlicht und anschließend unter „Meine Anzeigen“ bestätigt wird; die **zusätzliche Inhaltsprüfung entfällt**. **Vollprüfung** ergänzt den erneuten Vergleich der gespeicherten Inhalte mit den ZIP-Daten im Bearbeiten-Modus.
- Recovery ist für bereits inventarisierte veröffentlichte ZIP-Neuinserate idempotent. Passt ein vorhandener Datensatz mit derselben neuen Anzeigen-ID semantisch zur ZIP-Quelle und zum gebundenen Zielprofil, wird der Vorgang ohne Überschreiben, Duplikat oder erneuten Publish als abgeschlossen erkannt. Eine echte abweichende ID-Kollision bleibt gesperrt.
- Nachlaufende Zugriffe auf bereits geschlossene Ziel-/Worker-Tabs werden als normaler `gone`-Lifecycle-Zustand klassifiziert. Dadurch erscheinen erwartbare `Receiving end does not exist`-/`No tab with id`-Races nach erfolgreichem Abschluss nicht mehr als technische Fehler.
- `tests/v1137-contract.cjs` schützt diese drei Patch-Bereiche.

## Version 1.13.6: ZIP-Zielprofil und Bulk-Status korrekt profilgebunden

- **ZIP-Exporte sind portable Vorlagen.** Das Profil, von dem ein Datensatz ursprünglich exportiert wurde, wird nur noch als Provenienz gespeichert und ist kein Gleichheits-Gate für das Neu-Inserieren.
- Vor dem Start eines ZIP-Neuinserats wird das aktuell bei Kleinanzeigen angemeldete Profil über einen eigenen Hintergrund-Check von **Meine Anzeigen** eindeutig erkannt und als `targetProfileId` / `targetProfileName` in der ZIP-Neuinserat-Sitzung gebunden. Erst danach wird der Inserier-Tab geöffnet.
- Nach Publish muss **Neue Anzeige finden** weiterhin genau in diesem beim Start gebundenen Zielprofil stattfinden. Ein Kontowechsel während des Laufs führt zu einem sicheren Abbruch; ein Unterschied zwischen ZIP-Quellprofil und Zielprofil dagegen ausdrücklich nicht mehr.
- Schnell- und Vollprüfung speichern die neue Anzeige unter dem lokalen Zielprofil. `archiveImport` behält zusätzlich `sourceProfileName` als Herkunft und `targetProfileName` / `targetProfileId` als Zielprovenienz.
- Für ältere, bereits veröffentlichte ZIP-Sitzungen ohne `targetProfile*` kann das Zielprofil beim Recovery ausschließlich dann übernommen werden, wenn die bestätigte neue Anzeigen-ID tatsächlich unter **Meine Anzeigen** des aktuell erkannten Profils gefunden wird.
- Ein mit v1.13.5 bereits erfolgreich veröffentlichter Lauf, der ausschließlich am inzwischen entfernten Source-vs.-Target-Profil-Gate in Phase 2 scheiterte, wird nach dem Update einmalig in den sicheren Find-/Save-Pfad zurückgeführt; es wird dabei **keine zweite Anzeige veröffentlicht**.
- Der Status **Alle Anzeigen erfasst** ist jetzt an die Profil-ID des Bulk-Laufs gebunden. Nach Umschalten der Inventaransicht wird ein Abschluss-/Fehlerstatus eines anderen Profils nicht mehr angezeigt; beim Zurückwechseln in das zugehörige Profil kann er wieder erscheinen.
- Neuer Regressionstest `tests/v1136-contract.cjs` schützt portable ZIP-Neuinserate, Zielprofilbindung und profilbezogene Bulk-Statusanzeige.


## Version 1.13.5: Manuelle Einzelinventarisierung behält die Profilzuordnung

- Behebt einen real reproduzierten Fehler bei **Geöffnete Anzeige erfassen**: War ein Inventarprofil ausgewählt und dasselbe Kleinanzeigen-Konto im Bearbeiten-Modus angemeldet, konnte der neue Datensatz trotzdem mit leerer `profileId` unter **Nicht zugeordnet** gespeichert werden.
- `PAGE_STATUS` liefert den sichtbaren Wert hinter **angemeldet als:** jetzt auf jeder angemeldeten eigenen Kleinanzeigen-Seite, nicht nur unter **Meine Anzeigen**.
- Unmittelbar vor einer manuellen Einzelinventarisierung wird die Profilidentität der tatsächlich geöffneten Seite erneut erkannt und mit der bestehenden Profilverwaltung synchronisiert.
- Stimmen ausgewähltes Inventarprofil und zuletzt eindeutig erkanntes Kleinanzeigen-Profil überein, wird genau diese bestehende `profileId` verbindlich am neuen Datensatz gespeichert. Ein unnötiger neuer Bereich **Nicht zugeordnet** entsteht in diesem Fall nicht mehr.
- Kann bei vorhandener expliziter Profilauswahl keine eindeutige Zuordnung bestätigt werden, bricht die Einzelinventarisierung sicher mit einer verständlichen Meldung ab, statt profil-los zu speichern.
- Bestehende Bulk-, Renewal-, ZIP-Neuinserat-, Publish- und Löschpfade bleiben unverändert.
- `tests/v1135-contract.cjs` schützt den realen Profilbindungsfehler als Regression.

## Version 1.13.4: ZIP-Vollprüfung verwendet zuverlässig den Bearbeiten-Modus

- Nach **Neue Anzeige finden** übernimmt die Vollprüfung jetzt die konkrete Bearbeiten-URL der neu gefundenen Anzeigenkarte unter **Meine Anzeigen** und verwendet genau diese URL für **Neue Anzeige überprüfen**.
- Die ZIP-Neuinserat-Sitzung speichert diese URL als `newEditUrl`. Vor der Extraktion wird nochmals geprüft, dass der Worker tatsächlich auf der Bearbeiten-Seite der erwarteten neuen Anzeigen-ID steht.
- Eine öffentliche `/s-anzeige/...`-Read-only-Seite ist für Schritt 3 ausdrücklich kein gültiges Ziel mehr. Wird der Worker dorthin oder auf eine andere Anzeigen-ID umgeleitet, bricht die Vollprüfung sicher und verständlich ab.
- Die Schnellprüfung bleibt unverändert und überspringt Schritt 3 weiterhin bewusst. Bestehende Publish-, Profil-, Inventar- und Renewal-Sicherheitsgrenzen bleiben erhalten.
- `tests/v1134-contract.cjs` schützt diesen real beobachteten Workflowfehler als Regression.

## Version 1.13.3: Galeriediagnose wieder im aktuellen Diagnose-ZIP verfügbar

- Behebt die veraltete Fehlermeldung bei nicht eindeutig erkannter Anzeigengalerie: Die Extension verweist nicht mehr auf die entfernte Aktion **Bilddiagnose der aktuellen Seite kopieren**, sondern auf den tatsächlich vorhandenen Download unter **Support & Diagnose → Diagnosedaten herunterladen**.
- Wenn die öffentliche Anzeigengalerie sicherheitsbedingt nicht extrahiert werden kann, wird automatisch eine begrenzte strukturierte Galeriediagnose gespeichert. Sie enthält die Entscheidung des Extractors, erkannte Galeriecontainer, akzeptierte Bildkandidaten sowie zusätzlich rohe `img`-/`source`-/`srcset`-Quellen mit Host und DOM-Merkmalen. Queryparameter werden für die Diagnose entfernt bzw. redigiert.
- Die letzten Galeriediagnosen werden separat für maximal 24 Stunden und höchstens acht Fälle vorgehalten. Dadurch bleiben sie auch dann für den nächsten Diagnoseexport verfügbar, wenn der Manifest-v3-Service-Worker zwischen Fehler und ZIP-Download neu gestartet wurde.
- Das Standard-Diagnose-ZIP enthält bei vorhandenen Fällen zusätzlich `image-gallery-diagnostics.json`. Die eigentliche strikte Galerieerkennung wird dabei **nicht** gelockert: unbekannte Hosts oder nicht eindeutig zuordenbare Galerien werden weiterhin nicht als vollständiger Inventardatensatz akzeptiert.
- Auch die veraltete Aufforderung zur separaten Formular-/Bilddiagnose im Bearbeiten-Pfad wurde auf den aktuellen Diagnose-ZIP-Workflow umgestellt.
- Neuer dependency-freier Vertragstest `tests/v1133-contract.cjs` schützt die neue Diagnosepersistenz, ZIP-Aufnahme, Redigierung unbekannter Bildquellen und die unveränderte Extension-Identität/Berechtigungen.

## Version 1.13.2: Publish-Bestätigungsseite erkennt neue Anzeigen-ID zuverlässig

- Behebt einen Hänger nach erfolgreichem Auto-Publish bei ZIP-Neuinseraten (und schützt denselben Erkennungspfad auch für Renewals): Kleinanzeigen liefert die neue Anzeigen-ID auf der Bestätigungsseite als Queryparameter `addId`. Diese URL wird jetzt ausdrücklich als bestätigte neue Anzeigen-ID erkannt.
- Der Background wertet die aktuelle Ziel-Tab-URL zusätzlich direkt aus, bevor er das Content-Script nach Canonical-/Link-Kandidaten fragt. Dadurch hängt der Übergang `publish-submitted` → `new-id-confirmed` nicht mehr davon ab, dass die Bestätigungsseite bereits einen öffentlichen Anzeigenlink enthält.
- Der bestehende Source-ID-Schutz bleibt aktiv: Eine erkannte ID muss numerisch sein und darf nicht mit der Quell-Anzeigen-ID identisch sein.
- Ein neuer Regressionstest simuliert die reale Bestätigungs-URL `/p-anzeige-aufgeben-bestaetigung.html?addId=...` und prüft die ID-Erkennung über den Content-Message-Pfad.

## Version 1.13.1: ZIP importieren und als neue Anzeige inserieren (Phase 2)

- Im bestehenden Bereich **Aktionen** stehen nun direkt untereinander **Alle Anzeigen erfassen**, **Geöffnete Anzeige erfassen** und **Aus ZIP neu inserieren**. Der rechts angezeigte Prüfmodus gilt auch für den ZIP-Neuinserat-Workflow.
- **Aus ZIP neu inserieren** öffnet einen Modal-Dialog. Das Export-ZIP wird per Drag & Drop oder Dateiauswahl geladen und vollständig lokal geprüft, bevor eine Artikelvorschau und die Aktion **Artikel inserieren** verfügbar werden.
- Erwartet wird der Phase-1-Archivvertrag `kleinanzeigen-renewal-inventory-export`, `archiveVersion: 1`. Manifest, JSON-Dateien, Bildreihenfolge, Dateigrößen, CRC und SHA-256-Prüfsummen werden validiert; unvollständige, beschädigte oder intern inkonsistente Archive werden vor jedem Kleinanzeigen-Schritt abgewiesen.
- Der Ablauf besteht aus **Neue Anzeige erstellen → Neue Anzeige finden → Neue Anzeige überprüfen → Ins Inventar aufnehmen**.
- **Vollprüfung** führt alle vier Schritte aus. Nach dem automatischen Publish wird die neue Anzeige im gebundenen Profil unter **Meine Anzeigen** gefunden, im Bearbeiten-Modus erneut ausgelesen und gegen alle vom automatischen ZIP-Neuinserat verwalteten Felder der ZIP-Quelle geprüft (einschließlich Direkt-kaufen-Zustand sowie Standort-/Adresssichtbarkeit).
- **Schnellprüfung** führt Erstellung, Publish, Finden und Inventaraufnahme aus; die zusätzliche Bearbeiten-Kontrolle wird bewusst übersprungen und im Modal entsprechend markiert.
- Beide Modi verwenden den bereits bestehenden Auto-Publish-Hard-Gate: Nur eine vollständig und widerspruchsfrei vorgeprüfte Füllsitzung mit genau einem eindeutigen sichtbaren **Anzeige aufgeben**-Button darf automatisch veröffentlichen. Es wird kein direkter `submit()`-/`requestSubmit()`-Bypass eingeführt.
- Die importierte Anzeige wird **immer zusätzlich** ins Inventar aufgenommen. Der ZIP-Workflow ersetzt oder löscht weder den exportierten Ursprungsdatensatz noch andere Inventareinträge oder Anzeigen. Erkennt die Vollprüfung nach Veröffentlichung eine Abweichung, bleibt die neue Anzeige im Inventar und der Vorgang wird als prüfbedürftig markiert.
- Der Workflow besitzt persistente ZIP-Neuinserat-Sitzungen, nutzt den globalen Inserierungs-Lock und kann laufende Nachprüfungen nach einem Service-Worker-Neustart wiederaufnehmen.


## Version 1.13.0: Datensatz als ZIP exportieren (Phase 1)

- Jede Inventarkachel besitzt zwischen **Details anzeigen** und dem gespeicherten Zeit-/ID-Stempel die Aktion **Exportieren**.
- Der Export erstellt ein ZIP ausschließlich aus dem ausgewählten lokalen Inventardatensatz; weder Kleinanzeigen noch andere Inventareinträge werden verändert.
- `record.json` enthält den vollständigen serialisierbaren Inventardatensatz.
- `image-store.json` enthält die Metadaten der lokal gespeicherten Bildobjekte ohne die Binärdaten.
- `export-manifest.json` definiert den versionierten Archivvertrag für die spätere Import-Phase und enthält Bildreihenfolge, Titelbild-Markierung, Dateipfade, Formate, Prüfsummen und Vollständigkeitsangaben.
- Alle lokal gespeicherten Bilder liegen zusätzlich als echte Dateien unter `images/` und werden in der ursprünglichen Galerie-Reihenfolge exportiert.
- Fehlende oder bei vorhandener Prüfsumme inkonsistente Bildkopien brechen den Export ab, damit kein unvollständiges Archiv als erfolgreich ausgegeben wird.
- Phase 2 – ZIP auswählen und daraus eine neue Anzeige erzeugen – ist in v1.13.0 ausdrücklich noch nicht umgesetzt.

## Version 1.12.1: verständlichere Prüfmodi und Inserierdatum-Fallback

- Die UI verwendet **Vollprüfung** statt Safe-Mode und **Schnellprüfung** statt Fast-Mode. Vollprüfung bleibt Standard und ist als **Empfohlen** gekennzeichnet.
- Der Renewal-Dialog vermeidet technische Begriffe wie `adId`, Re-Inventarisierung oder semantischen Vergleich und beschreibt die Schritte aus Nutzersicht. Bei Schnellprüfung wird der Modusname im Dialog gelb hervorgehoben.
- **Konfiguration** steht in der linken Seitenleiste jetzt direkt oberhalb von **Support & Diagnose**.
- Nach einer Schnellprüfung bleibt das echte Kleinanzeigen-Veröffentlichungsdatum bewusst leer, wenn es nicht extern ausgelesen wurde. Stattdessen speichert die App den sicher beobachteten Neu-Inserier-Zeitpunkt separat und zeigt **Neu inseriert am**.
- Die Sortierung heißt **Inseriert am** und nutzt zuerst das echte Kleinanzeigen-Datum; fehlt es, wird der bestätigte Neu-Inserier-Zeitpunkt verwendet. Ein später eingelesenes echtes Datum übernimmt automatisch die Priorität.
- Die eigentliche Safe-/Fast-Mode-Logik und alle Sicherheitsgrenzen bleiben unverändert.

## Version 1.12.0: Safe-Mode und Fast-Mode

- Unter **Konfiguration → Neu-Inserat-Modus** kann dauerhaft zwischen **Safe-Mode** und **Fast-Mode** gewählt werden. Safe-Mode ist der Default und der aktuell gewählte Modus bleibt bei den Aktionen sichtbar.
- Beim ersten Aktivieren des Fast-Mode erklärt ein Bestätigungsdialog ausdrücklich die reduzierte externe Prüftiefe.
- Die Auswahl wird beim Start eines Renewals in dessen persistierte Sitzung übernommen. Ein späterer Moduswechsel verändert einen bereits laufenden Austausch nicht.
- **Safe-Mode:** Phase 1 erstellt und veröffentlicht die neue Anzeige; Phase 2 liest sie vollständig frisch von Kleinanzeigen ein; Phase 3 prüft Online-/„Meine Anzeigen“-Evidenz und führt den semantischen Alt-/Neu-Vergleich aus; Phase 4 löscht die alte Anzeige und beweist ihre Abwesenheit mit einem frischen unabhängigen Vollscan.
- **Fast-Mode:** Phase 1 bleibt identisch; Phase 2 wird bewusst übersprungen; Phase 3 prüft nur, ob genau die neue `adId` im richtigen Profil unter **Meine Anzeigen** vorhanden ist; Phase 4 bleibt sicherheitsseitig identisch und löscht die alte `adId` erst anschließend mit unabhängiger Abwesenheitsprüfung.
- Fast-Mode vertraut damit bewusst darauf, dass Kleinanzeigen die vor Publish vollständig verifizierten Formularwerte gespeichert hat. Es findet keine frische Re-Inventarisierung und kein semantischer Alt-/Neu-Vergleich statt.
- Alle lokalen Schutzmechanismen bleiben gleich: Profilbindung, globaler Inserierungs-Lock, Recovery/Diagnose, atomare Promotion, eigenständige Bildkopie für den neuen Datensatz und vollständiger 30-Tage-Papierkorb.

## Version 1.11.5: Robustheit auf langsamen Rechnern

- Kritische Renewal-Worker erhalten kontextspezifische Ladebudgets: 45 Sekunden für Renewal-/Refresh-Navigationen und 60 Sekunden für Phase 4. Die Fehlermeldung benennt jetzt den tatsächlichen Worker statt generisch einen Bearbeiten-Tab.
- `TAB_LOAD_TIMING` und `CONTENT_CONNECTION_READY` trennen Seitenlade- und Content-Bootstrap-Zeiten in der Diagnose.
- Die App reagiert primär auf Tab-Ereignisse; ein 15-Sekunden-Poll bleibt nur als Safety-Net. Von Chrome verworfene Tabs gehen in Backoff, bis sie wieder aktiviert oder geladen werden.
- Geschlossene oder zwischen Query und Message verschwundene Tabs gelten als normaler Lifecycle-Zustand und erzeugen keine wiederholten Verbindungsfehler.
- Phase-4-Navigationsabbrüche nach dem Löschklick werden nach erfolgreicher unabhängiger Vollscan-Verifikation als erwartbar/verifiziert dokumentiert.
- Bulk-Read-only-Metadaten werden erst dann als nicht verfügbar gewarnt, wenn ein Datensatz tatsächlich ohne sie gespeichert wird.
- Sicherheitsgrenzen des Renewals bleiben unverändert.


## Version 1.11.4: Ruhigerer Renewal-Nachlauf und saubere Worker-Lebenszyklen

- Die direkte Read-only-Prüfung einer neuen Anzeigen-ID wartet nach vollständig geladener Seite nur noch kurz auf eindeutige Metadaten und wechselt danach früh zum belastbaren „Meine Anzeigen“-Fallback.
- Erwartete Fehlversuche während dieses Pollings werden nicht mehr dutzendfach als `READONLY_METADATA_FAILED` protokolliert; ein nicht erfolgreicher Direktversuch wird einmalig als informativer Fallback-Schritt erfasst.
- Renewal-Hintergrundworker werden zentral als verwaltete Worker markiert. Die App ignoriert diese Tabs bei ihrer normalen Seiten-/Verbindungsprüfung; geschlossene Worker bleiben kurz als Tombstone markiert, damit ein gleichzeitig laufender UI-Refresh keinen bereits entfernten Tab mehr anspricht.
- Nach ausgelöstem Auto-Publish werden Bestätigungsseiten nicht erneut als Publish-Gate behandelt. Zusätzlich blockiert der Background veraltete Stage-Rückschritte von `publish-submitted`/`new-id-confirmed` zurück in Vor-Publish-Zustände.
- Publish-Hard-Gate, Kategorie-Fix aus v1.11.3, Profilmanagement, unabhängige Phase-4-Abwesenheitsprüfung und 30-Tage-Papierkorb bleiben unverändert.

## Version 1.11.3: Robuste Kategorieöffnung beim Neu-Inserieren

- Der Start der separaten Kleinanzeigen-Kategorieauswahl wird nach dem sichtbaren Klick jetzt aktiv bestätigt, statt die Navigation lediglich anzunehmen.
- Bleibt der Klick auf **Kategorie wählen/ändern** ohne bestätigte Navigation, wartet die Extension vier Sekunden und navigiert anschließend kontrolliert auf den bekannten, gleich-originären Kleinanzeigen-Kategoriepfad `/p-kategorie-aendern.html`.
- Ein eventuell vorhandenes `href` wird nur verwendet, wenn es auf derselben Kleinanzeigen-Origin exakt auf diesen Kategoriepfad zeigt; fremde Origins und andere Pfade werden verworfen.
- Neue Diagnoseereignisse unterscheiden Klick, bestätigte Navigation, nicht bestätigten Klick und kontrollierte Fallback-Navigation.
- Kategorieauswahl, Pflichtmerkmale, `Weiter`-Logik, Auto-Publish-Hard-Gate, Phase-4-Löschverifikation und die Tab-Optimierung aus v1.11.2 bleiben unverändert.

## Version 1.11.2: Weniger Tabs im automatischen Austausch

- Nach bestätigter neuer Anzeigen-ID wird der von der Extension erzeugte Inserat-Tab aus Phase 1 direkt geschlossen und aus der persistierten Renewal-/Fill-Sitzung freigegeben.
- Die erneute Inventarisierung und Online-Prüfung in Phase 2/3 nutzt einen einzigen Hintergrund-Worker. Derselbe Tab wird nacheinander von der Bearbeiten-Seite zur direkten öffentlichen ID-URL, bei Bedarf zu **Meine Anzeigen** und anschließend zur dort gefundenen öffentlichen URL navigiert.
- Der semantische Vergleich in Phase 3 läuft weiterhin ausschließlich lokal und benötigt keinen eigenen Tab.
- In Phase 4 bleibt die Löschverifikation bewusst unabhängig: Zuerst wird der Lösch-Worker beendet, danach wird ein neuer frischer Verifikations-Worker geöffnet. Dadurch bleibt die Sicherheitsgrenze erhalten, ohne beide Worker gleichzeitig offen zu halten.
- Die bestehende Profilprüfung, der Auto-Publish-Hard-Gate, die autoritative Prüfung auf Abwesenheit der alten Anzeigen-ID, der atomare Inventarwechsel und der 30-Tage-Papierkorb bleiben unverändert.


## Version 1.11.1

- Der Chrome-Launcher zeigt die installierte Versionsnummer jetzt direkt neben „Inventar“ an.
- Die Anzeige wird dynamisch aus `chrome.runtime.getManifest().version` gelesen und muss bei künftigen Releases nicht separat hartcodiert gepflegt werden.
- Fachliche Inventar-, Profil-, Papierkorb- und Renewal-Logik bleibt gegenüber v1.11.0 unverändert.


## Version 1.11.0: Profilmanagement und getrennte lokale Inventare

- Erkannte Kleinanzeigen-Konten werden als stabile lokale Profile geführt. Die linke Seitenleiste besitzt dafür einen Profilumschalter und einen eigenen Dialog **Profile verwalten**.
- Der Profilumschalter wechselt ausschließlich die **lokale Inventaransicht**; er meldet nicht bei Kleinanzeigen um und verändert keine Zugangsdaten.
- Inventarliste und Papierkorb werden pro ausgewähltem Profil getrennt angezeigt. Auch **Inventarliste leeren** wirkt nur auf das ausgewählte Profil.
- **Alle Anzeigen erfassen** und **Geöffnete Anzeige erfassen** werden vor dem Speichern an das tatsächlich erkannte angemeldete Kleinanzeigen-Profil gebunden. So kann eine manuell gewählte lokale Ansicht keine Daten versehentlich dem falschen Profil zuordnen.
- Bestehende profilneutrale Altbestände bleiben als **Nicht zugeordnet** sichtbar. Die schon vorhandene Zuordnung zu einem neu erkannten Profil erfolgt weiterhin nur nach ausdrücklicher Bestätigung.
- Profile können lokal gelöscht werden, ohne Inventardaten zu verlieren: zugehörige aktive und Papierkorb-Einträge wechseln zu **Nicht zugeordnet**. Ein Profil mit laufendem Renewal-/Austauschvorgang oder laufender Gesamterfassung kann nicht gelöscht werden.
- Diagnoseexporte enthalten zusätzlich den Profilzustand; Profilnamen bleiben von der bestehenden Redaktionslogik erfasst.
- Die UI-Bezeichnung für Inventarisierungsaktionen wurde von **sichern** auf **erfassen** umgestellt.
- Feste Extension-ID, Manifest-Key, Berechtigungen, Host-Permissions und die bestehenden Publish-/Phase-4-Sicherheitsgrenzen bleiben unverändert.


## Patch 1.10.4: Ruhigere, klar gegliederte linke Steuerleiste

- Die linke Steuerleiste ist jetzt als zusammenhängender Arbeitsbereich statt als Folge gleichgewichtiger Karten gestaltet.
- Der aktuelle Kleinanzeigen-Status ist kompakter; technische Kontextdetails bleiben sichtbar, treten aber visuell zurück.
- Die Aktionen sind klar priorisiert: **Alle Anzeigen sichern** ist die primäre Aktion, **Geöffnete Anzeige sichern** die sekundäre kontextbezogene Aktion.
- Laufende Vorgänge, Abschlussmeldungen und Sammelstatus sind in einem gemeinsamen Aktivitätsbereich gebündelt und kompakter dargestellt.
- **Support & Diagnose** ist als ruhiger Footer am unteren Rand der Seitenleiste verankert.
- Fachliche Inventar-, Renewal-, Publish-, Lösch-, Papierkorb-, Recovery- und Diagnose-Logik bleibt unverändert.


## Patch 1.10.3: Größeres Toolbar-Symbol

- Die kleinen 16/32/48-px-Icon-Assets nutzen dieselbe freigegebene Grafik jetzt mit deutlich engerem Beschnitt und damit größerer sichtbarer Fläche in der Chrome-/App-Leiste.
- Das Motiv selbst, das 128-px-App-Icon, Favicons und die fachliche Extension-Logik bleiben unverändert.
- Ein neuer dependency-freier Vertragstest prüft die Icon-Hashes, PNG-Abmessungen, die vergrößerte opake Bildfläche sowie die unveränderte feste Extension-ID und ausgewählte Kern-Runtime-Dateien.


## Patch 1.10.2: App- und Taskleisten-Icons

- Die Anwendung besitzt jetzt ein eigenes hochauflösendes Icon-Set im Stil der Oberfläche.
- Kleine Darstellungen wie Toolbar, Fenstersymbol und Taskleiste verwenden eine vereinfachte, klar lesbare Variante.
- Größere Darstellungen verwenden eine detailliertere App-Variante mit Karten-, Archiv- und Erneuern-Symbolik.
- App-Fenster und Launcher veröffentlichen zusätzlich Favicons, damit das Symbol auch in Fenstertitel und Tabs konsistent erscheint.




## Patch 1.10.1: Verbindungsstatus und Modal-Feinschliff

- Der sichtbare Kleinanzeigen-Status gilt nur noch dann als verbunden/gesund, wenn tatsächlich **„Meine Anzeigen“** oder eine eigene Anzeige nutzbar erkannt wurde. Andere Kleinanzeigen-Seiten wie Startseite oder Benachrichtigungen können den Status nicht mehr auf einem veralteten Prüfzustand festhalten.
- Wechsel zwischen relevanten Ansichten aktualisieren den sichtbaren Status auch bei Hintergrundprüfungen sofort.
- Das In-Page-Statusfeld unterscheidet Vollautomatik und Papierkorb-Vorlage: Nur die Papierkorb-Vorlage weist auf manuelles Veröffentlichen hin; der normale Austausch zeigt den laufenden automatischen Ablauf.
- Startmodal: **Schließen** links, **Jetzt neu inserieren und austauschen** rechts.
- Erfolgsmodal: **Schließen** links; **Anzeige ansehen** und **Anzeige bearbeiten** gleich groß als rechte Aktionsgruppe.
- Alle App-Modal-Schließen-Buttons verwenden ein geometrisch zentriertes SVG-X und denselben grünen Hover-Akzent wie der Primärbutton.

## Version 1.10.0: UI-/UX-Überarbeitung und flackerfreie Bilder

- Die sichtbare Oberfläche verwendet konsequent endanwenderfreundliche Begriffe nahe an Kleinanzeigen. Interne Begriffe wie Renewal, Recovery, Verifikation, Read-only, Content Script oder Retry bleiben auf Diagnose und Implementierung beschränkt.
- Technische Laufzeitfehler werden in der App auf verständliche Meldungen abgebildet; die vollständigen technischen Details bleiben in den Diagnosedaten.
- Native Browser-Bestätigungen wurden durch ein einheitliches App-Modal ersetzt.
- Bildvorschauen verwenden stabile, pro Bild gecachte Blob-URLs. Reine Fortschrittsereignisse aktualisieren nur den laufenden Austausch und bauen nicht mehr die gesamte Inventarliste neu auf. Dadurch verschwindet das beobachtete gemeinsame Bildflackern während Phase 1–4.
- `ENDET AM` zeigt zusätzlich die relative Restzeit, zum Beispiel `10.11.2026 (in 57 Tagen)`, mit `heute` und `morgen`. Standardsortierung bleibt `Endet am` aufsteigend.
- Das Startmodal verwendet kompaktere Aktionen mit sichtbarem Abstand. Der Erfolgszustand bietet `Anzeige ansehen`, `Anzeige bearbeiten` und `Schließen`.
- Inventarkarten öffnen beim Klick die öffentliche Anzeige; in den aufgeklappten Details führt `Anzeige bearbeiten` gezielt zur Bearbeiten-Seite.

## Funktionsumfang

- bestätigt eine bestehende Kleinanzeigen-Anmeldung anhand sichtbarer Kontosignale;
- akzeptiert nur Seiten, auf denen eine eigene Anzeige über eine Bearbeiten-Funktion erkannt wird;
- erfasst Anzeigen-ID, URL, Titel, Beschreibung, Preis, Kategoriepfad, Merkmale,
  Standort, vorhandene Formularfelder und Bildreihenfolge;
- lädt zu jedem Anzeigenbild bevorzugt eine von Kleinanzeigen bereitgestellte
  JPEG-Variante, bildet einen SHA-256-Hash und speichert die Binärdaten lokal in IndexedDB;
- zeigt gespeicherte Anzeigen im eigenen skalierbaren App-Fenster und exportiert strukturierte Diagnosedaten als ZIP;
- speichert keine Zugangsdaten; destruktiv ist ausschließlich die ausdrücklich bestätigte Phase-4-Löschung der verifizierten Quellanzeige.













## Patch 1.8.14: Live-Fortschrittsmodal und Read-only-Karten

- Das v1.8.13-Startmodal bleibt nach der Freigabe geöffnet und wird zur echten Live-Fortschrittsanzeige für Phase 1–4.
- Die vier Phasen zeigen persistent pending/aktiv/erfolgreich/wartend/fehlgeschlagen und werden aus dem autoritativen Renewal-State rekonstruiert.
- Das Modal kann während des Laufs geschlossen werden, ohne den Lauf zu stoppen; eine Statusfläche in der App öffnet es wieder.
- Nach erfolgreichem Austausch zeigt dasselbe Modal den Abschlusszustand mit neuer Anzeigen-ID und `Anzeige ansehen`; die neue Karte ist dort ebenfalls klickbar.
- Inventarkarten öffnen per Kartenklick nun die öffentliche Read-only-ID-URL `/s-anzeige/<adId>`. Interaktive Kartenelemente behalten ihre eigene Aktion.
- Der Link in `Artikeldetails anzeigen` heißt nun `Anzeige bearbeiten` und führt deterministisch auf `/p-anzeige-bearbeiten.html?adId=<adId>`.
- Keine automatische Scrollpositionsänderung der Inventarliste.

## Patch 1.8.13: bestätigter Vollautomatik-Lauf Phase 1–4

**Neu inserieren** startet nicht mehr unmittelbar. Vorher zeigt die App ein eigenes, gestaltetes Modal mit Titel und lokalem Titelbild der Quellanzeige. Das Modal erklärt die vier Phasen **Ausfüllen → Veröffentlichen → Verifizieren → Quellanzeige löschen**, weist ausdrücklich darauf hin, dass die alte Online-Anzeige erst nach vollständiger Verifikation gelöscht wird, und erklärt die 30-Tage-Recovery über den Papierkorb. Erst **Neu inserieren und austauschen** erteilt die Freigabe für den vollständigen Lauf.

Diese Freigabe wird als `autoReplacementAllowed` persistent an Renewal- und Fill-Session gebunden. Der bestehende Auto-Publish-Hard-Gate bleibt unverändert streng. Nach einem vollständigen `match` der erneut inventarisierten Bearbeiten-Seite und der öffentlichen Anzeige startet Phase 4 automatisch. Bei Service-Worker-Neustart werden bestätigte, bereits verifizierte automatische Renewals einschließlich laufender `source-delete...`-Phasen wieder aufgenommen.

Scheitert die automatische Phase 4, wird die Quellanzeige nicht ungeprüft lokal entfernt. Der Kandidat bleibt `verified/replacement-ready` und kann über die bestehende manuelle Aktion erneut abgeschlossen werden. Erfolgreiche Läufe verwenden weiterhin die persistente App-Erfolgsmeldung und den 30-Tage-Papierkorb aus v1.8.12. Papierkorb-Recovery selbst bleibt ausdrücklich Template-only und veröffentlicht weiterhin nicht automatisch.

## Patch 1.8.12: 30-Tage-Papierkorb, Recovery-Vorlage und Abschluss-UX

Gelöschte aktive Inventareinträge werden ab v1.8.12 nicht mehr sofort endgültig entfernt. Sie wechseln mit ihren lokal gespeicherten Bildern für **30 Tage** in die eigene App-Ansicht **Papierkorb**. Nach Ablauf werden Datensatz und Bilder automatisch beim nächsten Extension-/Listen-Lifecycle bereinigt. Eine Rückverschiebung ins aktive Inventar gibt es bewusst nicht: Der aktive Kleinanzeigen-Bestand bleibt die autoritative Datenbasis.

Der Papierkorb dient ausschließlich als Recovery-Archiv. **Als Vorlage neu inserieren** übernimmt die gesicherten Formulardaten und Bilder in eine neue Anzeige, führt die notwendigen nicht veröffentlichenden Zwischenschritte aus und stoppt am finalen Publish-Schritt. Dieser Template-only-Lauf erzeugt keine Renewal-Sitzung und darf niemals automatisch auf **Anzeige aufgeben** klicken. **Endgültig löschen** entfernt den Papierkorb-Datensatz samt lokaler Bilder sofort.

Beim erfolgreichen **Austausch abschließen** wird die alte Quellanzeige weiterhin online gelöscht und autoritativ verifiziert. Der lokale Phase-4-Wechsel legt die alte Quelle nun jedoch atomar im 30-Tage-Papierkorb ab, während die neue Anzeige zum normalen Inventareintrag wird. Danach zeigt die App eine persistente Erfolgsmeldung **Austausch erfolgreich abgeschlossen** und schließt den von der Extension erzeugten Renewal-Zieltab best-effort, sofern dieser noch eindeutig auf dem Renewal-/Bestätigungsflow steht.

## Patch 1.8.11: robuste Phase-4-Verifikation nach Lösch-Navigation

Nach dem Klick auf **Ja, Anzeige löschen** kann Kleinanzeigen die Seite unmittelbar navigieren oder neu laden. Dadurch darf ein geschlossener Chrome-Message-Channel nicht mehr als fachlicher Löschfehler interpretiert werden. v1.8.11 behandelt den beobachteten Post-Confirmation-Transportabbruch ausschließlich als **unklares Transportergebnis** und startet danach immer die unabhängige Löschverifikation.

Dafür wird der persistente Zwischenzustand `source-delete-verification-pending` geschrieben. Die autoritative Prüfung läuft in einem **separaten frischen Worker-Tab** auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`, prüft erneut das erwartete Profil und sucht die alte Quell-ID über die vollständige Pagination. Kurze serverseitige Konsistenzverzögerungen werden durch bis zu drei vollständige Prüfversuche abgefangen. Nur ein bestätigtes vollständiges Verschwinden der Quell-ID erlaubt den atomaren lokalen Inventarwechsel.

Bleibt die Quellanzeige nach allen Prüfversuchen vorhanden, wird nichts lokal gelöscht oder umgehängt; der Renewal-Kandidat kehrt in den sicheren Zustand **AUSTAUSCH BEREIT** zurück und kann erneut angestoßen werden. Lösch-Worker und Verifikations-Worker werden unabhängig voneinander aufgeräumt.

## Patch 1.8.10: deterministische Retry-Verifikation mit „Meine Anzeigen“-Fallback

**Erneut prüfen** validiert die bereits veröffentlichte neue Anzeige wieder vollständig. Zuerst wird die Bearbeiten-Seite `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=<newAdId>` geöffnet und die gespeicherte Anzeige erneut inventarisiert. Damit werden Titel, Beschreibung, Kategorie, Preis/Preisart, Attribute, Versand, Standort und Bilder erneut gegen die Quellanzeige geprüft.

Die öffentliche Prüfung verwendet anschließend ausschließlich die kurze, ID-basierte Read-only-URL `https://www.kleinanzeigen.de/s-anzeige/<newAdId>`. Eine öffentliche URL wird im Renewal-Retry nicht mehr aus Titel, Kategorie und Ort zusammengesetzt.

Bleibt die Read-only-Prüfung unklar, öffnet die Extension als Fallback `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`, bestätigt das erwartete Profil und sucht die neue Anzeigen-ID über alle erreichbaren Seiten. Wird die Karte gefunden und enthält sie eine konkrete öffentliche Anzeigen-URL, wird diese noch einmal als Read-only-Ziel geprüft. Eine gefundene eigene Anzeige bei weiterhin unklarer öffentlicher Erreichbarkeit bleibt **VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT**; fehlt sie auch im vollständigen „Meine Anzeigen“-Scan, wechselt der Vorgang zu **PRÜFUNG ERFORDERLICH**.

## Patch 1.8.9: veröffentlichte Anzeige ohne Dead-Lock nach Online-Latenz

Ein fachlich vollständig übereinstimmender Renewal-Kandidat wird nicht mehr als `verification-failed` behandelt, wenn ausschließlich die öffentliche Read-only-Erreichbarkeit noch fehlt. Dieser reale Kleinanzeigen-Zwischenzustand erhält nun `waiting-for-online` und die sichtbare Kennzeichnung **VERÖFFENTLICHUNG NOCH NICHT BESTÄTIGT**.

Die zugehörige Aktion **Erneut prüfen** ist aktiv. Sie prüft bevorzugt nur die bekannte öffentliche URL der bereits erfassten neuen Anzeigen-ID und verwendet den bereits erfolgreichen fachlichen Vergleich weiter. Sobald die Read-only-Seite eindeutig erreichbar ist, wechselt der Kandidat ohne erneutes Inserieren zu **AUSTAUSCH BEREIT**. Echte Mismatches bzw. andere Unsicherheiten bleiben **PRÜFUNG ERFORDERLICH**, besitzen nun aber ebenfalls eine aktive Aktion **Erneut prüfen**, die eine vollständige Re-Inventarisierung auslöst.

Persistierte v1.8.8-Sitzungen, die nur wegen `onlineConfirmed=false` auf `verification-failed` stehen, werden beim Service-Worker-Resume automatisch nach `waiting-for-online` migriert und einmal erneut geprüft. Dadurch kann der bereits veröffentlichte Kandidat nach einem Update auf v1.8.9 weiterverwendet werden.

## Patch 1.8.8: variables Löschfeedback + autoritativer Vollscan-Fallback

Nach dem bestätigten Klick auf **„Ja, Anzeige löschen“** akzeptiert Phase 4 die real beobachteten Kleinanzeigen-Erfolgsvarianten nur noch als optionale UI-Evidenz: den Toast **„Anzeige wurde gelöscht“** oder das Modal **„Erledigt!“**. Fehlt beides, ist das kein unmittelbarer Fehler. Ebenso darf ein beim Modal im Hintergrund noch sichtbarer Karten-DOM den Ablauf nicht mehr vorzeitig abbrechen.

Die eigentliche Sicherheitsentscheidung bleibt davon unabhängig: Der Worker lädt anschließend `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` frisch ab Seite 1 und sucht die alte Quell-ID erneut über alle erreichbaren Seiten. Nur wenn die Quell-ID im vollständigen paginierten Bestand nicht mehr gefunden wird, darf der lokale Phase-4-Inventarwechsel stattfinden. Toast, Modal und lokales DOM sind lediglich Diagnoseevidenz und können diese Prüfung nicht ersetzen.

## Patch 1.8.7: Löschbestätigungsdialog eindeutig bestätigen

Phase 4 erkennt den aktuell beobachteten Kleinanzeigen-Dialog **„Anzeige löschen“** nun separat von der Kartenaktion. Primär wird ausschließlich der aktive Button `#delete-celebration-sbmt` mit dem exakten Text **„Ja, Anzeige löschen“** akzeptiert; zusätzlich müssen Dialogtitel und Sicherheitsfrage passen. Falls die ID fehlt, ist nur ein einzelner aktiver Button mit exakt demselben Text als kontrollierter Fallback zulässig. `Abbrechen` und `Schließen` sind dadurch keine Kandidaten.

## Patch 1.8.6: Phase-4-Diagnose darf die Löschung nicht abbrechen

`inventory-runner.js` besitzt nun einen eigenen fehlertoleranten Diagnose-Helper. Die in 1.8.5 ergänzten Phase-4-Diagnoseereignisse werden best-effort über `LOG_DIAGNOSTIC_EVENT` protokolliert; ein Diagnosefehler oder ein nicht erreichbarer Runtime-Kanal darf den eigentlichen Löschablauf niemals beeinflussen. Damit ist der in 1.8.5 beobachtete Abbruch `diagnostic is not defined` behoben.

Die eigentliche Phase-4-Sicherheitslogik aus 1.8.5 bleibt unverändert: Suche der Quell-ID ausschließlich unter `Meine Anzeigen` / `tab=PROJECTS`, eindeutige Kartenbindung über `data-adid`, seitenübergreifende Suche und frische Vollverifikation vor dem lokalen Inventarwechsel.

## Patch 1.8.5: robuste Phase-4-Löschung über alle „Meine Anzeigen“-Seiten

Phase 4 verwendet für die Online-Löschung ausschließlich `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS`. Anzeigenkarten werden primär über die von Kleinanzeigen gelieferte Kombination `data-testid="ad-card"` und `data-adid` gebunden. Dadurch kann ein inneres Aktions-`<li>` nicht mehr fälschlich als vollständige Anzeigenkarte erkannt werden.

Die Quell-Anzeigen-ID wird seitenübergreifend gesucht. Nach einer ausgelösten Löschung wird Seite 1 frisch geladen und die gesamte paginierte Liste erneut durchsucht. Erst wenn die Quell-ID auf keiner erreichbaren Seite mehr vorkommt, darf der atomare lokale Inventarwechsel stattfinden. Bei Paging-Schleifen, mehrdeutigen Löschaktionen, Profilwechsel oder weiterhin gefundener Quell-ID bricht Phase 4 ohne lokalen Abschluss ab.


## Patch 1.8.4: Phase 4 und Aktionen für austauschbereite Anzeigen

Ein verifizierter Renewal-Kandidat zeigt nun **Austausch abschließen**, **Aktualisieren** und **Aus Inventar entfernen**. „Aus Inventar entfernen“ ist strikt lokal und verändert keine Anzeige auf Kleinanzeigen. „Aktualisieren“ erfasst die neue Anzeige erneut und wiederholt anschließend die Renewal-Verifikation.

**Austausch abschließen** ist Phase 4: Die alte Quellanzeige wird über „Meine Anzeigen“ anhand ihrer stabilen Anzeigen-ID gesucht und nur bei genau einer eindeutigen Löschaktion gelöscht. Die Erweiterung bestätigt die Löschung, bevor der lokale Bestand atomar umgestellt wird. Danach wird der neue Kandidat zu einem normalen Inventareintrag unter seiner neuen Anzeigen-ID, alle Renewal-Referenzen entfallen und die normalen Aktionen einschließlich **Neu inserieren** stehen wieder zur Verfügung. Kann die Online-Löschung oder deren Verifikation nicht eindeutig bestätigt werden, wird der lokale Phase-4-Abschluss nicht ausgeführt.

## Patch 1.8.3: verifizierte Renewal-Kandidaten normalisieren

Nach erfolgreicher Veröffentlichung, automatischer Phase-2-Neuinventarisierung und semantischem `match` ist die neue Anzeige kein Draft mehr. Die Inventarzeile verwendet deshalb ab 1.8.3 wieder die normale Kartenoptik und zeigt den Status **AUSTAUSCH BEREIT**. Die neue Anzeigen-ID ist in der kompakten Ansicht die primäre ID; die alte Quell-ID bleibt als Renewal-Referenz nur in den Artikeldetails erhalten. Intern bleibt die Renewal-Verknüpfung bis zur späteren Phase 4 bestehen.

Unveröffentlichte Skeletons/Drafts bleiben weiterhin klar als Draft gekennzeichnet und können lokal über **Entwurf verwerfen** bereinigt werden. Sobald eine neue Anzeigen-ID bestätigt ist, gilt dieser einfache Draft-Löschpfad nicht mehr.

## Patch 1.8.2: sicheres Auto-Publish und lokale Draft-Bereinigung

Nach vollständig verifiziertem Renewal-Fill darf die Extension den finalen sichtbaren Button **Anzeige aufgeben** jetzt automatisch betätigen. Das ist ausschließlich erlaubt, wenn der persistierte Fill `complete` ist, `issues` leer ist, alle kontrollierten Formularwerte und Bilder erfolgreich bestätigt wurden und **genau ein** sichtbarer, aktivierter Publish-Button eindeutig erkannt wird. Bei fehlendem oder mehrdeutigem Publish-Control wird nicht geraten; der Vorgang bleibt zur manuellen Prüfung stehen. Nach dem Auto-Publish läuft die bestehende Phase-1-Kette weiter: Submit erkennen, neue Anzeigen-ID bestätigen, Phase 2 re-inventarisieren und Phase 3 semantisch vergleichen. Die Quellanzeige bleibt bis auf Weiteres unangetastet; Phase 4 ist weiterhin nicht implementiert.

Nicht veröffentlichte Renewal-Skeletons ohne bestätigte neue Anzeigen-ID können jetzt über **Entwurf verwerfen** lokal bereinigt werden. Vorher bestätigt die App ausdrücklich, dass nur der lokale Draft und seine Renewal-Sitzung entfernt werden und auf Kleinanzeigen nichts gelöscht wird. Sobald ein Renewal bereits an die Veröffentlichung übergeben wurde oder eine neue Anzeigen-ID besitzt, ist dieser einfache Draft-Löschpfad gesperrt.

## Patch 1.8.1: automatisches Weiter, Session-Diagnose und sichtbare Version

Nach einer vollständig verifizierten Vorlagenübernahme darf die Extension nun den **nicht veröffentlichenden** Navigationsschritt **Weiter** automatisch auslösen, sofern genau ein sichtbarer und aktivierter Weiter-Button eindeutig erkannt wird. Anschließend wird entweder die Navigation bzw. der finale Prüfschritt bestätigt oder bei Unklarheit auf manuelle Fortsetzung zurückgefallen. In Version 1.8.1 blieb der Publish-Button **Anzeige aufgeben** noch eine bewusste Benutzeraktion. Diese Regel wurde in 1.8.2 durch das strikt verifizierte Auto-Publish-Hard-Gate ersetzt.

Das Standard-Diagnose-ZIP ist ab 1.8.1 sessionbezogen: Exportiert werden nur Ereignisse seit dem aktuellen `DIAGNOSTIC_SESSION_STARTED`, dazu nur die in dieser Session relevanten Fill-/Renewal-Sitzungen, Inventareinträge und gegebenenfalls der zugehörige Bulk-Run. Der interne 14-Tage-Retention-Puffer bleibt für Laufzeit/Recovery bestehen, wird aber nicht mehr pauschal in jedes ZIP kopiert.

Im App-Header wird außerdem die tatsächlich installierte Version direkt aus `chrome.runtime.getManifest().version` angezeigt.

## Renewal Phase 1–3 ab 1.8.0

Version 1.8.0 führt den sicheren Ersetzungsworkflow bis einschließlich Verifikation ein. Beim Klick auf **Neu inserieren** entsteht sofort zusätzlich zum Quellartikel ein persistenter **Draft/Skeleton** im Inventar. Der Skeleton besitzt zunächst nur eine lokale Renewal-ID und eine Referenz auf die Quell-Anzeige; Titel, Titelbild und weitere Sollwerte werden zur Orientierung aus der Quelle gespiegelt und sichtbar als Draft markiert.

In der ursprünglichen Phase-1–3-Einführung von 1.8.0 veröffentlichte der Template-Fill noch nicht selbst. Seit 1.8.2 darf der finale Publish-Schritt ausschließlich hinter dem vollständigen, abweichungsfreien Hard-Gate automatisch ausgelöst werden. Das Feedback-Popover begleitet den gesamten Ablauf und kann über ein kleines **X** nur bis zur nächsten neuen Statusmeldung ausgeblendet werden.

Nach dem Benutzer-Submit erkennt die Extension die neue Anzeigen-ID. Der bestehende Skeleton wird weiterverwendet; es entsteht kein zweiter Renewal-Datensatz. Anschließend werden Bearbeiten-Seite und öffentliche Read-only-Seite der neuen Anzeige parallel verarbeitet. Die frisch ausgelesenen Daten und lokal neu gespeicherten Bilder füllen den Skeleton unter derselben lokalen Inventar-ID.

Danach folgt ein semantischer Vergleich mit der Quelle. Verglichen werden Titel, Beschreibung, Anzeigenart, Kategorie, Preis/Preisart, dynamische Attribute, Versand-Grundstatus, Standort und Bilder in Reihenfolge und Inhalt. Technisch erwartbar neue Werte wie Anzeigen-ID, Bild-UUIDs, CDN-URLs und Datumswerte werden nicht als Inhaltsabweichung gewertet. Für Bilder wird zuerst der lokale SHA-256 genutzt; bei serverseitiger JPEG-Neukodierung fällt der Vergleich auf einen toleranten 16×16-Graustufen-Vergleich zurück.

Nur bei eindeutig bestätigter Online-Anzeige und vollständig passendem Inhalt wird der Renewal als **VERIFIZIERT / replacement-ready** markiert. Bei Abweichungen oder unklaren Prüfschritten bleibt der alte Quellartikel unverändert. Das automatische Löschen der alten Kleinanzeigen-Anzeige gehört bewusst noch nicht zu 1.8.0; Phase 4 folgt erst nach separater Freigabe und Praxiserprobung dieser Verifikationskette.

Renewal-Sitzungen werden persistent gespeichert. Nach einem Service-Worker-Neustart kann eine bereits bestätigte neue Anzeigen-ID Phase 2/3 aus einem sauberen Worker-Zustand fortsetzen; ein bereits ausgelöster Publish-Schritt wird erneut auf eine erkennbare neue Anzeigen-ID geprüft.

## Live-Inventarliste und Read-only-Metadatenfix ab 1.7.1

Version 1.7.1 aktualisiert die Inventarliste während eines Vollinventurlaufs automatisch nach jedem erfolgreich gespeicherten Artikel. Die App empfängt dafür best-effort interne `INVENTORY_DATA_CHANGED`-Signale aus dem Hintergrunddienst und lädt die lokale Inventarliste leicht verzögert neu; Suche und Sortierung bleiben dabei aktiv. Nach `BULK_INVENTORY_FINISHED` erfolgt zusätzlich ein sofortiger finaler Reload, sodass die Liste nicht mehr manuell über „Aktualisieren“ nachgezogen werden muss.

Außerdem wurde die Ermittlung der öffentlichen Read-only-Anzeigen-URL im Vollinventurlauf robuster gemacht. Die Suche ist nicht mehr auf den vom „Bearbeiten“-Control abgeleiteten Karten-Teilbaum beschränkt, sondern fällt bei Bedarf auf das zugehörige Dokument zurück und sucht dort die öffentliche `/s-anzeige/`-URL mit exakt derselben stabilen Anzeigen-ID. Damit können Bearbeiten-Worker und Read-only-Metadaten-Worker wieder parallel geöffnet werden, auch wenn Kleinanzeigen Bearbeiten-Aktion und öffentlichen Anzeigenlink in getrennten DOM-Teilbereichen rendert.

## Inventarsuche, Sortierung und kompaktere Zeilen ab 1.7.0

Version 1.7.0 ergänzt die einspaltige Inventarliste um eine lokale Titelsuche sowie eine kombinierbare Sortierung nach **Name / Titel**, **Veröffentlichungsdatum / Anzeige vom**, **Endet am** und **Inventarisierungsdatum**. Für jedes Kriterium kann auf- oder absteigend sortiert werden. Datensätze ohne das jeweils benötigte Datum bleiben unabhängig von der Richtung gesammelt am Listenende. Die Standardsortierung ist weiterhin das Inventarisierungsdatum absteigend. Suche und Sortierung verändern ausschließlich die lokale Ansicht und lösen keine neue Inventarisierung aus.

Die kompakte Inventarzeile nutzt weniger Höhe: Labels wie **ANZEIGE VOM** bleiben einzeilig, und `Inventarisiert … · ID …` steht nun in der unteren Zeile rechts neben **Artikeldetails anzeigen**. Der Preis zeigt bei vorhandener gespeicherter Preisart konsequent Kurz- und Langform, z. B. `5 € · FP / Festpreis` oder `15 € · VB / Verhandlungsbasis`. Fehlt bei einem älteren Datensatz die Preisart, wird weiterhin nur der Betrag dargestellt.

## Stabile Aktionsbuttons bei stillen Healthchecks ab 1.6.2

Version 1.6.2 erweitert den stillen 5-Sekunden-Healthcheck aus 1.6.1 auf die Interaktionszustände. Solange die zuletzt bestätigte Verbindung zu **Meine Anzeigen** gesund ist, setzt eine planmäßige Hintergrundprüfung `pageReady` nicht mehr vorsorglich auf `false` und deaktiviert **Inventurlauf starten** nicht mehr kurzzeitig. Der bestehende Button-Zustand bleibt während des Healthchecks unverändert. Erst wenn die Prüfung tatsächlich feststellt, dass **Meine Anzeigen** nicht mehr geöffnet ist, kein Tab mehr vorhanden ist oder die Content-Script-Verbindung terminal fehlschlägt, werden Ready-State und Aktionen deaktiviert. Initialisierung und ein ausdrücklich vom Benutzer ausgelöstes **Aktualisieren** dürfen weiterhin als Vordergrundprüfung temporär sperren.

## Stiller Verbindungs-Healthcheck ab 1.6.1

Version 1.6.1 verhindert das sichtbare Statusflackern des regelmäßigen Verbindungs-Healthchecks. Solange die letzte Prüfung die Content-Script-Verbindung als gesund bestätigt hat, läuft die nächste planmäßige Prüfung im Hintergrund und lässt den sichtbaren App-Status unverändert. **Extension-Verbindung wird hergestellt** erscheint weiterhin beim initialen Start, beim ausdrücklichen Benutzer-Refresh oder nachdem ein echter Verbindungsfehler den Healthy-State zurückgesetzt hat.

## Parallele Metadaten, Profil-Prerequisite und Diagnose ab 1.6.0

Version 1.6.0 erweitert die Inventarisierung pro Anzeige um eine zweite, ergänzende Quelle. Während die **Bearbeiten-Seite** weiterhin die maßgebliche Quelle für Formularwerte, dynamische Merkmale und lokale Bilder bleibt, kann gleichzeitig die öffentliche **Read-only-Detailseite** derselben Anzeige in einem zweiten inaktiven Worker-Tab verarbeitet werden. Beide Ergebnisse werden ausschließlich über die stabile Anzeigen-ID zusammengeführt.

Im eingeloggten Zustand eigener Anzeigen liest die Read-only-Seite zwei getrennte Datumswerte: **Endet am** aus dem Bereich „Deine Anzeige“ sowie das im öffentlichen Anzeigenbereich sichtbare **Anzeige vom**-Datum. Gespeichert werden jeweils Anzeige- und ISO-Wert in `listingMeta`. Ein Fehler oder Timeout der Read-only-Seite lässt die primäre Inventarisierung über die Bearbeiten-Seite weiterlaufen. Bei der Einzelaktion **Aktualisieren** gilt derselbe parallele Zwei-Quellen-Ablauf; bereits gespeicherte Datumswerte bleiben erhalten, falls die ergänzende Quelle vorübergehend nicht verfügbar ist.

Als technische Voraussetzung für das spätere **PROFIL-MANAGEMENT** erkennt die Extension auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` den sichtbaren Headerwert `angemeldet als: <Profilname>`. Daraus wird lokal ein Profilobjekt mit stabiler interner `profileId` erzeugt. Existieren ältere Inventareinträge ohne Profilbezug, erfolgt **keine stille Migration**: Die App nennt den konkret erkannten Profilnamen und fragt ausdrücklich, ob die bestehende profilneutrale Inventarliste diesem Profil zugeordnet werden soll. Nur nach Bestätigung werden die bestehenden Datensätze verlustfrei zugeordnet; Ablehnung lässt sie unverändert. Das vollständige Mehrprofil-Management mit Umschalter/Löschen ist noch nicht Bestandteil von 1.6.0.

Die Diagnose-Zusammenfassung trennt außerdem Ereignisse der aktuellen Diagnose-Session beziehungsweise des aktuellsten korrelierten Runs/Fills von älteren Ereignissen im Retention-Puffer. Dadurch kann ein aktueller erfolgreicher Lauf klar `0` Warnungen/Fehler ausweisen, auch wenn historische Verbindungswarnungen weiterhin im Diagnose-ZIP enthalten bleiben.


## Kategorieabschluss-Fix ab 1.5.1

Version 1.5.1 korrigiert den Legacy-Kategorieassistenten für finale Kategorien, deren Auswahl nicht automatisch zu den Anzeigendetails navigiert. Nach **jeder finalen Kategorieauswahl** wartet der Filler mindestens die bestehende 100-ms-Aktionspause und prüft anschließend explizit, ob Kleinanzeigen bereits navigiert hat, ob weitere erforderliche Wizard-Merkmale erschienen sind oder ob der sichtbare Button **Weiter** betätigt werden muss.

Damit wird insbesondere der bestätigte zweistufige Fall `Haus & Garten → Weiteres Haus & Garten` korrekt abgeschlossen. Der bestehende mehrstufige Flow mit zusätzlichen Pflichtmerkmalen bleibt erhalten und wird weiterhin vor dem finalen **Weiter** abgearbeitet. Bleibt die Seite nach der finalen Auswahl ohne Navigation, Pflichtmerkmal oder **Weiter**, endet der Lauf nun mit einer klaren Fehlermeldung statt im Status `category-leaf-selected` hängen zu bleiben.

## Verbindungs-Bootstrap und Inventar-Aktualisierung ab 1.5.0

Version 1.5.0 ersetzt den bisherigen reinen Message-Retry durch einen expliziten Content-Script-Handshake. Wenn ein Kleinanzeigen-Tab `Receiving end does not exist` meldet, prüft der Hintergrunddienst den Zieltab und injiziert das vollständige Content-Script-Paket bei Bedarf idempotent über `chrome.scripting`. Erst wenn `KR_CONTENT_READY` alle benötigten Module bestätigt, führt die App `PAGE_STATUS` oder weitere Seitenaktionen aus. Die Statusprüfung ist single-flight und plant die nächste Prüfung erst nach Abschluss der vorherigen; überlappende Retry-Schleifen sind damit ausgeschlossen.

Die Diagnoseoberfläche ist reduziert: Die früheren Kopierfunktionen für Bild-/Formulardiagnose und die sichtbare Roh-JSON-Ausgabe sind entfernt. Der persistente strukturierte Eventlog bleibt erhalten und wird ausschließlich über **Diagnose-ZIP herunterladen** exportiert.

In jeder Inventarzeile steht jetzt **Neu inserieren → Aktualisieren → Löschen**. **Aktualisieren** inventarisiert ausschließlich die gewählte Anzeige im Bearbeiten-Modus neu. Erst wenn Formular, Merkmale und Bilder vollständig gespeichert wurden, ersetzt der atomare Commit den vorhandenen lokalen Datensatz; bei Fehler bleibt der bisherige Stand erhalten. Ein bekanntes `Endet am`-Datum wird beim manuellen Update bewahrt, falls die Bearbeiten-Seite selbst kein neues Enddatum liefert.

Die nicht-interaktive Fläche einer Inventarzeile öffnet die Anzeige direkt im Bearbeiten-Modus. Aktionen, Links und die komplette aufklappbare Detailansicht lösen diesen Karten-Klick nicht aus.

## Diagnose, Listenansicht und Robustheit ab 1.4.0

Version 1.4.0 erweitert die Diagnose grundlegend. Automatische Abläufe wie Vollinventur, Paging, Worker-Tabs, Einzelinventarisierung, Template-Fill, Bildübernahme, Verifikation und Einzel-Retry erzeugen strukturierte Diagnoseereignisse. Benutzeraktionen innerhalb der Extension-App werden ebenfalls als Aktionen mit Zeitpunkt, Ergebnis und relevanten Anzeigen-/Run-IDs protokolliert. Die Diagnosehistorie wird begrenzt und persistent in `chrome.storage.local` gehalten, damit Service-Worker-Restarts oder das Schließen des App-Fensters den relevanten Ablauf nicht verlieren.

Unter **Diagnose** steht **Diagnose-ZIP herunterladen** zur Verfügung. Das ZIP enthält `summary.txt`, `diagnostics.jsonl`, `errors.json`, `bulk-run.json`, `fill-sessions.json`, `inventory-summary.json` und `environment.json`. CSRF-, Cookie-, Passwort-, Autorisierungs- und Tokenwerte werden redigiert, URL-Queryparameter entfernt und vollständige Beschreibungs-/Kontaktwerte nicht in den Export aufgenommen.

Die App wartet bei vorübergehend nicht erreichbaren Kleinanzeigen-Content-Scripts mit begrenztem Retry/Backoff, statt `Could not establish connection. Receiving end does not exist.` sofort als endgültigen Seitenfehler zu behandeln. Verbindungsversuche und Erholung werden diagnostisch protokolliert.

Die Inventarliste ist nun einspaltig. Jeder Artikel nutzt die verfügbare Breite als Listenzeile und zeigt Titelbild, Titel, Kategorie, Art, Preis und das beim Vollinventurlauf aus **Meine Anzeigen** übernommene sichtbare Datum **Endet am DD.MM.YYYY**. Die einspaltige Struktur ist die Basis für spätere Filter- und Sortierfunktionen.

Außerdem ist der Scroll-zum-`Anzeige aufgeben`-Schritt korrigiert: Er verwendet die vorhandenen Helper des Template-Fillers. Ein reiner Scrollfehler kann einen bereits vollständig verifizierten Fill nicht mehr nachträglich auf Fehler setzen; er wird nur als Diagnosewarnung erfasst.

Bekannte Einschränkung in 1.4.0: Der kleine In-Page-Feedback-Overlay auf „Meine Anzeigen“ kann nach einem erfolgreichen Einzel-Retry noch den alten Fehlerzähler zeigen. Dieser Darstellungsfehler ist bewusst nicht Teil dieses Builds; die Fehlerliste im App-Fenster und der persistente Run-State sind maßgeblich.

## Eigenes App-Fenster und Fehler-Retry ab 1.3.0

Die Toolbar öffnet nur noch einen kompakten Launcher. Die eigentliche Inventarverwaltung läuft in einem eigenen Chrome-App-Fenster (`app.html`), das mit 1180×860 Pixeln startet, frei skalierbar ist und beim erneuten Öffnen fokussiert statt dupliziert wird. Dadurch stehen Vollinventur, Fehlerliste, Artikeldetails, Diagnose und große Inventaransichten gleichzeitig zur Verfügung.

Fehler aus einem abgeschlossenen Vollinventurlauf werden jetzt mit Titel, Anzeigen-ID und konkretem Fehlergrund im App-Fenster angezeigt. Jede fehlgeschlagene Anzeige kann über **Erneut versuchen** einzeln neu inventarisiert werden. Der Retry öffnet ausschließlich für diese stabile Anzeigen-ID einen neuen inaktiven Bearbeiten-Worker-Tab. Bei Erfolg wird der Fehlerstatus entfernt, der Artikel normal gespeichert und die Laufstatistik konsistent von Fehler auf Erfolg umgebucht; bei erneutem Fehlschlag werden Fehlergrund und Retry-Zeitpunkt aktualisiert. Parallel laufende Retries werden verhindert.

Auf der ursprünglichen Seite **Meine Anzeigen** werden fehlgeschlagene Anzeigenkarten anhand ihrer stabilen Anzeigen-ID dezent transparent rot markiert. Die Markierung wird aus dem persistenten Bulk-Run-State wiederhergestellt und enthält zusätzlich eine direkte Aktion **Inventarisierung erneut versuchen**. Beim Paging wird die aktuelle Seite regelmäßig gegen den Fehlerzustand abgeglichen. Ein erfolgreicher Retry entfernt die Markierung automatisch.

## Vollinventur aller laufenden Anzeigen ab 1.2.0

Auf `https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS` steht jetzt **Inventurlauf starten** bereit. Der Lauf liest die sichtbare Sollzahl `N Anzeigen online`, verarbeitet die Anzeigen sequentiell über alle Paging-Seiten und öffnet jede eigene Anzeige einzeln in einem inaktiven Bearbeiten-Worker-Tab. Dort wird die bewährte Einzelinventarisierung inklusive dynamischer Merkmale und großer lokaler JPEGs ausgeführt; danach wird der Worker-Tab geschlossen und der nächste Artikel verarbeitet.

Die Seitennavigation wird über die reale Struktur mit `aria-current="page"` und `aria-label="Nächste"` verfolgt. Anzeigen werden anhand stabiler Anzeigen-IDs dedupliziert. Der Lauf gilt nur dann als vollständig, wenn die Zahl aller erfolgreich oder mit Fehlerstatus abgearbeiteten eindeutigen Anzeigen mit der erkannten Zahl `Anzeigen online` übereinstimmt. Bei Abweichungen endet der Lauf mit einem Prüfstatus statt mit einem falschen Erfolg. Ein Statuspanel auf der Seite sowie das Popup zeigen Gesamtfortschritt, aktuelle Seite und aktuellen Titel.

Die Inventarliste ist kompakter aufgebaut und zeigt Titelbild, Titel, Kategorie, Art und Preis. Pro Artikel stehen **Neu inserieren**, **Löschen** (nur lokal) und **Artikeldetails anzeigen** zur Verfügung. `Artikeldetails anzeigen` enthält weiterhin die vollständigen inventarisierten Daten und Bilddetails. **Inventarliste leeren** löscht nach Bestätigung ausschließlich lokale Inventardaten und die zugehörigen lokalen Bilder; durch diese lokalen Aktionen wird keine Kleinanzeigen-Anzeige gelöscht. Der separat abgesicherte Renewal-Workflow kann eine alte Quellanzeige erst nach verifizierter Neuerstellung und unabhängiger Löschverifikation entfernen.

Beim manuellen bzw. Template-only-Neuinserieren scrollt die Extension nach vollständig erfolgreicher Vorbefüllung zum sichtbaren Button **Anzeige aufgeben** bzw. ans Seitenende; dieser Ablauf bleibt manuell. Im Renewal-Workflow darf der finale sichtbare Publish-Button seit v1.8.2 ausschließlich nach bestandenem vollständigem Hard-Gate automatisch geklickt werden; bei fehlender oder mehrdeutiger Freigabe pausiert der Ablauf für die manuelle Prüfung.

## Neuerstellung aus dem Inventar ab 1.1.0

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

## Kategorie-Lifecycle ab 1.1.1

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

## Pflichtmerkmale im Kategorie-Assistenten ab 1.1.2

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

## Weiter-Schritt und 100-ms-Taktung ab 1.1.3

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

## Zustands- und Autocomplete-Auswahl ab 1.1.4

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


## Autocomplete- und Bildvorschau-Robustheit ab 1.1.5

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

## Sequenzieller Bild-Upload und Abschluss-Gate ab 1.1.6

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

## Installation

1. Das Build-ZIP entpacken.
2. In Chrome `chrome://extensions` öffnen.
3. Den Entwicklermodus aktivieren.
4. **Entpackte Erweiterung laden** wählen und den entpackten Ordner auswählen.
5. Bei Kleinanzeigen anmelden und eine eigene aktive Anzeige öffnen.
6. Das Erweiterungssymbol öffnen und **Geöffnete Anzeige inventarisieren** wählen.

## Feste Extension-ID

Der öffentliche Manifest-Schlüssel ist fest in `manifest.json` verankert. Bei
unveränderten Schlüsselbytes erhält jeder daraus erstellte, entpackt geladene Build
dieselbe Chrome-Extension-ID:

`hafahjhhgiipdegfkgacchmnacgblnah`

Der Manifest-Schlüssel darf in späteren Versionen nicht ersetzt oder entfernt werden.
Bei einer späteren Veröffentlichung im Chrome Web Store weist der Store technisch eine
eigene ID zu; diese muss dann als separate Release-Linie behandelt werden.

## Lokale Daten

Metadaten und Bilder verbleiben im lokalen Erweiterungsspeicher des jeweiligen
Chrome-Profils. Das Entfernen der Erweiterung kann diese Daten löschen.

## Bekannte Grenze des MVP

Kleinanzeigen verändert seine Seitenstruktur regelmäßig. Die Extraktion nutzt
strukturierte Daten und mehrere semantische DOM-Fallbacks. Ob alle Felder einer
konkreten Anzeige korrekt erkannt werden, muss mit einer echten eigenen Anzeige
geprüft werden. Nicht erkannte Kernfelder werden als Warnungen gespeichert.

## Sichere Bildaktualisierung ab 0.1.1

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

## Bauen und testen

Node.js ab Version 18, Python 3 und npm werden benötigt. Im Source-Ordner:

```sh
npm ci
bash scripts/build.sh /absoluter/ausgabeordner
```

Die IndexedDB-Regressionen verwenden fake-indexeddb 6.2.5; diese Testabhängigkeit
ist nicht Bestandteil der installierbaren Erweiterung. ZIP-Zeitstempel und
Dateireihenfolge sind festgelegt, um identische Archive reproduzieren zu können.

## Prüfgrenzen

Die Speicherregressionen sind automatisierte Tests mit einer IndexedDB-Emulation.
Kein Chrome-Lauf und kein Test mit einer angemeldeten Kleinanzeigen-Sitzung wurde
für diese Version durchgeführt. Die bekannten Grenzen der Eigentümererkennung
und der Website-Extraktion bleiben offen; diese Revision betrifft Bildspeicherung
und lokale Vorschauen.

## Bildkorrektur 0.1.2

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

### Aktualisieren und testen

1. Neuen Build in den bisherigen Erweiterungsordner entpacken bzw. dessen Dateien
   durch den neuen Stand ersetzen. Erweiterung nicht deinstallieren.
2. Unter chrome://extensions die Erweiterung neu laden.
3. Die eigene Kleinanzeigen-Detailseite neu laden.
4. „Geöffnete Anzeige inventarisieren“ erneut anklicken. Alte 25er-Einträge bleiben
   bis zur erfolgreichen Neuerfassung erhalten und werden dann atomar ersetzt.
5. Bildanzahl, Motive, Reihenfolge und die Formatangaben prüfen.

Unter „Diagnose“ ist „Bilddiagnose der aktuellen Seite kopieren“ verfügbar. Das
Ergebnis enthält Galerie-IDs/-Klassen, begrenzte DOM-Bildattribute, Kandidaten-URLs,
Auswahlstrategie und zusammengeführte Varianten sowie den passenden gespeicherten
Bildstand. Kein vollständiger DOM, keine Login-Daten oder Formularwerte werden
kopiert. Die Diagnose enthält die Anzeigen-URL und Bild-URLs. Bei gesperrter
Zwischenablage kann der Text im angezeigten Textfeld manuell kopiert werden.

Die Tests verwenden zusätzlich linkedom 0.18.12 für DOM-Emulation. Es wurde kein
angemeldeter Chrome-End-to-End-Test mit der Nutzeranzeige durchgeführt.

## Beschreibungskorrektur 0.1.3

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



## Strukturierte Bearbeiten-Daten 0.1.7

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


## Großbild-Abrufkorrektur 0.1.6

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

## Kategorie-/Merkmalsmodell und Großbilder 0.1.5

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

## Bearbeiten-Ansicht 0.1.4

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

### Bilder im Bearbeiten-Modus

Die Bildsuche ist auf Upload-/Bildcontainer innerhalb des Formulars begrenzt.
CDN-Varianten werden wie bisher zusammengeführt, die DOM-Reihenfolge bleibt erhalten.
Neu hinzugefügte lokale blob-/data-Vorschaubilder werden nicht stillschweigend ausgelassen:
wenn sie im ausgewählten Bildbereich vorhanden sind, wird die Inventarisierung abgebrochen.
Es werden bestehende bereits hochgeladene Anzeigenbilder erwartet.

Ab 0.1.7 wird die explizite `dynamicRuleXXLargeUrl` aus dem strukturierten
`PostListingForm`-Zustand bevorzugt und über die stabile Bild-UUID mit der sichtbaren
Galerie verknüpft. Diese serverseitig bereitgestellte Großbild-URL wird zuerst exakt
abgerufen. Die versteckte `adImages[n].url`-Quelle und der ab 0.1.6 bewährte
`$_57.JPG`-Rewrite für den verifizierten Kleinanzeigen-`prod-ads/images/<UUID>`-Pfad
bleiben als Fallback erhalten. Andere rule-lose CDN-Pfade werden nicht umgeschrieben.
Jede Bilddatei muss JPEG-Signaturprüfung und createImageBitmap-Dekodierung bestehen.
MIME-Typ, SHA-256, Pixelabmessungen und Prüfnachweis werden gespeichert. Maximal
12 MiB pro JPEG und 128 MiB pro Durchlauf. Es erfolgt keine lokale Umkodierung.
Liefert das CDN keine gültige große JPEG-Version, wird der Vorgang ohne Änderung des
bisherigen Inventars abgebrochen. Der atomare Commit umfasst weiterhin Metadaten und
alle Bilder zusammen.

### Diagnose und Prüfstand

„Diagnose → Formular- und Bilddiagnose kopieren“ funktioniert auch bei einer
fehlgeschlagenen Erkennung. Sie enthält Feldstrukturen und ungeklärte Komponenten. Kontakt-/Standortwerte werden
redigiert; bei signierten Bild-CDN-URLs werden Query-Parameter entfernt. Erkannte
Passwort-/Session-/Tokenwerte werden nicht aufgenommen.

Die Tests umfassen dynamische Felder, leere/ungeklärte Werte, ID-Konflikte,
Beschreibungserhalt, Bildauswahl, JPEG-only-Fehlerpfade und Rollback. DOM und IndexedDB
werden emuliert; der JPEG-Decoder ist im automatisierten Test durch einen kontrollierten
Testdecoder ersetzt. Der reale Chrome-/Kleinanzeigen-Praxistest bestätigt für den aktuellen Testfall die
5-Bild-Reihenfolge, große lokale JPEGs und die technischen Kategorieattribute. Andere
Kategorien bleiben separat zu verifizieren. Die Chrome-Extension-ID bleibt
hafahjhhgiipdegfkgacchmnacgblnah.


### v1.9.0 – Exklusiver Inserierungs-Lock

Es kann erweiterungsweit nur ein Inserierungs-/Renewal-Lauf gleichzeitig aktiv sein. Der Lock umfasst auch `WARTET AUF ONLINE`, `PRÜFUNG NÖTIG`, Phase 4 und Papierkorb-Template-Läufe und wird aus persistentem Laufzustand rekonstruiert.


## Mehrere neu inserieren

Bis zu zehn vollständig gespeicherte Anzeigen eines Inventarprofils können über **Mehrere neu inserieren** streng nacheinander durch den bestehenden Neu-inserieren-Workflow geschickt werden. Fehler oder notwendiger Benutzereingriff werden pro Anzeige festgehalten; die Queue fährt danach mit der nächsten Anzeige fort.


### v1.16.6
Im Vollinventur-Modal wird die aktuell bearbeitete Anzeige während der Erfassung als kompakte Vorschaukarte mit Thumbnail, Titel und Anzeigen-ID dargestellt.


### v1.20.11 – ZIP-Inserierungsfortschritt
Der ZIP-Einzeldurchlauf verwendet einen eigenen monotonen Workflow-State-Kanal statt des allgemeinen Inventar-Debounces. Die Schrittleiste bleibt nach der ZIP-Prüfung stabil oben im Dialog und zeigt bestätigte Schritte dauerhaft mit Haken.


### v1.20.12 – ZIP-Dialog UI/UX-Polish
Der ZIP-Einzeldurchlauf verwendet für Vorschau, Hinweis und Fortschritts-/Ergebniskarte einen gemeinsamen vertikalen Flow-Stack mit konstanten Abständen. Der Hinweis vor dem Start ist neutral statt amber. Die frühere generische Statuskarte „Anzeige aus ZIP wird inseriert“ wird nicht mehr als persistente aktuelle Meldung verwendet; der laufende Zustand bleibt über Dialog, Inserierungs-Lock und Aktionen-Aktivitätsindikator sichtbar und verschwindet nach Terminalzustand zuverlässig aus der aktuellen Statusfläche.

## Gold-Baseline und Browser-E2E ab v1.22.0

v1.21.15 ist die unveränderliche Gold-Referenz. `tests/e2e/gold-v1.21.15.json` dokumentiert die kanonischen Artefakt-Hashes und die SHA-256-Werte der 39 Produktions-Runtime-Dateien, die v1.22.0 byteidentisch übernimmt.

Die neue echte Chrome-/MV3-Suite wird mit `npm run test:e2e` gestartet. Sie nutzt ein isoliertes temporäres Browserprofil und lokale Fixtures für `kleinanzeigen.de`; ein echtes Konto wird nicht benötigt und es werden keine realen Remote-Mutationen ausgeführt. Voraussetzungen und einzelne Szenarien sind in `tests/e2e/README.md` dokumentiert. Für einen Release-Build kann der Browser-Gate explizit mit `KR_RUN_BROWSER_E2E=1 ./scripts/build.sh <ziel>` aktiviert werden. Infrastrukturprobleme werden dabei als Fehler behandelt und niemals als bestandener oder übersprungener E2E-Test ausgegeben.

### Architekturstand v1.23.1

EPIC-REF-002 hat die Renewal-Workflow-State-Machine in `renewal-workflow-controller.js` verschoben. `background.js` delegiert die Workflow-Aufrufe weiterhin innerhalb desselben Service Workers; es entsteht keine zusätzliche IPC-Grenze. Der globale Emergency Reset und die oberste Runtime-/Lifecycle-Hoheit verbleiben bewusst in `background.js`. Der Controller bindet `KRDeps` explizit über `globalThis.KRDeps`, damit der klassische MV3-`importScripts`-Bootstrap zuverlässig funktioniert; dies wurde durch den echten Browser-E2E verifiziert.

### Release-Supervisor / Stream-Recovery
Lange Release-Pipelines sollen detached über `scripts/release-supervisor.sh start <release-dir> <work-dir>` gestartet werden. `status` führt ausschließlich einen kurzen, nicht blockierenden Poll auf PID, RC, Stage-State und Log-Tail aus. Ein Chat-/Tool-/Stream-Timeout ist keine Gate-Aussage. Vor dem Start wird ein `source-before-release`-Checkpoint erzeugt und ein alter `RELEASE_GREEN` als `source-dirty` invalidiert. Nach jeder weiteren Sourceänderung ist dieser Zyklus vor dem nächsten langen Gate zu wiederholen. Sichtbares Statusfeedback erfolgt bei langen Arbeiten spätestens ungefähr alle fünf Minuten mit Europe/Berlin-Zeitstempel.

### v1.23.16 Architektur
Bulk-/Archive-/Emergency-Lifecycle sind in explizite in-process Owner getrennt. Tests adressieren bevorzugt Public Contracts; private Helper bleiben austauschbare Implementierungsdetails.

### v1.23.20 Final Closure

v1.23.20 ist der finale Gesamt-Soak-/Gold-Paritäts-/Safety-/Reproduzierbarkeits-Build der v1.23.x-Refactoring-Serie. Der Runtime-Code bleibt gegenüber v1.23.19 byteidentisch. Nach dem technischen Release ist der native 3er-Performance-Lauf mit 5, 11 und 20 Bildern Pflicht.
