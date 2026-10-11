#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp_name = tempfile.mkstemp(prefix=path.name + '.', suffix='.tmp', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'wb') as f:
            f.write(data)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp_name, path)
    finally:
        if os.path.exists(tmp_name):
            os.unlink(tmp_name)


def atomic_text(path: Path, text: str) -> None:
    atomic_write(path, text.encode('utf-8'))


def atomic_json(path: Path, value) -> None:
    atomic_text(path, json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True) + '\n')


def read_json(path: Path):
    return json.loads(path.read_text(encoding='utf-8'))


def read_int(path: Path) -> int:
    return int(path.read_text(encoding='utf-8').strip())


def count_log(path: Path) -> tuple[int, int]:
    text = path.read_text(encoding='utf-8', errors='replace')
    return sum(1 for line in text.splitlines() if line.startswith('PASS')), sum(1 for line in text.splitlines() if line.startswith('FAIL'))


def line_count(path: Path) -> int:
    return sum(1 for _ in path.open('r', encoding='utf-8', errors='replace'))


def verify_sha256sums(sums_path: Path, release_dir: Path) -> int:
    checked = 0
    for raw in sums_path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line:
            continue
        match = re.fullmatch(r'([0-9a-f]{64})  ([^/\\]+)', line)
        if not match:
            raise RuntimeError(f'SHA256SUMS verification failed: ungültige Zeile: {raw!r}')
        expected, name = match.groups()
        target = release_dir / name
        if not target.is_file():
            raise RuntimeError(f'SHA256SUMS verification failed: Datei fehlt im Release-Ordner: {name}')
        actual = sha256_file(target)
        if actual != expected:
            raise RuntimeError(f'SHA256SUMS verification failed: Hashabweichung für {name}')
        checked += 1
    if checked == 0:
        raise RuntimeError('SHA256SUMS verification failed: keine Einträge')
    return checked


def zip_inventory(path: Path, version: str, kind: str, expected_package_version: str | None = None) -> dict:
    if not path.is_file():
        raise RuntimeError(f'Fehlendes ZIP: {path}')
    with zipfile.ZipFile(path) as z:
        bad = z.testzip()
        if bad:
            raise RuntimeError(f'ZIP-Integrität fehlgeschlagen {path}: {bad}')
        names = z.namelist()
        if 'manifest.json' not in names:
            raise RuntimeError(f'manifest.json fehlt im Root: {path}')
        manifest = json.loads(z.read('manifest.json'))
        if manifest.get('version') != version:
            raise RuntimeError(f'ZIP-Version falsch {path}: {manifest.get("version")} != {version}')
        visible_version = str(manifest.get('version_name') or manifest.get('version'))
        if expected_package_version is not None and visible_version != expected_package_version:
            raise RuntimeError(f'ZIP-VersionName falsch {path}: {visible_version} != {expected_package_version}')
        directory_entries = [n for n in names if n.endswith('/')]
        if directory_entries:
            raise RuntimeError(f'ZIP enthält Directory-Einträge: {directory_entries[:5]}')
        if kind == 'source':
            forbidden = [n for n in names if n.startswith('node_modules/') or '/node_modules/' in n or n.startswith('.run/') or '/.run/' in n]
            if forbidden:
                raise RuntimeError(f'Source-ZIP enthält verbotene Build-Reste: {forbidden[:5]}')
            required = {
                'scripts/release_finalize.py',
                'scripts/release-finalize-gate.sh',
                'scripts/release-pipeline.sh',
                'scripts/release-supervisor.sh',
                'release/release-spec.json',
                'tests/v1237-release-finalize-gate.cjs',
                'tests/v12310-release-supervisor-hardening.cjs',
                'tests/v12312c1-bulk-composition-root-regression.cjs',
                'tests/v12312c1-version-release.cjs',
            }
            missing = sorted(required - set(names))
            if missing:
                raise RuntimeError(f'Source-ZIP enthält Release-Härtung nicht vollständig: {missing}')
        return {
            'path': str(path),
            'bytes': path.stat().st_size,
            'sha256': sha256_file(path),
            'entries': len(names),
            'directoryEntries': len(directory_entries),
            'manifestVersion': manifest.get('version'),
            'manifestVersionName': manifest.get('version_name') or manifest.get('version'),
        }


def deterministic_zip(output: Path, items: list[tuple[Path, str]]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(prefix=output.name + '.', suffix='.tmp', dir=str(output.parent), delete=False) as tf:
        temp = Path(tf.name)
    try:
        with zipfile.ZipFile(temp, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
            for src, arc in sorted(items, key=lambda x: x[1]):
                info = zipfile.ZipInfo(arc, (2026, 9, 12, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                z.writestr(info, src.read_bytes())
        with zipfile.ZipFile(temp) as z:
            if z.testzip() is not None:
                raise RuntimeError(f'Neu erzeugtes ZIP defekt: {output}')
        os.replace(temp, output)
    finally:
        if temp.exists():
            temp.unlink()


def verify_e2e_evidence(path: Path, expected_version: str, expected_sha: str, gate_name: str) -> dict:
    data = read_json(path)
    if data.get('schema') != 1 or data.get('gate') != gate_name:
        raise RuntimeError(f'Ungültige E2E-Evidenz: {path}')
    if data.get('extensionVersion') != expected_version:
        raise RuntimeError(f'E2E-Version falsch: {path}')
    tested_zip = Path(data.get('testedChromeZip') or '')
    if not tested_zip.is_file() or sha256_file(tested_zip) != data.get('testedChromeSha256'):
        raise RuntimeError(f'E2E-Test-ZIP fehlt oder Hash weicht von der Evidenz ab: {tested_zip}')
    if data.get('testedChromeSha256') != expected_sha:
        raise RuntimeError(f'E2E wurde gegen andere Chrome-Bytes ausgeführt: {path}')
    report = Path(data['reportPath'])
    if not report.is_file() or sha256_file(report) != data.get('reportSha256'):
        raise RuntimeError(f'E2E-Report fehlt oder Hash weicht ab: {report}')
    report_data = read_json(report)
    if report_data.get('extensionVersion') != expected_version or report_data.get('scenarioCount') != 9 or report_data.get('passed') != 9 or report_data.get('failed') != 0 or report_data.get('cleanupFailed') != 0:
        raise RuntimeError(f'E2E nicht GREEN: {report}')
    if int(data.get('rc', 1)) != 0:
        raise RuntimeError(f'E2E-RC nicht 0: {path}')
    if data.get('policyBeforeSha256') != data.get('policyAfterSha256'):
        raise RuntimeError(f'Chromium-Policy nicht hashidentisch restauriert: {path}')
    return {'evidence': data, 'report': report_data}


def main() -> int:
    parser = argparse.ArgumentParser(description='Atomic release-finalize gate for Kleinanzeigen Renewal')
    parser.add_argument('--release-dir', required=True)
    parser.add_argument('--work-dir', required=True)
    parser.add_argument('--run-dir')
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    release_dir = Path(args.release_dir).resolve()
    work_dir = Path(args.work_dir).resolve()
    manifest = read_json(root / 'manifest.json')
    version = str(manifest['version'])
    package_version = str(manifest.get('version_name') or version)
    tag = 'v' + package_version
    run_dir = Path(args.run_dir).resolve() if args.run_dir else root / '.run' / ('v' + package_version.replace('.', ''))
    spec = read_json(root / 'release' / 'release-spec.json')
    if spec.get('version') != version:
        raise RuntimeError('release-spec und Manifest-Version stimmen nicht überein')
    if str(spec.get('packageVersion') or version) != package_version:
        raise RuntimeError('release-spec packageVersion und sichtbare Manifest-Version stimmen nicht überein')

    release_dir.mkdir(parents=True, exist_ok=True)
    state_path = release_dir / 'release-state.json'
    sentinel = release_dir / 'RELEASE_GREEN'
    if sentinel.exists():
        sentinel.unlink()
    started = datetime.now(timezone.utc).isoformat()
    state = {
        'schema': 1,
        'version': version,
        'versionName': package_version,
        'sourceRoot': str(root),
        'releaseDir': str(release_dir),
        'workDir': str(work_dir),
        'stage': 'finalizing',
        'stage_status': 'running',
        'started_at': started,
        'finished_at': None,
        'rc': None,
        'artifacts': {},
    }
    atomic_json(state_path, state)

    try:
        required_gate_names = ['release-regression', 'release-build', 'release-build2', 'release-fresh-build']
        gate_evidence = {}
        for name in required_gate_names:
            rc_path = run_dir / f'{name}.rc'
            wall_path = run_dir / f'{name}.wall-ms'
            log_path = run_dir / f'{name}.log'
            if not (rc_path.is_file() and wall_path.is_file() and log_path.is_file()):
                raise RuntimeError(f'Gate-Evidenz unvollständig: {name}')
            rc = read_int(rc_path)
            if rc != 0:
                raise RuntimeError(f'Gate {name} ist nicht GREEN (RC={rc})')
            passes, fails = count_log(log_path)
            gate_evidence[name] = {'rc': rc, 'wallMs': read_int(wall_path), 'passLines': passes, 'failLines': fails, 'log': str(log_path)}

        official_chrome = release_dir / f'kleinanzeigen-renewal-chrome-v{package_version}.zip'
        official_source = release_dir / f'kleinanzeigen-renewal-source-v{package_version}.zip'
        build2_chrome = work_dir / 'build2-final' / official_chrome.name
        build2_source = work_dir / 'build2-final' / official_source.name
        fresh_chrome = work_dir / 'fresh-build-final' / official_chrome.name
        fresh_source = work_dir / 'fresh-build-final' / official_source.name

        chrome = zip_inventory(official_chrome, version, 'chrome', package_version)
        source = zip_inventory(official_source, version, 'source', package_version)
        build2_chrome_sha = sha256_file(build2_chrome)
        build2_source_sha = sha256_file(build2_source)
        fresh_chrome_sha = sha256_file(fresh_chrome)
        fresh_source_sha = sha256_file(fresh_source)
        if len({chrome['sha256'], build2_chrome_sha, fresh_chrome_sha}) != 1:
            raise RuntimeError('Chrome Build1/Build2/Fresh-Source sind nicht byteidentisch')
        if len({source['sha256'], build2_source_sha, fresh_source_sha}) != 1:
            raise RuntimeError('Source Build1/Build2/Fresh-Source sind nicht byteidentisch')

        packaged_ev = verify_e2e_evidence(release_dir / f'Browser-E2E-Packaged-v{package_version}.evidence.json', package_version, chrome['sha256'], 'packaged-e2e')
        fresh_ev = verify_e2e_evidence(release_dir / f'Browser-E2E-Fresh-Source-Packaged-v{package_version}.evidence.json', package_version, fresh_chrome_sha, 'fresh-packaged-e2e')

        runtime_text = '\n'.join(p.read_text(encoding='utf-8', errors='replace') for p in sorted((root / 'src').rglob('*.js')))
        submit_calls = len(re.findall(r'\.submit\s*\(', runtime_text))
        request_submit_calls = len(re.findall(r'requestSubmit\s*\(', runtime_text))
        if submit_calls or request_submit_calls:
            raise RuntimeError(f'Publish-Safety verletzt: .submit={submit_calls}, requestSubmit={request_submit_calls}')

        layout = read_json(root / 'scripts' / 'source-layout.json')
        root_js = sorted(p.name for p in root.glob('*.js'))
        if root_js:
            raise RuntimeError(f'Root-JavaScript unerwartet vorhanden: {root_js}')
        migrated_count = len(layout.get('mapping', {}))
        all_src_js = sorted((root / 'src').rglob('*.js'))

        app_js = root / 'src' / 'app' / 'app.js'
        background_js = root / 'src' / 'background' / 'background.js'
        diagnostic_service = root / 'src' / 'background' / 'services' / 'diagnostic-export-service.js'
        architecture = {
            'rootJavascriptFiles': len(root_js),
            'migratedJavascriptFiles': migrated_count,
            'totalSrcJavascriptFiles': len(all_src_js),
            'appLoc': line_count(app_js),
            'backgroundLoc': line_count(background_js),
            'diagnosticExportServiceLoc': line_count(diagnostic_service),
            'diagnosticExportServiceSha256': sha256_file(diagnostic_service),
            'noNewRuntimeBoundary': True,
            'runtimeSubmitCalls': submit_calls,
            'runtimeRequestSubmitCalls': request_submit_calls,
        }
        architecture_file_lines = []
        for item in spec.get('architectureFiles', []):
            component_path = root / item['path']
            if not component_path.is_file():
                raise RuntimeError(f"Architekturdatei fehlt: {item['path']}")
            key = str(item['key'])
            loc = line_count(component_path)
            digest = sha256_file(component_path)
            architecture[f'{key}Loc'] = loc
            architecture[f'{key}Sha256'] = digest
            architecture_file_lines.append(f"- {item['label']}: **{loc} LOC**, SHA-256 `{digest}` (`{item['path']}`).")

        regression = gate_evidence['release-regression']
        build = gate_evidence['release-build']
        validation = {
            'schema': 1,
            'project': spec['project'],
            'version': package_version,
            'manifestVersion': version,
            'status': ('TECHNICALLY_GREEN_NATIVE_SOAK_AND_PERFORMANCE_PENDING' if spec.get('seriesFinal') and spec.get('performanceRunRequired') else 'TECHNICALLY_GREEN_NATIVE_SMOKE_PENDING'),
            'basis': {'direct': spec['directBasis'], 'directBasisNativeGreen': spec['directBasisNativeGreen'], 'gold': spec['goldBaseline']},
            'scope': spec['scope'],
            'artifacts': {'chrome': chrome, 'source': source},
            'gates': {
                'regression': regression,
                'officialBuild': build,
                'build2': gate_evidence['release-build2'],
                'freshSourceBuild': gate_evidence['release-fresh-build'],
                'packagedBrowserE2E': {k: packaged_ev['report'].get(k) for k in ['scenarioCount','passed','failed','cleanupFailed','elapsedSeconds']},
                'freshSourcePackagedBrowserE2E': {k: fresh_ev['report'].get(k) for k in ['scenarioCount','passed','failed','cleanupFailed','elapsedSeconds']},
                'reproducibility': {'chromeBuild1EqualsBuild2EqualsFresh': True, 'sourceBuild1EqualsBuild2EqualsFresh': True},
            },
            'architecture': architecture,
            'releaseProcessHardening': {
                'releaseFinalizeGateMaterialized': True,
                'atomicStageState': True,
                'doneSentinelRequired': True,
                'freshE2EToFinalizeChainedInReleasePipeline': True,
                'detachedReleaseSupervisor': True,
                'shortNonBlockingStatusPolls': True,
                'preReleaseSourceCheckpoint': True,
                'sourceDirtyInvalidation': True,
                'streamTimeoutSeparateFromGateStatus': True,
                'fiveMinuteEuropeBerlinHeartbeat': True,
                'rootCauseOfInterruptedFinalization': 'The previous orchestration ended after a successful fresh-source packaged E2E before any release-finalize process was started; no finalizer PID/RC/wall/state existed.',
                'streamTimeoutFinding': 'A ChatGPT stream/tool recovery timeout is not a build verdict. PID, RC file, stage state and a short log tail must classify the process as running, finished or aborted.',
            },
            'nativeSmoke': {'required': True, 'status': 'PENDING'},
            'performance': {'required': spec['performanceRunRequired'], 'rule': spec['performanceRule'], 'goldlines': spec.get('performanceGoldlines', [])},
        }

        validation_path = release_dir / f'Kleinanzeigen-Renewal-Validation-v{package_version}.json'
        atomic_json(validation_path, validation)

        scope_md = '\n'.join(f'- {item}' for item in spec['scope'])
        direct_basis_observation = str(spec.get('directBasisObservation') or '').strip()
        direct_basis_observation_md = (f'\n## Nativer Befund der direkten Basis\n\n{direct_basis_observation}\n' if direct_basis_observation else '')
        architecture_highlights_md = '\n'.join(f'- {item}' for item in spec.get('architectureHighlights', []))
        architecture_files_md = '\n'.join(architecture_file_lines)
        performance_goldlines = spec.get('performanceGoldlines', [])
        performance_goldlines_md = '\n'.join(
            f"- **{item.get('label','Referenz')} / {item.get('hardware','Hardware nicht angegeben')}**: "
            f"v{item.get('version','?')}, {str(item.get('mode','')).upper()}, **{float(item.get('totalSeconds',0)):.3f} s gesamt / {float(item.get('averageSeconds',0)):.3f} s Ø**, "
            f"{item.get('result','')}; Diagnose `{item.get('diagnostic','')}`, SHA-256 `{item.get('sha256','')}`"
            + (f"; Einzelzeiten: {' / '.join(f'{float(v):.3f} s' for v in item.get('itemSeconds', []))}" if item.get('itemSeconds') else '')
            for item in performance_goldlines
        ) or '- Keine Performance-Goldlinie hinterlegt.'
        handover = f'''# Kleinanzeigen Manager / Kleinanzeigen Renewal – Handover v{package_version}\n\n**Stand:** {datetime.now(timezone.utc).date().isoformat()}  \n**Kanonische Basis:** v{package_version} – technisch GREEN, {'finaler nativer Soak + Performance offen' if spec.get('seriesFinal') and spec.get('performanceRunRequired') else 'nativer Smoke offen'}  \n**Gold-Baseline:** v{spec['goldBaseline']}  \n**Direkte Basis:** v{spec['directBasis']} ({'technisch und nativ GREEN' if spec.get('directBasisNativeGreen') else ('technisch GREEN, nativer Smoke offen' if spec.get('directBasisNativePending') else 'nativer Smoke FAIL; Correction-Basis')})\n\n## Scope v{package_version}\n\n{scope_md}\n{direct_basis_observation_md}\n## Architekturresultat\n\n{architecture_highlights_md}\n- JavaScript-Dateien im Source-Root: **0**.\n- Migrierte bestehende Root-JS-Dateien: **{migrated_count}**; gesamte `src/**/*.js`: **{len(all_src_js)}**.\n- `src/app/app.js`: **{architecture['appLoc']} LOC**.\n- `src/background/background.js`: **{architecture['backgroundLoc']} LOC**.\n- Diagnostic Export Service (retained): **{architecture['diagnosticExportServiceLoc']} LOC**, SHA-256 `{architecture['diagnosticExportServiceSha256']}`.\n{architecture_files_md}\n- Keine neue Runtime-/IPC-Grenze.\n- Runtime `.submit()` / `requestSubmit()` = **{submit_calls} / {request_submit_calls}**.\n\n## Technische Gates\n\n- Vollregression: RC **0**, {regression['passLines']} PASS-Zeilen, {regression['failLines']} FAIL, Wall **{regression['wallMs']} ms**.\n- Offizieller Build: RC **0**, {build['passLines']} PASS-Zeilen, {build['failLines']} FAIL, Wall **{build['wallMs']} ms**.\n- Packaged Browser-E2E: **9/9 PASS**, `cleanupFailed=0`.\n- Fresh-Source packaged Browser-E2E: **9/9 PASS**, `cleanupFailed=0`.\n- Chrome Build1 = Build2 = Fresh Source: **byteidentisch**.\n- Source Build1 = Build2 = Fresh Source: **byteidentisch**.\n- Chrome SHA-256: `{chrome['sha256']}`.\n- Source SHA-256: `{source['sha256']}`.\n\n## Goldlinien-Performance-Matrix\n\n{performance_goldlines_md}\n\n**Verbindliche Regel:** Rechnerübergreifende Zeitdifferenzen sind Kontext, kein isolierter Regressionsbeweis. Trends primär innerhalb derselben Rechner-/Goldlinien-Referenz bewerten. Diese Matrix muss in jedem Release-, Chat- und Recovery-Handover fortgeführt werden.\n\n## Analyse des erneuten Finalisierungsabbruchs und Härtung\n\nDer technische Build war nicht abgestürzt. Der letzte Fresh-Source-E2E war GREEN und hatte RC/Wall-Evidenz. Danach wurde jedoch **kein** `release-finalize`-Prozess gestartet: Es existierten weder Finalizer-PID noch RC-/Wall-Datei, `release-state.json` oder DONE-Sentinel. Die Orchestrierung hatte den geplanten Gate nur als Anforderung/Metadatum, aber noch nicht als ausführbaren, verketteten Prozess materialisiert.\n\nSeit v1.23.7 ist diese Lücke geschlossen und wird für v{package_version} erneut als Release-Gate nachgewiesen:\n\n1. `scripts/release_finalize.py` validiert alle Release-Evidenzen, Reproduzierbarkeit, ZIP-Hygiene, Safety und Pflichtartefakte.\n2. `scripts/release-finalize-gate.sh` schreibt auch bei FAIL Log, PID, RC und Wall-Clock.\n3. `release-state.json` wird atomar geführt; `RELEASE_GREEN` entsteht ausschließlich nach vollständiger Re-Verifikation.\n4. `scripts/release-pipeline.sh` verkettet den letzten Fresh-Source-E2E direkt mit dem Finalizer, ohne manuellen Chat-Zwischenzustand.\n5. Der Vertragstest `tests/v1237-release-finalize-gate.cjs` verhindert, dass künftig nur ein Metadaten-Flag ohne realen Finalizer existiert.\n6. E2E-Evidenz bindet den Report explizit an den SHA-256 des tatsächlich getesteten Chrome-ZIPs und an den restaurierten Policy-Hash.\n7. `scripts/release-supervisor.sh` startet lange Release-Pipelines detached vom Chat-/Tool-Stream und persistiert Supervisor-PID, RC, Wall-Clock und Log. Ein `STREAM_TIMEOUT` ist damit ausdrücklich **keine** Aussage darüber, ob der Gate-Prozess läuft, fertig oder abgebrochen ist.\n8. Vor jedem langen Release-Lauf wird ein exakter `source-before-release`-Checkpoint erzeugt; ein alter `RELEASE_GREEN` wird entfernt und `release-state.json` auf `source-dirty` gesetzt. Nach jeder weiteren Sourceänderung gilt derselbe Zyklus erneut.\n9. Status-Polls sind kurz und nicht blockierend: PID, RC-Datei, Stage-State und kurzer Log-Tail prüfen und sofort zurückkehren; keine langen `sleep`-/Wait-Schleifen innerhalb eines Tool-Calls.\n10. Lange Build-/Release-Phasen werden nach dem Startcheck **selbstständig bis zum nächsten belastbaren Meilenstein weitergeführt**; ein manueller `Status`-/`weiter`-Impuls ist nicht erforderlich. Status-Polls bleiben kurz und nicht blockierend; bei länger aktiven Arbeiten gilt weiterhin: sichtbares Statusfeedback spätestens ungefähr alle fünf Minuten mit Europe/Berlin-Zeitstempel.\n11. Der detached Supervisor schreibt unabhängig vom Chat alle 120 Sekunden `release-status-snapshot.json` mit Pipeline-PID, Alive-State, Stage und kurzem Log-Tail. Wichtige GREEN-Meilensteine werden zusätzlich als externe, hashverifizierte Checkpoints gesichert; nach vollständig verifiziertem `RELEASE_GREEN` wird die finale Release-Struktur alleinige Recovery-Authority und temporäre Zwischen-Checkpoints dürfen entfallen.\n12. Stream-/Toolfehler und Release-/Finalizerfehler werden getrennt dokumentiert. Erst die persistente Evidence klassifiziert den Prozess als **läuft**, **fertig** oder **abgebrochen**; danach wird selbstständig vom letzten verifizierten Checkpoint fortgesetzt.\n\n## Native Abnahme\n\n{'Als finaler v1.23.x-Abschluss ist jetzt der scopegerechte native Gesamt-Soak inklusive verpflichtendem realen 3er-Performance-Lauf durchzuführen. Bei ROT bleibt v'+package_version+' technisch GREEN, aber nicht final nativ GREEN; zuerst Diagnose sichern und Ursache analysieren.' if spec.get('seriesFinal') else 'Vor v'+str(spec['nextPlannedBuild'])+' ist der scopegerechte native Smoke für v'+package_version+' durchzuführen. Bei ROT wird keine nächste Version gebaut; zuerst Diagnose sichern und Ursache analysieren.'}\n\nPerformance-Regel: {spec['performanceRule']}\n\n## Nächster planmäßiger Schritt\n\n{('**v1.23.x-Serie abgeschlossen; danach nur fehlergetriebene Wartung oder ausdrücklich neu geplante Arbeit.**' if spec.get('seriesFinal') else '**v'+str(spec['nextPlannedBuild'])+' – '+spec['nextPlannedBuildGoal']+'**')}\n'''
        handover_path = release_dir / f'Kleinanzeigen-Renewal-Handover-v{package_version}.md'
        atomic_text(handover_path, handover)

        chat_handover = handover + f'''\n## Dauerhafte Build-/Recovery-Regeln\n\n- Immer vom kanonischen Source-ZIP starten und Source-SHA vor Arbeitsbeginn prüfen.\n- Lange Gates kontrolliert mit persistentem Log, PID soweit sinnvoll, RC und Wall-Clock führen; FAIL muss RC/Wall ebenfalls schreiben.\n- Test-first: Characterization GREEN auf unveränderter Basis, Ownership RED, Extraktion, Characterization wieder GREEN.\n- Packaging-Closure für lokale `importScripts()`- und deklarierte Runtime-Referenzen bleibt permanent.\n- Release-E2E läuft gegen den entpackten tatsächlich erzeugten Chrome-ZIP; Fresh-Source-E2E gegen dessen Chrome-ZIP.\n- Chromium-Policy nur unter äußerem Trap/Finally temporär ändern und hashidentisch restaurieren.\n- Keine neue Runtime-/IPC-Grenze nur zur Modularisierung.\n- Belegte identische Browser-Gates nicht wiederholen, wenn nur Source-only Test-/Buildtool-Bytes geändert wurden und der Chrome-Hash identisch bleibt.\n- Durable Checkpoints sind Recovery-Authority; nach Runtimeverlust klar zwischen laufend, fertig und abgebrochen unterscheiden.\n- Während eines laufenden Builds nach wichtigen GREEN-Meilensteinen und vor längeren Regression-/Release-Pipelines zusätzliche externe, hashverifizierte Recovery-Checkpoints außerhalb der flüchtigen Arbeitskopie erzeugen; bei vollständigem Sandbox-/Runtime-Verlust vom letzten verifizierten externen Checkpoint fortsetzen.\n- Sobald der Build vollständig `RELEASE_GREEN` ist und Chrome/App-ZIP, kanonisches Source-ZIP, SHA256SUMS, Handover/Validation und finaler Recovery-Checkpoint vollständig verifiziert und für den Nutzer verfügbar sind, dürfen temporäre externe Zwischen-Checkpoints verworfen werden; ab dann ist die finale Release-Struktur die alleinige Recovery-Authority.\n- Ein Chat-/Tool-/Stream-Timeout (`STREAM_TIMEOUT`) ist niemals automatisch ein Gate-/Buildabbruch. Zuerst PID, RC-Datei, Stage-State und kurzen Log-Tail prüfen und den Zustand als läuft / fertig / abgebrochen klassifizieren.\n- Status-Polls sind kurz und nicht blockierend; keine langen `sleep`-/Wait-Schleifen innerhalb eines Tool-Calls.\n- Lange detached Phasen nach einem kurzen Startcheck selbstständig bis zum nächsten belastbaren Meilenstein weiterführen; Status-Polls bleiben kurz und nicht blockierend. Bei länger aktiven Arbeiten sichtbares Statusfeedback spätestens ungefähr alle fünf Minuten mit Europe/Berlin-Zeitstempel geben.\n- Der detached Supervisor schreibt unabhängig vom Chat alle 120 Sekunden einen persistenten `release-status-snapshot.json`; wichtige GREEN-Meilensteine zusätzlich extern hashverifiziert sichern. Nach vollständig verifiziertem `RELEASE_GREEN` dürfen temporäre Zwischen-Checkpoints entfallen.\n- Lange Release-Pipelines über `scripts/release-supervisor.sh` detached starten; vor dem Start einen `source-before-release`-Checkpoint erzeugen.\n- Nach jeder Sourceänderung einen alten `RELEASE_GREEN` invalidieren und den Stage-State auf `source-dirty` setzen, bevor ein neuer langer Gate beginnt.\n- Stream-/Toolfehler und Release-/Finalizerfehler immer getrennt dokumentieren.\n- `RELEASE_GREEN` darf erst nach erfolgreichem `release-finalize` existieren.\n- Reale Performance-Läufe nur bei konkretem Verdacht oder wenn `release-spec.json` sie ausdrücklich fordert; Goldlinien-Matrix in jedem Handover fortführen.\n'''
        chat_handover_path = release_dir / f'Kleinanzeigen-Renewal-Chat-Handover-v{package_version}.md'
        atomic_text(chat_handover_path, chat_handover)

        native_smoke_md = '\n'.join(f'{idx}. {item}' for idx, item in enumerate(spec.get('nativeSmokeChecks', []), start=1))
        smoke = f'''# Kleinanzeigen Renewal – Native Smoke-Test v{package_version}\n\nZiel: {'scopegerechte native Abnahme einschließlich realem Performance-/Stabilitätslauf' if spec.get('performanceRunRequired') else 'scopegerechte native Abnahme ohne echten Renewal/Publish-Verbrauch'}.\n\n## A. Boot / Runtime\n\n1. v{package_version} über v{spec['directBasis']} laden.\n2. `chrome://extensions` prüfen: kein Service-Worker-/`importScripts()`-Fehler.\n3. Manager, Inventar, Profil, Papierkorb und Einstellungen kurz öffnen.\n4. Kein unerwarteter Workflow-/Insertion-Lock; Popup/Launcher fokussiert bzw. startet das App-Fenster korrekt.\n\n## B. Scope v{package_version}\n\n{native_smoke_md}\n\n## C. Diagnose / Safety\n\n1. Diagnose-ZIP nach dem Smoke exportieren.\n2. Prüfen: Extension-Version **{package_version}**, keine unerwarteten Boot-/Service-Worker-/Message-Contract-Fehler.\n3. Account-/Profilzustand und aktive Workflow-/Bulk-Locks müssen zum beobachteten UI-Zustand passen.\n4. Bei jeder Abweichung sofort Diagnose-ZIP sichern. Bei ROT **{'v'+package_version+' nicht als final nativ GREEN deklarieren' if spec.get('seriesFinal') else 'keine v'+str(spec['nextPlannedBuild'])+' bauen'}**.\n\nPerformance-Regel: {spec['performanceRule']}\n'''
        smoke_path = release_dir / f'Kleinanzeigen-Renewal-Native-Smoke-Test-v{package_version}.md'
        atomic_text(smoke_path, smoke)

        initial = f'''# Initial-Prompt – Kleinanzeigen Manager / Renewal\n\nWir setzen das Projekt **„kleinanzeigen Manager / Kleinanzeigen Renewal“** nahtlos fort. Lies zuerst `Kleinanzeigen-Renewal-Chat-Handover-v{package_version}.md` vollständig und behandle es als verbindliche Arbeits- und Recovery-Basis. Verwende außerdem das v{package_version}-Source-ZIP/Übergabepaket, falls beigefügt.\n\nAktueller Stand:\n\n- **Kanonische Basis: v{package_version}**\n- v{package_version} ist **technisch vollständig GREEN**, {'der finale native Soak + Performance-Lauf ist noch offen' if spec.get('seriesFinal') and spec.get('performanceRunRequired') else 'der native Smoke ist noch offen'}.\n- Gold-Baseline: **v{spec['goldBaseline']}**.\n- Chrome SHA-256: `{chrome['sha256']}`\n- Source SHA-256: `{source['sha256']}`\n- Extension-ID: `{manifest.get('key') and 'hafahjhhgiipdegfkgacchmnacgblnah' or 'hafahjhhgiipdegfkgacchmnacgblnah'}`\n\n{spec.get('releaseSummary', '; '.join(spec['scope']))} Der materialisierte **release-finalize-Gate** bleibt verbindlich. JavaScript-Dateien im Source-Root: **0**.\n\n{'Für den finalen Abschluss jetzt den nativen v'+package_version+'-Gesamt-Soak einschließlich Performance-Lauf gemäß Smoke-Test-Plan durchführen. Bei ROT Diagnose analysieren; bei GRÜN v'+package_version+' als technisch+nativ finale v1.23.x-Basis markieren.' if spec.get('seriesFinal') else 'Vor dem nächsten Build zuerst den nativen v'+package_version+'-Smoke gemäß Smoke-Test-Plan auswerten. Bei ROT keine neue Version bauen, sondern Diagnose analysieren. Bei GRÜN v'+package_version+' als nativ grüne Basis markieren.'}\n\n{('Nächster planmäßiger Schritt: **v1.23.x-Serie abgeschlossen; danach nur fehlergetriebene Wartung oder ausdrücklich neu geplante Arbeit.**' if spec.get('seriesFinal') else 'Nächster planmäßiger Architektur-Schritt: **v'+str(spec['nextPlannedBuild'])+' – '+spec['nextPlannedBuildGoal']+'**')}\n\nDauerhaft übernehmen: kontrollierte Gates mit Log/RC/Wall/PID, test-first, Checkpoints, Packaging-Closure, packaged E2E gegen echten Chrome-ZIP, Fresh-Source-E2E, Policy-Trap/Hashrestore, keine neue IPC-Grenze nur zur Modularisierung und atomarer `release-finalize` mit `release-state.json` + `RELEASE_GREEN`. Ein Stream-/Tool-Timeout ist niemals automatisch ein Buildabbruch: zuerst PID, RC-Datei, Stage-State und Log-Tail prüfen. Lange Pipelines detached über `release-supervisor.sh` starten und nach dem kurzen Startcheck selbstständig bis zum nächsten belastbaren Meilenstein weiterführen; Status-Polls bleiben kurz und nicht blockierend. Bei länger aktiven Arbeiten sichtbares Statusfeedback spätestens ungefähr alle fünf Minuten mit Europe/Berlin-Zeitstempel geben. Der Supervisor schreibt unabhängig vom Chat alle 120 Sekunden einen persistenten Status-Snapshot; wichtige GREEN-Meilensteine werden zusätzlich extern hashverifiziert gesichert. Nach jeder Sourceänderung einen alten `RELEASE_GREEN` als `source-dirty` invalidieren sowie vor dem nächsten langen Gate einen neuen Source-Checkpoint schreiben.\n'''
        initial_path = release_dir / f'Kleinanzeigen-Renewal-Initial-Prompt-v{package_version}.md'
        atomic_text(initial_path, initial)

        # Create a deterministic source recovery checkpoint from the exact canonical source ZIP plus validation/handover.
        checkpoint_work_path = work_dir / 'checkpoints' / f'v{package_version}-checkpoint-05-release-green.zip'
        deterministic_zip(checkpoint_work_path, [
            (official_source, official_source.name),
            (validation_path, validation_path.name),
            (handover_path, handover_path.name),
        ])
        checkpoint_release_path = release_dir / checkpoint_work_path.name
        atomic_write(checkpoint_release_path, checkpoint_work_path.read_bytes())
        if sha256_file(checkpoint_release_path) != sha256_file(checkpoint_work_path):
            raise RuntimeError('Finaler Recovery-Checkpoint wurde nicht hashidentisch in den Release-Ordner gespiegelt')

        sum_items = [
            official_chrome, official_source, handover_path, chat_handover_path, validation_path, smoke_path, initial_path,
            Path(packaged_ev['evidence']['reportPath']), Path(fresh_ev['evidence']['reportPath']),
            release_dir / f'Browser-E2E-Packaged-v{package_version}.evidence.json',
            release_dir / f'Browser-E2E-Fresh-Source-Packaged-v{package_version}.evidence.json',
            checkpoint_release_path,
        ]
        sums_path = release_dir / 'SHA256SUMS.txt'
        atomic_text(sums_path, ''.join(f'{sha256_file(p)}  {p.name}\n' for p in sum_items))
        verify_sha256sums(sums_path, release_dir)

        package_path = release_dir / f'Kleinanzeigen-Renewal-Neuer-Chat-Paket-v{package_version}.zip'
        package_items = [(p, p.name) for p in sum_items] + [(sums_path, sums_path.name)]
        deterministic_zip(package_path, package_items)

        final_artifacts = [
            official_chrome, official_source, handover_path, chat_handover_path, validation_path, smoke_path,
            initial_path, sums_path, package_path, checkpoint_release_path,
            release_dir / f'Browser-E2E-Packaged-v{package_version}.evidence.json',
            release_dir / f'Browser-E2E-Fresh-Source-Packaged-v{package_version}.evidence.json',
        ]
        artifact_map = {}
        for path in final_artifacts:
            if not path.is_file() or path.stat().st_size == 0:
                raise RuntimeError(f'Finales Artefakt fehlt/leer: {path}')
            artifact_map[path.name] = {'path': str(path), 'bytes': path.stat().st_size, 'sha256': sha256_file(path)}
        with zipfile.ZipFile(package_path) as z:
            if z.testzip() is not None:
                raise RuntimeError('Übergabepaket ist nicht integer')

        state.update({
            'source_sha': source['sha256'],
            'chrome_sha': chrome['sha256'],
            'stage': 'release-green',
            'stage_status': 'done',
            'finished_at': datetime.now(timezone.utc).isoformat(),
            'rc': 0,
            'artifacts': artifact_map,
        })
        atomic_json(state_path, state)
        atomic_text(sentinel, f'RELEASE_GREEN v{package_version}\nchrome_sha256={chrome["sha256"]}\nsource_sha256={source["sha256"]}\nstate_sha256={sha256_file(state_path)}\n')
        # Last physical verification after sentinel creation.
        if not sentinel.is_file() or read_json(state_path).get('stage_status') != 'done':
            raise RuntimeError('Finaler DONE-Sentinel/State nicht lesbar')
        print(json.dumps({'status': 'RELEASE_GREEN', 'version': package_version, 'manifestVersion': version, 'chromeSha256': chrome['sha256'], 'sourceSha256': source['sha256'], 'package': str(package_path), 'checkpoint': str(checkpoint_release_path)}, ensure_ascii=False))
        return 0
    except Exception as exc:
        state.update({'stage_status': 'failed', 'finished_at': datetime.now(timezone.utc).isoformat(), 'rc': 1, 'error': str(exc)})
        atomic_json(state_path, state)
        if sentinel.exists():
            sentinel.unlink()
        raise


if __name__ == '__main__':
    raise SystemExit(main())
