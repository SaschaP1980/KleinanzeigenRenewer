const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = require('./v12210-source-surface.cjs') + '\n' + fs.readFileSync(path.join(root, 'shared-ui-helpers.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const compactTrash = app.match(/function renderCompactTrashRow[\s\S]*?\n}\n\nfunction /)?.[0] || '';

assert.ok(compactTrash, 'renderCompactTrashRow missing');
assert.match(compactTrash, /icon:\s*'update'[\s\S]{0,180}label:\s*'30 Tage neu starten'/, 'compact trash reset must reuse update icon');
assert.match(compactTrash, /icon:\s*'zip-export'[\s\S]{0,180}label:\s*'Als ZIP exportieren'/, 'compact trash ZIP action missing');
assert.match(compactTrash, /RESET_TRASH_RETENTION/, 'compact trash reset must use existing retention runtime action');
assert.match(compactTrash, /USER_TRASH_RETENTION_RESET_CLICK/, 'compact trash reset diagnostics missing');
assert.match(compactTrash, /USER_TRASH_EXPORT_CLICK/, 'compact trash ZIP diagnostics missing');
assert.match(compactTrash, /actions\.append\(templateButton, resetButton, exportButton, deleteButton\)/, 'compact trash actions must be ordered template -> reset -> ZIP -> delete');
assert.match(css, /\.compact-action-icon\.action-update[^}]*action-update\.svg/, 'update icon mapping missing');
assert.match(css, /\.compact-action-icon\.action-zip-export[^}]*action-zip-export\.svg/, 'ZIP icon mapping missing');

console.log('v1.21.13 compact trash actions contract: PASS');
