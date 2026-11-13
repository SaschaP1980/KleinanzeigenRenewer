'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('src/background/services/publish-intent-authorization-service.js','utf8'),bg=fs.readFileSync('src/background/background.js','utf8');
let owner=null;
vm.runInNewContext(src,{KRDeps:{register(n,x){assert.equal(n,'KRPublishIntentAuthorizationService');owner=x;}}});
assert.throws(()=>owner.create({}),/requires complete/);
for(const fn of ['authorizeAutomaticPublish','resolveManagedPublishIntent','verifyAutoPublishRemoteOutcomeFresh']){
  assert.match(bg,new RegExp('return requirePublishIntentAuthorizationService\\(\\)\\.'+fn+'\\('));
}
const journalCalls=[],closed=[],requests=[];
const fill={fillId:'abc',targetTabId:42,stage:'auto-publish-ready',status:'running',
  result:{complete:true,issues:[]},renewalId:'r',sourceAdId:'123'};
const renewal={fillId:'abc',targetTabId:42,profileId:'P',sourceAdId:'123'};
let profileId='P',seenName='User Account',validPresence=true,reportedPagesScanned=3,failPostReceipt=false,accountReadCount=0;
const options={
 sessionPort:{readArchiveInsertionSessions:async()=>({}),readRenewalSessions:async()=>({r:renewal}),
  readFillSessions:async()=>({abc:fill})},
 accountPort:{assertSelectedProfileMatchesLiveAccount:async()=>({profileId:failPostReceipt && ++accountReadCount > 1 ? 'other' : profileId,displayName:'User Account'}),
  normalizeProfileName:x=>String(x||'').trim()},
 tabPort:{createManagedWorkerTab:async()=>({id:77}),
  waitForTabComplete:async()=>{},ensureContentConnection:async()=>{},
  sendTabRequestWithBootstrap:async (id,msg)=>{
    requests.push(msg.type);
    if(msg.type==='MY_ADS_STATUS')return {isMyAdsPage:true,isProjectsTab:true,profileName:seenName};
    if(msg.type==='FIND_OWN_AD_BY_ID')return {found:validPresence,adId:'456',page:2,pagesScanned:reportedPagesScanned,evidence:'found-in-my-ads-full-pagination-scan'};
    throw Error('unexpected message');
  },closeManagedWorkerTab:async id=>{closed.push(id);}},
 journalPort:{requireAutoPublishIntentJournal:()=>({
    begin:async i=>{journalCalls.push(i);return {attemptId:'durable-attempt'};},
    resolveVerified:async i=>({...i,state:'resolved-confirmed'})
  })},
 configPort:{MY_ADS_PROJECTS_URL:'https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS',
   TAB_LOAD_TIMEOUT_PHASE4_MS:30000,URL}
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc).sort(),['authorizeAutomaticPublish','resolveManagedPublishIntent','verifyAutoPublishRemoteOutcomeFresh']);
const sender={tab:{id:42},url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html'};
const receipt=Object.freeze({operationType:'AUTHORIZE_AUTOMATIC_PUBLISH'});
(async()=>{
  await assert.rejects(svc.authorizeAutomaticPublish({fillId:'abc'},sender,{}),/ADMISSION_UNVERIFIED/);
  await assert.rejects(svc.authorizeAutomaticPublish({fillId:'abc'},{...sender,url:'https://evil.invalid/p-anzeige-aufgeben'},receipt),/WRONG_PAGE/);
  await assert.rejects(svc.authorizeAutomaticPublish({fillId:'abc'}, {...sender,tab:{id:100}},receipt),/SESSION_UNVERIFIED/);
  profileId='wrong';
  await assert.rejects(svc.authorizeAutomaticPublish({fillId:'abc'},sender,receipt),/ACCOUNT_UNVERIFIED/);
  profileId='P';
  const permit=await svc.authorizeAutomaticPublish({fillId:'abc'},sender,receipt);
  assert.equal(permit.authorized,true);assert.equal(permit.receiptId,'durable-attempt');
  assert.equal(journalCalls.length,1);assert.equal(journalCalls[0].sourceAdId,'123');
  failPostReceipt=true;accountReadCount=0;
  await assert.rejects(svc.authorizeAutomaticPublish({fillId:'abc'},sender,receipt),/ACCOUNT_CHANGED/);
  failPostReceipt=false;
  const matched=await svc.resolveManagedPublishIntent({fillId:'abc'},{adId:'456'});
  assert.equal(matched.state,'resolved-confirmed');
  await assert.rejects(svc.verifyAutoPublishRemoteOutcomeFresh({kind:'renewal',workflowId:'r',
    fillId:'abc',targetTabId:42,sourceAdId:'123',profileId:'P',attemptId:'a'},'123'),/PUBLISH_INTENT_UNVERIFIED/);
  const intent={kind:'renewal',workflowId:'r',fillId:'abc',targetTabId:42,sourceAdId:'123',profileId:'P',attemptId:'a'};
  const evidence=await svc.verifyAutoPublishRemoteOutcomeFresh(intent,'456');
  assert.equal(evidence.targetPresent,true);assert.equal(evidence.targetPagesScanned,3);
  assert.equal(closed.length,1);assert.deepEqual(requests,['MY_ADS_STATUS','FIND_OWN_AD_BY_ID','MY_ADS_STATUS']);
  validPresence=false;
  await assert.rejects(svc.verifyAutoPublishRemoteOutcomeFresh(intent,'456'),/PUBLISH_INTENT_UNVERIFIED/);
  assert.equal(closed.length,2,'failed proof must still close fresh worker');
  seenName='Wrong Account';
  await assert.rejects(svc.verifyAutoPublishRemoteOutcomeFresh(intent,'456'),/PUBLISH_INTENT_UNVERIFIED/);
  assert.equal(closed.length,3,'account mismatch must close worker');
  // KAR-171 W2: the source verifier itself must reject page evidence which
  // claims a target on a page not covered by the independent pagination.
  seenName='User Account';validPresence=true;reportedPagesScanned=1;
  await assert.rejects(svc.verifyAutoPublishRemoteOutcomeFresh(intent,'456'),/PUBLISH_INTENT_UNVERIFIED/);
  assert.equal(closed.length,4,'impossible page evidence is denied and worker is closed');
  reportedPagesScanned=3;
  console.log('PASS KAR-175 Wave 5: immutable admission, sender/identity binding, journal receipt, independent ID evidence and fail-closed worker cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
