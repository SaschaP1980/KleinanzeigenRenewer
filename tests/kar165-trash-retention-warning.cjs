'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parseHTML } = require('linkedom');

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-11T17:00:00.000Z');
const formattingModule = require('../src/app/inventory-formatting.js');
const recordCardModule = require('../src/app/record-card-view.js');
const trashCardModule = require('../src/app/trash-card-renderer.js');
const css = fs.readFileSync(path.join(__dirname, '../app.css'), 'utf8');

const helpers = {
  formatDate: value => String(value || '–'),
  formatCalendarDate: value => new Date(value).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC'
  }),
  displayPriceWithType: () => '12 €',
  artLabel: () => '–'
};
const formatter = formattingModule.create({ sharedUiHelpers: helpers });
const presentationAt = (record, now = NOW) => formatter.trashRetentionPresentation(record, now);
const formatting = { ...formatter, trashRetentionPresentation: record => presentationAt(record) };

function recordWithExpiry(expiresAt, id = '165') {
  return {
    inventoryId: id, adId: id, profileId: 'profile-A', title: 'Testartikel',
    price: { displayed: '12 €' }, images: [],
    trash: { trashedAt: '2026-11-01T00:00:00Z', expiresAt },
    category: { path: ['Mode', 'Schuhe'] }
  };
}

function renderRecord(record, compact) {
  const { document, Element } = parseHTML('<html><body><div id="trash"></div><span id="count"></span><span id="inventory"></span><span id="trash-header"></span></body></html>');
  const recordCardView = recordCardModule.create({
    document, Element, formatting, loadLocalPreview: async () => {}
  });
  const trashList = document.querySelector('#trash');
  const renderer = trashCardModule.create({
    document, formatting, recordCardView,
    elements: {
      trashList, trashCount: document.querySelector('#count'),
      inventoryHeaderCount: document.querySelector('#inventory'),
      trashHeaderCount: document.querySelector('#trash-header')
    },
    sharedUiHelpers: {
      makeCompactIconButton: options => {
        const button = document.createElement('button');
        button.textContent = options.label;
        return button;
      }
    },
    selectedConcreteProfile: () => ({ id: 'profile-A' }),
    accountGateModel: () => ({ allowed: false, tooltip: 'Test only' }),
    insertionLockActive: () => false,
    syncListViewModeControls: () => {}
  });
  renderer.updateContext({ records: [], trashRecords: [record], selectedProfileId: 'profile-A',
    globalListViewMode: compact ? 'compact' : 'detailed' });
  renderer.renderTrash();
  const deadline = trashList.querySelector(compact ? '.compact-list-meta-end' : '.trash-expiry strong');
  assert.ok(deadline, 'retention deadline exists in both trash views');
  return { renderer, trashList, deadline };
}

function checkCountdown(days, urgency, compact) {
  const record = recordWithExpiry(new Date(NOW + days * DAY).toISOString());
  const text = presentationAt(record);
  const { deadline } = renderRecord(record, compact);
  assert.equal(deadline.textContent, text, 'DOM keeps complete original retention wording');
  const suffix = deadline.querySelector('.trash-retention-countdown');
  assert.ok(suffix, 'countdown is an isolated child span');
  assert.equal(suffix.textContent, days === 1 ? '(noch 1 Tag)' :
    days === 0 ? '(Frist abgelaufen)' : `(noch ${days} Tage)`);
  const expectedPrefix = text.slice(0, -suffix.textContent.length);
  assert.equal(deadline.firstChild.nodeType, 3, 'prefix is a plain uncolored text node');
  assert.equal(deadline.firstChild.textContent, expectedPrefix, 'the date/label prefix is not inside the colored span');
  assert.equal(suffix.classList.contains('trash-retention-countdown-warning'), urgency === 'warning');
  assert.equal(suffix.classList.contains('trash-retention-countdown-urgent'), urgency === 'urgent');
  assert.equal(deadline.querySelectorAll('.trash-retention-countdown').length, 1);
}

for (const compact of [false, true]) {
  for (const [days, urgency] of [
    [28, 'neutral'], [8, 'neutral'], [7, 'warning'], [4, 'warning'],
    [3, 'urgent'], [2, 'urgent'], [1, 'urgent'], [0, 'urgent']
  ]) checkCountdown(days, urgency, compact);

  const expired = recordWithExpiry(new Date(NOW - DAY).toISOString());
  const expiredView = renderRecord(expired, compact).deadline;
  assert.match(expiredView.textContent, /Frist abgelaufen/);
  assert.ok(expiredView.querySelector('.trash-retention-countdown-urgent'));

  for (const invalid of [null, '', 'invalid-date', '∞', 'Infinity']) {
    const { deadline } = renderRecord(recordWithExpiry(invalid), compact);
    assert.equal(deadline.textContent, 'Aufbewahrung unbekannt');
    assert.equal(deadline.querySelector('.trash-retention-countdown'), null, 'unknown/infinite has no urgency');
  }

  const oneDayAcrossYear = recordWithExpiry('2027-01-01T00:05:00.000Z');
  const aroundMidnight = Date.parse('2026-12-31T23:55:00.000Z');
  assert.equal(presentationAt(oneDayAcrossYear, aroundMidnight), 'Im Papierkorb bis 01.01.2027 (noch 1 Tag)');
  const newYearDays = recordWithExpiry('2027-01-07T17:00:00.000Z');
  assert.equal(presentationAt(newYearDays, Date.parse('2026-12-31T17:00:00.000Z')), 'Im Papierkorb bis 07.01.2027 (noch 7 Tage)');
}

for (const selector of ['trash-retention-countdown-warning', 'trash-retention-countdown-urgent']) {
  assert.match(css, new RegExp('\\.' + selector + '\\s*\\{[^}]*color\\s*:'), 'warning suffix has independent CSS text color');
}
assert.match(css, /\.trash-expiry\s*\{[^}]*color:/, 'existing detailed deadline prefix style remains');
assert.match(css, /\.trash-expiry strong > \.trash-retention-countdown-urgent/, 'detailed countdown CSS must beat summary-row span specificity');
assert.match(css, /\.trash-expiry strong > \.trash-retention-countdown-warning/, 'detailed warning must beat summary-row span specificity');
assert.match(css, /\.trash-expiry strong > \.trash-retention-countdown,[\s\S]*?text-transform:none/, 'do not upper-case the displayed countdown');
assert.match(css, /\.trash-expiry strong > \.trash-retention-countdown,[\s\S]*?font-size:inherit/, 'do not shrink the displayed countdown');


const staleRecord = recordWithExpiry(new Date(NOW + 7 * DAY).toISOString());
const newRecord = recordWithExpiry(new Date(NOW + 3 * DAY).toISOString(), 'other');
for (const compact of [false, true]) {
  const { renderer, trashList } = renderRecord(staleRecord, compact);
  renderer.updateContext({ trashRecords: [newRecord], selectedProfileId: 'profile-B' });
  renderer.renderTrash();
  assert.equal(trashList.children.length, 1, 'refresh replaces rather than recycles stale rows');
  assert.equal(trashList.firstElementChild.dataset.inventoryId, 'other');
  assert.ok(trashList.querySelector('.trash-retention-countdown-urgent'));
  assert.equal(trashList.querySelector('.trash-retention-countdown-warning'), null);
}
console.log('KAR-165 trash retention text, thresholds and DOM isolation: PASS');
