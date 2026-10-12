const { includesActivePatch } = require('./current-patch-policy.cjs');
const fs = require('fs');
const assert = require('assert');
const app = fs.readFileSync('app.js','utf8');
const accordionController = fs.readFileSync('control-accordion-controller.js','utf8');
const html = fs.readFileSync('app.html','utf8');
const css = fs.readFileSync('app.css','utf8');
const manifest = JSON.parse(fs.readFileSync('manifest.json','utf8'));
function pass(label){ console.log('PASS '+label); }

assert.match(html, /kleinanzeigen Manager/);
assert.doesNotMatch(html, /KLEINANZEIGEN INVENTAR/);
assert.doesNotMatch(html, /<h1>Inventar/);
assert.match(manifest.name, /kleinanzeigen Manager/);
assert.equal(manifest.action.default_title, 'Kleinanzeigen Renewal');
pass('visible product identity stays kleinanzeigen Manager while action.default_title retains the proven Windows taskbar identity');

if (includesActivePatch(['1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23','1.23.24'], manifest.version)) {
  assert.doesNotMatch(html, /<details[^>]+id="actionsAccordion"/);
  assert.match(html, /<(?:section|div)[^>]+id="actionsAccordion"[^>]+data-accordion-mode="controlled"[^>]+data-open="true"/);
  assert.match(html, /id="actionsAccordionToggle"[^>]+aria-expanded="true"/);
} else {
  assert.match(html, /<details[^>]+id="actionsAccordion"/);
  assert.match(html, /id="actionsAccordion"[^>]*open/);
}
for (const id of ['configurationAccordion','diagnosticsAccordion']) {
  assert.match(html, new RegExp(`<details[^>]+id="${id}"`));
}
assert.match(html, /id="actionsActivityIndicator"/);
assert.match(css, /\.actions-activity-indicator\.is-running[^}]*animation:/s);
assert.ok(/(enforceSingleOpenControlAccordion|setControlAccordionOpen|animateControlAccordion)/.test(app) || /function setOpen\(/.test(accordionController));
assert.match(app, /function syncActionsActivityIndicator/);
pass('sidebar is a single-open accordion with running-action pulse');

const navIndex = html.indexOf('class="content-view-navigation"');
const inventorySectionIndex = html.indexOf('id="inventorySection"');
assert.ok(navIndex >= 0 && navIndex < inventorySectionIndex, 'view navigation must live outside and before inventory content');
assert.match(html, /id="inventoryViewButton"/);
assert.match(html, /id="trashViewButton"/);
assert.match(html, /class="content-view-navigation"/);
const [versionMajor, versionMinor, versionPatch] = String(manifest.version || '').split('.').map(Number);
const usesAccountAwareRefreshLabel = versionMajor > 1 || versionMinor > 21 || (versionMinor === 21 && versionPatch >= 12);
const usesViewRefreshLabel = versionMajor > 1 || versionMinor > 20 || (versionMinor === 20 && versionPatch >= 18);
assert.match(html, usesAccountAwareRefreshLabel
  ? /id="refreshButton"[^>]+aria-label="Ansicht und Kontostatus aktualisieren"/
  : usesViewRefreshLabel
    ? /id="refreshButton"[^>]+aria-label="Ansicht aktualisieren"/
    : /id="refreshButton"[^>]+aria-label="Inventar aktualisieren"/);
assert.match(html, /class="[^"]*content-refresh-button[^"]*"/);
assert.doesNotMatch(html, /id="refreshButton"[^>]*>Aktualisieren</);
assert.match(css, /\.content-view-navigation/);
assert.match(css, /\.content-refresh-button/);
pass('inventory/trash navigation is docked above content and refresh is an icon content action');

assert.ok(/^(?:1\.17\.(?:[4-9]|[1-9]\d+)|1\.18\.\d+|1\.19\.\d+|1\.20\.\d+|1\.21\.(?:[0-9]|1[0-5])|1\.22\.(?:[0-9]|[1-9]\d*)|1\.23\.\d+)$/.test(manifest.version));
pass('manifest keeps v1.17.4+ sidebar/header contract');
