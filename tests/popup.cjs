const {parseHTML}=require('linkedom');
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const {document,window}=parseHTML(fs.readFileSync(path.join(__dirname,'../app.html'),'utf8'));
const RecordCardView=require('../src/app/record-card-view.js');

const recordCardView=RecordCardView.create({
 document,
 Element:window.Element,
 loadLocalPreview:async()=>{}
});
const images=Array.from({length:25},(_,position)=>({
 position,
 mimeType:position%2?'image/png':'image/jpeg',
 size:1024,
 formatEvidence:'file-signature',
 sourceFormatHint:'AUTO (Format unbekannt)'
}));
const record={inventoryId:'123',adId:'123',title:'Fixture',capturedAt:'2026-09-13T00:00:00Z',imageSummary:{uploadReadyJpeg:13,discovered:25},images,attributes:[],formFields:[],price:{},warnings:[]};
document.querySelector('#inventoryList').append(recordCardView.buildFullImageStrip(record));

assert.equal(document.querySelectorAll('.image-strip figure').length,25);
assert.equal(document.querySelectorAll('.image-strip figcaption').length,25);
assert.match(document.querySelector('.image-strip').textContent,/Bild 25/);
assert.match(document.querySelector('.image-strip').textContent,/PNG/);
assert.match(document.querySelector('.image-strip').textContent,/JPEG/);
assert.ok(document.querySelector('#diagnosticZipButton'));
assert.ok(document.querySelector('#inventorySearchInput'));
console.log('PASS all 25 saved images rendered through record-card-view with numbered MIME captions and current inventory/diagnostic controls (DOM emulation)');
