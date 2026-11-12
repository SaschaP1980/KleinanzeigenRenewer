# Historical README guidance before KAR-170

These excerpts are preserved from the previous root README at immutable source commit [`07dd90f437054f11a1fad3067c03f2e1b88ec2cb`](https://github.com/SaschaP1980/KleinanzeigenRenewer/commit/07dd90f437054f11a1fad3067c03f2e1b88ec2cb). They are **historical evidence**, not authoritative current installation instructions. For current behavior consult [the product README](../../README.md), [project context](../PROJECT_CONTEXT.md) and [release process](../RELEASE_PROCESS.md).

<!-- KAR170-BEGIN:README:122 -->
### Historical README: Kleinanzeigen Renewal (source line 122)


<!-- KAR170-END:README:122 -->

<!-- KAR170-BEGIN:README:164 -->
### Historical README: Kleinanzeigen Renewal (source line 164)

Aktueller Stand: **v1.22.23_c2**. Correction-Build auf Basis v1.22.23 gegen das Wiederhochholen archivierter terminaler Bulk-Meldungen; Safety-Gates unverändert.
<!-- KAR170-END:README:164 -->

<!-- KAR170-BEGIN:README:1181 -->
### Historical README: Funktionsumfang (source line 1181)

- bestätigt eine bestehende Kleinanzeigen-Anmeldung anhand sichtbarer Kontosignale;
- akzeptiert nur Seiten, auf denen eine eigene Anzeige über eine Bearbeiten-Funktion erkannt wird;
- erfasst Anzeigen-ID, URL, Titel, Beschreibung, Preis, Kategoriepfad, Merkmale,
  Standort, vorhandene Formularfelder und Bildreihenfolge;
- lädt zu jedem Anzeigenbild bevorzugt eine von Kleinanzeigen bereitgestellte
  JPEG-Variante, bildet einen SHA-256-Hash und speichert die Binärdaten lokal in IndexedDB;
- zeigt gespeicherte Anzeigen im eigenen skalierbaren App-Fenster und exportiert strukturierte Diagnosedaten als ZIP;
- speichert keine Zugangsdaten; destruktiv ist ausschließlich die ausdrücklich bestätigte Phase-4-Löschung der verifizierten Quellanzeige.
<!-- KAR170-END:README:1181 -->

<!-- KAR170-BEGIN:README:1543 -->
### Historical README: Installation (source line 1543)

1. Das Build-ZIP entpacken.
2. In Chrome `chrome://extensions` öffnen.
3. Den Entwicklermodus aktivieren.
4. **Entpackte Erweiterung laden** wählen und den entpackten Ordner auswählen.
5. Bei Kleinanzeigen anmelden und eine eigene aktive Anzeige öffnen.
6. Das Erweiterungssymbol öffnen und **Geöffnete Anzeige inventarisieren** wählen.
<!-- KAR170-END:README:1543 -->

<!-- KAR170-BEGIN:README:1552 -->
### Historical README: Feste Extension-ID (source line 1552)

Der öffentliche Manifest-Schlüssel ist fest in `manifest.json` verankert. Bei
unveränderten Schlüsselbytes erhält jeder daraus erstellte, entpackt geladene Build
dieselbe Chrome-Extension-ID:

`hafahjhhgiipdegfkgacchmnacgblnah`

Der Manifest-Schlüssel darf in späteren Versionen nicht ersetzt oder entfernt werden.
Bei einer späteren Veröffentlichung im Chrome Web Store weist der Store technisch eine
eigene ID zu; diese muss dann als separate Release-Linie behandelt werden.
<!-- KAR170-END:README:1552 -->

<!-- KAR170-BEGIN:README:1564 -->
### Historical README: Lokale Daten (source line 1564)

Metadaten und Bilder verbleiben im lokalen Erweiterungsspeicher des jeweiligen
Chrome-Profils. Das Entfernen der Erweiterung kann diese Daten löschen.
<!-- KAR170-END:README:1564 -->

<!-- KAR170-BEGIN:README:1569 -->
### Historical README: Bekannte Grenze des MVP (source line 1569)

Kleinanzeigen verändert seine Seitenstruktur regelmäßig. Die Extraktion nutzt
strukturierte Daten und mehrere semantische DOM-Fallbacks. Ob alle Felder einer
konkreten Anzeige korrekt erkannt werden, muss mit einer echten eigenen Anzeige
geprüft werden. Nicht erkannte Kernfelder werden als Warnungen gespeichert.
<!-- KAR170-END:README:1569 -->

<!-- KAR170-BEGIN:README:1590 -->
### Historical README: Bauen und testen (source line 1590)

Node.js ab Version 18, Python 3 und npm werden benötigt. Im Source-Ordner:

```sh
npm ci
bash scripts/build.sh /absoluter/ausgabeordner
```

Die IndexedDB-Regressionen verwenden fake-indexeddb 6.2.5; diese Testabhängigkeit
ist nicht Bestandteil der installierbaren Erweiterung. ZIP-Zeitstempel und
Dateireihenfolge sind festgelegt, um identische Archive reproduzieren zu können.
<!-- KAR170-END:README:1590 -->

<!-- KAR170-BEGIN:README:1603 -->
### Historical README: Prüfgrenzen (source line 1603)

Die Speicherregressionen sind automatisierte Tests mit einer IndexedDB-Emulation.
Kein Chrome-Lauf und kein Test mit einer angemeldeten Kleinanzeigen-Sitzung wurde
für diese Version durchgeführt. Die bekannten Grenzen der Eigentümererkennung
und der Website-Extraktion bleiben offen; diese Revision betrifft Bildspeicherung
und lokale Vorschauen.
<!-- KAR170-END:README:1603 -->

<!-- KAR170-BEGIN:README:1631 -->
### Historical README: Aktualisieren und testen (source line 1631)

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
<!-- KAR170-END:README:1631 -->

<!-- KAR170-BEGIN:README:1785 -->
### Historical README: Bilder im Bearbeiten-Modus (source line 1785)

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
<!-- KAR170-END:README:1785 -->

<!-- KAR170-BEGIN:README:1806 -->
### Historical README: Diagnose und Prüfstand (source line 1806)

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
<!-- KAR170-END:README:1806 -->

<!-- KAR170-BEGIN:README:1827 -->
### Historical README: Mehrere neu inserieren (source line 1827)

Bis zu zehn vollständig gespeicherte Anzeigen eines Inventarprofils können über **Mehrere neu inserieren** streng nacheinander durch den bestehenden Neu-inserieren-Workflow geschickt werden. Fehler oder notwendiger Benutzereingriff werden pro Anzeige festgehalten; die Queue fährt danach mit der nächsten Anzeige fort.
<!-- KAR170-END:README:1827 -->

<!-- KAR170-BEGIN:README:1853 -->
### Historical README: Release-Supervisor / Stream-Recovery (source line 1853)

Lange Release-Pipelines sollen detached über `scripts/release-supervisor.sh start <release-dir> <work-dir>` gestartet werden. `status` führt ausschließlich einen kurzen, nicht blockierenden Poll auf PID, RC, Stage-State und Log-Tail aus. Ein Chat-/Tool-/Stream-Timeout ist keine Gate-Aussage. Vor dem Start wird ein `source-before-release`-Checkpoint erzeugt und ein alter `RELEASE_GREEN` als `source-dirty` invalidiert. Nach jeder weiteren Sourceänderung ist dieser Zyklus vor dem nächsten langen Gate zu wiederholen. Sichtbares Statusfeedback erfolgt bei langen Arbeiten spätestens ungefähr alle fünf Minuten mit Europe/Berlin-Zeitstempel.
<!-- KAR170-END:README:1853 -->
