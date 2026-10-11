const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ctx={URL};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../image-extractor.js'),'utf8'),ctx);
let n=0;const pass=x=>{n++;console.log('PASS '+x)};
const base='https://www.kleinanzeigen.de/s-anzeige/test/123-456-789';
const uuid='6b7cd8ea-f4ec-43c0-ad14-1da4e76ef391';
const a=`https://img.kleinanzeigen.de/api/v1/prod-ads/images/6b/${uuid}?AccessKeyId=one&jwt=aaa`;
const b=`https://img.kleinanzeigen.de/api/v1/prod-ads/images/6b/${uuid}?AccessKeyId=two&jwt=bbb`;
function extractStructured(images){
  const node={textContent:JSON.stringify({'@type':'Product',url:base,image:images})};
  const document={
    querySelector(sel){if(sel==='link[rel="canonical"]')return {href:base};if(sel==='meta[property="og:image"]')return {content:images[0]||''};return null;},
    querySelectorAll(sel){if(sel==='script[type="application/ld+json"]')return [node];return [];}
  };
  return ctx.KRImages.extract(document,base);
}
let result=extractStructured([a,b]);
assert.equal(result.images.length,1);assert.equal(result.images[0].imageId,uuid);pass('signed variants share stable UUID image identity through public extract');
assert.ok(!result.diagnostics.openGraphImage.url.includes('AccessKeyId'));assert.ok(!result.diagnostics.openGraphImage.url.includes('jwt='));assert.ok(result.diagnostics.openGraphImage.url.includes(uuid));pass('public extract diagnostics strip signed query parameters but keep UUID path');
result=extractStructured(['https://evil.invalid/a']);assert.equal(result.images.length,0);assert.equal(result.diagnostics.structuredCandidates[0].images.length,0);pass('non-CDN image rejected through public extract');
result=extractStructured([
  'https://img.kleinanzeigen.de/api/v1/prod-ads/images/a?id=1&rule=$_2.AUTO',
  'https://img.kleinanzeigen.de/api/v1/prod-ads/images/a?id=2&rule=$_57.JPG'
]);
assert.equal(result.images.length,2);assert.notEqual(result.images[0].imageId,result.images[1].imageId);pass('non-UUID fallback retains unknown identity parameters through public extract');
console.log(`${n} image-identity tests passed`);
