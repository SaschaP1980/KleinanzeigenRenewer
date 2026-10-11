(() => {
  if (globalThis.__KR_TEMPLATE_FORM_FIELDS_V12317__) return;
  globalThis.__KR_TEMPLATE_FORM_FIELDS_V12317__ = true;
  const KRDeps = globalThis.KRDeps;
  if (!KRDeps) throw new Error('runtime-deps.js must load before KRTemplateFormFields.js');

  function create(options = {}) {
    const {
      Form,
      SEARCH_KEY_DELAY_MS,
      SEARCH_SETTLE_MS,
      LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
      LOCAL_ATTRIBUTE_RETRY_DELAY_MS,
      clean,
      sleep,
      actionText,
      diagnostic,
      visible,
      visibleText,
      waitFor
    } = options;

  function nativeValueSetterRaw(element, value) {
    const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
    if (!descriptor?.set) throw new Error('Native Werteingabe nicht verfügbar.');
    descriptor.set.call(element, String(value ?? ''));
  }

  function nativeValueSetter(element, value) {
    nativeValueSetterRaw(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function dispatchInputEvent(element, type, { data = null, inputType = 'insertText', cancelable = false } = {}) {
    try {
      return element.dispatchEvent(new InputEvent(type, {
        bubbles: true,
        cancelable,
        composed: true,
        data,
        inputType
      }));
    } catch {
      return element.dispatchEvent(new Event(type, { bubbles: true, cancelable }));
    }
  }

  function dispatchKeyboardEvent(element, type, key) {
    try {
      element.dispatchEvent(new KeyboardEvent(type, {
        bubbles: true,
        cancelable: true,
        composed: true,
        key
      }));
    } catch {
      element.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    }
  }

  async function typeSearchableValue(control, value) {
    const wanted = String(value ?? '');
    control.focus();
    control.click();
    try { control.setSelectionRange(0, String(control.value || '').length); } catch {}

    if (String(control.value || '')) {
      dispatchKeyboardEvent(control, 'keydown', 'Backspace');
      const allowed = dispatchInputEvent(control, 'beforeinput', { inputType: 'deleteContentBackward', cancelable: true });
      if (allowed) {
        nativeValueSetterRaw(control, '');
        dispatchInputEvent(control, 'input', { inputType: 'deleteContentBackward' });
      }
      dispatchKeyboardEvent(control, 'keyup', 'Backspace');
      await sleep(SEARCH_KEY_DELAY_MS);
    }

    let prefix = '';
    for (const char of wanted) {
      dispatchKeyboardEvent(control, 'keydown', char);
      const allowed = dispatchInputEvent(control, 'beforeinput', { data: char, inputType: 'insertText', cancelable: true });
      if (allowed) {
        prefix += char;
        nativeValueSetterRaw(control, prefix);
        dispatchInputEvent(control, 'input', { data: char, inputType: 'insertText' });
      }
      dispatchKeyboardEvent(control, 'keyup', char);
      await sleep(SEARCH_KEY_DELAY_MS);
    }

    // If a controlled field rewrote the value during incremental input, give it
    // one final native input event without firing change/blur, so the popup can
    // still react to the focused query.
    if (String(control.value || '') !== wanted) {
      nativeValueSetterRaw(control, wanted);
      dispatchInputEvent(control, 'input', { data: wanted, inputType: 'insertReplacementText' });
    }
    await sleep(SEARCH_SETTLE_MS);
  }

  function setTextField(element, value) {
    if (!element) throw new Error('Eingabefeld fehlt.');
    element.focus();
    nativeValueSetter(element, value);
    element.blur();
  }

  function checkedRadio(name, value) {
    return [...document.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)]
      .find(input => String(input.value) === String(value));
  }

  function chooseRadio(name, value) {
    const radio = checkedRadio(name, value);
    if (!radio) return false;
    if (!radio.checked) radio.click();
    return radio.checked;
  }

  function findExactInteractive(label, root = document, exclude = null) {
    const wanted = clean(label).toLocaleLowerCase('de-DE');
    if (!wanted) return null;
    const selectors = '[role="option"],[role="menuitem"],[role="radio"],button,a,label,li,[tabindex]:not([tabindex="-1"])';
    const candidates = [...root.querySelectorAll(selectors)].filter(element => {
      if (element === exclude || !visible(element)) return false;
      const text = visibleText(element);
      if (!text || actionText.test(text)) return false;
      return text.toLocaleLowerCase('de-DE') === wanted;
    });
    candidates.sort((a, b) => {
      const aDialog = a.closest('[role="dialog"],[role="listbox"],[aria-modal="true"]') ? 1 : 0;
      const bDialog = b.closest('[role="dialog"],[role="listbox"],[aria-modal="true"]') ? 1 : 0;
      const aInteractive = a.matches('button,a,[role="option"],[role="menuitem"],[role="radio"]') ? 1 : 0;
      const bInteractive = b.matches('button,a,[role="option"],[role="menuitem"],[role="radio"]') ? 1 : 0;
      return (bDialog + bInteractive) - (aDialog + aInteractive);
    });
    return candidates[0] || null;
  }

  function associatedChoiceRoots(control) {
    const roots = [];
    for (const attr of ['aria-controls', 'aria-owns']) {
      for (const id of String(control?.getAttribute?.(attr) || '').split(/\s+/).filter(Boolean)) {
        const root = document.getElementById(id);
        if (root && visible(root) && !roots.includes(root)) roots.push(root);
      }
    }
    for (const root of document.querySelectorAll('[role="listbox"],[role="menu"]')) {
      if (visible(root) && !roots.includes(root)) roots.push(root);
    }
    roots.push(document);
    return roots;
  }

  function findExactNearbyChoice(control, displayValue) {
    if (!control?.getBoundingClientRect) return null;
    const wanted = clean(displayValue).toLocaleLowerCase('de-DE');
    const origin = control.getBoundingClientRect();
    if (!wanted || origin.width <= 0 || origin.height <= 0) return null;

    const candidates = [...document.querySelectorAll('[role="option"],[role="menuitem"],button,a,li,label,div,span')].filter(element => {
      if (element === control || !visible(element)) return false;
      if (visibleText(element).toLocaleLowerCase('de-DE') !== wanted) return false;
      const rect = element.getBoundingClientRect();
      const verticalDistance = rect.top - origin.bottom;
      const horizontalOverlap = Math.min(rect.right, origin.right) - Math.max(rect.left, origin.left);
      return verticalDistance >= -4 && verticalDistance <= 500 && horizontalOverlap > 0;
    });
    candidates.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return Math.abs(ar.top - origin.bottom) - Math.abs(br.top - origin.bottom) || (ar.width * ar.height) - (br.width * br.height);
    });
    const exact = candidates[0] || null;
    if (!exact) return null;
    return exact.closest('[role="option"],[role="menuitem"],button,a,li,label,[tabindex]:not([tabindex="-1"])') || exact;
  }

  function findExactSelectionOption(control, displayValue) {
    for (const root of associatedChoiceRoots(control)) {
      const exact = findExactInteractive(displayValue, root, control);
      if (exact) return exact;

      // Some autocomplete implementations put the actual text in a nested
      // element while the clickable row itself has no useful role. Only use
      // this fallback inside a listbox/menu-like root and still require exact
      // visible text before climbing to the closest clickable row.
      if (root !== document) {
        const wanted = clean(displayValue).toLocaleLowerCase('de-DE');
        const nested = [...root.querySelectorAll('*')].find(element => {
          if (!visible(element)) return false;
          return visibleText(element).toLocaleLowerCase('de-DE') === wanted;
        });
        const clickable = nested?.closest('[role="option"],[role="menuitem"],button,a,li,label,[tabindex]:not([tabindex="-1"])');
        if (clickable && clickable !== control && visible(clickable)) return clickable;
      }
    }

    // Kleinanzeigen's searchable brand control may render the filtered rows
    // without a stable aria-controls relation. As a strict fallback, only
    // accept an exact visible value in the popup region immediately below the
    // active input. This still avoids guessing between similarly named brands.
    if (control instanceof HTMLInputElement) return findExactNearbyChoice(control, displayValue);
    return null;
  }

  function findSelectionConfirmButton(control, option) {
    const roots = [];
    const localDialog = option?.closest?.('[role="dialog"],dialog,[aria-modal="true"]')
      || control?.closest?.('[role="dialog"],dialog,[aria-modal="true"]');
    if (localDialog && visible(localDialog)) roots.push(localDialog);
    for (const dialog of document.querySelectorAll('[role="dialog"],dialog,[aria-modal="true"]')) {
      if (visible(dialog) && !roots.includes(dialog)) roots.push(dialog);
    }

    for (const root of roots) {
      const button = [...root.querySelectorAll('button,input[type="button"],input[type="submit"]')].find(element => {
        if (!visible(element) || element.disabled) return false;
        const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
        return /^bestätigen$/i.test(text);
      });
      if (button) return button;
    }

    // Fallback for the current Kleinanzeigen modal if it lacks an explicit
    // dialog role. Restrict this to non-text controls so autocomplete fields
    // can never accidentally trigger an unrelated confirmation button.
    if (!(control instanceof HTMLInputElement)) {
      const visibleButtons = [...document.querySelectorAll('button,input[type="button"]')].filter(element => {
        if (!visible(element) || element.disabled) return false;
        const text = element instanceof HTMLInputElement ? clean(element.value) : visibleText(element);
        return /^bestätigen$/i.test(text);
      });
      if (visibleButtons.length === 1) return visibleButtons[0];
    }
    return null;
  }

  async function chooseExactOption(control, displayValue, technicalInput, technicalValue) {
    if (technicalInput && String(technicalInput.value) === String(technicalValue)) return;
    if (!control) throw new Error(`Auswahlfeld für „${displayValue}“ nicht gefunden.`);

    const searchableInput = control instanceof HTMLInputElement && control.type !== 'hidden';
    let option = findExactSelectionOption(control, displayValue);
    if (!option) {
      if (searchableInput) {
        // Kleinanzeigen' brand combobox is controlled and may only open/filter its
        // list after user-like incremental input. A single full-string value set
        // was insufficient in the real form.
        await typeSearchableValue(control, displayValue);
      } else {
        control.focus?.();
        control.click();
      }

      option = await waitFor(() => findExactSelectionOption(control, displayValue), {
        timeout: searchableInput ? 3500 : 8000,
        interval: 80,
        description: `Auswahl „${displayValue}“`
      }).catch(() => null);
    }

    if (!option && searchableInput) {
      // Some comboboxes expose their list only after an explicit keyboard-open
      // gesture. Keep the exact-value requirement; ArrowDown merely requests
      // the popup and never chooses a suggestion by position.
      dispatchKeyboardEvent(control, 'keydown', 'ArrowDown');
      dispatchKeyboardEvent(control, 'keyup', 'ArrowDown');
      option = await waitFor(() => findExactSelectionOption(control, displayValue), {
        timeout: 5000,
        interval: 80,
        description: `Auswahl „${displayValue}“`
      }).catch(() => null);
    }

    if (!option) throw new Error(`Auswahl „${displayValue}“ wurde nicht eindeutig angeboten.`);
    option.click();

    // Modal-based selectors such as "Zustand" commit the chosen radio value
    // only after the explicit "Bestätigen" action. If such a confirmation is
    // present, use it before technical-value verification.
    await sleep(100);
    const confirmButton = findSelectionConfirmButton(control, option);
    if (confirmButton) {
      confirmButton.click();
      await waitFor(() => !confirmButton.isConnected || !visible(confirmButton), {
        timeout: 4000,
        interval: 80,
        description: 'Bestätigung der Auswahl'
      }).catch(() => {});
    }

    if (technicalInput) {
      await waitFor(() => String(technicalInput.value) === String(technicalValue), {
        timeout: 8000,
        description: `Technischer Wert „${technicalValue}“`
      });
    }
    if (searchableInput) control.blur();
  }

  function findAttributeControl(hidden, attribute) {
    if (attribute.controlId) {
      const direct = document.getElementById(attribute.controlId);
      if (direct && visible(direct)) return direct;
    }
    const byKey = document.getElementById(attribute.key);
    if (byKey && visible(byKey)) return byKey;

    let current = hidden?.parentElement || null;
    for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      const candidates = [...current.querySelectorAll('button[role="combobox"],button,input:not([type="hidden"]):not([type="radio"]):not([type="checkbox"]),[role="combobox"]')]
        .filter(candidate => visible(candidate) && !actionText.test(visibleText(candidate)));
      if (candidates.length === 1) return candidates[0];
      const labelMatch = candidates.find(candidate => {
        const labelled = (candidate.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
          .map(id => document.getElementById(id)?.textContent || '').join(' ');
        return clean(labelled).toLocaleLowerCase('de-DE').includes(clean(attribute.label).toLocaleLowerCase('de-DE'));
      });
      if (labelMatch) return labelMatch;
    }

    const label = clean(attribute.label).toLocaleLowerCase('de-DE');
    return [...document.querySelectorAll('button[role="combobox"],button,input:not([type="hidden"]),[role="combobox"]')]
      .filter(visible)
      .find(candidate => {
        const text = clean((candidate.getAttribute('aria-label') || '') + ' ' + (candidate.getAttribute('aria-labelledby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' '));
        return text.toLocaleLowerCase('de-DE').includes(label);
      }) || null;
  }

  function createPageConfig() {
    const island = document.querySelector('astro-island[component-url*="PostListingForm"]');
    const props = Form?.decodeAstroProps(island?.getAttribute('props'));
    const page = props?.postListingPage;
    if (!page || page.editMode !== false) return null;
    return {
      page,
      availableShippingOptions: page.availableShippingOptions || null,
      photoConfig: page.photoConfig || null
    };
  }

  function inferShippingPackageSize(availableShippingOptions, savedMethods) {
    const ids = new Set((savedMethods || []).map(method => String(method?.id || '')).filter(Boolean));
    if (!ids.size) return null;
    const options = Array.isArray(availableShippingOptions?.options) ? availableShippingOptions.options : [];
    const matched = options.filter(option => ids.has(String(option?.id || '')));
    if (matched.length !== ids.size) return null;
    const sizes = [...new Set(matched.map(option => option?.packageSize).filter(Boolean))];
    if (sizes.length !== 1) return null;
    const packageSize = sizes[0];
    const group = (Array.isArray(availableShippingOptions?.sizeGroups) ? availableShippingOptions.sizeGroups : [])
      .find(item => item?.packageSize === packageSize || item?.id === packageSize);
    return { packageSize, label: clean(group?.name || packageSize), ids: [...ids] };
  }


  async function fillDynamicAttributeWithRetries(attribute, fillId) {
    const escapedName = `attributeMap[${attribute.key}]`;
    const initialHidden = await waitFor(() => [...document.querySelectorAll('input[type="hidden"][name^="attributeMap["]')]
      .find(input => input.name === escapedName), {
      timeout: 10000,
      description: `Merkmal „${attribute.label || attribute.key}“`
    });
    const technicalValue = String(attribute.technicalValue);
    const displayValue = attribute.displayValue || technicalValue;
    let lastError = null;

    for (let attempt = 1; attempt <= LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS; attempt += 1) {
      const hidden = [...document.querySelectorAll('input[type="hidden"][name^="attributeMap["]')]
        .find(input => input.name === escapedName) || (initialHidden?.isConnected ? initialHidden : null);
      if (!hidden) {
        lastError = new Error(`Technisches Merkmal „${attribute.label || attribute.key}“ ist nicht mehr verfügbar.`);
      } else if (String(hidden.value) === technicalValue) {
        return { attempt, alreadySet: true };
      } else {
        try {
          const control = findAttributeControl(hidden, attribute);
          await chooseExactOption(control, displayValue, hidden, technicalValue);
          if (String(hidden.value) !== technicalValue) throw new Error(`Technischer Wert „${technicalValue}“ wurde nicht bestätigt.`);
          return { attempt, alreadySet: false };
        } catch (error) {
          lastError = error;
        }
      }

      if (attempt < LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS) {
        void diagnostic(fillId, 'TEMPLATE_ATTRIBUTE_LOCAL_RETRY', {
          key: attribute.key,
          label: attribute.label || attribute.key,
          controlType: attribute.controlType || null,
          attempt,
          nextAttempt: attempt + 1,
          maxAttempts: LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
          message: String(lastError?.message || lastError || '').slice(0, 400)
        });
        await sleep(LOCAL_ATTRIBUTE_RETRY_DELAY_MS);
      }
    }

    throw lastError || new Error(`Merkmal „${attribute.label || attribute.key}“ konnte nicht gesetzt werden.`);
  }

  async function fillDynamicAttributes(template, fillId) {
    const issues = [];
    for (const attribute of template.dynamicAttributes || []) {
      if (!attribute?.key || attribute.technicalValue === null || attribute.technicalValue === undefined || attribute.technicalValue === '') continue;
      try {
        const result = await fillDynamicAttributeWithRetries(attribute, fillId);
        void diagnostic(fillId, 'TEMPLATE_ATTRIBUTE_SET', {
          key: attribute.key,
          label: attribute.label || attribute.key,
          controlType: attribute.controlType || null,
          technicalValue: String(attribute.technicalValue),
          attempt: result.attempt,
          maxAttempts: LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
          localRetryRecovered: result.attempt > 1
        });
      } catch (error) {
        void diagnostic(fillId, 'TEMPLATE_ATTRIBUTE_FAILED', {
          key: attribute.key,
          label: attribute.label || attribute.key,
          attempts: LOCAL_ATTRIBUTE_SELECTION_ATTEMPTS,
          message: String(error.message || error).slice(0, 400)
        }, 'warning');
        issues.push(`Merkmal „${attribute.label || attribute.key}“: ${error.message}`);
      }
    }
    return issues;
  }

  async function fillShipping(template) {
    const issues = [];
    const shipping = template.shipping;
    if (!shipping || shipping.value === null || shipping.value === undefined || shipping.value === '') return issues;
    const radios = [...document.querySelectorAll('input[type="radio"][name^="attributeMap["]')]
      .filter(input => /versand|shipping|delivery/i.test(input.name));
    const radio = radios.find(input => String(input.value) === String(shipping.value));
    if (!radio) {
      issues.push(`Versandart „${shipping.displayValue || shipping.value}“ ist nicht verfügbar.`);
      return issues;
    }
    if (!radio.checked) radio.click();

    // v1.1.4: concrete carrier/method IDs and package sizes are deliberately
    // not template-managed. Preserve only the basic "Versand möglich" /
    // "Nur Abholung" choice and never block or warn on HERMES/DHL/size data.
    return issues;
  }

  async function fillPriceType(template) {
    const desired = template.price?.type;
    if (!desired) return [];
    const hidden = document.querySelector('input[type="hidden"][name="priceType"]');
    if (!hidden) return ['Preistyp-Feld fehlt.'];
    if (String(hidden.value) === String(desired)) return [];
    const control = document.getElementById('ad-price-type');
    if (!control) return ['Preistyp-Auswahl fehlt.'];
    try {
      await chooseExactOption(control, template.price?.typeDisplay || desired, hidden, desired);
      return [];
    } catch (error) {
      return [`Preistyp: ${error.message}`];
    }
  }

  async function fillBuyNow(template) {
    if (!template.buyNow || template.buyNow.value === null || template.buyNow.value === undefined) return [];
    const desired = String(template.buyNow.value);
    const radio = checkedRadio('buyNow', desired);
    if (!radio) {
      return desired === 'false' ? [] : ['„Direkt kaufen“ ist für die neue Anzeige nicht verfügbar.'];
    }
    if (!radio.checked) radio.click();
    return radio.checked ? [] : ['„Direkt kaufen“ konnte nicht übernommen werden.'];
  }

  async function fillLocation(template) {
    const issues = [];
    const locationData = template.locationData || {};
    const zip = document.querySelector('input[name="zipCode"]');
    const locationId = document.querySelector('input[name="locationId"]');
    if (zip && locationData.zipCode && String(zip.value) !== String(locationData.zipCode)) {
      try {
        setTextField(zip, locationData.zipCode);
        await waitFor(() => !locationData.locationId || String(locationId?.value) === String(locationData.locationId), {
          timeout: 8000,
          description: 'Standort der Vorlage'
        });
      } catch (error) {
        issues.push(`Standort: ${error.message}`);
      }
    }

    const address = document.querySelector('input[name="addressVisibility"]');
    if (address && typeof locationData.addressVisibility === 'boolean' && address.checked !== locationData.addressVisibility) address.click();
    const street = document.querySelector('input[name="streetName"]');
    if (street && locationData.street && !street.disabled) setTextField(street, locationData.street);
    return issues;
  }

    return Object.freeze({
      setTextField,
      checkedRadio,
      chooseRadio,
      createPageConfig,
      inferShippingPackageSize,
      fillDynamicAttributes,
      fillShipping,
      fillPriceType,
      fillBuyNow,
      fillLocation
    });
  }

  const API = Object.freeze({ create });
  KRDeps.register('KRTemplateFormFields', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
