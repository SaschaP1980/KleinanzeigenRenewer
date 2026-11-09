#!/usr/bin/env python3
"""KAR-99 P6: isolated real Chromium MV3 publish-intent recovery negative E2E.

Loads the actual checked-out journal and content publish flow into an ephemeral
extension. The fake confirmation form never accesses kleinanzeigen.de.
This is a SOURCE-fixture MV3 E2E, NOT production ZIP / account acceptance.
"""
from __future__ import annotations
import argparse
import json
import os
import shutil
import tempfile
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]
PUBLISH_PREFIX="karAutoPublishIntentV1_"
LOCK="kar-updater-global-admission-v1"

def require(condition, message):
    if not condition:
        raise AssertionError(message)

def fixture(directory):
    shutil.copy2(ROOT/"src/background/services/auto-publish-intent-journal.js",
                 directory/"auto-publish-intent-journal.js")
    shutil.copy2(ROOT/"src/content/template-publish-flow.js",
                 directory/"template-publish-flow.js")
    (directory/"manifest.json").write_text(json.dumps({
        "manifest_version":3,"name":"KAR-99 isolated publish recovery",
        "version":"0.0.1","permissions":["storage"],
        "background":{"service_worker":"background.js"}
    }),encoding="utf-8")
    (directory/"background.js").write_text(r"""
      globalThis.KRDeps={register:(name,api)=>{
        if(name==='KRAutoPublishIntentJournal')globalThis.P6Journal=api;
      }};
      importScripts('auto-publish-intent-journal.js');
      const generation=crypto.randomUUID();
      const journal=globalThis.P6Journal.create({
        storageLocal:chrome.storage.local,lockManager:navigator.locks,
        lockName:'kar-updater-global-admission-v1',
        workerInstanceId:generation,clock:()=>Date.now(),
        newToken:()=>crypto.randomUUID()
      });
      async function profileAllowed(){
        return (await chrome.storage.local.get('fixtureAccount')).fixtureAccount==='expected';
      }
      chrome.runtime.onMessage.addListener((message,sender,reply)=>{
        (async()=>{
          if(message.type==='info')return {generation,lockApi:typeof navigator.locks?.request==='function'};
          if(message.type==='observe')return journal.observe('fill-probe');
          if(message.type==='RENEWAL_PUBLISH_CLICKED')return {accepted:true};
          if(message.type==='AUTHORIZE_AUTOMATIC_PUBLISH'){
            if(message.fillId!=='fill-probe'||!await profileAllowed())
              throw Object.assign(Error('PROFILE_MISMATCH'),{code:'PROFILE_MISMATCH'});
            const attempt=await journal.begin({
              fillId:'fill-probe',workflowId:'renewal-probe',kind:'renewal',
              profileId:'expected',sourceAdId:'1234',targetTabId:99
            });
            if(!await profileAllowed())
              throw Object.assign(Error('PROFILE_CHANGED'),{code:'PROFILE_CHANGED'});
            return {authorized:true,receiptId:attempt.attemptId};
          }
          throw Error('UNKNOWN_PROBE_COMMAND');
        })().then(result=>reply({ok:true,result}),
                    error=>reply({ok:false,error:String(error?.code||error?.message||error)}));
        return true;
      });
    """,encoding="utf-8")
    (directory/"deps.js").write_text(r"""
      globalThis.KRDeps={register:(name,api)=>{
        if(name==='KRTemplatePublishFlow')globalThis.P6Flow=api;
      }};
    """,encoding="utf-8")
    (directory/"probe.html").write_text("""
<!doctype html><html><head><title>P6 isolated publish</title></head>
<body><form id="publishForm" action="#" method="post">
  <button type="submit" id="publish">Anzeige aufgeben</button>
</form>
<script src="deps.js"></script>
<script src="template-publish-flow.js"></script>
<script src="probe.js"></script></body></html>
""",encoding="utf-8")
    (directory/"probe.js").write_text(r"""
      globalThis.__posts=0;
      globalThis.__denials=0;
      const form=document.getElementById('publishForm');
      // This local fixture is the ONLY form submission target; no external URL.
      form.addEventListener('submit',event=>{event.preventDefault();globalThis.__posts++;});
      function runtimeMessage(message){
        return new Promise((resolve,reject)=>{
          chrome.runtime.sendMessage(message,response=>{
            if(chrome.runtime.lastError)return reject(Error(chrome.runtime.lastError.message));
            if(!response?.ok)return reject(Error(response?.error||'PROBE_FAILURE'));
            resolve(response.result);
          });
        });
      }
      const flow=globalThis.P6Flow.create({
        clean:s=>String(s||'').replace(/\s+/g,' ').trim(),
        visible:e=>Boolean(e?.isConnected)&&!e.disabled,
        diagnostic:(_fillId,event)=>{
          if(event==='MANUAL_PUBLISH_INTENT_BLOCKED')globalThis.__denials++;
        },
        runtimeMessage,updatePanel:()=>{},sleep:async()=>{},
        PaidInsertionGuard:{detect:()=>({required:false})}
      });
      flow.armPublishDetection('fill-probe');
    """,encoding="utf-8")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--report",required=True)
    args=parser.parse_args()
    binary=os.environ.get("KR_CHROME_BINARY")
    require(binary and Path(binary).is_file(),"real Chromium binary unavailable (infra failure)")
    report={"schema":1,"scenario":"p6-real-mv3-durable-publish-negative",
            "status":"FAIL","checks":[]}
    def checked(cond,name):
        require(cond,name)
        report["checks"].append(name)
    try:
        with tempfile.TemporaryDirectory(prefix="kar99-p6-chromium-") as root:
            ext=Path(root)/"extension"
            ext.mkdir()
            fixture(ext)
            with sync_playwright() as pw:
                launch={
                    "headless":True,"executable_path":binary,
                    "args":["--disable-extensions-except="+str(ext),"--load-extension="+str(ext)],
                    "ignore_default_args":["--disable-extensions"],"timeout":30000
                }
                if os.environ.get("KR_E2E_BROWSER_CHANNEL")=="chromium":
                    launch["channel"]="chromium"
                if hasattr(os,"geteuid") and os.geteuid()==0:
                    launch["args"].append("--no-sandbox")
                with tempfile.TemporaryDirectory(prefix="profile-",dir=root) as profile:
                    context=pw.chromium.launch_persistent_context(profile,**launch)
                    try:
                        deadline=time.monotonic()+20
                        worker=None
                        while time.monotonic()<deadline:
                            matches=[w for w in context.service_workers
                                     if w.url.startswith("chrome-extension://")
                                     and w.url.endswith("/background.js")]
                            if matches:
                                worker=matches[0]
                                break
                            time.sleep(.1)
                        checked(worker is not None,"real_mv3_service_worker_started")
                        extension_id=worker.url.split("/")[2]
                        page=context.new_page()
                        page.goto("chrome-extension://"+extension_id+"/probe.html",
                                  wait_until="domcontentloaded",timeout=12000)
                        original=page.evaluate("async()=>await chrome.runtime.sendMessage({type:'info'})")
                        checked(original.get("ok") and original["result"]["lockApi"],
                                "real_worker_has_origin_web_locks")
                        old_generation=original["result"]["generation"]
                        # Wrong account: user click must be blocked BEFORE any journal.
                        page.evaluate("async()=>await chrome.storage.local.set({fixtureAccount:'other'})")
                        page.locator("#publish").click()
                        page.wait_for_function("()=>window.__denials===1",timeout=10000)
                        rows=page.evaluate("async()=>await chrome.storage.local.get(null)")
                        checked(page.evaluate("()=>window.__posts") == 0 and
                                not any(k.startswith(PUBLISH_PREFIX) for k in rows),
                                "wrong_account_denies_real_dom_click_before_receipt")

                        # Approved native DOM click is permitted ONCE after
                        # writing/readback of the original immutable receipt.
                        page.evaluate("async()=>await chrome.storage.local.set({fixtureAccount:'expected'})")
                        page.locator("#publish").click()
                        page.wait_for_function("()=>window.__posts===1",timeout=10000)
                        receipt=page.evaluate("async()=>await chrome.runtime.sendMessage({type:'observe'})")
                        checked(receipt.get("ok") and receipt["result"]["state"]=="unverified"
                                and len(receipt["result"]["attempts"])==1,
                                "one_real_native_submit_with_durable_unverified_receipt")
                        # A duplicate click and a second raw form submit cannot
                        # replay the already consumed authorization.
                        page.locator("#publish").click()
                        raw_submit=page.evaluate("""()=>{
                          return !document.getElementById('publishForm').dispatchEvent(
                            new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:null}));
                        }""")
                        checked(raw_submit and page.evaluate("()=>window.__posts")==1,
                                "duplicate_click_and_implicit_submit_fail_closed")

                        # Kill the actual MV3 worker and recover from the
                        # persistent chrome.storage.local receipt after reload.
                        cdp=context.browser.new_browser_cdp_session()
                        targets=[t for t in cdp.send("Target.getTargets")["targetInfos"]
                                 if t.get("type")=="service_worker"
                                 and extension_id in t.get("url","")]
                        checked(len(targets)==1,"one_real_worker_generation_before_crash")
                        closed=cdp.send("Target.closeTarget",{"targetId":targets[0]["targetId"]})
                        checked(closed.get("success") is True,"actual_mv3_worker_was_terminated")
                        new_generation=None
                        deadline=time.monotonic()+15
                        while time.monotonic()<deadline:
                            try:
                                resp=page.evaluate("async()=>await chrome.runtime.sendMessage({type:'info'})")
                                if resp.get("ok") and resp["result"]["generation"]!=old_generation:
                                    new_generation=resp["result"]["generation"]
                                    break
                            except Exception:
                                pass
                            time.sleep(.2)
                        checked(new_generation is not None,"mv3_worker_restart_generation_changed")
                        page.reload(wait_until="domcontentloaded")
                        page.locator("#publish").click()
                        page.wait_for_function("()=>window.__denials>=1",timeout=10000)
                        resumed=page.evaluate("async()=>await chrome.runtime.sendMessage({type:'observe'})")
                        checked(page.evaluate("()=>window.__posts")==0
                                and resumed.get("ok")
                                and resumed["result"]["state"]=="unverified"
                                and len(resumed["result"]["attempts"])==1
                                and not resumed["result"]["resolutions"],
                                "reloaded_page_and_worker_deny_duplicate_publish")
                        after=page.evaluate("async()=>await chrome.storage.local.get(null)")
                        checked(len([k for k in after if k.startswith(PUBLISH_PREFIX)])==1,
                                "exactly_one_immutable_before_remote_attempt_survives_crash")
                        report["workerGenerationChanged"]=old_generation!=new_generation
                        report["chromiumVersion"]=context.browser.version
                        report["status"]="PASS"
                        print(json.dumps(report,ensure_ascii=False),flush=True)
                    finally:
                        context.close()
    except Exception as err:
        report["failure"]=type(err).__name__+": "+str(err)[:2500]
        print(json.dumps(report,ensure_ascii=False),flush=True)
        raise
    finally:
        path=Path(args.report)
        path.parent.mkdir(parents=True,exist_ok=True)
        path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")

if __name__=="__main__":
    main()
