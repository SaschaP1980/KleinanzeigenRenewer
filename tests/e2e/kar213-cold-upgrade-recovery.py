#!/usr/bin/env python3
"""S03 isolated real Chromium cold upgrade + rollback; never a real browser profile."""
from __future__ import annotations
import argparse
import faulthandler
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
import zipfile
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
EXTENSION_ID="hafahjhhgiipdegfkgacchmnacgblnah"
SOURCE={
    "1.23.48":("f2225155e403d89d07a674c9e20f397a4f86694d","3c31b42aa90d4f70594a376d549acba7edb8aefa"),
    "1.25.36":("5ffd5eccce564154dca0f51b9229283a9d2dae85","6b22a7e5368a508b3651b0654187d13f7b56c4ae"),
}
BASE="61f917d384cdce0fc191188e5a99515907967dbe"

def git(*args):
    return subprocess.check_output(["git",*args],cwd=ROOT)

def extract(ref,version,expected_blob,ext,tmp):
    archive=f"release/kleinanzeigen-renewal-chrome-v{version}.zip"
    assert git("rev-parse",f"{ref}:{archive}").decode().strip()==expected_blob
    file=tmp/f"{version}.zip"
    file.write_bytes(git("show",f"{ref}:{archive}"))
    if ext.exists():
        shutil.rmtree(ext)
    ext.mkdir()
    with zipfile.ZipFile(file) as z:
        assert all(not Path(n).is_absolute() and ".." not in Path(n).parts for n in z.namelist())
        z.extractall(ext)
    manifest=json.loads((ext/"manifest.json").read_text())
    assert manifest["version"]==version
    import base64
    computed="".join(chr(97+int(c,16)) for c in hashlib.sha256(base64.b64decode(manifest["key"])).hexdigest()[:32])
    assert computed==EXTENSION_ID

def candidate(ext,tmp,candidate_zip=None):
    if candidate_zip is not None:
        # Mandatory Work PR mode uses the exact already-verified committed archive.
        version=json.loads((ROOT/'manifest.json').read_text())['version']
        with zipfile.ZipFile(candidate_zip) as z:
            assert all(not Path(n).is_absolute() and '..' not in Path(n).parts for n in z.namelist())
            if ext.exists(): shutil.rmtree(ext)
            ext.mkdir()
            z.extractall(ext)
        manifest=json.loads((ext/'manifest.json').read_text())
        assert manifest==json.loads((ROOT/'manifest.json').read_text())
        import base64
        computed=''.join(chr(97+int(c,16)) for c in hashlib.sha256(base64.b64decode(manifest['key'])).hexdigest()[:32])
        assert computed==EXTENSION_ID
        print('KAR213_PACKAGED_CANDIDATE '+json.dumps({'version':version,'sha256':hashlib.sha256(candidate_zip.read_bytes()).hexdigest()}),flush=True)
        return version
    # This is a source-overlay diagnostic, not a newly sealed release ZIP.
    extract(BASE,"2.0.1.0","4c2e8cb8a1d1967d0639ef8614f4881373d1fade",ext,tmp)
    paths=git("diff","--name-only",BASE,"HEAD","--","src").decode().splitlines()
    assert paths
    for name in paths:
        assert (ROOT/name).is_file() and (ext/name).is_file(), name
        shutil.copyfile(ROOT/name,ext/name)
    print("KAR213_SOURCE_OVERLAY "+json.dumps({"changedRuntimeFiles":len(paths),"sourceHead":git("rev-parse","HEAD").decode().strip()}),flush=True)
    return "2.0.1.0"

def files(root):
    out={}
    for p in sorted(root.rglob("*")):
        if p.is_symlink():
            raise AssertionError("Unexpected link in closed synthetic browser profile")
        if p.is_file():
            out[str(p.relative_to(root))]=hashlib.sha256(p.read_bytes()).hexdigest()
        elif not p.is_dir():
            raise AssertionError("Unexpected special file in closed synthetic browser profile")
    return out

def traced(label, operation, *args, **kwargs):
    # Diagnostic only: exceptions and all original return values propagate.
    print("KAR213_TRACE_ENTER "+label,flush=True)
    started=time.monotonic()
    try:
        result=operation(*args,**kwargs)
    except BaseException as exc:
        print(f"KAR213_TRACE_EXCEPTION {label} {type(exc).__name__}",flush=True)
        raise
    print(f"KAR213_TRACE_EXIT {label} {time.monotonic()-started:.3f}s",flush=True)
    return result

def launch(p,profile,ext):
    binary=os.environ["KR_CHROME_BINARY"]
    ctx=p.chromium.launch_persistent_context(str(profile),headless=True,channel="chromium",executable_path=binary,
        ignore_default_args=["--disable-extensions"],args=[
            f"--disable-extensions-except={ext}",f"--load-extension={ext}","--no-sandbox",
            "--disable-background-networking","--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost"],timeout=30000)
    try:
        ctx.route("http://**/*",lambda route:route.abort())
        ctx.route("https://**/*",lambda route:route.abort())
        page=ctx.new_page()
        errors=[]
        page.on("pageerror",lambda error:errors.append(str(error)))
        # Historical 1.23.48 uses the root app.html; later packages relocated it.
        app_path=next((name for name in ["src/app/app.html","app.html"] if (ext/name).is_file()),None)
        assert app_path,"Missing actual packaged app entry"
        print("KAR213_PHASE app-navigation "+app_path,flush=True)
        page.goto(f"chrome-extension://{EXTENSION_ID}/{app_path}",wait_until="domcontentloaded",timeout=20000)
        page.wait_for_timeout(1200)
        # Exercise the actual background via its existing read-only runtime route,
        # not direct DevTools evaluation on a transient MV3 worker target.
        print("KAR213_PHASE worker-bootstrap",flush=True)
        reply=traced("worker-bootstrap-message",page.evaluate, """async () => {
          let timer;
          try {
            return await Promise.race([
              chrome.runtime.sendMessage({type:'GET_BACKGROUND_EPOCH'}),
              new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Background epoch deadline')),5000);})
            ]);
          } finally {clearTimeout(timer);}
        }""")
        assert reply.get("ok") is True and isinstance(reply.get("result",{}).get("epoch"),str) and len(reply["result"]["epoch"])>=20, "Runtime bootstrap missing"
        manifest=json.loads((ext/"manifest.json").read_text())
        worker_path=manifest["background"]["service_worker"]
        workers=[w for w in ctx.service_workers if w.url.startswith(f"chrome-extension://{EXTENSION_ID}/")]
        assert len(workers)==1 and workers[0].url==f"chrome-extension://{EXTENSION_ID}/{worker_path}", "Expected exact extension service worker"
        assert not errors,errors
        # The real packaged launcher is passive unless clicked; use its stable
        # extension document origin for raw Chrome storage and IndexedDB.
        launchers=[name for name in ("popup.html","src/popup/popup.html") if (ext/name).is_file()]
        assert len(launchers)==1,"Expected one exact packaged launcher"
        launcher=launchers[0]
        probe=ctx.new_page()
        probe.on("pageerror",lambda error:errors.append(str(error)))
        traced("probe-navigation",probe.goto,f"chrome-extension://{EXTENSION_ID}/{launcher}",wait_until="domcontentloaded",timeout=20000)
        assert traced("probe-identity",probe.evaluate,"chrome.runtime.id")==EXTENSION_ID
        assert not errors,errors
        # Avoid ongoing manager reads while seeding and comparing raw state.
        traced("manager-page-close",page.close)
        return ctx,probe
    except BaseException:
        traced("failed-launch-context-close",ctx.close)
        raise

def fixture(version):
    # Dates are generated relative to the test run, not a fixed fixture clock.
    import datetime as dt
    now=dt.datetime.now(dt.timezone.utc)
    iso=lambda d:d.isoformat(timespec="milliseconds").replace("+00:00","Z")
    recent=iso(now-dt.timedelta(days=2))
    old=iso(now-dt.timedelta(days=70))
    expires=iso(now+dt.timedelta(days=28))
    profiles=[{"profileId":"synthetic-A","displayName":"Synthetic A","normalizedName":"synthetic a","createdAt":recent,"lastSeenAt":recent,"futureOpaque":{"flag":True}},{"profileId":"synthetic-B","displayName":"Synthetic B","normalizedName":"synthetic b","createdAt":recent,"lastSeenAt":recent}]
    storage={"profilesV1":profiles,"selectedInventoryProfileV1":{"profileId":"synthetic-A","selectedAt":recent,"source":"synthetic-fixture"},"renewalPhaseAttemptsV1":3,"globalListViewModeV1":"compact","unknownSyntheticFutureV1":{"values":[0,None,{"nested":True}]}}
    rows=[]
    images=[]
    for n,(pid,kind) in enumerate([("synthetic-A","inventory"),("synthetic-A","trash"),("synthetic-B","inventory")],100):
        key=str(n)
        row={"inventoryId":key,"adId":key,"profileId":pid,"profileName":"Synthetic A" if pid=="synthetic-A" else "Synthetic B","schemaVersion":2,"recordKind":kind,"capturedAt":recent,"title":"Synthetic "+key,"images":[{"imageKey":key+":0","position":0}],"futureOpaque":{"nested":[key,False]}}
        if kind=="trash":
            row["trash"]={"trashedAt":recent,"expiresAt":expires,"futureTrashField":"preserve"}
        rows.append(row)
        images.append({"imageKey":key+":0","inventoryId":key,"mimeType":"image/jpeg","bytes":[255,216,n,0,255,217],"futureImageField":n})
    if version=="1.25.36":
        storage["trashRetentionDaysV1"]="infinite"
        storage["massRenewalStopOnErrorPreferenceV1"]=True
        rows[1]["trash"].update({"trashedAt":old,"expiresAt":None,"retentionIndefinite":True})
        # Detached, independently resolved publication and Phase-4 records.
        t=int(now.timestamp()*1000)-10000
        intent={"schema":1,"state":"outcome-unverified","fillId":"fill-synthetic","workflowId":"renewal-synthetic","attemptId":"publish-attempt","workerInstanceId":"worker-synthetic","profileId":"synthetic-A","kind":"renewal","targetTabId":12,"sourceAdId":"100","createdAtMs":t}
        attempt={"schema":1,"state":"outcome-unverified","renewalId":"renewal-synthetic","attemptId":"delete-attempt","workerInstanceId":"worker-synthetic","profileId":"synthetic-A","sourceAdId":"100","newAdId":"200","createdAtMs":t}
        storage.update({
            "karAutoPublishIntentV1_fill-synthetic_publish-attempt":intent,
            "karAutoPublishVerifiedResolutionV1_fill-synthetic_publish-attempt":{**intent,"state":"resolved-confirmed","newAdId":"200","targetPresent":True,"targetEvidence":"verified-edit-and-public-listing","targetEditAdId":"200","targetPublicAdId":"200","verifiedAtMs":t+1},
            "karPhase4UncertainAttemptV1_renewal-synthetic_delete-attempt":attempt,
            "karPhase4VerifiedResolutionV1_renewal-synthetic_delete-attempt":{**attempt,"state":"resolved-confirmed","verifiedAtMs":t+2,"sourceEvidence":"not-in-my-ads-full-pagination-scan","sourcePagesScanned":1,"targetEvidence":"found-in-my-ads-full-pagination-scan","targetPagesScanned":1,"targetFoundPage":1}
        })
    return {"storage":storage,"records":rows,"images":images}

# Open only the existing DB established by real application startup. Never
# create or upgrade a schema inside the probe: that could hide a migration bug.
OPEN_EXISTING_DB="""const openExistingDatabase=()=>new Promise((resolve,reject)=>{
  const req=indexedDB.open('kleinanzeigen-renewal');
  req.onupgradeneeded=()=>{req.transaction.abort();reject(new Error('Existing inventory database missing'));};
  req.onerror=()=>reject(req.error);
  req.onblocked=()=>reject(new Error('Inventory database open blocked'));
  req.onsuccess=()=>{
    const db=req.result;
    if(db.version!==2 || !db.objectStoreNames.contains('inventories') || !db.objectStoreNames.contains('images')){
      db.close();reject(new Error('Unexpected inventory database schema'));return;
    }
    resolve(db);
  };
});"""
SEED="""async fixture=>{
  """+OPEN_EXISTING_DB+"""
  const db=await openExistingDatabase();
  await chrome.storage.local.set(fixture.storage);
  try{
    await new Promise((resolve,reject)=>{
      const tx=db.transaction(['inventories','images'],'readwrite');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error);
      for(const row of fixture.records)tx.objectStore('inventories').put(row);
      for(const row of fixture.images){const {bytes,...meta}=row;tx.objectStore('images').put({...meta,blob:new Blob([new Uint8Array(bytes)],{type:row.mimeType})});}
    });
  }finally{db.close();}
}"""
READ="""async keys=>{
  """+OPEN_EXISTING_DB+"""
  const storage=await chrome.storage.local.get(keys);
  const db=await openExistingDatabase();
  try{
    const tx=db.transaction(['inventories','images'],'readonly');
    const request=req=>new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const [records,images]=await Promise.all([request(tx.objectStore('inventories').getAll()),request(tx.objectStore('images').getAll())]);
    return {storage,records,images:await Promise.all(images.map(async row=>{const {blob,...meta}=row;return {...meta,bytes:[...new Uint8Array(await blob.arrayBuffer())]};})),dbVersion:db.version};
  }finally{db.close();}
}"""

def check(probe,expected,version):
    assert traced("manifest-version-evaluate",probe.evaluate,"chrome.runtime.getManifest().version")==version
    actual=traced("raw-storage-and-idb-read",probe.evaluate,READ,list(expected["storage"]))
    assert actual["dbVersion"]==2
    changed_keys=sorted(k for k in expected["storage"] if k not in actual["storage"] or actual["storage"][k]!=expected["storage"][k])
    if changed_keys:
        # All compared payloads are generated synthetic fixtures, never user data.
        print("KAR213_SYNTHETIC_STORAGE_DELTA "+json.dumps({k:{"expected":expected["storage"][k],"actual":actual["storage"].get(k)} for k in changed_keys}),flush=True)
    assert not changed_keys,"Local storage keys changed: "+", ".join(changed_keys)
    assert actual["records"]==expected["records"],"Inventory/trash rows changed"
    assert actual["images"]==expected["images"],"Image metadata/bytes changed"

def main(version,candidate_zip=None):
    ref,blob=SOURCE[version]
    with tempfile.TemporaryDirectory(prefix="kar213-cold-") as directory:
        tmp=Path(directory)
        ext=tmp/"extension";profile=tmp/"working-profile";backup=tmp/"cold-backup";restored=tmp/"restored-profile"
        expected=fixture(version)
        extract(ref,version,blob,ext,tmp)
        print("KAR213_PHASE seed-source "+version,flush=True)
        with sync_playwright() as p:
            ctx,probe=launch(p,profile,ext)
            try:
                traced("historical-seed",probe.evaluate,SEED,expected)
                check(probe,expected,version)
                snapshot=traced("historical-snapshot",probe.evaluate,"""async()=>({schema:1,sourceVersion:chrome.runtime.getManifest().version,storageLocal:await chrome.storage.local.get(null),capturedAt:new Date().toISOString()})""")
                path=tmp/"synthetic-snapshot.json"
                path.write_text(json.dumps(snapshot))
                preflight=subprocess.run(["node",str(ROOT/"scripts/kar213-upgrade-preflight.cjs"),str(path)],capture_output=True,text=True,timeout=10)
                print("KAR213_PREFLIGHT "+preflight.stdout.strip(),flush=True)
                assert preflight.returncode==0,"Synthetic source not settled according to offline preflight"
            finally:
                traced("phase-context-close",ctx.close)
        # Each browser launch has a separate Playwright driver lifecycle.
        print("KAR213_PHASE cold-copy "+version,flush=True)
        before=files(profile)
        assert before and any("IndexedDB" in name for name in before) and any("Local Extension Settings" in name for name in before)
        shutil.copytree(profile,backup)
        assert files(backup)==before,"Cold backup bytes differ"
        candidate_version=candidate(ext,tmp,candidate_zip)
        for cycle in range(2):
            print(f"KAR213_PHASE candidate-boot {version} {cycle+1}",flush=True)
            with sync_playwright() as p:
                ctx,probe=launch(p,profile,ext)
                try:
                    check(probe,expected,candidate_version)
                    if cycle==1:
                        changed=json.loads(json.dumps(expected))
                        changed["records"][0]["title"]="Synthetic deliberate corruption"
                        changed["storage"]["unknownSyntheticFutureV1"]={"changed":True}
                        traced("synthetic-corruption-seed",probe.evaluate,SEED,changed)
                        check(probe,changed,candidate_version)
                finally:
                    traced("phase-context-close",ctx.close)
            print(f"KAR213_UPGRADE_CYCLE {version} {cycle+1} PASS",flush=True)
        print("KAR213_PHASE verify-restore-copy "+version,flush=True)
        assert files(backup)==before,"Pristine backup mutated"
        shutil.copytree(backup,restored)
        assert files(restored)==before,"Restored raw profile bytes differ"
        extract(ref,version,blob,ext,tmp)
        print("KAR213_PHASE original-boot "+version,flush=True)
        with sync_playwright() as p:
            ctx,probe=launch(p,restored,ext)
            try:
                print("KAR213_PHASE original-readback "+version,flush=True)
                check(probe,expected,version)
                print("KAR213_PHASE original-close "+version,flush=True)
            finally:
                traced("phase-context-close",ctx.close)
        assert files(backup)==before,"Rollback mutated backup"
        print("KAR213_COLD_RECOVERY "+json.dumps({"sourceVersion":version,"candidateVersion":candidate_version,"records":len(expected["records"]),"images":len(expected["images"]),"storageKeys":len(expected["storage"]),"coldFiles":len(before),"upgradeCycles":2,"rollback":"PASS","status":"PASS"}),flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--source",choices=SOURCE,required=True)
    parser.add_argument("--candidate-zip",type=Path,help="Exact committed candidate package; omit for source-overlay diagnostic")
    args=parser.parse_args()
    # A worker evaluation or driver close has no Playwright evaluation deadline.
    # The outer CI hard timeout remains authoritative; capture the waiting stack.
    faulthandler.dump_traceback_later(20,repeat=True)
    try:
        main(args.source,args.candidate_zip)
    finally:
        faulthandler.cancel_dump_traceback_later()
