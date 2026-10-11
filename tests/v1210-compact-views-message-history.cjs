const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const app = require('./v12210-source-surface.cjs');
const html = read('app.html');
const css = read('app.css');
const manifest = JSON.parse(read('manifest.json'));
const packageScript = read('scripts/package.py');

assert.ok(['1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version));

for (const id of ['globalViewDetailed','globalViewCompact','messageHistoryClear']) {
  assert.ok(html.includes(`id="${id}"`), `missing ${id}`);
}
assert.match(html, /aria-label="Kachelansicht"/);
assert.match(html, /aria-label="Listenansicht"/);
assert.match(html, /view-mode-detailed/);
assert.match(html, /view-mode-compact/);
assert.match(html, /messageHistoryClear[^>]*aria-label="Meldungsverlauf leeren"/);

assert.match(app, /GLOBAL_LIST_VIEW_MODE_KEY\s*=\s*'globalListViewModeV1'/);
assert.match(app, /LEGACY_INVENTORY_LIST_VIEW_MODE_KEY\s*=\s*'inventoryListViewModeV1'/);
assert.match(app, /LEGACY_TRASH_LIST_VIEW_MODE_KEY\s*=\s*'trashListViewModeV1'/);
assert.match(app, /normalizeListViewMode/);
assert.match(app, /loadListViewModes/);
assert.match(app, /renderCompactInventoryRow/);
assert.match(app, /renderCompactTrashRow/);
assert.match(app, /compactCategoryLabel/);
assert.match(app, /publicAvailabilityPending\(record\)[\s\S]{0,1800}icon:\s*pending\s*\?\s*'retry'\s*:\s*'update'/);
assert.match(app, /messageHistoryClear[\s\S]{0,1800}confirmAction/);
assert.match(app, /uiActivityCenter\.clearHistory\(\)/);

assert.match(css, /\.global-view-controls/);
assert.match(css, /\.inventory-list\.view-compact/);
assert.match(css, /\.compact-list-row/);
assert.match(css, /\.compact-icon-button/);
assert.match(css, /mask-image:url\("icons\/action-new-listing\.svg"\)/);
assert.match(css, /mask-image:url\("icons\/action-update\.svg"\)/);
assert.match(css, /mask-image:url\("icons\/action-delete\.svg"\)/);
assert.match(css, /mask-image:url\("icons\/action-retry\.svg"\)/);
assert.match(css, /mask-image:url\("icons\/action-finish-renewal\.svg"\)/);
assert.ok(!/compact-list-price[^}]*display\s*:\s*none/.test(css));
assert.ok(!/compact-list-end[^}]*display\s*:\s*none/.test(css));

for (const file of ['action-new-listing.svg','action-update.svg','action-delete.svg','action-retry.svg','action-finish-renewal.svg','view-detailed.svg','view-compact.svg']) {
  const body = read(`icons/${file}`);
  assert.match(body, /<svg/);
  assert.match(body, /viewBox="0 0 24 24"/);
  assert.ok(packageScript.includes(`icons/${file}`), `${file} missing from Chrome runtime package`);
}

// Compact inventory and compact trash expose their intended first-class action sets.
const compactInventory = app.match(/function renderCompactInventoryRow[\s\S]*?\n}\n\nfunction /)?.[0] || '';
const compactTrash = app.match(/function renderCompactTrashRow[\s\S]*?\n}\n\nfunction /)?.[0] || '';
assert.ok(compactInventory && compactInventory.includes('makeCompactInventoryExportButton'));
assert.ok(compactTrash && compactTrash.includes('30 Tage neu starten') && compactTrash.includes('Als ZIP exportieren'));
assert.ok(app.includes('Als ZIP exportieren'));

console.log('v1.21.0 compact views + message history contract: PASS');
