'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const bg=fs.readFileSync('src/background/background.js','utf8');
function declaration(name){
 const re=new RegExp('(?:^|\\n)((?:async )?function '+name+'\\()','g');
 const found=[...bg.matchAll(re)];assert.equal(found.length,1,'single historical owner: '+name);
 const start=found[0].index+found[0][0].indexOf(found[0][1]),end=bg.indexOf('\n}',start);assert.ok(end>start,name);
 return bg.slice(start,end+2);
}

const url='https://www.kleinanzeigen.de/s-anzeige/demo/456-1-1';
function fixture(){
 const active=new Set(),events=[],saved=[],notifications=[],requests=[],registered=[];
 const session={fillId:'f',targetTabId:55,status:'complete',templateOnly:true,sourceAdId:'123',inventoryId:'inv',operationId:'op'};
 const fills={f:session};
 let ownAd=true,loggedIn=true,pageId='456',detectedId='456',failConnection=false,failRequests=false,changeOwner=false;
 const ctx={URL,trashTemplatePublishDetectionInFlight:active,readFillSessions:async()=>fills,writeFillSessions:async x=>saved.push(structuredClone(x)),
 withTemplateFillMutation:async cb=>{if(changeOwner)session.targetTabId=99;await cb();},
 tabRegistry:{getTabOrThrow:async id=>({id,url})},chrome:{tabs:{}},TAB_ROLES:{TEMPLATE_TARGET:'template'},registerShadowTab:async(...x)=>registered.push(x),
 ensureContentConnection:async()=>{if(failConnection)throw Error('fixture offline');},
 sendTabRequest:async(id,msg)=>{requests.push({id,...msg});if(failRequests)throw Error('fixture request failure');return msg.type==='PAGE_STATUS'?{adId:pageId,auth:{loggedIn,ownAd}}:{adId:detectedId,publicUrl:url};},
 logDiagnostic:async(_l,e)=>events.push(e),sessionCorrelationContext:()=>({}),broadcastInventoryChanged:(...args)=>notifications.push(args)};
 vm.runInNewContext(['publishedAdCandidateFromUrl','maybeDetectTrashTemplatePublishedAd'].map(declaration).join('\n'),ctx);
 return {run:ctx.maybeDetectTrashTemplatePublishedAd,active,events,saved,notifications,requests,registered,session,setOwn:v=>ownAd=v,setLogin:v=>loggedIn=v,setPage:v=>pageId=v,setDetected:v=>detectedId=v,setFailConnection:v=>failConnection=v,setFailRequests:v=>failRequests=v,setChangeOwner:v=>changeOwner=v};
}
test('historical template publish detection rejects invalid tab/origin, unowned page, wrong/source ID and duplicate',async()=>{
 const f=fixture();
 assert.equal(await f.run(0,{status:'complete'}),false);assert.equal(await f.run(99,{status:'complete'}),false);assert.equal(await f.run(55,{url:'https://evil.invalid/a',status:'complete'}),false);
 assert.equal(f.requests.length,0);assert.equal(f.active.size,0);
 f.setOwn(false);assert.equal(await f.run(55,{status:'complete'}),false);f.setOwn(true);
 f.setLogin(false);assert.equal(await f.run(55,{status:'complete'}),false);f.setLogin(true);
 f.setPage('999');assert.equal(await f.run(55,{status:'complete'}),false);
 f.setPage('123');f.setDetected('123');assert.equal(await f.run(55,{status:'complete'}),false);
 f.setPage('456');f.setDetected('456');f.active.add(55);assert.equal(await f.run(55,{status:'complete'}),false);f.active.delete(55);
 f.setFailRequests(true);assert.equal(await f.run(55,{status:'complete'}),false);
 assert.equal(f.session.newAdId,undefined);assert.equal(f.saved.length,0);assert.equal(f.notifications.length,0);assert.equal(f.active.size,0);
});
test('historical template publish detection saves one local result with exact new ID and releases shared lock',async()=>{
 assert.match(bg,/renewalPublishDetectionInFlight, trashTemplatePublishDetectionInFlight/);
 const f=fixture();assert.equal(await f.run(55,{status:'complete'}),true);
 assert.equal(f.session.newAdId,'456');assert.equal(f.session.stage,'template-only-published');assert.equal(f.saved.length,1);assert.equal(f.notifications.at(-1)[0],'trash-template-published');
 assert.equal(f.registered[0][2].adId,'456');assert.equal(f.registered[0][2].ownerId,'f');assert.ok(f.events.includes('TRASH_TEMPLATE_PUBLISHED_DETECTED'));
 assert.ok(f.requests.some(x=>x.type==='DETECT_PUBLISHED_AD'&&x.sourceAdId==='123'));
 assert.equal(await f.run(55,{status:'complete'}),false);assert.equal(f.saved.length,1);assert.equal(f.active.size,0);
});
test('historical template detector rechecks owner before mutation and releases lock on transport failure',async()=>{
 const stale=fixture();stale.setChangeOwner(true);assert.equal(await stale.run(55,{status:'complete'}),false);assert.equal(stale.saved.length,0);assert.equal(stale.active.size,0);
 const fail=fixture();fail.setFailConnection(true);await assert.rejects(fail.run(55,{status:'complete'}),/fixture offline/);assert.equal(fail.active.size,0);assert.equal(fail.saved.length,0);
});
