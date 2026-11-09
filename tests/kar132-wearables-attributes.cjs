'use strict';
// KAR-132: real 2026-11-09 Smartwatches form evidence, source-proven control
// shapes only. Tests use a synthetic DOM; no live account mutation.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
require('../src/shared/runtime-deps.js');
const Fields = require('../src/content/template-form-fields.js');
const Verification = require('../src/content/template-verification.js');
const clean = x => String(x ?? '').replace(/\s+/g, ' ').trim();
let passes = 0;
const pass = name => { passes++; console.log('PASS KAR-132 wearables: ' + name); };
function fixture({ bluetooth = false, ekg = true, caseValue = '', addCase = true } = {}) {
  const html = '<html><body><form><input type="hidden" name="categoryId" value="405">' +
    '<fieldset><legend>Konnektivität</legend>' +
    '<label for="wearables.bluetooth"><input type="checkbox" id="wearables.bluetooth" name="attributeMap[wearables.bluetooth]">Bluetooth</label>' +
    '<label for="wearables.ekg"><input type="checkbox" id="wearables.ekg" name="attributeMap[wearables.ekg]">EKG</label>' +
    '</fieldset>' +
    (addCase ? '<input type="hidden" name="attributeMap[wearables.case_size]" value="' + caseValue + '">' +
      '<button id="wearables.case_size" type="button" role="combobox">Bitte wählen</button>' : '') +
    '<input type="hidden" name="attributeMap[wearables.ring_size]" value="">' +
    '</form></body></html>';
  const { document } = parseHTML(html);
  global.document = document;
  for (const [key, checked] of [['wearables.bluetooth', bluetooth], ['wearables.ekg', ekg]]) {
    const input = document.getElementById(key);
    input.checked = checked;
    input.click = () => { input.checked = !input.checked; };
  }
  const waitCalls = [];
  const diagnostics = [];
  const fields = Fields.create({
    Form: null, SEARCH_KEY_DELAY_MS: 1, SEARCH_SETTLE_MS: 1,
    LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS: 3, LOCAL_ATTRIBUTE_RETRY_DELAY_MS: 1,
    clean, sleep: async () => {}, actionText: /^$/,
    diagnostic: (_id, event, details) => { diagnostics.push({ event, details }); },
    visible: () => true, visibleText: el => clean(el?.textContent),
    waitFor: async (fn, opts = {}) => {
      waitCalls.push(opts);
      const found = fn();
      if (found) return found;
      throw new Error(opts.description || 'missing');
    }
  });
  const verification = Verification.create({ checkedRadio: () => null });
  return { document, fields, verification, waitCalls, diagnostics };
}
const a = (key, technicalValue, label = key) =>
  ({ key: 'wearables.' + key, label, technicalValue, controlType: 'checkbox' });
(async () => {
  // Real source extractor serializes checkboxes as booleans; do not read the
  // checkbox DOM .value (which is usually the constant string "on").
  {
    const x = fixture({ bluetooth: false, ekg: true });
    const attrs = [a('bluetooth', true, 'Bluetooth'), a('ekg', false, 'EKG')];
    assert.deepEqual(await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-checked'), []);
    assert.equal(x.document.getElementById('wearables.bluetooth').checked, true);
    assert.equal(x.document.getElementById('wearables.ekg').checked, false);
    assert.deepEqual(x.verification.verify({ categoryId: 405, dynamicAttributes: attrs }, x.document), []);
    pass('checkbox true/false via native checked state and postverification');
  }
  {
    const x = fixture({ bluetooth: true, ekg: false });
    const attrs = [a('bluetooth', 'true'), a('ekg', 'false')];
    assert.deepEqual(await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-idempotent'), []);
    assert.equal(x.document.getElementById('wearables.bluetooth').checked, true);
    assert.equal(x.document.getElementById('wearables.ekg').checked, false);
    pass('already correct boolean-string states are idempotent');
  }
  {
    const x = fixture({ bluetooth: false });
    const attrs = [a('bluetooth', 'perhaps')];
    const issues = await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-ambiguous');
    assert.equal(issues.length, 1, 'unrecognized boolean cannot be guessed');
    assert.equal(x.document.getElementById('wearables.bluetooth').checked, false);
    pass('unknown checkbox technical value fails without mutation');
  }
  {
    const x = fixture({ bluetooth: false });
    x.document.getElementById('wearables.bluetooth').click = () => {}; // no actual state change
    const attrs = [a('bluetooth', true)];
    const issues = await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-no-readback');
    assert.equal(issues.length, 1, 'click alone is not proof of selection');
    assert.ok(x.verification.verify({ categoryId: 405, dynamicAttributes: attrs }, x.document)
      .some(issue => issue.includes('bluetooth')));
    pass('checked-state readback is mandatory');
  }
  {
    const x = fixture();
    const attrs = [a('unknown_feature', true, 'Funktion unbekannt')];
    const issues = await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-missing-fast');
    assert.equal(issues.length, 1);
    assert.ok(x.waitCalls.every(c => (c.timeout || 0) <= 1500),
      'never wait 10 seconds per missing category feature');
    pass('missing control fails fast rather than 10 seconds per attribute');
  }
  {
    const x = fixture({ caseValue: '44' });
    const attrs = [{ key: 'wearables.gehausegrosse', label: 'Gehäusegrösse (mm)',
      technicalValue: '44', displayValue: '44', controlType: 'button' }];
    assert.deepEqual(await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-renamed-case'), []);
    assert.deepEqual(x.verification.verify({ categoryId: 405, dynamicAttributes: attrs }, x.document), []);
    pass('owner-observed renamed case_size field is mapped by exact alias');
  }
  {
    const x = fixture({ caseValue: '' });
    const attrs = [{ key: 'wearables.gehausegrosse', label: 'Gehäusegrösse (mm)',
      technicalValue: '44', displayValue: '44', controlType: 'button' }];
    const issues = await x.fields.fillDynamicAttributes({ dynamicAttributes: attrs }, 'test-case-unknown-option');
    assert.equal(issues.length, 1, 'unknown dropdown option may not be fabricated');
    assert.ok(x.verification.verify({ categoryId: 405, dynamicAttributes: attrs }, x.document).length);
    pass('case size option mismatch remains fail closed');
  }
  {
    const x = fixture();
    const attrs = [{ key: 'wearables.ringgrosse', label: 'Ringgrösse', technicalValue: '',
      controlType: 'button' }];
    assert.deepEqual(x.verification.verify({ categoryId: 405, dynamicAttributes: attrs }, x.document), []);
    pass('optional blank ring size never becomes a false verification mismatch');
  }
  // Actual owner-supplied v1.23.42 portal dropdown: aria-controls of
  // wearables.case_size points to a portalled listbox; option text is "44mm",
  // whereas the archived value and display are "44".
  function caseMenuFixture({ selected = '44', technical = '44',
      otherOnly = false, duplicate = false } = {}) {
    const html = '<html><body><form><input type="hidden" name="categoryId" value="405">' +
      '<input name="attributeMap[wearables.case_size]" type="hidden" value="">' +
      '<button id="wearables.case_size" type="button" role="combobox"' +
      ' aria-controls="wearables.case_size-menu" aria-expanded="false">' +
      '<span id="wearables.case_size-selected-option">Bitte wählen</span></button>' +
      '<ul id="wearables.case_size-menu" role="listbox">' +
      '<li role="option" id="wearables.case_size-menu-option-1">43mm</li>' +
      (otherOnly ? '' : '<li role="option" id="wearables.case_size-menu-option-2">44mm</li>') +
      (duplicate ? '<li role="option" id="wearables.case_size-menu-option-3">44mm</li>' : '') +
      '</ul></form></body></html>';
    const { document } = parseHTML(html);
    global.document = document;
    global.HTMLInputElement = document.defaultView.HTMLInputElement;
    const button = document.getElementById('wearables.case_size');
    const hidden = document.querySelector('input[name="attributeMap[wearables.case_size]"]');
    const menu = document.getElementById('wearables.case_size-menu');
    let opened = false, clicks = 0;
    button.focus = () => {};
    button.click = () => { opened = true; button.setAttribute('aria-expanded', 'true'); };
    for (const option of menu.querySelectorAll('[role="option"]')) {
      option.click = () => {
        clicks++;
        hidden.value = option.textContent.trim() === '44mm' ? technical : '43';
        document.getElementById('wearables.case_size-selected-option').textContent = option.textContent.trim();
      };
    }
    const waitCalls = [];
    const fields = Fields.create({
      Form: null, SEARCH_KEY_DELAY_MS: 1, SEARCH_SETTLE_MS: 1,
      LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS: 1, LOCAL_ATTRIBUTE_RETRY_DELAY_MS: 0,
      clean, sleep: async () => {}, actionText: /^$/,
      diagnostic: () => {}, visible: node => !node.closest?.('[role="listbox"]') || opened,
      visibleText: node => clean(node?.textContent),
      waitFor: async (fn, opts = {}) => {
        waitCalls.push(opts);
        const found = fn();
        if (found) return found;
        throw new Error(opts.description || 'missing');
      }
    });
    const verification = Verification.create({ checkedRadio: () => null });
    const attr = {
      key: 'wearables.gehausegrosse', label: 'Gehäusegrösse (mm)',
      technicalValue: selected, displayValue: selected, controlType: 'input'
    };
    return { fields, verification, document, hidden, attr, waitCalls,
      clickCount: () => clicks };
  }
  {
    const x = caseMenuFixture();
    assert.deepEqual(await x.fields.fillDynamicAttributes({ dynamicAttributes: [x.attr] }, 'exact-mm'), []);
    assert.equal(x.clickCount(), 1, 'click the exact selected 44mm row once');
    assert.equal(x.hidden.value, '44');
    assert.deepEqual(x.verification.verify({ categoryId: 405, dynamicAttributes: [x.attr] }, x.document), []);
    pass('saved 44 finds the real portalled case_size 44mm option');
  }
  {
    const x = caseMenuFixture({ technical: '44mm' });
    assert.deepEqual(await x.fields.fillDynamicAttributes({ dynamicAttributes: [x.attr] }, 'normalized-mm'), []);
    assert.equal(x.clickCount(), 1);
    assert.equal(x.hidden.value, '44mm');
    assert.deepEqual(x.verification.verify({ categoryId: 405, dynamicAttributes: [x.attr] }, x.document), []);
    pass('portal technical 44mm accepted only with matching 44mm selected label');
  }
  {
    const x = caseMenuFixture({ technical: '45' });
    assert.equal((await x.fields.fillDynamicAttributes({ dynamicAttributes: [x.attr] }, 'wrong-readback')).length, 1);
    assert.equal(x.clickCount(), 1);
    assert.ok(x.verification.verify({ categoryId: 405, dynamicAttributes: [x.attr] }, x.document).length);
    pass('wrong technical value remains blocked even after 44mm click');
  }
  {
    const x = caseMenuFixture({ duplicate: true });
    assert.equal((await x.fields.fillDynamicAttributes({ dynamicAttributes: [x.attr] }, 'ambiguous-mm')).length, 1);
    assert.equal(x.clickCount(), 0, 'do not select one of two identical 44mm rows');
    pass('duplicate exact case_size choices fail closed');
  }
  {
    const x = caseMenuFixture({ otherOnly: true });
    assert.equal((await x.fields.fillDynamicAttributes({ dynamicAttributes: [x.attr] }, 'missing-mm')).length, 1);
    assert.equal(x.clickCount(), 0, 'do not approximate 44mm with 43mm');
    pass('unoffered 44mm case_size option is not guessed');
  }
  console.log(passes + '/13 PASS KAR-132 wearables attribute controls');
})().catch(error => { console.error(error); process.exitCode = 1; });
