// KAR-69: User-initiated read-only check. This component cannot install files.
(() => {
  'use strict';
  const button = document.getElementById('nativeUpdateCheckButton');
  const status = document.getElementById('nativeUpdateCheckStatus');
  const details = document.getElementById('nativeUpdateCheckEvidence');
  const fallbackStatus = document.getElementById('nativeUpdateFallbackStatus');
  if (!button || !status || !details) return;
  let sequence = 0;
  let busy = false;
  const activeVersion = String(chrome.runtime.getManifest()?.version || 'unbekannt');
  const messages = Object.freeze({
    UNSUPPORTED_PLATFORM: 'Nur unter Windows verfügbar.',
    HOST_UNAVAILABLE: 'Der Windows-Helfer ist nicht erreichbar. Die Ursache ist aus dieser Meldung nicht sicher bestimmbar.',
    TIMEOUT: 'Zeitüberschreitung bei der Windows-Updateprüfung.',
    BUSY: 'Eine Updateprüfung ist bereits aktiv.',
    NONCE_INVALID: 'Sichere Anfrage konnte nicht erstellt werden.',
    NONCE_REUSED: 'Wiederholte Anfrage aus Sicherheitsgründen abgewiesen.',
    INVALID_RESPONSE: 'Ungültige Antwort des Windows-Helfers.',
    CHECK_TIMEOUT: 'Die Freigabeprüfung hat zu lange gedauert.',
    CHECK_FAILED: 'Die Freigabeprüfung ist fehlgeschlagen.',
    UPDATER_NOT_INSTALLED: 'Der eigenständige Windows-Updater fehlt.',
    POWERSHELL_UNAVAILABLE: 'Windows PowerShell ist nicht verfügbar.',
    CHECK_RESPONSE_INVALID: 'Die Freigabedaten konnten nicht verifiziert werden.'
  });
  function compareVersions(left, right) {
    const a = left.split('.').map(Number);
    const b = right.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
    return 0;
  }
  function showFallback(kind) {
    if (!fallbackStatus) return;
    if (kind === 'unsupported') {
      fallbackStatus.textContent = 'Der separate One-Click-Updater funktioniert nur unter Windows. Keine Dateien wurden geändert.';
    } else if (kind === 'native') {
      fallbackStatus.textContent = 'NativeHost antwortet. Installation aus dem Manager ist noch nicht verfügbar. Alternativ die separate Windows-Verknüpfung auf dem Desktop verwenden.';
    } else {
      fallbackStatus.textContent = 'Der Windows-Helfer ist nicht nutzbar oder der Check ist fehlgeschlagen. Der separate One-Click-Updater funktioniert ohne NativeHost: Windows-Verknüpfung auf dem Desktop starten.';
    }
  }
  async function run() {
    if (busy) return;
    busy = true;
    const own = ++sequence;
    button.disabled = true;
    status.textContent = 'Windows-Updater wird geprüft …';
    details.textContent = '';
    let timeoutId;
    try {
      const answer = await Promise.race([
        new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'GET_NATIVE_UPDATE_STATUS' }, response => {
            if (chrome.runtime.lastError) return reject(new Error(String(chrome.runtime.lastError.message || 'HOST_UNAVAILABLE')));
            if (!response?.ok) return reject(new Error(String(response?.error || 'HOST_UNAVAILABLE')));
            resolve(response.result);
          });
        }),
        new Promise((_, reject) => { timeoutId = setTimeout(() => reject(new Error('TIMEOUT')), 10000); })
      ]);
      if (sequence !== own) return;
      if (!answer?.ok) {
        status.textContent = messages[answer?.error] || 'Updateprüfung fehlgeschlagen. Keine Dateien wurden verändert.';
        showFallback(answer?.error === 'UNSUPPORTED_PLATFORM' ? 'unsupported' : 'manual');
        return;
      }
      if (answer.operation !== 'check') {
        status.textContent = 'Unerwartete Statusantwort. Keine Dateien wurden verändert.';
        showFallback('manual');
        return;
      }
      const installed = answer.installed;
      const approved = answer.approved;
      const older = installed === 'not installed' || compareVersions(installed, approved) < 0;
      const newer = installed !== 'not installed' && compareVersions(installed, approved) > 0;
      status.textContent = older
        ? 'Eine neuere Version ist freigegeben. Installation nur mit dem eigenständigen Windows-Updater.'
        : newer ? 'Verwaltete Programmdateien sind neuer als die Freigabe.'
          : 'Verwaltete Programmdateien entsprechen der Freigabe.';
      details.textContent = 'Aktive Erweiterung: v' + activeVersion + ' · Verwaltete Dateien: ' + installed
        + ' · Freigegeben: ' + approved + ' · SHA-256: ' + answer.sha256 + ' · Commit: ' + answer.sourceCommit;
      showFallback('native');
    } catch (error) {
      if (sequence === own) {
        status.textContent = messages[error?.message]
          || 'Der Windows-Helfer ist nicht erreichbar. Keine Dateien wurden verändert.';
        showFallback(error?.message === 'UNSUPPORTED_PLATFORM' ? 'unsupported' : 'manual');
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (sequence === own) { busy = false; button.disabled = false; }
    }
  }
  button.addEventListener('click', () => { void run(); });
  window.addEventListener('pagehide', () => { sequence++; busy = false; });
})();
