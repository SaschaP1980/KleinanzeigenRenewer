const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const readIfPresent = name => {
  const file = path.join(root, name);
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
};

// v1.22.11 pre-refactor characterization reads one logical background storage
// surface. Before extraction this is only background.js; afterwards the same
// unchanged tests also see the new repository/service owners.
module.exports = [
  readIfPresent('profile-repository.js'),
  readIfPresent('profile-management-controller.js'),
  readIfPresent('account-session-controller.js'),
  readIfPresent('inventory-repository.js'),
  readIfPresent('inventory-image-store.js'),
  readIfPresent('trash-service.js'),
  readIfPresent('single-inventory-controller.js'),
  readIfPresent('bulk-inventory-controller.js'),
  readIfPresent('src/background/services/bulk-worker-service.js'),
  readIfPresent('src/background/services/bulk-reconciliation-service.js'),
  readIfPresent('mass-renewal-controller.js'),
  readIfPresent('renewal-verification-service.js'),
  readIfPresent('renewal-state-repository.js'),
  readIfPresent('template-fill-service.js'),
  readIfPresent('template-fill-controller.js'),
  readIfPresent('insertion-lock-service.js'),
  readIfPresent('archive-insertion-service.js'),
  readIfPresent('src/background/services/archive-insertion-recovery-service.js'),
  readIfPresent('src/background/services/archive-insertion-verification-service.js'),
  readIfPresent('diagnostic-export-service.js'),
  readIfPresent('src/background/services/mass-renewal-watchdog-service.js'),
  readIfPresent('src/background/controllers/workflow-emergency-reset-controller.js'),
  require('./v12221-legacy-background-surface.cjs')
].filter(Boolean).join('\n');
