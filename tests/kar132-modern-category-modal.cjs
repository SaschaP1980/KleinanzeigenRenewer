'use strict';
// KAR-132 P0: native same-path modal DOM characterization, no live Kleinanzeigen activity.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
require('../src/shared/runtime-deps.js');
const Category = require('../src/content/template-category-flow.js');

const clean = value => String(value ?? '').replace(/\\s+/g, ' ').trim();
const target = '/p-anzeige-aufgeben-schritt2.html';
const categoryPath = ['Mode & Beauty', 'Damenbekleidung', 'Jeans'];
const noop = () => {};
const asyncNoop = async () => ({});
let passed = 0;

function fixture({ committedId = '154', disableConfirmation = false, duplicateLeaf = false } = {}) {
  const { document } = parseHTML('<html><body><form><input name="categoryId" value="0"><a href="/p-anzeige-aufgeben-schritt2.html">Wähle deine Kategorie</a></form><main id="mount"></main></body></html>');
  global.document = document;
  global.location = { pathname: target, href: 'https://www.kleinanzeigen.de' + target };
  const mount = document.querySelector('#mount');
  const form = document.querySelector('form');
  const chooser = form.querySelector('a');
  const activity = { opens: 0, confirms: 0, clicked: [], selected: null };
  let level = 0;

  const button = (name, kind, pressed = false) => '<li><button data-kind="' + kind + '" data-name="' + name + '" type="button"' +
    (kind === 'leaf' ? ' aria-pressed="' + pressed + '"' : '') + '><span class="flex-1">' + name + '</span>' +
    (kind === 'branch' ? '<svg data-title="arrowRight"></svg><span class="sr-only">, öffnet Unterkategorien</span>' : '') +
    (pressed ? '<svg data-title="checkmark"></svg>' : '') + '</button></li>';
  function breadcrumb() {
    if (!level) return '<p>Alle Kategorien</p>';
    const parts = ['Alle Kategorien', ...categoryPath.slice(0, level)];
    return '<nav aria-label="Kategoriennavigation"><ol>' + parts.map((part, index) =>
      '<li>' + (index === parts.length - 1 ? '<span aria-current="page">' + part + '</span>' :
        '<button type="button">' + part + '</button>') + '</li>').join('') + '</ol></nav>';
  }
  function choices() {
    if (!level) return button('Mode & Beauty', 'branch') + button('Elektronik', 'branch');
    if (level === 1) return button('Damenbekleidung', 'branch') + button('Herrenbekleidung', 'branch') +
      button('Weiteres Mode & Beauty', 'leaf');
    return button('Jeans', 'leaf', activity.selected === 'Jeans') +
      (duplicateLeaf ? button('Jeans', 'leaf') : '') + button('Hosen', 'leaf');
  }
  function render() {
    const ready = Boolean(activity.selected) && !disableConfirmation;
    mount.innerHTML = '<dialog open aria-modal="true"><header><h2>Kategorie wählen</h2></header>' +
      '<div data-testid="scrollable-content" role="region" aria-label="Kategorie wählen Inhalt">' +
      breadcrumb() + '<ul>' + choices() + '</ul></div>' +
      '<footer><button aria-disabled="false">Abbrechen</button>' +
      '<button aria-disabled="' + !ready + '">Übernehmen</button></footer></dialog>';
    for (const item of mount.querySelectorAll('ul > li > button')) {
      item.click = () => {
        activity.clicked.push(item.getAttribute('data-name'));
        if (item.getAttribute('data-kind') === 'branch') level += 1;
        else activity.selected = item.getAttribute('data-name');
        render();
      };
    }
    const confirm = [...mount.querySelectorAll('footer button')].find(e => clean(e.textContent) === 'Übernehmen');
    confirm.click = () => {
      activity.confirms += 1;
      if (confirm.getAttribute('aria-disabled') !== 'false') throw new Error('disabled confirmation clicked');
      form.querySelector('input[name="categoryId"]').value = committedId;
      mount.innerHTML = '';
    };
  }
  chooser.click = () => { activity.opens += 1; render(); };
  return { document, form, activity };
}

function makeFlow() {
  return Category.create({
    CATEGORY_PATH: '/p-kategorie-aendern.html', LEGACY_ACTION_DELAY_MS: 1,
    INTERACTION_SETTLE_MS: 1, CATEGORY_OPEN_LOCAL_CONFIRM_MS: 1,
    CATEGORY_OPEN_LOCAL_RETRY_DELAY_MS: 1, LOCAL_INTERACTION_ATTEMPTS_DEFAULT: 2,
    clean, sleep: asyncNoop, actionText: /^$/,
    runtimeMessage: asyncNoop, diagnostic: noop,
    visible: e => Boolean(e?.isConnected), visibleText: e => {
      if (!e) return '';
      const node = e.cloneNode(true);
      for (const child of node.querySelectorAll('.sr-only,[aria-hidden="true"]')) child.remove();
      return clean(node.textContent);
    },
    waitFor: async (getter, config = {}) => {
      for (let n = 0; n < 4; n++) { const found = getter(); if (found) return found; }
      throw new Error(config.description || 'wait timed out');
    },
    updatePanel: noop
  });
}
(async () => {
  {
    const { activity } = fixture();
    const result = await makeFlow().setCategory({ categoryId: 154, categoryPath }, 'kar132-success');
    assert.deepEqual(result, { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, categoryPath);
    assert.equal(activity.opens, 1, 'must not retry-click opener when modal opens on same route');
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '999' });
    await assert.rejects(
      makeFlow().setCategory({ categoryId: 154, categoryPath }, 'kar132-mismatch'),
      /category|kategorie|154|999/i,
      'wrong committed numeric category must fail closed'
    );
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ disableConfirmation: true });
    await assert.rejects(
      makeFlow().setCategory({ categoryId: 154, categoryPath }, 'kar132-disabled'),
      /übernehmen|disabled|kategorie|category/i
    );
    assert.equal(activity.confirms, 0, 'aria-disabled=true is a hard stop');
    passed++;
  }
  {
    const { activity } = fixture({ duplicateLeaf: true });
    await assert.rejects(makeFlow().setCategory({ categoryId: 154, categoryPath }, 'kar132-ambiguous'));
    assert.equal(activity.confirms, 0, 'ambiguous leaf must never confirm');
    passed++;
  }
  console.log(passed + '/4 PASS KAR-132 modern same-page category modal safety');
})().catch(error => { console.error(error); process.exitCode = 1; });
