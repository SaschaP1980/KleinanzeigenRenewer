'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('src/background/services/trash-template-publish-detection-service.js','utf8');
const bg=fs.readFileSync('src/background/background.js','utf8');
let owner=null;vm.runInNewContext(source,{KRDeps:{register(n,x){assert.equal(n,'KRTrashTemplatePublishDetectionService');owner=x;}}});
assert.throws(()=>owner.create(),/requires exact-ID/);
assert.match(bg,/requireTrashTemplatePublishDetectionService\(\)\.maybeDetectTrashTemplatePublishedAd\(tabId, changeInfo, tabHint\)/);
assert.match(bg,/renewalPublishDetectionInFlight, trashTemplatePublishDetectionInFlight/,
 'emergency reset must share detector in-flight Set');
const active=new Set(),events=[],saved=[],notifications=[];
const session={fillId:'f',targetTabId:55,status:'complete',templateOnly:true,sourceAdId:'123',inventoryId:'inv',operationId:'op'};
const fills={f:session};
let ownAd=true,reportedId='456',throwConnection=false;
const options={
 sessionPort:{readFillSessions:async()=>fills,writeFillSessions:async x=>{saved.push({...x});},
 withTemplateFillMutation:async cb=>cb()},
 tabPort:{tabRegistry:{getTabOrThrow:async()=>({id:55,url:'https://www.kleinanzeigen.de/s-anzeige/demo/456-1-1'})},
 chrome:{tabs:{}},TAB_ROLES:{TEMPLATE_TARGET:'template'},
 registerShadowTab:async()=>{},
 ensureContentConnection:async()=>{if(throwConnection)throw Error('fixture offline');},
 sendTabRequest:async(_id,msg)=>msg.type==='PAGE_STATUS'?
   {adId:reportedId,auth:{loggedIn:true,ownAd}}:
   {adId:'456',publicUrl:'https://www.kleinanzeigen.de/s-anzeige/demo/456-1-1'}},
 evidencePort:{publishedAdCandidateFromUrl:()=>({adId:'456',kind:'public'}),URL},
 diagnosticsPort:{logDiagnostic:async(_level,event)=>{events.push(event);},
 sessionCorrelationContext:()=>({}),
 broadcastInventoryChanged:(...args)=>{notifications.push(args);}},
 statePort:{trashTemplatePublishDetectionInFlight:active}
};
const svc=owner.create(options);
assert.deepEqual(Object.keys(svc),['maybeDetectTrashTemplatePublishedAd']);
(async()=>{
 assert.equal(await svc.maybeDetectTrashTemplatePublishedAd(0,{status:'complete'}),false);
 assert.equal(await svc.maybeDetectTrashTemplatePublishedAd(55,{url:'https://evil.invalid/a',status:'complete'}),false);
 assert.equal(active.size,0);
 ownAd=false;assert.equal(await svc.maybeDetectTrashTemplatePublishedAd(55,{status:'complete'}),false);
 assert.equal(session.newAdId,undefined);
 ownAd=true;reportedId='999';assert.equal(await svc.maybeDetectTrashTemplatePublishedAd(55,{status:'complete'}),false);
 reportedId='456';
 active.add(55);assert.equal(await svc.maybeDetectTrashTemplatePublishedAd(55,{status:'complete'}),false);
 active.delete(55);
 const result=await svc.maybeDetectTrashTemplatePublishedAd(55,{status:'complete'});
 assert.equal(result,true);assert.equal(session.newAdId,'456');assert.equal(session.stage,'template-only-published');
 assert.equal(notifications.at(-1)[0],'trash-template-published');
 assert.ok(events.includes('TRASH_TEMPLATE_PUBLISHED_DETECTED'));
 assert.equal(active.size,0);
 session.newAdId='';throwConnection=true;
 await assert.rejects(svc.maybeDetectTrashTemplatePublishedAd(55,{status:'complete'}),/fixture offline/);
 assert.equal(active.size,0,'transport failure must release detection lock');
 console.log('PASS KAR-175 Wave 7 trash template: no URL-only authorization, exact account/ID, local update and finally cleanup');
})().catch(e=>{console.error(e);process.exitCode=1});
