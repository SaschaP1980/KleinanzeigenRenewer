const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
let build;
const modelPath = path.join(root, 'src/app/inventory-candidate-model.js');
if (fs.existsSync(modelPath)) build = require(modelPath).buildSingleInventoryCandidates;
else {
  const vm = require('node:vm');
  const app = fs.readFileSync(path.join(root, 'inventory-capture-controller.js'), 'utf8');
  const start = app.indexOf('function buildSingleInventoryCandidates(entries = []) {');
  const end = app.indexOf('\nfunction inventoryCaptureCandidateStorageState', start);
  assert.ok(start >= 0 && end > start, 'candidate merge helper must be extractable');
  const fn = app.slice(start, end);
  const context = vm.createContext({ Map, Set, Number, String, Boolean, RegExp });
  vm.runInContext(`${fn}; this.build = buildSingleInventoryCandidates;`, context);
  build = context.build;
}

const entries = [
  { tab: { id: 11, active: true, lastAccessed: 100 }, preview: { adId: '123456', title: 'Öffentliche Anzeige', thumbnailUrl: 'https://img.kleinanzeigen.de/a.jpg', viewMode: 'public', profileName: 'Profil A' } },
  { tab: { id: 12, active: false, lastAccessed: 90 }, preview: { adId: '123456', title: 'Bearbeiten Anzeige', thumbnailUrl: '', viewMode: 'edit', profileName: 'Profil A' } },
  { tab: { id: 13, active: false, lastAccessed: 80 }, preview: { adId: '777777', title: 'Zweite Anzeige', thumbnailUrl: 'https://img.kleinanzeigen.de/b.jpg', viewMode: 'public', profileName: 'Profil A' } },
  { tab: { id: 14, active: false, lastAccessed: 70 }, preview: { adId: '', title: 'Ungültig', viewMode: 'edit' } }
];
const result = build(entries);
assert.equal(result.length, 2, 'same adId must be one candidate regardless of view mode');
const first = result.find(item => item.adId === '123456');
assert.ok(first);
assert.deepEqual([...first.tabIds].sort((a,b)=>a-b), [11,12]);
assert.deepEqual([...first.viewModes].sort(), ['edit','public']);
assert.equal(first.sourceTabId, 12, 'existing edit tab must be preferred internally when the same ad is open in both modes');
assert.equal(first.thumbnailUrl, 'https://img.kleinanzeigen.de/a.jpg', 'public title image may complement the preferred edit source');
assert.equal(first.active, true, 'candidate remains associated with the active duplicate tab for preselection');
const second = result.find(item => item.adId === '777777');
assert.equal(second.sourceTabId, 13);
console.log('PASS v1.16.2 candidate dedupe/runtime source preference');
