// KAR-99 P1.3-F2E2D2B2A — RED-first actual message router, private P8
// callback provenance and immutable publish intent. No live account mutation.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const noopDeps={has:()=>false,register:()=>{}};
globalThis.KRDeps=noopDeps;
const Contract=require('../src/shared/message-contract-registry.js');
const Router=require('../src/background/background-message-router.js');
const Atomic=require('../src/background/services/cross-worker-atomic-admission.js');
const Fence=require('../src/background/services/update-workflow-fence.js');
const Publish=require('../src/background/services/auto-publish-intent-journal.js');
const WORKER='actual-generation-one',PROFILE='real-profile-one';
function makeStore(){
 const rows={};
 return {rows,async get(keys){
   const names=keys===null?Object.keys(rows):Array.isArray(keys)?keys:[keys];
   return Object.fromEntries(names.filter(k=>Object.hasOwn(rows,k))
    .map(k=>[k,structuredClone(rows[k])]));
 },async set(patch){Object.assign(rows,structuredClone(patch));}};
}
function locks(){
 let busy=false;
 return {async request(name,opts,task){
   assert.equal(name,Atomic.LOCK_NAME);
   assert.deepEqual(opts,{mode:'exclusive',ifAvailable:true});
   if(busy)return task(null);
   busy=true;
   try{return await task({name,mode:'exclusive'});}
   finally{busy=false;}
 }};
}
function setup(){
 const storageLocal=makeStore(),lockManager=locks();let time=100,seq=0;
 const clock=()=>++time;
 const p8=Atomic.create({storageLocal,lockManager,workerInstanceId:WORKER,
   newToken:()=>'worker-proven-token-'+(++seq)+'-long',clock});
 const fence=Fence.create({storageLocal,clock,
   newToken:()=>'unused-fence-token',atomicCoordinator:p8});
 const journal=Publish.create({storageLocal,clock,lockManager,
   lockName:Atomic.LOCK_NAME,workerInstanceId:WORKER,
   newToken:()=>'publish-intent-'+(++seq)+'-long'});
 let safety=0;
 const route=Router.create({MessageContractRegistry:Contract,
  assertPlatformAccessAllowedForRequest:async()=>{safety++;},
  withWorkflowAdmission:(type,task)=>fence.withAdmission(type,task),
  handlers:{
   AUTHORIZE_AUTOMATIC_PUBLISH:async(message,sender,admissionReceipt)=>{
     assert.equal(sender.tab.id,77);
     if(!Object.isFrozen(admissionReceipt))
       throw Error('MISSING_WORKER_ONLY_ADMISSION_RECEIPT');
     return journal.begin({fillId:message.fillId,workflowId:'renewal-one',
       kind:'renewal',profileId:PROFILE,sourceAdId:'12345',
       targetTabId:sender.tab.id,admissionReceipt});
   },
   GET_BACKGROUND_EPOCH:async()=>({epoch:'unchanged'})
  }});
 const sender={tab:{id:77},url:'https://www.kleinanzeigen.de/p-anzeige-aufgeben'};
 return {route,storageLocal,sender,get safety(){return safety;}};
}
test('B2A RED: registered publish route reaches genuine P8 callback and binds immutable journal token',async()=>{
 const e=setup();
 assert.equal(Contract.route('AUTHORIZE_AUTOMATIC_PUBLISH','background').action,'accept');
 const result=await e.route.dispatch({type:'AUTHORIZE_AUTOMATIC_PUBLISH',fillId:'fill-001'},e.sender);
 const p8Starts=Object.values(e.storageLocal.rows).filter(x=>x.state==='admitted');
 assert.equal(p8Starts.length,1);
 assert.equal(result.admissionToken,p8Starts[0].token);
 assert.equal(p8Starts[0].operationType,'AUTHORIZE_AUTOMATIC_PUBLISH');
 assert.equal(result.workerInstanceId,WORKER);
 assert.ok(Object.values(e.storageLocal.rows).some(x=>x.state==='completed'&&x.token===result.admissionToken));
 assert.equal(e.safety,1);
});
test('B2A RED: message-supplied forged token cannot replace private server-origin admission',async()=>{
 const e=setup();
 const result=await e.route.dispatch({
  type:'AUTHORIZE_AUTOMATIC_PUBLISH',fillId:'fill-002',
  admissionReceipt:{token:'attacker-controlled-token',operationType:'AUTHORIZE_AUTOMATIC_PUBLISH'}
 },e.sender);
 assert.match(result.admissionToken,/^worker-proven-token-/);
 assert.notEqual(result.admissionToken,'attacker-controlled-token');
 assert.equal(e.storageLocal.rows[Publish.KEY_PREFIX+'fill-002_'+result.attemptId].admissionToken,result.admissionToken);
});
test('B2A RED: independently admitted routed requests cannot borrow each others tokens',async()=>{
 const e=setup();
 const [one,two]=await Promise.all([
  e.route.dispatch({type:'AUTHORIZE_AUTOMATIC_PUBLISH',fillId:'fill-003'},e.sender),
  e.route.dispatch({type:'AUTHORIZE_AUTOMATIC_PUBLISH',fillId:'fill-004'},e.sender)
 ]);
 assert.notEqual(one.admissionToken,two.admissionToken);
 const starts=Object.values(e.storageLocal.rows).filter(x=>x.state==='admitted');
 assert.equal(starts.length,2);
 assert.ok(starts.some(x=>x.token===one.admissionToken));
 assert.ok(starts.some(x=>x.token===two.admissionToken));
});
test('B2A: unrelated unfenced status remains read-only and receives no admission',async()=>{
 const e=setup();
 const status=await e.route.dispatch({type:'GET_BACKGROUND_EPOCH'},e.sender);
 assert.deepEqual(status,{epoch:'unchanged'});
 assert.equal(Object.keys(e.storageLocal.rows).length,0);
});
test('B2A RED: production in-process router and account-validated before-click entry must carry P8 token',()=>{
 const router=fs.readFileSync('src/background/background-message-router.js','utf8');
 const bg=fs.readFileSync('src/background/background.js','utf8');
 assert.match(router,/"AUTHORIZE_AUTOMATIC_PUBLISH": Object\.freeze\(\{ handler: "AUTHORIZE_AUTOMATIC_PUBLISH", preSafety: false \}\)/);
 assert.match(router,/withWorkflowAdmission\(descriptor\.handler,\s*admissionReceipt\s*=>\s*handler\(message, sender, admissionReceipt\)\)/);
 assert.match(bg,/function withRoutedAdmission\(type, task\)/);
 assert.match(bg,/withAdmission\(type,\s*admissionReceipt\s*=>/);
 assert.match(bg,/task\(admissionReceipt\)/);
 assert.match(bg,/async function authorizeAutomaticPublish\(message, sender, admissionReceipt\)/);
 assert.match(bg,/"AUTHORIZE_AUTOMATIC_PUBLISH":\s*\(message, sender, admissionReceipt\)\s*=>/);
 assert.match(bg,/targetTabId: tabId,\s*admissionReceipt/);
});
