const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
const background = require('./v12211-background-source-surface.cjs');
const content = fs.readFileSync(path.join(root, 'content.js'), 'utf8');
const runner = fs.readFileSync(path.join(root, 'inventory-runner.js'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8') + '\n' + fs.readFileSync(path.join(root, 'shared-ui-helpers.js'), 'utf8');
let n = 0; const pass = name => { n += 1; console.log('PASS ' + name); };

assert.ok(['1.6.0','1.6.1','1.6.2','1.7.0','1.7.1','1.8.0','1.8.1','1.8.2','1.8.3','1.8.4','1.8.5','1.8.6','1.8.7','1.8.8','1.8.9','1.8.10','1.8.11','1.8.12','1.8.13','1.8.14','1.9.0','1.10.0','1.10.1','1.10.2','1.10.3','1.10.4','1.11.0','1.11.1','1.11.2','1.11.3','1.11.4','1.11.5','1.12.0','1.12.1','1.13.0','1.13.1','1.13.2','1.13.3','1.13.4','1.13.5','1.13.6','1.13.7','1.13.8','1.14.0','1.14.1','1.14.2','1.14.3','1.14.4','1.14.5','1.15.0','1.15.1','1.15.2','1.15.3','1.15.4','1.15.5','1.15.6','1.15.7','1.16.0','1.16.1','1.16.2','1.16.3','1.16.4','1.16.5','1.16.6','1.16.7','1.16.8','1.16.9','1.17.0','1.17.1','1.17.2','1.17.3','1.17.4','1.17.5','1.17.6','1.17.7','1.17.8','1.17.9','1.17.10','1.18.0','1.18.1','1.18.2','1.18.3','1.18.4','1.19.0','1.19.1','1.19.2','1.19.3','1.19.4','1.19.5','1.19.6','1.19.7','1.19.8','1.20.0','1.20.1','1.20.2','1.20.3','1.20.4','1.20.5','1.20.7','1.20.8','1.20.9','1.20.10','1.20.11','1.20.12','1.20.13','1.20.14','1.20.15','1.20.16','1.20.17','1.20.18','1.20.19','1.20.20','1.20.21','1.20.22','1.21.0','1.21.1','1.21.2','1.21.3','1.21.4','1.21.5','1.21.6','1.21.7','1.21.8','1.21.9','1.21.10','1.21.11','1.21.12','1.21.13','1.21.14','1.21.15','1.22.0','1.22.1','1.22.2','1.22.3','1.22.4','1.22.5','1.22.6','1.22.7','1.22.8','1.22.9','1.22.10','1.22.11','1.22.12','1.22.13','1.22.14','1.22.15','1.22.16','1.22.17','1.22.18','1.22.19','1.22.20','1.22.21','1.22.22','1.22.23','1.22.24','1.22.25','1.22.26','1.22.27','1.22.28','1.22.29','1.22.30','1.23.0','1.23.1','1.23.2','1.23.3','1.23.4','1.23.5','1.23.6','1.23.7','1.23.8','1.23.9','1.23.10','1.23.11','1.23.12','1.23.13','1.23.14','1.23.15','1.23.16','1.23.17','1.23.18','1.23.19','1.23.20','1.23.22','1.23.23'].includes(manifest.version));
assert.equal(pkg.version, manifest.version);
assert.equal(lock.version, manifest.version);
assert.equal(lock.packages[''].version, manifest.version);
assert.deepEqual([...manifest.permissions].sort(), ['activeTab','storage','unlimitedStorage','scripting'].sort());
pass('v1.6.0 keeps the established manifest permissions and fixed extension architecture');

assert.match(content, /EXTRACT_READONLY_METADATA/);
assert.match(content, /Endet\\s\+am/);
assert.match(content, /listingDateDisplay/);
assert.match(runner, /publicUrlFromRoot/);
assert.match(runner, /publicUrl: listing\.publicUrl/);
pass('public read-only detail pages expose separate end-date and listing-date metadata');

assert.match(background, /BULK_WORKERS_OPENED/);
assert.match(background, /parallel: true/);
assert.match(background, /metadataTabId/);
assert.match(background, /mergeListingMetadata/);
assert.match(background, /LISTING_END_DATE_SOURCE_MISMATCH/);
pass('bulk inventory opens edit and read-only workers in parallel and merges them by ad id');

assert.match(background, /INVENTORY_REFRESH_WORKERS_OPENED/);
assert.match(background, /readOnlyPromise/);
assert.match(background, /publicUrlForInventoryRecord/);
assert.match(background, /existing\.profileId/);
pass('single inventory refresh also uses parallel edit/read-only metadata while preserving profile assignment');

assert.match(runner, /detectedProfileName/);
assert.match(runner, /angemeldet\\s\+als/);
assert.match(app, /RECOGNIZE_PROFILE/);
assert.match(app, /ASSIGN_UNPROFILED_INVENTORIES/);
assert.match(app, /Gespeicherte Anzeigen diesem Profil zuordnen/);
assert.match(background, /confirmed-legacy-migration/);
pass('profile prerequisite detects the logged-in profile and requires explicit confirmation before legacy migration');

assert.match(background, /profileId: (?:crypto\.randomUUID\(\)|randomUUID\(\))/);
assert.match(background, /PROFILES_KEY/);
assert.match(background, /profileAssignmentSource/);
assert.match(app, /DELETE_PROFILE/);
assert.match(background, /SELECTED_PROFILE_KEY/);
pass('stable local profile ids are retained and now extended by explicit profile management');

assert.match(app, /Anzeige vom/);
assert.match(app, /listingDateLabel/);
assert.match(background, /listingDate: record\.listingMeta\?\.listingDateDisplay/);
pass('captured listing date is visible in inventory rows/details and included in diagnostic inventory summaries');

assert.match(background, /Exportumfang: nur aktuelle Diagnose-Session/);
assert.match(background, /Warnungen im aktuellen\/letzten Lauf/);
assert.match(background, /Standardexport enthält nur Daten innerhalb der aktuellen Diagnose-Messgrenze/);
assert.match(background, /sessionId: currentDiagnosticSessionId\(\)/);
pass('diagnostic summary keeps current session/run context while historical retention stays internal');

assert.doesNotMatch(background + app, /Anzeige aufgeben[^\n]{0,180}\.click\s*\(/i);
pass('v1.6.0 keeps publication manual');

console.log(`${n} v1.6.0 contract groups passed`);
