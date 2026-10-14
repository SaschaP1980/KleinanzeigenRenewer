"""KAR-75: actual user-gesture MV3 -> Windows URI prompt, CI lab ONLY.

A result is never inferred from ShellExecute or Chrome's generic fixture E2E.
No updater, privileges, permissions bypass, arbitrary URI args, or owner machine.
"""
from __future__ import annotations
import json, os, pathlib, platform, shutil, subprocess, sys, tempfile, time, uuid

if not (os.environ.get("CI") == "true"
        and os.environ.get("GITHUB_ACTIONS") == "true"
        and os.environ.get("KAR75_POC") == "1"
        and platform.system() == "Windows"
        and os.environ.get("RUNNER_TEMP")):
    raise SystemExit("KAR75_LAB_ONLY: hosted Windows Actions guard required")

import winreg
from playwright.sync_api import sync_playwright
from pywinauto import Desktop

SCHEME = "kar75poc"
REGKEY = "Software\\Classes\\" + SCHEME
TMP = pathlib.Path(os.environ["RUNNER_TEMP"]).resolve()
WORK = pathlib.Path(tempfile.mkdtemp(prefix="kar75-", dir=str(TMP)))
EXT = WORK / "extension"
PROFILE = WORK / "chrome-profile"
MARKER = TMP / ("kar75-" + uuid.uuid4().hex + ".txt")
HANDLER = pathlib.Path(__file__).resolve().parent / "kar75-uri-handler.ps1"
POWER = pathlib.Path(os.environ["WINDIR"]) / "System32" / "WindowsPowerShell" / "v1.0" / "powershell.exe"
result = {"test": "KAR-75", "scope": "ephemeral Windows Chromium MV3", "status": "NOT_VERIFIED",
          "chrome_clicked": False, "prompt_seen": False, "cancel_verified": False,
          "allow_verified": False, "registry_clean": False, "reason": "not_started"}
registered = False
expected = '"' + str(POWER) + '" -NoProfile -NonInteractive -File "' + str(HANDLER) + '" -Marker "' + str(MARKER) + '"'
out_path = TMP / "kar75-chrome-uri-result.json"

def key_exists(root, name):
    try:
        with winreg.OpenKey(root, name):
            return True
    except FileNotFoundError:
        return False

def owned_command():
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, REGKEY + "\\shell\\open\\command") as handle:
        return winreg.QueryValueEx(handle, "")[0]

def delete_tree(root, key):
    with winreg.OpenKey(root, key, 0, winreg.KEY_READ | winreg.KEY_WRITE) as handle:
        i = 0
        while True:
            try:
                child = winreg.EnumKey(handle, i)
            except OSError:
                break
            delete_tree(root, key + "\\" + child)
    winreg.DeleteKey(root, key)

def find_prompt(timeout=12):
    """Find only a Chrome external-application consent surface, not a generic OS button."""
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        for win in Desktop(backend="uia").windows():
            try:
                labels = [(el.element_info.control_type, (el.window_text() or "").strip())
                          for el in win.descendants(depth=7)]
                texts = [value for kind, value in labels if value]
                combined = " ".join(texts).lower()
                # Require evidence that this is OUR specific URI prompt, not another app.
                if SCHEME not in combined and "open windows powershell" not in combined:
                    continue
                buttons = [(name.lower(), el) for el in win.descendants(control_type="Button", depth=7)
                           if (name := (el.window_text() or "").strip())]
                cancel = next((el for name, el in buttons if name in ("cancel", "abbrechen")), None)
                accept = next((el for name, el in buttons if name in ("open", "open windows powershell",
                                                                     "öffnen", "windows powershell öffnen")), None)
                if cancel is not None and accept is not None:
                    return {"window": win, "cancel": cancel, "accept": accept}
            except Exception:
                pass
        time.sleep(.3)
    return None

try:
    if key_exists(winreg.HKEY_CURRENT_USER, REGKEY) or key_exists(winreg.HKEY_CLASSES_ROOT, SCHEME):
        raise RuntimeError("FOREIGN_PROTOCOL_REGISTRATION: refusing takeover")
    if not POWER.is_file() or not HANDLER.is_file():
        raise RuntimeError("HANDLER_OR_SYSTEM_POWERSHELL_MISSING")
    if '"' in str(HANDLER) + str(MARKER) or "%1" in expected or "ExecutionPolicy" in expected:
        raise RuntimeError("COMMAND_CONTRACT_INVALID")
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGKEY) as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, "URL:KAR75 disposable Chrome CI handler")
        winreg.SetValueEx(k, "URL Protocol", 0, winreg.REG_SZ, "")
    registered = True
    with winreg.CreateKey(winreg.HKEY_CURRENT_USER, REGKEY + "\\shell\\open\\command") as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, expected)
    if owned_command() != expected:
        raise RuntimeError("REGISTRY_OWNER_MISMATCH")
    print("PASS KAR75 ISOLATED_HKCU_REGISTRATION", flush=True)

    EXT.mkdir(parents=True)
    (EXT / "manifest.json").write_text(json.dumps({
        "manifest_version": 3, "name": "KAR75 CI protocol test only", "version": "0.0.1",
        "background": {"service_worker": "worker.js"} }), encoding="utf-8")
    (EXT / "worker.js").write_text("chrome.runtime.onInstalled.addListener(() => {});\n", encoding="utf-8")
    (EXT / "test.html").write_text(
        '<!doctype html><html><head><title>KAR75 Test</title></head><body>'
        '<a id="launch" href="kar75poc://trigger">Activate external test handler</a></body></html>',
        encoding="utf-8")
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE), channel="chromium", headless=False,
            args=["--disable-extensions-except=" + str(EXT), "--load-extension=" + str(EXT)])
        try:
            worker = context.service_workers[0] if context.service_workers else context.wait_for_event("serviceworker", timeout=15000)
            extension_id = worker.url.split("/")[2]
            page = context.new_page()
            page.goto("chrome-extension://" + extension_id + "/test.html", wait_until="load")
            if not page.locator("#launch").is_visible():
                raise RuntimeError("MV3_TEST_LINK_MISSING")
            if MARKER.exists():
                raise RuntimeError("HANDLER_STARTED_WITHOUT_CLICK")
            page.locator("#launch").click(no_wait_after=True, timeout=10000)
            result["chrome_clicked"] = True
            print("PASS KAR75 MV3_REAL_POINTER_CLICK", flush=True)

            prompt = find_prompt()
            if prompt is None:
                result["reason"] = "NO_OBSERVABLE_NATIVE_PROMPT"
                raise RuntimeError(result["reason"])
            result["prompt_seen"] = True
            print("PASS KAR75 NATIVE_PROMPT_OBSERVED", flush=True)
            if MARKER.exists():
                raise RuntimeError("HANDLER_STARTED_BEFORE_CONSENT")
            prompt["cancel"].click_input()
            time.sleep(1)
            if MARKER.exists():
                raise RuntimeError("CANCEL_DID_NOT_PREVENT_LAUNCH")
            result["cancel_verified"] = True
            print("PASS KAR75 CANCEL_PREVENTS_HANDLER", flush=True)

            page.goto("chrome-extension://" + extension_id + "/test.html", wait_until="load")
            page.locator("#launch").click(no_wait_after=True, timeout=10000)
            prompt = find_prompt()
            if prompt is None:
                result["reason"] = "SECOND_NATIVE_PROMPT_NOT_OBSERVABLE"
                raise RuntimeError(result["reason"])
            if MARKER.exists():
                raise RuntimeError("SECOND_LAUNCH_WITHOUT_CONSENT")
            prompt["accept"].click_input()
            deadline = time.monotonic() + 15
            while not MARKER.exists() and time.monotonic() < deadline:
                time.sleep(.25)
            if not MARKER.exists() or MARKER.read_text(encoding="ascii") != "KAR75_USER_CONSENT_HANDLER":
                raise RuntimeError("APPROVED_CHROME_HANDLER_NOT_OBSERVED")
            result["allow_verified"] = True
            result["status"] = "CHROME_MV3_USER_CONSENT_HANDOFF_PASS"
            result["reason"] = "observed_prompt_cancel_accept_marker"
            print("PASS KAR75 CHROME_MV3_USER_CONSENT_HANDLER", flush=True)
        finally:
            context.close()
except Exception as e:
    if result["status"] != "CHROME_MV3_USER_CONSENT_HANDOFF_PASS":
        result["reason"] = type(e).__name__ + ": " + str(e)[:200]
    print("KAR75 OBSERVED_STATUS:", result["status"], result["reason"], flush=True)
finally:
    # Never delete anyone else's registration if command ownership has changed.
    try:
        if registered and key_exists(winreg.HKEY_CURRENT_USER, REGKEY):
            if owned_command() != expected:
                raise RuntimeError("REGISTRY_OWNERSHIP_LOST: refuse foreign-key cleanup")
            delete_tree(winreg.HKEY_CURRENT_USER, REGKEY)
        result["registry_clean"] = not key_exists(winreg.HKEY_CURRENT_USER, REGKEY)
        if MARKER.exists():
            MARKER.unlink()
        shutil.rmtree(WORK, ignore_errors=False)
        if result["registry_clean"]:
            print("PASS KAR75 HKCU_CLEANUP", flush=True)
    except Exception as e:
        result["registry_clean"] = False
        result["cleanup_error"] = type(e).__name__ + ": " + str(e)[:200]
    out_path.write_text(json.dumps(result, sort_keys=True, indent=2), encoding="utf-8")
    print("KAR75 RESULT:", json.dumps(result, sort_keys=True), flush=True)
if result["status"] != "CHROME_MV3_USER_CONSENT_HANDOFF_PASS" or not result["registry_clean"]:
    raise SystemExit(2)
