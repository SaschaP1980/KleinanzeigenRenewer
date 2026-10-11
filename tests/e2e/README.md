# Browser-/MV3-E2E-Tests

Diese Suite startet einen **echten Chrome-/Chromium-Browser mit der unpacked Extension** und prüft die MV3-Runtime. Sie ersetzt die bestehenden dependency-freien Vertrags-/Runtime-Tests nicht, sondern ergänzt sie.

## Voraussetzungen

- Python 3
- `python -m pip install -r tests/e2e/requirements.txt`
- ein lokaler Chrome-/Chromium-Browser; bei Bedarf `KR_CHROME_BINARY` auf die Browserdatei setzen
- unpacked Extensions dürfen nicht durch `chrome://policy` blockiert sein

Die Tests verwenden ein frisches temporäres Browserprofil und fangen `kleinanzeigen.de` im Testkontext mit einer lokalen, ausgeloggten Fixture ab. Sie benötigen **kein echtes Kleinanzeigen-Konto und führen keine echte Remote-Mutation aus**.

## Ausführen

```bash
npm run test:e2e
```

Optional:

```bash
node tests/e2e/run.cjs --scenario service-worker-restart
node tests/e2e/run.cjs --headed
node tests/e2e/run.cjs --report build/browser-e2e-report.json
```

Die Suite schlägt mit Exit-Code 2 fehl, wenn die Browser-Infrastruktur ungeeignet ist (z. B. Enterprise-Policy blockiert unpacked Extensions). Ein Infrastrukturproblem wird **niemals als PASS oder SKIP ausgegeben**.

## Szenarien ab v1.22.0

1. Extension-Boot + echter MV3-Service-Worker
2. echter Service-Worker-Abbruch und Reconnect mit neuer Background-Epoch
3. Rapid-Click/Reverse-Animation des Aktionen-Accordions ohne Stuck-State; ab v1.22.1 zusätzlich realer Hit-Test auf alle vier Action-Buttons
4. App schließen/öffnen mit persistierter Listenansicht und Retry-Konfiguration
5. Inventarprofilwechsel mit weiterhin gesperrten Aktionen ohne bestätigtes Live-Konto
6. unerwartetes Schließen eines echten Account-Probe-Worker-Tabs mit `gone`-Lifecycle
7. Bottom-Clamp am exakten Seitenende in Inventar/Papierkorb × Detail/Listenansicht
8. Publish-/Delete-Safety-Negativfall ohne gültigen Live-/Renewal-Kontext

## Supervisor isolation (v1.22.27+)

`npm run test:e2e` starts `run_browser_e2e_supervisor.py`. Every scenario runs in its own Python/Playwright/Chromium child process and its own temporary profile. The supervisor enforces a hard scenario timeout plus a separate cleanup timeout, terminates only the affected child process tree, removes its profile, and continues with the remaining scenarios. The aggregate JSON report records `scenarioStatus` and `cleanupStatus` separately.

The release environment must continue to wrap any temporary Chromium enterprise-policy change in an outer `try/finally`/shell trap and verify restoration of the original policy hash after the supervisor exits. The supervisor itself does not modify browser policy.
