// Conservative template-only publication detector. Uses existing full
// page/ownership evidence; never issues a publish/delete action.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;if(!deps)throw Error('KRDeps must load before trash-template-publish-detection-service');
  const API=Object.freeze({
    create(options={}) {
      const {readFillSessions,writeFillSessions,withTemplateFillMutation}=options.sessionPort||{};
      const {tabRegistry,chrome,TAB_ROLES,registerShadowTab,ensureContentConnection,sendTabRequest}=options.tabPort||{};
      const {publishedAdCandidateFromUrl,URL}=options.evidencePort||{};
      const {logDiagnostic,sessionCorrelationContext,broadcastInventoryChanged}=options.diagnosticsPort||{};
      const {trashTemplatePublishDetectionInFlight}=options.statePort||{};
      if ([readFillSessions,writeFillSessions,withTemplateFillMutation,registerShadowTab,ensureContentConnection,sendTabRequest,publishedAdCandidateFromUrl,logDiagnostic,sessionCorrelationContext,broadcastInventoryChanged].some(fn=>typeof fn!=='function') ||
          !tabRegistry?.getTabOrThrow || !chrome?.tabs || !TAB_ROLES || typeof URL!=='function' ||
          ['has','add','delete'].some(n=>typeof trashTemplatePublishDetectionInFlight?.[n]!=='function'))
        throw Error('KRTrashTemplatePublishDetectionService requires exact-ID, account-proof and emergency-reset ports');

      async function maybeDetectTrashTemplatePublishedAd(tabId, changeInfo = {}, tabHint = null) {
        const id = Number(tabId || 0);
        if (!id || trashTemplatePublishDetectionInFlight.has(id)) return false;
        const candidateUrl = String(changeInfo?.url || tabHint?.url || '');
        if (candidateUrl && !/(^|\.)kleinanzeigen\.de$/i.test((() => { try { return new URL(candidateUrl).hostname; } catch { return ''; } })())) return false;
        const sessions = await readFillSessions().catch(() => ({}));
        const session = Object.values(sessions).find(item => item?.templateOnly === true && Number(item?.targetTabId || 0) === id && String(item?.status || '') === 'complete' && !/^\d+$/.test(String(item?.newAdId || '')));
        if (!session) return false;

        trashTemplatePublishDetectionInFlight.add(id);
        try {
          const tab = tabHint?.id ? tabHint : await tabRegistry.getTabOrThrow(id, chrome.tabs, { label: 'Vorlagen-Tab', role: TAB_ROLES.TEMPLATE_TARGET, owner: { ownerType: 'trash-template', ownerId: session.fillId } });
          const directCandidate = publishedAdCandidateFromUrl(changeInfo?.url || tab?.url || '', session.sourceAdId);
          if (!directCandidate && changeInfo?.status !== 'complete') return false;
          await ensureContentConnection({ tabId: id });
          const [pageStatus, detected] = await Promise.all([
            sendTabRequest(id, { type: 'PAGE_STATUS' }).catch(() => null),
            sendTabRequest(id, { type: 'DETECT_PUBLISHED_AD', sourceAdId: session.sourceAdId }).catch(() => null)
          ]);
          const adId = String(detected?.adId || directCandidate?.adId || pageStatus?.adId || '');
          if (!/^\d+$/.test(adId) || adId === String(session.sourceAdId || '')) return false;
          const owned = pageStatus?.auth?.loggedIn === true && pageStatus?.auth?.ownAd === true;
          const pageAdId = String(pageStatus?.adId || '');
          if (!owned || (pageAdId && pageAdId !== adId)) return false;
          const publishedUrl = String(detected?.publicUrl || directCandidate?.publicUrl || (directCandidate?.kind === 'public' ? directCandidate.url : '') || tab?.url || '');

          let updated = null;
          await withTemplateFillMutation(async () => {
            const latest = await readFillSessions();
            const current = latest[session.fillId];
            if (!current?.templateOnly || Number(current.targetTabId || 0) !== id || /^\d+$/.test(String(current.newAdId || ''))) return;
            current.newAdId = adId;
            current.publishedUrl = publishedUrl || null;
            current.publishedAt = new Date().toISOString();
            current.stage = 'template-only-published';
            current.updatedAt = current.publishedAt;
            latest[current.fillId] = current;
            await writeFillSessions(latest);
            updated = current;
          });
          if (!updated) return false;
          await registerShadowTab(id, TAB_ROLES.TEMPLATE_TARGET, { operationId: updated.operationId || null, fillId: updated.fillId, inventoryId: String(updated.inventoryId || ''), adId, ownerType: 'trash-template', ownerId: updated.fillId });
          await logDiagnostic('info', 'TRASH_TEMPLATE_PUBLISHED_DETECTED', {
            operationId: updated.operationId || null,
            fillId: updated.fillId,
            sourceAdId: updated.sourceAdId || null,
            newAdId: adId,
            targetTabId: id,
            publishedUrl: publishedUrl || null
          }, { module: 'background', operation: 'trash-template-publish-detection', context: sessionCorrelationContext(updated, { adId, targetTabId: id }) }).catch(() => {});
          broadcastInventoryChanged('trash-template-published', { fillId: updated.fillId, inventoryId: updated.inventoryId || null, sourceAdId: updated.sourceAdId || null, newAdId: adId, targetTabId: id });
          return true;
        } finally {
          trashTemplatePublishDetectionInFlight.delete(id);
        }
      }

      return Object.freeze({maybeDetectTrashTemplatePublishedAd});
    }
  });
  deps.register('KRTrashTemplatePublishDetectionService',API);
})();
