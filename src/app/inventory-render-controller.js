(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const RecordCardView = options.RecordCardView || globalThis.KRDeps?.optional?.('KRRecordCardView') || (typeof require === 'function' ? require('./record-card-view.js') : null);
      const InventoryCardRenderer = options.InventoryCardRenderer || globalThis.KRDeps?.optional?.('KRInventoryCardRenderer') || (typeof require === 'function' ? require('./inventory-card-renderer.js') : null);
      const TrashCardRenderer = options.TrashCardRenderer || globalThis.KRDeps?.optional?.('KRTrashCardRenderer') || (typeof require === 'function' ? require('./trash-card-renderer.js') : null);
      if (!RecordCardView?.create || !InventoryCardRenderer?.create || !TrashCardRenderer?.create) throw new Error('record/inventory/trash renderer modules must load before inventory rendering');
      const recordCardView = RecordCardView.create(options);
      const inventoryRenderer = InventoryCardRenderer.create({ ...options, recordCardView });
      const trashRenderer = TrashCardRenderer.create({ ...options, recordCardView });
      function updateContext(context = {}) { inventoryRenderer.updateContext(context); trashRenderer.updateContext(context); }
      return Object.freeze({
        updateContext,
        appendDerivedListingDateBadge: (...args) => inventoryRenderer.appendDerivedListingDateBadge(...args),
        cardTargetIsInteractive: (...args) => recordCardView.cardTargetIsInteractive(...args),
        renderCompactInventoryRow: (...args) => inventoryRenderer.renderCompactInventoryRow(...args),
        renderCompactTrashRow: (...args) => trashRenderer.renderCompactTrashRow(...args),
        renderInventories: (...args) => inventoryRenderer.renderInventories(...args),
        renderTrash: (...args) => trashRenderer.renderTrash(...args),
        buildFullImageStrip: (...args) => recordCardView.buildFullImageStrip(...args),
        makeInventoryExportActionButton: (...args) => inventoryRenderer.makeInventoryExportActionButton(...args),
        makeCompactInventoryExportButton: (...args) => inventoryRenderer.makeCompactInventoryExportButton(...args)
      });
    }
  });
  globalThis.KRDeps?.register?.('KRInventoryRenderController', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
