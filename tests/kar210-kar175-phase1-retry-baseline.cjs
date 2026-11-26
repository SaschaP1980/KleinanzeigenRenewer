'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
function declaration(name){
 const re=new RegExp('(?:^|\\n)((?:async )?function '+name+'\\()','g');
 const found=[...bg.matchAll(re)];assert.equal(found.length,1,'single historical owner: '+name);
 const start=found[0].index+found[0][0].indexOf(found[0][1]),end=bg.indexOf('\n}',start);assert.ok(end>start,name);
 return bg.slice(start,end+2);
}
function load(ctx,names){vm.runInNewContext(names.map(declaration).join('\n'),ctx);}

function fixture(){
 const renewalPhase1RetryInFlight=new Set(),events=[],tabs=[],stored=[],filled=[],closed=[],registered=[];
 const renewals={r1:{renewalId:'r1',fillId:'f1',targetTabId:200,status:'draft',stage:'phase1-started',sourceAdId:'123',sourceInventoryId:'inv',skeletonInventoryId:'skel',renewalMode:'safe',phaseAttempts:{},autoReplacementAllowed:false}};
 const fills={f1:{fillId:'f1',renewalId:'r1',targetTabId:200,status:'failed',result:{issues:['fixture failure']}}};let tabFail=false,available=true;
 const ctx={renewalPhase1RetryInFlight,readRenewalSessions:async()=>renewals,readFillSessions:async()=>fills,writeFillSessions:async x=>filled.push(x),persistRenewalSession:async x=>stored.push({...x}),
 renewalPhaseAttemptAvailable:()=>available,renewalAttemptState:()=>({attempt:1}),beginRenewalPhaseAttempt:()=>({attempt:2,attemptId:'attempt-2'}),normalizeRenewalMode:x=>x,renewalMaxPhaseAttempts:()=>3,
 createAutomationTab:async opts=>{if(tabFail)throw Error('fixture tab creation failed');tabs.push(opts);return {id:201};},registerShadowTab:async(id,role,owner)=>registered.push({id,role,owner}),closeRegistryTab:async id=>closed.push(id),updateAutomationTab:async(id,opts)=>{assert.ok(registered.some(x=>x.id===id));tabs.push({id,...opts});},
 correlationContext:()=>({}),sessionCorrelationContext:()=>({}),logDiagnostic:async(_l,e)=>events.push(e),crypto:{randomUUID:()=> 'new-fill-uuid'},TEMPLATE_TARGET_URL:'https://www.kleinanzeigen.de/p-anzeige-aufgeben.html',TAB_ROLES:{RENEWAL_TARGET:'renewal-target'}};
 load(ctx,['phase1PublishBoundaryReached','canRetryRenewalPhase1','restartRenewalPhase1Attempt']);
 return {ctx,renewals,fills,events,tabs,stored,filled,closed,registered,inFlight:renewalPhase1RetryInFlight,setFail:v=>tabFail=v,setAvailable:v=>available=v};
}
test('actual historical phase1 retry denies publish boundary, terminal, attempt exhaustion and stale owner',async()=>{
 const f=fixture(),s=f.ctx;
 assert.equal(s.canRetryRenewalPhase1({renewalId:'r1',status:'draft'}),true);
 for(const x of [{newAdId:'345'},{publishClickedAt:'date'},{status:'replaced'},{status:'submitted'},{stage:'publish-submitted'},{stage:'new-id-confirmed'}])assert.equal(s.canRetryRenewalPhase1({renewalId:'r1',status:'draft',...x}),false);
 assert.equal(s.canRetryRenewalPhase1({renewalId:'r1',status:'draft'},{publishClickedAt:'date'}),false);
 f.setAvailable(false);assert.equal(s.canRetryRenewalPhase1({renewalId:'r1',status:'draft'}),false);f.setAvailable(true);
 f.inFlight.add('r1');assert.equal(await s.restartRenewalPhase1Attempt('r1','f1'),false);f.inFlight.delete('r1');
 assert.equal(await s.restartRenewalPhase1Attempt('r1','missing'),false);
 f.fills.other={...f.fills.f1,fillId:'other'};assert.equal(await s.restartRenewalPhase1Attempt('r1','other'),false);
 f.renewals.r1.newAdId='345';assert.equal(await s.restartRenewalPhase1Attempt('r1','f1'),false);
 assert.equal(f.inFlight.size,0);assert.equal(f.tabs.length,0);assert.equal(f.stored.length,0);
});
test('historical retry inert new target, handoff and shared in-flight cleanup on tab creation failure',async()=>{
 const f=fixture(),s=f.ctx;
 assert.match(bg,/automaticReplacementInFlight, renewalPhase1RetryInFlight, renewalPublishDetectionInFlight/);
 assert.equal(await s.restartRenewalPhase1Attempt('r1','f1'),true);assert.equal(f.inFlight.size,0);
 assert.equal(f.renewals.r1.fillId,'new-fill-uuid');assert.equal(f.renewals.r1.targetTabId,201);assert.equal(f.renewals.r1.stage,'phase1-retry-started');assert.equal(f.fills['new-fill-uuid'].renewalId,'r1');assert.equal(f.fills['new-fill-uuid'].sourceAdId,'123');assert.equal(f.closed[0],200);assert.equal(f.tabs[0].url,'about:blank');assert.equal(f.registered[0].owner.ownerId,'r1');assert.ok(f.events.includes('RENEWAL_PHASE1_ATTEMPT_RESTARTED'));
 const fail=fixture();fail.setFail(true);assert.equal(await fail.ctx.restartRenewalPhase1Attempt('r1','f1'),false);assert.equal(fail.inFlight.size,0);assert.equal(fail.renewals.r1.status,'verification-failed');assert.ok(fail.events.includes('RENEWAL_PHASE1_RETRY_START_FAILED'));assert.deepEqual(fail.closed,[]);
});
