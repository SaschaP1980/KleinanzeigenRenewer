(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const getInventoryImage = options.getInventoryImage || (async () => null);
      const createImageBitmap = options.createImageBitmapFn || globalThis.createImageBitmap;
      const OffscreenCanvas = options.OffscreenCanvasCtor || globalThis.OffscreenCanvas;

function normalizedComparableText(value) {
  return String(value ?? '').replace(/\r\n?/g, '\n').split('\n').map(line => line.trimEnd()).join('\n').trim();
}

function normalizedScalar(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function dynamicAttributeMap(record) {
  const map = new Map();
  for (const item of record?.dynamicAttributes || []) {
    const key = normalizedScalar(item?.key || item?.label).toLocaleLowerCase('de-DE');
    if (!key) continue;
    map.set(key, normalizedScalar(item?.technicalValue || item?.displayValue));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'de-DE'));
}

async function imageVisualVector(imageKey) {
  if (!imageKey || typeof createImageBitmap !== 'function' || typeof OffscreenCanvas !== 'function') return null;
  const stored = await getInventoryImage(imageKey);
  if (!stored?.blob) return null;
  const bitmap = await createImageBitmap(stored.blob);
  try {
    const width = 16;
    const height = 16;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    const data = context.getImageData(0, 0, width, height).data;
    const vector = [];
    for (let index = 0; index < data.length; index += 4) {
      vector.push(Math.round((data[index] * 0.299) + (data[index + 1] * 0.587) + (data[index + 2] * 0.114)));
    }
    return vector;
  } finally {
    bitmap.close();
  }
}

function meanAbsoluteVectorDifference(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length) return null;
  let total = 0;
  for (let index = 0; index < a.length; index += 1) total += Math.abs(Number(a[index]) - Number(b[index]));
  return total / a.length;
}

function inventoryImageSetExplicitlyEmpty(record) {
  return Array.isArray(record?.images)
    && record.images.length === 0
    && record?.extraction?.imageSetExplicitlyEmpty === true;
}

async function compareRenewalImages(source, candidate) {
  const expected = source?.images || [];
  const actual = candidate?.images || [];
  const sourceExplicitEmpty = inventoryImageSetExplicitlyEmpty(source);
  const candidateExplicitEmpty = inventoryImageSetExplicitlyEmpty(candidate);
  if (!expected.length && !actual.length) {
    if (sourceExplicitEmpty && candidateExplicitEmpty) return { status: 'match', reason: '', details: [] };
    return { status: 'uncertain', reason: 'Leerer Bildbestand ist nicht auf beiden Seiten eindeutig bestätigt.', details: [] };
  }
  if (!expected.length || !actual.length) {
    if ((!expected.length && sourceExplicitEmpty) || (!actual.length && candidateExplicitEmpty)) {
      return { status: 'mismatch', reason: `Bildanzahl ${expected.length} ≠ ${actual.length}.`, details: [] };
    }
    return { status: 'uncertain', reason: 'Keine vollständige Bildliste verfügbar.', details: [] };
  }
  if (expected.length !== actual.length) return { status: 'mismatch', reason: `Bildanzahl ${expected.length} ≠ ${actual.length}.`, details: [] };
  const details = [];
  for (let index = 0; index < expected.length; index += 1) {
    const left = expected[index];
    const right = actual[index];
    if (left?.sha256 && right?.sha256 && left.sha256 === right.sha256) {
      details.push({ index, method: 'sha256', match: true, difference: 0 });
      continue;
    }
    try {
      const [leftVector, rightVector] = await Promise.all([imageVisualVector(left?.imageKey), imageVisualVector(right?.imageKey)]);
      const difference = meanAbsoluteVectorDifference(leftVector, rightVector);
      if (difference === null) return { status: 'uncertain', reason: `Bild ${index + 1} konnte nicht visuell verglichen werden.`, details };
      const match = difference <= 10;
      details.push({ index, method: 'visual-16x16-gray', match, difference: Math.round(difference * 100) / 100 });
      if (!match) return { status: 'mismatch', reason: `Bild ${index + 1} weicht visuell ab.`, details };
    } catch (error) {
      return { status: 'uncertain', reason: `Bild ${index + 1} konnte nicht visuell verglichen werden: ${String(error.message || error).slice(0, 180)}`, details };
    }
  }
  return { status: 'match', reason: '', details };
}

async function compareRenewalRecords(source, candidate, { onlineConfirmed = false, ownAdsPresence = onlineConfirmed ? true : null, requirePublicAvailability = true } = {}) {
  const mismatches = [];
  const uncertainties = [];
  const matches = [];
  const check = (field, expected, actual, { required = true } = {}) => {
    const expMissing = expected === null || expected === undefined || expected === '';
    const actMissing = actual === null || actual === undefined || actual === '';
    if (required && (expMissing || actMissing)) {
      uncertainties.push({ field, expected: expMissing ? null : expected, actual: actMissing ? null : actual, reason: 'Wert nicht vollständig verfügbar.' });
      return;
    }
    if (!required && expMissing) return;
    if (JSON.stringify(expected) === JSON.stringify(actual)) matches.push(field);
    else mismatches.push({ field, expected, actual });
  };

  check('title', normalizedScalar(source?.title), normalizedScalar(candidate?.title));
  check('description', normalizedComparableText(source?.description), normalizedComparableText(candidate?.description));
  check('adType', normalizedScalar(source?.adType?.value), normalizedScalar(candidate?.adType?.value), { required: Boolean(source?.adType?.value) });
  check('categoryId', String(source?.category?.id ?? source?.categoryIdFromUrl ?? ''), String(candidate?.category?.id ?? candidate?.categoryIdFromUrl ?? ''));
  check('categoryPath', (source?.category?.path || source?.categoryPath || []).map(normalizedScalar), (candidate?.category?.path || candidate?.categoryPath || []).map(normalizedScalar));
  check('price.value', normalizedScalar(source?.price?.value), normalizedScalar(candidate?.price?.value), { required: Boolean(source?.price?.value) });
  check('price.type', normalizedScalar(source?.price?.type), normalizedScalar(candidate?.price?.type), { required: Boolean(source?.price?.type) });
  check('dynamicAttributes', dynamicAttributeMap(source), dynamicAttributeMap(candidate));
  check('shipping.value', normalizedScalar(source?.shipping?.value), normalizedScalar(candidate?.shipping?.value), { required: Boolean(source?.shipping?.value) });
  check('location.zipCode', normalizedScalar(source?.locationData?.zipCode), normalizedScalar(candidate?.locationData?.zipCode), { required: Boolean(source?.locationData?.zipCode) });
  check('location.city', normalizedScalar(source?.locationData?.city), normalizedScalar(candidate?.locationData?.city), { required: Boolean(source?.locationData?.city) });

  const imageComparison = await compareRenewalImages(source, candidate);
  if (imageComparison.status === 'match') matches.push('images.content-order');
  else if (imageComparison.status === 'mismatch') mismatches.push({ field: 'images', expected: source?.images?.length || 0, actual: candidate?.images?.length || 0, reason: imageComparison.reason });
  else uncertainties.push({ field: 'images', expected: source?.images?.length || 0, actual: candidate?.images?.length || 0, reason: imageComparison.reason });

  if (requirePublicAvailability && !onlineConfirmed) {
    uncertainties.push({ field: 'online', expected: true, actual: false, reason: 'Öffentliche neue Anzeige konnte nicht eindeutig bestätigt werden.' });
    if (ownAdsPresence !== true) {
      uncertainties.push({
        field: 'ownAdsPresence',
        expected: true,
        actual: ownAdsPresence === false ? false : null,
        reason: ownAdsPresence === false
          ? 'Neue Anzeige wurde auch in „Meine Anzeigen“ nicht gefunden.'
          : 'Existenz der neuen Anzeige in „Meine Anzeigen“ konnte nicht eindeutig bestätigt werden.'
      });
    }
  }
  const status = mismatches.length ? 'mismatch' : uncertainties.length ? 'uncertain' : 'match';
  return {
    status,
    checkedAt: new Date().toISOString(),
    sourceAdId: String(source?.adId || ''),
    newAdId: String(candidate?.adId || ''),
    onlineConfirmed: Boolean(onlineConfirmed),
    publicAvailabilityRequired: Boolean(requirePublicAvailability),
    imageComparison,
    matches,
    mismatches,
    uncertainties
  };
}

function normalizedComparableBoolean(value) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  const text = normalizedScalar(value).toLocaleLowerCase('de-DE');
  if (['true', '1', 'yes', 'ja', 'on'].includes(text)) return true;
  if (['false', '0', 'no', 'nein', 'off'].includes(text)) return false;
  return text;
}

function renewalComparisonHasOnlyVisibilityUncertainty(comparison) {
  if (!comparison || comparison.status !== 'uncertain' || comparison.onlineConfirmed !== false) return false;
  const mismatches = Array.isArray(comparison.mismatches) ? comparison.mismatches : [];
  const uncertainties = Array.isArray(comparison.uncertainties) ? comparison.uncertainties : [];
  if (mismatches.length || !uncertainties.length) return false;
  const visibilityFields = new Set(['online', 'ownAdsPresence']);
  return uncertainties.every(item => visibilityFields.has(String(item?.field || '')));
}

function renewalComparisonWaitsOnlyForOnline(comparison) {
  if (!renewalComparisonHasOnlyVisibilityUncertainty(comparison)) return false;
  const uncertainties = Array.isArray(comparison.uncertainties) ? comparison.uncertainties : [];
  return uncertainties.length === 1
    && String(uncertainties[0]?.field || '') === 'online'
    && uncertainties[0]?.actual === false;
}

function renewalOutcomeForComparison(comparison) {
  if (comparison?.status === 'match') return { status: 'verified', stage: 'replacement-ready' };
  if (renewalComparisonWaitsOnlyForOnline(comparison)) return { status: 'waiting-for-online', stage: 'waiting-for-online' };
  return { status: 'verification-failed', stage: 'verification-failed' };
}

function markStoredComparisonOnline(comparison) {
  if (!renewalComparisonWaitsOnlyForOnline(comparison)) return null;
  const matches = Array.isArray(comparison.matches) ? [...comparison.matches] : [];
  if (!matches.includes('online')) matches.push('online');
  return {
    ...comparison,
    status: 'match',
    checkedAt: new Date().toISOString(),
    onlineConfirmed: true,
    matches,
    uncertainties: []
  };
}

      return Object.freeze({
        normalizedComparableText,
        normalizedScalar,
        dynamicAttributeMap,
        imageVisualVector,
        meanAbsoluteVectorDifference,
        inventoryImageSetExplicitlyEmpty,
        compareRenewalImages,
        compareRenewalRecords,
        normalizedComparableBoolean,
        renewalComparisonHasOnlyVisibilityUncertainty,
        renewalComparisonWaitsOnlyForOnline,
        renewalOutcomeForComparison,
        markStoredComparisonOnline
      });
    }
  });
  globalThis.KRDeps?.register?.('KRRenewalVerificationService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
