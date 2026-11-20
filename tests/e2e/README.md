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

## GitHub-hosted E2E (KAR CI und KAR Release)

Chrome-Branded-Builds ab 137/139 akzeptieren die benötigten `--load-extension`/`--disable-extensions-except`-Flags nicht mehr. Die Hosted-Workflows installieren daher den von Python Playwright bereitgestellten Chromium-Browser und setzen `KR_CHROME_BINARY` auf dessen tatsächliche ausführbare Datei und `KR_E2E_BROWSER_CHANNEL=chromium` für die Extension-fähige neue Headless-Implementierung. Der lokal isolierte Fixture-/Profil-/Safety-Test bleibt unverändert. Es werden keine System-/Enterprise-Browserrichtlinien verändert.


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

## KAR-171 R1 — isolated **real Chromium MV3 in-flight** source scanner test

This is a **separate supplemental native-browser CI fixture**, not a tenth default release E2E scenario and **not** a test on the owner's logged-in Chrome. It runs the **unmodified production** `remote-delete-replacement-service.js` inside a disposable MV3 extension in a disposable Chromium profile, with the extension manifest granting **only** `storage`. No `kleinanzeigen.de` host permissions, content scripts, Chrome tabs permission, NativeHost or updater access are present.

The fixture stalls the source query inside the production remote scanner, proves that the request actually reached `SOURCE_QUERY_PENDING`, uses Chromium CDP `Target.closeTarget` on **only that disposable fixture's worker**, then observes a genuinely new worker generation. The first subsequent independent source/target read has an absent target and **must reject** the historical/stale remote outcome. A second independent full source/target scan may verify only the fresh synthetic positive result; late synthetic account drift must reject. No real Kleinanzeigen listing, account, journal or original P8 receipt is read or modified.

This is stronger than a Node-level observer re-instantiation but **still only a browser-local synthetic transport fixture**. It does **not** prove a worker was killed during a real authenticated My Ads scan, original live P8/account ownership, real full-page pagination, or complete R1/updater eligibility. The owner's separate successful Stage3 (v1.25.20) and between-scans Stage4 (v1.25.21) remain independently evidenced.

Run after provisioning a Chromium binary and Python Playwright:

```bash
KR_CHROME_BINARY=/path/to/chromium KR_E2E_BROWSER_CHANNEL=chromium \
python3 tests/e2e/kar171_r1_inflight_mv3_probe.py --report build/kar171-r1-inflight-mv3.json
```

If the Chromium worker cannot start, be identified, terminated or restarted, the test is **FAIL/INFRA, never PASS**. Its JSON report distinguishes `isolatedSyntheticFixture:true`, `ownerNativeScan:false`, `r1Accepted:false`, `eligibleForLease:false`. It is deliberately NOT in the fixed 9-scenario default browser-release matrix.

