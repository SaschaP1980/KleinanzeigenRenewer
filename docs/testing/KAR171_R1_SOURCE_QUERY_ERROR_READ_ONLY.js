// KAR-171 R1 — supplemental source-query failure classification for native v1.25.17.
// Run once in Kleinanzeigen Manager SERVICE WORKER DevTools.
// Before running, open EXACTLY ONE authenticated "Meine Anzeigen" PROJECTS tab.
// May browse pagination in that tab but NEVER creates/deletes/renews listings.
// No new tabs, reloads, storage writes, update leases, account/ID/token output.
(async()=>{
 'use strict';
 const TAG='KAR171_R1_SOURCE_QUERY_ERROR_V1';
 const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
 const PHASE='karPhase4UncertainAttemptV1_';
 const result=(status,reason='NOT_CHECKED')=>console.info(TAG,JSON.stringify({
   status,reason,liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
 }));
 const normalize=s=>typeof s==='string'?s.replace(/\s+/g,' ').trim().toLocaleLowerCase('de-DE'):'';
 const numeric=x=>typeof x==='string'&&/^[0-9]{6,15}$/.test(x);
 const classify=(code,message)=>{
   const s=String(code||'')+' '+String(message||'');
   if(/KR_MY_ADS_ROSTER_INCOMPLETE/.test(s))return 'ROSTER_COUNT_OR_PAGINATION_INCOMPLETE';
   if(/KR_MY_ADS_ACCOUNT_CHANGED_DURING_SCAN/.test(s))return 'ACCOUNT_CHANGED_DURING_SCAN';
   if(/KR_PLATFORM_ACCESS_RESTRICTED|Zugriff vorübergehend eingeschränkt/.test(s))return 'PLATFORM_ACCESS_RESTRICTED';
   if(/nächste Seite.*nicht geladen|Seitennavigation.*wiederholt/i.test(s))return 'PAGINATION_FAILED';
   if(/Mehr als [0-9]+ Seiten/.test(s))return 'PAGINATION_LIMIT';
   if(/Keine Anzeigen erkannt|keine Anzeigen erkannt|Auf Seite .*keine Anzeigen/.test(s))return 'LISTINGS_NOT_LOADED';
   if(/PROJECTS|Projekten.*verlassen|Meine Anzeigen.*verlassen/.test(s))return 'MY_ADS_PROJECTS_UNVERIFIED';
   if(/Anzeigen-ID ist ungültig|Quell-Anzeigen-ID ist ungültig/.test(s))return 'SOURCE_AD_ID_UNVERIFIED';
   if(/Receiving end does not exist|Could not establish connection|message port closed/.test(s))return 'CONTENT_TRANSPORT_UNAVAILABLE';
   return 'CONTENT_ERROR_UNCLASSIFIED';
 };
 const isProjects=tab=>{
   try{const u=new URL(tab.url);return u.protocol==='https:'&&
     u.hostname==='www.kleinanzeigen.de'&&
     u.pathname==='/m-meine-anzeigen.html'&&
     u.searchParams.get('tab')==='PROJECTS';}catch{return false;}
 };
 if(typeof chrome==='undefined'||chrome.runtime?.id!==EXT
   ||typeof location==='undefined'||location.protocol!=='chrome-extension:'
   ||location.hostname!==EXT){result('WRONG_EXTENSION_CONTEXT');return;}
 if(chrome.runtime?.getManifest?.().version!=='1.25.17'){
   result('UNEXPECTED_RUNTIME_VERSION');return;
 }
 if(typeof chrome.storage?.local?.get!=='function'
   ||typeof chrome.tabs?.query!=='function'
   ||typeof chrome.tabs?.sendMessage!=='function'
   ||typeof requireAdditionalOwnerObserver!=='function'){
   result('RUNTIME_NOT_READY');return;
 }
 let observed,rows;
 try{observed=await requireAdditionalOwnerObserver().observe();
   if(observed?.schema!==1||observed?.eligibleForLease!==false
      ||observed?.context?.profile?.reason!=='LIVE_ACCOUNT_PROFILE_MATCH'
      ||observed?.context?.profile?.state!=='matched'){
      result('LIVE_ACCOUNT_UNVERIFIED');return;
   }
   rows=await chrome.storage.local.get(null);
 }catch{result('PREFLIGHT_READ_UNAVAILABLE');return;}
 if(!rows||typeof rows!=='object'||Array.isArray(rows)){
   result('PREFLIGHT_READ_UNAVAILABLE');return;
 }
 const origins=Object.entries(rows).filter(([k])=>k.startsWith(PHASE));
 if(origins.length!==1){result('ORIGINAL_PHASE4_NOT_UNIQUE');return;}
 const [key,origin]=origins[0];
 if(!origin||typeof origin!=='object'||Array.isArray(origin)
   ||typeof origin.renewalId!=='string'
   ||typeof origin.attemptId!=='string'
   ||key!==PHASE+origin.renewalId+'_'+origin.attemptId
   ||!numeric(origin.sourceAdId)||!normalize(origin.profileId)){
   result('ORIGINAL_PHASE4_INVALID');return;
 }
 let tabs;
 try{tabs=(await chrome.tabs.query({})).filter(isProjects);}
 catch{result('MY_ADS_TABS_UNAVAILABLE');return;}
 if(tabs.length!==1||!Number.isSafeInteger(tabs[0].id)){
   result(tabs.length===0?'OPEN_MY_ADS_PROJECTS_TAB_REQUIRED':'MY_ADS_PROJECTS_TAB_NOT_UNIQUE');return;
 }
 const tabId=tabs[0].id;
 const send=async payload=>{
   let timer=null;
   try{
     return await Promise.race([
       chrome.tabs.sendMessage(tabId,payload),
       new Promise((_,reject)=>{
         timer=setTimeout(()=>reject(Error('EXPIRED')),60000);
       })
     ]);
   }finally{if(timer!==null)clearTimeout(timer);}
 };
 let status;
 try{status=await send({type:'MY_ADS_STATUS'});}
 catch{result('MY_ADS_STATUS_TRANSPORT_FAILED');return;}
 if(status?.ok!==true||status.result?.isMyAdsPage!==true
   ||status.result?.isProjectsTab!==true
   ||!normalize(status.result?.profileName)
   ||normalize(status.result.profileName)!==normalize(origin.profileId)){
   result('MY_ADS_PROFILE_OR_STATUS_UNVERIFIED');return;
 }
 if(status.result.currentPage!==1){
   result('MY_ADS_FIRST_PAGE_REQUIRED');return;
 }
 let reply;
 try{reply=await send({type:'VERIFY_OWN_AD_ABSENT_BY_ID',
   adId:origin.sourceAdId,expectedProfileName:origin.profileId,
   correlation:{}});}
 catch(e){result('SOURCE_QUERY_TRANSPORT_FAILED',
   e?.message==='EXPIRED'?'READ_ONLY_TIMEOUT':'CONTENT_TRANSPORT_UNAVAILABLE');return;}
 if(reply?.ok===false){
   result('SOURCE_QUERY_REJECTED',classify(reply.errorCode,reply.error));return;
 }
 if(reply?.ok!==true||typeof reply.result!=='object'||!reply.result){
   result('SOURCE_QUERY_RESPONSE_INVALID');return;
 }
 // This is a diagnostic of the SOURCE response only. No positive R1 claim.
 if(reply.result.verified===true
   &&reply.result.adId===origin.sourceAdId
   &&reply.result.evidence==='not-in-my-ads-full-pagination-scan'
   &&Number.isSafeInteger(reply.result.pagesScanned)
   &&reply.result.pagesScanned>=1){
   result('SOURCE_ABSENCE_RESPONSE_READ_ONLY');return;
 }
 result('SOURCE_QUERY_RESPONSE_UNVERIFIED',
   reply.result.verified===false?'SOURCE_STILL_PRESENT_OR_UNVERIFIED':'SCHEMA_UNVERIFIED');
})().catch(()=>{
 console.info('KAR171_R1_SOURCE_QUERY_ERROR_V1',JSON.stringify({
   status:'DIAGNOSTIC_UNAVAILABLE',reason:'NOT_CHECKED',
   liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false
 }));
});
