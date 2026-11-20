/*
 * Kleinanzeigen Manager v1.25.12 – lokale Workflow-Sperren freigeben.
 * Nur in den DevTools der Manager-Seite src/app/app.html ausführen.
 *
 * ACHTUNG: Notfallwerkzeug. Setzt lokale Workflow-Sitzungen auf "cancelled"/
 * "needs-review" und entfernt dadurch die darauf basierende Inserierungssperre.
 * Berührt NICHT: Inventar, Papierkorb, Bilder, Konto-/Profilzuordnung,
 * Phase-4-Intent-Journale, Publish-Intent-Journale, P8-Sicherheitsjournale,
 * Update-Fences oder echte Browser-Web-Locks.
 *
 * Ein bereits veröffentlichter neuer Artikel oder noch aktiver Löschvorgang
 * wird dadurch NICHT auf Kleinanzeigen zurückgenommen/abgeschlossen.
 * Vor neuer Inserierung unbedingt unter "Meine Anzeigen" prüfen.
 */
(async () => {
  'use strict';

  const SUPPORTED_VERSION = '1.25.12';
  const KEYS = Object.freeze([
    'renewalSessionsV1',
    'templateFillSessions',
    'archiveInsertionSessionsV1',
    'massRenewalBatchV1',
    'bulkInventoryRun'
  ]);
  const stamp = new Date().toISOString();
  const log = (...args) => console.log('[KAR-RECOVERY]', ...args);
  const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
  const terminal = value => ['cancelled', 'replaced', 'complete'].includes(String(value || ''));
  const clone = value => structuredClone(value);

  try {
    if (location.protocol !== 'chrome-extension:' ||
        !location.pathname.endsWith('/src/app/app.html') ||
        !chrome?.runtime?.id || !chrome?.storage?.local?.get || !chrome?.storage?.local?.set) {
      throw new Error('Nur innerhalb der geöffneten Kleinanzeigen-Manager-Oberfläche ausführen.');
    }
    const installedVersion = chrome.runtime.getManifest().version;
    if (installedVersion !== SUPPORTED_VERSION) {
      throw new Error(`Abbruch: installiert ist ${installedVersion}, geprüft wurde ausschließlich ${SUPPORTED_VERSION}.`);
    }

    if (!confirm(
      'NOTFALL-FREIGABE (nur lokaler Zustand)\n\n' +
      'Bitte vorher alle Kleinanzeigen-Formulare und laufenden Automatisierungen beenden. ' +
      'Bei einer ungewissen Veröffentlichung/Löschung können sonst doppelte Anzeigen entstehen.\n\n' +
      'Die alten Sitzungen bleiben als abgebrochene Nachweise erhalten; ' +
      'Sicherheitsjournale werden NICHT entfernt.\n\nWeiter zur lokalen Sicherung?'
    )) { log('Ohne Änderungen abgebrochen.'); return; }

    const original = await chrome.storage.local.get(KEYS);
    const backup = {
      tool: 'kleinanzeigen-manager-local-unlock',
      appVersion: installedVersion,
      timestamp: stamp,
      extensionId: chrome.runtime.id,
      note: 'PRIVAT: kann Anzeigen- und Kontodaten enthalten. Nicht öffentlich hochladen.',
      storageKeys: original
    };
    const filename = `kleinanzeigen-manager-sperren-backup-${stamp.replace(/[:.]/g, '-')}.json`;
    const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    log(`Sicherung zum Download angestoßen: ${filename} (${blob.size} Bytes).`);

    if (!confirm(
      `Prüfe jetzt deinen Downloadordner.\n\nIst die Datei ${filename} dort tatsächlich vorhanden?\n\n` +
      'Sie enthält private Informationen. Bewahre sie sicher auf.\n\n' +
      'Mit OK werden die lokalen Workflow-Status zwangsweise beendet, ' +
      'NICHT jedoch die Sicherheitsjournale oder echte Web Locks.'
    )) { log('Keine lokale Zustandsänderung durchgeführt.'); return; }

    // Vor dem Schreiben erneut lesen, um den jüngsten Persistenzstand zu verwenden.
    const data = await chrome.storage.local.get(KEYS);
    const patch = {};
    const report = { renewals:0, fills:0, archives:0, massBatch:0, bulk:0 };
    const reason = 'Manuelle lokale Notfall-Freigabe per Recovery-Skript; Remote-Ergebnis separat prüfen.';
    const uncertain = s => Boolean(
      s?.publishClickedAt || s?.newIdConfirmedAt || s?.newAdId ||
      s?.sourceDeletedAt || s?.sourceDeleteAction ||
      String(s?.stage || '').startsWith('source-delete') ||
      ['submitted','new-id-confirmed','reinventorizing','verifying','verified'].includes(String(s?.status || ''))
    );
    function cancel(s, isRemoteUncertain) {
      const next = { ...s, status:'cancelled',
        stage: isRemoteUncertain ? 'emergency-reset-unverified' : 'manual-emergency-reset',
        lastError:reason, recoveryAt:stamp, updatedAt:stamp,
        // Beibehaltung eines bestehenden Tombstone-Timestamps: die Repository-
        // Schreibsicherung darf den alten Reset nicht darüberbügeln.
        emergencyResetAt:s.emergencyResetAt || stamp };
      if (isRemoteUncertain) {
        next.remoteVerification = 'unverified';
        next.remoteVerificationRequired = true;
      }
      return next;
    }

    if (plainObject(data.renewalSessionsV1)) {
      const copy = clone(data.renewalSessionsV1);
      for (const [id,s] of Object.entries(copy)) {
        if (!plainObject(s) || !s.renewalId || terminal(s.status) || s.massBatchTerminal === true) continue;
        copy[id] = cancel(s,uncertain(s));
        report.renewals++;
      }
      if (report.renewals) patch.renewalSessionsV1 = copy;
    }
    if (plainObject(data.templateFillSessions)) {
      const copy = clone(data.templateFillSessions);
      for (const [id,s] of Object.entries(copy)) {
        if (!plainObject(s) || !['waiting','running'].includes(String(s.status || ''))) continue;
        copy[id] = cancel(s,uncertain(s));
        copy[id].result = {complete:false,issues:[reason]};
        report.fills++;
      }
      if (report.fills) patch.templateFillSessions = copy;
    }
    if (plainObject(data.archiveInsertionSessionsV1)) {
      const copy = clone(data.archiveInsertionSessionsV1);
      for (const [id,s] of Object.entries(copy)) {
        if (!plainObject(s) || ['complete','cancelled','needs-review','error'].includes(String(s.status || ''))) continue;
        copy[id] = cancel(s,uncertain(s));
        report.archives++;
      }
      if (report.archives) patch.archiveInsertionSessionsV1 = copy;
    }
    if (plainObject(data.massRenewalBatchV1) && data.massRenewalBatchV1.status === 'running') {
      const batch = clone(data.massRenewalBatchV1);
      for (const item of batch.items || []) {
        if (['running','retrying'].includes(String(item.status || ''))) {
          item.status='needs-review'; item.stage='manual-emergency-reset';
          item.lastError=reason; item.completedAt=stamp;
        } else if (item.status === 'queued') {
          item.status='cancelled'; item.stage='not-started-manual-emergency-reset';
          item.completedAt=stamp;
        }
      }
      Object.assign(batch,{status:'stopped-with-attention',currentIndex:null,
        stopAfterCurrentRequested:true,stoppedAt:stamp,completedAt:stamp,
        updatedAt:stamp,recoveryAt:stamp,emergencyResetAt:batch.emergencyResetAt || stamp});
      patch.massRenewalBatchV1 = batch;
      report.massBatch = 1;
    }
    if (plainObject(data.bulkInventoryRun) &&
        (data.bulkInventoryRun.status === 'running' || Boolean(data.bulkInventoryRun.retryAdId))) {
      const bulk = clone(data.bulkInventoryRun);
      Object.assign(bulk,{status:'needs-review',stage:'manual-emergency-reset',
        retryAdId:null,workerTabId:null,metadataTabId:null,
        completedAt:stamp,recoveryAt:stamp,updatedAt:stamp,
        emergencyResetAt:bulk.emergencyResetAt || stamp,
        issues:[...new Set([...(Array.isArray(bulk.issues)?bulk.issues:[]),reason])]});
      patch.bulkInventoryRun = bulk;
      report.bulk = 1;
    }

    if (!Object.keys(patch).length) {
      log('Keine lokale Workflow-Sperre in den geprüften Speicherdaten gefunden.');
      log('Weitere Sperrursachen (z.B. Konto-Gate oder Update-Fence) wurden NICHT umgangen.');
      return;
    }

    await chrome.storage.local.set(patch);
    const verify = await chrome.storage.local.get(Object.keys(patch));
    const failed = Object.keys(patch).filter(key => JSON.stringify(verify[key]) !== JSON.stringify(patch[key]));
    if (failed.length) throw new Error('Schreib-/Readback-Abweichung bei '+failed.join(', ')+'. Keine Freigabe bestätigt.');
    console.table(report);
    log('Lokale Workflow-Sitzungen geändert und zurückgelesen. Keine Anzeigen, Bilder oder Journale gelöscht.');

    // Nur die vom Backend errechnete UI-Inserierungssperre auslesen.
    // Ein Web Lock / Update-Fence kann NICHT per storage-Patch freigegeben werden.
    const lock = await new Promise(resolve => {
      const timer=setTimeout(()=>resolve({unknown:true,reason:'Statusabfrage-Zeitüberschreitung'}),5000);
      chrome.runtime.sendMessage({type:'GET_INSERTION_LOCK_STATE'},response=>{
        clearTimeout(timer);
        resolve(chrome.runtime.lastError
          ? {unknown:true,reason:chrome.runtime.lastError.message}
          : response?.ok ? response.result : {unknown:true,reason:response?.error || 'unbekannt'});
      });
    });
    log('Backend-Sperrstatus (ohne private IDs):',{
      locked:lock?.locked,kind:lock?.kind,status:lock?.status,
      stage:lock?.stage,unknown:lock?.unknown === true,
      reason:lock?.reason || null
    });
    if (lock?.locked === true || lock?.unknown === true) {
      alert('Die lokale Bereinigung wurde gespeichert. Die Sperre ist aber noch aktiv oder ihr Zustand konnte nicht bestätigt werden. Bitte keine neue Anzeige starten; erst die genaue Sperrursache prüfen.');
      return;
    }
    log('Lokale Inserierungssperre freigegeben. Manager-Oberfläche wird neu geladen.');
    alert('Lokale Workflow-Sperren freigegeben. Die Manager-Oberfläche wird neu geladen. Vor einer neuen Inserierung bitte alte/neue Anzeigen unter „Meine Anzeigen“ auf Doppelungen prüfen.');
    location.reload();
  } catch (error) {
    console.error('[KAR-RECOVERY] FEHLER – keine erfolgreiche Freigabe behaupten:',error);
    alert('Recovery fehlgeschlagen oder nicht bestätigt: '+String(error?.message || error));
  }
})();
