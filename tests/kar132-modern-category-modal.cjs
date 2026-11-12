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
  activePath = categoryPath, formSuggestions = [], misleadingWearablesBranch = false, misleadingBranchName = null, extraLeafChoices = [], disabledLeaf = false,
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
    const deceptive = kind === 'branch' && ((misleadingWearablesBranch && name === 'Wearables') || name === misleadingBranchName);
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
    return button(leaf, 'leaf', activity.selected === leaf).replace('data-kind="leaf"',
        'data-kind="leaf"' + (disabledLeaf ? ' aria-disabled="true"' : '')) +
      (duplicateLeaf ? button(leaf, 'leaf') : '') +
      extraLeafChoices.map(name => button(name, 'leaf', activity.selected === name)).join('') +
      button('Andere Endkategorie', 'leaf');
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

function makeFlow(extraOptions = {}) {
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
    updatePanel: noop,
    ...extraOptions
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
    assert.deepEqual(await makeFlow().setCategory({ categoryId: wearableId, categoryPath: wearablePrefix },
      'kar132-owner-proof-over-unrelated-recommendation'), { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, wearablePath, 'proven owner 405 mapping survives unrelated suggestions');
    assert.equal(activity.confirms, 1);
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
    const { activity } = fixture({ committedId: '406', activePath: wearablePath,
      formSuggestions: [{ id: 777, path: wearablePath }], misleadingWearablesBranch: true });
    await assert.rejects(makeFlow().setCategory({ categoryId: 406, categoryPath: wearablePrefix },
      'kar132-native-unknown-406-no-matching-suggestion'), /Endkategorie|Wearables|Kategorie|category/i);
    assert.equal(activity.confirms, 0, 'never extrapolate owner-proven category 405 to 406');
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

  // KAR-143: actual 2026-11-09 owner listing has a two-level captured category
  // path, while its explicit "Typ" display value identifies the terminal child.
  // The real modal navigated into children when the apparent parent was clicked.
  const shoesPath = ['Familie, Kind & Baby', 'Baby- & Kinderschuhe', 'Halb- & Schnürschuhe'];
  const shoesTemplate = {
    categoryId: 19, categoryPath: shoesPath.slice(0, 2),
    dynamicAttributes: [{ key: 'babyshoes.type', label: 'Typ',
      technicalValue: 'half-lace', displayValue: 'Halb- & Schnürschuhe' }]
  };
  {
    const { activity } = fixture({ committedId: '19', activePath: shoesPath,
      misleadingBranchName: 'Baby- & Kinderschuhe', formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(shoesTemplate, 'kar143-shoes-pressed-parent'), {
      confirmed: true, pendingNavigation: false
    });
    assert.deepEqual(activity.clicked, shoesPath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '19', activePath: shoesPath, formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(shoesTemplate, 'kar143-shoes-arrow-parent'), {
      confirmed: true, pendingNavigation: false
    });
    assert.deepEqual(activity.clicked, shoesPath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '19', activePath: shoesPath,
      misleadingBranchName: 'Baby- & Kinderschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory({ ...shoesTemplate, dynamicAttributes: [] },
      'kar143-no-typ'), /Endkategorie|Kategorie|Typ|Unterkategorie/i);
    assert.equal(activity.confirms, 0, 'a missing captured terminal label must never confirm');
    passed++;
  }
  {
    const alternative = [...shoesPath.slice(0, 2), 'Sneaker & Sportschuhe'];
    const { activity } = fixture({ committedId: '19', activePath: alternative,
      misleadingBranchName: 'Baby- & Kinderschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(shoesTemplate, 'kar143-wrong-live-child'),
      /Kategorie|eindeutig|Halb|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'never infer a missing terminal child from a similar title');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '999', activePath: shoesPath,
      misleadingBranchName: 'Baby- & Kinderschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(shoesTemplate, 'kar143-wrong-committed-id'),
      /Kategorie-ID|19|999/);
    assert.equal(activity.confirms, 1, 'numeric postcommit verification must reject mismatch');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '19', activePath: shoesPath,
      misleadingBranchName: 'Baby- & Kinderschuhe', duplicateLeaf: true, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(shoesTemplate, 'kar143-duplicate-child'),
      /Kategorie|eindeutig|Halb|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'ambiguous end choices must never confirm');
    passed++;
  }
  {
    const { activity } = fixture();
    assert.deepEqual(await makeFlow().setCategory({
      categoryId: 154, categoryPath,
      dynamicAttributes: [{ label: 'Typ', displayValue: 'Blau', technicalValue: 'blue' }]
    }, 'kar143-do-not-extend-valid-terminal'), { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, categoryPath);
    assert.equal(activity.confirms, 1, 'type of a valid category must not become another category level');
    passed++;
  }

  // KAR-143 native Gazelle diagnosis: `Art`, not `Typ`, contains the exact
  // captured terminal choice. This is untrusted until the live modal exposes
  // one matching selectable child and the form commits categoryId=159.
  const gazellePath = ['Mode & Beauty', 'Damenschuhe', 'Sneaker & Sportschuhe'];
  const gazelleTemplate = {
    categoryId: 159, categoryPath: gazellePath.slice(0, 2),
    dynamicAttributes: [{ key: 'shoes.art', label: 'Art',
      technicalValue: 'sneaker', displayValue: 'Sneaker & Sportschuhe' }]
  };
  {
    const { activity } = fixture({ activePath: gazellePath, committedId: '159',
      misleadingBranchName: 'Damenschuhe', formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(gazelleTemplate, 'kar143-gazelle-art-pressed-parent'),
      { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, gazellePath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ activePath: gazellePath, committedId: '159', formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(gazelleTemplate, 'kar143-gazelle-art-arrow-parent'),
      { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, gazellePath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ activePath: gazellePath, committedId: '999',
      misleadingBranchName: 'Damenschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(gazelleTemplate, 'kar143-gazelle-wrong-id'), /Kategorie-ID|159|999/);
    assert.equal(activity.confirms, 1, 'real numeric ID must still be checked even after exact Art candidate');
    passed++;
  }
  {
    const { activity } = fixture({ activePath: [...gazellePath.slice(0, 2), 'Stiefel'],
      committedId: '159', misleadingBranchName: 'Damenschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(gazelleTemplate, 'kar143-gazelle-art-not-in-live-modal'),
      /Kategorie|eindeutig|Sneaker|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'a captured Art is never enough without a live exact choice');
    passed++;
  }
  {
    const { activity } = fixture({ activePath: gazellePath, committedId: '159',
      misleadingBranchName: 'Damenschuhe', duplicateLeaf: true, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(gazelleTemplate, 'kar143-gazelle-art-ambiguous-leaf'),
      /Kategorie|eindeutig|Sneaker|Endkategorie/i);
    assert.equal(activity.confirms, 0);
    passed++;
  }
  {
    const conflictingPath = ['Mode & Beauty', 'Damenschuhe', 'Stiefel'];
    const conflictingTemplate = {
      ...gazelleTemplate,
      dynamicAttributes: [{ label: 'Typ', displayValue: 'Stiefel', technicalValue: 'boots' },
        { label: 'Art', displayValue: 'Sneaker & Sportschuhe', technicalValue: 'sneaker' }]
    };
    const { activity } = fixture({ activePath: conflictingPath, committedId: '159',
      misleadingBranchName: 'Damenschuhe', extraLeafChoices: ['Sneaker & Sportschuhe'], formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(conflictingTemplate, 'kar143-conflicting-typ-art'),
      /Kategorie|eindeutig|Typ|Art|Unterkategorie/i);
    assert.equal(activity.confirms, 0, 'conflicting explicit terminal attributes must fail closed');
    passed++;
  }
  {
    const { activity } = fixture({ activePath: gazellePath, committedId: '159',
      misleadingBranchName: 'Damenschuhe', formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory({
      ...gazelleTemplate, dynamicAttributes: [{ label: 'Marke', displayValue: 'Sneaker & Sportschuhe' }]
    }, 'kar143-untrusted-other-attribute'), /Kategorie|Typ|Art|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'non-allowlisted attributes must never infer category');
    passed++;
  }
  {
    const { activity } = fixture();
    const valid = { categoryId: 154, categoryPath,
      dynamicAttributes: [{ label: 'Art', displayValue: 'Sneaker & Sportschuhe' }] };
    assert.deepEqual(await makeFlow().setCategory(valid, 'kar143-art-is-not-unconditionally-child'),
      { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, categoryPath);
    assert.equal(activity.confirms, 1);
    passed++;
  }

  // KAR-143 owner diagnostic: categoryId=217 and parent-only template path.
  // Public original Art=Zubehör, Typ=Cityräder. Real owner modal lists
  // Damen/Herren/Kinder/Zubehör/Weitere ... and marks selectable parent
  // misleadingly without arrow. The only *live* exact leaf match is Zubehör.
  const bicyclePath = ['Auto, Rad & Boot', 'Fahrräder & Zubehör', 'Zubehör'];
  const bicycleAttrs = [
    { key: 'bike.art', label: 'Art', technicalValue: 'accessory', displayValue: 'Zubehör' },
    { key: 'bike.type', label: 'Typ', technicalValue: 'city', displayValue: 'Cityräder' }
  ];
  const bicycleTemplate = { categoryId: 217, categoryPath: bicyclePath.slice(0, 2),
    dynamicAttributes: bicycleAttrs };
  const bicycleSiblings = ['Damen', 'Herren', 'Kinder', 'Weitere Fahrräder & Zubehör'];
  {
    const { activity } = fixture({ committedId: '217', activePath: bicyclePath,
      misleadingBranchName: 'Fahrräder & Zubehör', extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-live-leaf-pressed-parent'),
      { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, bicyclePath, 'only exact live Zubehör matches captured Art');
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '217', activePath: bicyclePath,
      extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    assert.deepEqual(await makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-live-leaf-arrow-parent'),
      { confirmed: true, pendingNavigation: false });
    assert.deepEqual(activity.clicked, bicyclePath);
    assert.equal(activity.confirms, 1);
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '999', activePath: bicyclePath,
      misleadingBranchName: 'Fahrräder & Zubehör', extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-wrong-id'), /Kategorie-ID|217|999/);
    assert.equal(activity.confirms, 1, 'wrong committed category ID 999 must reject 217');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '217', activePath: bicyclePath,
      misleadingBranchName: 'Fahrräder & Zubehör', extraLeafChoices: [...bicycleSiblings, 'Cityräder'], formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-two-live-candidates'),
      /eindeutig|mehrdeutig|Kategorie|Typ|Art/i);
    assert.equal(activity.confirms, 0, 'two distinct matching live terminal options must not be selected');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '217',
      activePath: ['Auto, Rad & Boot', 'Fahrräder & Zubehör', 'Satteltaschen'],
      misleadingBranchName: 'Fahrräder & Zubehör', extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-no-live-candidate'),
      /eindeutig|Kategorie|Typ|Art|Endkategorie/i);
    assert.equal(activity.confirms, 0, 'missing live exact terminal match must not confirm');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '217', activePath: bicyclePath,
      misleadingBranchName: 'Fahrräder & Zubehör', duplicateLeaf: true, extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-duplicate-leaf'),
      /eindeutig|Kategorie/i);
    assert.equal(activity.confirms, 0, 'duplicate exact terminal choice must reject');
    passed++;
  }
  {
    const { activity } = fixture({ committedId: '217', activePath: bicyclePath,
      misleadingBranchName: 'Fahrräder & Zubehör', disabledLeaf: true,
      extraLeafChoices: bicycleSiblings, formSuggestions: [] });
    await assert.rejects(makeFlow().setCategory(bicycleTemplate, 'kar143-bicycle-disabled-leaf'),
      /deaktiviert|Kategorie/i);
    assert.equal(activity.confirms, 0, 'disabled matching terminal must reject');
    passed++;
  }

  // KAR-134 F2: authenticated category-path observations must be emitted only
  // after the live committed leaf ID readback, never from a guessed prefix.
  {
    fixture();
    let evidence = null;
    const result = await makeFlow({onCategoryPathConfirmed: value => {evidence = value;}})
      .setCategory({categoryId:'154',categoryPath},'kar134-verified-F2-trail');
    assert.deepEqual(result,{confirmed:true,pendingNavigation:false},'existing navigation contract is unchanged');
    assert.equal(evidence.categoryId,'154');
    assert.equal(evidence.observedPath,true);
    assert.equal(evidence.leafConfirmed,true);
    assert.deepEqual(evidence.levels.map(x=>x.label),categoryPath);
    assert.deepEqual(evidence.levels.map(x=>x.technicalId),[null,null,'154'],
      'unpublished ancestor numeric IDs must NEVER be inferred');
    assert.deepEqual(evidence.levels.map(x=>x.kind),['branch','branch','leaf']);
    passed++;
  }
  {
    fixture({committedId:'999'});
    let fired = false;
    await assert.rejects(makeFlow({onCategoryPathConfirmed:()=>{fired=true;}})
      .setCategory({categoryId:'154',categoryPath},'kar134-bad-leaf'),/Kategorie-ID/);
    assert.equal(fired,false,'wrong platform leaf ID cannot establish an F2 reference');
    passed++;
  }
  {
    const f=fixture();f.form.querySelector('input[name="categoryId"]').value='154';
    let fired = false;
    assert.deepEqual(await makeFlow({onCategoryPathConfirmed:()=>{fired=true;}})
      .setCategory({categoryId:'154',categoryPath},'kar134-already-selected'),{
        confirmed:true,pendingNavigation:false});
    assert.equal(fired,false,'preselected category cannot be passed off as observed category navigation');
    passed++;
  }
  console.log(passed + '/40 PASS KAR-132/KAR-143/KAR-134 modern same-page category modal safety');
})().catch(error => { console.error(error); process.exitCode = 1; });
