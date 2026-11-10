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
const bicycleTube = record('Fahrradschlauch', ['Auto, Rad & Boot', 'Fahrräder & Zubehör'], [
  field('Art', 'Zubehör', 'accessories'), field('Typ', 'Cityräder', 'city')]);

assert.equal(helpers.artLabel(shoe), 'Sneaker & Sportschuhe',
  'owner-proven shoe displays saved Art');
assert.equal(helpers.artLabel(bathrobe), 'Unterwäsche',
  'owner-proven bathrobe displays saved Typ, never infers from title');
assert.equal(helpers.artLabel(bicycleTube), 'Zubehör',
  "owner's Kleinanzeigen form and saved inventory details place Art Zubehör BEFORE Typ Cityräder");
const bicycleTubeReverse = record('Fahrradschlauch reversed', ['Auto, Rad & Boot', 'Fahrräder & Zubehör'], [
  field('Typ', 'Cityräder', 'city'), field('Art', 'Zubehör', 'accessories')]);
assert.equal(helpers.artLabel(bicycleTubeReverse), 'Cityräder',
  'reverse saved detail order must select Typ, not a hardcoded Art-first priority');
assert.equal(helpers.artLabel(record('Other attributes first', [], [
  field('Zustand', 'Neu'), field('Art', 'Zubehör'), field('Typ', 'Cityräder')])), 'Zubehör',
  'unrelated Zustand does not prevent the first Art/Typ from being the summary article type');
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
assert.equal(helpers.artLabel(record('Two agreeing keys', [], [field('Art', 'Schuhe'), field('Typ', 'Schuhe')])), 'Schuhe',
  'first saved Art/Typ wins when both values agree');

const scopedShoeWithTwoFields = record('This title must not determine type',
  ['Mode & Beauty', 'Damenschuhe'], [field('Art', 'Sneaker & Sportschuhe'), field('Typ', 'Unrelated subfield')]);
assert.equal(helpers.artLabel(scopedShoeWithTwoFields), 'Sneaker & Sportschuhe',
  'first saved Art field wins regardless of an unrelated later Typ');
const scopedBathrobeWithTwoFields = record('No title inference',
  ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'], [field('Typ', 'Unterwäsche'), field('Art', 'Other attribute')]);
assert.equal(helpers.artLabel(scopedBathrobeWithTwoFields), 'Unterwäsche',
  'first saved Typ field wins regardless of a later Art field');
assert.equal(helpers.artLabel({ ...scopedShoeWithTwoFields, category: { path: ['Mode & Beauty', 'Herrenschuhe'] } }), 'Sneaker & Sportschuhe',
  'exact category path is not relevant when the original saved attribute order is explicit');
assert.equal(helpers.artLabel({ ...scopedBathrobeWithTwoFields, category: null,
  categoryPath: ['Familie, Kind & Baby', 'Baby- & Kinderkleidung'] }), 'Unterwäsche',
  'saved field order is sufficient even when category is absent');

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
console.log('PASS KAR-148 first saved Art/Typ detail order and rendering contract');
