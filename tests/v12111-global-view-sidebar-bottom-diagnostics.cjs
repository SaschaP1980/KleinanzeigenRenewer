const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'app.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
const js = fs.readFileSync(path.join(root, 'app-layout-controller.js'), 'utf8') + '\n' + require('./v12210-source-surface.cjs');
const actions = fs.readFileSync(path.join(root, 'actions-diagnostics-controller.js'), 'utf8');
const actionCode = js + '\n' + actions;
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
let pass = 0;
function check(name, fn) { fn(); console.log(`PASS ${name}`); pass += 1; }
check('v1.21.11+ retained contract', () => assert.ok(['1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22'].includes(manifest.version)));
check('global account status is shifted three additional pixels upward', () => {
  assert.match(css, /\.global-account-status\s*\{[^}]*transform:\s*translateY\(-7px\)/);
});
check('header owns one global tile/list/refresh control set', () => {
  assert.match(html, /id="globalViewDetailed"/);
  assert.match(html, /id="globalViewCompact"/);
  assert.match(html, /id="refreshButton"/);
  const nav = html.match(/<nav class="content-view-navigation"[\s\S]*?<\/nav>/)?.[0] || '';
  assert.match(nav, /globalViewDetailed[\s\S]*globalViewCompact[\s\S]*refreshButton/);
  assert.doesNotMatch(html, /id="inventoryViewDetailed"|id="inventoryViewCompact"|id="trashViewDetailed"|id="trashViewCompact"/);
});
check('inventory tab has a count badge matching trash semantics', () => {
  assert.match(html, /Inventar\s*<span id="inventoryHeaderCount">0<\/span>/);
  assert.match(html, /Papierkorb\s*<span id="trashHeaderCount">0<\/span>/);
});
check('one global persisted list view mode migrates legacy per-tab modes', () => {
  assert.match(js, /GLOBAL_LIST_VIEW_MODE_KEY\s*=\s*'globalListViewModeV1'/);
  assert.match(js, /LEGACY_INVENTORY_LIST_VIEW_MODE_KEY/);
  assert.match(js, /LEGACY_TRASH_LIST_VIEW_MODE_KEY/);
  assert.match(js, /chrome\.storage\.local\.remove\(\[LEGACY_INVENTORY_LIST_VIEW_MODE_KEY, LEGACY_TRASH_LIST_VIEW_MODE_KEY\]\)/);
  assert.doesNotMatch(js, /let\s+inventoryListViewMode\s*=/);
  assert.doesNotMatch(js, /let\s+trashListViewMode\s*=/);
});
check('global view mode drives both inventory and trash render paths', () => {
  assert.match(js, /inventoryList\?\.classList\.toggle\('view-compact',\s*globalListViewMode\s*===\s*'compact'\)/);
  assert.match(js, /trashList\?\.classList\.toggle\('view-compact',\s*globalListViewMode\s*===\s*'compact'\)/);
  assert.match(js, /if \(globalListViewMode === 'compact'\)/g);
});
check('bottom-of-page sidebar diagnostics are present and targeted', () => {
  for (const eventName of ['UI_SIDEBAR_SCROLL_SAMPLE','UI_SIDEBAR_BOTTOM_REACHED','UI_SIDEBAR_GEOMETRY_CHANGED','UI_SIDEBAR_STICKY_STATE_CHANGED']) {
    assert.match(js, new RegExp(eventName));
  }
  assert.match(js, /distanceToBottom/);
  assert.match(js, /maxScrollY/);
  assert.match(js, /visualViewport/);
  assert.match(js, /controlPanel\.getBoundingClientRect/);
  assert.match(js, /scrollHeight/);
});
check('legacy broad sticky diagnostics stay removed and actions diagnostics stay active', () => {
  assert.doesNotMatch(js, /UI_STICKY_(?:PINNED|UNPINNED|GEOMETRY_SAMPLE|WHEEL_SAMPLE|OSCILLATION_DETECTED)/);
  assert.match(actionCode, /UI_ACTIONS_STATE_SNAPSHOT/);
  assert.match(actionCode, /UI_ACTION_ATTEMPT/);
});
console.log(`${pass}/8 PASS`);
