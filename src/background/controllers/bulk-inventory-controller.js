(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const {
        getBulkRunState, tabRegistry, bulkRunOwnerExpectation, normalizeProfileName, ensureProfile, normalizeCorrelationId,
        normalizeInventoryScope, readInventoryRecordsForProfile, normalizeRenewalMode, registerShadowTab, writeBulkRunState,
        mutateBulkRunState, logDiagnostic, sessionCorrelationContext, closeRegistryTabs, closeRegistryTab,
        releaseBulkSourceOwnership, broadcastInventoryChanged, captureEmergencyResetGeneration, assertEmergencyResetGeneration,
        readRenewalSessions, readFillSessions, readMassRenewalBatch, isTrashRecord, openDatabase, trashRecordFrom,
        getRenewalConfiguration, normalBrowserWindowId, assertPlatformAccessAllowed, createAutomationTab, waitForTabComplete,
        ensureContentConnection, sendTabRequestWithBootstrap, correlationContext, getInventory, deriveListingDateFromEndDate,
        mergeListingMetadata, saveInventory, updateAutomationTab, delay, extractReadOnlyMetadata
      } = options;
      const TAB_ROLES = options.tabRoles || {};
      const TAB_STATES = options.tabStates || {};
      const TabRegistry = options.tabRegistryApi || {};
      const InventoryScope = options.inventoryScopeApi || {};
      const InventoryReconciliation = options.inventoryReconciliationApi || {};
      const INVENTORY_SCOPE_NEW_ONLY = options.inventoryScopeNewOnly;
      const INVENTORY_STORE = options.inventoryStore || 'inventories';
      const RENEWAL_MODE_FAST = String(options.fastRenewalMode || 'fast');
      const MY_ADS_PROJECTS_URL = String(options.myAdsProjectsUrl || 'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS');
      const PLATFORM_ACCESS_RESTRICTION_ERROR_CODE = String(options.platformAccessRestrictionErrorCode || 'KR_PLATFORM_ACCESS_RESTRICTED');
      const BULK_WORKER_TAB_CREATE_MAX_ATTEMPTS = Math.max(1, Number(options.bulkWorkerTabCreateMaxAttempts || 2));
      const BULK_WORKER_TAB_CREATE_RETRY_MS = Math.max(0, Number(options.bulkWorkerTabCreateRetryMs || 200));
      const BULK_RETRY_TIMEOUT_MS = Math.max(1, Number(options.bulkRetryTimeoutMs || 90000));
      const BULK_RETRY_POLL_MS = Math.max(1, Number(options.bulkRetryPollMs || 500));
      const READONLY_METADATA_TIMEOUT_MS = Math.max(1, Number(options.readOnlyMetadataTimeoutMs || 15000));
      const FRESH_BULK_SOURCE_MAX_ATTEMPTS = Math.max(1, Number(options.freshBulkSourceMaxAttempts || 2));
      const FRESH_RECONCILIATION_SOURCE_MAX_ATTEMPTS = Math.max(1, Number(options.freshReconciliationSourceMaxAttempts || 2));
      const TAB_LOAD_TIMEOUT_DEFAULT_MS = Math.max(1, Number(options.tabLoadTimeoutDefaultMs || 20000));
      const crypto = { randomUUID: options.randomUUID };
      const chrome = { tabs: options.chromeTabs || {} };
      const URL = options.URL || globalThis.URL;
      const setTimeout = options.setTimeout || globalThis.setTimeout;
      const captureResetGeneration = typeof captureEmergencyResetGeneration === 'function' ? captureEmergencyResetGeneration : (() => 0);
      const assertResetGeneration = typeof assertEmergencyResetGeneration === 'function' ? assertEmergencyResetGeneration : (() => true);

      async function initBulkRun(message, sender) {
        const resetGeneration = captureResetGeneration();
        const sourceTabId = sender?.tab?.id;
        if (!sourceTabId) throw new Error("Die Seite „Meine Anzeigen“ für die Erfassung wurde nicht erkannt.");
        if (message?.sourceFresh !== true) throw new Error('Bitte lade „Meine Anzeigen“ neu und starte die Erfassung anschließend erneut.');
        const expectedTotal = Number(message.expectedTotal);
        if (!Number.isInteger(expectedTotal) || expectedTotal < 0) throw new Error("Erwartete Anzahl laufender Anzeigen ist ungültig.");
        const existing = await getBulkRunState();
        assertResetGeneration(resetGeneration, 'bulk-inventory-after-existing-check');
        if (existing?.retryAdId) throw new Error("Es läuft gerade ein Einzel-Retry. Bitte warten.");
        if (existing?.status === "running") {
          if (existing.sourceTabId === sourceTabId) return existing;
          try {
            await tabRegistry.getTabOrThrow(existing.sourceTabId, chrome.tabs, { label: 'Bestehender „Meine Anzeigen“-Tab', role: TAB_ROLES.BULK_SOURCE, owner: bulkRunOwnerExpectation(existing) });
            throw new Error("Es läuft bereits eine Erfassung in einem anderen Tab.");
          } catch (error) {
            if (error.message === "Es läuft bereits eine Erfassung in einem anderen Tab.") throw error;
            if (!TabRegistry.isGoneError(error)) throw error;
          }
        }
        const now = new Date().toISOString();
        const sourceRegistryEntry = await tabRegistry.get(sourceTabId).catch(() => null);
        const sourceAutoCreated = sourceRegistryEntry?.kind === 'bulk-source-auto';
        const detectedProfileName = normalizeProfileName(message.profileName || '');
        const profile = detectedProfileName ? await ensureProfile(detectedProfileName) : null;
        assertResetGeneration(resetGeneration, 'bulk-inventory-after-profile-check');
        const runId = crypto.randomUUID();
        const operationId = normalizeCorrelationId(message.operationId);
        const inventoryScope = normalizeInventoryScope(message.inventoryScope);
        const existingInventoryIds = inventoryScope === INVENTORY_SCOPE_NEW_ONLY && profile?.profileId
          ? InventoryScope.activeInventoryAdIds(await readInventoryRecordsForProfile(profile.profileId), profile.profileId)
          : [];
        const state = {
          operationId: operationId || crypto.randomUUID(), parentOperationId: null, bulkRunId: runId, runId, sourceTabId, sourceUrl: String(message.sourceUrl || sender.tab?.url || ""),
          status: "running", stage: "initialized", expectedTotal, currentPage: Number(message.currentPage || 1),
          pageFingerprint: String(message.pageFingerprint || ""), processedIds: [], successCount: 0, failedCount: 0,
          remoteRosterPages: {}, remoteRosterIds: [], remoteRosterInvalid: null,
          reconciliationRosterPages: {}, reconciliationRosterIds: [], reconciliationRosterInvalid: null, reconciliationStatus: 'pending',
          failures: [], issues: [], currentAdId: "", currentTitle: "", currentThumbnailUrl: "", currentEndDateDisplay: "", currentEndDateIso: "",
          currentPublicUrl: "", currentReadOnlyMeta: null, metadataOpenedAt: null, workerTabId: null, metadataTabId: null,
          profileId: profile?.profileId || null, profileName: profile?.displayName || null, sourceAutoCreated,
          sourceReadinessObservedAt: message.sourceReadinessObservedAt || null, sourceReadinessWaitMs: Math.max(0, Number(message.sourceReadinessWaitMs || 0)),
          verificationMode: normalizeRenewalMode(message.verificationMode), inventoryScope,
          existingInventoryIds, skippedExistingIds: [], skippedExistingCount: 0,
          stopAfterCurrentRequested: false, stopRequestedAt: null, stoppedAt: null,
          currentItemStartedAt: null, lastProgressAt: now,
          startedAt: now, updatedAt: now, completedAt: null
        };
        await registerShadowTab(sourceTabId, TAB_ROLES.BULK_SOURCE, bulkRunOwnerExpectation(state));
        assertResetGeneration(resetGeneration, 'bulk-inventory-before-write');
        await writeBulkRunState(state);
        await logDiagnostic('info', 'BULK_SOURCE_SNAPSHOT_CREATED', {
          operationId: state.operationId, bulkRunId: state.bulkRunId, runId: state.runId,
          expectedTotal, snapshotCount: Number(message.snapshotCount || 0), hasNextPage: message.hasNextPage === true,
          currentPage: state.currentPage, pageFingerprint: state.pageFingerprint, profileName: state.profileName || null, sourceTabId,
          sourceReadinessObservedAt: state.sourceReadinessObservedAt, sourceReadinessWaitMs: state.sourceReadinessWaitMs, inventoryScope: state.inventoryScope, existingInventoryCount: state.existingInventoryIds.length, verificationMode: state.verificationMode
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
        await logDiagnostic("info", "BULK_INVENTORY_STARTED", { operationId: state.operationId, bulkRunId: state.bulkRunId, runId: state.runId, expectedTotal, sourceTabId, inventoryScope: state.inventoryScope, existingInventoryCount: state.existingInventoryIds.length, verificationMode: state.verificationMode }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
        return state;
      }

      async function bulkRunForSource(sender) {
        const state = await getBulkRunState();
        if (!state || state.sourceTabId !== sender?.tab?.id) return null;
        return state;
      }

      async function updateBulkRun(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        const patch = message.patch && typeof message.patch === "object" ? message.patch : {};
        if (patch.stage === 'opening-worker' && state.stopAfterCurrentRequested === true && !state.currentAdId && !state.workerTabId) {
          return { ...state, stopBeforeNext: true };
        }
        const allowed = ["stage","expectedTotal","currentPage","pageFingerprint","currentAdId","currentTitle","currentThumbnailUrl"];
        for (const key of allowed) if (key in patch) state[key] = patch[key];
        if ("expectedTotal" in patch) state.expectedTotal = Math.max(0, Number(patch.expectedTotal || 0));
        const progressAt = new Date().toISOString();
        state.lastProgressAt = progressAt;
        if (patch.stage === 'opening-worker') state.currentItemStartedAt = progressAt;
        const updated = await writeBulkRunState(state);
        if (typeof patch.stage === 'string') await logDiagnostic('info', 'BULK_STAGE', {
          operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null,
          runId: state.runId, stage: patch.stage, currentPage: state.currentPage, adId: state.currentAdId || null, title: state.currentTitle || null
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state.currentAdId || null }) }).catch(() => {});
        return updated;
      }

      async function beginBulkReconciliation(message, sender) { return await requireBulkReconciliationService().beginBulkReconciliation(message, sender); }

      async function requestBulkInventoryStopAfterCurrent(message) {
        const state = await getBulkRunState();
        const requestedRunId = String(message?.runId || '');
        if (!state || (requestedRunId && String(state.runId || '') !== requestedRunId)) throw new Error('Die Erfassung wurde nicht gefunden.');
        if (state.status !== 'running') return state;
        if (String(state.stage || '').startsWith('reconciliation-')) throw new Error('Der Bestandsabgleich hat bereits begonnen und kann nicht mehr nach einer Anzeige gestoppt werden.');
        if (state.stopAfterCurrentRequested !== true) {
          state.stopAfterCurrentRequested = true;
          state.stopRequestedAt = new Date().toISOString();
          await writeBulkRunState(state);
          await logDiagnostic('info', 'BULK_INVENTORY_STOP_AFTER_CURRENT_REQUESTED', {
            runId: state.runId, processed: Number(state.processedIds?.length || 0), expectedTotal: Number(state.expectedTotal || 0), currentAdId: state.currentAdId || null
          }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId: state.currentAdId || null }) }).catch(() => {});
          broadcastInventoryChanged('bulk-stop-requested', { runId: state.runId, processed: Number(state.processedIds?.length || 0), expectedTotal: Number(state.expectedTotal || 0) });
        }
        return state;
      }

      async function finishBulkRunControlledStop(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        if (state.status !== 'running') return state;
        if (String(state.stage || '').startsWith('reconciliation-')) throw new Error('Der Bestandsabgleich hat bereits begonnen.');
        await closeRegistryTabs([state.workerTabId, state.metadataTabId], 'bulk-controlled-stop', 'Inventarisierungs-Worker').catch(() => {});
        const processed = Number(state.processedIds?.length || 0);
        const expected = Number(state.expectedTotal || 0);
        state.currentPage = Number(message?.lastPage || state.currentPage || 1);
        state.currentAdId = ''; state.currentTitle = ''; state.currentThumbnailUrl = ''; state.currentEndDateDisplay = ''; state.currentEndDateIso = ''; state.currentPublicUrl = ''; state.currentReadOnlyMeta = null;
        state.workerTabId = null; state.metadataTabId = null; state.metadataOpenedAt = null;
        state.status = 'stopped';
        state.stage = 'stopped-after-current';
        state.stopAfterCurrentRequested = true;
        state.stopRequestedAt = state.stopRequestedAt || new Date().toISOString();
        state.stoppedAt = new Date().toISOString();
        state.completedAt = state.stoppedAt;
        state.reconciliationStatus = 'skipped-controlled-stop';
        state.reconciliationSummary = {
          expected,
          firstCount: Number(state.remoteRosterIds?.length || 0),
          secondCount: 0,
          movedToTrash: 0,
          processed,
          unprocessed: Math.max(0, expected - processed)
        };
        await writeBulkRunState(state);
        await releaseBulkSourceOwnership(state, 'bulk-controlled-stop').catch(() => {});
        scheduleAutoBulkSourceClose(state, 'bulk-auto-source-controlled-stop');
        await logDiagnostic('info', 'BULK_INVENTORY_STOPPED_AFTER_CURRENT', {
          runId: state.runId, expectedTotal: expected, processed, successCount: state.successCount, failedCount: state.failedCount,
          unprocessed: Math.max(0, expected - processed), reconciliationStatus: state.reconciliationStatus
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
        broadcastInventoryChanged('bulk-stopped-after-current', {
          runId: state.runId, status: state.status, processed, expectedTotal: expected, successCount: state.successCount, failedCount: state.failedCount,
          unprocessed: Math.max(0, expected - processed), reconciliationStatus: state.reconciliationStatus
        });
        return state;
      }

      async function closeBulkWorker(message, sender) { return await requireBulkWorkerService().closeBulkWorker(message, sender); }

      async function recordBulkExistingSkip(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        const adId = String(message?.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Übersprungene Anzeige besitzt keine gültige Anzeigen-ID.');
        if (!InventoryScope.shouldSkipExisting(state.inventoryScope, state.existingInventoryIds, adId)) {
          throw new Error('Diese Anzeige darf in der aktuellen Erfassung nicht als bereits vorhanden übersprungen werden.');
        }
        if (!state.processedIds.includes(adId)) state.processedIds.push(adId);
        if (!Array.isArray(state.skippedExistingIds)) state.skippedExistingIds = [];
        if (!state.skippedExistingIds.includes(adId)) state.skippedExistingIds.push(adId);
        state.skippedExistingCount = state.skippedExistingIds.length;
        state.stage = 'existing-skipped';
        state.currentAdId = '';
        state.currentTitle = '';
        state.currentThumbnailUrl = '';
        const updated = await writeBulkRunState(state);
        await logDiagnostic('info', 'BULK_EXISTING_SKIPPED', {
          runId: state.runId, adId, inventoryScope: state.inventoryScope, skippedExistingCount: state.skippedExistingCount
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId }) }).catch(() => {});
        return updated;
      }

      async function recordBulkResult(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        const adId = String(message.adId || "");
        if (!/^\d+$/.test(adId)) throw new Error("Ergebnis besitzt keine gültige Anzeigen-ID.");
        if (!state.processedIds.includes(adId)) {
          state.processedIds.push(adId);
          if (message.ok) state.successCount += 1;
          else {
            state.failedCount += 1;
            state.failures.push({
              adId,
              title: String(message.title || "").slice(0, 180),
              thumbnailUrl: String(state.currentThumbnailUrl || '').slice(0, 1200),
              error: String(message.error || "Unbekannter Fehler").slice(0, 500),
              publicUrl: String(message.publicUrl || state.currentPublicUrl || '').slice(0, 1000),
              endDateDisplay: String(message.endDateDisplay || state.currentEndDateDisplay || '').slice(0, 10),
              endDateIso: String(message.endDateIso || state.currentEndDateIso || '').slice(0, 10)
            });
            state.failures = state.failures.slice(-200);
          }
        }
        state.workerTabId = null;
        state.currentAdId = "";
        state.currentTitle = "";
        state.currentThumbnailUrl = "";
        state.currentEndDateDisplay = "";
        state.currentEndDateIso = "";
        state.currentPublicUrl = "";
        state.currentReadOnlyMeta = null;
        state.metadataTabId = null;
        state.metadataOpenedAt = null;
        state.stage = "item-finished";
        state.currentItemStartedAt = null;
        state.lastProgressAt = new Date().toISOString();
        const updated = await writeBulkRunState(state);
        await logDiagnostic(message.ok ? 'info' : 'warning', 'BULK_ITEM_FINISHED', {
          runId: state.runId, adId, ok: Boolean(message.ok), error: message.ok ? null : String(message.error || 'Unbekannter Fehler').slice(0, 500)
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state, { adId }) }).catch(() => {});
        return updated;
      }

      async function failBulkRun(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        await closeRegistryTabs([state.workerTabId, state.metadataTabId], 'bulk-run-failed', 'Inventarisierungs-Worker');
        state.workerTabId = null;
        state.metadataTabId = null;
        state.metadataOpenedAt = null;
        state.currentPublicUrl = '';
        state.currentReadOnlyMeta = null;
        const reconciliationWasActive = String(state.stage || '').startsWith('reconciliation-');
        state.status = "needs-review";
        state.stage = reconciliationWasActive ? "reconciliation-interrupted" : "interrupted";
        if (reconciliationWasActive) {
          state.reconciliationStatus = 'skipped';
          state.reconciliationSummary = {
            firstCount: Number(state.remoteRosterIds?.length || 0),
            secondCount: Number(state.reconciliationRosterIds?.length || 0),
            expected: Number(state.expectedTotal || 0),
            movedToTrash: 0
          };
          state.issues = [...new Set([...(state.issues || []), 'Unabhängiger Bestandsabgleich wurde unterbrochen. Bereinigung wurde übersprungen.'])];
        }
        state.currentPage = Number(message.currentPage || state.currentPage || 1);
        state.completedAt = new Date().toISOString();
        state.issues = [...new Set([...(state.issues || []), String(message.error || "Die Erfassung wurde unterbrochen.").slice(0, 500)])];
        await writeBulkRunState(state);
        await releaseBulkSourceOwnership(state, 'bulk-failed').catch(() => {});
        scheduleAutoBulkSourceClose(state, 'bulk-auto-source-failed');
        return state;
      }



      function requireBulkSource(state, sender) {
        const tabId = sender?.tab?.id;
        if (!state || state.status !== 'running') throw new Error('Keine aktive Erfassung vorhanden.');
        if (!tabId || state.sourceTabId !== tabId) throw new Error('Die laufende Erfassung wurde in einem anderen „Meine Anzeigen“-Tab gestartet.');
        return tabId;
      }

      function normalizedBulkRosterIds(values) { return requireBulkReconciliationService().normalizedBulkRosterIds(values); }

      function bulkRosterEvidence(pages) { return requireBulkReconciliationService().bulkRosterEvidence(pages); }

      async function recordBulkRosterPage(message, sender, { reconciliation = false } = {}) { return requireBulkReconciliationService().recordBulkRosterPage(message, sender, { reconciliation }); }

      async function protectedInventoryIdsForReconciliation(profileId) { return await requireBulkReconciliationService().protectedInventoryIdsForReconciliation(profileId); }

      async function moveReconciliationCandidatesToTrash(state, remoteIds) { return await requireBulkReconciliationService().moveReconciliationCandidatesToTrash(state, remoteIds); }

      async function finishBulkReconciliation(message, sender) { return await requireBulkReconciliationService().finishBulkReconciliation(message, sender); }

      async function startBulkInventoryOperation(message = {}) {
        const expectedProfileName = normalizeProfileName(message?.expectedProfileName || '');
        if (!expectedProfileName) throw new Error('Das ausgewählte Inventarprofil konnte für die Erfassung nicht bestimmt werden.');
        const existing = await getBulkRunState();
        if (existing?.retryAdId) throw new Error('Es läuft gerade ein Einzel-Retry. Bitte warten.');
        if (existing?.status === 'running') throw new Error('Es läuft bereits eine Erfassung.');

        const operationId = crypto.randomUUID();
        const renewalConfiguration = await getRenewalConfiguration();
        const verificationMode = message?.verificationMode ? normalizeRenewalMode(message.verificationMode) : normalizeRenewalMode(renewalConfiguration?.renewalMode);
        const inventoryScope = normalizeInventoryScope(message?.inventoryScope);
        const windowId = await normalBrowserWindowId();
        let lastError = null;

        for (let attempt = 1; attempt <= FRESH_BULK_SOURCE_MAX_ATTEMPTS; attempt += 1) {
          let sourceTabId = null;
          try {
            await assertPlatformAccessAllowed({ operation: 'bulk-inventory-start', context: { operationId, attempt } });
            const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url: MY_ADS_PROJECTS_URL, active: false });
            sourceTabId = Number(tab?.id || 0);
            if (!sourceTabId) throw new Error('„Meine Anzeigen“ konnte für die Erfassung nicht im Hintergrund geöffnet werden.');
            await registerShadowTab(sourceTabId, TAB_ROLES.SOURCE, {
              operationId, ownerType: 'bulk', ownerId: operationId
            }, { managed: true, kind: 'bulk-source-auto' });
            await logDiagnostic('info', 'BULK_SOURCE_OPERATION_OPENED', {
              operationId, sourceTabId, attempt, maxAttempts: FRESH_BULK_SOURCE_MAX_ATTEMPTS
            }, { module: 'background', operation: 'bulk-inventory-start', context: { operationId, sourceTabId } }).catch(() => {});

            await waitForTabComplete(sourceTabId, {
              timeoutMs: TAB_LOAD_TIMEOUT_DEFAULT_MS,
              purpose: 'bulk-auto-source',
              label: '„Meine Anzeigen“-Hintergrundtab',
              operation: 'bulk-inventory-start',
              context: { operationId, sourceTabId, attempt }
            });
            await ensureContentConnection({ tabId: sourceTabId });
            const page = await sendTabRequestWithBootstrap(sourceTabId, { type: 'PAGE_STATUS' });
            if (!page?.auth?.loggedIn) {
              const error = new Error('Im frischen Inventur-Tab wurde kein angemeldetes Kleinanzeigen-Konto erkannt.');
              error.code = 'KR_MY_ADS_INVALID';
              throw error;
            }

            const state = await sendTabRequestWithBootstrap(sourceTabId, {
              type: 'START_BULK_INVENTORY_FROM_FRESH_SOURCE',
              expectedProfileName,
              operationId,
              verificationMode,
              inventoryScope
            });
            await logDiagnostic('info', 'BULK_AUTO_SOURCE_READY', {
              operationId, bulkRunId: state?.bulkRunId || state?.runId || null, runId: state?.runId || null,
              sourceTabId, profileName: state?.profileName || null, currentPage: state?.currentPage || 1,
              expectedOnline: Number.isInteger(state?.expectedTotal) ? state.expectedTotal : null,
              readinessWaitMs: Number(state?.sourceReadinessWaitMs || 0), attempt
            }, { module: 'background', operation: 'bulk-inventory-start', context: sessionCorrelationContext(state || {}, { operationId, sourceTabId }) }).catch(() => {});
            return state;
          } catch (error) {
            lastError = error;
            const readinessDetails = error?.details && typeof error.details === 'object' ? error.details : {};
            await logDiagnostic('warning', 'BULK_SOURCE_OPERATION_ATTEMPT_FAILED', {
              operationId, sourceTabId, attempt, maxAttempts: FRESH_BULK_SOURCE_MAX_ATTEMPTS,
              errorCode: error?.code || null, message: String(error?.message || error).slice(0, 600),
              readinessReasonCode: error?.reasonCode || readinessDetails.reasonCode || null,
              expectedOnline: Number.isInteger(readinessDetails.expectedOnline) ? readinessDetails.expectedOnline : null,
              requiredOnline: Number.isInteger(readinessDetails.requiredOnline) ? readinessDetails.requiredOnline : null,
              listingCount: Number.isInteger(readinessDetails.listingCount) ? readinessDetails.listingCount : null,
              listingIds: Array.isArray(readinessDetails.listingIds) ? readinessDetails.listingIds.slice(0, 250) : [],
              missingListingIds: Array.isArray(readinessDetails.missingListingIds) ? readinessDetails.missingListingIds.slice(0, 250) : null,
              missingIdsKnown: readinessDetails.missingIdsKnown === true,
              pageFingerprint: String(readinessDetails.pageFingerprint || '').slice(0, 4000),
              hasNext: readinessDetails.hasNext === true,
              observedAt: readinessDetails.observedAt || null
            }, { module: 'background', operation: 'bulk-inventory-start', context: { operationId, ...(sourceTabId ? { sourceTabId } : {}) } }).catch(() => {});
            if (sourceTabId) await closeRegistryTab(sourceTabId, 'bulk-source-operation-attempt-failed', '„Meine Anzeigen“-Hintergrundtab').catch(() => {});
            if (error?.code === PLATFORM_ACCESS_RESTRICTION_ERROR_CODE || error?.code === 'KR_MY_ADS_INVALID') throw error;
          }
        }

        const finalError = new Error(`„Meine Anzeigen“ wurde nicht rechtzeitig fachlich bereit.${lastError?.message ? ` ${lastError.message}` : ''}`);
        finalError.code = lastError?.code || 'KR_MY_ADS_READINESS_TIMEOUT';
        finalError.reasonCode = lastError?.reasonCode || lastError?.details?.reasonCode || null;
        finalError.details = { ...(lastError?.details && typeof lastError.details === 'object' ? lastError.details : {}), attempts: FRESH_BULK_SOURCE_MAX_ATTEMPTS };
        throw finalError;
      }

      async function bulkSourceWasAutoCreated(sourceTabId) { return await requireBulkWorkerService().bulkSourceWasAutoCreated(sourceTabId); }

      function scheduleAutoBulkSourceClose(state, reason = 'bulk-auto-source-terminal') { if (state?.sourceAutoCreated !== true || !Number(state?.sourceTabId || 0)) return; return requireBulkWorkerService().scheduleAutoBulkSourceClose(state, reason); }

      async function createBulkEditWorkerTabWithRetry(options, state, adId) { return await requireBulkWorkerService().createBulkEditWorkerTabWithRetry(options, state, adId); }

      async function openBulkWorker(message, sender) { return await requireBulkWorkerService().openBulkWorker(message, sender); }

      function classifyBulkEditWorkerNavigation(tab, expectedAdId) { return requireBulkWorkerService().classifyBulkEditWorkerNavigation(tab, expectedAdId); }

      async function resolveBulkWorkerLifecycle(state, workerTabId, expectedAdId) { return await requireBulkWorkerService().resolveBulkWorkerLifecycle(state, workerTabId, expectedAdId); }

      async function extractSaveBulkWorker(message, sender) { return await requireBulkWorkerService().extractSaveBulkWorker(message, sender); }

      function scheduleBulkSourceTabClose(tabId, reason = 'bulk-source-replaced') { return requireBulkWorkerService().scheduleBulkSourceTabClose(tabId, reason); }

      async function prepareFreshBulkReconciliationSource(state, sender) { return await requireBulkReconciliationService().prepareFreshBulkReconciliationSource(state, sender); }

      async function finishBulkRun(message, sender) {
        const state = await getBulkRunState();
        requireBulkSource(state, sender);
        const processed = state.processedIds.length;
        const expected = Number(state.expectedTotal || 0);
        state.currentPage = Number(message.lastPage || state.currentPage || 1);
        state.currentAdId = ''; state.currentTitle = ''; state.currentThumbnailUrl = ''; state.currentEndDateDisplay = ''; state.currentEndDateIso = ''; state.currentPublicUrl = ''; state.currentReadOnlyMeta = null; state.workerTabId = null; state.metadataTabId = null; state.metadataOpenedAt = null;
        const firstRoster = bulkRosterEvidence(state.remoteRosterPages || {});
        const firstRosterComplete = InventoryReconciliation.completeRoster(firstRoster, expected, state.remoteRosterInvalid);

        if (processed === expected && state.failedCount === 0 && firstRosterComplete) {
          state.status = 'running';
          state.stage = 'reconciliation-preparing';
          state.reconciliationStatus = 'pending';
          state.reconciliationRosterPages = {};
          state.reconciliationRosterIds = [];
          state.reconciliationRosterInvalid = null;
          state.reconciliationStartedAt = null;
          state.reconciliationSourceTabId = null;
          state.reconciliationSourceAttempt = 0;
          state.reconciliationSourceVerifiedAt = null;
          state.completedAt = null;
          await writeBulkRunState(state);
          await logDiagnostic('info', 'BULK_RECONCILIATION_STARTED', {
            runId: state.runId, expectedTotal: expected, firstRosterCount: firstRoster.ids.length, lastPage: state.currentPage,
            strategy: 'fresh-source-tab'
          }, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
          broadcastInventoryChanged('bulk-reconciliation-started', { runId: state.runId, expectedTotal: expected });
          return prepareFreshBulkReconciliationSource(state, sender);
        }

        state.completedAt = new Date().toISOString();
        state.reconciliationStatus = 'skipped';
        if (processed === expected) {
          state.status = state.failedCount ? 'complete-with-errors' : 'needs-review';
          state.stage = state.failedCount ? 'finished' : 'reconciliation-skipped';
          if (!firstRosterComplete) state.issues = [...new Set([...(state.issues || []), 'Die erste Bestandsprüfung war nicht vollständig bzw. eindeutig. Es wurde nichts automatisch in den Papierkorb verschoben.'])];
        } else {
          state.status = 'needs-review';
          state.stage = 'count-mismatch';
          state.issues = [...new Set([...(state.issues || []), `Erwartet ${expected} laufende Anzeigen, aber ${processed} eindeutige Anzeigen wurden abgearbeitet.`])];
        }
        state.reconciliationSummary = { expected, firstCount: firstRoster.ids.length, secondCount: 0, movedToTrash: 0 };
        await writeBulkRunState(state);
        await releaseBulkSourceOwnership(state, 'bulk-finished').catch(() => {});
        await logDiagnostic('warning', 'BULK_RECONCILIATION_SKIPPED', state.reconciliationSummary, { module: 'background', operation: 'bulk-reconciliation', context: sessionCorrelationContext(state) }).catch(() => {});
        await logDiagnostic(state.status === 'complete' ? 'info' : 'warning', 'BULK_INVENTORY_FINISHED', {
          operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null,
          runId: state.runId, status: state.status, expectedTotal: expected, processed, successCount: state.successCount, failedCount: state.failedCount, reconciliationStatus: state.reconciliationStatus
        }, { module: 'background', operation: 'bulk-inventory', context: sessionCorrelationContext(state) }).catch(() => {});
        broadcastInventoryChanged('bulk-finished', { runId: state.runId, status: state.status, processed, successCount: state.successCount, failedCount: state.failedCount, reconciliation: state.reconciliationSummary });
        scheduleAutoBulkSourceClose(state, 'bulk-auto-source-finished');
        return state;
      }

      async function retryBulkFailure(message) {
        const state = await getBulkRunState();
        if (!state) throw new Error('Keine abgeschlossene Erfassung vorhanden.');
        if (state.status === 'running') throw new Error('Während einer laufenden Erfassung kann keine einzelne Anzeige wiederholt werden.');
        const adId = String(message.adId || '');
        if (!/^\d+$/.test(adId)) throw new Error('Retry-Anzeigen-ID ist ungültig.');
        const failureIndex = (state.failures || []).findIndex(item => String(item.adId) === adId);
        if (failureIndex < 0) throw new Error('Für diese Anzeige liegt kein aktueller Fehlerstatus vor.');
        if (state.retryAdId) throw new Error(`Retry für Anzeige ${state.retryAdId} läuft bereits.`);

        const failure = state.failures[failureIndex];
        state.retryAdId = adId;
        state.retryTitle = String(failure.title || message.title || '').slice(0, 180);
        state.retryThumbnailUrl = String(failure.thumbnailUrl || '').slice(0, 1200);
        state.retryStartedAt = new Date().toISOString();
        state.stage = 'retry-opening-worker';
        await writeBulkRunState(state);

        let workerTabId = null;
        let metadataTabId = null;
        try {
          const publicUrl = /^https:\/\/(www\.)?kleinanzeigen\.de\/s-anzeige\//i.test(String(failure.publicUrl || '')) ? String(failure.publicUrl) : '';
          const editPromise = createBulkEditWorkerTabWithRetry(
            { url: `https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=${encodeURIComponent(adId)}`, active: false },
            state,
            adId
          );
          const metadataPromise = publicUrl ? createAutomationTab({ url: publicUrl, active: false }) : Promise.resolve(null);
          const [editResult, metadataResult] = await Promise.allSettled([editPromise, metadataPromise]);
          const createdMetadataTabId = metadataResult.status === 'fulfilled' ? metadataResult.value?.id || null : null;
          if (editResult.status !== 'fulfilled' || !editResult.value?.id) {
            if (createdMetadataTabId) await closeRegistryTab(createdMetadataTabId, 'bulk-retry-worker-create-failed', 'Inventarisierungs-Metadaten-Worker').catch(() => {});
            if (editResult.status === 'rejected' && editResult.reason) throw editResult.reason;
            throw new Error('Retry-Worker-Tab konnte nicht geöffnet werden.');
          }
          workerTabId = editResult.value.id;
          metadataTabId = createdMetadataTabId;
          state.workerTabId = workerTabId;
          state.metadataTabId = metadataTabId;
          state.stage = 'retry-worker-open';
          await writeBulkRunState(state);

          const readOnlyPromise = metadataTabId
            ? extractReadOnlyMetadata(metadataTabId, adId)
            : Promise.resolve({ ok: false, metadata: null, error: 'Keine öffentliche Detail-URL verfügbar.', durationMs: 0 });

          const deadline = Date.now() + BULK_RETRY_TIMEOUT_MS;
          let lastReason = '';
          let extracted = null;
          while (Date.now() < deadline) {
            const retryTab = await chrome.tabs.get(workerTabId).catch(() => null);
            const navigation = classifyBulkEditWorkerNavigation(retryTab, adId);
            if (navigation.state === 'terminal') {
              await logDiagnostic('warning', 'BULK_EDIT_WORKER_NOT_EDITABLE', {
                operationId: state.operationId || null, bulkRunId: state.bulkRunId || state.runId || null, runId: state.runId,
                adId, workerTabId, retry: true, navigationReason: navigation.navigationReason || null,
                finalUrl: String(navigation.finalUrl || '').slice(0, 1200), message: navigation.reason
              }, { module: 'background', operation: 'bulk-retry', context: sessionCorrelationContext(state, { adId, workerTabId }) }).catch(() => {});
              throw new Error(navigation.reason);
            }
            try {
              extracted = await sendTabRequestWithBootstrap(workerTabId, { type: 'EXTRACT_CURRENT_AD' });
              if (String(extracted?.adId || '') === adId) break;
              lastReason = `Worker-Anzeige ${extracted?.adId || 'unbekannt'} entspricht noch nicht ${adId}.`;
              extracted = null;
            } catch (error) {
              lastReason = String(error.message || error).slice(0, 240);
            }
            await delay(BULK_RETRY_POLL_MS);
          }
          if (!extracted) throw new Error(lastReason || 'Retry-Worker wurde nicht rechtzeitig inventarisierbar.');

          state.stage = 'retry-saving-worker';
          await writeBulkRunState(state);
          const readOnlyResult = await readOnlyPromise;
          extracted.profileId = state.profileId || null;
          extracted.profileName = state.profileName || null;
          extracted.listingMeta = mergeListingMetadata(extracted, {}, readOnlyResult, {
            endDateDisplay: failure.endDateDisplay || null,
            endDateIso: failure.endDateIso || null,
            publicUrl,
            source: 'bulk-failure-retry'
          });
          const saved = await saveInventory(extracted);
          await closeRegistryTabs([workerTabId, metadataTabId], 'bulk-retry-worker-finished', 'Inventarisierungs-Worker');
          workerTabId = null;
          metadataTabId = null;

          const latest = await getBulkRunState();
          if (!latest) return { ok: true, inventoryId: saved.inventoryId };
          const currentIndex = (latest.failures || []).findIndex(item => String(item.adId) === adId);
          if (currentIndex >= 0) latest.failures.splice(currentIndex, 1);
          latest.failedCount = Math.max(0, Number(latest.failedCount || 0) - 1);
          latest.successCount = Number(latest.successCount || 0) + 1;
          latest.workerTabId = null;
          latest.metadataTabId = null;
          latest.retryAdId = '';
          latest.retryTitle = '';
          latest.retryThumbnailUrl = '';
          latest.retryCompletedAt = new Date().toISOString();
          latest.stage = 'retry-succeeded';
          const processed = (latest.processedIds || []).length;
          const expected = Number(latest.expectedTotal || 0);
          latest.status = processed === expected ? (latest.failedCount ? 'complete-with-errors' : 'complete') : 'needs-review';
          await writeBulkRunState(latest);
          await releaseBulkSourceOwnership(latest, 'bulk-retry-finished').catch(() => {});
          await logDiagnostic('info', 'BULK_INVENTORY_RETRY_SUCCEEDED', { operationId: latest.operationId || null, bulkRunId: latest.bulkRunId || latest.runId || null, runId: latest.runId, adId, readOnlyMetadata: readOnlyResult.ok }, { module: 'background', operation: 'bulk-retry', context: sessionCorrelationContext(latest, { adId }) }).catch(() => {});
          return { ok: true, inventoryId: saved.inventoryId, state: latest };
        } catch (error) {
          await closeRegistryTabs([workerTabId, metadataTabId], 'bulk-retry-worker-failed', 'Inventarisierungs-Worker');
          const latest = await getBulkRunState();
          if (latest) {
            const idx = (latest.failures || []).findIndex(item => String(item.adId) === adId);
            const updatedFailure = {
              adId,
              title: String(failure.title || message.title || '').slice(0, 180),
              error: String(error.message || error || 'Unbekannter Fehler').slice(0, 500),
              publicUrl: failure.publicUrl || '',
              endDateDisplay: failure.endDateDisplay || '',
              endDateIso: failure.endDateIso || '',
              lastRetryAt: new Date().toISOString()
            };
            if (idx >= 0) latest.failures[idx] = { ...latest.failures[idx], ...updatedFailure };
            else latest.failures.push(updatedFailure);
            latest.workerTabId = null;
            latest.metadataTabId = null;
            latest.retryAdId = '';
            latest.retryTitle = '';
            latest.retryThumbnailUrl = '';
            latest.stage = 'retry-failed';
            const processed = (latest.processedIds || []).length;
            const expected = Number(latest.expectedTotal || 0);
            latest.status = processed === expected ? 'complete-with-errors' : 'needs-review';
            await writeBulkRunState(latest);
            await releaseBulkSourceOwnership(latest, 'bulk-retry-failed').catch(() => {});
            await logDiagnostic('warning', 'BULK_INVENTORY_RETRY_FAILED', { operationId: latest.operationId || null, bulkRunId: latest.bulkRunId || latest.runId || null, runId: latest.runId, adId, error: updatedFailure.error }, { module: 'background', operation: 'bulk-retry', context: sessionCorrelationContext(latest, { adId }) }).catch(() => {});
          }
          throw error;
        }
      }

      let bulkWorkerService = null;
      function requireBulkWorkerService() {
        if (!bulkWorkerService) {
          const serviceApi = options.bulkWorkerServiceApi || globalThis.KRDeps?.require?.('KRBulkWorkerService');
          if (!serviceApi?.create) throw new Error('bulk worker service is required');
          bulkWorkerService = serviceApi.create({ ...options });
        }
        return bulkWorkerService;
      }
      let bulkReconciliationService = null;
      function requireBulkReconciliationService() {
        if (!bulkReconciliationService) {
          const serviceApi = options.bulkReconciliationServiceApi || globalThis.KRDeps?.require?.('KRBulkReconciliationService');
          if (!serviceApi?.create) throw new Error('bulk reconciliation service is required');
          bulkReconciliationService = serviceApi.create({ ...options, scheduleBulkSourceTabClose: (...args) => requireBulkWorkerService().scheduleBulkSourceTabClose(...args) });
        }
        return bulkReconciliationService;
      }

      return Object.freeze({
        initBulkRun, bulkRunForSource, updateBulkRun, beginBulkReconciliation, requestBulkInventoryStopAfterCurrent,
        finishBulkRunControlledStop, closeBulkWorker, recordBulkExistingSkip, recordBulkResult, failBulkRun,
        requireBulkSource, normalizedBulkRosterIds, bulkRosterEvidence, recordBulkRosterPage,
        protectedInventoryIdsForReconciliation, moveReconciliationCandidatesToTrash, finishBulkReconciliation,
        startBulkInventoryOperation, bulkSourceWasAutoCreated, scheduleAutoBulkSourceClose,
        createBulkEditWorkerTabWithRetry, openBulkWorker, classifyBulkEditWorkerNavigation, resolveBulkWorkerLifecycle,
        extractSaveBulkWorker, scheduleBulkSourceTabClose, prepareFreshBulkReconciliationSource, finishBulkRun, retryBulkFailure
      });
    }
  });
  globalThis.KRDeps?.register?.('KRBulkInventoryController', API);
})();
