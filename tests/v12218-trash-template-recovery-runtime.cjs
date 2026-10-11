'use strict';
const assert = require('assert');
const Controller = require('../archive-trash-insertion-ui-controller.js');

(async () => {
  const sourceTitle = { textContent: '' };
  const sourceMeta = { textContent: '' };
  const cover = {
    src: '', alt: '',
    removeAttribute(name) { if (name === 'src') this.src = ''; }
  };
  const calls = [];
  const activities = [];
  const session = {
    fillId: 'fill-1', status: 'complete', stage: 'template-only-complete',
    targetTabId: 77, newAdId: '', trashInventoryId: 'inv-1'
  };
  const record = {
    inventoryId: 'inv-1', adId: '111', profileId: 'profile-1', title: 'Recovery Titel',
    price: { value: '12', type: 'FIXED' },
    images: [{ imageId: 'img-1', isPrimary: true }]
  };
  const api = Controller.create({
    document: { createTextNode: t => ({ textContent: t }), createElement: () => ({ className:'', textContent:'', append(){} }) },
    elements: { trashTemplateSourceTitle: sourceTitle, trashTemplateSourceMeta: sourceMeta, trashTemplateCover: cover },
    displayPriceWithType: () => '12 € · FP / Festpreis',
    loadLocalPreview: async (element, rec, image) => { calls.push({ element, rec, image }); element.src = 'blob:restored'; },
    runtimeMessage: async msg => msg.type === 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL' ? session : null,
    publishTrashTemplateRecoveryActivity: activity => activities.push(activity)
  });
  api.updateContext({ selectedProfileId: 'profile-1', trashRecords: [record] });
  const recovered = await api.recoverTrashTemplateSession({ forceOpen: false });
  await Promise.resolve();
  assert.strictEqual(recovered.fillId, 'fill-1');
  assert.strictEqual(sourceTitle.textContent, 'Recovery Titel');
  assert.match(sourceMeta.textContent, /12 €/);
  assert.strictEqual(calls.length, 1, 'primary image must be reloaded during recovery');
  assert.strictEqual(cover.src, 'blob:restored');
  assert.strictEqual(activities.length, 1, 'recovery activity card must be published');
  assert.strictEqual(activities[0].action, 'resume-trash-template');
  assert.match(activities[0].title, /vorbereitet/i);
  console.log('v1.22.18 trash-template recovery runtime: 8/8 PASS');
})().catch(error => { console.error(error); process.exit(1); });
