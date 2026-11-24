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
      // Existing callers without the new port retain the legacy roster-only
      // behavior. Production explicitly wires the read-only verification port.
      const direct=options.verificationPort;
      if(direct && (typeof direct.delay!=='function'||typeof direct.onStage!=='function'))
        throw new Error('KRPublishIntentAuthorizationService requires complete direct verification ports');
      function note(stage,result) {
        try { if(direct) Promise.resolve(direct.onStage(Object.freeze({stage,result}))).catch(()=>{}); }
        catch { /* telemetry cannot authorize a result */ }
      }
      const normalizedName=text=>normalizeProfileName(text).toLocaleLowerCase('de-DE');
      function deny(stage) {
        note(stage,'denied');
        throw Object.assign(new Error('KR_PUBLISH_INTENT_UNVERIFIED'),{code:'KR_PUBLISH_INTENT_UNVERIFIED'});
      }
      // Numeric identity and independently extracted page evidence, never
      // a successful navigation or a query parameter alone.
      async function probeDirect(intent,newAdId,expectedName,kind) {
        const edit=kind==='edit';
        const purpose=edit?'publish-independent-edit':'publish-independent-public';
        const url=edit
          ?'https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId='+encodeURIComponent(newAdId)
          :'https://www.kleinanzeigen.de/s-anzeige/'+encodeURIComponent(newAdId);
        let tabId=null;
        note(kind,'begin');
        try {
          const tab=await createManagedWorkerTab({url,active:false},purpose,{
            ownerType:'renewal',ownerId:intent.workflowId,fillId:intent.fillId,adId:newAdId,phaseAttemptId:intent.attemptId
          });
          if(!Number.isSafeInteger(tab?.id)||tab.id<=0)deny(kind+'-tab');
          tabId=tab.id;
          await waitForTabComplete(tabId,{
            timeoutMs:TAB_LOAD_TIMEOUT_PHASE4_MS,purpose,label:'Unabhängige Veröffentlichungsprüfung',
            operation:'publish-verification',context:{fillId:intent.fillId,adId:newAdId,workerTabId:tabId}
          });
          await ensureContentConnection({tabId});
          for(let attempt=0;attempt<3;attempt++){
            const status=await sendTabRequestWithBootstrap(tabId,{
              type:'PAGE_STATUS',...(edit?{publicationEditProof:true}:{publicationPublicProof:true})
            });
            let loaded;
            try { loaded=new URL(String(status?.url||'')); } catch { deny(kind+'-url'); }
            if(loaded.protocol!=='https:'||!['www.kleinanzeigen.de','kleinanzeigen.de'].includes(loaded.hostname))
              deny(kind+'-url');
            const loadedId=edit
              ?(loaded.pathname==='/p-anzeige-bearbeiten.html'?loaded.searchParams.get('adId'):null)
              :(loaded.pathname.match(/^\/s-anzeige\/(?:[^/]+\/)?(\d+)(?:-\d+-\d+)?\/?$/i)?.[1]||null);
            if((loadedId&&loadedId!==newAdId)||(status?.adId&&String(status.adId)!==newAdId))
              deny(kind+'-identity');
            if(edit&&status?.profileName&&normalizedName(status.profileName)!==normalizedName(expectedName))
              deny('edit-account');
            const evidence=edit?status?.publicationEditEvidence:status?.publicationPublicEvidence;
            if(evidence?.state==='identity-conflict'||(evidence?.adId&&evidence.adId!==newAdId))
              deny(kind+'-identity');
            const owned=!edit||(status?.auth?.loggedIn===true&&status?.auth?.ownAd===true
              &&status.auth.evidence==='existing-edit-form'&&status.pageType==='edit'
              &&status.profileName&&normalizedName(status.profileName)===normalizedName(expectedName));
            if(loadedId===newAdId&&status?.adId===newAdId&&owned&&
                evidence?.state==='verified'&&evidence.adId===newAdId){
              note(kind,'verified');return true;
            }
            if(attempt<2)await direct.delay(500);
          }
          note(kind,'not-ready');return false;
        } catch(error) {
          // Unknown or explicitly unsafe transport errors are not "not found".
          if(error?.code==='KR_PUBLISH_INTENT_UNVERIFIED')throw error;
          if(['KR_PLATFORM_ACCESS_RESTRICTED','KR_UPDATE_FENCE_ATOMIC_BUSY'].includes(error?.code))throw error;
          note(kind,'unavailable');return false;
        } finally {
          if(tabId)await closeManagedWorkerTab(tabId).catch(()=>{});
        }
      }
      if ([readArchiveInsertionSessions, readRenewalSessions, readFillSessions, assertSelectedProfileMatchesLiveAccount, normalizeProfileName, createManagedWorkerTab, waitForTabComplete, ensureContentConnection, sendTabRequestWithBootstrap, closeManagedWorkerTab, requireAutoPublishIntentJournal].some(fn=>typeof fn!=='function') ||
          typeof URL!=='function') {
        throw new Error('KRPublishIntentAuthorizationService requires complete account, journal, receipt and read-only evidence ports');
      }

      async function verifyAutoPublishRemoteOutcomeFresh(intent, newAdId) {
        if (!intent || !/^\d+$/.test(String(newAdId || ''))
            || String(intent.sourceAdId || '') === String(newAdId) || !intent.workflowId || !['renewal','archive'].includes(intent.kind)) deny('intent-identity');
        const archive = intent.kind === 'archive';
        const session = archive
          ? (await readArchiveInsertionSessions())[intent.workflowId]
          : (await readRenewalSessions())[intent.workflowId];
        if (!session || session.fillId !== intent.fillId
            || String((archive ? session.targetProfileId : session.profileId) || '') !== intent.profileId
            || String(session.sourceAdId || '') !== intent.sourceAdId
            || Number(session.targetTabId) !== intent.targetTabId) deny('workflow-identity');
        const bound = await assertSelectedProfileMatchesLiveAccount({
          expectedProfileId: intent.profileId,
          ...(archive ? {expectedProfileName:String(session.targetProfileName || '')} : {}),
          purpose:'publish-independent-result-verification'
        });
        const expectedName = normalizeProfileName(bound?.displayName || '');
        if (String(bound?.profileId || '') !== intent.profileId || !expectedName) deny('initial-account');
        let evidence=null;
        // Two independent, positive direct observations are required. A
        // private editable but unpublished/paused ad is not online proof.
        // The original roster route is retained if direct evidence is absent.
        if(direct&&!archive&&await probeDirect(intent,newAdId,expectedName,'edit')
            &&await probeDirect(intent,newAdId,expectedName,'public')){
          evidence={targetEvidence:'verified-edit-and-public-listing',
            targetEditAdId:newAdId,targetPublicAdId:newAdId};
        }
        let tabId = null;
        if(!evidence) try {
          note('my-ads','begin');
          const tab = await createManagedWorkerTab({
            url:MY_ADS_PROJECTS_URL,active:false
          },'publish-independent-presence',{
            ownerType:archive?'archive-insertion':'renewal',ownerId:intent.workflowId,
            fillId:intent.fillId,adId:newAdId,phaseAttemptId:intent.attemptId
          });
          if (!Number.isSafeInteger(tab?.id) || tab.id<=0) deny('my-ads-tab');
          tabId=tab.id;
          await waitForTabComplete(tabId,{
            timeoutMs:TAB_LOAD_TIMEOUT_PHASE4_MS,purpose:'publish-independent-presence',
            label:'Unabhängige Veröffentlichungsprüfung',operation:'publish-verification',
            context:{fillId:intent.fillId,adId:newAdId,workerTabId:tabId}
          });
          await ensureContentConnection({tabId});
          const assertStatus=async(stage,allowReady=false)=>{
            let status=await sendTabRequestWithBootstrap(tabId,{type:'MY_ADS_STATUS'});
            if(status?.isMyAdsPage!==true||status?.isProjectsTab!==true)deny(stage+'-page');
            if(status.profileName&&normalizedName(status.profileName)!==normalizedName(expectedName))
              deny(stage+'-account');
            if(direct&&!archive&&allowReady&&(!status.profileName||
                (Number.isInteger(status.expectedOnline)&&status.expectedOnline>0&&status.listingCount===0))){
              note(stage,'waiting');
              await sendTabRequestWithBootstrap(tabId,{type:'WAIT_FOR_MY_ADS_READY',
                expectedProfileName:expectedName,timeoutMs:5000});
              status=await sendTabRequestWithBootstrap(tabId,{type:'MY_ADS_STATUS'});
            }
            if(status?.isMyAdsPage!==true||status?.isProjectsTab!==true||
                !status.profileName||normalizedName(status.profileName)!==normalizedName(expectedName))
              deny(stage+'-status');
            note(stage,'verified');
          };
          await assertStatus('my-ads-before',true);
          note('my-ads-search','begin');
          const presence=await sendTabRequestWithBootstrap(tabId,{
            type:'FIND_OWN_AD_BY_ID',adId:newAdId,
            expectedProfileName:expectedName,
            correlation:{fillId:intent.fillId,
              ...(archive?{archiveInsertionId:intent.workflowId}:{renewalId:intent.workflowId})}
          });
          await assertStatus('my-ads-after'); // Account after navigation / full pagination.
          if(presence?.found!==true||String(presence.adId||'')!==newAdId
              ||presence.evidence!=='found-in-my-ads-full-pagination-scan'
              ||!Number.isSafeInteger(presence.pagesScanned)||presence.pagesScanned<1
              ||!Number.isSafeInteger(presence.page)||presence.page<1
              ||presence.page>presence.pagesScanned)deny('my-ads-result');
          evidence={targetEvidence:presence.evidence,
            targetPagesScanned:presence.pagesScanned,targetFoundPage:presence.page};
          note('my-ads-search','verified');
        } catch(error) {
          if(error?.code==='KR_PUBLISH_INTENT_UNVERIFIED'||error?.code==='KR_PLATFORM_ACCESS_RESTRICTED')throw error;
          deny('my-ads-unavailable');
        } finally {
          if(tabId)await closeManagedWorkerTab(tabId).catch(()=>{});
        }
        const confirmed = await assertSelectedProfileMatchesLiveAccount({
            expectedProfileId:intent.profileId,purpose:'publish-independent-result-readback'
          });
          // The account can remain logged in while the original workflow
          // changes during a long full-pagination scan. Re-read actual session
          // identity before using the result; a stale fill/Ad ID/tab/profile
          // must never confirm the original publication attempt.
          const latestSession=archive
            ?(await readArchiveInsertionSessions())[intent.workflowId]
            :(await readRenewalSessions())[intent.workflowId];
          if(!latestSession||latestSession.fillId!==intent.fillId
              ||String((archive?latestSession.targetProfileId:latestSession.profileId)||'')!==intent.profileId
              ||String(latestSession.sourceAdId||'')!==intent.sourceAdId
              ||Number(latestSession.targetTabId)!==intent.targetTabId)deny('final-workflow');
          if (String(confirmed?.profileId||'')!==intent.profileId)deny('final-account');
          note('final-binding','verified');
          return Object.freeze({
            fillId:intent.fillId,workflowId:intent.workflowId,kind:intent.kind,
            profileId:intent.profileId,sourceAdId:intent.sourceAdId,newAdId,
            attemptId:intent.attemptId??null,
            workerInstanceId:intent.workerInstanceId??null,
            admissionToken:intent.admissionToken??null,
            targetPresent:true,...evidence
          });
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
