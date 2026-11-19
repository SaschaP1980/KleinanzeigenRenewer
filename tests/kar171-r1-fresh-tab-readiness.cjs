'use strict';
// KAR-171: independent source and target must wait for semantic My Ads readiness.
const test=require('node:test'),assert=require('node:assert/strict');
const Remote=require('../src/background/services/remote-delete-replacement-service.js');
const SRC='1100223344',DEST='5500667788',NAME='fixture-owner';
const original={renewalId:'private-renewal',profileId:NAME,sourceAdId:SRC,newAdId:DEST,attemptId:'private-attempt'};
function fixture({readiness='ready',switchAccount=false}={}){
 let nextId=70;const tabs=[],calls=[],closed=[],statusCount={};
 const ready=()=>({isMyAdsPage:true,isProjectsTab:true,profileName:NAME,currentPage:1,expectedOnline:2,listingCount:2,hasNext:false});
 const instance=Remote.create({
  createManagedWorkerTab:async()=>{const tab={id:++nextId};tabs.push(tab);return tab;},
  waitForTabComplete:async()=>({status:'complete'}),
  ensureContentConnection:async()=>({ready:true}),
  closeManagedWorkerTab:async id=>{closed.push(id);},
  sendTabRequestWithBootstrap:async (id,msg)=>{
   calls.push({id,type:msg.type,expectedProfileName:msg.expectedProfileName});
   statusCount[id]=(statusCount[id]||0)+(msg.type==='MY_ADS_STATUS'?1:0);
   if(msg.type==='MY_ADS_STATUS')
     return {...ready(),profileName:switchAccount&&statusCount[id]>=2?'wrong-owner':NAME};
   if(msg.type==='WAIT_FOR_MY_ADS_READY'){
     assert.equal(msg.expectedProfileName,NAME);
     if(readiness==='reject')throw Error('KR_MY_ADS_READINESS_TIMEOUT');
     if(readiness==='wrong')return {...ready(),profileName:'wrong-owner'};
     if(readiness==='page2')return {...ready(),currentPage:2};
     if(readiness==='empty')return {...ready(),listingCount:0};
     return ready();
   }
   if(msg.type==='VERIFY_OWN_AD_ABSENT_BY_ID'){
    assert.equal(msg.adId,SRC);
    if(!calls.some(x=>x.id===id&&x.type==='WAIT_FOR_MY_ADS_READY'))throw Error('SOURCE_NOT_HYDRATED');
    return {verified:true,adId:SRC,evidence:'not-in-my-ads-full-pagination-scan',pagesScanned:1};
   }
   if(msg.type==='FIND_OWN_AD_BY_ID'){
    assert.equal(msg.adId,DEST);assert.equal(msg.requireCompleteRoster,true);
    if(!calls.some(x=>x.id===id&&x.type==='WAIT_FOR_MY_ADS_READY'))throw Error('TARGET_NOT_HYDRATED');
    return {found:true,adId:DEST,evidence:'found-in-my-ads-full-pagination-scan',pagesScanned:1,page:1};
   }
   throw Error('Unexpected '+msg.type);
  },
  normalizeProfileName:v=>String(v||'').trim(),
  phase4StatusRequestTimeoutMs:100,phase4ReadOnlyRequestTimeoutMs:100,
  logDiagnostic:async()=>{}
 });
 return {instance,calls,closed,tabs};
}
test('each independent fresh source/target scan waits on semantic page-one readiness',async()=>{
 const f=fixture(),proof=await f.instance.verifyPhase4RemoteOutcomeFresh(original);
 assert.equal(proof.sourceAbsent,true);assert.equal(proof.targetPresent,true);
 assert.equal(f.tabs.length,2);assert.deepEqual(f.closed,f.tabs.map(t=>t.id));
 for(const tab of f.tabs){
  const kinds=f.calls.filter(x=>x.id===tab.id).map(x=>x.type);
  assert.deepEqual(kinds,['MY_ADS_STATUS','WAIT_FOR_MY_ADS_READY','MY_ADS_STATUS',
   tab.id===f.tabs[0].id?'VERIFY_OWN_AD_ABSENT_BY_ID':'FIND_OWN_AD_BY_ID','MY_ADS_STATUS']);
 }
 assert.equal(f.calls.some(x=>x.type==='DELETE_OWN_AD_BY_ID'),false);
});
for(const mode of ['reject','wrong','page2','empty']){
 test('non-ready state '+mode+' denies source and target without mutation',async()=>{
  const f=fixture({readiness:mode});
  await assert.rejects(f.instance.verifyPhase4RemoteOutcomeFresh(original));
  assert.equal(f.tabs.length,1);assert.deepEqual(f.closed,[f.tabs[0].id]);
  assert.equal(f.calls.some(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID'),false);
  assert.equal(f.calls.some(x=>x.type==='FIND_OWN_AD_BY_ID'),false);
  assert.equal(f.calls.some(x=>x.type==='DELETE_OWN_AD_BY_ID'),false);
 });
}
test('account switch immediately after readiness blocks source query',async()=>{
 const f=fixture({switchAccount:true});
 await assert.rejects(f.instance.verifyPhase4RemoteOutcomeFresh(original));
 assert.deepEqual(f.closed,[f.tabs[0].id]);
 assert.equal(f.calls.some(x=>x.type==='VERIFY_OWN_AD_ABSENT_BY_ID'),false);
});
test('invalid source ID blocks before tab creation',async()=>{
 const f=fixture();await assert.rejects(f.instance.verifyPhase4RemoteOutcomeFresh({...original,sourceAdId:'invalid'}));
 assert.equal(f.tabs.length,0);assert.equal(f.calls.length,0);
});
