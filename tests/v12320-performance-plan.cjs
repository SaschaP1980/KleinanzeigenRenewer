'use strict';
const {isRestored,assertPendingS02Release}=require('./kar210-historical-contract-context.cjs');
const s02Root=require('node:path').resolve(__dirname,'..');
const restored=isRestored(s02Root);
const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const spec=JSON.parse(fs.readFileSync('release/release-spec.json','utf8'));
if(restored){assertPendingS02Release(s02Root);assert.deepEqual(spec.performanceCases.map(x=>[x.name,x.images]),[['IKEA Tischleuchte',5],['Weihnachtsfiguren',11],['Hartan Kinderwagen',20]]);const arch=JSON.parse(fs.readFileSync('docs/history/architecture/architecture-progress-v1.23.20.json','utf8'));assert.equal(arch.nativeFinalClosure.diagnosticsResetBeforePerformance,true);assert.equal(arch.nativeFinalClosure.diagnosticsExportImmediatelyAfterPerformance,true);} else if (/^1\.(?:24|25)\.(?:0|[1-9]\d*)$/.test(spec.version)) {
  assert.equal(spec.performanceRunRequired,false);
  assert.equal(spec.nativeSmokeRequired,true);
  assert.ok(spec.nativeSmokeChecks.some(x=>/retention|Aufbewahrung/i.test(x)));
  assert.ok(spec.nativeSmokeChecks.some(x=>/cancel|confirm|Bestätigung|Abbruch/i.test(x)));
  assert.match(spec.performanceRule,/v1\.23\.20/);
} else {
assert.ok(includesActivePatch(['1.23.20','1.23.22','1.23.23','1.23.24'], spec.version));
assert.equal(spec.performanceRunRequired,true);
assert.equal(spec.nativeSmokeRequired,true);
assert.equal(spec.nativeSmokeChecks.some(x=>/5 Bilder.*11 Bilder.*20 Bilder|5 \/ 11 \/ 20/i.test(x)),true);
assert.equal(spec.nativeSmokeChecks.some(x=>/Diagnose zurücksetzen/i.test(x)),true);
assert.equal(spec.nativeSmokeChecks.some(x=>/Direkt nach dem Performance-Lauf Diagnose-ZIP exportieren/i.test(x)),true);
}
assert.deepEqual(spec.historicalPerformance,{
 '1.20.3':{totalSeconds:93.744,averageSeconds:31.248},
 '1.21.15':{totalSeconds:113.73,averageSeconds:37.91},
 '1.22.30':{totalSeconds:99.332,averageSeconds:33.111}
});
console.log('PASS v1.23.20 mandatory native soak/performance plan is complete');
