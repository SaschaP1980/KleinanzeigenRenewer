from pathlib import Path
import hashlib,json,sys,zipfile
root=Path(__file__).resolve().parent.parent
out=Path(sys.argv[1]).resolve();out.mkdir(parents=True,exist_ok=True)
manifest=json.loads((root/'manifest.json').read_text());version=manifest['version'];package_version=manifest.get('version_name') or version
runtime=['manifest.json', 'src/shared/runtime-deps.js', 'src/shared/message-contract-registry.js', 'src/shared/renewal-policy.js', 'src/background/background-message-router.js', 'src/background/services/native-update-status-gateway.js', 'src/background/services/native-status-bridge.js', 'src/background/services/update-workflow-fence.js', 'src/background/services/persisted-owner-observer.js', 'src/background/repositories/profile-repository.js', 'src/background/repositories/inventory-repository.js', 'src/background/repositories/inventory-image-store.js', 'src/background/services/trash-service.js', 'src/background/services/diagnostics-service.js', 'src/background/services/tab-load-coordinator.js', 'src/background/services/tab-registry.js', 'src/background/services/managed-tab-worker-service.js', 'src/background/services/content-connection-manager.js', 'src/background/services/account-probe-service.js', 'src/background/controllers/profile-management-controller.js', 'src/background/controllers/account-session-controller.js', 'src/background/controllers/platform-safety-controller.js', 'src/background/controllers/tab-lifecycle-observer.js', 'src/background/controllers/workflow-emergency-reset-controller.js', 'src/background/lib/bulk-run-guard.js', 'src/background/controllers/single-inventory-controller.js', 'src/background/services/bulk-worker-service.js', 'src/background/services/bulk-reconciliation-service.js', 'src/background/controllers/bulk-inventory-controller.js', 'src/background/controllers/mass-renewal-controller.js', 'src/background/services/mass-renewal-watchdog-service.js', 'src/background/controllers/mass-renewal-workflow-controller.js', 'src/background/services/renewal-verification-service.js', 'src/background/repositories/renewal-state-repository.js', 'src/background/services/renewal-verification-flow.js', 'src/background/services/renewal-reinventory-flow.js', 'src/background/services/paid-checkout-recovery-service.js', 'src/background/controllers/renewal-workflow-controller.js', 'src/background/services/template-fill-service.js', 'src/background/services/insertion-lock-service.js', 'src/background/controllers/template-fill-controller.js', 'src/background/services/archive-insertion-service.js', 'src/background/services/archive-insertion-verification-service.js', 'src/background/services/archive-insertion-recovery-service.js', 'src/background/controllers/archive-insertion-controller.js', 'src/background/services/remote-delete-replacement-service.js', 'src/background/services/published-inventory-resolver.js', 'src/background/services/diagnostic-export-service.js', 'src/background/services/public-listing-evidence-service.js', 'src/shared/managed-navigation.js', 'src/background/lib/inventory-reconciliation.js', 'src/shared/my-ads-readiness.js', 'src/background/lib/inventory-scope.js', 'src/shared/platform-hardening.js', 'src/content/platform-guard-content.js', 'src/background/background.js', 'src/content/image-extractor.js', 'src/content/form-extractor.js', 'src/content/paid-insertion-guard.js', 'src/content/template-category-flow.js', 'src/content/template-form-fields.js', 'src/content/template-image-upload.js', 'src/content/template-verification.js', 'src/content/template-publish-flow.js', 'src/content/template-filler.js', 'src/content/inventory-roster-parser.js', 'src/content/inventory-readiness.js', 'src/content/inventory-status-overlay.js', 'src/content/inventory-delete-operations.js', 'src/content/inventory-run-loop.js', 'src/content/inventory-runner.js', 'src/content/content.js', 'popup.html', 'popup.css', 'src/popup/popup.js', 'app.html', 'app.css', 'src/app/diagnostic-zip.js', 'src/app/inventory-view.js', 'src/app/inventory-export.js', 'src/app/inventory-import.js', 'src/app/profile-backup.js', 'src/app/account-gate.js', 'src/app/app-elements.js', 'src/app/profile-account-ui-controller.js', 'src/app/app-activity-center.js', 'src/app/actions-diagnostics-controller.js', 'src/app/control-accordion-controller.js', 'src/app/diagnostics-controls-controller.js', 'src/app/renewal-settings-controller.js', 'src/app/app-layout-controller.js', 'src/app/tab-page-inspection-controller.js', 'src/app/shared-ui-helpers.js', 'src/app/profile-backup-storage-service.js', 'src/app/profile-backup-controller.js', 'src/app/inventory-formatting.js', 'src/app/record-card-view.js', 'src/app/inventory-card-renderer.js', 'src/app/trash-card-renderer.js', 'src/app/inventory-render-controller.js', 'src/app/renewal-dialog-controller.js', 'src/app/inventory-candidate-model.js', 'src/app/inventory-capture-view.js', 'src/app/inventory-capture-controller.js', 'src/app/mass-renewal-ui-controller.js', 'src/app/archive-insertion-ui-controller.js', 'src/app/trash-template-ui-controller.js', 'src/app/archive-trash-insertion-ui-controller.js', 'src/app/app.js', 'src/app/native-update-check-ui.js', 'README.md', 'APP_ID.txt', 'CHANGELOG.md', 'icons/taskbar-16.png', 'icons/taskbar-32.png', 'icons/taskbar-48.png', 'icons/app-icon-128.png', 'icons/favicon.ico', 'icons/action-new-listing.svg', 'icons/action-update.svg', 'icons/action-delete.svg', 'icons/action-retry.svg', 'icons/action-finish-renewal.svg', 'icons/action-zip-export.svg', 'icons/view-detailed.svg', 'icons/view-compact.svg']


def verify_importscripts_closure(files):
    import re,posixpath
    file_set=set(files)
    missing=[]
    for name in files:
        if not name.endswith('.js'):
            continue
        path=root/name
        if not path.exists():
            raise AssertionError(f'Runtime file missing from source: {name}')
        text=path.read_text(encoding='utf-8')
        for call in re.finditer(r'importScripts\s*\(([^)]*)\)', text, re.S):
            for match in re.finditer(r'''["']([^"']+)["']''', call.group(1)):
                dep=match.group(1)
                if dep.startswith(('http:','https:','chrome-extension:','data:')):
                    continue
                norm=posixpath.normpath((Path(name).parent/dep).as_posix())
                if norm not in file_set:
                    missing.append(f'{name} -> {norm}')
    if missing:
        raise AssertionError('Chrome runtime packaging misses local importScripts dependencies: ' + '; '.join(missing))

verify_importscripts_closure(runtime)

def verify_declared_runtime_closure(files):
    import re
    file_set=set(files)
    declared=[]
    worker=manifest.get('background',{}).get('service_worker')
    if worker: declared.append(('manifest.background.service_worker',worker))
    for index,entry in enumerate(manifest.get('content_scripts',[])):
        for ref in entry.get('js',[]): declared.append((f'manifest.content_scripts[{index}]',ref))
    for html_name in ['app.html','popup.html']:
        html=(root/html_name).read_text(encoding='utf-8')
        for match in re.finditer(r'<script\s+src=["\']([^"\']+\.js)["\']',html):
            declared.append((html_name,match.group(1)))
    missing_source=[f'{owner} -> {ref}' for owner,ref in declared if not (root/ref).is_file()]
    missing_package=[f'{owner} -> {ref}' for owner,ref in declared if ref not in file_set]
    if missing_source: raise AssertionError('Declared runtime JS missing from source: '+'; '.join(missing_source))
    if missing_package: raise AssertionError('Declared runtime JS missing from Chrome package: '+'; '.join(missing_package))

verify_declared_runtime_closure(runtime)

source=sorted(p.relative_to(root).as_posix() for p in root.rglob('*') if p.is_file() and not any(x in p.relative_to(root).parts for x in ['node_modules','build','.git','__pycache__','.run']) and p.suffix not in {'.zip','.pyc'})
for kind,files in [('chrome',runtime),('source',source)]:
    target=out/f'kleinanzeigen-renewal-{kind}-v{package_version}.zip'
    with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED) as z:
        for name in files:
            info=zipfile.ZipInfo(name,(2026,9,12,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16
            z.writestr(info,(root/name).read_bytes())
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        assert 'manifest.json' in z.namelist()
        assert json.loads(z.read('manifest.json'))['version']==version
        if kind=='chrome':
            missing_entries=sorted(set(runtime)-set(z.namelist()))
            assert not missing_entries, f'Chrome ZIP missing runtime entries: {missing_entries}'
    data=target.read_bytes();assert data[:4]==b'PK\x03\x04'
    print(json.dumps({'path':str(target),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'readable':True}))
