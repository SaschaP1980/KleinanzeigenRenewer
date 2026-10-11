const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.existsSync(path.join(root,name))?fs.readFileSync(path.join(root,name),'utf8'):'';
module.exports=[
  read('renewal-state-repository.js'),
  read('template-fill-service.js'),
  read('archive-insertion-service.js'),
  read('archive-insertion-controller.js'),
  read('src/background/services/archive-insertion-recovery-service.js'),
  read('src/background/services/archive-insertion-verification-service.js'),
  read('mass-renewal-controller.js'),
  read('bulk-inventory-controller.js'),
  read('src/background/services/bulk-worker-service.js'),
  read('src/background/services/bulk-reconciliation-service.js'),
  read('public-listing-evidence-service.js'),
  read('diagnostic-export-service.js'),
  read('mass-renewal-workflow-controller.js'),
  read('src/background/services/mass-renewal-watchdog-service.js'),
  read('renewal-verification-service.js'),
  read('renewal-workflow-controller.js'),
  read('renewal-verification-flow.js'),
  read('renewal-reinventory-flow.js'),
  read('paid-checkout-recovery-service.js'),
  read('src/background/controllers/workflow-emergency-reset-controller.js'),
  require('./v12214-source-surface.cjs'),
  require('./v12211-background-source-surface.cjs')
].filter(Boolean).join('\n');
