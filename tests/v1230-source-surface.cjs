const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const candidateFiles = [
  'app.js',
  'background.js',
  'renewal-workflow-controller.js',
  'mass-renewal-workflow-controller.js',
  'template-fill-controller.js',
  'insertion-lock-service.js',
  'archive-insertion-controller.js',
  'bulk-inventory-controller.js',
  'public-listing-evidence-service.js',
  'diagnostic-export-service.js',
  'account-session-controller.js',
  'profile-management-controller.js',
  'control-accordion-controller.js',
  'diagnostics-controls-controller.js',
  'renewal-settings-controller.js',
  'inventory-capture-controller.js',
  'src/background/services/bulk-worker-service.js',
  'src/background/services/bulk-reconciliation-service.js',
  'src/background/services/archive-insertion-recovery-service.js',
  'src/background/services/archive-insertion-verification-service.js',
  'src/background/services/mass-renewal-watchdog-service.js',
  'src/background/controllers/workflow-emergency-reset-controller.js'
];

function read(file) {
  const target = path.join(root, file);
  return fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
}

const files = Object.fromEntries(candidateFiles.map(file => [file, read(file)]));
const source = candidateFiles.map(file => `\n/* FILE:${file} */\n${files[file]}`).join('\n');

module.exports = { root, candidateFiles, files, source };
