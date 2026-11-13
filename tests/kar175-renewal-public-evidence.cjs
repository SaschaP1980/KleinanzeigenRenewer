'use strict';
// KAR-175 Wave 3: public-boundary characterization with inert Chrome tabs.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {webcrypto}=require('node:crypto');
const source=fs.readFileSync('src/background/services/renewal-public-evidence-coordinator.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
const pack=fs.readFileSync('scripts/package.py','utf8');
let owner=null;
vm.runInNewContext(source,{KRDeps:{register(k,x){assert.equal(k,'KRRenewalPublicEvidenceCoordinator');assert.equal(owner,null);owner=x;}}});
assert.equal(typeof owner?.create,'function');
assert.throws(()=>owner.create(),/requires trusted/);
assert.match(bg,/return requireRenewalPublicEvidenceCoordinator\(\)\.resolveRenewalPublicEvidence\(newAdId, expectedProfileName, correlation\)/);
assert.match(bg,/return requireRenewalPublicEvidenceCoordinator\(\)\.probeFreshRenewalPublicUrl\(url, expectedAdId, publicUrlVariant, timeoutMs, correlation\)/);
assert.match(pack,/src\/background\/services\/renewal-public-evidence-coordinator\.js/);
let next=100,mode='ready',profile='Account One',failedPlatform=false;
const tabUrls=new Map(),events=[],created=[],closed=[],requests=[];
const options={
  tabPort:{
    assertPlatformAccessAllowed:async()=>{if(failedPlatform){const error=Error('platform access restricted');error.code='KR_PLATFORM_ACCESS_RESTRICTED';throw error;}},
    tabLoadSignalVersion:()=>1,waitForTabLoadSignal:async()=>{},
    kleinanzeigenTabMeta:()=>({}),normalBrowserWindowId:async()=>5,
    createAutomationTab:async opts=>{const id=++next;created.push(opts);tabUrls.set(id,opts.url);return {id};},
    registerManagedWorkerTab:async()=>{},
    updateAutomationTab:async(id,v)=>{tabUrls.set(id,v.url);},
    closeManagedWorkerTab:async id=>{closed.push(id);tabUrls.delete(id);},
    waitForExpectedTabComplete:async()=>{},
    ensureContentConnection:async()=>{},
    sendTabRequestWithBootstrap:async (id,msg)=>{
      requests.push(msg.type);
      if(msg.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:profile};
      if(msg.type==='FIND_OWN_AD_BY_ID')return {found:false,adId:msg.adId,page:1};
      throw Error('unexpected message');
    },
    tabRegistry:{getTabOrThrow:async id=>({id,url:tabUrls.get(id)})},
    chrome:{tabs:{get:async id=>({id,url:tabUrls.get(id)})}},
    ManagedNavigation:{STATES:{READY:'ready',OFF_TARGET:'off-target'},
      assessPublicAd:tab=>({state:mode==='ready'?'ready':'off-target',
        observedAdId:mode==='ready'?'123':'999',reason:'fixture',currentUrl:tab.url})}
  },
  diagnosticsPort:{
    logDiagnostic:async(_level,event)=>{events.push(event);},
    correlationContext:x=>x||{},
    sessionCorrelationContext:(_ctx,x)=>x||{}
  },
  policyPort:{
    renewalAttemptState:()=>({attempt:1}),
    isNonRetryableRenewalSafetyError:e=>e?.code==='KR_PLATFORM_ACCESS_RESTRICTED',
    normalizeProfileName:x=>String(x||'').trim()
  },
  evidencePort:{
    extractReadOnlyMetadata:async()=>({ok:true,metadata:{sourceUrl:'https://www.kleinanzeigen.de/s-anzeige/test/123'},durationMs:2}),
    normalizeKnownPublicAdUrl:x=>String(x||''),
    directPublicUrlForAdId:id=>'https://www.kleinanzeigen.de/s-anzeige/direct/'+id
  },
  configPort:{
    TAB_LOAD_TIMEOUT_RENEWAL_MS:1000,TAB_LOAD_SAFETY_POLL_MS:20,
    RENEWAL_PUBLIC_READONLY_READINESS_TIMEOUT_MS:500,READONLY_METADATA_TIMEOUT_MS:500,
    RENEWAL_DIRECT_READONLY_TIMEOUT_MS:250,
    MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS'
  }
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc).sort(),['probeFreshRenewalPublicUrl','renewalEvidenceFailureClass','resolveRenewalPublicEvidence']);
(async()=>{
  assert.equal(svc.renewalEvidenceFailureClass([{verificationClass:'off-target'}]),'off-target');
  assert.equal(svc.renewalEvidenceFailureClass([{verificationClass:'transient-navigation-failure'},{verificationClass:'off-target'}]),'transient-navigation-failure');
  const good=await svc.probeFreshRenewalPublicUrl('https://www.kleinanzeigen.de/s-anzeige/test/123','123','canonical');
  assert.equal(good.ok,true);assert.equal(good.verificationClass,'confirmed');assert.equal(good.freshTab,true);
  assert.equal(created[0].url,'about:blank','fresh tab must be created inert');
  assert.equal(closed.length,1,'successful public proof must close worker tab');
  mode='off-target';
  const bad=await svc.probeFreshRenewalPublicUrl('https://www.kleinanzeigen.de/s-anzeige/test/123','123','canonical');
  assert.equal(bad.ok,false);assert.equal(bad.verificationClass,'off-target');
  assert.equal(closed.length,2,'off-target public probe must clean up');
  const unresolved=await svc.resolveRenewalPublicEvidence('123','Account One',{newPublicUrl:'https://www.kleinanzeigen.de/s-anzeige/test/123'});
  assert.equal(unresolved.verificationClass,'off-target');
  assert.equal(unresolved.ownAdsPresence,false);
  assert.equal(unresolved.method,'public-unresolved');
  assert.ok(requests.includes('FIND_OWN_AD_BY_ID'));
  assert.equal(created.length,closed.length,'all public and my-ads workers must close');
  profile='Other Account';
  const mismatch=await svc.resolveRenewalPublicEvidence('123','Account One',{newPublicUrl:''});
  assert.equal(mismatch.myAds.found,null,'wrong account must never claim verified own-ads');
  assert.equal(mismatch.verificationClass,'off-target');
  assert.equal(created.length,closed.length,'wrong-account My Ads tab must close');
  failedPlatform=true;
  await assert.rejects(svc.probeFreshRenewalPublicUrl('https://www.kleinanzeigen.de/s-anzeige/test/123','123','canonical'),/platform access restricted/);
  assert.equal(created.length,closed.length,'platform restriction must still close fresh tab');
  assert.ok(events.includes('RENEWAL_PUBLIC_VERIFICATION_CONFIRMED'));
  assert.ok(events.includes('RENEWAL_PUBLIC_TARGET_OFF_TARGET'));
  console.log('PASS KAR-175 Wave 3: fresh-tab exact-ID proof, off-target, account mismatch, uncertainty and platform fail-closed cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
