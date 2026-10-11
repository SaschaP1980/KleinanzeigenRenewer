const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
function load(file,extra={}){const registry=new Map();const ctx={console,Date,Intl,URL,Error,setTimeout,clearTimeout,...extra};ctx.globalThis=ctx;ctx.KRDeps={register:(n,v)=>registry.set(n,v)};vm.createContext(ctx);vm.runInContext(fs.readFileSync(file,'utf8'),ctx);return{ctx,registry};}
let n=0;const pass=m=>{n++;console.log('PASS '+m)};
{
 const {registry}=load('shared-ui-helpers.js'); const api=registry.get('KRSharedUiHelpers'); const doc={createElement(tag){return {tag,className:'',attrs:{},setAttribute(k,v){this.attrs[k]=v},append(v){this.child=v}}}}; const h=api.create({document:doc,inventoryView:{priceTypeParts:()=>({short:'VB',long:'Verhandlungsbasis'})}});
 assert.equal(h.displayPrice({price:{value:'12'}}),'12 €'); assert.equal(h.compactCategoryLabel({category:{path:['A','B']}}),'B'); const b=h.makeCompactIconButton({icon:'update',label:'Aktualisieren'}); assert.equal(b.attrs['aria-label'],'Aktualisieren'); pass('shared UI helper runtime preserves formatting and accessible compact button');
}
{
 const sent=[];let sendCount=0;const chrome={runtime:{lastError:null},tabs:{sendMessage(id,msg,cb){sendCount++; if(sendCount===1){chrome.runtime.lastError={message:'Receiving end does not exist'};cb();chrome.runtime.lastError=null;} else cb({ok:true,result:{ready:true}});},get:async()=>({id:1,discarded:false}),query:async()=>[]}};
 const {registry}=load('tab-page-inspection-controller.js',{chrome}); const api=registry.get('KRTabPageInspectionController').create({chrome,runtimeMessage:async m=>{assert.equal(m.type,'ENSURE_CONTENT_CONNECTION');return{bootstrapped:true}},logEvent:(e,d,s,o)=>sent.push({e,d,s,o})});
 returnPromise=api.tabMessage(1,{type:'PAGE_STATUS'},{attempts:1}).then(result=>{assert.equal(result.ready,true);assert.ok(sent.some(x=>x.e==='TAB_CONNECTION_RECOVERED'));pass('tab inspection runtime recovers transient content connection');});
 global.__p=returnPromise;
}
Promise.resolve(global.__p).then(()=>console.log(`${n}/2 PASS`)).catch(e=>{console.error(e);process.exitCode=1});
