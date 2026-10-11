const fs = require('node:fs');
const parts = [
  'single-inventory-controller.js',
  'bulk-inventory-controller.js',
  'managed-tab-worker-service.js',
  'content-connection-manager.js',
  'account-probe-service.js',
  'account-session-controller.js',
  'profile-management-controller.js',
  'platform-safety-controller.js',
  'tab-lifecycle-observer.js'
];
module.exports = [require('./v12221-legacy-background-surface.cjs'), ...parts.filter(file => fs.existsSync(file)).map(file => fs.readFileSync(file, 'utf8'))].join('\n\n');
