const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('background.js','utf8');
// KAR-175: retain the original runtime checks against the actual pure
// registered URL evidence module, not the old background forwarding facade.
const ownerSource=fs.readFileSync('src/background/services/listing-url-evidence-service.js','utf8');
assert.match(source,/requireListingUrlEvidenceService\(\)\.publishedAdCandidateFromUrl\(rawUrl, sourceAdId\)/);
let owner=null;
const context={URL,KRDeps:{register(name,api){
  assert.equal(name,'KRListingUrlEvidenceService');owner=api;
}}};
vm.createContext(context);
vm.runInContext(ownerSource,context);
assert.equal(typeof owner?.create,'function');
context.parsePublished=owner.create({URL}).publishedAdCandidateFromUrl;
let n=0; const pass=l=>{n++;console.log('PASS '+l);};
let out = context.parsePublished('https://www.kleinanzeigen.de/s-anzeige/demo/3514872335-154-1234','3490630842');
assert.equal(out.adId,'3514872335'); assert.equal(out.kind,'public'); pass('public published URL yields new ad id');
out = context.parsePublished('https://www.kleinanzeigen.de/p-anzeige-bearbeiten.html?adId=3514872335','3490630842');
assert.equal(out.adId,'3514872335'); assert.equal(out.kind,'edit'); pass('edit URL yields new ad id');
assert.equal(context.parsePublished('https://www.kleinanzeigen.de/s-anzeige/demo/3490630842-154-1234','3490630842'),null); pass('source ad id is rejected');
assert.equal(context.parsePublished('https://example.com/s-anzeige/demo/3514872335-154-1234','3490630842'),null); pass('non Kleinanzeigen URL is rejected');
console.log(`${n} v1.17.6 trash-template publish runtime groups passed`);
