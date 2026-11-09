(() => {
  if (globalThis.__KR_TEMPLATE_VERIFICATION_V12317__) return;
  globalThis.__KR_TEMPLATE_VERIFICATION_V12317__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRTemplateVerification.js');

  function create(options = {}) {
    const {
      checkedRadio
    } = options;

  function verifyTemplate(template, extended = false, root = document) {
    const issues = [];
    const queryRoot = root?.querySelector ? root : document;
    const queryAllRoot = root?.querySelectorAll ? root : document;
    const expectValue = (selector, expected, label) => {
      if (expected === null || expected === undefined || expected === '') return;
      const element = queryRoot.querySelector(selector);
      if (!element || String(element.value) !== String(expected)) issues.push(`${label} stimmt nicht mit der Vorlage überein.`);
    };
    expectValue('input[name="title"]', template.title, 'Titel');
    expectValue('textarea[name="description"]', template.description, 'Beschreibung');
    expectValue('input[name="categoryId"]', template.categoryId, 'Kategorie');
    expectValue('input[name="priceAmount"]', template.price?.value, 'Preis');
    expectValue('input[name="priceType"]', template.price?.type, 'Preistyp');
    if (template.adType?.value && !checkedRadio('adType', template.adType.value)?.checked) issues.push('Gebot/Gesuch stimmt nicht mit der Vorlage überein.');
    for (const attribute of template.dynamicAttributes || []) {
      // The capture extractor records empty optional fields too; absence of a
      // saved selection must not become a false blocking mismatch.
      if (!attribute?.key || attribute.technicalValue === null ||
          attribute.technicalValue === undefined || attribute.technicalValue === '') continue;
      const desired = attribute.technicalValue;
      const target = 'attributeMap[' + attribute.key + ']';
      const all = [...queryAllRoot.querySelectorAll('input[name^="attributeMap["]')]
        .filter(input => input.type === 'hidden' || input.type === 'checkbox');
      let matching = all.filter(input => input.name === target);
      if (!matching.length && String(queryRoot.querySelector('input[name="categoryId"]')?.value) === '405') {
        const aliases = {
          'wearables.gehausegrosse': 'wearables.case_size',
          'wearables.ringgrosse': 'wearables.ring_size'
        };
        const renamed = aliases[attribute.key];
        if (renamed) matching = all.filter(input => input.name === 'attributeMap[' + renamed + ']');
      }
      let matches = false;
      if (matching.length === 1 && matching[0].type === 'checkbox') {
        const normalized = typeof desired === 'string' ? desired.trim().toLowerCase() : desired;
        const wantedChecked = normalized === true || normalized === 'true' || normalized === 1 || normalized === '1'
          ? true : normalized === false || normalized === 'false' || normalized === 0 || normalized === '0'
            ? false : null;
        matches = wantedChecked !== null && matching[0].checked === wantedChecked;
      } else if (matching.length === 1 && matching[0].type === 'hidden') {
        matches = String(matching[0].value) === String(desired);
      }
      if (!matches) issues.push(`Merkmal „${attribute.label || attribute.key}“ stimmt nicht mit der Vorlage überein.`);
    }
    if (template.shipping?.value) {
      const shippingRadio = [...queryAllRoot.querySelectorAll('input[type="radio"][name^="attributeMap["]')]
        .find(input => /versand|shipping|delivery/i.test(input.name) && String(input.value) === String(template.shipping.value));
      if (!shippingRadio?.checked) issues.push('Versandart stimmt nicht mit der Vorlage überein.');
    }
    if (extended) {
      if (template.buyNow && template.buyNow.value !== null && template.buyNow.value !== undefined) {
        const desiredBuyNow = String(template.buyNow.value);
        const buyNowRadio = checkedRadio('buyNow', desiredBuyNow);
        if (buyNowRadio && !buyNowRadio.checked) issues.push('„Direkt kaufen“ stimmt nicht mit der Vorlage überein.');
        if (!buyNowRadio && desiredBuyNow !== 'false') issues.push('„Direkt kaufen“ konnte nicht verifiziert werden.');
      }
      expectValue('input[name="zipCode"]', template.locationData?.zipCode, 'Postleitzahl');
      expectValue('input[name="locationId"]', template.locationData?.locationId, 'Standort');
      const address = queryRoot.querySelector('input[name="addressVisibility"]');
      if (typeof template.locationData?.addressVisibility === 'boolean' && (!address || address.checked !== template.locationData.addressVisibility)) {
        issues.push('Adresssichtbarkeit stimmt nicht mit der Vorlage überein.');
      }
      if (template.locationData?.street) {
        const street = queryRoot.querySelector('input[name="streetName"]');
        if (!street || (!street.disabled && String(street.value) !== String(template.locationData.street))) issues.push('Straße stimmt nicht mit der Vorlage überein.');
      }
    }
    const expectedImages = template.images?.length || 0;
    if (expectedImages) {
      const actualImages = queryAllRoot.querySelectorAll('input[type="hidden"][name^="adImages["][name$=".url"]').length;
      if (actualImages < expectedImages) issues.push(`Bilder unvollständig: ${actualImages}/${expectedImages} im neuen Formular.`);
    }
    return [...new Set(issues)];
  }


  function verify(template, root = document) {
    return verifyTemplate(template, false, root);
  }

  function verifyArchiveTemplate(template, root = document) {
    return verifyTemplate(template, true, root);
  }

    return Object.freeze({
      verify,
      verifyArchiveTemplate
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRTemplateVerification', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
