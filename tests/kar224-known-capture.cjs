'use strict';
const assert=require('node:assert/strict'),test=require('node:test'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/app/app.js'),'utf8');
const a=source.indexOf('async function startKnownSingleInventoryCapture('),b=source.indexOf('\nfunction friendlyErrorMessage(',a);
assert.ok(a>=0&&b>a);
function fixture({preview={adId:'200',title:'Published'},result={ok:true,saved:{adId:'200'}},prepareError=false,dialogOpen=true}={}){
 const calls=[],dialog={open:dialogOpen,close(reason){calls.push(['close',reason]);this.open=false;}};
 const controller={setKnownSingleCandidate(...args){calls.push(['candidate',...args]);},showDialog(){calls.push(['show']);},async startSingle(){calls.push(['start']);return result;}};
 const context={runtimeMessage:async m=>{calls.push(['prepare',m.type,m.fillId,m.tabId,m.adId]);if(prepareError)throw Error('prepare failed');return preview;},requireInventoryCaptureController:()=>controller,trashTemplateDialog:dialog};
 const start=vm.runInNewContext(source.slice(a,b)+'\nstartKnownSingleInventoryCapture;',context);
 return {start,calls,preview,result};
}
test('published trash template invokes the actual public inventory controller handoff and returns its result',async()=>{
 const f=fixture();assert.equal(await f.start({fillId:'f',tabId:42,adId:'200'}),f.result);
 assert.deepEqual(f.calls,[['prepare','PREPARE_TRASH_TEMPLATE_INVENTORY_CAPTURE','f',42,'200'],['candidate',f.preview,42,'200'],['close','inventory-started'],['show'],['start']]);
});
test('failed controller capture stays failed, with no second start',async()=>{
 const f=fixture({result:{ok:false,error:'capture failed'},dialogOpen:false});
 assert.equal(await f.start({fillId:'f',tabId:42,adId:'200'}),f.result);
 assert.equal(f.calls.filter(c=>c[0]==='start').length,1);assert.ok(!f.calls.some(c=>c[0]==='close'));
});
test('wrong or missing identity and failed preparation never reach the controller',async()=>{
 for(const opts of [{preview:{adId:'201'}},{preview:null},{prepareError:true}]){
 const f=fixture(opts);await assert.rejects(f.start({fillId:'f',tabId:42,adId:'200'}));assert.deepEqual(f.calls.map(c=>c[0]),['prepare']);
 }
 for(const args of [{fillId:'',tabId:42,adId:'200'},{fillId:'f',tabId:0,adId:'200'},{fillId:'f',tabId:42,adId:'bad'}]){
 const f=fixture();await assert.rejects(f.start(args));assert.deepEqual(f.calls,[]);
 }
});
