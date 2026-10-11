const {parseHTML}=require('linkedom');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base='https://www.kleinanzeigen.de/s-anzeige-bearbeiten.html?adId=123';
const image=id=>`https://img.kleinanzeigen.de/api/v1/prod-ads/images/${id}?rule=$_2.AUTO`;
function fixture(extra='',url=base) {
 const {document}=parseHTML(`<html><body><form action="/s-anzeige-bearbeiten.html?adId=123">
 <input type="hidden" name="adId" value="123"><input type="hidden" name="csrf_token" value="NEVER_COPY">
 <label for="postad-title">Titel</label><input id="postad-title" name="title" value="Pyjama">
 <label for="description">Beschreibung</label><textarea id="description" name="description">Zeile 1\n\nZeile 3</textarea>
 <div><label>Kategorie</label><span>Mode &gt; Damenbekleidung</span><a>Kategorie ändern</a></div><input type="hidden" name="categoryId" value="154">
 <label for="size">Größe</label><select id="size" name="attributeMap[size]"><option value="s" selected>S (36)</option><option value="m">M</option></select>
 <input type="hidden" name="attributeMap[brand]" value="brand-7"><label for="brand">Marke</label><input id="brand" value="Up Fashion">
 <div class="state-row"><input type="hidden" name="attributeMap[state]" value="like_new"><label>Zustand</label><button type="button"><span class="sr-only">Zustand auswählen</span>Sehr gut</button></div>
 <label for="blank">Optional</label><input id="blank" name="extra" value="">
 <label for="price">Preis</label><input id="price" name="priceAmount" value="4"><input type="hidden" name="priceType" value="FIXED"><label for="ad-price-type">Preistyp</label><button id="ad-price-type" type="button">Festpreis</button>
 <label for="shipping-group">Versand</label><fieldset id="shipping-group" role="radiogroup"><label for="shipping">Versand möglich</label><input id="shipping" type="radio" name="shipping" value="yes" checked>
 <label for="pickup">Nur Abholung</label><input id="pickup" type="radio" name="shipping" value="no"></fieldset>
 <label for="newsletter">Newsletter</label><input id="newsletter" type="checkbox" name="newsletter" checked>
 <input type="hidden" name="adImages[0].url" value="${image('a').replace('?rule=$_2.AUTO','?full=1')}"><input type="hidden" name="adImages[1].url" value="${image('b').replace('?rule=$_2.AUTO','?full=1')}"><div id="image-upload"><input type="file"><img src="${image('a')}" srcset="${image('a').replace('AUTO','JPG')} 800w"><img src="${image('b')}"></div>
 ${extra}<button type="submit">Anzeige speichern</button></form><img src="${image('external')}"></body></html>`);
 let listener;const ctx={document,URL,location:{href:url,pathname:new URL(url).pathname},chrome:{runtime:{onMessage:{addListener:f=>listener=f}}}};
 for(const f of ['image-extractor.js','form-extractor.js','content.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,'..',f),'utf8'),ctx);
 const message=type=>{let response;listener({type},null,r=>response=r);return response};
 return {ctx,document,message};
}
let n=0;const test=(name,fn)=>{fn();console.log('PASS '+name);n++};
test('edit form accepted without public edit link',()=>{const r=fixture().message('PAGE_STATUS');assert.equal(r.result.auth.viewMode,'edit');assert.equal(r.result.auth.ownAd,true)});
test('live values, category, description and dynamic fields',()=>{
 const f=fixture();f.document.querySelector('[name="title"]').value='Changed';const r=f.message('EXTRACT_CURRENT_AD');assert.equal(r.ok,true,r.error);
 assert.equal(r.result.title,'Changed');assert.equal(r.result.description,'Zeile 1\n\nZeile 3');assert.equal(r.result.adId,'123');assert.equal(r.result.categoryIdFromUrl,'154');
 assert.equal(r.result.formFields.find(f=>f.name==='attributeMap[size]').value,'s');
 const byKey=Object.fromEntries(r.result.dynamicAttributes.map(a=>[a.key,a]));
 assert.equal(byKey.size.technicalValue,'s');assert.equal(byKey.size.displayValue,'S (36)');
 assert.equal(byKey.brand.technicalValue,'brand-7');assert.equal(byKey.brand.displayValue,'Up Fashion');
 assert.equal(byKey.state.technicalValue,'like_new');assert.equal(byKey.state.displayValue,'Sehr gut');
 assert.equal(r.result.formFields.find(f=>f.name==='extra').status,'empty');
 assert.equal(r.result.formFields.find(f=>f.name==='shipping').value,'yes');assert.equal(r.result.extraction.requiresJpeg,true);assert.equal(r.result.extraction.requiresLargeJpeg,true);
 assert.equal(r.result.price.type,'FIXED');assert.equal(r.result.price.typeDisplay,'Festpreis');
});
test('edit images deduplicated in upload order, other images excluded',()=>{const r=fixture().message('EXTRACT_CURRENT_AD').result;assert.equal(r.images.length,2);assert.match(r.images[0].imageId,/\/a/);assert.match(r.images[1].imageId,/\/b/);assert.equal(r.images[0].downloadSource,'adImages-hidden');assert.equal(r.images[0].isPrimary,true)});
test('category can expose additional fields',()=>{const r=fixture('<label for="mileage">Kilometerstand</label><input id="mileage" name="attributeMap[mileage]" value="35000">').message('EXTRACT_CURRENT_AD');assert.equal(r.result.formFields.find(f=>f.id==='mileage').value,'35000')});
test('native radiogroup container does not create false unresolved warning',()=>{const r=fixture().message('FORM_DIAGNOSTICS');assert.equal(r.ok,true);assert.ok(!r.result.warnings.some(w=>/Versand/.test(w)));assert.ok(!r.result.form.fields.some(f=>f.id==='shipping-group'))});
test('tokens and marketing values excluded from snapshot and diagnostics',()=>{const r=fixture().message('FORM_DIAGNOSTICS');const text=JSON.stringify(r);assert.ok(!text.includes('NEVER_COPY'));assert.ok(!r.result.form.fields.some(f=>f.name==='newsletter'))});
test('conflicting ad identities rejected',()=>{assert.equal(fixture('',base.replace('123','999')).message('EXTRACT_CURRENT_AD').ok,false)});
test('new unsaved local picture prevents incomplete overwrite',()=>{assert.equal(fixture('<div id="other"></div>').message('EXTRACT_CURRENT_AD').ok,true);const f=fixture();const img=f.document.createElement('img');img.src='blob:new';f.document.querySelector('#image-upload').append(img);assert.equal(f.message('EXTRACT_CURRENT_AD').ok,false)});
test('missing core data fails with diagnostic route available',()=>{const f=fixture();f.document.querySelector('textarea').value='';assert.equal(f.message('EXTRACT_CURRENT_AD').ok,false);assert.equal(f.message('FORM_DIAGNOSTICS').ok,true)});
console.log(`${n} edit-form tests passed`);
