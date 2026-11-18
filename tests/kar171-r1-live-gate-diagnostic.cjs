'use strict';
// KAR-171 R1: privacy-safe diagnostic of existing native account precondition.
// No native mutation, no website, no account data in output.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('docs/testing/KAR171_R1_LIVE_ACCOUNT_GATE_DIAGNOSTIC.js','utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const renewal='SENSITIVE_RENEWAL', attempt='SENSITIVE_ATTEMPT';
const phaseKey='karPhase4UncertainAttemptV1_'+renewal+'_'+attempt;
const pubKey='karAutoPublishIntentV1_FILL-1_PUBLISH-1';
const rows={
  [phaseKey]:{renewalId:renewal,attemptId:attempt,profileId:'HIDDEN_NAME'},
  [pubKey]:{workflowId:renewal,kind:'renewal',profileId:'HIDDEN_UUID'}
};
async function run({reason='LIVE_ACCOUNT_MY_ADS_TAB_ABSENT',phase=true,publish=true,
  sourceRows=rows,noObserver=false,wrongContext=false,observerFailure=false}={}){
 let reads=0,mutations=0,calls=0;const out=[];
 const ctx={
  location:{protocol:'chrome-extension:',hostname:EXT},
  chrome:{runtime:{id:wrongContext?'elsewhere':EXT},storage:{local:{
    get:async key=>{reads++;assert.equal(key,null);return sourceRows;},
    set:()=>{mutations++;throw Error('NO_STORAGE_WRITES');},
    remove:()=>{mutations++;throw Error('NO_STORAGE_WRITES');},
    clear:()=>{mutations++;throw Error('NO_STORAGE_WRITES');}
  }}},
  console:{info:(tag,body)=>out.push({tag,result:JSON.parse(body)})},
  fetch:()=>{mutations++;throw Error('NO_NETWORK')}
 };
 if(!noObserver)ctx.requireAdditionalOwnerObserver=()=>({
   observe:async()=>{if(observerFailure)throw Error('PRIVATE_EMAIL@example.test');
     return {schema:1,eligibleForLease:false,
       context:{profile:{state:reason==='LIVE_ACCOUNT_PROFILE_MATCH'?'matched':'unverified',
         reason,profileId:'SECRET_PROFILE_ID'}}};},
   verifyRemoteCommitContextReadOnly:async (record,kind)=>{
     calls++;assert.equal(record,kind==='phase4'?rows[phaseKey]:rows[pubKey]);
     return kind==='phase4'?phase:publish;
   }
 });
 await vm.runInNewContext(src,ctx,{filename:'KAR171_R1_LIVE_ACCOUNT_GATE_DIAGNOSTIC.js',timeout:4000});
 assert.equal(out.length,1);assert.equal(out[0].tag,'KAR171_R1_ACCOUNT_GATE_DIAGNOSTIC_V1');
 const result=out[0].result;
 assert.equal(result.liveRemoteVerified,false);assert.equal(result.r1Accepted,false);
 assert.equal(result.eligibleForLease,false);assert.equal(mutations,0);
 for(const secret of [renewal,attempt,'HIDDEN_NAME','HIDDEN_UUID','SECRET_PROFILE_ID',
   'PRIVATE_EMAIL@example.test'])assert.ok(!JSON.stringify(result).includes(secret));
 return {result,reads,calls};
}
(async()=>{
 let n=0;const check=(yes,msg)=>{assert.ok(yes,msg);n++;};
 const missing=await run();
 check(missing.result.accountReason==='LIVE_ACCOUNT_MY_ADS_TAB_ABSENT'
   &&missing.result.status==='LIVE_MY_ADS_TAB_REQUIRED'
   &&missing.reads===0&&missing.calls===0,'missing My Ads tab identified without local storage');
 const matched=await run({reason:'LIVE_ACCOUNT_PROFILE_MATCH'});
 check(matched.result.status==='HISTORICAL_CONTEXTS_MATCHED_READ_ONLY'
   &&matched.result.phase4Context==='MATCHED'
   &&matched.result.publicationContext==='MATCHED'
   &&matched.calls===2,'both original contexts separately verified');
 const pbad=await run({reason:'LIVE_ACCOUNT_PROFILE_MATCH',phase:false});
 check(pbad.result.status==='HISTORICAL_CONTEXT_UNVERIFIED'
   &&pbad.result.phase4Context==='UNVERIFIED'
   &&pbad.result.publicationContext==='MATCHED','Phase4 gap stays negative');
 const pubbad=await run({reason:'LIVE_ACCOUNT_PROFILE_MATCH',publish:false});
 check(pubbad.result.status==='HISTORICAL_CONTEXT_UNVERIFIED'
   &&pubbad.result.phase4Context==='MATCHED'
   &&pubbad.result.publicationContext==='UNVERIFIED','publication gap stays negative');
 const mixed=await run({reason:'LIVE_ACCOUNT_PROFILE_MATCH',sourceRows:{}});
 check(mixed.result.status==='HISTORICAL_ORIGIN_UNVERIFIED'
   &&mixed.calls===0,'missing origin does not interrogate foreign account');
 const wrong=await run({wrongContext:true});
 check(wrong.result.status==='WRONG_EXTENSION_CONTEXT'
   &&wrong.reads===0&&wrong.calls===0,'cross extension forbidden');
 const absent=await run({noObserver:true});
 check(absent.result.status==='RUNTIME_NOT_READY'&&absent.calls===0,
   'missing observer fails closed');
 const uncertain=await run({observerFailure:true});
 check(uncertain.result.status==='ACCOUNT_OBSERVATION_UNAVAILABLE'
   &&uncertain.calls===0,'observer errors redacted');
 const unknown=await run({reason:'PRIVATE_EMAIL@example.test'});
 check(unknown.result.accountReason==='ACCOUNT_REASON_UNVERIFIED'
   &&unknown.result.status==='ACCOUNT_GATE_UNVERIFIED'
   &&unknown.calls===0,'unknown reason never exposed');
 console.log('PASS KAR171 R1 native account gate diagnostic '+n+' privacy/negative cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
