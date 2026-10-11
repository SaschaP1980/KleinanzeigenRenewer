#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import platform
import re
import shutil
import tempfile
import time
import traceback
from dataclasses import dataclass
from pathlib import Path

try:
    from playwright.sync_api import sync_playwright, Error as PlaywrightError
except Exception as exc:
    raise SystemExit(
        "Browser-E2E benötigt Python Playwright. Installiere: "
        "python -m pip install -r tests/e2e/requirements.txt"
    ) from exc

ROOT = Path(__file__).resolve().parents[2]
EXTENSION_ROOT = Path(os.environ.get('KR_E2E_EXTENSION_ROOT') or ROOT).resolve()
APP_ID_TEXT = (EXTENSION_ROOT / "APP_ID.txt").read_text(encoding="utf-8")
APP_ID_MATCH = re.search(r"Chrome Extension ID:\s*([a-p]{32})", APP_ID_TEXT)
if not APP_ID_MATCH:
    raise SystemExit("APP_ID.txt enthält keine gültige feste Extension-ID.")
EXTENSION_ID = APP_ID_MATCH.group(1)
APP_URL = f"chrome-extension://{EXTENSION_ID}/app.html"
EXPECTED_VERSION = json.loads((EXTENSION_ROOT / "manifest.json").read_text(encoding="utf-8"))["version"]
FAKE_LOGGED_OUT_HTML = """<!doctype html><html lang='de'><head><meta charset='utf-8'><title>Kleinanzeigen E2E Fixture</title></head><body><a href='/m-einloggen.html'>Einloggen</a><main data-e2e-fixture='logged-out'>E2E</main></body></html>"""


class ScenarioFailure(AssertionError):
    pass


class InfrastructureFailure(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise ScenarioFailure(message)


def find_browser(explicit: str | None = None) -> str:
    if explicit:
        p = Path(explicit).expanduser()
        if p.exists():
            return str(p)
        found = shutil.which(explicit)
        if found:
            return found
        raise InfrastructureFailure(f"Browser nicht gefunden: {explicit}")
    env = os.environ.get("KR_CHROME_BINARY")
    if env:
        return find_browser(env)
    system = platform.system().lower()
    candidates = []
    if system == "windows":
        for base in [os.environ.get("PROGRAMFILES"), os.environ.get("PROGRAMFILES(X86)"), os.environ.get("LOCALAPPDATA")]:
            if base:
                candidates.append(Path(base) / "Google/Chrome/Application/chrome.exe")
                candidates.append(Path(base) / "Chromium/Application/chrome.exe")
    elif system == "darwin":
        candidates += [
            Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
            Path("/Applications/Chromium.app/Contents/MacOS/Chromium"),
        ]
    else:
        for name in ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]:
            found = shutil.which(name)
            if found:
                candidates.append(Path(found))
        candidates.append(Path("/usr/lib/chromium/chromium"))
    for candidate in candidates:
        if candidate and candidate.exists():
            return str(candidate)
    raise InfrastructureFailure("Kein Chrome/Chromium gefunden. Setze KR_CHROME_BINARY auf die Browserdatei.")


@dataclass
class Env:
    playwright: object
    context: object
    app: object
    browser_path: str
    profile_dir: tempfile.TemporaryDirectory

    def runtime(self, message: dict, expect_ok: bool = True):
        response = self.app.evaluate("m => chrome.runtime.sendMessage(m)", message)
        if not isinstance(response, dict):
            raise ScenarioFailure(f"Ungültige Runtime-Antwort für {message.get('type')}: {response!r}")
        if expect_ok and response.get("ok") is not True:
            raise ScenarioFailure(f"Runtime-Aufruf {message.get('type')} fehlgeschlagen: {response}")
        if not expect_ok and response.get("ok") is True:
            raise ScenarioFailure(f"Runtime-Aufruf {message.get('type')} hätte abgewiesen werden müssen: {response}")
        return response

    def close(self):
        try:
            self.context.close()
        finally:
            self.profile_dir.cleanup()


def launch_env(playwright, browser_path: str, headless: bool = True) -> Env:
    profile = tempfile.TemporaryDirectory(prefix="kr-e2e-", dir=os.environ.get("KR_E2E_PROFILE_PARENT") or None)
    args = [f"--disable-extensions-except={EXTENSION_ROOT}", f"--load-extension={EXTENSION_ROOT}"]
    if hasattr(os, "geteuid") and os.geteuid() == 0:
        args.append("--no-sandbox")
    context = playwright.chromium.launch_persistent_context(
        profile.name,
        headless=headless,
        executable_path=browser_path,
        ignore_default_args=["--disable-extensions"],
        args=args,
        viewport={"width": 1280, "height": 900},
        timeout=25000,
    )
    context.route("https://www.kleinanzeigen.de/**", lambda route: route.fulfill(status=200, content_type="text/html", body=FAKE_LOGGED_OUT_HTML))
    context.route("https://kleinanzeigen.de/**", lambda route: route.fulfill(status=200, content_type="text/html", body=FAKE_LOGGED_OUT_HTML))
    app = context.new_page()
    try:
        app.goto(APP_URL, wait_until="domcontentloaded", timeout=12000)
    except PlaywrightError as exc:
        context.close(); profile.cleanup()
        text = str(exc)
        if "ERR_BLOCKED_BY_CLIENT" in text:
            raise InfrastructureFailure(
                "Die Extension wurde von Chrome blockiert. Prüfe chrome://policy, insbesondere ExtensionInstallBlocklist/ExtensionSettings."
            ) from exc
        raise
    app.locator(".app-shell").wait_for(state="visible", timeout=10000)
    deadline = time.time() + 10
    last_background_error = None
    background_epoch = None
    workers = []
    while time.time() < deadline:
        try:
            response = app.evaluate(
                """async () => {
                    try { return await chrome.runtime.sendMessage({ type: 'GET_BACKGROUND_EPOCH' }); }
                    catch (error) { return { __e2eError: String(error?.message || error) }; }
                }"""
            )
            workers = [w for w in context.service_workers if EXTENSION_ID in w.url]
            if isinstance(response, dict) and response.get("ok") is True:
                result = response.get("result") or {}
                epoch = result.get("epoch")
                if isinstance(epoch, str) and len(epoch) >= 20 and workers:
                    background_epoch = epoch
                    break
                last_background_error = f"Background antwortete, aber Worker/Epoch noch nicht stabil: epoch={epoch!r}, workers={len(workers)}"
            elif isinstance(response, dict) and response.get("__e2eError"):
                last_background_error = response.get("__e2eError")
            else:
                last_background_error = f"Ungültige Background-Startantwort: {response!r}"
        except Exception as exc:
            last_background_error = str(exc)
        time.sleep(0.1)
    if background_epoch is None:
        context.close(); profile.cleanup()
        raise InfrastructureFailure(
            "MV3-Service-Worker/Background wurde nicht stabil bereit. "
            f"Letzter Background-Fehler: {last_background_error or 'keine Runtime-Antwort'}"
        )
    return Env(playwright, context, app, browser_path, profile)


def scenario_boot_mv3(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        version = env.app.evaluate("() => chrome.runtime.getManifest().version")
        require(version == EXPECTED_VERSION, f"Manifest-Version im Browser ist {version}, erwartet {EXPECTED_VERSION}")
        require(env.app.title() == "kleinanzeigen Manager", "App-Titel stimmt nicht")
        workers = [w.url for w in env.context.service_workers if EXTENSION_ID in w.url]
        require(any(url.endswith("/background.js") for url in workers), f"background.js-Service-Worker fehlt: {workers}")
        epoch = env.runtime({"type": "GET_BACKGROUND_EPOCH"})["result"].get("epoch")
        require(isinstance(epoch, str) and len(epoch) >= 20, "Background-Epoch fehlt")
        return {"version": version, "serviceWorker": workers[0], "epoch": epoch}
    finally:
        env.close()


def scenario_service_worker_restart(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        epoch1 = env.runtime({"type": "GET_BACKGROUND_EPOCH"})["result"]["epoch"]
        cdp = env.context.browser.new_browser_cdp_session()
        targets = cdp.send("Target.getTargets")["targetInfos"]
        workers = [t for t in targets if t.get("type") == "service_worker" and EXTENSION_ID in t.get("url", "")]
        require(workers, "Kein MV3-Service-Worker-Target zum Neustart gefunden")
        result = cdp.send("Target.closeTarget", {"targetId": workers[0]["targetId"]})
        require(result.get("success") is True, "Service-Worker-Target konnte nicht beendet werden")
        response = None
        deadline = time.time() + 5
        while time.time() < deadline:
            try:
                response = env.runtime({"type": "GET_BACKGROUND_EPOCH"})
                break
            except Exception:
                time.sleep(0.1)
        require(response is not None, "Background kam nach Service-Worker-Neustart nicht zurück")
        epoch2 = response["result"]["epoch"]
        require(epoch2 != epoch1, "Background-Epoch änderte sich nach echtem MV3-Service-Worker-Neustart nicht")
        require(env.app.locator("#actionsAccordion").count() == 1, "App ist nach Background-Neustart nicht mehr intakt")
        return {"epochBefore": epoch1, "epochAfter": epoch2}
    finally:
        env.close()


def scenario_bulk_runtime_lease_recovery(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        run_id = "e2e-orphaned-bulk-run"
        now_iso = env.app.evaluate("() => new Date().toISOString()")
        env.app.evaluate(
            """async ({runId, nowIso}) => {
                await chrome.storage.local.set({ bulkInventoryRun: {
                    runId, status: 'running', stage: 'worker-open',
                    sourceTabId: null, workerTabId: null, metadataTabId: null,
                    autoCreatedSourceTab: false, currentItemStartedAt: nowIso,
                    lastProgressAt: nowIso, updatedAt: nowIso, issues: []
                }});
                await chrome.storage.session.remove(['bulkRunRuntimeLeaseV1', 'runtimeEpochV1']);
            }""",
            {"runId": run_id, "nowIso": now_iso},
        )
        epoch_before = env.runtime({"type": "GET_BACKGROUND_EPOCH"})["result"]["epoch"]
        cdp = env.context.browser.new_browser_cdp_session()
        targets = cdp.send("Target.getTargets")["targetInfos"]
        workers = [t for t in targets if t.get("type") == "service_worker" and EXTENSION_ID in t.get("url", "")]
        require(workers, "Kein MV3-Service-Worker-Target für Bulk-Recovery gefunden")
        result = cdp.send("Target.closeTarget", {"targetId": workers[0]["targetId"]})
        require(result.get("success") is True, "Service-Worker für Bulk-Recovery konnte nicht beendet werden")

        epoch_after = None
        last_restart_error = None
        restart_deadline = time.time() + 10
        while time.time() < restart_deadline:
            try:
                restart_response = env.runtime({"type": "GET_BACKGROUND_EPOCH"})
                epoch_after = restart_response["result"]["epoch"]
                if epoch_after != epoch_before:
                    break
            except Exception as exc:
                last_restart_error = repr(exc)
            time.sleep(0.1)
        require(
            epoch_after is not None and epoch_after != epoch_before,
            f"Background kam nach Bulk-Service-Worker-Neustart nicht zurück: before={epoch_before!r}, after={epoch_after!r}, lastError={last_restart_error!r}",
        )

        recovered = None
        last_status_error = None
        deadline = time.time() + 10
        while time.time() < deadline:
            try:
                response = env.runtime({"type": "GET_BULK_RUN_STATUS"})
                recovered = response.get("result")
                if recovered and recovered.get("runId") == run_id and recovered.get("status") == "needs-review":
                    break
            except Exception as exc:
                last_status_error = repr(exc)
            time.sleep(0.15)
        require(
            isinstance(recovered, dict),
            f"Bulk-Recovery lieferte keinen Zustand: {recovered!r}; lastRuntimeError={last_status_error!r}",
        )
        require(recovered.get("runId") == run_id, f"Falsche Run-ID nach Recovery: {recovered}")
        require(recovered.get("status") == "needs-review", f"Orphaned Bulk-Run blieb aktiv: {recovered}")
        require(recovered.get("stage") == "runtime-session-lost", f"Falsche Recovery-Stage: {recovered}")
        lease = env.app.evaluate("() => chrome.storage.session.get('bulkRunRuntimeLeaseV1')")
        require(not lease.get("bulkRunRuntimeLeaseV1"), f"Terminaler Run behielt Runtime-Lease: {lease}")
        return {
            "runId": run_id,
            "status": recovered.get("status"),
            "stage": recovered.get("stage"),
            "epochBefore": epoch_before,
            "epochAfter": epoch_after,
        }
    finally:
        env.close()

def scenario_accordion_rapid_toggle(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        state = env.app.evaluate("""async () => {
          const details = document.querySelector('#actionsAccordion');
          const summary = details.querySelector(':scope > .control-accordion-summary, :scope > summary');
          for (let i = 0; i < 12; i += 1) {
            summary.click();
            await new Promise(r => setTimeout(r, 18));
          }
          await new Promise(r => setTimeout(r, 1250));
          const panel = details.querySelector(':scope > .control-accordion-panel');
          const rect = summary.getBoundingClientRect();
          const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          const actionHitTests = ['fullInventoryButton','inventoryButton','archiveInsertButton','massRenewalButton'].map(id => {
            const button = document.getElementById(id);
            const wasDisabled = button.disabled;
            button.disabled = false;
            const buttonRect = button.getBoundingClientRect();
            const target = document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
            button.disabled = wasDisabled;
            return { id, rect: {left:buttonRect.left,top:buttonRect.top,right:buttonRect.right,bottom:buttonRect.bottom,width:buttonRect.width,height:buttonRect.height}, hitTag: target?.tagName || null, hitId: target?.id || null, insideButton: Boolean(target && (target === button || button.contains(target))) };
          });
          return {
            open: details.dataset.accordionMode === 'controlled' ? details.dataset.open === 'true' : details.open,
            controlled: details.dataset.accordionMode === 'controlled',
            animating: details.classList.contains('is-animating'),
            height: panel.style.height,
            opacity: panel.style.opacity,
            summaryPointerEvents: getComputedStyle(summary).pointerEvents,
            runningAnimations: panel.getAnimations().filter(a => a.playState === 'running').length,
            hitInsideSummary: Boolean(hit && (hit === summary || summary.contains(hit))),
            panelHidden: panel.hidden, viewport: {width: innerWidth, height: innerHeight}, actionHitTests
          };
        }""")
        require(state["open"] is True, f"Accordion-Zielzustand nach 12 Rapid-Clicks falsch: {state}")
        require(state["controlled"] is True, f"Actions-Accordion verwendet noch nativen details-State: {state}")
        require(all(item["insideButton"] for item in state["actionHitTests"]), f"Actions-Buttons fehlen im realen Hit-Test: {state}")
        require(state["animating"] is False, f"Accordion blieb in is-animating hängen: {state}")
        require(state["height"] == "" and state["opacity"] == "", f"Accordion-Inline-Styles wurden nicht bereinigt: {state}")
        require(state["summaryPointerEvents"] != "none", f"Accordion-Summary blockiert Pointer: {state}")
        require(state["runningAnimations"] == 0, f"Accordion hat nach Ablauf noch laufende Animationen: {state}")
        require(state["hitInsideSummary"], f"Hit-Test trifft Accordion-Summary nicht: {state}")

        focus_probe = env.app.evaluate("""() => {
          const mouseButton = document.getElementById('archiveInsertButton');
          const keyboardButton = document.getElementById('massRenewalButton');
          const mouseWasDisabled = mouseButton.disabled;
          const keyboardWasDisabled = keyboardButton.disabled;
          mouseButton.disabled = false;
          keyboardButton.disabled = false;
          mouseButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopImmediatePropagation();
          }, {capture:true, once:true});
          const rect = mouseButton.getBoundingClientRect();
          return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            mouseWasDisabled,
            keyboardWasDisabled
          };
        }""")
        env.app.mouse.click(focus_probe["x"], focus_probe["y"])
        mouse_focus = env.app.evaluate("""() => {
          const button = document.getElementById('archiveInsertButton');
          const style = getComputedStyle(button);
          return {
            activeId: document.activeElement?.id || null,
            focusVisible: button.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            focusModality: document.querySelector('.primary-actions')?.dataset?.focusModality || null
          };
        }""")
        require(mouse_focus["activeId"] == "archiveInsertButton", f"Pointer-Klick fokussierte den Action-Button nicht: {mouse_focus}")
        require(mouse_focus["focusModality"] == "pointer", f"Pointer-Klick setzt die Actions-Modality nicht auf pointer: {mouse_focus}")
        require(mouse_focus["outlineStyle"] == "none" or mouse_focus["outlineWidth"] == "0px", f"Pointer-Fokus zeigt weiterhin einen Outline: {mouse_focus}")

        focus_return = env.app.evaluate("""() => {
          const button = document.getElementById('archiveInsertButton');
          const temporaryTarget = document.getElementById('actionsAccordionToggle');
          temporaryTarget?.focus();
          button.focus();
          const style = getComputedStyle(button);
          return {
            activeId: document.activeElement?.id || null,
            focusVisible: button.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            pointerModalityAfterReturn: document.querySelector('.primary-actions')?.dataset?.focusModality || null
          };
        }""")
        require(focus_return["activeId"] == "archiveInsertButton", f"Simulierte Fokus-Rückgabe erreichte den Action-Button nicht: {focus_return}")
        require(focus_return["pointerModalityAfterReturn"] == "pointer", f"Pointer-Modality ging bei Fokus-Rückgabe verloren: {focus_return}")
        require(focus_return["outlineStyle"] == "none" or focus_return["outlineWidth"] == "0px", f"Pointer-Fokus zeigt nach Fokus-Rückgabe erneut einen Outline: {focus_return}")

        env.app.keyboard.press("Tab")
        keyboard_focus = env.app.evaluate("""() => {
          const button = document.getElementById('massRenewalButton');
          const style = getComputedStyle(button);
          return {
            activeId: document.activeElement?.id || null,
            focusVisible: button.matches(':focus-visible'),
            outlineStyle: style.outlineStyle,
            outlineWidth: style.outlineWidth,
            outlineColor: style.outlineColor,
            keyboardModality: document.querySelector('.primary-actions')?.dataset?.focusModality || null
          };
        }""")
        require(keyboard_focus["activeId"] == "massRenewalButton", f"Tab-Tastaturfokus erreichte den nächsten Action-Button nicht: {keyboard_focus}")
        require(keyboard_focus["keyboardModality"] == "keyboard", f"Tab setzt die Actions-Modality nicht auf keyboard: {keyboard_focus}")
        require(keyboard_focus["focusVisible"] is True, f"Tastaturfokus ist nicht als focus-visible erkennbar: {keyboard_focus}")
        require(keyboard_focus["outlineStyle"] == "solid" and keyboard_focus["outlineWidth"] == "2px", f"Tastaturfokus hat keinen expliziten sichtbaren Outline: {keyboard_focus}")
        require(keyboard_focus["outlineColor"] in ["rgb(77, 224, 183)", "rgba(77, 224, 183, 1)"], f"Tastaturfokus verwendet nicht den vorgesehenen Mint-Farbton: {keyboard_focus}")
        env.app.evaluate("""state => {
          const mouseButton = document.getElementById('archiveInsertButton');
          const keyboardButton = document.getElementById('massRenewalButton');
          mouseButton.disabled = state.mouseWasDisabled;
          keyboardButton.disabled = state.keyboardWasDisabled;
          keyboardButton.blur();
        }""", focus_probe)
        state["pointerFocus"] = mouse_focus
        state["focusReturn"] = focus_return
        state["keyboardFocus"] = keyboard_focus
        return state
    finally:
        env.close()


def scenario_app_reopen_persistence(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        env.app.locator("#globalViewCompact").click()
        env.app.wait_for_function("() => document.querySelector('#globalViewCompact')?.getAttribute('aria-pressed') === 'true'")
        env.app.evaluate("""() => {
          const input = document.querySelector('#renewalRetryRange');
          input.value = '4';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }""")
        env.app.wait_for_function("() => document.querySelector('#renewalRetryRange')?.value === '4'")
        env.app.wait_for_timeout(250)
        stored = env.app.evaluate("() => chrome.storage.local.get(['globalListViewModeV1','renewalPhaseAttemptsV1'])")
        require(stored.get("globalListViewModeV1") == "compact", f"Listenansicht nicht persistiert: {stored}")
        require(stored.get("renewalPhaseAttemptsV1") == 4, f"Retry-Konfiguration nicht persistiert: {stored}")
        env.app.close()
        env.app = env.context.new_page()
        env.app.goto(APP_URL, wait_until="domcontentloaded")
        env.app.locator(".app-shell").wait_for(state="visible")
        env.app.wait_for_function("() => document.querySelector('#globalViewCompact')?.getAttribute('aria-pressed') === 'true'")
        require(env.app.locator("#renewalRetryRange").input_value() == "4", "Retry-Konfiguration ging nach App-Schließen/-Öffnen verloren")
        return stored
    finally:
        env.close()


def scenario_profile_switch_lock(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        alpha = env.runtime({"type": "RECOGNIZE_PROFILE", "profileName": "E2E Alpha"})["result"]["profile"]
        beta = env.runtime({"type": "RECOGNIZE_PROFILE", "profileName": "E2E Beta"})["result"]["profile"]
        require(alpha["profileId"] != beta["profileId"], "Testprofile erhielten dieselbe ID")
        env.runtime({"type": "SET_SELECTED_PROFILE", "profileId": alpha["profileId"]})
        state = env.runtime({"type": "GET_PROFILE_STATE"})["result"]
        require(state["selectedProfileId"] == alpha["profileId"], f"Inventarprofil wurde nicht umgeschaltet: {state}")
        require(state["detectedProfileId"] == beta["profileId"], f"Erwarteter abweichender Live-/Detected-Kontext fehlt: {state}")
        env.app.reload(wait_until="domcontentloaded")
        env.app.locator(".app-shell").wait_for(state="visible")
        env.app.wait_for_timeout(800)
        require(env.app.locator("#profileSelect").input_value() == alpha["profileId"], "Ausgewähltes Inventarprofil wurde in UI nicht beibehalten")
        disabled = env.app.evaluate("() => [...document.querySelectorAll('.primary-actions button')].every(b => b.disabled)")
        require(disabled, "Aktionen wurden trotz nicht bestätigtem/abweichendem Live-Konto freigegeben")
        return {"selected": alpha["profileId"], "detected": beta["profileId"], "actionsLocked": disabled}
    finally:
        env.close()


def scenario_worker_tab_unexpected_close(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    closed = []
    try:
        env.app.wait_for_timeout(700)
        def close_new_page(page):
            if page is env.app:
                return
            try:
                page.close()
                closed.append(True)
            except Exception:
                pass
        env.context.on("page", close_new_page)
        env.app.evaluate("() => { window.__krProbePromise = chrome.runtime.sendMessage({type:'PROBE_LIVE_KLEINANZEIGEN_ACCOUNT'}); }")
        response = env.app.evaluate("async () => await window.__krProbePromise")
        require(response.get("ok") is True, f"Account-Probe transportseitig fehlgeschlagen: {response}")
        result = response["result"]
        require(result.get("confirmed") is False and result.get("transient") is True, f"Unerwartet geschlossener Worker wurde nicht defensiv behandelt: {result}")
        registry = env.runtime({"type": "GET_TAB_REGISTRY_SNAPSHOT"})["result"]
        gone = [entry for entry in registry if entry.get("kind") == "account-probe" and entry.get("lifecycleState") == "gone"]
        require(closed, "Es wurde kein echter Account-Probe-Worker-Tab beobachtet/geschlossen")
        require(gone, f"Geschlossener Worker wurde im Tab-Registry nicht als gone erfasst: {registry}")
        return {"closedWorkerTabs": len(closed), "goneRegistryEntries": len(gone), "probeReason": result.get("reason")}
    finally:
        env.close()


def seed_inventory(env: Env, inventory_count=16, trash_count=16):
    total = inventory_count + trash_count
    for i in range(total):
        ad_id = str(990000000 + i)
        payload = {
            "adId": ad_id,
            "title": f"E2E Testanzeige {i + 1:02d} mit ausreichend langem Titel",
            "description": "E2E Browser-Testdatensatz. " * 3,
            "price": 10 + i,
            "images": [],
            "url": f"https://www.kleinanzeigen.de/s-anzeige/e2e/{ad_id}",
        }
        env.runtime({"type": "SAVE_INVENTORY", "payload": payload})
        if i >= inventory_count:
            env.runtime({"type": "DELETE_INVENTORY", "inventoryId": ad_id})


def scenario_bottom_clamp_four_views(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        seed_inventory(env)
        env.app.reload(wait_until="domcontentloaded")
        env.app.locator(".app-shell").wait_for(state="visible")
        env.app.wait_for_function("() => document.querySelector('#inventoryHeaderCount')?.textContent?.trim() === '16'")
        env.app.wait_for_function("() => document.querySelector('#trashHeaderCount')?.textContent?.trim() === '16'")
        combos = [
            ("inventory-detailed", "#inventoryViewButton", "#globalViewDetailed"),
            ("inventory-compact", "#inventoryViewButton", "#globalViewCompact"),
            ("trash-detailed", "#trashViewButton", "#globalViewDetailed"),
            ("trash-compact", "#trashViewButton", "#globalViewCompact"),
        ]
        measurements = {}
        for name, view_sel, mode_sel in combos:
            env.app.locator(view_sel).click()
            env.app.locator(mode_sel).click()
            env.app.wait_for_timeout(180)
            env.app.evaluate("window.scrollTo(0,0)")
            env.app.wait_for_timeout(80)
            top_before = env.app.locator(".control-panel").bounding_box()["y"]
            env.app.evaluate("window.scrollTo(0, document.documentElement.scrollHeight)")
            env.app.wait_for_timeout(180)
            data = env.app.evaluate("""() => ({
              scrollY: window.scrollY,
              innerHeight: window.innerHeight,
              scrollHeight: document.documentElement.scrollHeight,
              panel: (() => { const r=document.querySelector('.control-panel').getBoundingClientRect(); return {top:r.top,bottom:r.bottom}; })()
            })""")
            require(data["scrollY"] > 0, f"{name}: Seite ist nicht scrollbar")
            require(abs((data["scrollY"] + data["innerHeight"]) - data["scrollHeight"]) <= 2.5, f"{name}: nicht exakt am Seitenende: {data}")
            require(abs(data["panel"]["top"] - top_before) <= 1.5, f"{name}: linker Inventarprofilbereich springt am Seitenende: top {top_before} -> {data['panel']['top']}")
            measurements[name] = {"topBefore": top_before, "topAtBottom": data["panel"]["top"], "scrollY": data["scrollY"], "scrollHeight": data["scrollHeight"]}
        return measurements
    finally:
        env.close()


def scenario_remote_safety_negative(pw, browser_path, headless):
    env = launch_env(pw, browser_path, headless)
    try:
        profile = env.runtime({"type": "RECOGNIZE_PROFILE", "profileName": "E2E Safety"})["result"]["profile"]
        env.runtime({"type": "SET_SELECTED_PROFILE", "profileId": profile["profileId"]})
        record_id = "9988776655"
        env.runtime({"type": "SAVE_INVENTORY", "payload": {
            "adId": record_id,
            "inventoryId": record_id,
            "title": "E2E Safety Record",
            "description": "Safety negative test",
            "price": 42,
            "images": [],
            "profileId": profile["profileId"],
            "profileName": profile["displayName"],
            "url": f"https://www.kleinanzeigen.de/s-anzeige/e2e/{record_id}",
        }})
        before_sessions = env.app.evaluate("() => chrome.storage.local.get(['renewalSessionsV1','templateFillSessionsV1'])")
        start_response = env.runtime({"type": "START_TEMPLATE_FILL", "inventoryId": record_id, "autoReplacementAllowed": True, "startConfirmationVersion": 1}, expect_ok=False)
        finish_response = env.runtime({"type": "FINISH_RENEWAL_REPLACEMENT", "renewalId": "e2e-missing-renewal"}, expect_ok=False)
        after_sessions = env.app.evaluate("() => chrome.storage.local.get(['renewalSessionsV1','templateFillSessionsV1'])")
        target_urls = [p.url for p in env.context.pages if p.url.startswith("https://www.kleinanzeigen.de/")]
        dangerous = [u for u in target_urls if "p-anzeige-aufgeben" in u or "/s-anzeige/" in u]
        require(not dangerous, f"Safety-Negativfall öffnete unerwartet einen mutierenden Zieltab: {dangerous}")
        require(after_sessions.get("renewalSessionsV1") == before_sessions.get("renewalSessionsV1"), "Abgewiesener Start erzeugte trotzdem Renewal-State")
        require(after_sessions.get("templateFillSessionsV1") == before_sessions.get("templateFillSessionsV1"), "Abgewiesener Start erzeugte trotzdem Fill-State")
        return {"startRejected": start_response.get("ok") is False, "finishRejected": finish_response.get("ok") is False, "dangerousTabs": dangerous}
    finally:
        env.close()


def write_report_checkpoint(report_path, results, browser_path, headless, started):
    if not report_path:
        return
    report = {
        "schema": 1,
        "extensionVersion": EXPECTED_VERSION,
        "extensionId": EXTENSION_ID,
        "browserPath": browser_path,
        "headless": headless,
        "scenarioCount": len(results),
        "passed": sum(1 for r in results if r["status"] == "PASS"),
        "failed": sum(1 for r in results if r["status"] == "FAIL"),
        "elapsedSeconds": round(time.time() - started, 3),
        "results": results,
        "checkpoint": True,
    }
    path = Path(report_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


SCENARIOS = [
    ("boot-mv3", scenario_boot_mv3),
    ("service-worker-restart", scenario_service_worker_restart),
    ("bulk-runtime-lease-recovery", scenario_bulk_runtime_lease_recovery),
    ("accordion-rapid-toggle", scenario_accordion_rapid_toggle),
    ("app-close-reopen-persistence", scenario_app_reopen_persistence),
    ("profile-switch-action-lock", scenario_profile_switch_lock),
    ("worker-tab-unexpected-close", scenario_worker_tab_unexpected_close),
    ("bottom-clamp-four-views", scenario_bottom_clamp_four_views),
    ("remote-safety-negative", scenario_remote_safety_negative),
]


def main():
    parser = argparse.ArgumentParser(description="Echte Chrome/MV3-E2E-Tests für kleinanzeigen Manager")
    parser.add_argument("--browser", help="Pfad/Name von Chrome oder Chromium (alternativ KR_CHROME_BINARY)")
    parser.add_argument("--headed", action="store_true", help="Browser sichtbar starten")
    parser.add_argument("--scenario", action="append", help="Nur ausgewählte Szenarien ausführen (mehrfach möglich)")
    parser.add_argument("--report", help="JSON-Report schreiben")
    args = parser.parse_args()
    browser_path = find_browser(args.browser)
    selected = set(args.scenario or [])
    unknown = selected - {name for name, _ in SCENARIOS}
    if unknown:
        raise SystemExit(f"Unbekannte Szenarien: {', '.join(sorted(unknown))}")
    results = []
    started = time.time()
    with sync_playwright() as pw:
        for name, fn in SCENARIOS:
            if selected and name not in selected:
                continue
            t0 = time.time()
            try:
                details = fn(pw, browser_path, not args.headed)
                elapsed = round(time.time() - t0, 3)
                results.append({"name": name, "status": "PASS", "elapsedSeconds": elapsed, "details": details})
                write_report_checkpoint(args.report, results, browser_path, not args.headed, started)
                print(f"PASS {name} ({elapsed:.3f}s)", flush=True)
            except InfrastructureFailure:
                raise
            except Exception as exc:
                elapsed = round(time.time() - t0, 3)
                results.append({"name": name, "status": "FAIL", "elapsedSeconds": elapsed, "error": str(exc), "traceback": traceback.format_exc()})
                write_report_checkpoint(args.report, results, browser_path, not args.headed, started)
                print(f"FAIL {name}: {exc}", flush=True)
    report = {
        "schema": 1,
        "extensionVersion": EXPECTED_VERSION,
        "extensionId": EXTENSION_ID,
        "browserPath": browser_path,
        "headless": not args.headed,
        "scenarioCount": len(results),
        "passed": sum(1 for r in results if r["status"] == "PASS"),
        "failed": sum(1 for r in results if r["status"] == "FAIL"),
        "elapsedSeconds": round(time.time() - started, 3),
        "results": results,
    }
    if args.report:
        path = Path(args.report)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: report[k] for k in ["extensionVersion", "scenarioCount", "passed", "failed", "elapsedSeconds"]}, ensure_ascii=False))
    if report["failed"]:
        raise SystemExit(1)


if __name__ == "__main__":
    try:
        main()
    except InfrastructureFailure as exc:
        print(f"E2E INFRASTRUCTURE ERROR: {exc}", flush=True)
        raise SystemExit(2)
