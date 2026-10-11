const fs = require('fs');
const assert = require('assert');
const bg = require('./v12214-source-surface.cjs');
let pass=0;
function ok(name, fn){ try{ fn(); pass++; console.log('PASS '+name);}catch(e){console.error('FAIL '+name);throw e;} }
function body(name){
  const start = bg.indexOf(`async function ${name}`);
  assert(start>=0, `missing ${name}`);
  const brace=bg.indexOf('{',start); let depth=0, str=null, esc=false, line=false, block=false;
  for(let i=brace;i<bg.length;i++){
    const c=bg[i], n=bg[i+1]||'';
    if(line){ if(c==='\n') line=false; continue; }
    if(block){ if(c==='*'&&n==='/'){block=false;i++;} continue; }
    if(str){ if(esc) esc=false; else if(c==='\\') esc=true; else if(c===str) str=null; continue; }
    if(c==='/'&&n==='/'){line=true;i++;continue;} if(c==='/'&&n==='*'){block=true;i++;continue;}
    if(c==='"'||c==="'"||c==='`'){str=c;continue;} if(c==='{') depth++; else if(c==='}' && --depth===0) return bg.slice(start,i+1);
  }
  throw new Error('unterminated '+name);
}
ok('single inventory rejects concurrent bulk capture',()=>assert.match(body('captureSingleInventory'),/laufenden Erfassung oder Wiederholung/));
ok('single inventory verifies own ad and selected live account',()=>{const b=body('captureSingleInventory');assert.match(b,/ownAd/);assert.match(b,/assertSelectedProfileMatchesLiveAccount/);});
ok('single inventory keeps public edit worker and readonly metadata paths',()=>{const b=body('captureSingleInventory');assert.match(b,/single-inventory-edit/);assert.match(b,/single-inventory-readonly/);assert.match(b,/extractReadOnlyMetadata/);});
ok('single inventory always cleans owned workers',()=>assert.match(body('captureSingleInventory'),/finally[\s\S]*closeManagedWorkerTab/));
ok('bulk init requires fresh source and creates explicit running state',()=>{const b=body('initBulkRun');assert.match(b,/sourceFresh !== true/);assert.match(b,/status: "running"/);assert.match(b,/sourceAutoCreated/);});
ok('bulk run update whitelists mutable progress fields',()=>{const b=body('updateBulkRun');assert.match(b,/const allowed = \[/);assert.match(b,/currentAdId/);assert.match(b,/lastProgressAt/);});
ok('bulk stop-after-current remains stateful and diagnostic',()=>{const b=body('requestBulkInventoryStopAfterCurrent');assert.match(b,/stopAfterCurrentRequested/);assert.match(b,/BULK_INVENTORY_STOP_AFTER_CURRENT_REQUESTED/);});
ok('bulk source identity is enforced on source-owned operations',()=>{for(const n of ['updateBulkRun','recordBulkExistingSkip','recordBulkResult','failBulkRun']) assert.match(body(n),/requireBulkSource/);});
ok('bulk controlled stop and failure remain terminal and release source ownership',()=>{for(const n of ['finishBulkRunControlledStop','failBulkRun']){const b=body(n);assert.match(b,/completedAt/);assert.match(b,/releaseBulkSourceOwnership/);}});
ok('message router exposes single and bulk inventory contracts',()=>{for(const t of ['CAPTURE_SINGLE_INVENTORY','BULK_INIT_RUN','BULK_RUN_UPDATE','BULK_RECORD_RESULT','BULK_FAIL_RUN']) assert(bg.includes(`message?.type === "${t}"`) || bg.includes(`message?.type === '${t}'`) || bg.includes(`"${t}": Object.freeze`), t);});
console.log(`${pass}/10 PASS v1.22.14 pre-refactor characterization`);
