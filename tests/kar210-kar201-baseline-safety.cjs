'use strict';
// KAR-210: baseline product safety independent of KAR-201 schema and manual-detach mechanisms.
// Synthetic fixture only. Run exact production function bodies with controlled dependencies.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),test=require('node:test');
const {parseHTML}=require('linkedom');
require('../src/shared/runtime-deps.js');
const Verify=require('../src/content/template-verification.js');
const Publish=require('../src/content/template-publish-flow.js');
const Service=require('../src/background/services/template-fill-service.js');
const extract=(file,start,end,ctx,name)=>{
  const source=fs.readFileSync(require.resolve(file),'utf8');
  const a=source.indexOf(start),b=source.indexOf(end,a);
  assert.ok(a>=0&&b>a,'Exact production function boundary missing: '+name);
  return vm.runInNewContext(source.slice(a,b)+'\n'+name+';',ctx);
};
const clone=x=>JSON.parse(JSON.stringify(x));
const template={categoryId:'246',title:'Synthetic fixture',description:'Synthetic',price:{value:'12'},images:Array.from({length:11},(_,i)=>({imageKey:'synthetic-'+i})),dynamicAttributes:[{key:'dekoration.color',label:'Farbe',technicalValue:'other',displayValue:'Andere Farben'}]};
function formFixture({wrongCategory=false,wrongValue=false,missing=false,duplicate=false}={}){
  const {document}=parseHTML('<html><body><form><input name="categoryId" value="'+(wrongCategory?'405':'246')+'"><input name="title" value="Synthetic fixture"><textarea name="description">Synthetic</textarea><input name="priceAmount" value="12">'+(missing?'':'<input type="hidden" name="attributeMap[dekoration.color]" value="'+(wrongValue?'white':'other')+'">')+(duplicate?'<input type="hidden" name="attributeMap[dekoration.color]" value="other">':'')+'</form></body></html>');
  return {document,form:document.querySelector('form')};
}
test('exact technical readback accepts unique match and rejects wrong, absent and duplicate fields',()=>{
  const verifier=Verify.create({checkedRadio:()=>null});
  assert.deepEqual(verifier.verifyArchiveTemplate(template,formFixture().form),[]);
  for(const opts of [{wrongCategory:true},{wrongValue:true},{missing:true},{duplicate:true}])
    assert.ok(verifier.verifyArchiveTemplate(template,formFixture(opts).form).length>0,JSON.stringify(opts));
});
test('actual fill runner transfers all 11 image records in order and never advances after failed verification',async()=>{
  for(const opts of [{wrongValue:true},{duplicate:true},{wrongCategory:true},{imageIncomplete:true},{}]){
    const {document,form}=formFixture(opts),messages=[],uploads=[],advances=[];
    const verifier=Verify.create({checkedRadio:()=>null});
    const ctx={document,updatePanel(){},diagnostic(){},runtimeMessage:async m=>{messages.push(clone(m));},waitFor:async f=>f(),ensureStableTitleValue:async()=>form,setCategory:async()=>({confirmed:true}),resolveActivePostingForm:()=>form,paidInsertionDetection:()=>({required:false}),chooseRadio:()=>true,fillDynamicAttributes:async()=>[],fillShipping:async()=>[],fillBuyNow:async()=>[],setTextField:(e,v)=>{e.value=v;},settleAfterInteraction:async()=>{},fillPriceType:async()=>[],fillLocation:async()=>[],uploadImages:async(_id,t)=>{uploads.push(t.images.map(x=>x.imageKey));return {complete:!opts.imageIncomplete,issues:opts.imageIncomplete?['Image incomplete']:[],states:[]};},verifyArchiveTemplate:verifier.verifyArchiveTemplate,verify:verifier.verify,advanceAfterVerifiedFill:async s=>{advances.push(clone(s));return {awaitingPublish:true};}};
    const run=extract('../src/content/template-filler.js','async function runFillSession(','  async function runPendingFill(',ctx,'runFillSession');
    const before=clone(template);
    const result=await run({fillId:'fill',archiveInsertionId:'archive',template});
    assert.deepEqual(uploads,[template.images.map(x=>x.imageKey)]);
    assert.deepEqual(template,before);
    const complete=Object.keys(opts).length===0;
    assert.equal(result.complete,complete);
    assert.equal(advances.length,complete?1:0);
    assert.equal(messages.at(-1).status,complete?'running':'needs-review');
    assert.equal(messages.at(-1).result.complete,complete);
  }
});
test('actual session mutation rejects wrong tab and preserves terminal failed archive state and source images',async()=>{
  const local={data:{},async get(k){return {[k]:clone(this.data[k]??{})};},async set(p){Object.assign(this.data,clone(p));}};
  const api=Service.create({storageLocal:local});
  const initial={fillId:'fill',targetTabId:42,archiveInsertionId:'archive',inventoryId:'archive:fixture',status:'running',stage:'form-ready'};
  await api.writeFillSessions({fill:initial});
  const archives={archive:{archiveInsertionId:'archive',status:'filling',newAdId:null,sourceRecord:clone(template)}};
  const ctx={withTemplateFillMutation:api.withTemplateFillMutation,readFillSessions:api.readFillSessions,writeFillSessions:api.writeFillSessions,TERMINAL_TEMPLATE_FILL_STATUSES:api.TERMINAL_TEMPLATE_FILL_STATUSES,isTransientTemplateFillProgress:api.isTransientTemplateFillProgress,evictTemplateImageTransfersForFill:api.evictTemplateImageTransfersForFill,readArchiveInsertionSessions:async()=>clone(archives),persistArchiveInsertionSession:async a=>{archives.archive=clone(a);},logDiagnostic:async()=>{},sessionCorrelationContext:()=>({})};
  const update=extract('../src/background/controllers/template-fill-controller.js','async function updateTemplateFillSession(','async function terminalizeTemplateFillOnPlatformError(',ctx,'updateTemplateFillSession');
  const msg={fillId:'fill',status:'needs-review',stage:'verified',result:{complete:false,issues:['Unconfirmed color']}};
  await assert.rejects(()=>update(msg,{tab:{id:43}}),/Tab/);
  assert.deepEqual((await api.readFillSessions()).fill,initial);
  await update(msg,{tab:{id:42}});
  const failed=(await api.readFillSessions()).fill;
  assert.equal(failed.status,'needs-review');assert.deepEqual(failed.result,msg.result);
  assert.equal(archives.archive.status,'error');assert.equal(archives.archive.newAdId,null);assert.deepEqual(archives.archive.sourceRecord,template);
  const stale=await update({fillId:'fill',status:'running',stage:'form-verified',result:{complete:true,issues:[]}},{tab:{id:42}});
  assert.equal(stale.terminalStateProtected,true);assert.deepEqual((await api.readFillSessions()).fill,failed);
});
test('actual publish API never clicks for incomplete, ambiguous, template-only, paid or already submitted sessions',async()=>{
  const old={document:global.document,location:global.location,HTMLInputElement:global.HTMLInputElement,window:global.window};
  try{
    global.HTMLInputElement=class {};
    global.location={pathname:'/p-anzeige-aufgeben-schritt2.html',href:'https://example.invalid/p-anzeige-aufgeben-schritt2.html'};
    global.window={scrollTo(){}};
    for(const type of ['incomplete','issues','missing-owner','ambiguous','template-only','paid','submitted','valid']){
      let clicks=0;const button=()=>({textContent:'Anzeige aufgeben',disabled:false,click(){clicks++;},scrollIntoView(){}});
      const buttons=type==='ambiguous'?[button(),button()]:[button()];
      global.document={querySelectorAll:()=>buttons,querySelector:()=>null,addEventListener(){},documentElement:{scrollHeight:100}};
      const pub=Publish.create({PaidInsertionGuard:{detect:()=>({required:type==='paid',phase:'checkout'})},clean:x=>String(x||'').trim(),visible:()=>true,visibleText:x=>x.textContent,sleep:async()=>{},runtimeMessage:async()=>({}),diagnostic(){},updatePanel(){}});
      const session={fillId:'synthetic',archiveInsertionId:type==='missing-owner'?null:'archive',templateOnly:type==='template-only',stage:type==='submitted'?'publish-submitted':'form-verified',result:{complete:type!=='incomplete',issues:type==='issues'?['mismatch']:[]}};
      await pub.autoPublishVerifiedRenewal(session);
      assert.equal(clicks,type==='valid'?1:0,type);
    }
  } finally {Object.assign(global,old);}
});
