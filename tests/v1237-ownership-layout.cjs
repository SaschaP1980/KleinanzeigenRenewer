const assert=require('assert'),fs=require('fs'),path=require('path');
let n=0;const pass=(l,f)=>{f();n++;console.log('PASS '+l)};
const service='src/background/services/diagnostic-export-service.js';
pass('diagnostic export service owns export builder',()=>{assert.ok(fs.existsSync(service));const s=fs.readFileSync(service,'utf8');assert.match(s,/KRDiagnosticExportService/);assert.match(s,/async function buildDiagnosticExport\s*\(/);});
pass('background delegates diagnostic export instead of owning builder',()=>{const s=fs.readFileSync('src/background/background.js','utf8');assert.doesNotMatch(s,/async function buildDiagnosticExport\s*\(/);assert.match(s,/KRDeps\.require\(['"]KRDiagnosticExportService['"]\)/);assert.match(s,/GET_DIAGNOSTIC_EXPORT[\s\S]{0,180}buildDiagnosticExport/);});
pass('all runtime JavaScript is organized below src subfolders',()=>{const rootJs=fs.readdirSync('.').filter(x=>x.endsWith('.js'));assert.deepEqual(rootJs,[]);});
pass('manifest references organized service worker and content scripts',()=>{const m=JSON.parse(fs.readFileSync('manifest.json'));assert.equal(m.background.service_worker,'src/background/background.js');assert.ok(m.content_scripts[0].js.every(x=>x.startsWith('src/')));});
pass('app and popup script references are organized below src',()=>{for(const f of ['app.html','popup.html']){const s=fs.readFileSync(f,'utf8');const refs=[...s.matchAll(/<script\s+src=["']([^"']+\.js)["']/g)].map(m=>m[1]);assert.ok(refs.length);assert.ok(refs.every(x=>x.startsWith('src/')),`${f}: ${refs.join(', ')}`);}});
console.log(`${n}/5 PASS v1.23.7 ownership/layout`);
