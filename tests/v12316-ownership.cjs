const fs=require('node:fs'),assert=require('node:assert/strict');let n=0;const ok=(m,f)=>{f();n++;console.log('PASS '+m)};
const files=[
 ['src/background/services/bulk-worker-service.js','KRBulkWorkerService'],
 ['src/background/services/bulk-reconciliation-service.js','KRBulkReconciliationService'],
 ['src/background/services/archive-insertion-recovery-service.js','KRArchiveInsertionRecoveryService'],
 ['src/background/services/archive-insertion-verification-service.js','KRArchiveInsertionVerificationService'],
 ['src/background/services/mass-renewal-watchdog-service.js','KRMassRenewalWatchdogService'],
 ['src/background/controllers/workflow-emergency-reset-controller.js','KRWorkflowEmergencyResetController']
];
ok('dedicated lifecycle modules exist and expose in-process factories',()=>{for(const [f,id] of files){assert.ok(fs.existsSync(f),f);const s=fs.readFileSync(f,'utf8');assert.ok(s.includes(id),id);assert.match(s,/create\(options\s*=\s*\{\}\)/)}});
ok('bulk controller delegates worker and reconciliation ownership',()=>{const s=fs.readFileSync('src/background/controllers/bulk-inventory-controller.js','utf8');assert.ok(!s.includes('BULK_WORKER_TAB_CREATE_RECOVERED'));assert.ok(!s.includes('BULK_RECONCILIATION_ROSTER_CONFIRMED'));assert.match(s,/KRBulkWorkerService|bulkWorkerService/);assert.match(s,/KRBulkReconciliationService|bulkReconciliationService/)});
ok('archive controller delegates recovery and verification promotion',()=>{const s=fs.readFileSync('src/background/controllers/archive-insertion-controller.js','utf8');assert.ok(!s.includes('ARCHIVE_INSERT_RECOVERY_ALREADY_INVENTORIED'));assert.ok(!s.includes("verificationScope: 'archive-managed-fields'"))});
ok('mass renewal workflow delegates watchdog ownership',()=>{const s=fs.readFileSync('src/background/controllers/mass-renewal-workflow-controller.js','utf8');assert.ok(!s.includes('MASS_RENEWAL_WATCHDOG_TIMEOUT'));assert.ok(!s.includes('progress-watchdog-timeout'))});
ok('background delegates emergency reset to explicit safety controller',()=>{const s=fs.readFileSync('src/background/background.js','utf8');assert.ok(!s.includes('ACTIVE_WORKFLOWS_EMERGENCY_RESET'));assert.match(s,/KRWorkflowEmergencyResetController/)});
ok('new modularization does not add message or IPC contract types',()=>{const router=fs.readFileSync('src/background/background-message-router.js','utf8');for(const token of ['BULK_WORKER_SERVICE','BULK_RECONCILIATION_SERVICE','ARCHIVE_RECOVERY_SERVICE','EMERGENCY_RESET_CONTROLLER'])assert.ok(!router.includes(token),token)});
console.log(`${n}/6 PASS v1.23.16 ownership`);
