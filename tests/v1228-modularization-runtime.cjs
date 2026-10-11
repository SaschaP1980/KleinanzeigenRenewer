const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function load(file){const registry=new Map();const ctx={console,Date,Intl,URL,Error,setTimeout,clearTimeout,Set,Map,Object,Array,String,Number,Boolean,Math,Promise};ctx.globalThis=ctx;ctx.KRDeps={register:(n,v)=>registry.set(n,v)};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return registry;}
function classList(){const values=new Set();return{add:(...xs)=>xs.forEach(x=>values.add(x)),remove:(...xs)=>xs.forEach(x=>values.delete(x)),toggle:(x,force)=>{if(force===true){values.add(x);return true;}if(force===false){values.delete(x);return false;}if(values.has(x)){values.delete(x);return false;}values.add(x);return true;},contains:x=>values.has(x)};}
function el(){return {textContent:'',classList:classList()};}
let n=0;const pass=m=>{n++;console.log('PASS '+m)};
{
 const api=load('src/app/inventory-capture-controller.js').get('KRInventoryCaptureController');
 const candidateModel=load('src/app/inventory-candidate-model.js').get('KRInventoryCandidateModel');
 const inventoryCaptureView=new Proxy({bulkProgressModel:()=>({}),inventoryCaptureSummaryText:()=>'',inventoryScopeLabel:()=>''},{get:(target,key)=>key in target?target[key]:(()=>{})});
 const c=api.create({normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',accountGateModel:()=>({allowed:true,tooltip:''}),inventoryCaptureView,inventoryCandidateModel:candidateModel});
 assert.equal(c.status().dialogState,'closed');
 c.setKnownSingleCandidate({adId:'123',title:'Candidate'},17,'123');
 let s=c.status(); assert.equal(s.sourceTabId,17); assert.equal(s.selectedAdId,'123'); assert.equal(s.candidates.length,1);
 c.setReentryTarget({mode:'single',adId:'456'}); s=c.status(); assert.deepEqual(JSON.parse(JSON.stringify(s.reentryTarget)),{mode:'single',adId:'456'});
 c.setReentryTarget({mode:'single',adId:'bad'}); assert.equal(c.status().reentryTarget,null);
 c.ensureBulkReentry('run-42'); assert.deepEqual(JSON.parse(JSON.stringify(c.status().reentryTarget)),{mode:'bulk',runId:'run-42'});
 c.clearReentryTarget('bulk','run-42'); assert.equal(c.status().reentryTarget,null);
 pass('inventory controller owns capture and reentry state through its public contract');
}
{
 const api=load('src/app/renewal-dialog-controller.js').get('KRRenewalDialogController');
 const r=api.create({normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',getCurrentConfiguration:()=>({renewalMode:'safe'})});
 r.trackStarted({renewalId:'ren-1',sourceAdId:'100',sourceRecord:{adId:'100'}});
 let s=r.status(); assert.equal(s.trackedRenewalId,'ren-1'); assert.equal(s.trackedRenewalSourceAdId,'100'); assert.equal(s.trackedRenewalSourceRecord.adId,'100');
 r.resetTracking(); s=r.status(); assert.equal(s.trackedRenewalId,null); assert.equal(s.trackedRenewalSourceAdId,null); assert.equal(s.trackedRenewalSourceRecord,null);
 pass('renewal controller owns tracking lifecycle independently of app');
}
{
 const api=load('src/app/renewal-dialog-controller.js').get('KRRenewalDialogController');
 const message=el(), title=el(), text=el(), hint=el(), shortcut=el(), shortcutTitle=el(), shortcutText=el();
 let activity=null;
 const r=api.create({
  normalizeRenewalMode:v=>String(v)==='fast'?'fast':'safe',getCurrentConfiguration:()=>({renewalMode:'safe'}),
  publishUiActivity:value=>{activity=value;},
  elements:{renewalProgressMessage:message,renewalProgressMessageTitle:title,renewalProgressMessageText:text,renewalBackgroundHint:hint,renewalProgressShortcut:shortcut,renewalProgressShortcutTitle:shortcutTitle,renewalProgressShortcutText:shortcutText}
 });
 r.showProgress({adId:'200',renewal:{renewalId:'r2',renewalMode:'safe',status:'verified',stage:'replacement-ready',autoReplacementFailedAt:'2026-01-01T00:00:00Z'}});
 assert.equal(r.status().mode,'progress');
 assert.equal(activity.kind,'error');
 assert.equal(title.textContent,'Austausch nicht abgeschlossen');
 assert.match(text.textContent,/bisherige Anzeige bleibt geschützt/);
 assert.match(shortcutTitle.textContent,/Prüfung erforderlich/);
 pass('renewal controller preserves protected-source failure semantics through public showProgress');
}
console.log(`${n}/3 PASS`);
