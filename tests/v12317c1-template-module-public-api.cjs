'use strict';
const assert = require('node:assert/strict');
require('../src/shared/runtime-deps.js');
const Category = require('../src/content/template-category-flow.js');
const Fields = require('../src/content/template-form-fields.js');
const Images = require('../src/content/template-image-upload.js');
const Verification = require('../src/content/template-verification.js');
const Publish = require('../src/content/template-publish-flow.js');

let passed = 0;
const pass = name => { passed += 1; console.log('PASS ' + name); };
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const asyncNoop = async () => {};
const noop = () => {};

// Minimal browser primitives for public-contract execution.
class FakeElement {
  constructor(value = '') { this._value = String(value); this.checked = false; this.disabled = false; this.textContent = ''; this.events = []; }
  get value() { return this._value; }
  set value(v) { this._value = String(v); }
  focus() { this.focused = true; }
  blur() { this.blurred = true; }
  click() { this.checked = true; this.clicked = true; }
  dispatchEvent(event) { this.events.push(event?.type || 'event'); return true; }
  scrollIntoView() { this.scrolled = true; }
  closest() { return null; }
  matches() { return false; }
}
class FakeInput extends FakeElement { get value() { return this._value; } set value(v) { this._value = String(v); } }
class FakeTextArea extends FakeElement { get value() { return this._value; } set value(v) { this._value = String(v); } }
global.HTMLInputElement = FakeInput;
global.HTMLTextAreaElement = FakeTextArea;
global.Element = FakeElement;
global.Event = class { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } };
global.InputEvent = global.Event;
global.KeyboardEvent = global.Event;
global.CSS = { escape: value => String(value) };
global.window = { scrollTo: noop };
global.location = { href: 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html', pathname: '/p-anzeige-aufgeben-schritt2.html' };

let queryAll = () => [];
let queryOne = () => null;
let byId = () => null;
global.document = {
  querySelectorAll: selector => queryAll(selector),
  querySelector: selector => queryOne(selector),
  getElementById: id => byId(id),
  addEventListener: noop,
  documentElement: { scrollHeight: 1000 }
};

(async () => {
  const category = Category.create({
    CATEGORY_PATH: '/p-kategorie-aendern.html', LEGACY_ACTION_DELAY_MS: 100, INTERACTION_SETTLE_MS: 5,
    CATEGORY_OPEN_LOCAL_CONFIRM_MS: 5, CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS: 1, LOCAL_INTERACTION_ATTEMPTS_DEFAULT: 3,
    clean, sleep: asyncNoop, actionText: /^$/, runtimeMessage: asyncNoop, diagnostic: noop, visible: () => true,
    visibleText: element => clean(element?.textContent), waitFor: async fn => fn(), updatePanel: noop
  });
  assert.deepEqual(Object.keys(category).sort(), [
    'deepestVisibleCategoryPathIndex','legacyActionWaitMs','matchWizardAttributeColumn','normalizeLocalInteractionAttempts',
    'normalizeWizardLabel','resolveCategoryNavigationUrl','runLegacyCategorySelection','setCategory','settleAfterInteraction'
  ].sort());
  const chooser = { getAttribute: name => name === 'href' ? '/p-kategorie-aendern.html?flow=postad' : null };
  assert.match(category.resolveCategoryNavigationUrl(chooser, 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html'), /p-kategorie-aendern/);
  assert.equal(category.normalizeLocalInteractionAttempts(0), 1);
  await category.settleAfterInteraction('fill-contract', 'title');
  const form = {
    querySelector: selector => selector.includes('categoryId') ? { value: '42' } : null,
    querySelectorAll: () => []
  };
  queryOne = selector => selector === 'form' ? form : null;
  assert.deepEqual(await category.setCategory({ categoryId: 42 }, 'fill-contract'), { confirmed: true, pendingNavigation: false });
  assert.equal(category.normalizeWizardLabel(' Zustand * '), 'zustand');
  assert.equal(category.matchWizardAttributeColumn('Art *', ['Jacken'], [{ key: 'kind', label: 'Art', displayValue: 'Jacken', technicalValue: 'jackets', required: true }], []).technicalValue, 'jackets');
  assert.equal(category.deepestVisibleCategoryPathIndex(['Damen'], ['Mode', 'Damen']), 1);
  assert.equal(category.legacyActionWaitMs(1000, 1025), 75);
  global.location.pathname = '/already-left-category';
  byId = id => id === 'postad-category-select-box' ? {} : null;
  assert.deepEqual(await category.runLegacyCategorySelection({ fillId: 'fill-contract', template: { categoryId: 42, categoryPath: ['Mode'] } }), { pendingNavigation: true });
  pass('all nine category-flow public methods execute through their public API');

  const fields = Fields.create({
    Form: { decodeAstroProps: () => ({ postListingPage: { editMode: false, availableShippingOptions: { options: [] }, photoConfig: { max: 20 } } }) },
    SEARCH_KEY_DELAY_MS: 1, SEARCH_SETTLE_MS: 1, LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS: 2, LOCAL_ATTRIBUTE_RETRY_DELAY_MS: 1,
    clean, sleep: asyncNoop, actionText: /^$/, diagnostic: noop, visible: () => true, visibleText: element => clean(element?.textContent), waitFor: async fn => fn()
  });
  assert.deepEqual(Object.keys(fields).sort(), ['checkedRadio','chooseRadio','createPageConfig','fillBuyNow','fillDynamicAttributes','fillLocation','fillPriceType','fillShipping','inferShippingPackageSize','setTextField'].sort());
  const textInput = new FakeInput('old');
  fields.setTextField(textInput, 'new');
  assert.equal(textInput.value, 'new');
  const radio = new FakeInput('yes'); radio.checked = false;
  queryAll = selector => selector.includes('type="radio"') ? [radio] : [];
  assert.equal(fields.checkedRadio('buyNow', 'yes'), radio);
  assert.equal(fields.chooseRadio('buyNow', 'yes'), true);
  const island = { getAttribute: name => name === 'props' ? '{}' : null };
  queryOne = selector => selector.startsWith('astro-island') ? island : null;
  assert.equal(fields.createPageConfig().photoConfig.max, 20);
  const inferred = fields.inferShippingPackageSize({ options: [{ id: 'a', packageSize: 'S' }], sizeGroups: [{ packageSize: 'S', name: 'Klein' }] }, [{ id: 'a' }]);
  assert.equal(inferred.packageSize, 'S');
  assert.deepEqual(await fields.fillDynamicAttributes({ dynamicAttributes: [] }, 'fill-contract'), []);
  assert.deepEqual(await fields.fillShipping({}), []);
  assert.deepEqual(await fields.fillPriceType({ price: {} }), []);
  assert.deepEqual(await fields.fillBuyNow({}), []);
  queryOne = () => null;
  assert.deepEqual(await fields.fillLocation({ locationData: {} }), []);
  pass('all ten form-field public methods execute through their public API');

  const images = Images.create({
    CHUNK_SIZE: 1, IMAGE_PREVIEW_SERVER_TIMEOUT_MS: 1, IMAGE_PREVIEW_RETRY_DELAY_MS: 1, IMAGE_PREVIEW_STABLE_MS: 1,
    IMAGE_PREVIEW_INITIAL_WAIT_MS: 1, IMAGE_PREVIEW_RETRY_WAIT_MS: 1, IMAGE_PREVIEW_FALLBACK_WAIT_MS: 1, IMAGE_PROGRESS_HOLD_MS: 1,
    LOCAL_PREVIEW_URLS: new Set(), sleep: asyncNoop, runtimeMessage: asyncNoop, diagnostic: noop, visible: () => true,
    waitFor: async fn => fn(), updatePanel: noop
  });
  assert.deepEqual(Object.keys(images), ['uploadImages']);
  assert.deepEqual(await images.uploadImages('fill-contract', { images: [] }), { issues: [], complete: true, states: [] });
  pass('image-upload exposes and executes only its single public operation');

  queryAll = () => [];
  queryOne = () => null;
  const verification = Verification.create({ checkedRadio: () => null });
  assert.deepEqual(Object.keys(verification).sort(), ['verify','verifyArchiveTemplate'].sort());
  assert.equal('verifyTemplate' in verification, false);
  assert.deepEqual(verification.verify({}), []);
  assert.deepEqual(verification.verifyArchiveTemplate({}), []);
  pass('verification keeps verifyTemplate private and executes both real public contracts');

  const messages = [];
  queryAll = () => [];
  global.location.href = 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html';
  global.location.pathname = '/p-anzeige-aufgeben-schritt2.html';
  const publish = Publish.create({
    PaidInsertionGuard: { detect: () => ({ required: true, phase: 'checkout', amount: '1,99 €' }) }, clean, sleep: asyncNoop,
    runtimeMessage: async message => { messages.push(message); return {}; }, diagnostic: noop, visible: () => true,
    visibleText: element => clean(element?.textContent), waitFor: async fn => fn(), updatePanel: noop
  });
  assert.deepEqual(Object.keys(publish).sort(), ['advanceAfterVerifiedFill','armPublishDetection','autoPublishVerifiedRenewal','paidInsertionDetection','scrollToPublishButton','stopForPaidInsertion'].sort());
  publish.armPublishDetection('fill-contract');
  assert.equal(publish.scrollToPublishButton(), false);
  assert.equal(publish.paidInsertionDetection().required, true);
  const stopped = await publish.stopForPaidInsertion({ fillId: 'fill-contract' }, { required: true, phase: 'checkout', amount: '1,99 €' }, 'contract');
  assert.equal(stopped.paidInsertionRequired, true);
  assert.equal(messages.at(-1).status, 'needs-review');
  const templateOnly = await publish.autoPublishVerifiedRenewal({ fillId: 'fill-template', templateOnly: true });
  assert.equal(templateOnly.publishTriggered, false);
  assert.equal(templateOnly.templateOnlyComplete, true);
  const manual = await publish.advanceAfterVerifiedFill({ fillId: 'fill-manual', templateOnly: true });
  assert.equal(manual.manualContinue, true);
  assert.equal(messages.at(-1).stage, 'awaiting-manual-continue');
  pass('all six publish-flow public methods execute including fail-closed paid and template-only paths');

  console.log(`${passed}/5 PASS v1.23.17_c1 template-module public API closure`);
})().catch(error => { console.error(error); process.exitCode = 1; });
