(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const { getBulkRunState, tabRegistry, singleInventorySourceFromUrl, sendTabRequestWithBootstrap, normalizeProfileName, assertSelectedProfileMatchesLiveAccount, logDiagnostic, correlationContext, normalBrowserWindowId, createManagedWorkerTab, getInventory, publicUrlForInventoryRecord, extractReadOnlyMetadata, directPublicUrlForAdId, extractSingleInventoryEdit, mergeListingMetadata, saveInventory, closeManagedWorkerTab, captureEmergencyResetGeneration, assertEmergencyResetGeneration } = options;
      const READONLY_METADATA_TIMEOUT_MS = Number(options.readOnlyMetadataTimeoutMs || 15000);
      const crypto = { randomUUID: options.randomUUID };
      const chrome = { tabs: options.chromeTabs };
      const captureResetGeneration = typeof captureEmergencyResetGeneration === 'function' ? captureEmergencyResetGeneration : (() => 0);
      const assertResetGeneration = typeof assertEmergencyResetGeneration === 'function' ? assertEmergencyResetGeneration : (() => true);

      async function captureSingleInventory(message) {
        const resetGeneration = captureResetGeneration();
        const sourceTabId = Number(message?.sourceTabId || 0);
        if (!sourceTabId) throw new Error('Der Quell-Tab für die Einzelinventur fehlt.');
        const activeBulk = await getBulkRunState().catch(() => null);
        assertResetGeneration(resetGeneration, 'single-inventory-after-bulk-check');
        if (activeBulk?.status === 'running' || activeBulk?.retryAdId) throw new Error('Während einer laufenden Erfassung oder Wiederholung kann keine einzelne Anzeige erfasst werden.');

        const operationId = crypto.randomUUID();
        const sourceTab = await tabRegistry.getTabOrThrow(sourceTabId, chrome.tabs, { label: 'Geöffnete Anzeige' });
        const source = singleInventorySourceFromUrl(sourceTab?.url || '');
        if (!source) throw new Error('Die geöffnete Seite besitzt keine eindeutige bestehende Anzeigen-ID.');
        const page = await sendTabRequestWithBootstrap(sourceTabId, { type: 'PAGE_STATUS' });
        if (!page?.auth?.loggedIn || !page?.auth?.ownAd) throw new Error('Die geöffnete Seite wurde nicht als eigene bestehende Anzeige erkannt.');
        if (page?.adId && String(page.adId) !== source.adId) throw new Error('Die erkannte Anzeigen-ID stimmt nicht mit dem geöffneten Tab überein.');

        const profileId = String(message?.profileId || '').trim() || null;
        const profileName = String(message?.profileName || '').trim() || null;
        const liveProfileName = normalizeProfileName(page?.profileName || '');
        if (!profileId || !profileName) throw new Error('Für die Einzelinventur fehlt die bestätigte Profilbindung.');
        if (liveProfileName && liveProfileName.toLocaleLowerCase('de-DE') !== normalizeProfileName(profileName).toLocaleLowerCase('de-DE')) {
          throw new Error('Die geöffnete eigene Anzeige gehört nicht eindeutig zum ausgewählten Kleinanzeigen-Konto.');
        }
        await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: profileId, expectedProfileName: profileName, purpose: 'single-inventory' });
        assertResetGeneration(resetGeneration, 'single-inventory-after-account-check');
        const correlation = { operationId, adId: source.adId };
        let editWorkerTabId = null;
        let metadataWorkerTabId = null;

        await logDiagnostic('info', 'SINGLE_INVENTORY_CAPTURE_STARTED', {
          operationId, sourceTabId, adId: source.adId, sourceMode: source.mode, profileId, profileName
        }, { module: 'background', operation: 'single-inventory', context: correlationContext(correlation, { sourceTabId }) }).catch(() => {});

        try {
          let editTabId = sourceTabId;
          if (source.mode === 'public') {
            const windowId = await normalBrowserWindowId();
            const editWorker = await createManagedWorkerTab({
              ...(windowId ? { windowId } : {}),
              url: `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(source.adId)}`,
              active: false
            }, 'single-inventory-edit', { operationId, ownerType: 'single-inventory', ownerId: operationId, adId: source.adId });
            if (!editWorker?.id) throw new Error('Bearbeiten-Worker für die Einzelinventur konnte nicht geöffnet werden.');
            editWorkerTabId = editWorker.id;
            editTabId = editWorker.id;
          }

          const existing = await getInventory(source.adId).catch(() => null);
          let readOnlyPromise;
          let fallbackPublicUrl = source.publicUrl || publicUrlForInventoryRecord(existing) || '';
          if (source.mode === 'public') {
            readOnlyPromise = extractReadOnlyMetadata(sourceTabId, source.adId, READONLY_METADATA_TIMEOUT_MS, { silentFailures: true });
          } else {
            const metadataUrl = fallbackPublicUrl || directPublicUrlForAdId(source.adId);
            if (metadataUrl) {
              const windowId = await normalBrowserWindowId();
              const metadataWorker = await createManagedWorkerTab({
                ...(windowId ? { windowId } : {}),
                url: metadataUrl,
                active: false
              }, 'single-inventory-readonly', { operationId, ownerType: 'single-inventory-metadata', ownerId: operationId, adId: source.adId });
              if (metadataWorker?.id) {
                metadataWorkerTabId = metadataWorker.id;
                readOnlyPromise = extractReadOnlyMetadata(metadataWorker.id, source.adId, READONLY_METADATA_TIMEOUT_MS, { silentFailures: true });
              }
            }
          }
          readOnlyPromise ||= Promise.resolve({ ok: false, metadata: null, durationMs: 0, error: 'Keine öffentliche Detailquelle verfügbar.' });

          const extracted = await extractSingleInventoryEdit(editTabId, source.adId, correlation, { ownedWorker: Boolean(editWorkerTabId) });
          const readOnlyResult = await readOnlyPromise.catch(error => ({ ok: false, metadata: null, durationMs: 0, error: String(error?.message || error).slice(0, 500) }));
          if (!readOnlyResult.ok) {
            await logDiagnostic('info', 'SINGLE_INVENTORY_READONLY_METADATA_UNAVAILABLE', {
              operationId, adId: source.adId, sourceMode: source.mode, message: String(readOnlyResult.error || 'Read-only-Metadaten nicht verfügbar.').slice(0, 500)
            }, { module: 'background', operation: 'single-inventory-readonly', context: correlationContext(correlation, { metadataWorkerTabId }) }).catch(() => {});
          }

          extracted.profileId = profileId;
          extracted.profileName = profileName;
          extracted.profileAssignmentSource = 'manual-single-capture-detected-profile';
          fallbackPublicUrl = source.publicUrl || String(readOnlyResult?.metadata?.sourceUrl || '') || fallbackPublicUrl || '';
          extracted.listingMeta = mergeListingMetadata(extracted, existing?.listingMeta || {}, readOnlyResult, {
            endDateDisplay: existing?.listingMeta?.endDateDisplay || existing?.endDateDisplay || null,
            endDateIso: existing?.listingMeta?.endDateIso || null,
            publicUrl: fallbackPublicUrl || null,
            source: source.mode === 'public' ? 'manual-single-edit-worker+readonly-detail' : 'manual-single-edit+readonly-detail'
          });

          assertResetGeneration(resetGeneration, 'single-inventory-before-save');
          const saved = await saveInventory(extracted);
          await logDiagnostic('info', 'SINGLE_INVENTORY_CAPTURE_SUCCEEDED', {
            operationId, sourceTabId, adId: source.adId, sourceMode: source.mode, editWorkerTabId, metadataWorkerTabId, imageCount: saved.imageSummary?.discovered || 0, readOnlyMetadata: readOnlyResult.ok
          }, { module: 'background', operation: 'single-inventory', context: correlationContext(correlation, { sourceTabId, editWorkerTabId, metadataWorkerTabId }) }).catch(() => {});
          return saved;
        } catch (error) {
          await logDiagnostic('error', 'SINGLE_INVENTORY_CAPTURE_FAILED', {
            operationId, sourceTabId, adId: source.adId, sourceMode: source.mode, editWorkerTabId, metadataWorkerTabId, message: String(error?.message || error).slice(0, 600)
          }, { module: 'background', operation: 'single-inventory', context: correlationContext(correlation, { sourceTabId, editWorkerTabId, metadataWorkerTabId }) }).catch(() => {});
          throw error;
        } finally {
          await Promise.all([editWorkerTabId, metadataWorkerTabId].filter(Boolean).map(tabId => closeManagedWorkerTab(tabId).catch(() => {})));
        }
      }

      return Object.freeze({ captureSingleInventory });
    }
  });
  globalThis.KRDeps?.register?.('KRSingleInventoryController', API);
})();
