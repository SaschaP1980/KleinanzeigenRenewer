// KAR-171 R1: DevTools-only existing-installation P8 candidate preflight.
// No real Chrome profile, Web Lock, diagnostic reset, listing or updater mutation.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = path.resolve(__dirname, '../docs/testing/KAR171_R1_P8_READ_ONLY_PREFLIGHT.js');
const EXT_ID = 'hafahjhhgiipdegfkgacchmnacgblnah';
const START = 'karAtomicAdmissionStartV1_';
const FINISH = 'karAtomicAdmissionFinishV1_';
const PHASE = 'karPhase4UncertainAttemptV1_';
const PUBLISH = 'karAutoPublishIntentV1_';
const TOKEN = 'real-origin-token-123456';
const start = Object.freeze({schema:1,state:'admitted',token:TOKEN,
  workerInstanceId:'worker-A',operationType:'FINISH_RENEWAL_REPLACEMENT',startedAtMs:1000});
const finish = Object.freeze({schema:1,state:'completed',token:TOKEN,
  workerInstanceId:'worker-A',completedAtMs:1200});
const phase = Object.freeze({schema:1,state:'outcome-unverified',renewalId:'r-1',
  attemptId:'a-1',workerInstanceId:'worker-A',profileId:'private-account',
  sourceAdId:'123456789',newAdId:'987654321',createdAtMs:1100,admissionToken:TOKEN});
const pub = Object.freeze({schema:1,state:'outcome-unverified',fillId:'f-1',
  workflowId:'w-1',attemptId:'b-1',workerInstanceId:'worker-A',kind:'renewal',
  profileId:'private-account',sourceAdId:'123456789',targetTabId:17,
  createdAtMs:1100,admissionToken:TOKEN});
const phaseKey = PHASE+'r-1_a-1',pubKey=PUBLISH+'f-1_b-1';

async function run(rows={},options={}) {
  const lines=[];let reads=0,writes=0,requests=0;
  const ctx={
    console:{info(...args){lines.push(args);},error(){throw Error('raw console errors are forbidden');}},
    location:{protocol:options.wrongOrigin?'https:':'chrome-extension:',hostname:options.wrongOrigin?'www.kleinanzeigen.de':EXT_ID},
    chrome:{
      runtime:{id:options.wrongId?'some-other-extension':EXT_ID,
        getManifest:()=>({version:'1.25.2'})},
      storage:{local:{
        get:async key=>{reads++;assert.equal(key,null,'one in-memory read-only snapshot');if(options.readError)throw Error('SECRET_DO_NOT_PRINT');return rows;},
        set:()=>{writes++;throw Error('storage write forbidden');},
        remove:()=>{writes++;throw Error('storage remove forbidden');},
        clear:()=>{writes++;throw Error('storage clear forbidden');}
      }}
    },
    fetch(){requests++;throw Error('network request forbidden');},
  };
  const script=fs.readFileSync(source,'utf8');
  assert.doesNotMatch(script,/\b(?:\.set|\.remove|\.clear)\s*\(/,'no storage mutation calls in script');
  await vm.runInNewContext(script,ctx,{timeout:3000,filename:path.basename(source)});
  assert.equal(lines.length,1,'only one intentionally sanitized summary line');
  assert.equal(lines[0][0],'KAR171_R1_P8_PREFLIGHT_V1');
  const payload=JSON.parse(lines[0][1]);
  const printed=JSON.stringify(lines);
  for(const secret of [TOKEN,'private-account','123456789','987654321','r-1','a-1','f-1','w-1','worker-A','SECRET_DO_NOT_PRINT']) {
    assert.ok(!printed.includes(secret),'private value never printed: '+secret);
  }
  assert.equal(writes,0,'read-only with no mutation');
  assert.equal(requests,0,'no network access');
  return {payload,reads,script};
}
(async()=>{
  let checks=0;
  const check=(value,message)=>{assert.ok(value,message);checks++;};
  const empty=await run();
  check(empty.payload.status==='NO_ORIGINAL_P8_CANDIDATE'&&empty.reads===1,
    'empty storage fails closed, never suggests R1 acceptance');
  const good=await run({[phaseKey]:phase,[START+TOKEN]:start,[FINISH+TOKEN]:finish});
  check(good.payload.status==='ORIGINAL_P8_CANDIDATE_PRESENT'
    &&good.payload.phase4OriginalP8Candidates===1
    &&good.payload.publishOriginalP8Candidates===0,
    'a valid original P8 Phase-4 source can be counted without exposing IDs');
  check(good.payload.r1Accepted===false,'preflight never certifies R1');
  const unfinished=await run({[phaseKey]:phase,[START+TOKEN]:start});
  check(unfinished.payload.phase4OriginalP8Candidates===1
    &&unfinished.payload.incompleteP8Finish===1,
    'original admission can survive worker interruption; no inferred completion');
  const noStart=await run({[phaseKey]:phase});
  check(noStart.payload.phase4OriginalP8Candidates===0
    &&noStart.payload.invalidOrMissingP8===1,
    'missing original START does not qualify');
  const mismatch=await run({[phaseKey]:phase,[START+TOKEN]:{...start,workerInstanceId:'worker-other'}});
  check(mismatch.payload.invalidOrMissingP8===1,'wrong original worker is rejected');
  const wrongOperation=await run({[phaseKey]:phase,[START+TOKEN]:{...start,operationType:'UNRELATED_JOB'}});
  check(wrongOperation.payload.invalidOrMissingP8===1,'unrelated P8 start is rejected');
  const old=await run({[phaseKey]:((({admissionToken,...rest})=>rest)(phase))});
  check(old.payload.phase4OriginalP8Candidates===0&&old.payload.legacyTokenlessIntents===1,
    'tokenless historical entry is not a positive original-P8 source');
  const badFinish=await run({[phaseKey]:phase,[START+TOKEN]:start,
    [FINISH+TOKEN]:{...finish,workerInstanceId:'worker-other'}});
  check(badFinish.payload.invalidOrMissingP8===1,'conflicting original FINISH rejects candidate');
  const badIdentity=await run({[phaseKey]:{...phase,sourceAdId:'987654321'},
    [START+TOKEN]:start});
  check(badIdentity.payload.invalidOrMissingP8===1,'source/target collision is rejected');
  const pubStart={...start,operationType:'AUTHORIZE_AUTOMATIC_PUBLISH'};
  const publish=await run({[pubKey]:pub,[START+TOKEN]:pubStart,[FINISH+TOKEN]:finish});
  check(publish.payload.publishOriginalP8Candidates===1
    &&publish.payload.phase4OriginalP8Candidates===0,
    'original publication evidence classified independently of deletion');
  const pubWrong=await run({[pubKey]:pub,[START+TOKEN]:start});
  check(pubWrong.payload.invalidOrMissingP8===1,'publish intent cannot borrow a Phase-4 P8 START');
  const unrelated=await run({[START+TOKEN]:start,[FINISH+TOKEN]:finish});
  check(unrelated.payload.status==='NO_ORIGINAL_P8_CANDIDATE'
    &&unrelated.payload.phase4OriginalP8Candidates===0,
    'unrelated P8 receipts never substitute for a Phase-4 attempt');
  const context=await run({}, {wrongId:true});
  check(context.payload.status==='WRONG_EXTENSION_CONTEXT'&&context.reads===0,
    'wrong extension ID fails closed before storage access');
  const origin=await run({}, {wrongOrigin:true});
  check(origin.payload.status==='WRONG_EXTENSION_CONTEXT'&&origin.reads===0,
    'web page context fails closed before storage access');
  const rejected=await run({}, {readError:true});
  check(rejected.payload.status==='READ_FAILED'&&rejected.reads===1,
    'storage access failure never becomes zero or a positive candidate');
  const bogus=await run({[phaseKey]:null,[START+TOKEN]:start});
  check(bogus.payload.invalidOrMissingP8===1,
    'corrupt intent fails closed without disclosing its value');
  console.log('PASS KAR171 R1 P8 single-read readonly preflight '+checks+' adversarial assertions');
})().catch(error=>{console.error(error);process.exitCode=1;});
