const {indexedDB, IDBKeyRange, IDBObjectStore} = require('fake-indexeddb');
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const __session={};
const context = vm.createContext({indexedDB, IDBKeyRange, crypto:require('node:crypto').webcrypto, Blob, URL, AbortSignal,
 chrome:{storage:{local:{get:async()=>({}),set:async()=>{}},session:{get:async()=>({...__session}),set:async patch=>Object.assign(__session,patch)}}, runtime:{onMessage:{addListener(){}}}}, importScripts(){}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../tab-registry.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../diagnostics-service.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../inventory-repository.js'),'utf8'),context);
vm.runInContext(fs.readFileSync(path.join(__dirname,'../background.js'),'utf8'),context);
const ad = images => ({adId:'123',title:'New',description:'Absatz 1.\n\n- Farbe: grau\n\nAbsatz 3.',images:images.map(url=>({url})),warnings:[]});
context.downloadInventoryImage=async source=>{const url=typeof source==='string'?source:source.url;return {blob:new Blob([url],{type:'image/jpeg'}),size:url.length,mimeType:'image/jpeg',sourceUrl:url,fetchedUrl:url}};
async function snapshot(){
 const db=await context.openDatabase();
 const read=name=>new Promise((resolve,reject)=>{const r=db.transaction(name).objectStore(name).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 const result=await Promise.all([read('inventories'),read('images')]);db.close();
 return Promise.all(result.map(async rows=>Promise.all(rows.map(async r=>r.blob?{...r,blob:await r.blob.text()}:r))));
}
(async()=>{
 let count=0;const pass=x=>{count++;console.log('PASS '+x)};
 await context.saveInventory(ad(['old-a','old-b'])); const original=await snapshot();
 assert.equal(original[0][0].description,'Absatz 1.\n\n- Farbe: grau\n\nAbsatz 3.');assert.equal(original[1].length,2);pass('initial binary and metadata commit');
 const download=context.downloadInventoryImage;
 context.downloadInventoryImage=async url=>({...await download(url),mimeType:'image/png'});
 await assert.rejects(context.saveInventory({...ad(['new']),extraction:{requiresJpeg:true}}),/JPEG/);
 assert.deepEqual(await snapshot(),original);pass('strict edit JPEG guard preserves previous inventory for a non-JPEG result');
 context.downloadInventoryImage=download;
 context.downloadInventoryImage=async source=>{const url=typeof source==='string'?source:source.url;if(url==='bad')throw Error('Network failure');return download(source)};
 await assert.rejects(context.saveInventory(ad(['new','bad'])));assert.deepEqual(await snapshot(),original);pass('failed second download preserves entire previous inventory');
 await assert.rejects(context.saveInventory(ad([])));assert.deepEqual(await snapshot(),original);pass('empty extraction preserves previous images');
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,...args){if(this.name==='inventories')throw Error('Injected write failure');return put.call(this,value,...args)};
 await assert.rejects(context.saveInventory(ad(['replacement'])));IDBObjectStore.prototype.put=put;
 assert.deepEqual(await snapshot(),original);pass('transaction abort restores old metadata and deleted image binaries');
 context.chrome.storage.local.set=async()=>{throw Error('Diagnostic storage failure')};
 await context.saveInventory(ad(['new-only']));const updated=await snapshot();
 assert.equal(updated[1].length,1);assert.equal(updated[1][0].blob,'new-only');assert.equal(updated[0][0].images.length,1);pass('successful replacement removes obsolete images; diagnostic failure is nonfatal');
 const db=await context.openDatabase();db.close();assert.deepEqual(await snapshot(),updated);pass('close and reopen preserves binary data');
 let release;context.downloadInventoryImage=()=>new Promise(resolve=>release=()=>resolve(download('concurrent')));
 const running=context.saveInventory(ad(['x']));await assert.rejects(context.saveInventory(ad(['y'])),/bereits/);release();await running;pass('overlapping inventory run rejected');
 await assert.rejects(context.saveInventory({images:[]}),/Anzeigen-ID/);pass('missing identity rejected');
 const popup=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
 assert.match(popup,/URL.createObjectURL\(saved.blob\)/);assert.doesNotMatch(popup,/img.src = image\.(fetchedUrl|sourceUrl)/);pass('preview uses local blobs without CDN fallback (static)');
 console.log(`${count} tests passed`);
})().catch(error=>{console.error(error);process.exitCode=1});
