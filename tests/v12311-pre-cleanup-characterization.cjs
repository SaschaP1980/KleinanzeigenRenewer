const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('src/app/app.js','utf8');
const bg = fs.readFileSync('src/background/background.js','utf8');
const capture = fs.readFileSync('src/app/inventory-capture-controller.js','utf8');
let pass=0; function p(name,fn){fn(); pass++; console.log('PASS',name)}
p('inventory capture ownership remains in controller',()=>{
  assert.match(capture,/startSingle:\s*startSingleInventoryCapture/);
  assert.match(capture,/startBulk:\s*startBulkInventoryCapture/);
  assert.match(capture,/requestStopAfterCurrent:\s*requestBulkInventoryStopAfterCurrent/);
  assert.match(capture,/reopenTarget:\s*reopenInventoryCaptureTarget/);
});
p('app remains thin capture orchestrator',()=>{
  assert.match(app,/requireInventoryCaptureController\(\)/);
  assert.match(app,/singleInventoryCaptureBusy/);
  assert.match(app,/refreshBulkStatus/);
});
p('accordion controller remains boot dependency',()=>{
  assert.match(app,/requireControlAccordionController\(\)/);
  assert.match(app,/reducedMotion/);
});
p('background safety message routing retained',()=>{
  assert.match(bg,/RESET_ACTIVE_WORKFLOWS/);
  assert.match(bg,/GET_PROFILE_STATE/);
  assert.match(bg,/GET_BULK_RUN_STATUS/);
});
p('publish safety invariant retained',()=>{
  const runtime = app + '\n' + bg + '\n' + capture;
  assert.equal((runtime.match(/\.submit\s*\(/g)||[]).length,0);
  assert.equal((runtime.match(/requestSubmit\s*\(/g)||[]).length,0);
});
console.log(`v1.23.11 pre-cleanup characterization: ${pass}/5 PASS`);
