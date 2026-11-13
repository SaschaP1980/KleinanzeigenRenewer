// Security-critical, in-process publication admission and independent outcome
// verification. Retains the exact pre/post account reads and fail-closed receipt
// rules; publication click remains outside this read-only verification module.
(() => {
  'use strict';
  const deps=globalThis.KRDeps;
  if (!deps) throw new Error('KRDeps must load before publish-intent-authorization-service');
  const API=Object.freeze({
    create(options={}) {
      const { readArchiveInsertionSessions, readRenewalSessions, readFillSessions }=options.sessionPort || {};
      const { assertSelectedProfileMatchesLiveAccount, normalizeProfileName }=options.accountPort || {};
      const { createManagedWorkerTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, closeManagedWorkerTab }=options.tabPort || {};
      const { requireAutoPublishIntentJournal }=options.journalPort || {};
      const { MY_ADS_PROJECTS_URL, TAB_LOAD_TIMEOUT_PHASE4_MS, URL }=options.configPort || {};
      if ([readArchiveInsertionSessions, readRenewalSessions, readFillSessions, assertSelectedProfileMatchesLiveAccount, normalizeProfileName, createManagedWorkerTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, closeManagedWorkerTab, requireAutoPublishIntentJournal].some(fn=>typeof fn!=='function') ||
          typeof URL!=='function') {
        throw new Error('KRPublishIntentAuthorizationService requires complete account, journal, receipt and read-only evidence ports');
      }

      async function verifyAutoPublishRemoteOutcomeFresh(intent, newAdId) {
        const deny = () => { throw Object.assign(new Error('KR_PUBLISH_INTENT_UNVERIFIED'),
          {code:'KR_PUBLISH_INTENT_UNVERIFIED'}); };
        if (!intent || !/^\d+$/.test(String(newAdId || ''))
            || String(intent.sourceAdId || '') === String(newAdId) || !intent.workflowId) deny();
        const archive = intent.kind === 'archive';
        const session = archive
          ? (await readArchiveInsertionSessions())[intent.workflowId]
          : (await readRenewalSessions())[intent.workflowId];
        if (!session || session.fillId !== intent.fillId
            || String((archive ? session.targetProfileId : session.profileId) || '') !== intent.profileId
            || String(session.sourceAdId || '') !== intent.sourceAdId
            || Number(session.targetTabId) !== intent.targetTabId) deny();
        const bound = await assertSelectedProfileMatchesLiveAccount({
          expectedProfileId: intent.profileId,
          ...(archive ? {expectedProfileName:String(session.targetProfileName || '')} : {}),
          purpose:'publish-independent-result-verification'
        });
        const expectedName = normalizeProfileName(bound?.displayName || '');
        if (String(bound?.profileId || '') !== intent.profileId || !expectedName) deny();
        let tabId = null;
        try {
          const tab = await createManagedWorkerTab({
            url:MY_ADS_PROJECTS_URL,active:false
          },'publish-independent-presence',{
            ownerType:archive?'archive-insertion':'renewal',ownerId:intent.workflowId,
            fillId:intent.fillId,adId:newAdId,phaseAttemptId:intent.attemptId
          });
          if (!Number.isSafeInteger(tab?.id) || tab.id<=0) deny();
          tabId=tab.id;
          await waitForTabComplete(tabId,{
            timeoutMs:TAB_LOAD_TIMEOUT_PHASE4_MS,purpose:'publish-independent-presence',
            label:'Unabhängige Veröffentlichungsprüfung',operation:'publish-verification',
            context:{fillId:intent.fillId,adId:newAdId,workerTabId:tabId}
          });
          await ensureContentConnection({tabId});
          const normalize=text=>normalizeProfileName(text).toLocaleLowerCase('de-DE');
          const assertStatus=async()=>{
            const status=await sendTabRequestWithBootstrap(tabId,{type:'MY_ADS_STATUS'});
            if(status?.isMyAdsPage!==true||status?.isProjectsTab!==true
                ||!status.profileName||normalize(status.profileName)!==normalize(expectedName))deny();
          };
          await assertStatus();
          const presence=await sendTabRequestWithBootstrap(tabId,{
            type:'FIND_OWN_AD_BY_ID',adId:newAdId,
            correlation:{fillId:intent.fillId,
              ...(archive?{archiveInsertionId:intent.workflowId}:{renewalId:intent.workflowId})}
          });
          await assertStatus(); // Also check account after navigation / full pagination.
          const confirmed = await assertSelectedProfileMatchesLiveAccount({
            expectedProfileId:intent.profileId,purpose:'publish-independent-result-readback'
          });
          if (String(confirmed?.profileId||'')!==intent.profileId
              ||presence?.found!==true||String(presence.adId||'')!==newAdId
              ||presence.evidence!=='found-in-my-ads-full-pagination-scan'
              ||!Number.isSafeInteger(presence.pagesScanned)||presence.pagesScanned<1
              ||!Number.isSafeInteger(presence.page)||presence.page<1
              ||presence.page>presence.pagesScanned)deny();
          return Object.freeze({
            fillId:intent.fillId,workflowId:intent.workflowId,kind:intent.kind,
            profileId:intent.profileId,sourceAdId:intent.sourceAdId,newAdId,
            targetPresent:true,targetEvidence:presence.evidence,
            targetPagesScanned:presence.pagesScanned,targetFoundPage:presence.page
          });
        } finally {
          if(tabId)await closeManagedWorkerTab(tabId).catch(()=>{});
        }
      }
      async function resolveManagedPublishIntent(fill,detected) {
        const fillId=String(fill?.fillId||''),newAdId=String(detected?.adId||'');
        const result=await requireAutoPublishIntentJournal().resolveVerified({fillId,newAdId});
        if(result?.state!=='resolved-confirmed'||result.fillId!==fillId||result.newAdId!==newAdId)
          throw Object.assign(new Error('KR_PUBLISH_INTENT_UNVERIFIED'),{code:'KR_PUBLISH_INTENT_UNVERIFIED'});
        return result;
      }
      async function authorizeAutomaticPublish(message, sender, admissionReceipt) {
        if (!admissionReceipt || !Object.isFrozen(admissionReceipt)
            || admissionReceipt.operationType !== 'AUTHORIZE_AUTOMATIC_PUBLISH')
          throw Object.assign(new Error('KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED'), {code:'KR_PUBLISH_INTENT_ADMISSION_UNVERIFIED'});
        const fillId = String(message?.fillId || '');
        const tabId = Number(sender?.tab?.id || 0);
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(fillId) || !Number.isSafeInteger(tabId) || tabId <= 0)
          throw new Error('KR_PUBLISH_INTENT_IDENTITY');
        // Never trust a claimed page URL from the message body.
        let url;
        try { url = new URL(String(sender?.url || '')); }
        catch { throw new Error('KR_PUBLISH_INTENT_WRONG_PAGE'); }
        if (!['www.kleinanzeigen.de','kleinanzeigen.de'].includes(url.hostname)
            || !url.pathname.startsWith('/p-anzeige-aufgeben'))
          throw new Error('KR_PUBLISH_INTENT_WRONG_PAGE');
        const fill = (await readFillSessions())[fillId];
        if (!fill || String(fill.fillId || '') !== fillId || Number(fill.targetTabId) !== tabId
            || fill.templateOnly || fill.status !== 'running'
            || !['auto-publish-ready','awaiting-publish','awaiting-manual-publish'].includes(fill.stage)
            || fill?.result?.complete !== true || !Array.isArray(fill?.result?.issues)
            || fill.result.issues.length !== 0
            || Boolean(fill.renewalId) === Boolean(fill.archiveInsertionId))
          throw new Error('KR_PUBLISH_INTENT_SESSION_UNVERIFIED');
        const archive = Boolean(fill.archiveInsertionId);
        const workflowId = String(archive ? fill.archiveInsertionId : fill.renewalId);
        const session = archive
          ? (await readArchiveInsertionSessions())[workflowId]
          : (await readRenewalSessions())[workflowId];
        const profileId = String((archive ? session?.targetProfileId : session?.profileId) || '');
        const sourceAdId = String(session?.sourceAdId || '');
        if (!session || !profileId || session.fillId !== fillId
            || Number(session.targetTabId) !== tabId || session.newAdId
            || String(fill.sourceAdId || '') !== sourceAdId
            || (!archive && !/^\d+$/.test(sourceAdId)))
          throw new Error('KR_PUBLISH_INTENT_WORKFLOW_UNVERIFIED');
        const bound = await assertSelectedProfileMatchesLiveAccount({
          expectedProfileId: profileId,
          ...(archive ? {expectedProfileName: String(session.targetProfileName || '')} : {}),
          purpose: 'automatic-publish-preflight'
        });
        if (!bound?.profileId || String(bound.profileId) !== profileId)
          throw new Error('KR_PUBLISH_INTENT_ACCOUNT_UNVERIFIED');
        const entry = await requireAutoPublishIntentJournal().begin({
          fillId, workflowId, kind: archive ? 'archive' : 'renewal',
          profileId, sourceAdId, targetTabId: tabId, admissionReceipt
        });
        // Web Locks serialize journal operations, but cannot freeze the external
        // login while storage I/O is pending. Rebind immediately AFTER the durable
        // receipt and BEFORE returning a usable click permit. A changed account
        // leaves the immutable attempt unresolved and never authorizes publication.
        const afterReceipt = await assertSelectedProfileMatchesLiveAccount({
          expectedProfileId: profileId,
          ...(archive ? {expectedProfileName: String(session.targetProfileName || '')} : {}),
          purpose: 'publish-preclick-account-readback'
        });
        if (String(afterReceipt?.profileId || '') !== profileId)
          throw new Error('KR_PUBLISH_INTENT_ACCOUNT_CHANGED');
        return {authorized:true, receiptId:entry.attemptId};
      }

      return Object.freeze({
        verifyAutoPublishRemoteOutcomeFresh,
        resolveManagedPublishIntent,
        authorizeAutomaticPublish
      });
    }
  });
  deps.register('KRPublishIntentAuthorizationService',API);
})();
