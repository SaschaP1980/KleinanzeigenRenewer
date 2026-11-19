'use strict';
// R1: synthetic-only validation of standalone owner-PC content error classifier.
// The probe must never expose IDs/accounts or change listings or extension state.
const fs=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const code=fs.readFileSync('docs/testing/KAR171_R1_SOURCE_QUERY_ERROR_READ_ONLY.js','utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const PID='private-user@example.test',RENEWAL='PRIVATE_RENEWAL',ATTEMPT='PRIVATE_ATTEMPT',SRC='1234567890';
const KEY='karPhase4UncertainAttemptV1_'+RENEWAL+'_'+ATTEMPT;
function rows(){return {[KEY]:{renewalId:RENEWAL,attemptId:ATTEMPT,sourceAdId:SRC,profileId:PID}};}
const PROJECTS='https://www.kleinanzeigen.de/m-meine-anzeigen.html?tab=PROJECTS';
const status={ok:true,result:{isMyAdsPage:true,isProjectsTab:true,profileName:PID,currentPage:1}};
async function run({
 version='1.25.17',extension=EXT,accountOk=true,local=rows(),
 tabs=[{id:55,url:PROJECTS}],statusReply=status,queryReply={
   ok:false,error:'KR_MY_ADS_ROSTER_INCOMPLETE'},
 throwQuery=false,throwStatus=false,queryFails=false
}={}){
 const out=[],calls=[],mutations=[];let observations=0;
 const ctx={
   URL,location:{protocol:'chrome-extension:',hostname:EXT},console:{
     info:(t,s)=>out.push({tag:t,...JSON.parse(s)})
   },
   setTimeout:()=>77,clearTimeout:()=>{},
   chrome:{
     runtime:{id:extension,getManifest:()=>({version})},
     storage:{local:{
       get:async k=>{assert.equal(k,null);return structuredClone(local);},
       set:()=>{mutations.push('storage.set');throw Error('NO_WRITES');},
       remove:()=>{mutations.push('storage.remove');throw Error('NO_WRITES');},
       clear:()=>{mutations.push('storage.clear');throw Error('NO_WRITES');}
     }},
     tabs:{
       query:async x=>{assert.equal(Object.keys(x).length,0);return tabs;},
       sendMessage:async (tabId,message)=>{
         assert.equal(tabId,55);
         calls.push(message.type);
         assert.ok(['MY_ADS_STATUS','VERIFY_OWN_AD_ABSENT_BY_ID'].includes(message.type),
           'only two safe read-only actions');
         if(message.type==='MY_ADS_STATUS'){
           if(throwStatus)throw Error('PRIVATE_STATUS_ERROR');
           return statusReply;
         }
         assert.equal(message.adId,SRC);assert.equal(message.expectedProfileName,PID);
         assert.deepEqual(Object.keys(message).sort(),
           ['type','adId','expectedProfileName','correlation'].sort());
         if(throwQuery)throw Error('PRIVATE_TRANSPORT_ERROR');
         if(queryFails)throw Error('EXPIRED');
         return queryReply;
       },
       create:()=>{mutations.push('tabs.create');throw Error('NO_TABS');},
       remove:()=>{mutations.push('tabs.remove');throw Error('NO_TABS');},
       update:()=>{mutations.push('tabs.update');throw Error('NO_TABS');}
     }
   },
   requireAdditionalOwnerObserver:()=>({observe:async()=>{
     observations++;
     return {schema:1,eligibleForLease:false,
       context:{profile:{state:accountOk?'matched':'unverified',
         reason:accountOk?'LIVE_ACCOUNT_PROFILE_MATCH':'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH'}}};
   }})
 };
 await vm.runInNewContext(code,ctx,{filename:'KAR171_R1_SOURCE_QUERY_ERROR_READ_ONLY.js',timeout:4000});
 assert.equal(out.length,1);
 const o=out[0];assert.equal(o.tag,'KAR171_R1_SOURCE_QUERY_ERROR_V1');
 assert.equal(o.liveRemoteVerified,false);assert.equal(o.r1Accepted,false);assert.equal(o.eligibleForLease,false);
 for(const secret of [PID,RENEWAL,ATTEMPT,SRC,PROJECTS,'PRIVATE_STATUS_ERROR','PRIVATE_TRANSPORT_ERROR']){
   assert.ok(!JSON.stringify(o).includes(secret),'no sensitive details '+secret);
 }
 assert.equal(mutations.length,0);
 assert.deepEqual(Object.keys(o).sort(),
  ['tag','status','reason','liveRemoteVerified','r1Accepted','eligibleForLease'].sort());
 return {o,calls,observations};
}
(async()=>{
 let n=0;function check(actual,status,reason='NOT_CHECKED'){
  assert.equal(actual.o.status,status);assert.equal(actual.o.reason,reason);n++;
 }
 check(await run(),'SOURCE_QUERY_REJECTED','ROSTER_COUNT_OR_PAGINATION_INCOMPLETE');
 check(await run({queryReply:{ok:false,error:'KR_MY_ADS_ACCOUNT_CHANGED_DURING_SCAN'}}),
   'SOURCE_QUERY_REJECTED','ACCOUNT_CHANGED_DURING_SCAN');
 check(await run({queryReply:{ok:false,error:'Nächste Seite von „Meine Anzeigen“ konnte nicht geladen werden.'}}),
   'SOURCE_QUERY_REJECTED','PAGINATION_FAILED');
 check(await run({queryReply:{ok:false,error:'PRIVATE_RAW_SECRET '+PID}}),
   'SOURCE_QUERY_REJECTED','CONTENT_ERROR_UNCLASSIFIED');
 check(await run({queryReply:{ok:false,error:'KR_PLATFORM_ACCESS_RESTRICTED'}}),
   'SOURCE_QUERY_REJECTED','PLATFORM_ACCESS_RESTRICTED');
 check(await run({queryReply:{ok:true,result:{
   verified:true,adId:SRC,evidence:'not-in-my-ads-full-pagination-scan',pagesScanned:1
 }}}),'SOURCE_ABSENCE_RESPONSE_READ_ONLY');
 check(await run({queryReply:{ok:true,result:{verified:false,adId:SRC}}}),
   'SOURCE_QUERY_RESPONSE_UNVERIFIED','SOURCE_STILL_PRESENT_OR_UNVERIFIED');
 const noTabs=await run({tabs:[]});
 check(noTabs,'OPEN_MY_ADS_PROJECTS_TAB_REQUIRED');assert.deepEqual(noTabs.calls,[]);
 const twoTabs=await run({tabs:[{id:55,url:PROJECTS},{id:56,url:PROJECTS}]});
 check(twoTabs,'MY_ADS_PROJECTS_TAB_NOT_UNIQUE');assert.deepEqual(twoTabs.calls,[]);
 const wrongPage=await run({statusReply:{ok:true,result:{...status.result,currentPage:2}}});
 check(wrongPage,'MY_ADS_FIRST_PAGE_REQUIRED');
 assert.deepEqual(wrongPage.calls,['MY_ADS_STATUS']);
 const wrongAccount=await run({accountOk:false});
 check(wrongAccount,'LIVE_ACCOUNT_UNVERIFIED');assert.deepEqual(wrongAccount.calls,[]);
 const mismatch=await run({statusReply:{ok:true,result:{...status.result,profileName:'OTHER_PRIVATE_EMAIL'}}});
 check(mismatch,'MY_ADS_PROFILE_OR_STATUS_UNVERIFIED');assert.deepEqual(mismatch.calls,['MY_ADS_STATUS']);
 check(await run({version:'1.25.16'}),'UNEXPECTED_RUNTIME_VERSION');
 check(await run({extension:'different'}),'WRONG_EXTENSION_CONTEXT');
 check(await run({throwStatus:true}),'MY_ADS_STATUS_TRANSPORT_FAILED');
 check(await run({throwQuery:true}),'SOURCE_QUERY_TRANSPORT_FAILED','CONTENT_TRANSPORT_UNAVAILABLE');
 check(await run({queryFails:true}),'SOURCE_QUERY_TRANSPORT_FAILED','READ_ONLY_TIMEOUT');
 const many=rows();many['karPhase4UncertainAttemptV1_EXTRA']=rows()[KEY];
 check(await run({local:many}),'ORIGINAL_PHASE4_NOT_UNIQUE');
 const bad=rows();bad[KEY].sourceAdId='bad';
 check(await run({local:bad}),'ORIGINAL_PHASE4_INVALID');
 console.log('PASS KAR171 R1 standalone source content error classifier '+n+' privacy/negative cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
