(() => {
  'use strict';
  const API=Object.freeze({
    create(options={}) {
      const ArchiveInsertionUiController=options.ArchiveInsertionUiController || globalThis.KRDeps?.optional?.('KRArchiveInsertionUiController') || (typeof require === 'function' ? require('./archive-insertion-ui-controller.js') : null);
      const TrashTemplateUiController=options.TrashTemplateUiController || globalThis.KRDeps?.optional?.('KRTrashTemplateUiController') || (typeof require === 'function' ? require('./trash-template-ui-controller.js') : null);
      if(!ArchiveInsertionUiController?.create||!TrashTemplateUiController?.create) throw new Error('archive/trash UI modules must load before insertion UI is used');
      const archive=ArchiveInsertionUiController.create(options);
      const trash=TrashTemplateUiController.create(options);
      function install(){archive.install();trash.install();}
      function updateContext(context={}){archive.updateContext(context);trash.updateContext(context);}
      function status(){return Object.freeze({...archive.status(),...trash.status()});}
      function syncConfiguration(){return archive.syncConfiguration();}
      function syncFromLock(){archive.syncFromLock();trash.syncFromLock();}
      function handleEmergencyWorkflowReset(){return trash.handleEmergencyWorkflowReset();}
      return Object.freeze({
        install,updateContext,status,syncConfiguration,syncFromLock,handleEmergencyWorkflowReset,
        setTrackedArchiveInsertionId:(...a)=>archive.setTrackedArchiveInsertionId(...a),
        resetArchive:(...a)=>archive.resetArchive(...a), validateArchiveFile:(...a)=>archive.validateArchiveFile(...a), archiveProgressModel:(...a)=>archive.archiveProgressModel(...a), applyArchiveInsertionSessionSnapshot:(...a)=>archive.applyArchiveInsertionSessionSnapshot(...a), refreshArchiveInsertionProgress:(...a)=>archive.refreshArchiveInsertionProgress(...a), handleArchiveStateChanged:(...a)=>archive.handleArchiveStateChanged(...a),
        openTrashTemplateDialog:(...a)=>trash.openTrashTemplateDialog(...a), trashTemplateInventoryGate:(...a)=>trash.trashTemplateInventoryGate(...a), syncTrashTemplateInventoryButton:(...a)=>trash.syncTrashTemplateInventoryButton(...a), syncTrashTemplateRecoveryActivity:(...a)=>trash.syncTrashTemplateRecoveryActivity(...a), renderTrashTemplateFillStatus:(...a)=>trash.renderTrashTemplateFillStatus(...a), refreshTrashTemplateDialogStatus:(...a)=>trash.refreshTrashTemplateDialogStatus(...a), recoverTrashTemplateSession:(...a)=>trash.recoverTrashTemplateSession(...a), reopenTrashTemplateSession:(...a)=>trash.reopenTrashTemplateSession(...a), handleTrashTemplateDataChanged:(...a)=>trash.handleTrashTemplateDataChanged(...a), handleTrashTemplateTargetTabRemoved:(...a)=>trash.handleTrashTemplateTargetTabRemoved(...a)
      });
    }
  });
  globalThis.KRDeps?.register?.('KRArchiveTrashInsertionUiController',API);
  if(typeof module!=='undefined'&&module?.exports)module.exports=API;
})();
