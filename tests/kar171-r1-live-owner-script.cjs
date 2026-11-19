// KAR-171 R1: standalone owner DevTools invocation; all synthetic, no website.
// The positive mocked callback is NOT native acceptance evidence.
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const src=fs.readFileSync('docs/testing/KAR171_R1_LIVE_REMOTE_OWNER_READ_ONLY.js','utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah',PREFIX='karPhase4UncertainAttemptV1_';
const ID='RENEWAL_SYNTHETIC_PRIVATE',ATTEMPT='ATTEMPT_SYNTHETIC_PRIVATE';
const initial={
  [PREFIX+ID+'_'+ATTEMPT]:{schema:1,renewalId:ID,attemptId:ATTEMPT}
};
async function run({rows=initial,extension=EXT,origin=EXT,proto='chrome-extension:',
  impl=()=>({status:'ORIGINAL_ACCOUNT_REMOTE_VERIFIED',
    liveRemoteVerified:true,r1Accepted:false,eligibleForLease:false}),
  noImpl=false,noGlobal=false,readFails=false}={}){
 const output=[];let reads=0,writes=0,invocations=0,network=0;
 const context={
  location:{protocol:proto,hostname:origin},
  chrome:{runtime:{id:extension},storage:{local:{
    get:async key=>{reads++;assert.equal(key,null);if(readFails)throw Error('PRIVATE_THROW');return rows;},
    set:()=>{writes++;throw Error('NOT_ALLOWED');},
    remove:()=>{writes++;throw Error('NOT_ALLOWED');},
    clear:()=>{writes++;throw Error('NOT_ALLOWED');}
  }}},
  console:{info:(tag,json)=>output.push([tag,JSON.parse(json)]),
    error:()=>{throw Error('CONSOLE_ERROR_FORBIDDEN');}},
  fetch:()=>{network++;throw Error('NETWORK_FORBIDDEN')}
 };
 if(!noGlobal)context.requireAdditionalOwnerObserver=()=>(noImpl?{}:{
  inspectOriginalRenewalRemoteLineageReadOnly:async ids=>{
    invocations++;assert.equal(ids.renewalId,ID);assert.equal(ids.attemptId,ATTEMPT);
    return impl();
  }
 });
 await vm.runInNewContext(src,context,{filename:'owner-readonly.js',timeout:3000});
 assert.equal(output.length,1);assert.equal(output[0][0],'KAR171_R1_LIVE_REMOTE_OWNER_V1');
 assert.equal(output[0][1].r1Accepted,false);
 assert.equal(output[0][1].eligibleForLease,false);
 assert.equal(writes,0);assert.equal(network,0);
 const rendered=JSON.stringify(output);
 for(const privateText of [ID,ATTEMPT,'PRIVATE_THROW'])
   assert.ok(!rendered.includes(privateText),'must redact all original identifiers');
 return {result:output[0][1],reads,invocations};
}
(async()=>{
 let n=0;
 const check=(condition,message)=>{assert.ok(condition,message);n++;};
 const yes=await run();
 check(yes.result.liveRemoteVerified===true
   &&yes.result.status==='ORIGINAL_ACCOUNT_REMOTE_VERIFIED'
   &&yes.reads===1&&yes.invocations===1,'one opt-in original private invocation');
 const no=await run({rows:{}});
 check(no.result.status==='ORIGINAL_PHASE4_NOT_UNIQUE'&&no.invocations===0,
   'missing original receipt cannot trigger any scan');
 const two=await run({rows:{...initial,[PREFIX+'extra_other']:{renewalId:'extra',attemptId:'other'}}});
 check(two.result.status==='ORIGINAL_PHASE4_NOT_UNIQUE'&&two.invocations===0,
   'ambiguous original receipts fail closed');
 const wrong=await run({extension:'different-extension'});
 check(wrong.result.status==='WRONG_EXTENSION_CONTEXT'&&wrong.reads===0,
   'no storage read in another extension');
 const web=await run({proto:'https:',origin:'www.kleinanzeigen.de'});
 check(web.result.status==='WRONG_EXTENSION_CONTEXT'&&web.reads===0,
   'website context cannot invoke native account proof');
 const missing=await run({noGlobal:true});
 check(missing.result.status==='RUNTIME_NOT_READY'&&missing.reads===0,
   'older extension runtime cannot run probe');
 const missingApi=await run({noImpl:true});
 check(missingApi.result.status==='RUNTIME_NOT_READY'&&missingApi.invocations===0,
   'missing private method remains fail closed');
 const badKey=await run({rows:{[PREFIX+'mismatch_other']:{renewalId:ID,attemptId:ATTEMPT}}});
 check(badKey.result.status==='ORIGINAL_PHASE4_UNVERIFIED'&&badKey.invocations===0,
   'key tampering blocks account scan');
 const readFail=await run({readFails:true});
 check(readFail.result.status==='READ_FAILED'&&readFail.invocations===0,
   'unavailable private storage does not claim empty or positive');
 const deny=await run({impl:()=>({status:'LIVE_ACCOUNT_CHANGED_DURING_SCAN',
   liveRemoteVerified:false,r1Accepted:false,eligibleForLease:false})});
 check(deny.result.status==='LIVE_ACCOUNT_CHANGED_DURING_SCAN'
   &&deny.result.liveRemoteVerified===false,'identity switch never grants positive');
 const forged=await run({impl:()=>({status:'ORIGINAL_ACCOUNT_REMOTE_VERIFIED',
   liveRemoteVerified:true,r1Accepted:true,eligibleForLease:false})});
 check(forged.result.liveRemoteVerified===false&&forged.result.r1Accepted===false,
   'fake full R1 accepted response does not pass even mock');
 const unknown=await run({impl:()=>({status:'SENSITIVE_ACCOUNT_PRIVATE',
   liveRemoteVerified:true,r1Accepted:false,eligibleForLease:false})});
 check(unknown.result.status==='REMOTE_PROOF_UNVERIFIED'
   &&unknown.result.liveRemoteVerified===false,'unlisted status cannot leak');
 for(const status of ['R1_REMOTE_SCAN_NOT_STARTED',
   'R1_REMOTE_SOURCE_TAB_CREATE_FAILED','R1_REMOTE_SOURCE_QUERY_FAILED',
   'R1_REMOTE_SOURCE_EVIDENCE_FAILED','R1_REMOTE_TARGET_TAB_LOAD_FAILED',
   'R1_REMOTE_TARGET_QUERY_FAILED','R1_REMOTE_TARGET_EVIDENCE_FAILED',
   'R1_REMOTE_FINAL_RESPONSE_FAILED','ORIGINAL_READBACK_UNAVAILABLE']){
   const diagnostic=await run({impl:()=>({status,liveRemoteVerified:false,
     r1Accepted:false,eligibleForLease:false})});
   check(diagnostic.result.status===status&&diagnostic.result.liveRemoteVerified===false,
     'bounded remote milestone '+status);
 }
 for(const status of [
   'ORIGINAL_INITIAL_SNAPSHOT_UNAVAILABLE',
   'ORIGINAL_PHASE4_VALIDATION_UNAVAILABLE',
   'ORIGINAL_PUBLICATION_VALIDATION_UNAVAILABLE',
   'ORIGINAL_PRESCAN_ACCOUNT_UNAVAILABLE',
   'ORIGINAL_REMOTE_GATE_UNAVAILABLE',
   'ORIGINAL_POSTSCAN_ACCOUNT_UNAVAILABLE',
   'ORIGINAL_STABILITY_CHECK_UNAVAILABLE'
 ]){
   const checkOutput=await run({impl:()=>({status,liveRemoteVerified:false,
     r1Accepted:false,eligibleForLease:false})});
   check(checkOutput.result.status===status&&
     checkOutput.result.liveRemoteVerified===false,
     'bounded outer diagnostic '+status);
 }
 const crash=await run({impl:()=>{throw Error('PRIVATE_THROW')}});
 check(crash.result.status==='REMOTE_PROOF_UNAVAILABLE'
   &&crash.result.liveRemoteVerified===false,'exceptions redacted');
 assert.doesNotMatch(src,/chrome\.runtime\.sendMessage|DELETE_OWN_AD_BY_ID|requestSubmit\(/);
 check(true,'no new public IPC or remote mutation in owner script');
 console.log('PASS KAR171 R1 owner opt-in read-only script '+n+' adversarial assertions');
})().catch(e=>{console.error(e);process.exitCode=1;});
