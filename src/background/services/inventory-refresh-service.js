// Read-only inventory online-status and edit-tab refresh orchestration.
// One in-process owner; account binding, renewal locks, tab and atomic storage
// boundaries are preserved by injected existing authorities.
(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        getInventory,
        assertSelectedProfileMatchesLiveAccount,
        publicAvailabilityPending,
        getBulkRunState,
        normalizeKnownPublicAdUrl,
        publicUrlForInventoryRecord,
        directPublicUrlForAdId,
        logDiagnostic,
        probeFreshRenewalPublicUrl,
        mergeListingMetadata,
        publicAvailabilitySnapshot,
        putInventoryRecordOnly,
        broadcastInventoryChanged,
        renewalEvidenceFailureClass,
        readRenewalSessions,
        normalBrowserWindowId,
        createAutomationTab,
        extractReadOnlyMetadata,
        waitForTabComplete,
        ensureContentConnection,
        sendTabRequestWithBootstrap,
        delay,
        requirePublicListingEvidenceService,
        saveInventory,
        normalizeRenewalMode,
        compareRenewalRecords,
        renewalOutcomeForComparison,
        persistRenewalSession,
        sessionCorrelationContext,
        closeRegistryTabs,
        RENEWAL_DIRECT_READONLY_TIMEOUT_MS,
        READONLY_METADATA_TIMEOUT_MS,
        TAB_LOAD_TIMEOUT_RENEWAL_MS,
        BULK_RETRY_TIMEOUT_MS,
        BULK_RETRY_POLL_MS,
        RENEWAL_MODE_SAFE
      } = options;
      const required = [getInventory, assertSelectedProfileMatchesLiveAccount, publicAvailabilityPending, getBulkRunState, normalizeKnownPublicAdUrl, publicUrlForInventoryRecord, directPublicUrlForAdId, logDiagnostic, probeFreshRenewalPublicUrl, mergeListingMetadata, publicAvailabilitySnapshot, putInventoryRecordOnly, broadcastInventoryChanged, renewalEvidenceFailureClass, readRenewalSessions, normalBrowserWindowId, createAutomationTab, extractReadOnlyMetadata, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, delay, requirePublicListingEvidenceService, saveInventory, normalizeRenewalMode, compareRenewalRecords, renewalOutcomeForComparison, persistRenewalSession, sessionCorrelationContext, closeRegistryTabs];
      if (required.some(fn => typeof fn !== 'function') ||
          ![RENEWAL_DIRECT_READONLY_TIMEOUT_MS, READONLY_METADATA_TIMEOUT_MS, TAB_LOAD_TIMEOUT_RENEWAL_MS, BULK_RETRY_TIMEOUT_MS, BULK_RETRY_POLL_MS].every(Number.isFinite) ||
          typeof RENEWAL_MODE_SAFE !== 'string') {
        throw new Error('KRInventoryRefreshService requires complete account, evidence, storage and lifecycle dependencies');
      }

      async function checkInventoryOnlineStatus(message) {
        const inventoryId = String(message?.inventoryId || message?.adId || '');
        const existing = await getInventory(inventoryId);
        if (!existing) throw new Error('Lokaler Inventareintrag wurde nicht gefunden.');
        if (existing?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: existing.profileId, expectedProfileName: existing.profileName || '', purpose: 'inventory-online-status' });
        const adId = String(existing.adId || message?.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Inventareintrag besitzt keine gültige Anzeigen-ID.');
        if (!publicAvailabilityPending(existing)) return { online: true, pending: false, record: existing, alreadyResolved: true };
        const run = await getBulkRunState().catch(() => null);
        if (run?.status === 'running' || run?.retryAdId) throw new Error('Während einer laufenden Erfassung oder Wiederholung kann der Online-Status nicht geprüft werden.');

        const operationId = crypto.randomUUID();
        const canonicalUrl = normalizeKnownPublicAdUrl(publicUrlForInventoryRecord(existing), adId);
        const directUrl = directPublicUrlForAdId(adId);
        const attempts = [];
        let confirmed = null;
        await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_CHECK_STARTED', {
          operationId, inventoryId, adId, canonicalUrlAvailable: Boolean(canonicalUrl), directUrlAvailable: Boolean(directUrl)
        }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});

        if (canonicalUrl) {
          const canonical = await probeFreshRenewalPublicUrl(canonicalUrl, adId, 'canonical', RENEWAL_DIRECT_READONLY_TIMEOUT_MS, { operationId, adId });
          attempts.push(canonical);
          if (canonical.ok) confirmed = canonical;
        }
        if (!confirmed && directUrl) {
          const direct = await probeFreshRenewalPublicUrl(directUrl, adId, 'id-direct', READONLY_METADATA_TIMEOUT_MS, { operationId, adId });
          attempts.push(direct);
          if (direct.ok) confirmed = direct;
        }

        const checkedAt = new Date().toISOString();
        if (confirmed) {
          const resolvedUrl = normalizeKnownPublicAdUrl(confirmed.resolvedUrl || confirmed.metadata?.sourceUrl || canonicalUrl, adId) || canonicalUrl || '';
          existing.listingMeta = mergeListingMetadata(existing, existing.listingMeta || {}, confirmed, {
            publicUrl: resolvedUrl || null,
            source: 'online-status-check'
          });
          existing.listingMeta.publicAvailability = {
            ...publicAvailabilitySnapshot({
              online: true,
              verificationClass: 'confirmed',
              method: confirmed.publicUrlVariant || 'public-readonly',
              publicUrl: resolvedUrl || null,
              checkedAt
            }),
            status: 'online'
          };
          if (resolvedUrl) existing.publicUrl = resolvedUrl;
          await putInventoryRecordOnly(existing);
          await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_CONFIRMED', {
            operationId, inventoryId, adId, publicUrl: resolvedUrl || null, attemptCount: attempts.length,
            variants: attempts.map(item => item.publicUrlVariant).filter(Boolean)
          }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});
          broadcastInventoryChanged('inventory-online-status-confirmed', { inventoryId, adId });
          return { online: true, pending: false, record: existing };
        }

        const verificationClass = renewalEvidenceFailureClass(attempts);
        existing.listingMeta = {
          ...(existing.listingMeta || {}),
          publicAvailability: {
            ...publicAvailabilitySnapshot({
              online: false,
              verificationClass,
              method: attempts.at(-1)?.publicUrlVariant || null,
              publicUrl: canonicalUrl || null,
              checkedAt
            }),
            status: 'pending'
          }
        };
        await putInventoryRecordOnly(existing);
        await logDiagnostic('info', 'INVENTORY_ONLINE_STATUS_STILL_PENDING', {
          operationId, inventoryId, adId, verificationClass, attemptCount: attempts.length,
          variants: attempts.map(item => item.publicUrlVariant).filter(Boolean)
        }, { module: 'background', operation: 'inventory-online-status', context: { operationId, adId } }).catch(() => {});
        broadcastInventoryChanged('inventory-online-status-pending', { inventoryId, adId });
        return { online: false, pending: true, record: existing, verificationClass };
      }

      async function refreshInventoryRecord(message) {
        const inventoryId = String(message?.inventoryId || message?.adId || '');
        const existing = await getInventory(inventoryId);
        if (!existing) throw new Error('Lokaler Inventareintrag wurde nicht gefunden.');
        if (existing?.profileId) await assertSelectedProfileMatchesLiveAccount({ expectedProfileId: existing.profileId, expectedProfileName: existing.profileName || '', purpose: 'inventory-refresh' });
        const adId = String(existing.adId || message?.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Inventareintrag besitzt keine gültige Anzeigen-ID.');
        const run = await getBulkRunState().catch(() => null);
        if (run?.status === 'running' || run?.retryAdId) throw new Error('Während einer laufenden Erfassung oder Wiederholung kann eine Anzeige nicht aktualisiert werden.');
        const renewals = await readRenewalSessions().catch(() => ({}));
        if (Object.values(renewals).some(item => !['cancelled', 'replaced'].includes(String(item?.status || '')) && String(item?.sourceInventoryId || '') === inventoryId)) {
          throw new Error('Die Quellanzeige ist während eines laufenden Renewal-Vorgangs gesperrt.');
        }

        let workerTabId = null;
        let metadataTabId = null;
        const publicUrl = publicUrlForInventoryRecord(existing);
        await logDiagnostic('info', 'INVENTORY_REFRESH_STARTED', { inventoryId, adId, readOnlyMetadataRequested: Boolean(publicUrl) }, { module: 'background', operation: 'inventory-refresh', context: { adId } }).catch(() => {});
        try {
          const windowId = await normalBrowserWindowId();
          const editPromise = createAutomationTab({ ...(windowId ? { windowId } : {}), url: `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(adId)}`, active: false });
          const metadataPromise = publicUrl
            ? createAutomationTab({ ...(windowId ? { windowId } : {}), url: publicUrl, active: false })
            : Promise.resolve(null);
          const [editResult, metadataResult] = await Promise.allSettled([editPromise, metadataPromise]);
          if (editResult.status !== 'fulfilled' || !editResult.value?.id) throw new Error('Aktualisierungs-Worker konnte nicht geöffnet werden.');
          workerTabId = editResult.value.id;
          if (metadataResult.status === 'fulfilled' && metadataResult.value?.id) metadataTabId = metadataResult.value.id;

          await logDiagnostic('info', 'INVENTORY_REFRESH_WORKERS_OPENED', { adId, workerTabId, metadataTabId, parallel: true }, { module: 'background', operation: 'inventory-refresh', context: { adId, workerTabId, metadataTabId } }).catch(() => {});
          const readOnlyPromise = metadataTabId
            ? extractReadOnlyMetadata(metadataTabId, adId)
            : Promise.resolve({ ok: false, metadata: null, durationMs: 0, error: 'Keine öffentliche Detail-URL verfügbar.' });

          await waitForTabComplete(workerTabId, { timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS, purpose: 'inventory-refresh-edit', label: 'Aktualisierungs-Worker', operation: 'inventory-refresh', context: { adId, workerTabId } });
          await ensureContentConnection({ tabId: workerTabId });
          const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
          let extracted = null;
          let lastReason = '';
          while (Date.now() < deadline) {
            try {
              extracted = await sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
              if (String(extracted?.adId || '') === adId) break;
              lastReason = `Worker-Anzeige ${extracted?.adId || 'unbekannt'} entspricht nicht ${adId}.`;
              extracted = null;
            } catch (error) {
              lastReason = String(error.message || error).slice(0, 300);
            }
            await delay(BULK_RETRY_POLL_MS);
          }
          if (!extracted) throw new Error(lastReason || 'Anzeige wurde nicht rechtzeitig inventarisierbar.');

          const readOnlyResult = await readOnlyPromise;
          let ownerCardEndDate = null;
          // The public listing can have a posting date but no expiry. Only when
          // the expiry is missing do we read the owner's exact card and reuse the
          // existing bounded multi-page FIND_OWN_AD_BY_ID parser.
          if (!readOnlyResult.ok || !readOnlyResult.metadata?.endDateDisplay) {
            try {
              ownerCardEndDate = await requirePublicListingEvidenceService().readInventoryRefreshOwnAdsEndDate(adId, existing.profileName || '', windowId);
              await logDiagnostic('info', 'INVENTORY_REFRESH_OWN_AD_END_DATE_CONFIRMED', {
                adId, source: ownerCardEndDate.evidence, pagesScanned: ownerCardEndDate.pagesScanned,
                endDateDisplay: ownerCardEndDate.endDateDisplay
              }, { module: 'background', operation: 'inventory-refresh-own-ads', context: { adId } }).catch(() => {});
            } catch (error) {
              // Read-only enrichment must never corrupt a complete edit snapshot or
              // replace a known date with a guess on a wrong-account/absent card.
              await logDiagnostic('warning', 'INVENTORY_REFRESH_OWN_AD_END_DATE_UNAVAILABLE', {
                adId, message: String(error?.message || error).slice(0, 400)
              }, { module: 'background', operation: 'inventory-refresh-own-ads', context: { adId } }).catch(() => {});
            }
          }
          if (!readOnlyResult.ok) {
            await logDiagnostic('warning', 'INVENTORY_REFRESH_READONLY_UNAVAILABLE', { adId, durationMs: readOnlyResult.durationMs, message: readOnlyResult.error }, { module: 'background', operation: 'inventory-refresh-readonly', context: { adId, metadataTabId } }).catch(() => {});
          } else {
            await logDiagnostic('info', 'INVENTORY_REFRESH_READONLY_SUCCEEDED', { adId, durationMs: readOnlyResult.durationMs, hasEndDate: Boolean(readOnlyResult.metadata?.endDateDisplay), hasListingDate: Boolean(readOnlyResult.metadata?.listingDateDisplay) }, { module: 'background', operation: 'inventory-refresh-readonly', context: { adId, metadataTabId } }).catch(() => {});
          }
          extracted.profileId = existing.profileId || null;
          extracted.profileName = existing.profileName || null;
          if (existing?.renewal?.renewalId || String(existing?.recordKind || '').startsWith('renewal-')) {
            extracted.recordKind = existing.recordKind || 'renewal-candidate';
            extracted.renewal = existing.renewal ? { ...existing.renewal, updatedAt: new Date().toISOString() } : null;
          }
          extracted.listingMeta = mergeListingMetadata(extracted, existing.listingMeta || {}, readOnlyResult, {
            endDateDisplay: ownerCardEndDate?.endDateDisplay || existing.listingMeta?.endDateDisplay || existing.endDateDisplay || null,
            endDateIso: ownerCardEndDate?.endDateIso || existing.listingMeta?.endDateIso || null,
            publicUrl,
            source: 'manual-inventory-refresh'
          });
          if (ownerCardEndDate) extracted.listingMeta.endDateSource = ownerCardEndDate.evidence;
          let saved = await saveInventory(extracted, { inventoryIdOverride: inventoryId });
          if (existing?.renewal?.renewalId) {
            const sessions = await readRenewalSessions();
            const session = sessions[String(existing.renewal.renewalId)];
            if (session && String(session.skeletonInventoryId || '') === inventoryId) {
              const source = await getInventory(session.sourceInventoryId);
              if (!source) throw new Error('Quellinventar für die erneute Renewal-Verifikation wurde nicht gefunden.');
              const safeFullVerification = normalizeRenewalMode(session.renewalMode) === RENEWAL_MODE_SAFE;
              const comparison = await compareRenewalRecords(source, saved, {
                onlineConfirmed: readOnlyResult.ok,
                requirePublicAvailability: !safeFullVerification
              });
              session.comparison = comparison;
              const outcome = renewalOutcomeForComparison(comparison);
              session.status = outcome.status;
              session.stage = outcome.stage;
              if (safeFullVerification && comparison.status === 'match') {
                session.status = 'verified';
                session.stage = 'replacement-ready';
                session.publicAvailabilityPending = !readOnlyResult.ok;
                session.publicAvailability = publicAvailabilitySnapshot({
                  online: Boolean(readOnlyResult.ok),
                  verificationClass: readOnlyResult.ok ? 'confirmed' : 'temporarily-unavailable',
                  method: readOnlyResult.ok ? 'manual-refresh-readonly' : null,
                  publicUrl: publicUrl || null
                });
                saved.listingMeta = { ...(saved.listingMeta || {}), publicAvailability: { ...session.publicAvailability } };
                await putInventoryRecordOnly(saved);
              }
              session.verifiedAt = comparison.status === 'match' ? new Date().toISOString() : null;
              session.lastError = null;
              await persistRenewalSession(session);
              saved = await getInventory(inventoryId) || saved;
              await logDiagnostic(comparison.status === 'match' ? 'info' : 'warning', 'RENEWAL_REFRESH_REVERIFIED', {
                renewalId: session.renewalId, sourceAdId: session.sourceAdId, newAdId: session.newAdId, status: comparison.status, mismatchCount: comparison.mismatches.length, uncertaintyCount: comparison.uncertainties.length
              }, { module: 'background', operation: 'renewal-refresh-verify', context: sessionCorrelationContext(session, { renewalId: session.renewalId, adId }) }).catch(() => {});
            }
          }
          await closeRegistryTabs([workerTabId, metadataTabId], 'inventory-refresh-worker-finished', 'Aktualisierungs-Worker');
          workerTabId = null;
          metadataTabId = null;
          await logDiagnostic('info', 'INVENTORY_REFRESH_SUCCEEDED', { inventoryId: saved.inventoryId, adId, imageCount: saved.imageSummary?.discovered || 0, readOnlyMetadata: readOnlyResult.ok }, { module: 'background', operation: 'inventory-refresh', context: { adId } }).catch(() => {});
          return saved;
        } catch (error) {
          await closeRegistryTabs([workerTabId, metadataTabId], 'inventory-refresh-worker-failed', 'Aktualisierungs-Worker');
          await logDiagnostic('error', 'INVENTORY_REFRESH_FAILED', { inventoryId, adId, message: String(error.message || error).slice(0, 600), stack: String(error.stack || '').slice(0, 2400) }, { module: 'background', operation: 'inventory-refresh', context: { adId, workerTabId, metadataTabId } }).catch(() => {});
          throw error;
        }
      }

      return Object.freeze({ checkInventoryOnlineStatus, refreshInventoryRecord });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryRefreshService', API);
})();
