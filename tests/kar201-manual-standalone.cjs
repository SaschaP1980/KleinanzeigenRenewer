'use strict';
// KAR-201 owner-driven manual standalone completion. Synthetic only: no real posting.
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const controller=fs.readFileSync('src/background/controllers/template-fill-controller.js','utf8');
const publish=fs.readFileSync('src/content/template-publish-flow.js','utf8');
const filler=fs.readFileSync('src/content/template-filler.js','utf8');
assert.match(controller,/async function approveManualStandaloneRelease\(message, session, sessions, sender\)/,
  'real background controller must own tab/account-bound manual detachment');
assert.match(controller,/if \(message\?\.manualStandaloneApproval\)/,
  'manual route must bypass terminal-state early return only through its own gate');
assert.match(controller,/manualPublishDetachedAt/,
  'durable manual detachment must prevent resumed managed auto-publication');
assert.match(publish,/function offerManualStandaloneRelease\(/,
  'visible owner confirmation is required for an eligible partial archive fill');
assert.match(publish,/if \(manualDetached\) \{[\s\S]{0,250}!event\.isTrusted/,
  'a synthetic click cannot exercise human publication authority');
assert.match(publish,/MANUAL_STANDALONE_PUBLISH_CLICKED/,
  'record user-initiated click without claiming online publication');
assert.match(filler,/manualStandaloneReviewEligible/,
  'only image-complete, reviewed, category-checked archive partial fills can offer manual mode');
const manualClickBranch=publish.split('if (manualDetached) {')[1]?.split('if (permitted === control')[0] || '';
assert.doesNotMatch(manualClickBranch,/runtimeMessage\s*\(/,
  'manual standalone click cannot send managed renewal publication messages');

const beginning=controller.indexOf('async function approveManualStandaloneRelease(');
const ending=controller.indexOf('async function updateTemplateFillSession(',beginning);
assert.ok(beginning>=0&&ending>beginning);
const html='https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html';
const clone=x=>structuredClone(x);
const build=()=>{
 const tabId=87, fillId='synthetic-201', archiveId='archive-201';
 const fills={[fillId]:{fillId,archiveInsertionId:archiveId,renewalId:null,templateOnly:false,
  targetTabId:tabId,sourceAdId:'12345',status:'needs-review',stage:'verified',
  createdAt:new Date().toISOString(),inventoryId:'archive:'+archiveId,targetProfileId:'profile-1',
  result:{complete:false,issues:['Merkmal Marke muss manuell geprüft werden.'],
   manualStandaloneReviewEligible:true,manualImageCount:3,
   schemaPreflight:{verified:false,categoryId:'246',comparisonStatus:'legacy-unversioned'}}}};
 const archives={[archiveId]:{archiveInsertionId:archiveId,fillId,sourceAdId:'12345',
  targetProfileId:'profile-1',targetProfileName:'Testkonto',targetTabId:tabId,
  status:'error',stage:'error-phase-1',newAdId:null,sourceRecord:{title:'Synthetic ad',
    category:{id:'246'},images:[{},{},{}]}}};
 const ctx={
  cryptoApi:{randomUUID:()=> 'synthetic-one-use-token'},
  TEMPLATE_TARGET_URL:html,
  readArchiveInsertionSessions:async()=>clone(archives),
  readFillSessions:async()=>clone(fills),
  writeFillSessions:async data=>{Object.assign(fills,clone(data))},
  persistArchiveInsertionSession:async obj=>{archives[obj.archiveInsertionId]=clone(obj)},
  assertSelectedProfileMatchesLiveAccount:async()=>({profileId:'profile-1'}),
  getInsertionLockState:async()=>({locked:false,conflictCount:0}),
  logDiagnostic:async()=>{},
  sessionCorrelationContext:()=>({}),broadcastInventoryChanged:()=>{},
  Date,Number,String,Boolean,Object,Set,Array,RegExp,URL,Error,
  };
 const approve=vm.runInNewContext(controller.slice(beginning,ending)+'\napproveManualStandaloneRelease;',ctx);
 const sender={tab:{id:tabId,url:html},url:html};
 return {approve,session:fills[fillId],fills,archives,sender,fillId,archiveId,ctx};
};
const reject=async(label,mutate)=>{
 const f=build();mutate(f);
 await assert.rejects(()=>f.approve({manualStandaloneApproval:{action:'prepare'}},f.session,f.fills,f.sender),/KR_MANUAL_|nicht|ungültig/i,label);
 assert.equal(f.fills[f.fillId].manualPublishDetachedAt,undefined);
 assert.equal(f.archives[f.archiveId].newAdId,null);
};
(async()=>{
 await reject('wrong sender tab',f=>{f.sender.tab.id=5});
 await reject('unverified live profile',f=>{f.ctx.assertSelectedProfileMatchesLiveAccount=async()=>({profileId:'someone-else'})});
 await reject('non-archive renewal',f=>{f.session.renewalId='a-renewal'});
 await reject('source already published',f=>{f.archives[f.archiveId].newAdId='999999'});
 await reject('image verification absent',f=>{f.session.result.manualStandaloneReviewEligible=false});
 await reject('malicious paid checkout page',f=>{f.sender.tab.url='https://www.kleinanzeigen.de/m-bestellung-aufnehmen.html';f.sender.url=f.sender.tab.url});
 const f=build();
 const prep=await f.approve({manualStandaloneApproval:{action:'prepare'}},f.session,f.fills,f.sender);
 assert.equal(prep.pending,true);assert.equal(prep.authorized,false);
 assert.equal(f.archives[f.archiveId].status,'error');
 await assert.rejects(()=>f.approve({manualStandaloneApproval:{action:'commit',token:'wrong'}},f.session,f.fills,f.sender),/KR_MANUAL_/);
 const result=await f.approve({manualStandaloneApproval:{action:'commit',token:prep.token}},f.session,f.fills,f.sender);
 assert.equal(result.manualDetached,true);
 assert.equal(result.autoPublishAllowed,false);
 assert.equal(f.fills[f.fillId].stage,'manual-standalone');
 assert.equal(f.fills[f.fillId].status,'needs-review');
 assert.equal(f.archives[f.archiveId].status,'needs-review');
 assert.equal(f.archives[f.archiveId].stage,'manual-standalone');
 assert.equal(f.archives[f.archiveId].newAdId,null);
 assert.deepEqual(f.archives[f.archiveId].sourceRecord.images.length,3);
 await assert.rejects(()=>f.approve({manualStandaloneApproval:{action:'commit',token:prep.token}},f.session,f.fills,f.sender),/KR_MANUAL_/);
 console.log('PASS KAR-201: 2-click manual detach, 6 deny cases, no source retire/publish/retry');
})().catch(e=>{console.error(e);process.exitCode=1});
