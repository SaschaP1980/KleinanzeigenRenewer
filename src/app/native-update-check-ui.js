// KAR-69: User-initiated read-only check. This component cannot install files.
(() => {
  'use strict';
  const button = document.getElementById('nativeUpdateCheckButton');
  const status = document.getElementById('nativeUpdateCheckStatus');
  const details = document.getElementById('nativeUpdateCheckEvidence');
  const fallbackStatus = document.getElementById('nativeUpdateFallbackStatus');
  const opener = document.getElementById('nativeUpdateOpenButton');
  const summary = document.getElementById('nativeUpdateSummaryStatus');
  const dialog = document.getElementById('nativeUpdateDialog');
  const closeButton = document.getElementById('nativeUpdateClose');
  const doneButton = document.getElementById('nativeUpdateDone');
  const guideButton = document.getElementById('nativeUpdateGuideToggle');
  const guide = document.getElementById('nativeUpdateGuide');
  const lastChecked = document.getElementById('nativeUpdateLastChecked');
  const activeVersionText = document.getElementById('nativeUpdateActiveVersion');
  const managedVersionText = document.getElementById('nativeUpdateManagedVersion');
  if (!button || !status || !details) return;
  let sequence = 0;
  let busy = false;
  let approvedChannelVerified = false;
  let nativeApproval = null;
  let channelSequence = 0;
  let channelAbort = null;
  const activeVersion = String(chrome.runtime.getManifest()?.version || 'unbekannt');
  if (activeVersionText) activeVersionText.textContent = 'v' + activeVersion;
  if (managedVersionText) managedVersionText.textContent = 'nicht verifiziert (Windows-Helfer nicht bestätigt)';
  if (summary) summary.textContent = 'Update-Status derzeit nicht verfügbar.';
  if (opener && dialog && typeof dialog.showModal === 'function') {
    opener.addEventListener('click', () => {
      if (!dialog.open) { dialog.showModal(); button.focus(); }
    });
    const close = () => { if (dialog.open) dialog.close(); };
    closeButton?.addEventListener('click', close);
    doneButton?.addEventListener('click', close);
    dialog.addEventListener('close', () => { opener.focus(); });
    guideButton?.addEventListener('click', () => {
      if (!guide) return;
      guide.hidden = !guide.hidden;
      guideButton.setAttribute?.('aria-expanded', String(!guide.hidden));
      guideButton.textContent = guide.hidden ? 'Updateanleitung anzeigen' : 'Updateanleitung ausblenden';
    });
  }
  function unknown() {
    if (approvedChannelVerified) return;
    if (nativeApproval) { renderApproval(nativeApproval); return; }
    if (summary) summary.textContent = 'Update-Status derzeit nicht verfügbar.';
    if (lastChecked) lastChecked.textContent = '';
  }
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
  // KAR-86: public GitHub REST API has documented cross-origin support.
  // This is awareness only: the Windows Updater independently verifies the immutable ZIP.
  const API = 'https://api.github.com/repos/SaschaP1980/KleinanzeigenRenewer';
  const COMMIT = /^[a-f0-9]{40}$/;
  const SHA256 = /^[a-f0-9]{64}$/;
  const VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;
  function approvedVersion(value) {
    return typeof value === 'string' && VERSION.test(value)
      && value.split('.').every(part => Number.isSafeInteger(Number(part)) && Number(part) <= 2147483647);
  }
  function renderApproval(approved) {
    if (!summary) return;
    if (!approvedVersion(activeVersion) || !approvedVersion(approved)) {
      summary.textContent = 'Update-Status derzeit nicht verfügbar.';
      return;
    }
    const difference = compareVersions(activeVersion, approved);
    summary.textContent = difference < 0 ? 'Neue Version v' + approved + ' verfügbar.'
      : difference > 0 ? 'Aktive Version ist neuer als die Freigabe.'
        : 'Es ist keine neue Version verfügbar.';
    if (lastChecked) lastChecked.textContent = 'Zuletzt erfolgreich geprüft: ' + new Date().toLocaleString('de-DE');
  }
  async function getPublicJson(url, signal) {
    const answer = await fetch(url, {
      method: 'GET', credentials: 'omit', mode: 'cors', redirect: 'error',
      cache: 'no-store', referrerPolicy: 'no-referrer', signal,
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!answer || !answer.ok || answer.redirected || (answer.url && answer.url !== url))
      throw new Error('UNVERIFIED_RESPONSE');
    const content = await answer.text();
    if (typeof content !== 'string' || content.length > 32000) throw new Error('OVERSIZE');
    return JSON.parse(content);
  }
  async function checkApprovedChannel() {
    if (typeof fetch !== 'function' || typeof AbortController !== 'function'
      || typeof TextDecoder !== 'function' || typeof atob !== 'function') return;
    const own = ++channelSequence;
    if (channelAbort) channelAbort.abort();
    const controller = new AbortController();
    channelAbort = controller;
    approvedChannelVerified = false;
    if (summary && !approvedChannelVerified) summary.textContent = 'Neue Version wird geprüft …';
    if (lastChecked) lastChecked.textContent = '';
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const refUrl = API + '/git/ref/heads/main';
      const ref = await getPublicJson(refUrl, controller.signal);
      const mainSha = ref?.object?.type === 'commit' ? ref.object.sha : null;
      if (typeof mainSha !== 'string' || !COMMIT.test(mainSha)) throw new Error('INVALID_MAIN_REF');
      const channelUrl = API + '/contents/release/windows-updater-channel.json?ref=' + mainSha;
      const item = await getPublicJson(channelUrl, controller.signal);
      if (!item || item.type !== 'file' || item.path !== 'release/windows-updater-channel.json'
        || item.encoding !== 'base64' || typeof item.content !== 'string'
        || !Number.isSafeInteger(item.size) || item.size < 20 || item.size > 8192
        || typeof item.sha !== 'string' || !COMMIT.test(item.sha))
        throw new Error('INVALID_CHANNEL_FILE');
      const encoded = item.content.replace(/\s/g, '');
      if (encoded.length > 16384 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encoded))
        throw new Error('INVALID_CHANNEL_BASE64');
      const decoded = atob(encoded);
      if (decoded.length !== item.size) throw new Error('CHANNEL_SIZE_MISMATCH');
      const bytes = Uint8Array.from(decoded, char => char.charCodeAt(0));
      const record = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      const keys = ['schema','version','commit','sha256','bytes','extensionId','channel','note'];
      if (!record || Array.isArray(record) || typeof record !== 'object'
        || Object.keys(record).length !== keys.length || !keys.every(key => Object.prototype.hasOwnProperty.call(record, key))
        || record.schema !== 1 || record.channel !== 'approved'
        || record.extensionId !== 'hafahjhhgiipdegfkgacchmnacgblnah'
        || !approvedVersion(record.version) || typeof record.commit !== 'string' || !COMMIT.test(record.commit)
        || typeof record.sha256 !== 'string' || !SHA256.test(record.sha256)
        || !Number.isSafeInteger(record.bytes) || record.bytes < 1 || record.bytes > 12000000
        || typeof record.note !== 'string' || record.note.length > 1024)
        throw new Error('INVALID_CHANNEL_APPROVAL');
      if (own !== channelSequence || controller.signal.aborted) return;
      approvedChannelVerified = true;
      renderApproval(record.version);
      if (status && status.textContent === 'Noch nicht geprüft.')
        status.textContent = 'Freigegebene Version online geprüft. Windows-Installation nicht verifiziert.';
    } catch {
      if (own !== channelSequence) return;
      approvedChannelVerified = false;
      unknown();
      if (status && status.textContent === 'Noch nicht geprüft.')
        status.textContent = 'Online-Freigabeprüfung nicht möglich. Der manuelle Windows-Updater bleibt unabhängig nutzbar.';
    } finally {
      clearTimeout(timeoutId);
      if (own === channelSequence) channelAbort = null;
    }
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
    if (summary) summary.textContent = 'Neue Version wird geprüft …';
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
        unknown();
        showFallback(answer?.error === 'UNSUPPORTED_PLATFORM' ? 'unsupported' : 'manual');
        return;
      }
      if (answer.operation !== 'check') {
        status.textContent = 'Unerwartete Statusantwort. Keine Dateien wurden verändert.';
        unknown();
        showFallback('manual');
        return;
      }
      const installed = answer.installed;
      const approved = answer.approved;
      if (managedVersionText) managedVersionText.textContent = installed === 'not installed' ? 'nicht installiert (NativeHost bestätigt)' : 'v' + installed + ' (NativeHost bestätigt)';
      nativeApproval = approved;
      const older = installed === 'not installed' || compareVersions(installed, approved) < 0;
      const newer = installed !== 'not installed' && compareVersions(installed, approved) > 0;
      status.textContent = older
        ? 'Eine neuere Version ist freigegeben. Installation nur mit dem eigenständigen Windows-Updater.'
        : newer ? 'Verwaltete Programmdateien sind neuer als die Freigabe.'
          : 'Verwaltete Programmdateien entsprechen der Freigabe.';
      details.textContent = 'Aktive Erweiterung: v' + activeVersion + ' · Verwaltete Dateien: ' + installed
        + ' · Freigegeben: ' + approved + ' · SHA-256: ' + answer.sha256 + ' · Commit: ' + answer.sourceCommit;
      if (!approvedChannelVerified) renderApproval(approved);
      showFallback('native');
    } catch (error) {
      if (sequence === own) {
        status.textContent = messages[error?.message]
          || 'Der Windows-Helfer ist nicht erreichbar. Keine Dateien wurden verändert.';
        unknown();
        showFallback(error?.message === 'UNSUPPORTED_PLATFORM' ? 'unsupported' : 'manual');
      }
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (sequence === own) { busy = false; button.disabled = false; }
    }
  }
  button.addEventListener('click', () => {
    if (busy) return;
    nativeApproval = null;
    if (typeof fetch === 'function' && typeof AbortController === 'function') void checkApprovedChannel();
    void run();
  });
  if (typeof fetch === 'function' && typeof AbortController === 'function'
    && typeof TextDecoder === 'function' && typeof atob === 'function') void checkApprovedChannel();
  window.addEventListener('pagehide', () => {
    sequence++; busy = false; channelSequence++;
    if (channelAbort) channelAbort.abort();
    channelAbort = null;
  });
})();
