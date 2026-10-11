'use strict';
const assert = require('node:assert/strict');

function genericElement() {
  return {
    style: {}, textContent: '', value: '', checked: false, disabled: false, isConnected: true,
    setAttribute() {}, addEventListener() {}, append() {}, replaceChildren() {}, remove() {},
    focus() {}, blur() {}, click() {}, cloneNode() { return genericElement(); },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getBoundingClientRect() { return { width: 100, height: 24, top: 0, left: 0, right: 100, bottom: 24 }; }
  };
}

const title = genericElement();
title.value = 'Alter DOM-Wert';
const categoryId = genericElement(); categoryId.value = '42';
const description = genericElement();
const priceAmount = genericElement();
const form = genericElement();
form.querySelector = selector => ({
  'input[name="title"]': title,
  'input[name="categoryId"]': categoryId,
  'textarea[name="description"]': description,
  'input[name="priceAmount"]': priceAmount
}[selector] || null);
form.querySelectorAll = () => [];

const panel = genericElement();
const documentElement = genericElement();
global.document = {
  title: 'Anzeige aufgeben',
  activeElement: null,
  documentElement,
  getElementById: id => id === 'kr-template-fill-status' ? panel : null,
  createElement: () => genericElement(),
  querySelector(selector) {
    if (selector === 'form') return form;
    if (selector === 'h1,[role="heading"]') return null;
    if (selector === 'input[name="title"]') return title;
    return null;
  },
  querySelectorAll(selector) {
    if (selector === 'form') return [form];
    if (selector === 'input[name="title"]') return [title];
    return [];
  }
};
global.location = {
  hostname: 'www.kleinanzeigen.de',
  pathname: '/p-anzeige-aufgeben-schritt2.html',
  href: 'https://www.kleinanzeigen.de/p-anzeige-aufgeben-schritt2.html'
};
global.getComputedStyle = () => ({ display: 'block', visibility: 'visible' });
global.setInterval = () => 1;
global.clearInterval = () => {};

global.chrome = { runtime: { lastError: null, sendMessage(message, callback) {
  if (message.type === 'GET_TEMPLATE_FILL_SESSION') {
    callback({ ok: true, result: {
      fillId: 'fill-title-regression',
      renewalId: 'renewal-title-regression',
      stage: 'form-ready',
      template: { title: 'Fleecejacke grau Gr. L', categoryId: '42', images: [] }
    }});
    return;
  }
  callback({ ok: true, result: {} });
}}};

let titleWrites = 0;
let initialResetInjected = false;
let verificationRoot = null;
const diagnostics = [];

const modules = {
  KRPaidInsertionGuard: {},
  KRTemplateCategoryFlow: { create: () => ({
    resolveCategoryNavigationUrl: () => null,
    normalizeLocalInteractionAttempts: n => n,
    settleAfterInteraction: async (_fillId, stage) => {
      if (stage === 'title-initial-1' && !initialResetInjected) {
        initialResetInjected = true;
        title.value = 'Von Plattform zurückgesetzt';
      }
    },
    setCategory: async () => ({ confirmed: true, pendingNavigation: false }),
    normalizeWizardLabel: value => String(value || ''),
    matchWizardAttributeColumn: () => null,
    deepestVisibleCategoryPathIndex: () => -1,
    legacyActionWaitMs: () => 0,
    runLegacyCategorySelection: async () => ({ pendingNavigation: true })
  }) },
  KRTemplateFormFields: { create: () => ({
    setTextField(element, value) { element.value = String(value ?? ''); if (element === title) titleWrites += 1; },
    checkedRadio: () => null,
    chooseRadio: () => true,
    createPageConfig: () => ({}),
    inferShippingPackageSize: () => null,
    fillDynamicAttributes: async () => [],
    fillShipping: async () => [],
    fillPriceType: async () => [],
    fillBuyNow: async () => [],
    fillLocation: async () => []
  }) },
  KRTemplateImageUpload: { create: () => ({
    uploadImages: async () => {
      title.value = 'Später DOM-Reset nach Formularinteraktionen';
      return { issues: [], complete: true, states: [] };
    }
  }) },
  KRTemplateVerification: { create: () => ({
    verify(template, root) {
      verificationRoot = root || null;
      const actual = root?.querySelector?.('input[name="title"]')?.value;
      return actual === template.title ? [] : ['Titel stimmt nicht mit der Vorlage überein.'];
    },
    verifyArchiveTemplate(template, root) { return this.verify(template, root); }
  }) },
  KRTemplatePublishFlow: { create: () => ({
    armPublishDetection: () => {},
    scrollToPublishButton: () => false,
    paidInsertionDetection: () => ({ required: false }),
    stopForPaidInsertion: async () => ({ complete: false }),
    autoPublishVerifiedRenewal: async () => ({ complete: true }),
    advanceAfterVerifiedFill: async () => ({ publishTriggered: false })
  }) }
};

global.KRDeps = {
  optional: () => null,
  require(name) { if (!(name in modules)) throw new Error(`Missing test dependency ${name}`); return modules[name]; },
  register(name, value) { if (name === 'KRTemplateFill') global.__templateFillApi = value; return value; }
};

const originalSendMessage = global.chrome.runtime.sendMessage;
global.chrome.runtime.sendMessage = (message, callback) => {
  if (message.type === 'LOG_DIAGNOSTIC_EVENT') diagnostics.push(message);
  originalSendMessage(message, callback);
};

require('../src/content/template-filler.js');

(async () => {
  const result = await global.__templateFillApi.runPendingFill();
  assert.equal(result.complete, true, 'a transient controlled-input reset must be repaired before verification');
  assert.deepEqual(result.issues, []);
  assert.equal(title.value, 'Fleecejacke grau Gr. L');
  assert.ok(titleWrites >= 3, `expected bounded rewrites for both injected resets, got ${titleWrites}`);
  assert.equal(verificationRoot, form, 'verification must be bound to the active posting form');
  assert.ok(diagnostics.some(entry => entry.event === 'TEMPLATE_TITLE_READBACK_MISMATCH'), 'readback mismatch must be diagnosable');
  assert.ok(diagnostics.some(entry => entry.event === 'TEMPLATE_TITLE_READBACK_CONFIRMED'), 'successful repair must be diagnosable');
  console.log('PASS v1.23.22 title controlled-input reset is repaired and verified on the active form');
})().catch(error => { console.error(error); process.exitCode = 1; });
