// KAR-130: RED-first conservation of the one shared admission path
// for three detached post-publish archive continuations.
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const Recovery=require('../src/background/services/archive-insertion-recovery-service.js');
const a=fs.readFileSync('src/background/services/archive-insertion-recovery-service.js','utf8');
const v=fs.readFileSync('src/background/services/archive-insertion-verification-service.js','utf8');
const ctrl=fs.readFileSync('src/background/controllers/archive-insertion-controller.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let count=0;function ok(x,why){assert.ok(x,why);++count;console.log('PASS KAR130 '+why);}
const expression="withAutonomousAdmission('archive-postpublish-detached', () => runArchiveInsertionPostPublish(";
function numberOf(hay,needle){return hay.split(needle).length-1;}
async function tick(){for(let i=0;i<12;i++)await Promise.resolve();}
function make(admit,session){
 let starts=0;
 const required={
  readArchiveInsertionSessions:async()=>({[session.archiveInsertionId]:session}),
  readFillSessions:async()=>({}),
  getInventory:async()=>null,
  isTrashRecord:()=>false,
  persistArchiveInsertionSession:async()=>{},
  deleteImagesByInventoryId:async()=>{},
  logDiagnostic:async()=>{},
  setAppNotice:async()=>{},
  broadcastInventoryChanged:()=>{},
  normalizeRenewalMode:()=> 'safe',
  compareArchiveInsertionRecords:async()=>({status:'mismatch'}),
  runArchiveInsertionPostPublish:async()=>{starts++},
  confirmPublishedArchiveInsertion:async()=>{},
  cryptoApi:{randomUUID:()=> 'mock-uuid'},
  withAutonomousAdmission:admit
 };
 return {runtime:Recovery.create(required),get starts(){return starts;}};
}
async function main(){
 ok(bg.includes("'archive-postpublish-detached': ['archiveInsertion', 'templateFill', 'insertionLock']"),
   'detached archive tasks map conservatively to archive/template/insertion owners');
 ok(bg.includes("withAutonomousAdmission,") && bg.includes('archiveInsertionController = ArchiveInsertionController.create({'),
   'real Worker injects the shared admission function into archive controller');
 ok(ctrl.includes('withAutonomousAdmission,')&&ctrl.slice(ctrl.indexOf('const required = {'),ctrl.indexOf('for (const [name, value]')).includes('withAutonomousAdmission'),
   'archive controller requires a fail-closed admission port');
 ok(a.includes('withAutonomousAdmission')&&a.slice(a.indexOf('const required='),a.indexOf('for(const [name,value]')).includes('withAutonomousAdmission'),
   'archive recovery service requires the port as nonoptional');
 ok(v.includes('withAutonomousAdmission')&&v.slice(v.indexOf('const required='),v.indexOf('for(const [name,value]')).includes('withAutonomousAdmission'),
   'archive verification service requires the port as nonoptional');
 ok(numberOf(a,expression)===2,'two recovery detached continuations have individual admission');
 ok(numberOf(v,expression)===1,'published confirmation detached continuation has admission');
 ok(!a.includes('void runArchiveInsertionPostPublish(')&&!v.includes('void runArchiveInsertionPostPublish('),
   'no archive post-publish detached task launches directly');
 ok(bg.includes("return requireUpdateWorkflowFence().withAdmission('AUTONOMOUS:' + kind, task)"),
   'uses same KAR-99 workflow fence');
 ok(bg.includes('requirePersistedOwnerObserver().track(names, admittedTask)'),
   'admitted archive Promise counted for complete in-process lifetime');
 assert.throws(()=>make(undefined,{archiveInsertionId:'abc',status:'published',newAdId:'123'}),/dependency withAutonomousAdmission/);
 ok(true,'missing admission dependency fails closed');
 let admitted=0;
 const deny=make(async kind=>{admitted++;assert.equal(kind,'archive-postpublish-detached');throw Error('KR_UPDATE_FENCE_HELD');},
   {archiveInsertionId:'abc',status:'published',newAdId:'123'});
 await deny.runtime.resumePendingArchiveInsertions();await tick();
 ok(admitted===1&&deny.starts===0,'denied recovery cannot start detached postpublish operation');
 let allowCount=0;
 const allow=make(async(kind,task)=>{assert.equal(kind,'archive-postpublish-detached');allowCount++;return task();},
   {archiveInsertionId:'abc',status:'published',newAdId:'123'});
 await allow.runtime.resumePendingArchiveInsertions();await tick();
 ok(allowCount===1&&allow.starts===1,'admitted recovery starts detached operation exactly once');
 ok(!bg.includes('getOwnerSnapshot: () => requirePersistedOwnerObserver()'),
   'source-only in-flight accounting is not a positive update lease');
 console.log('PASS KAR130 total '+count);
}
main().catch(e=>{console.error(e);process.exitCode=1});
