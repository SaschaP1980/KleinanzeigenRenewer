'use strict';
// KAR-148: source-grounded, read-only inventory article-type regression.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/app/shared-ui-helpers.js'), 'utf8');
const modules = {};
const sandbox = { KRDeps: { register(name, api) { modules[name] = api; } } };
sandbox.globalThis = sandbox;
vm.runInNewContext(source, sandbox, { filename: 'shared-ui-helpers.js' });
const helpers = modules.KRSharedUiHelpers.create({ document: { createElement() { return {}; } } });

const field = (label, displayValue, technicalValue = '') => ({ label, displayValue, technicalValue });
const record = (title, categoryPath, dynamicAttributes) =>
  ({ title, category: { path: categoryPath }, dynamicAttributes });

const shoe = record('adidas Gazelle blue', ['Mode & Beauty', 'Damenschuhe'], [
  field('Art', 'Sneaker & Sportschuhe', 'sneaker')]);
const bathrobe = record('Bademantel grau/weiß', ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'], [
  field('Typ', 'Unterwäsche', 'underwear')]);
const bicycleTube = record('Fahrradschlauch', ['Freizeit, Hobby & Nachbarschaft', 'Fahrräder & Zubehör'], [
  field('Art', 'Zubehör', 'accessories'), field('Typ', 'Cityräder', 'city')]);

assert.equal(helpers.artLabel(shoe), 'Sneaker & Sportschuhe',
  'owner-proven shoe displays saved Art');
assert.equal(helpers.artLabel(bathrobe), 'Unterwäsche',
  'owner-proven bathrobe displays saved Typ, never infers from title');
assert.equal(helpers.artLabel(bicycleTube), '–',
  'conflicting Art and Typ on bike tube are ambiguous without authoritative category evidence');
assert.equal(helpers.artLabel(record('unrelated', [], [field('Kategorie', 'Beauty')])), '–',
  'do not infer type from a category title or unrelated field');
assert.equal(helpers.artLabel(record('empty', [], [])), '–');
assert.equal(helpers.artLabel(record('legacy', [], null)), '–');
assert.equal(helpers.artLabel(record('Technical fallback', [], [field('Typ', ' ', 'safely-saved-technical')])), 'safely-saved-technical');
assert.equal(helpers.artLabel(record('Whitespace label', [], [field(' tYP  ', 'Original & exact')])), 'Original & exact');
assert.equal(helpers.artLabel(record('Duplicate same', [], [field('Art', 'Sneaker'), field('ART', 'Sneaker')])), 'Sneaker');
assert.equal(helpers.artLabel(record('Duplicate conflict', [], [field('Art', 'Sneaker'), field('ART', 'Sandalen')])), '–');
assert.equal(helpers.artLabel(record('Two fields, empty Art', [], [field('Art', ''), field('Typ', 'Unterwäsche')])), 'Unterwäsche');
assert.equal(helpers.artLabel(record('Two fields, empty Typ', [], [field('Art', 'Zubehör'), field('Typ', '')])), 'Zubehör');
assert.equal(helpers.artLabel(record('Two agreeing but unproven keys', [], [field('Art', 'Schuhe'), field('Typ', 'Schuhe')])), '–',
  'two fields require authoritative category-key provenance, not guesswork even if values match');

const scopedShoeWithTwoFields = record('This title must not determine type',
  ['Mode & Beauty', 'Damenschuhe'], [field('Typ', 'Unrelated subfield'), field('Art', 'Sneaker & Sportschuhe')]);
assert.equal(helpers.artLabel(scopedShoeWithTwoFields), 'Sneaker & Sportschuhe',
  'exact owner-observed Damenschuhe category proves Art field despite an unrelated Typ');
const scopedBathrobeWithTwoFields = record('No title inference',
  ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'], [field('Art', 'Other attribute'), field('Typ', 'Unterwäsche')]);
assert.equal(helpers.artLabel(scopedBathrobeWithTwoFields), 'Unterwäsche',
  'exact owner-observed Kinderkleidung category proves Typ field despite another Art');
assert.equal(helpers.artLabel({ ...scopedShoeWithTwoFields, category: { path: ['Mode & Beauty', 'Herrenschuhe'] } }), '–',
  'a related but unverified category must not inherit the Damenschuhe resolution');
assert.equal(helpers.artLabel({ ...scopedBathrobeWithTwoFields, category: null,
  categoryPath: ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'] }), 'Unterwäsche',
  'verified full category path fallback may resolve the preserved recorded Typ');

const before = JSON.stringify(bathrobe);
assert.equal(helpers.artLabel(bathrobe), 'Unterwäsche');
assert.equal(JSON.stringify(bathrobe), before, 'resolver must be read-only');

const renderer = fs.readFileSync(path.join(root, 'src/app/inventory-card-renderer.js'), 'utf8');
assert.match(renderer, /makeInfoLine\('Kategorie',\s*categoryLabel\(record\)\)/);
assert.match(renderer, /makeInfoLine\('Artikeltyp',\s*artLabel\(record\)\)/,
  'detailed primary facts must display exactly Artikeltyp');
assert.doesNotMatch(renderer, /makeInfoLine\('Art',\s*artLabel\(record\)\)/,
  'remove old hardcoded Art summary heading without changing original detailed Art labels');
assert.match(renderer, /\['Weitere Angaben',\s*record\.dynamicAttributes\?\.map\(item => \`\$\{item\.label\}:/,
  'expanded details must continue to show untouched original attribute names');
console.log('PASS KAR-148 category-aware article-type source/data/DOM contract');
