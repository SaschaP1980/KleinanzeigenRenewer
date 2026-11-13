// In-process owner for read-only renewal public evidence and fresh-tab lifecycle.
// All receipt, account and off-target safety decisions are the original proven
// implementations. The entrypoint only composes their trusted existing ports.
(() => {
  'use strict';
  const deps = globalThis.KRDeps;
  if (!deps) throw new Error('KRDeps must load before renewal-public-evidence-coordinator');
  const API = Object.freeze({
    create(options = {}) {
      const { assertPlatformAccessAllowed, tabLoadSignalVersion, waitForTabLoadSignal, kleinanzeigenTabMeta, normalBrowserWindowId, createAutomationTab, registerManagedWorkerTab, updateAutomationTab, closeManagedWorkerTab, waitForExpectedTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, tabRegistry, chrome, ManagedNavigation } = options.tabPort || {};
      const { logDiagnostic, correlationContext, sessionCorrelationContext } = options.diagnosticsPort || {};
      const { renewalAttemptState, isNonRetryableRenewalSafetyError, normalizeProfileName } = options.policyPort || {};
      const { extractReadOnlyMetadata, normalizeKnownPublicAdUrl, directPublicUrlForAdId } = options.evidencePort || {};
      const { TAB_LOAD_TIMEOUT_RENEWAL_MS, TAB_LOAD_SAFETY_POLL_MS, RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS, READONLY_METADATA_TIMEOUT_MS, RENEWAL_DIRECT_READONLY_TIMEOUT_MS, MY_ADS_PROJECTS_URL } = options.configPort || {};

      if ([assertPlatformAccessAllowed, tabLoadSignalVersion, waitForTabLoadSignal, kleinanzeigenTabMeta, normalBrowserWindowId, createAutomationTab, registerManagedWorkerTab, updateAutomationTab, closeManagedWorkerTab, waitForExpectedTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, logDiagnostic, correlationContext, sessionCorrelationContext, renewalAttemptState, isNonRetryableRenewalSafetyError, normalizeProfileName, extractReadOnlyMetadata, normalizeKnownPublicAdUrl, directPublicUrlForAdId].some(fn => typeof fn !== 'function') ||
          !tabRegistry || !chrome?.tabs || !ManagedNavigation?.assessPublicAd) {
        throw new Error('KRRenewalPublicEvidenceCoordinator requires trusted tab, account, navigation and read-only evidence ports');
      }

      async function waitForRenewalPublicAdComplete(tabId, expectedAdId, options = {}) {
        const timeoutMs = Math.max(1000, Number(options.timeoutMs || TAB_LOAD_TIMEOUT_RENEWAL_MS));
        const purpose = String(options.purpose || 'renewal-public-verification').slice(0, 80);
        const label = String(options.label || 'Öffentlicher Renewal-Prüftab').slice(0, 120);
        const operation = String(options.operation || 'renewal-public-verification').slice(0, 80);
        const context = options.context && typeof options.context === 'object' ? options.context : { tabId };
        const started = Date.now();
        const deadline = started + timeoutMs;
        let lastAssessment = null;
        while (Date.now() < deadline) {
          await assertPlatformAccessAllowed({ operation, context });
          const observedVersion = tabLoadSignalVersion(tabId);
          const tab = await tabRegistry.getTabOrThrow(tabId, chrome.tabs, { label });
          const assessment = ManagedNavigation.assessPublicAd(tab, expectedAdId);
          lastAssessment = assessment;
          if (assessment.state === ManagedNavigation.STATES.READY) {
            await logDiagnostic('info', 'RENEWAL_PUBLIC_TARGET_LOAD_TIMING', {
              tabId,
              expectedAdId: String(expectedAdId || ''),
              observedAdId: assessment.observedAdId || null,
              purpose,
              durationMs: Date.now() - started,
              timeoutMs,
              navigationReason: assessment.reason,
              ...kleinanzeigenTabMeta(tab)
            }, { module: 'background', operation, context }).catch(() => {});
            return tab;
          }
          if (assessment.state === ManagedNavigation.STATES.OFF_TARGET) {
            const error = new Error(`${label} hat nicht die erwartete öffentliche Anzeige erreicht.`);
            error.code = 'KR_RENEWAL_PUBLIC_OFF_TARGET';
            error.verificationClass = 'off-target';
            error.navigationReason = assessment.reason;
            error.currentUrl = assessment.currentUrl || assessment.pendingUrl || '';
            error.observedAdId = assessment.observedAdId || '';
            await logDiagnostic('warning', 'RENEWAL_PUBLIC_TARGET_OFF_TARGET', {
              tabId,
              expectedAdId: String(expectedAdId || ''),
              observedAdId: error.observedAdId || null,
              purpose,
              durationMs: Date.now() - started,
              navigationReason: assessment.reason,
              currentUrl: String(error.currentUrl || '').slice(0, 1200),
              ...kleinanzeigenTabMeta(tab)
            }, { module: 'background', operation, context }).catch(() => {});
            throw error;
          }
          const remainingMs = Math.max(1, deadline - Date.now());
          await waitForTabLoadSignal(tabId, observedVersion, Math.min(TAB_LOAD_SAFETY_POLL_MS, remainingMs));
        }
        const lastTab = await chrome.tabs.get(tabId).catch(() => null);
        const error = new Error(`${label} wurde nicht rechtzeitig auf der erwarteten öffentlichen Anzeige vollständig geladen.`);
        error.code = 'KR_RENEWAL_PUBLIC_TIMEOUT';
        error.verificationClass = 'temporarily-unavailable';
        error.navigationReason = lastAssessment?.reason || 'timeout';
        error.currentUrl = String(lastTab?.url || '');
        await logDiagnostic('warning', 'RENEWAL_PUBLIC_TARGET_TIMEOUT', {
          tabId,
          expectedAdId: String(expectedAdId || ''),
          purpose,
          durationMs: Date.now() - started,
          timeoutMs,
          navigationReason: error.navigationReason,
          ...(lastTab ? kleinanzeigenTabMeta(lastTab) : {})
        }, { module: 'background', operation, context }).catch(() => {});
        throw error;
      }

      function renewalVerificationAttemptNumber(correlation = {}) {
        return Math.max(1, Number(renewalAttemptState(correlation, 3).attempt || 1));
      }

      function classifyRenewalVerificationFailure(error) {
        if (isNonRetryableRenewalSafetyError(error)) return 'platform-restricted';
        const code = String(error?.code || '');
        if (code === 'KR_RENEWAL_PUBLIC_OFF_TARGET' || code === 'KR_TAB_NAVIGATION_OFF_TARGET') return 'off-target';
        if (code === 'KR_RENEWAL_PUBLIC_TIMEOUT' || code === 'KR_TAB_NAVIGATION_TIMEOUT') return 'temporarily-unavailable';
        const text = String(error?.message || error || '');
        if (/Navigation rejected|No tab with id|Receiving end does not exist|Could not establish connection|message port closed|message channel closed/i.test(text)) return 'transient-navigation-failure';
        return String(error?.verificationClass || 'temporarily-unavailable');
      }

      async function createFreshRenewalVerificationTab(targetUrl, newAdId, publicUrlVariant, correlation = {}, { purpose = 'public' } = {}) {
        const requestedUrl = String(targetUrl || '');
        if (!requestedUrl) throw new Error('Ziel-URL der Renewal-Verifikation fehlt.');
        const verificationAttempt = renewalVerificationAttemptNumber(correlation);
        const windowId = await normalBrowserWindowId();
        const tab = await createAutomationTab({ ...(windowId ? { windowId } : {}), url: 'about:blank', active: false });
        if (!tab?.id) throw new Error('Frischer Renewal-Verifikationstab konnte nicht geöffnet werden.');
        const owner = {
          ...correlationContext(correlation),
          ownerType: purpose === 'public' ? 'renewal-public-verification' : 'renewal-my-ads-verification',
          ownerId: correlation?.renewalId || correlation?.operationId || newAdId,
          adId: String(newAdId || ''),
          verificationAttempt,
          publicUrlVariant: String(publicUrlVariant || purpose)
        };
        await registerManagedWorkerTab(tab.id, purpose === 'public' ? 'renewal-public-verification' : 'renewal-my-ads-verification', owner);
        await logDiagnostic('info', 'RENEWAL_VERIFICATION_TAB_CREATED', {
          newAdId: String(newAdId || ''),
          workerTabId: tab.id,
          verificationAttempt,
          purpose,
          publicUrlVariant: String(publicUrlVariant || purpose),
          requestedUrl,
          freshTab: true,
          initialUrl: 'about:blank'
        }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
        try {
          await updateAutomationTab(tab.id, { url: requestedUrl });
          await logDiagnostic('info', 'RENEWAL_VERIFICATION_NAVIGATION_REQUESTED', {
            newAdId: String(newAdId || ''),
            workerTabId: tab.id,
            verificationAttempt,
            purpose,
            publicUrlVariant: String(publicUrlVariant || purpose),
            requestedUrl,
            freshTab: true
          }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
          return { tabId: tab.id, requestedUrl, verificationAttempt, purpose, publicUrlVariant: String(publicUrlVariant || purpose) };
        } catch (error) {
          const verificationClass = classifyRenewalVerificationFailure(error);
          await logDiagnostic(isNonRetryableRenewalSafetyError(error) ? 'error' : 'warning', 'RENEWAL_VERIFICATION_NAVIGATION_REJECTED', {
            newAdId: String(newAdId || ''),
            workerTabId: tab.id,
            verificationAttempt,
            purpose,
            publicUrlVariant: String(publicUrlVariant || purpose),
            requestedUrl,
            freshTab: true,
            verificationClass,
            message: String(error?.message || error || '').slice(0, 500)
          }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tab.id }) }).catch(() => {});
          error.verificationClass = verificationClass;
          await closeFreshRenewalVerificationTab({
            tabId: tab.id,
            verificationAttempt,
            purpose,
            publicUrlVariant: String(publicUrlVariant || purpose)
          }, newAdId, correlation, isNonRetryableRenewalSafetyError(error) ? 'navigation-safety-stop' : 'navigation-request-failed').catch(() => {});
          throw error;
        }
      }

      async function closeFreshRenewalVerificationTab(tabInfo, newAdId, correlation = {}, reason = 'verification-finished') {
        const tabId = Number(tabInfo?.tabId || 0);
        if (!tabId) return;
        await logDiagnostic('info', 'RENEWAL_VERIFICATION_TAB_CLOSED', {
          newAdId: String(newAdId || ''),
          workerTabId: tabId,
          verificationAttempt: tabInfo?.verificationAttempt ?? renewalVerificationAttemptNumber(correlation),
          purpose: tabInfo?.purpose || null,
          publicUrlVariant: tabInfo?.publicUrlVariant || null,
          freshTab: true,
          reason
        }, { module: 'background', operation: 'renewal-verification-navigation', context: sessionCorrelationContext(correlation, { adId: String(newAdId || ''), workerTabId: tabId }) }).catch(() => {});
        await closeManagedWorkerTab(tabId).catch(() => {});
      }

      async function waitForRenewalPublicReadOnlyReady(tabId, expectedAdId, timeoutMs = RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS, correlation = {}) {
        const started = Date.now();
        const effectiveTimeoutMs = Math.max(READONLY_METADATA_TIMEOUT_MS, Number(timeoutMs || RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS));
        const context = sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: Number(tabId || 0) || null });
        const result = await extractReadOnlyMetadata(tabId, expectedAdId, effectiveTimeoutMs, { silentFailures: true });
        if (result.ok) {
          await logDiagnostic('info', 'RENEWAL_PUBLIC_READONLY_READY', {
            newAdId: String(expectedAdId || ''),
            workerTabId: Number(tabId || 0) || null,
            durationMs: result.durationMs ?? (Date.now() - started),
            timeoutMs: effectiveTimeoutMs,
            sameFreshTab: true
          }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
          return result;
        }
        await logDiagnostic('warning', 'RENEWAL_PUBLIC_READONLY_TIMEOUT', {
          newAdId: String(expectedAdId || ''),
          workerTabId: Number(tabId || 0) || null,
          durationMs: result.durationMs ?? (Date.now() - started),
          timeoutMs: effectiveTimeoutMs,
          sameFreshTab: true,
          message: String(result.error || 'Read-only-Metadaten wurden nicht rechtzeitig erkannt.').slice(0, 500)
        }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
        return result;
      }

      async function probeFreshRenewalPublicUrl(url, expectedAdId, publicUrlVariant, timeoutMs = READONLY_METADATA_TIMEOUT_MS, correlation = {}) {
        let tabInfo = null;
        try {
          tabInfo = await createFreshRenewalVerificationTab(url, expectedAdId, publicUrlVariant, correlation, { purpose: 'public' });
          const context = sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: tabInfo.tabId });
          await waitForRenewalPublicAdComplete(tabInfo.tabId, expectedAdId, {
            timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS,
            purpose: `renewal-public-${publicUrlVariant}`,
            label: 'Öffentlicher Renewal-Prüftab',
            operation: 'renewal-public-verification',
            context
          });
          await ensureContentConnection({ tabId: tabInfo.tabId });
          const result = await waitForRenewalPublicReadOnlyReady(tabInfo.tabId, expectedAdId, Math.max(timeoutMs, RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS), correlation);
          const finalTab = await chrome.tabs.get(tabInfo.tabId).catch(() => null);
          const finalAssessment = ManagedNavigation.assessPublicAd(finalTab || {}, expectedAdId);
          if (!result.ok || finalAssessment.state !== ManagedNavigation.STATES.READY) {
            const verificationClass = finalAssessment.state === ManagedNavigation.STATES.OFF_TARGET ? 'off-target' : 'temporarily-unavailable';
            const failure = {
              ...result,
              ok: false,
              requestedUrl: String(url),
              finalUrl: String(finalTab?.url || ''),
              observedAdId: finalAssessment.observedAdId || null,
              verificationClass,
              publicUrlVariant,
              workerTabId: tabInfo.tabId,
              freshTab: true
            };
            await logDiagnostic('warning', 'RENEWAL_PUBLIC_VERIFICATION_UNRESOLVED', {
              newAdId: String(expectedAdId || ''),
              workerTabId: tabInfo.tabId,
              verificationAttempt: tabInfo.verificationAttempt,
              publicUrlVariant,
              requestedUrl: String(url),
              finalUrl: failure.finalUrl,
              observedAdId: failure.observedAdId,
              verificationClass,
              message: String(result.error || 'Read-only-Metadaten wurden nicht eindeutig bestätigt.').slice(0, 500),
              freshTab: true
            }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
            return failure;
          }
          const resolvedUrl = normalizeKnownPublicAdUrl(result.metadata?.sourceUrl || finalTab?.url || '', expectedAdId) || '';
          const verified = {
            ...result,
            ok: true,
            requestedUrl: String(url),
            finalUrl: String(finalTab?.url || ''),
            observedAdId: finalAssessment.observedAdId || String(expectedAdId),
            verificationClass: 'confirmed',
            publicUrlVariant,
            workerTabId: tabInfo.tabId,
            freshTab: true,
            resolvedUrl
          };
          await logDiagnostic('info', 'RENEWAL_PUBLIC_VERIFICATION_CONFIRMED', {
            newAdId: String(expectedAdId || ''),
            workerTabId: tabInfo.tabId,
            verificationAttempt: tabInfo.verificationAttempt,
            publicUrlVariant,
            requestedUrl: String(url),
            finalUrl: verified.finalUrl,
            resolvedUrl: resolvedUrl || null,
            observedAdId: verified.observedAdId,
            durationMs: result.durationMs ?? null,
            freshTab: true
          }, { module: 'background', operation: 'renewal-public-verification', context }).catch(() => {});
          return verified;
        } catch (error) {
          if (isNonRetryableRenewalSafetyError(error)) throw error;
          const verificationClass = classifyRenewalVerificationFailure(error);
          const finalTab = tabInfo?.tabId ? await chrome.tabs.get(tabInfo.tabId).catch(() => null) : null;
          await logDiagnostic('warning', 'RENEWAL_PUBLIC_VERIFICATION_FAILED', {
            newAdId: String(expectedAdId || ''),
            workerTabId: tabInfo?.tabId || null,
            verificationAttempt: tabInfo?.verificationAttempt || renewalVerificationAttemptNumber(correlation),
            publicUrlVariant,
            requestedUrl: String(url),
            finalUrl: String(finalTab?.url || ''),
            verificationClass,
            message: String(error?.message || error || '').slice(0, 500),
            freshTab: true
          }, { module: 'background', operation: 'renewal-public-verification', context: sessionCorrelationContext(correlation, { adId: String(expectedAdId || ''), workerTabId: tabInfo?.tabId || null }) }).catch(() => {});
          return {
            ok: false,
            metadata: null,
            durationMs: 0,
            requestedUrl: String(url),
            finalUrl: String(finalTab?.url || ''),
            error: String(error?.message || error || '').slice(0, 500),
            verificationClass,
            publicUrlVariant,
            workerTabId: tabInfo?.tabId || null,
            freshTab: true
          };
        } finally {
          if (tabInfo?.tabId) await closeFreshRenewalVerificationTab(tabInfo, expectedAdId, correlation, 'public-verification-finished');
        }
      }

      async function findRenewalAdInMyAdsFresh(adId, expectedProfileName, correlation = {}) {
        let tabInfo = null;
        try {
          tabInfo = await createFreshRenewalVerificationTab(MY_ADS_PROJECTS_URL, adId, 'my-ads', correlation, { purpose: 'my-ads' });
          const context = sessionCorrelationContext(correlation, { adId: String(adId || ''), workerTabId: tabInfo.tabId });
          await waitForExpectedTabComplete(tabInfo.tabId, MY_ADS_PROJECTS_URL, {
            timeoutMs: TAB_LOAD_TIMEOUT_RENEWAL_MS,
            purpose: 'renewal-my-ads-fresh',
            label: 'Frischer „Meine Anzeigen“-Prüftab',
            operation: 'renewal-my-ads-fallback',
            context
          });
          await ensureContentConnection({ tabId: tabInfo.tabId });
          const status = await sendTabRequestWithBootstrap(tabInfo.tabId, { type: 'MY_ADS_STATUS' });
          if (!status?.isMyAdsPage || !status?.isProjectsTab) throw new Error('„Meine Anzeigen“-Fallback befindet sich nicht eindeutig im PROJECTS-Tab.');
          const expectedProfile = normalizeProfileName(expectedProfileName || '');
          const actualProfile = normalizeProfileName(status?.profileName || '');
          if (expectedProfile) {
            if (!actualProfile) throw new Error('Das Kleinanzeigen-Konto konnte beim „Meine Anzeigen“-Fallback nicht eindeutig erkannt werden.');
            if (expectedProfile.toLocaleLowerCase('de-DE') !== actualProfile.toLocaleLowerCase('de-DE')) {
              throw new Error('Der „Meine Anzeigen“-Fallback ist mit einem anderen Kleinanzeigen-Konto angemeldet.');
            }
          }
          const result = await sendTabRequestWithBootstrap(tabInfo.tabId, { type: 'FIND_OWN_AD_BY_ID', adId: String(adId), correlation: correlationContext(correlation) });
          await logDiagnostic(result?.found ? 'info' : 'warning', result?.found ? 'RENEWAL_MY_ADS_FRESH_FOUND' : 'RENEWAL_MY_ADS_FRESH_NOT_FOUND', {
            newAdId: String(adId || ''),
            workerTabId: tabInfo.tabId,
            verificationAttempt: tabInfo.verificationAttempt,
            found: Boolean(result?.found),
            page: result?.page ?? null,
            pagesScanned: result?.pagesScanned ?? null,
            publicUrl: result?.publicUrl || null,
            freshTab: true
          }, { module: 'background', operation: 'renewal-my-ads-fallback', context }).catch(() => {});
          return { ...result, profileName: actualProfile || null, workerTabId: tabInfo.tabId, freshTab: true };
        } finally {
          if (tabInfo?.tabId) await closeFreshRenewalVerificationTab(tabInfo, adId, correlation, 'my-ads-verification-finished');
        }
      }

      function renewalEvidenceFailureClass(results = []) {
        const classes = results.map(item => String(item?.verificationClass || '')).filter(Boolean);
        if (classes.includes('transient-navigation-failure')) return 'transient-navigation-failure';
        if (classes.includes('off-target')) return 'off-target';
        return 'temporarily-unavailable';
      }

      async function resolveRenewalPublicEvidence(newAdId, expectedProfileName, correlation = {}) {
        const knownPublicUrl = String(correlation?.newPublicUrl || '');
        const canonicalKnownUrl = normalizeKnownPublicAdUrl(knownPublicUrl, newAdId);
        const directIdUrl = directPublicUrlForAdId(newAdId);
        const attempts = [];

        if (canonicalKnownUrl) {
          const canonical = await probeFreshRenewalPublicUrl(canonicalKnownUrl, newAdId, 'canonical', RENEWAL_DIRECT_READONLY_TIMEOUT_MS, correlation);
          attempts.push(canonical);
          if (canonical.ok) {
            return { readOnlyResult: canonical, publicUrl: canonical.resolvedUrl || canonicalKnownUrl, ownAdsPresence: null, myAds: null, method: 'canonical-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
          }
        }

        if (directIdUrl) {
          const idDirect = await probeFreshRenewalPublicUrl(directIdUrl, newAdId, 'id-direct', READONLY_METADATA_TIMEOUT_MS, correlation);
          attempts.push(idDirect);
          if (idDirect.ok) {
            return { readOnlyResult: idDirect, publicUrl: idDirect.resolvedUrl || canonicalKnownUrl || '', ownAdsPresence: null, myAds: null, method: 'id-direct-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
          }
        }

        let myAds = null;
        try {
          myAds = await findRenewalAdInMyAdsFresh(newAdId, expectedProfileName, correlation);
        } catch (error) {
          if (isNonRetryableRenewalSafetyError(error)) throw error;
          const verificationClass = classifyRenewalVerificationFailure(error);
          await logDiagnostic('warning', 'RENEWAL_MY_ADS_FRESH_FAILED', {
            newAdId,
            verificationAttempt: renewalVerificationAttemptNumber(correlation),
            verificationClass,
            message: String(error?.message || error || '').slice(0, 500),
            freshTab: true
          }, { module: 'background', operation: 'renewal-my-ads-fallback', context: sessionCorrelationContext(correlation, { adId: newAdId }) }).catch(() => {});
          const fallbackResult = attempts.at(-1) || { ok: false, metadata: null, durationMs: 0, error: String(error?.message || error || '') };
          return {
            readOnlyResult: fallbackResult,
            publicUrl: canonicalKnownUrl || '',
            ownAdsPresence: null,
            myAds: { found: null, error: String(error?.message || error || '').slice(0, 500) },
            method: 'fresh-public+my-ads-error',
            verificationClass: verificationClass === 'platform-restricted' ? verificationClass : renewalEvidenceFailureClass([...attempts, { verificationClass }]),
            publicAttempts: attempts
          };
        }

        const myAdsPublicUrl = normalizeKnownPublicAdUrl(myAds?.publicUrl || '', newAdId);
        if (myAds?.found && myAdsPublicUrl && myAdsPublicUrl !== canonicalKnownUrl) {
          const myAdsCanonical = await probeFreshRenewalPublicUrl(myAdsPublicUrl, newAdId, 'my-ads-canonical', READONLY_METADATA_TIMEOUT_MS, correlation);
          attempts.push(myAdsCanonical);
          if (myAdsCanonical.ok) {
            return { readOnlyResult: myAdsCanonical, publicUrl: myAdsCanonical.resolvedUrl || myAdsPublicUrl, ownAdsPresence: true, myAds, method: 'my-ads-canonical-fresh', verificationClass: 'confirmed', publicAttempts: attempts };
          }
        }

        const verificationClass = renewalEvidenceFailureClass(attempts);
        const lastPublic = attempts.at(-1) || { ok: false, metadata: null, durationMs: 0, error: 'Öffentliche Verifikation lieferte kein eindeutiges Ergebnis.', verificationClass };
        await logDiagnostic('warning', 'RENEWAL_PUBLIC_EVIDENCE_UNRESOLVED', {
          newAdId,
          verificationAttempt: renewalVerificationAttemptNumber(correlation),
          verificationClass,
          ownAdsPresence: myAds?.found === true ? true : (myAds?.found === false ? false : null),
          myAdsPage: myAds?.page ?? null,
          publicAttemptCount: attempts.length,
          publicUrlVariants: attempts.map(item => item.publicUrlVariant).filter(Boolean),
          freshTabsOnly: attempts.every(item => item.freshTab === true)
        }, { module: 'background', operation: 'renewal-public-verification', context: sessionCorrelationContext(correlation, { adId: newAdId }) }).catch(() => {});
        return {
          readOnlyResult: lastPublic,
          publicUrl: myAdsPublicUrl || canonicalKnownUrl || '',
          ownAdsPresence: myAds?.found === true ? true : (myAds?.found === false ? false : null),
          myAds,
          method: myAds?.found ? 'my-ads-found-public-unresolved' : 'public-unresolved',
          verificationClass,
          publicAttempts: attempts
        };
      }

      return Object.freeze({
        probeFreshRenewalPublicUrl,
        renewalEvidenceFailureClass,
        resolveRenewalPublicEvidence
      });
    }
  });
  deps.register('KRRenewalPublicEvidenceCoordinator', API);
})();
