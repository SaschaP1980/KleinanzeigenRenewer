#!/usr/bin/env python3
"""KAR-171 R1: genuine Chromium MV3 worker interrupted IN FLIGHT.

Runs ONLY in a disposable Chromium profile with a test-only MV3 extension
loading the UNMODIFIED production remote scanner module. All My Ads responses,
account names and ad IDs are synthetic. There are no website host permissions,
content scripts, NativeHost ports, updater messages or remote mutations.

This confirms actual Chromium termination/recreation of a worker in BOTH
source and target reads, each followed by an independent negative/positive
new-generation scan; it never attaches to an installed browser profile.
It does not establish owner-native account results or full R1 acceptance.
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import shutil
import tempfile
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PRODUCTION_SCANNER = ROOT / "src/background/services/remote-delete-replacement-service.js"
SOURCE_ID, TARGET_ID = "137000100", "137000200"
FIXTURE_ACCOUNT = "synthetic-r1-account"
RECEIPT = {
    "renewalId": "r1-native-fixture-renewal",
    "attemptId": "r1-native-fixture-attempt",
    "workerInstanceId": "r1-original-immutable-worker",
    "admissionToken": "r1-original-immutable-admission-token",
    "profileId": FIXTURE_ACCOUNT,
    "sourceAdId": SOURCE_ID,
    "newAdId": TARGET_ID,
}


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def extension_id(key: str):
    digest = hashlib.sha256(base64.b64decode(key, validate=True)).hexdigest()[:32]
    return "".join(chr(ord("a") + int(x, 16)) for x in digest)


def fixture_files(folder: Path):
    require(PRODUCTION_SCANNER.is_file(), "production R1 scanner module missing")
    shutil.copy2(PRODUCTION_SCANNER, folder / "remote-delete-replacement-service.js")
    key = json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["key"]
    (folder / "manifest.json").write_text(json.dumps({
        "manifest_version": 3,
        "name": "KAR-171 isolated MV3 interrupted read-only scanner fixture",
        "version": "0.0.1",
        "key": key,
        "permissions": ["storage"],
        "background": {"service_worker": "background.js"},
    }), encoding="utf-8")
    (folder / "probe.html").write_text(
        "<!doctype html><meta charset='utf-8'><title>KAR-171 isolated fixture</title>",
        encoding="utf-8")
    # The independent RECEIVER is a separate extension DOCUMENT, not the
    # worker. No production file, content script, site or account is copied.
    # Only this disposable synthetic receiver has a TESTONLY message handler.
    (folder / "synthetic-receiver.html").write_text(
        "<!doctype html><meta charset='utf-8'>"
        "<title>Independent test receiver</title>"
        "<script src='synthetic-receiver.js'></script>",
        encoding="utf-8")
    (folder / "synthetic-receiver.js").write_text(r"""
'use strict';
// This page receives a REAL Chrome runtime message from a DIFFERENT browser
// execution context. A worker-side "REQUEST_STARTED" is not an ACK.
chrome.runtime.onMessage.addListener((message,_sender,sendResponse)=>{
  if(message?.type!=='TESTONLY_REMOTE_QUERY')return false;
  if(!['source','target'].includes(message.kind)
     ||typeof message.workerId!=='string'
     ||typeof message.queryNonce!=='string'){
    sendResponse({status:'DENIED_BAD_TEST_REQUEST'});
    return false;
  }
  const state=message.kind==='source'
    ?'SOURCE_QUERY_ACKED_PENDING':'TARGET_QUERY_ACKED_PENDING';
  const receipt=Object.freeze({
    state,workerId:message.workerId,queryNonce:message.queryNonce,
    kind:message.kind,context:'independent-receiver'
  });
  // Both records are written from the independent extension DOCUMENT.
  // No content reply follows. Thus the worker's genuine request Promise
  // is still awaiting a response when CDP closes ONLY that worker target.
  chrome.storage.session.set({
    kar171FixtureStage:receipt,kar171FixtureContentAck:receipt
  }).catch(()=>sendResponse({status:'ACK_STORAGE_UNAVAILABLE'}));
  return true;
});
globalThis.kar171TestReceiverReady=true;
""", encoding="utf-8")
    (folder / "background.js").write_text(r"""
'use strict';
// Only this disposable fixture owns this IPC; NONE of it is in KAR production.
const sourceId='137000100', targetId='137000200';
const account='synthetic-r1-account';
const workerId=crypto.randomUUID();
let fixtureApi=null, nextFakeTabId=20;
globalThis.KRDeps={register:(name,api)=>{
  if(name==='KRRemoteDeleteReplacementService')fixtureApi=api;
}};
importScripts('remote-delete-replacement-service.js');
if(!fixtureApi)throw Error('PRODUCTION_R1_SCANNER_UNAVAILABLE');
const allowed=new Set(['MY_ADS_STATUS','WAIT_FOR_MY_ADS_READY',
  'VERIFY_OWN_AD_ABSENT_BY_ID','FIND_OWN_AD_BY_ID']);

function makeService(mode,audit,queryNonce){
  const tabs=new Map();
  return fixtureApi.create({
    createManagedWorkerTab:async(_options,kind)=>{
      const tab={id:++nextFakeTabId,kind,statusReads:0,postQuery:false};
      tabs.set(tab.id,tab);audit.created++;
      return {id:tab.id};
    },
    waitForTabComplete:async()=>({status:'complete'}),
    ensureContentConnection:async()=>({ready:true}),
    closeManagedWorkerTab:async id=>{
      if(!tabs.has(id))throw Error('UNRECOGNIZED_TEST_TAB');
      audit.closed++;tabs.delete(id);
    },
    logDiagnostic:async()=>{},
    normalizeProfileName:text=>String(text||'').trim(),
    phase4StatusRequestTimeoutMs:10000,
    phase4ReadOnlyRequestTimeoutMs:10000,
    sendTabRequestWithBootstrap:async(id,message)=>{
      const tab=tabs.get(id);
      if(!tab||!allowed.has(message?.type))throw Error('FORBIDDEN_REMOTE_COMMAND');
      audit.commands.push(message.type);
      const isSource=tab.kind.endsWith('source');
      const isTarget=tab.kind.endsWith('target');
      if(!isSource&&!isTarget)throw Error('UNKNOWN_SCAN_KIND');
      if(message.type==='MY_ADS_STATUS'){
        tab.statusReads++;
        return {isMyAdsPage:true,isProjectsTab:true,
          profileName:mode==='account-change'&&isTarget&&tab.postQuery
            ?'changed-synthetic-account':account};
      }
      if(message.type==='WAIT_FOR_MY_ADS_READY')
        return {isMyAdsPage:true,isProjectsTab:true,profileName:account,
          currentPage:1,expectedOnline:2,listingCount:2,hasNext:false};
      if(message.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){
        if(!isSource||message.adId!==sourceId)throw Error('WRONG_SOURCE_ID');
        if(mode==='hold-source'){
          // The fixture's real Chrome IPC must reach an independent DOCUMENT.
          // A worker-side pre-dispatch marker is deliberately insufficient.
          return await chrome.runtime.sendMessage({
            type:'TESTONLY_REMOTE_QUERY',kind:'source',workerId,queryNonce
          });
        }
        return {verified:true,adId:sourceId,
          evidence:'not-in-my-ads-full-pagination-scan',pagesScanned:2};
      }
      if(message.type==='FIND_OWN_AD_BY_ID'){
        if(!isTarget||message.adId!==targetId||message.requireCompleteRoster!==true)
          throw Error('WRONG_TARGET_ID_OR_PAGINATION_CONTRACT');
        tab.postQuery=true;
        if(mode==='hold-target'){
          return await chrome.runtime.sendMessage({
            type:'TESTONLY_REMOTE_QUERY',kind:'target',workerId,queryNonce
          });
        }
        return {found:mode!=='target-absent',adId:targetId,
          evidence:'found-in-my-ads-full-pagination-scan',pagesScanned:2,page:2};
      }
      throw Error('UNREACHABLE');
    }
  });
}
async function run(mode,receipt,queryNonce=null){
  const audit={created:0,closed:0,commands:[]};
  const service=makeService(mode,audit,queryNonce);
  try{
    const proof=await service.verifyPhase4RemoteOutcomeFresh(receipt);
    return {status:'REMOTE_VERIFIED',workerId,
      sourceAbsent:proof.sourceAbsent,targetPresent:proof.targetPresent,
      sourcePages:proof.sourcePagesScanned,targetPages:proof.targetPagesScanned,
      created:audit.created,closed:audit.closed,commands:audit.commands};
  }catch{
    return {status:'REMOTE_UNVERIFIED',workerId,
      created:audit.created,closed:audit.closed,commands:audit.commands};
  }
}
chrome.runtime.onMessage.addListener((message,_sender,reply)=>{
  // Do not answer the fixture-only request intended for the other context.
  if(message?.type==='TESTONLY_REMOTE_QUERY')return false;
  (async()=>{
    if(message?.type==='info')return {workerId};
    if(message?.type==='hold'
       && (message?.mode==='source'||message?.mode==='target')){
      // Fire only in an isolated disposable worker. The caller receives an
      // initial acknowledgement, NOT an accepted remote outcome.
      const queryNonce=crypto.randomUUID();
      void run(message.mode==='target'?'hold-target':'hold-source',
               message.receipt,queryNonce);
      return {status:'SCAN_STARTED',workerId,queryNonce};
    }
    if(message?.type==='run')
      return await run(message.mode,message.receipt);
    return {status:'DENIED_UNRECOGNIZED_COMMAND'};
  })().then(reply,()=>reply({status:'REMOTE_UNVERIFIED'}));
  return true;
});
""", encoding="utf-8")
    return extension_id(key)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    executable = os.environ.get("KR_CHROME_BINARY")
    require(executable and Path(executable).is_file(), "Chromium binary unavailable")
    report = {
        "schema": 1, "status": "FAIL",
        "scenario": "kar171-original-r1-scanner-real-mv3-inflight-interruption",
        "checks": [], "isolatedSyntheticFixture": True,
        "ownerNativeScan": False, "r1Accepted": False, "eligibleForLease": False
    }
    try:
        with tempfile.TemporaryDirectory(prefix="kar171-mv3-r1-inflight-") as tmp:
            root = Path(tmp)
            ext = root / "fixture-extension"
            ext.mkdir()
            fixture_id = fixture_files(ext)
            with sync_playwright() as pw:
                args_browser = [
                    "--disable-extensions-except=" + str(ext),
                    "--load-extension=" + str(ext)
                ]
                if hasattr(os, "geteuid") and os.geteuid() == 0:
                    args_browser.append("--no-sandbox")
                opts = {
                    "headless": True, "executable_path": executable,
                    "ignore_default_args": ["--disable-extensions"],
                    "args": args_browser, "timeout": 30000
                }
                if os.environ.get("KR_E2E_BROWSER_CHANNEL") == "chromium":
                    opts["channel"] = "chromium"
                with tempfile.TemporaryDirectory(prefix="profile-", dir=tmp) as profile:
                    context = pw.chromium.launch_persistent_context(profile, **opts)
                    try:
                        page = context.new_page()
                        page.goto("chrome-extension://" + fixture_id + "/probe.html",
                                  wait_until="domcontentloaded", timeout=12000)
                        receiverPage = context.new_page()
                        receiverPage.goto(
                            "chrome-extension://" + fixture_id + "/synthetic-receiver.html",
                            wait_until="load", timeout=12000)
                        receiverPage.wait_for_function(
                            "() => globalThis.kar171TestReceiverReady === true",
                            timeout=12000)
                        require(context.browser is not None, "browser CDP unavailable")
                        manifest = page.evaluate("() => chrome.runtime.getManifest()")
                        require(manifest.get("permissions") == ["storage"]
                                and not manifest.get("host_permissions")
                                and not manifest.get("content_scripts"),
                                "fixture has unexpected Chrome/site mutation authority")
                        require(manifest["name"].startswith("KAR-171 isolated"),
                                "a real user extension was loaded instead of the fixture")
                        report["checks"].append("disposable_chrome_profile_and_storage_only_fixture")
                        receipt = dict(RECEIPT)
                        # Synthetic immutable historical context is never changed
                        # by the real production read-only remote scanner.
                        page.evaluate(
                            "async row => await chrome.storage.local.set({kar171FixtureOriginal:row})",
                            receipt)
                        baseline = page.evaluate(
                            "() => chrome.storage.local.get('kar171FixtureOriginal')")
                        msg = lambda typ, **other: page.evaluate(
                            "async m => await chrome.runtime.sendMessage(m)",
                            {"type": typ, **other})
                        epoch1 = msg("info")["workerId"]
                        require(isinstance(epoch1, str) and len(epoch1) >= 20,
                                "real fixture MV3 worker did not initialize")
                        startSource = msg("hold", mode="source", receipt=receipt)
                        require(startSource.get("status") == "SCAN_STARTED"
                                and startSource.get("workerId") == epoch1
                                and isinstance(startSource.get("queryNonce"), str),
                                "held source query did not acknowledge start")
                        page.wait_for_function("""async () => {
                            const row=await chrome.storage.session.get('kar171FixtureStage');
                            return row.kar171FixtureStage?.state==='SOURCE_QUERY_ACKED_PENDING';
                        }""", timeout=12000)
                        source_rows = page.evaluate(
                            "() => chrome.storage.session.get("
                            "['kar171FixtureStage','kar171FixtureContentAck'])")
                        stage = source_rows["kar171FixtureStage"]
                        receiverAckSource = source_rows["kar171FixtureContentAck"]
                        require(stage == receiverAckSource
                                and stage.get("context") == "independent-receiver"
                                and stage.get("workerId") == epoch1
                                and stage.get("queryNonce") == startSource["queryNonce"]
                                and stage.get("kind") == "source",
                                "source was not acknowledged by independent receiver")
                        report["checks"].append("production_r1_scanner_held_inside_source_query")
                        cdp = context.browser.new_browser_cdp_session()
                        targets = cdp.send("Target.getTargets")["targetInfos"]
                        workers = [t for t in targets
                                   if t.get("type") == "service_worker"
                                   and t.get("url", "").startswith(
                                       "chrome-extension://" + fixture_id + "/")]
                        require(len(workers) == 1,
                                "isolated MV3 worker target not uniquely identified")
                        result = cdp.send("Target.closeTarget",
                                          {"targetId": workers[0]["targetId"]})
                        require(result.get("success") is True,
                                "isolated MV3 worker could not be terminated mid-query")
                        new_epoch = None
                        deadline = time.monotonic() + 15
                        while time.monotonic() < deadline:
                            try:
                                value = msg("info")
                                if value.get("workerId") != epoch1:
                                    new_epoch = value["workerId"]
                                    break
                            except Exception:
                                time.sleep(.15)
                        require(new_epoch is not None and new_epoch != epoch1,
                                "Chromium did not start a NEW MV3 worker generation")
                        report["checks"].append("genuine_mv3_termination_and_new_worker_generation")
                        old_stage = page.evaluate(
                            "() => chrome.storage.session.get('kar171FixtureStage')"
                        )["kar171FixtureStage"]
                        require(old_stage == stage,
                                "independent source receipt was silently rewritten")
                        # Without a NEW full source + target scan, stored
                        # historical state MUST NOT be interpreted as success.
                        denied = msg("run", mode="target-absent", receipt=receipt)
                        require(denied.get("status") == "REMOTE_UNVERIFIED"
                                and denied.get("workerId") == new_epoch,
                                "stale interrupted scan was promoted to verified outcome")
                        require(denied.get("created") == denied.get("closed") == 2,
                                "new negative scan leaked synthetic worker-tab ownership")
                        require(denied.get("commands", []).count(
                            "VERIFY_OWN_AD_ABSENT_BY_ID") == 1
                            and denied["commands"].count("FIND_OWN_AD_BY_ID") == 1,
                            "new negative scan did not independently read source/target")
                        report["checks"].append("no_historical_replay_after_interrupted_mv3_scan")
                        verified = msg("run", mode="ok", receipt=receipt)
                        require(verified.get("status") == "REMOTE_VERIFIED"
                                and verified.get("workerId") == new_epoch
                                and verified.get("sourceAbsent") is True
                                and verified.get("targetPresent") is True,
                                "fresh source/target positive scanner verification failed")
                        require(verified.get("sourcePages") == verified.get("targetPages") == 2
                                and verified.get("created") == verified.get("closed") == 2,
                                "positive scan omitted full pagination or cleanup")
                        commands = verified.get("commands", [])
                        require(commands.count("VERIFY_OWN_AD_ABSENT_BY_ID") == 1
                                and commands.count("FIND_OWN_AD_BY_ID") == 1
                                and set(commands).issubset({
                                    "MY_ADS_STATUS", "WAIT_FOR_MY_ADS_READY",
                                    "VERIFY_OWN_AD_ABSENT_BY_ID", "FIND_OWN_AD_BY_ID"
                                }), "unexpected remote scanner command or stale proof reuse")
                        report["checks"].append("genuine_new_generation_fresh_readonly_source_target")
                        changed = msg("run", mode="account-change", receipt=receipt)
                        require(changed.get("status") == "REMOTE_UNVERIFIED"
                                and changed.get("created") == changed.get("closed") == 2,
                                "account drift after target query wrongly accepted")
                        report["checks"].append("late_account_drift_denied_without_mutation")
                        # Repeat with a truly in-flight TARGET query. The
                        # source was already read inside this new worker; its
                        # successful source response must not survive a target
                        # interruption as reusable remote-success authority.
                        source_epoch = new_epoch
                        startTarget = msg("hold", mode="target", receipt=receipt)
                        require(startTarget.get("status") == "SCAN_STARTED"
                                and startTarget.get("workerId") == source_epoch
                                and isinstance(startTarget.get("queryNonce"), str),
                                "held target query did not acknowledge initiation")
                        page.wait_for_function("""async () => {
                            const row=await chrome.storage.session.get('kar171FixtureStage');
                            return row.kar171FixtureStage?.state==='TARGET_QUERY_ACKED_PENDING';
                        }""", timeout=12000)
                        target_rows = page.evaluate(
                            "() => chrome.storage.session.get("
                            "['kar171FixtureStage','kar171FixtureContentAck'])")
                        target_stage = target_rows["kar171FixtureStage"]
                        receiverAckTarget = target_rows["kar171FixtureContentAck"]
                        require(target_stage == receiverAckTarget
                                and target_stage.get("context") == "independent-receiver"
                                and target_stage.get("workerId") == source_epoch
                                and target_stage.get("queryNonce") == startTarget["queryNonce"]
                                and target_stage.get("kind") == "target"
                                and receiverAckTarget != receiverAckSource,
                                "target not separately acknowledged by independent receiver")
                        report["checks"].append("target_pending_stage_proven")
                        report["checks"].append("independent_receiver_ack_source_and_target")
                        second_targets = cdp.send("Target.getTargets")["targetInfos"]
                        second_workers = [t for t in second_targets
                                          if t.get("type") == "service_worker"
                                          and t.get("url", "").startswith(
                                              "chrome-extension://" + fixture_id + "/")]
                        require(len(second_workers) == 1,
                                "target-side MV3 worker not uniquely identified")
                        second_stop = cdp.send("Target.closeTarget",
                                               {"targetId": second_workers[0]["targetId"]})
                        require(second_stop.get("success") is True,
                                "isolated MV3 worker was not terminated during target query")
                        target_epoch = None
                        deadline = time.monotonic() + 15
                        while time.monotonic() < deadline:
                            try:
                                observed = msg("info")
                                if observed.get("workerId") != source_epoch:
                                    target_epoch = observed["workerId"]
                                    break
                            except Exception:
                                time.sleep(.15)
                        require(target_epoch is not None and target_epoch != source_epoch,
                                "target interruption did not create a new real worker")
                        report["checks"].append("second_mv3_termination_during_target_query")
                        unchanged_target = page.evaluate(
                            "() => chrome.storage.session.get('kar171FixtureStage')"
                        )["kar171FixtureStage"]
                        require(unchanged_target == target_stage,
                                "independent target receipt was silently rewritten")
                        post_target_denied = msg("run", mode="target-absent", receipt=receipt)
                        require(post_target_denied.get("status") == "REMOTE_UNVERIFIED"
                                and post_target_denied.get("workerId") == target_epoch
                                and post_target_denied.get("created")
                                == post_target_denied.get("closed") == 2,
                                "interrupted target success was replayed after worker death")
                        denied_commands = post_target_denied.get("commands", [])
                        require(denied_commands.count("VERIFY_OWN_AD_ABSENT_BY_ID") == 1
                                and denied_commands.count("FIND_OWN_AD_BY_ID") == 1,
                                "post-target interrupted negative failed to re-read both IDs")
                        report["checks"].append("post_target_interrupt_replay_denied")
                        post_target_verified = msg("run", mode="ok", receipt=receipt)
                        require(post_target_verified.get("status") == "REMOTE_VERIFIED"
                                and post_target_verified.get("workerId") == target_epoch
                                and post_target_verified.get("sourceAbsent") is True
                                and post_target_verified.get("targetPresent") is True
                                and post_target_verified.get("sourcePages") == 2
                                and post_target_verified.get("targetPages") == 2
                                and post_target_verified.get("created")
                                == post_target_verified.get("closed") == 2,
                                "post-target interrupted new generation did not rescan both IDs")
                        fresh_commands = post_target_verified.get("commands", [])
                        require(fresh_commands.count("VERIFY_OWN_AD_ABSENT_BY_ID") == 1
                                and fresh_commands.count("FIND_OWN_AD_BY_ID") == 1
                                and set(fresh_commands).issubset({
                                    "MY_ADS_STATUS", "WAIT_FOR_MY_ADS_READY",
                                    "VERIFY_OWN_AD_ABSENT_BY_ID", "FIND_OWN_AD_BY_ID"
                                }), "post-target scan reused history or unexpected command")
                        report["checks"].append("post_target_interrupt_fresh_source_target_verified")
                        end = page.evaluate(
                            "() => chrome.storage.local.get('kar171FixtureOriginal')")
                        require(end == baseline, "original synthetic historical receipt was mutated")
                        report["checks"].append("synthetic_immutable_receipt_unchanged")
                        report.update(status="PASS", chromiumVersion=context.browser.version,
                                      workerGenerationChanged=True)
                        print(json.dumps({
                            "status": report["status"], "scenario": report["scenario"],
                            "checks": len(report["checks"]),
                            "r1Accepted": False, "eligibleForLease": False
                        }), flush=True)
                    finally:
                        context.close()
    except Exception as error:
        report["error"] = type(error).__name__ + ": " + str(error)[:1400]
        print(json.dumps({"status": "FAIL", "scenario": report["scenario"],
                          "error": report["error"]}, flush=True))
        raise
    finally:
        destination = Path(args.report)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n",
                               encoding="utf-8")


if __name__ == "__main__":
    main()
