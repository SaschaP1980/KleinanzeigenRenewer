(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const document = options.document || globalThis.document;
      const Element = options.Element || globalThis.Element;
      const formatting = options.formatting || {};
      const compactCategoryLabel = formatting.compactCategoryLabel || (() => '');
      const displayPriceWithType = formatting.displayPriceWithType || (() => '');
      const endDateWithRelativeLabel = formatting.endDateWithRelativeLabel || (() => '');
      const trashRetentionPresentation = formatting.trashRetentionPresentation || (() => '');
      const renewalStatusLabel = formatting.renewalStatusLabel || (() => '');
      const publicAvailabilityPending = formatting.publicAvailabilityPending || (() => false);
      const loadLocalPreview = options.loadLocalPreview || (async () => {});
      const openInventoryReadOnly = options.openInventoryReadOnly || (async () => null);

function cardTargetIsInteractive(target) {
  return target instanceof Element && Boolean(target.closest('button, a, summary, details, input, select, textarea, [role="button"], [contenteditable="true"]'));
}

function makeInfoLine(label, value) {
  const row = document.createElement('div');
  row.className = 'summary-row';
  const key = document.createElement('span');
  key.textContent = label;
  const val = document.createElement('strong');
  val.textContent = value;
  row.append(key, val);
  return row;
}

function buildFullImageStrip(record) {
  const strip = document.createElement('div');
  strip.className = 'image-strip';
  for (const image of record.images || []) {
    const img = document.createElement('img');
    img.alt = 'Gespeichertes Anzeigenbild';
    const figure = document.createElement('figure');
    const link = document.createElement('a');
    link.className = 'stored-image-link';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = 'Gespeichertes Bild in neuem Tab öffnen';
    link.setAttribute('aria-label', `Bild ${Number(image.position || 0) + 1} in neuem Tab öffnen`);
    const caption = document.createElement('figcaption');
    const label = document.createElement('strong');
    const mime = image.mimeType || 'unbekannt';
    label.textContent = `Bild ${image.position + 1}${image.isPrimary ? ' · Titelbild' : ''} · ${mime.replace('image/', '').toUpperCase()}`;
    const info = document.createElement('span');
    info.textContent = `${mime} · ${image.size ? Math.round(image.size / 1024) + ' KiB' : 'Größe unbekannt'}${image.width && image.height ? ` · ${image.width}×${image.height}` : ''}`;
    const evidence = document.createElement('span');
    evidence.textContent = image.formatEvidence?.startsWith('file-signature') ? 'Gespeichert · Format geprüft' : 'Gespeichert · Serverangabe';
    caption.append(label, info, evidence);
    link.append(img);
    figure.append(link, caption);
    strip.append(figure);
    void loadLocalPreview(img, record, image).then(() => {
      const previewUrl = String(img.src || '');
      if (img.dataset.previewKey && previewUrl.startsWith('blob:')) link.href = previewUrl;
      else link.removeAttribute('href');
    });
  }
  return strip;
}

function createCompactListRow(record, { trash = false } = {}) {
  const hasReadableAdId = /^\d+$/.test(String(record?.adId || ''));
  const row = document.createElement('article');
  row.className = `inventory-card compact-list-row${trash ? ' trash-card' : ''}${hasReadableAdId && !trash ? ' inventory-card-clickable' : ''}`;
  row.dataset.inventoryId = String(record?.inventoryId || '');
  row.dataset.adId = String(record?.adId || '');
  if (hasReadableAdId && !trash) {
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${record.title || `Anzeige ${record.adId || ''}`} zum Ansehen öffnen`);
    row.addEventListener('click', event => {
      if (cardTargetIsInteractive(event.target)) return;
      void openInventoryReadOnly(record).catch(() => {});
    });
    row.addEventListener('keydown', event => {
      if (event.target !== row || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      void openInventoryReadOnly(record).catch(() => {});
    });
  }

  const cover = document.createElement('img');
  cover.className = 'compact-list-cover';
  cover.alt = trash ? 'Gesichertes Anzeigenbild aus dem Papierkorb' : 'Titelbild';
  const primaryImage = (record.images || []).find(image => image.isPrimary) || record.images?.[0];
  if (primaryImage) void loadLocalPreview(cover, record, primaryImage);

  const main = document.createElement('div');
  main.className = 'compact-list-main';

  const categoryLine = document.createElement('div');
  categoryLine.className = 'compact-list-category-line';
  categoryLine.textContent = compactCategoryLabel(record);

  const title = document.createElement('h3');
  title.className = 'compact-list-title-line';
  const titleText = document.createElement('span');
  titleText.className = 'compact-list-title-text';
  titleText.textContent = record.title || `Anzeige ${record.adId || record.inventoryId || 'ohne ID'}`;
  title.append(titleText);
  if (!trash && record?.renewal?.renewalId) {
    const badge = document.createElement('span');
    badge.className = `renewal-badge renewal-${String(record.renewal.status || 'draft')}`;
    badge.textContent = renewalStatusLabel(record);
    title.append(badge);
  }
  if (!trash && publicAvailabilityPending(record)) {
    const badge = document.createElement('span');
    badge.className = 'inventory-online-badge';
    badge.textContent = 'Bald Online';
    badge.title = 'Die Anzeige ist inhaltlich verifiziert, aber die öffentliche Detailseite ist noch nicht erreichbar.';
    title.append(badge);
  }

  const meta = document.createElement('div');
  meta.className = 'compact-list-meta';
  const price = document.createElement('span');
  price.className = 'compact-list-meta-price';
  price.textContent = displayPriceWithType(record);
  const end = document.createElement('span');
  end.className = 'compact-list-meta-end';
  end.textContent = trash ? trashRetentionPresentation(record) : `Endet am ${endDateWithRelativeLabel(record)}`;
  meta.append(price, end);

  main.append(categoryLine, title, meta);

  const actions = document.createElement('div');
  actions.className = 'compact-list-actions';
  actions.setAttribute('aria-label', 'Hauptaktionen');

  row.append(cover, main, actions);
  return { row, actions };
}

function setCompactButtonsBusy(buttons, busy = true) {
  for (const button of buttons.filter(Boolean)) {
    button.disabled = Boolean(busy) || Boolean(button.dataset.originalDisabled === 'true');
    button.classList.toggle('is-busy', Boolean(busy));
  }
}

function rememberCompactButtonDisabled(button) {
  if (button) button.dataset.originalDisabled = button.disabled ? 'true' : 'false';
  return button;
}

      return Object.freeze({ cardTargetIsInteractive, makeInfoLine, buildFullImageStrip, createCompactListRow, setCompactButtonsBusy, rememberCompactButtonDisabled });
    }
  });
  globalThis.KRDeps?.register?.('KRRecordCardView', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
