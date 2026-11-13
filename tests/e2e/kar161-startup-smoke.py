#!/usr/bin/env python3
"""KAR-161 browser startup smoke; isolated logged-out profile, no external traffic or account."""
from __future__ import annotations

import base64
import hashlib
import json
import os
from pathlib import Path
import shutil
import sys
import tempfile
import time
import zipfile

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
VERSION = json.loads((ROOT / "manifest.json").read_text())["version"]
ARCHIVE = ROOT / "release" / f"kleinanzeigen-renewal-chrome-v{VERSION}.zip"


def main():
    assert ARCHIVE.is_file(), "committed Chrome archive missing"
    report = {"version": VERSION, "console": [], "pageErrors": [], "worker": [], "checks": {}}
    with tempfile.TemporaryDirectory(prefix="kar161-startup-") as tmp:
        ext = Path(tmp) / "extension"
        ext.mkdir()
        with zipfile.ZipFile(ARCHIVE) as pack:
            pack.extractall(ext)
        manifest = json.loads((ext / "manifest.json").read_text())
        key = base64.b64decode(manifest["key"])
        digest = hashlib.sha256(key).hexdigest()[:32]
        extension_id = "".join(chr(97 + int(c, 16)) for c in digest)
        binary = os.environ.get("KR_CHROME_BINARY")
        assert binary and Path(binary).exists(), "real Chromium browser missing"
        with sync_playwright() as playwright:
            profile = Path(tmp) / "profile"
            context = playwright.chromium.launch_persistent_context(
                str(profile), headless=True, executable_path=binary,
                channel="chromium", ignore_default_args=["--disable-extensions"],
                args=["--disable-extensions-except=" + str(ext),
                      "--load-extension=" + str(ext),
                      "--host-resolver-rules=MAP kleinanzeigen.de ~NOTFOUND, MAP *.kleinanzeigen.de ~NOTFOUND",
                      "--no-sandbox"],
                timeout=30000)
            try:
                context.route("https://**/*", lambda route: route.abort())
                context.on("serviceworker", lambda worker: report["worker"].append({"url": worker.url}))
                page = context.new_page()
                page.on("console", lambda entry: report["console"].append({"type": entry.type, "message": entry.text}))
                page.on("pageerror", lambda error: report["pageErrors"].append(str(error)))
                page.goto(f"chrome-extension://{extension_id}/src/app/app.html", wait_until="domcontentloaded", timeout=20000)
                page.wait_for_timeout(2500)
                report["checks"]["extensionId"] = extension_id
                report["checks"]["appTitle"] = page.title()
                report["checks"]["sliderFound"] = page.locator("#trashRetentionRange").count() == 1
                report["checks"]["startupController"] = page.evaluate("typeof globalThis.KRDeps?.require?.('KRTrashRetentionSettingsController')?.create")
                report["checks"]["backgroundWorkers"] = [worker.url for worker in context.service_workers]
                report["checks"]["domStatus"] = page.locator("#statusTitle").text_content()
                try:
                    report["checks"]["retentionConfig"] = page.evaluate("""async () => new Promise(resolve => {
                      const timer = setTimeout(() => resolve({timeout: true}), 5000);
                      chrome.runtime.sendMessage({type:'GET_TRASH_RETENTION_CONFIGURATION'}, reply => {
                        clearTimeout(timer);
                        resolve({reply, error:chrome.runtime.lastError?.message || null});
                      });
                    })""")
                except Exception as error:
                    report["checks"]["retentionConfigError"] = str(error)
                print(json.dumps(report, indent=2, ensure_ascii=False))
                assert not report["pageErrors"], "browser reported JS startup error"
                assert report["checks"]["sliderFound"], "new config range missing"
                assert report["checks"]["startupController"] == "function", "settings script not loaded"
                assert report["checks"].get("retentionConfig",{}).get("reply",{}).get("retentionDays") == 30, "background retention endpoint not operational"
                print("KAR-161 real Chromium install-and-open smoke: PASS")
            finally:
                context.close()


if __name__ == "__main__":
    main()
