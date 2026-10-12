'use strict';
const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const spec=JSON.parse(fs.readFileSync('release/release-spec.json','utf8'));
assert.ok(includesActivePatch(['1.23.20','1.23.22','1.23.23','1.23.24'], spec.version));
assert.equal(spec.performanceRunRequired,true);
assert.equal(spec.nativeSmokeRequired,true);
assert.equal(spec.nativeSmokeChecks.some(x=>/5 Bilder.*11 Bilder.*20 Bilder|5 \/ 11 \/ 20/i.test(x)),true);
assert.equal(spec.nativeSmokeChecks.some(x=>/Diagnose zurücksetzen/i.test(x)),true);
assert.equal(spec.nativeSmokeChecks.some(x=>/Direkt nach dem Performance-Lauf Diagnose-ZIP exportieren/i.test(x)),true);
assert.deepEqual(spec.historicalPerformance,{
 '1.20.3':{totalSeconds:93.744,averageSeconds:31.248},
 '1.21.15':{totalSeconds:113.73,averageSeconds:37.91},
 '1.22.30':{totalSeconds:99.332,averageSeconds:33.111}
});
console.log('PASS v1.23.20 mandatory native soak/performance plan is complete');
