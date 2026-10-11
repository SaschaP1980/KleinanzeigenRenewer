const fs=require('fs'),assert=require('assert'); const bg=fs.readFileSync('background.js','utf8'); let p=0;function ok(n,f){try{f();p++;console.log('PASS '+n)}catch(e){console.error('FAIL '+n);throw e}}
ok('late bulk close after terminal recovery is classified expected',()=>{assert.match(bg,/function isExpectedPostRecoveryBulkClose/);assert.match(bg,/BULK_CLOSE_WORKER/);assert.match(bg,/Keine aktive Erfassung vorhanden/);});
ok('expected late bulk close logs informational event instead of request failure',()=>{assert.match(bg,/BACKGROUND_REQUEST_EXPECTED_BULK_CLOSE/);assert.match(bg,/expectedPostRecoveryBulkClose \? 'info'/);});
console.log(`${p}/2 PASS v1.22.14 post-recovery benign close`);
