const {parseHTML}=require('linkedom');
const fs=require('node:fs'), vm=require('node:vm'), path=require('node:path'), assert=require('node:assert/strict');
const {document}=parseHTML(fs.readFileSync(path.join(__dirname,'../app.html'),'utf8'));
const ctx={document,window:{addEventListener(){}},URL,Intl,Date,console,setInterval(){return 1},clearInterval(){},confirm(){return true},indexedDB:{open(){throw Error('test missing local image')}},
 chrome:{tabs:{query:async()=>[]},runtime:{sendMessage(message,callback){callback({ok:true,result:[]})}}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../inventory-view.js'),'utf8'),ctx);
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../app.js'),'utf8'),ctx);
setImmediate(()=>{
 const images=Array.from({length:25},(_,position)=>({position,mimeType:position%2?'image/png':'image/jpeg',size:1024,formatEvidence:'file-signature',sourceFormatHint:'AUTO (Format unbekannt)'}));
 ctx.renderInventories([{inventoryId:'123',adId:'123',title:'Fixture',capturedAt:'2026-09-13T00:00:00Z',imageSummary:{uploadReadyJpeg:13,discovered:25},images,attributes:[],formFields:[],price:{},warnings:[]}]);
 assert.equal(document.querySelectorAll('.image-strip figure').length,25);
 assert.equal(document.querySelectorAll('.image-strip figcaption').length,25);
 assert.match(document.querySelector('.image-strip').textContent,/Bild 25/);
 assert.match(document.querySelector('.image-strip').textContent,/PNG/);
 assert.match(document.querySelector('.image-strip').textContent,/JPEG/);
 assert.ok(document.querySelector('#diagnosticZipButton'));
 assert.ok(document.querySelector('#inventorySearchInput'));
 console.log('PASS all 25 saved images rendered with numbered MIME captions and current inventory/diagnostic controls (DOM emulation)');
});
