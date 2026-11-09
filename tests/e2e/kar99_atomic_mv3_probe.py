#!/usr/bin/env python3
"""KAR-99 P8: authentic MV3 worker / extension-page Web Locks proof.
This installs only an ephemeral local fixture, not the Kleinanzeigen extension.
It copies the exact checked-out production atomic module without mocking
navigator.locks or chrome.storage.local. No account/network/NativeHost actions.
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

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "src/background/services/cross-worker-atomic-admission.js"
LOCK = "kar-updater-global-admission-v1"
START_PREFIX = "karAtomicAdmissionStartV1_"
FINISH_PREFIX = "karAtomicAdmissionFinishV1_"


def check(value, description):
    if not value:
        raise AssertionError(description)


def make_fixture(root: Path):
    check(SOURCE.is_file(), "actual KAR-99 cross-worker atomic module missing")
    shutil.copy2(SOURCE, root / "cross-worker-atomic-admission.js")
    (root / "manifest.json").write_text(json.dumps({
        "manifest_version": 3, "name": "KAR-99 isolated atomic MV3 verification",
        "version": "0.0.1", "permissions": ["storage"],
        "background": {"service_worker": "background.js"}
    }), encoding="utf-8")
    (root / "probe.html").write_text(
        "<!doctype html><title>KAR-99 authenticated isolated Web Locks probe</title>",
        encoding="utf-8")
    (root / "background.js").write_text(r"""
      // An isolated trusted MV3 worker, running the unmodified production module.
      globalThis.KRDeps = { register: (key, value) => {
        if (key === 'KRAtomicMV3Admission') globalThis.KAR99Atomic = value;
      } };
      importScripts('cross-worker-atomic-admission.js');
      const workerInstanceId = crypto.randomUUID();
      const coordinator = globalThis.KAR99Atomic.create({
        storageLocal: chrome.storage.local, lockManager: navigator.locks,
        workerInstanceId, clock: () => Date.now(),
        newToken: () => crypto.randomUUID()
      });
      chrome.runtime.onMessage.addListener((message, sender, reply) => {
        (async () => {
          if (message.type === 'info')
            return {workerInstanceId, lockApi: typeof navigator.locks?.request === 'function',
                    origin: self.location.origin};
          if (message.type === 'start')
            return {result: await coordinator.withAdmission('P8_NATIVE_PROBE', async () => 'started')};
          if (message.type === 'reserve')
            return {result: await coordinator.guardReserve(async () => 'eligible-only-in-isolated-fixture')};
          if (message.type === 'crash') {
            // Intentionally never settles. Killing this actual MV3 worker must
            // preserve an unresolved begin receipt across a real worker restart.
            void coordinator.withAdmission('P8_UNFINISHED_WORK', async () => new Promise(() => {}));
            return {started: true};
          }
          throw Error('UNKNOWN_TEST_MESSAGE');
        })().then(reply, e => reply({code: e?.code || 'UNEXPECTED_ERROR',
                                   message: String(e?.message || e)}));
        return true;
      });
    """, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--report", required=True)
    args = parser.parse_args()
    browser_path = os.environ.get("KR_CHROME_BINARY")
    check(browser_path and Path(browser_path).is_file(), "real Chromium executable unavailable")
    report = {"schema": 1, "status": "FAIL", "scenario": "real-mv3-worker-page-atomic-web-locks",
              "checks": [], "browserPath": browser_path}
    try:
        with tempfile.TemporaryDirectory(prefix="kar99-p8-native-") as temp:
            ext = Path(temp) / "extension"
            ext.mkdir()
            make_fixture(ext)
            with sync_playwright() as playwright:
                launch = {
                    "headless": True, "executable_path": browser_path,
                    "args": [
                        "--disable-extensions-except=" + str(ext),
                        "--load-extension=" + str(ext)
                    ], "ignore_default_args": ["--disable-extensions"],
                    "timeout": 30000,
                }
                if os.environ.get("KR_E2E_BROWSER_CHANNEL") == "chromium":
                    launch["channel"] = "chromium"
                if hasattr(os, "geteuid") and os.geteuid() == 0:
                    launch["args"].append("--no-sandbox")
                with tempfile.TemporaryDirectory(prefix="profile-", dir=temp) as profile:
                    context = playwright.chromium.launch_persistent_context(profile, **launch)
                    try:
                        deadline = time.monotonic() + 20
                        service_worker = None
                        while time.monotonic() < deadline:
                            candidates = [w for w in context.service_workers
                                          if w.url.startswith("chrome-extension://")
                                          and w.url.endswith("/background.js")]
                            if candidates:
                                service_worker = candidates[0]
                                break
                            time.sleep(.1)
                        check(service_worker is not None,
                              "real installed MV3 service worker did not start (INFRA, not PASS)")
                        extension_id = service_worker.url.split("/")[2]
                        page = context.new_page()
                        page.goto("chrome-extension://" + extension_id + "/probe.html",
                                  wait_until="domcontentloaded", timeout=12000)
                        info = page.evaluate("async () => ({pageLocks: typeof navigator.locks?.request === 'function', worker: await chrome.runtime.sendMessage({type:'info'})})")
                        check(info["pageLocks"] and info["worker"].get("lockApi"),
                              "Web Locks API unavailable in actual MV3 service-worker or extension page")
                        report["checks"].append("real_mv3_service_worker_and_extension_page_support_web_locks")
                        worker_before = info["worker"]["workerInstanceId"]
                        check(info["worker"]["origin"] == "chrome-extension://" + extension_id,
                              "worker and extension page do not share a verified extension origin")
                        check(page.evaluate("() => location.origin") == info["worker"]["origin"],
                              "worker/page origin mismatch")
                        report["checks"].append("same_extension_origin")

                        page_locked = page.evaluate(r"""async (name) => {
                          const hold = globalThis.__kar99PageHold = {};
                          return await new Promise((resolve, reject) => {
                            hold.pending = navigator.locks.request(name, {mode:'exclusive'}, async lock => {
                              if (!lock) { reject(Error('PAGE_LOCK_NOT_GRANTED')); return; }
                              hold.releasePromise = new Promise(r => hold.release = r);
                              resolve(true);
                              await hold.releasePromise;
                            }).catch(reject);
                          });
                        }""", LOCK)
                        check(page_locked, "extension page failed to acquire exclusive origin lock")
                        denied_start = page.evaluate(
                            "async () => await chrome.runtime.sendMessage({type:'start'})")
                        denied_reserve = page.evaluate(
                            "async () => await chrome.runtime.sendMessage({type:'reserve'})")
                        check(denied_start.get("code") == "KR_UPDATE_FENCE_ATOMIC_BUSY"
                              and denied_reserve.get("code") == "KR_UPDATE_FENCE_ATOMIC_BUSY",
                              "real worker did not reject start and reserve while page held the exclusive Web Lock")
                        rows = page.evaluate("async () => await chrome.storage.local.get(null)")
                        check(not any(k.startswith(START_PREFIX) for k in rows),
                              "denied worker started irreversible work despite browser lock being held")
                        report["checks"].append("real_page_lock_denies_worker_start_and_reserve")

                        page.evaluate("async () => {__kar99PageHold.release(); await __kar99PageHold.pending;}")
                        accepted = page.evaluate(
                            "async () => await chrome.runtime.sendMessage({type:'start'})")
                        check(accepted.get("result") == "started",
                              "real MV3 worker failed to proceed after Web Lock release")
                        rows = page.evaluate("async () => await chrome.storage.local.get(null)")
                        starts = {k: v for k, v in rows.items() if k.startswith(START_PREFIX)}
                        finishes = {k: v for k, v in rows.items() if k.startswith(FINISH_PREFIX)}
                        check(len(starts) == len(finishes) == 1,
                              "real MV3 worker did not persist matching admitted/completed receipts")
                        report["checks"].append("real_lock_release_and_storage_readback")

                        response = page.evaluate(
                            "async () => await chrome.runtime.sendMessage({type:'crash'})")
                        check(response.get("started") is True,
                              "real worker did not start unresolved simulated task")
                        page.wait_for_function(
                            """async p => {
                              const r = await chrome.storage.local.get(null);
                              return Object.keys(r).filter(k => k.startsWith(p)).length === 2;
                            }""", arg=START_PREFIX, timeout=10000)
                        cdp = context.browser.new_browser_cdp_session()
                        workers = [
                            t for t in cdp.send("Target.getTargets")["targetInfos"]
                            if t.get("type") == "service_worker"
                            and extension_id in t.get("url", "")
                        ]
                        check(len(workers) == 1, "real Chromium worker target not uniquely identified")
                        closed = cdp.send("Target.closeTarget",
                                          {"targetId": workers[0]["targetId"]})
                        check(closed.get("success") is True,
                              "real MV3 worker termination did not succeed")

                        worker_after = None
                        response = None
                        deadline = time.monotonic() + 15
                        while time.monotonic() < deadline:
                            try:
                                response = page.evaluate(
                                    "async () => await chrome.runtime.sendMessage({type:'reserve'})")
                                worker_after = page.evaluate(
                                    "async () => await chrome.runtime.sendMessage({type:'info'})")
                                if worker_after.get("workerInstanceId") != worker_before:
                                    break
                            except Exception:
                                time.sleep(.2)
                        check(worker_after is not None
                              and worker_after.get("workerInstanceId") != worker_before,
                              "MV3 worker generation did not change after target crash")
                        check(response.get("code") == "KR_UPDATE_FENCE_BUSY",
                              "crashed previous worker's unfinished receipt did not block reserve")
                        rows = page.evaluate("async () => await chrome.storage.local.get(null)")
                        check(len([k for k in rows if k.startswith(START_PREFIX)]) == 2
                              and len([k for k in rows if k.startswith(FINISH_PREFIX)]) == 1,
                              "crash incorrectly erased unfinished intent or forged a finish")
                        report["checks"].append("real_worker_crash_reserve_blocked_by_persisted_uncertainty")
                        report["workerGenerationChanged"] = worker_before != worker_after["workerInstanceId"]
                        report["chromiumVersion"] = context.browser.version
                        report["status"] = "PASS"
                        print(json.dumps(report, ensure_ascii=False), flush=True)
                    finally:
                        context.close()
    except Exception as error:
        report["failure"] = type(error).__name__ + ": " + str(error)[:2500]
        print(json.dumps(report, ensure_ascii=False), flush=True)
        raise
    finally:
        destination = Path(args.report)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
