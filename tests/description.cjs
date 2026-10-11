const {parseHTML}=require('linkedom');
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
function capture(html, description='FLAT STRUCTURED TEXT') {
 const {document}=parseHTML(`<html><head><script type="application/ld+json">${JSON.stringify({'@type':'Product',description})}</script></head><body><a href="/bearbeiten">Anzeige bearbeiten</a><h1>Test</h1>${html}</body></html>`);
 let listener;
 const context={document,location:{href:'https://www.kleinanzeigen.de/s-anzeige/test/123-456-789',pathname:'/s-anzeige/test/123-456-789'},KRImages:{extract:()=>({images:[{url:'test'}],diagnostics:{}})},chrome:{runtime:{onMessage:{addListener:f=>listener=f},sendMessage(_message,callback){callback?.({ok:true,result:{active:false}})}}}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../content.js'),'utf8'),context);
 let response;listener({type:'EXTRACT_CURRENT_AD'},null,r=>response=r);assert.equal(response.ok,true,response.error);return response.result;
}
let n=0;const test=(label,fn)=>{fn();console.log('PASS '+label);n++};
test('screenshot paragraphs and line breaks override flat JSON-LD',()=>{
 const r=capture('<div id="viewad-description-text">Zum Verkauf steht dieser Pyjama in Gr. S.<br><br>- Farbe: grau mit glitzernden blauen Sternen<br><br>Gebrauchter Artikel.<br>Verkauf unter Ausschluss der Sachmängelhaftung.<br><br>Gerne Selbstabholung.</div>');
 assert.equal(r.description,'Zum Verkauf steht dieser Pyjama in Gr. S.\n\n- Farbe: grau mit glitzernden blauen Sternen\n\nGebrauchter Artikel.\nVerkauf unter Ausschluss der Sachmängelhaftung.\n\nGerne Selbstabholung.');
 assert.equal(r.extraction.descriptionSource,'dom:#viewad-description-text');
});
test('paragraphs separated, inline emphasis stays inline',()=>assert.equal(capture('<div id="viewad-description-text"><p>Erster <b>Absatz</b>.</p><p>Zweiter Absatz.</p></div>').description,'Erster Absatz.\n\nZweiter Absatz.'));
test('div and list boundaries do not merge words',()=>assert.equal(capture('<div id="viewad-description-text"><div>A</div><div>B</div><ul><li>C</li><li>D</li></ul></div>').description,'A\nB\nC\nD'));
test('plain text newlines and blank lines preserved',()=>assert.equal(capture('<div id="viewad-description-text">A\n\nB\nC</div>').description,'A\n\nB\nC'));
test('entities decoded and scripts/hidden text excluded',()=>assert.equal(capture('<div id="viewad-description-text">A &amp; B<br><script>bad()</script><span hidden>secret</span>C</div>').description,'A & B\nC'));
test('structured fallback preserves CRLF structure and warns',()=>{const r=capture('', 'A\r\n\r\nB');assert.equal(r.description,'A\n\nB');assert.equal(r.extraction.descriptionSource,'jsonld-fallback');assert.ok(r.warnings.some(w=>w.includes('Ersatzquelle')))});
test('empty description remains absent',()=>assert.equal(capture('<div id="viewad-description-text"></div>','').description,''));
console.log(`${n} description tests passed`);
