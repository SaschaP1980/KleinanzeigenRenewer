'use strict';
// KAR-171 R1: synthetic-only redacted diagnosis of cleared completed sessions.
// No real Chrome account, network, storage mutation, P8 approval or updater call.
const vm=require('node:vm');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const source=fs.readFileSync('docs/testing/KAR171_R1_HISTORICAL_SESSION_DIAGNOSTIC.js','utf8');
const EXT='hafahjhhgiipdegfkgacchmnacgblnah';
const UUID='SECRET_UUID_account_123',NAME='PRIVATE_ACCOUNT@example.test';
const RENEWAL='PRIVATE_RENEWAL_1',ATTEMPT='PRIVATE_ATTEMPT_1',FILL='PRIVATE_FILL_1';
const SOURCE='123456789',TARGET='987654321';
const PK='karPhase4UncertainAttemptV1_'+RENEWAL+'_'+ATTEMPT;
const PUB='karAutoPublishIntentV1_'+FILL+'_another-private-attempt';
function rows(){
 return {
  profilesV1:[{profileId:UUID,displayName:NAME}],
  activeDetectedProfileV1:{profileId:UUID},
  selectedInventoryProfileV1:{profileId:UUID},
  renewalSessionsV1:{},templateFillSessions:{},
  [PK]:{renewalId:RENEWAL,attemptId:ATTEMPT,profileId:NAME,
    sourceAdId:SOURCE,newAdId:TARGET},
  [PUB]:{kind:'renewal',workflowId:RENEWAL,fillId:FILL,profileId:UUID,
    sourceAdId:SOURCE,targetTabId:37}
 };
}
function withSessions(v){
 const p=v[PK],q=v[PUB];
 v.renewalSessionsV1[RENEWAL]={
  renewalId:RENEWAL,profileId:UUID,sourceAdId:p.sourceAdId,
  newAdId:p.newAdId,fillId:FILL,targetTabId:q.targetTabId};
 v.templateFillSessions[FILL]={fillId:FILL,renewalId:RENEWAL,
  sourceAdId:p.sourceAdId,targetTabId:q.targetTabId};
 return v;
}
async function check({records=rows(),wrongExtension=false,noObserver=false,
 badAccount=false,readFailure=false,mutateSecondRead=null,accountSwitch=false,
 malformedSnapshot=false,failObserver=false}={}){
 const out=[];let gets=0,mutations=0,observations=0;
 const state=records;
 const context={
  location:{protocol:'chrome-extension:',hostname:EXT},
  chrome:{runtime:{id:wrongExtension?'OTHER_EXTENSION':EXT},storage:{local:{
   get:async query=>{
    gets++;
    if(readFailure)throw Error('PRIVATE_FAILURE_NOT_PRINTED');
    if(mutateSecondRead&&gets===2)mutateSecondRead(state);
    if(malformedSnapshot&&gets===1)return null;
    if(query===null)return structuredClone(state);
    assert.ok(Array.isArray(query));
    return Object.fromEntries(query.filter(k=>Object.hasOwn(state,k))
       .map(k=>[k,structuredClone(state[k])]));
   },
   set:()=>{mutations++;throw Error('NO_WRITES');},
   remove:()=>{mutations++;throw Error('NO_WRITES');},
   clear:()=>{mutations++;throw Error('NO_WRITES');}
  }}},
  fetch:()=>{mutations++;throw Error('NO_REQUESTS');},
  console:{info:(tag,s)=>out.push({tag,result:JSON.parse(s)})}
 };
 if(!noObserver)context.requireAdditionalOwnerObserver=()=>({
   observe:async()=>{
    observations++;
    if(failObserver)throw Error('PRIVATE_EMAIL_NOT_PRINTED');
    const matched=!badAccount&&!(accountSwitch&&observations>=2);
    return {schema:1,eligibleForLease:false,context:{
      profile:{state:matched?'matched':'unverified',
        reason:matched?'LIVE_ACCOUNT_PROFILE_MATCH':'LIVE_ACCOUNT_PROFILE_NAME_MISMATCH',
        profileId:matched?UUID:'OTHER_PRIVATE_UUID'}
    }};
   }
 });
 await vm.runInNewContext(source,context,{timeout:4000,filename:'KAR171_R1_HISTORICAL_SESSION_DIAGNOSTIC.js'});
 assert.equal(out.length,1);
 assert.equal(out[0].tag,'KAR171_R1_HISTORICAL_SESSION_V1');
 const result=out[0].result;
 assert.equal(result.liveRemoteVerified,false);
 assert.equal(result.r1Accepted,false);
 assert.equal(result.eligibleForLease,false);
 assert.equal(mutations,0);
 for(const secret of [UUID,NAME,RENEWAL,ATTEMPT,FILL,SOURCE,TARGET,'PRIVATE_FAILURE_NOT_PRINTED','PRIVATE_EMAIL_NOT_PRINTED']){
   assert.ok(!JSON.stringify(result).includes(secret),'sensitive fields redacted');
 }
 const keys=['status','account','phase4Name','publicationUuid','renewalSession','fillSession',
  'liveRemoteVerified','r1Accepted','eligibleForLease'];
 assert.deepEqual(Object.keys(result).sort(),keys.sort(),'no dynamic output fields');
 return {result,gets,observations};
}
(async()=>{
 let tests=0;
 function expect(got,status,fields={}){
  assert.equal(got.result.status,status);
  for(const [key,value] of Object.entries(fields))assert.equal(got.result[key],value);
  tests++;
 }
 expect(await check(),'HISTORICAL_SESSIONS_ABSENT',{
  account:'MATCHED',phase4Name:'MATCHED',publicationUuid:'MATCHED',
  renewalSession:'ABSENT',fillSession:'ABSENT'});
 expect(await check({records:withSessions(rows())}),'HISTORICAL_SESSIONS_MATCHED',{
  renewalSession:'MATCHED',fillSession:'MATCHED'});
 const noFill=withSessions(rows());delete noFill.templateFillSessions[FILL];
 expect(await check({records:noFill}),'HISTORICAL_SESSIONS_INCOMPLETE_OR_MISMATCHED',{
  renewalSession:'MATCHED',fillSession:'ABSENT'});
 const noRenewal=withSessions(rows());delete noRenewal.renewalSessionsV1[RENEWAL];
 expect(await check({records:noRenewal}),'HISTORICAL_SESSIONS_INCOMPLETE_OR_MISMATCHED',{
  renewalSession:'ABSENT',fillSession:'MATCHED'});
 const badName=rows();badName[PK].profileId='OTHER_PRIVATE_ACCOUNT';
 expect(await check({records:badName}),'HISTORICAL_SESSIONS_ABSENT',{phase4Name:'MISMATCHED'});
 const badUuid=rows();badUuid[PUB].profileId='OTHER_PRIVATE_UUID';
 expect(await check({records:badUuid}),'HISTORICAL_SESSIONS_ABSENT',{publicationUuid:'MISMATCHED'});
 const badTab=withSessions(rows());badTab.templateFillSessions[FILL].targetTabId=99;
 expect(await check({records:badTab}),'HISTORICAL_SESSIONS_INCOMPLETE_OR_MISMATCHED',{fillSession:'MISMATCHED'});
 const badSource=withSessions(rows());badSource.renewalSessionsV1[RENEWAL].sourceAdId='OTHER_PRIVATE_AD';
 expect(await check({records:badSource}),'HISTORICAL_SESSIONS_INCOMPLETE_OR_MISMATCHED',{renewalSession:'MISMATCHED'});
 const wrongSelected=rows();wrongSelected.selectedInventoryProfileV1.profileId='OTHER_PRIVATE_UUID';
 expect(await check({records:wrongSelected}),'PROFILE_RECORDS_UNVERIFIED');
 const two=rows();two['karPhase4UncertainAttemptV1_OTHER_PRIVATE']='something';
 expect(await check({records:two}),'ORIGINAL_PHASE4_NOT_UNIQUE');
 const another=rows();another['karAutoPublishIntentV1_PRIVATE_OTHER']={...another[PUB]};
 expect(await check({records:another}),'PUBLICATION_NOT_UNIQUE');
 expect(await check({badAccount:true}),'LIVE_ACCOUNT_NOT_MATCHED');
 expect(await check({wrongExtension:true}),'WRONG_EXTENSION_CONTEXT');
 expect(await check({noObserver:true}),'RUNTIME_NOT_READY');
 expect(await check({readFailure:true}),'STORAGE_UNAVAILABLE',{account:'MATCHED'});
 expect(await check({malformedSnapshot:true}),'STORAGE_UNAVAILABLE',{account:'MATCHED'});
 expect(await check({failObserver:true}),'ACCOUNT_OBSERVATION_UNAVAILABLE');
 expect(await check({accountSwitch:true}),'CONTEXT_CHANGED_DURING_READ');
 expect(await check({mutateSecondRead:v=>v[PK].sourceAdId='OTHER_PRIVATE_AD'}),
  'CONTEXT_CHANGED_DURING_READ');
 const wrongProfile=rows();wrongProfile.profilesV1.push({...wrongProfile.profilesV1[0]});
 expect(await check({records:wrongProfile}),'PROFILE_RECORDS_UNVERIFIED');
 console.log('PASS KAR171 R1 historical session diagnostic '+tests+' synthetic privacy/negative cases');
})().catch(e=>{console.error(e);process.exitCode=1;});
