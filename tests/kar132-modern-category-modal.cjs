'use strict';
// KAR-132 P0: native same-path modal DOM characterization, no live Kleinanzeigen activity.
const assert = require('node:assert/strict');
const { parseHTML } = require('linkedom');
require('../src/shared/runtime-deps.js');
const Category = require('../src/content/template-category-flow.js');

const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const target = '/p-anzeige-aufgeben-schritt2.html';
const categoryPath = ['Mode & Beauty', 'Damenbekleidung', 'Jeans'];
const noop = () => {};
const asyncNoop = async () => ({});
let passed = 0;

function fixture({ committedId = '154', disableConfirmation = false, duplicateLeaf = false,
  activePath = categoryPath, formSuggestions = [], misleadingWearablesBranch = false,
  delayedWearablesSuggestionAtQuery = 0 } = {}) {
  const formRadio = ({ id, path }) => '<label><input type="radio" name="category-suggestions" value="' +
    id + '">' + path.join(' → ') + '</label>';
  const formSuggestionHtml = '<fieldset id="ad-category-picker" aria-label="Kategorienvorschläge">' +
    formSuggestions.map(formRadio).join('') + '</fieldset>';
  const { document } = parseHTML('<html><body><form><input name="categoryId" value="0">' +
    formSuggestionHtml + '<a href="/p-anzeige-aufgeben-schritt2.html">Wähle deine Kategorie</a>' +
    '</form><main id="mount"></main></body></html>');
  global.document = document;
  global.location = { pathname: target, href: 'https://www.kleinanzeigen.de' + target };
  const mount = document.querySelector('#mount');
  const form = document.querySelector('form');
  const chooser = form.querySelector('a');
  const activity = { opens: 0, confirms: 0, clicked: [], selected: null };
  let level = 0;

  // Real 2026-11-09 UI can navigate into child choices from an apparent
  // selectable parent: aria-pressed exists but the click opens another level.
  const button = (name, kind, pressed = false) => {
    const deceptive = misleadingWearablesBranch && kind === 'branch' && name === 'Wearables';
    return '<li><button data-kind="' + kind + '" data-name="' + name + '" type="button"' +
      (kind === 'leaf' || deceptive ? ' aria-pressed="' + pressed + '"' : '') +
      '><span class="flex-1">' + name + '</span>' +
      (kind === 'branch' && !deceptive ? '<svg data-title="arrowRight"></svg><span class="sr-only">, öffnet Unterkategorien</span>' : '') +
      (pressed ? '<svg data-title="checkmark"></svg>' : '') + '</button></li>';
  };
  function breadcrumb() {
    if (!level) return '<p>Alle Kategorien</p>';
    const parts = ['Alle Kategorien', ...activePath.slice(0, level)];
    return '<nav aria-label="Kategoriennavigation"><ol>' + parts.map((part, index) =>
      '<li>' + (index === parts.length - 1 ? '<span aria-current="page">' + part + '</span>' :
        '<button type="button">' + part + '</button>') + '</li>').join('') + '</ol></nav>';
  }
  function choices() {
    if (level < activePath.length - 1) {
      return button(activePath[level], 'branch') + button('Andere Kategorie', 'branch');
    }
    const leaf = activePath[activePath.length - 1];
    return button(leaf, 'leaf', activity.selected === leaf) +
      (duplicateLeaf ? button(leaf, 'leaf') : '') + button('Andere Endkategorie', 'leaf');
  }
  function render() {
    const ready = Boolean(activity.selected) && !disableConfirmation;
    mount.innerHTML = '<dialog open aria-modal="true"><header><h2>Kategorie wählen</h2></header>' +
      '<div data-testid="scrollable-content" role="region" aria-label="Kategorie wählen Inhalt">' +
      (level === 0 ? '<fieldset id="modal-category-picker" role="radiogroup" aria-label="Kategorienvorschläge"><label><input type="radio" name="modal-category-suggestions" value="160">Mode &amp; Beauty → Herrenbekleidung → Jeans</label></fieldset>' : '') +
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
  if (delayedWearablesSuggestionAtQuery > 0) {
    const rawQuery = form.querySelectorAll.bind(form);
    let probeCount = 0;
    form.querySelectorAll = selector => {
      if (selector.includes('input[name="category-suggestions"]') &&
          ++probeCount === delayedWearablesSuggestionAtQuery) {
        const label = document.createElement('label');
        label.innerHTML = '<input type="radio" name="category-suggestions" value="405">' +
          'Elektronik → Wearables → Smartwatches';
        form.querySelector('#ad-category-picker').appendChild(label);
      }
      return rawQuery(selector);
    };
  }
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
  {
    const { form, activity } = fixture();
    form.querySelector('input[name="categoryId"]').value = '154';
    assert.deepEqual(await makeFlow().setCategory({ categoryId: 154 }, 'kar132-already-set'), {
      confirmed: true, pendingNavigation: false
    });
    assert.equal(activity.opens, 0, 'pre-matched category should preserve existing shortcut');
    passed++;
  }
  // Native user evidence 2026-11-09: legacy inventory path stops at Wearables,
  // but the real form suggests categoryId=405 with full Smartwatches leaf.
  const wearablePath = ['Elektronik', 'Wearables', 'Smartwatches'];
  const wearableId = 405;
  const wearablePrefix = wearablePath.slice(0, 2);
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: 405, path: wearablePath }, { id: 157, path: ['Mode & Beauty', 'Uhren & Schmuck', 'Uhren'] }] });
    assert.deepEqual(await makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix }, 'kar132-wearables-405'), {
      confirmed: true, pendingNavigation: false
    });
    assert.deepEqual(activity.clicked, wearablePath, 'must navigate through ID-proven leaf, not stop at Wearables');
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: 777, path: wearablePath }] });
    await assert.rejects(makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix }, 'kar132-no-id'),
      /Wearables|Kategorie|category|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'do not infer leaf without matching ID');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: wearableId, path: ['Elektronik', 'Smartphones', 'Smartwatches'] }] });
    await assert.rejects(makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix }, 'kar132-mismatch-prefix'),
      /Wearables|Kategorie|category|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'do not accept a category whose ancestry differs');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: wearableId, path: wearablePath }, { id: wearableId, path: ['Elektronik', 'Wearables', 'Fitness-Tracker'] }] });
    await assert.rejects(makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix }, 'kar132-ambiguous-id'),
      /mehrdeutig|eindeutig|Kategorie|category|Wearables/i);
    assert.equal(activity.confirms, 0, 'duplicate ID with different leaves must fail closed');
    passed++;
  }
  // v1.23.39 real-world regression: Wearables was clicked and the UI
  // navigated into the Smartwatches children, but the adapter kept awaiting
  // aria-pressed=true on the parent and timed out.
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: wearableId, path: wearablePath }, { id: 157, path: ['Mode & Beauty', 'Uhren', 'Uhren'] }],
      misleadingWearablesBranch: true });
    assert.deepEqual(await makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-native-wearables-parent-misleading'), { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, wearablePath, 'must select actual Smartwatches terminal leaf');
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      formSuggestions: [{ id: 777, path: wearablePath }], misleadingWearablesBranch: true });
    await assert.rejects(makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-native-no-matching-suggestion'), /Endkategorie|Wearables|Kategorie|category/i);
    assert.equal(activity.confirms, 0, 'no numeric-ID proof: never confirm even if parent click opens sublevel');
    passed++;
  }
  // Real v1.23.40 diagnostic has no CATEGORY_MODAL_PATH_EXTENDED_BY_ID
  // even though the owner previously captured categoryId=405 -> Smartwatches.
  // Model suggestions that have not rendered yet at first category probe.
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      misleadingWearablesBranch: true, delayedWearablesSuggestionAtQuery: 3 });
    assert.deepEqual(await makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-late-id-suggestion'), { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, wearablePath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  // The owner-supplied real form HTML confirms exactly 405 -> Smartwatches;
  // support that narrow known hierarchy even if the *new* empty form renders
  // no recommendation, then independently verify the committed numeric ID.
  {
    const { activity } = fixture({ committedId: String(wearableId), activePath: wearablePath,
      misleadingWearablesBranch: true, formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-405-no-suggestions'), { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, wearablePath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '999', activePath: wearablePath,
      misleadingWearablesBranch: true, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-fallback-wrong-postcommit-id'), /Kategorie-ID|405|999/);
    assert.equal(activity.confirms, 1, 'numeric postcommit rejection is mandatory before any publication');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '406', activePath: wearablePath,
      misleadingWearablesBranch: true, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory({ categoryId: 406, categoryPath: wearablePrefix },
      'kar132-unverified-other-id'), /Wearables|Endkategorie|Kategorie|category/i);
    assert.equal(activity.confirms, 0, 'known 405 proof must not be used for another ID');
    passed++;
  }
  console.log(passed + '/15 PASS KAR-132 modern same-page category modal safety');
})().catch(error => { console.error(error); process.exitCode = 1; });
