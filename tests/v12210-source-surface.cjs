const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');

// Historical lexical contracts used to read app.js as the single implementation
// surface. v1.22.10 keeps their assertions intact while composing the source from
// the new owners in the same logical order they historically inspected.
module.exports = [
  read('profile-account-ui-controller.js'),
  read('app-elements.js'),
  read('profile-backup-controller.js'),
  read('inventory-render-controller.js'),
  'function renderBulkState() {}',
  read('inventory-formatting.js'),
  read('control-accordion-controller.js'),
  read('diagnostics-controls-controller.js'),
  read('renewal-settings-controller.js'),
  read('app.js')
].join('\n');
