(() => {
  'use strict';
  const API = Object.freeze({
    create(options = {}) {
      const storageLocal = options.storageLocal;
      if (!storageLocal?.get || !storageLocal?.set) throw new Error('KRTemplateFillService requires storageLocal');
      const sessionsKey = String(options.sessionsKey || 'templateFillSessions');
      const maxAgeMs = Number(options.maxAgeMs || 2 * 60 * 60 * 1000);
      const logDiagnostic = options.logDiagnostic || (async () => {});
      const publicAvailabilityPending = options.publicAvailabilityPending || (() => false);
      const inventoryImageSetExplicitlyEmpty = options.inventoryImageSetExplicitlyEmpty || (() => false);
      const getInventory = options.getInventory || (async () => null);
      const getInventoryImage = options.getInventoryImage || (async () => null);
      const btoaFn = options.btoaFn || globalThis.btoa;
      const terminalStatuses = new Set(['complete', 'needs-review', 'error']);
      let mutationChain = Promise.resolve();
      const TEMPLATE_IMAGE_TRANSFER_CACHE_MAX_ENTRIES = Number(options.TEMPLATE_IMAGE_TRANSFER_CACHE_MAX_ENTRIES || 2);
      const TEMPLATE_IMAGE_TRANSFER_CACHE_TTL_MS = Number(options.TEMPLATE_IMAGE_TRANSFER_CACHE_TTL_MS || 60 * 1000);
      const imageTransferCache = new Map();

      async function readFillSessions() {
        const stored = await storageLocal.get(sessionsKey);
        const sessions = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        const cutoff = Date.now() - maxAgeMs;
        let changed = false;
        for (const [fillId, session] of Object.entries(sessions)) {
          if (!session?.createdAt || Date.parse(session.createdAt) < cutoff) {
            delete sessions[fillId]; changed = true;
          }
        }
        if (changed) await storageLocal.set({ [sessionsKey]: sessions });
        return sessions;
      }

      function preserveEmergencyResetTombstones(existingSessions, incomingSessions) {
        const existing = existingSessions && typeof existingSessions === 'object' ? existingSessions : {};
        const incoming = incomingSessions && typeof incomingSessions === 'object' ? incomingSessions : {};
        const merged = { ...incoming };
        for (const [fillId, current] of Object.entries(existing)) {
          if (!current?.emergencyResetAt) continue;
          const proposed = incoming[fillId];
          if (!proposed || String(proposed.emergencyResetAt || '') !== String(current.emergencyResetAt || '')) merged[fillId] = current;
        }
        return merged;
      }

      async function writeFillSessions(sessions) {
        const stored = await storageLocal.get(sessionsKey);
        const existing = stored[sessionsKey] && typeof stored[sessionsKey] === 'object' ? stored[sessionsKey] : {};
        await storageLocal.set({ [sessionsKey]: preserveEmergencyResetTombstones(existing, sessions) });
      }

      function withTemplateFillMutation(task) {
        const run = mutationChain.then(task, task);
        mutationChain = run.catch(error => {
          void logDiagnostic('error', 'TEMPLATE_FILL_MUTATION_FAILED', {
            message: String(error?.message || error).slice(0, 800), stack: String(error?.stack || '').slice(0, 2400)
          }, { module: 'background', operation: 'template-fill-state' }).catch(() => {});
        });
        return run;
      }

      async function terminalizeTemplateFillForWatchdog(fillId, issue) {
        return withTemplateFillMutation(async () => {
          const sessions = await readFillSessions();
          const session = sessions[String(fillId || '')];
          if (!session || terminalStatuses.has(String(session.status || ''))) return false;
          session.status = 'error';
          session.stage = 'progress-watchdog-timeout';
          session.result = { complete: false, issues: [String(issue || 'Der Vorgang hat keinen Fortschritt mehr gemeldet.').slice(0, 300)] };
          session.updatedAt = new Date().toISOString();
          sessions[session.fillId] = session;
          await writeFillSessions(sessions);
          return true;
        });
      }

      function templatePayload(record) {
        return {
          inventoryId: record.inventoryId, sourceAdId: record.adId, title: record.title || '', description: record.description || '',
          categoryId: record.category?.id ?? record.categoryIdFromUrl ?? null, categoryPath: record.category?.path || record.categoryPath || [],
          dynamicAttributes: (record.dynamicAttributes || []).map(attribute => ({ key: attribute.key, label: attribute.label, technicalValue: attribute.technicalValue, displayValue: attribute.displayValue, controlType: attribute.controlType, controlId: attribute.controlId, required: Boolean(attribute.required) })),
          adType: record.adType ? { value: record.adType.value, displayValue: record.adType.displayValue } : null,
          shipping: record.shipping ? { value: record.shipping.value, displayValue: record.shipping.displayValue, methods: (record.shipping.methods || []).map(method => ({ id: method.id, label: method.label || '' })) } : null,
          price: record.price ? { value: record.price.value, type: record.price.type, typeDisplay: record.price.typeDisplay, currency: record.price.currency || 'EUR' } : null,
          buyNow: record.buyNow ? { value: record.buyNow.value, eligible: record.buyNow.eligible } : null,
          locationData: record.locationData ? { zipCode: record.locationData.zipCode || '', city: record.locationData.city || '', street: record.locationData.street || '', locationId: record.locationData.locationId ?? null, addressVisibility: record.locationData.addressVisibility } : null,
          posterType: record.posterType || null,
          images: (record.images || []).map(image => ({ imageKey: image.imageKey, position: image.position, imageId: image.imageId, isPrimary: Boolean(image.isPrimary), mimeType: image.mimeType, size: image.size, width: image.width, height: image.height, sha256: image.sha256 }))
        };
      }

      function assertTemplateSourceReady(record) {
        if (!record) throw new Error('Vorlage wurde nicht gefunden.');
        if (publicAvailabilityPending(record)) throw new Error('Diese Anzeige ist noch „Bald Online“. Neu inserieren ist erst möglich, nachdem der Online-Status erfolgreich bestätigt wurde.');
        if (!record.extraction?.capturedFromEditView || record.extraction?.templateComplete !== true) throw new Error('Diese Anzeige besitzt keine vollständig bestätigte Bearbeiten-Vorlage.');
        const categoryId = record.category?.id ?? record.categoryIdFromUrl;
        if (!/^\d+$/.test(String(categoryId ?? ''))) throw new Error('Die Vorlage besitzt keine eindeutige Kategorie-ID.');
        if (!record.title || !record.description) throw new Error('Titel oder Beschreibung fehlen in der Vorlage.');
        const images = Array.isArray(record.images) ? record.images : [];
        if (!images.length) {
          if (!inventoryImageSetExplicitlyEmpty(record)) throw new Error('Der leere Bildbestand der Vorlage ist nicht eindeutig bestätigt.');
        } else if (images.some(image => image.mimeType !== 'image/jpeg' || !image.imageKey || !image.size)) throw new Error('Die lokalen JPEG-Bilder der Vorlage sind unvollständig.');
      }

      function templateFillHoldsInsertionLock(session) { return Boolean(session?.templateOnly) && ['waiting', 'running'].includes(String(session.status || '')); }

      function isRecoverableTrashTemplateSession(session) {
        if (!session?.templateOnly) return false;
        const status = String(session.status || '');
        const stage = String(session.stage || '');
        if (['waiting', 'running'].includes(status)) return true;
        return status === 'complete' && ['template-only-complete', 'template-only-published'].includes(stage);
      }

      function isEmergencyResettableSession(session) {
        if (!session) return false;
        const status = String(session.status || '');
        const stage = String(session.stage || '');
        if (status === 'complete' && stage === 'template-only-complete') return false;
        if (isRecoverableTrashTemplateSession(session)) return true;
        if (['complete', 'needs-review', 'error', 'cancelled'].includes(status)) return false;
        return true;
      }

      async function getTemplateFillSession(sender) {
        const tabId = sender?.tab?.id;
        if (!tabId) return null;
        const sessions = await readFillSessions();
        const session = Object.values(sessions).find(item => item?.targetTabId === tabId && ['waiting', 'running'].includes(item.status));
        if (!session) return null;
        const record = session.archiveInsertionId && session.archiveTemplate ? session.archiveTemplate : await getInventory(session.inventoryId);
        if (!record) throw new Error('Vorlageninventar wurde nach dem Öffnen des Tabs nicht gefunden.');
        session.status = 'running';
        session.stage = session.stage === 'tab-opened' ? 'content-connected' : session.stage;
        session.updatedAt = new Date().toISOString();
        sessions[session.fillId] = session;
        await writeFillSessions(sessions);
        return {
          operationId: session.operationId || null, parentOperationId: session.parentOperationId || null, fillId: session.fillId,
          renewalId: session.renewalId || null, archiveInsertionId: session.archiveInsertionId || null, templateOnly: Boolean(session.templateOnly),
          autoReplacementAllowed: Boolean(session.autoReplacementAllowed), trashInventoryId: session.trashInventoryId || null,
          status: session.status || null, stage: session.stage || null,
          result: session.result ? { complete: Boolean(session.result.complete), issues: Array.isArray(session.result.issues) ? session.result.issues.slice(0, 50) : [] } : null,
          template: templatePayload(record)
        };
      }

      function bytesToBase64(bytes) {
        let binary = ''; const stride = 0x8000;
        for (let index = 0; index < bytes.length; index += stride) binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + stride, bytes.length)));
        return btoaFn(binary);
      }
      function imageTransferCacheKey(fillId, imageKey) { return `${String(fillId || '')}::${String(imageKey || '')}`; }
      function evictTemplateImageTransfer(fillId, imageKey) { imageTransferCache.delete(imageTransferCacheKey(fillId, imageKey)); }
      function evictTemplateImageTransfersForFill(fillId) { const prefix=`${String(fillId || '')}::`; for (const key of imageTransferCache.keys()) if (key.startsWith(prefix)) imageTransferCache.delete(key); }
      function evictTemplateImageTransfersForTab(tabId) { const id=Number(tabId||0); for (const [key,value] of imageTransferCache.entries()) if (Number(value?.targetTabId||0)===id) imageTransferCache.delete(key); }
      function pruneTemplateImageTransferCache(now=Date.now()) {
        for (const [key,value] of imageTransferCache.entries()) if (now-Number(value?.lastAccessAt||0)>TEMPLATE_IMAGE_TRANSFER_CACHE_TTL_MS) imageTransferCache.delete(key);
        while (imageTransferCache.size>TEMPLATE_IMAGE_TRANSFER_CACHE_MAX_ENTRIES) {
          const oldest=[...imageTransferCache.entries()].sort((a,b)=>Number(a[1]?.lastAccessAt||0)-Number(b[1]?.lastAccessAt||0))[0]?.[0]; if(!oldest)break; imageTransferCache.delete(oldest);
        }
      }
      async function resolveTemplateImageTransfer(message, sender) {
        const tabId=Number(sender?.tab?.id||0), key=imageTransferCacheKey(message.fillId,message.imageKey), now=Date.now(); pruneTemplateImageTransferCache(now);
        const cached=imageTransferCache.get(key); if(cached&&Number(cached.targetTabId||0)===tabId){cached.lastAccessAt=now;return cached;}
        const sessions=await readFillSessions(), session=sessions[message.fillId];
        if(!session||Number(session.targetTabId||0)!==tabId||!['waiting','running'].includes(session.status)) throw new Error('Ungültige oder abgelaufene Vorlagen-Sitzung.');
        const image=await getInventoryImage(message.imageKey); if(!image?.blob||String(image.inventoryId)!==String(session.inventoryId)) throw new Error('Lokales Vorlagenbild wurde nicht gefunden.');
        const transfer={fillId:String(message.fillId||''),imageKey:String(message.imageKey||''),inventoryId:String(session.inventoryId||''),targetTabId:tabId,blob:image.blob,mimeType:image.mimeType||image.blob.type||'image/jpeg',lastAccessAt:now};
        imageTransferCache.set(key,transfer);pruneTemplateImageTransferCache(now);return transfer;
      }
      async function templateImageChunk(message,sender){
        const transfer=await resolveTemplateImageTransfer(message,sender), offset=Math.max(0,Number(message.offset||0)), requestedLength=Math.max(1,Math.min(512 * 1024,Number(message.length||512 * 1024)));
        if(offset>=transfer.blob.size){evictTemplateImageTransfer(message.fillId,message.imageKey);throw new Error('Bildblock liegt außerhalb der gespeicherten Datei.');}
        const end=Math.min(transfer.blob.size,offset+requestedLength),bytes=new Uint8Array(await transfer.blob.slice(offset,end).arrayBuffer());transfer.lastAccessAt=Date.now();if(end>=transfer.blob.size)evictTemplateImageTransfer(message.fillId,message.imageKey);
        return {offset,end,totalSize:transfer.blob.size,mimeType:transfer.mimeType,base64:bytesToBase64(bytes)};
      }
      function isTransientTemplateFillProgress(stage,status,result){return String(status||'')==='running'&&result==null&&/^image-\d+-of-\d+-(queued|uploading|checking|stable)$/.test(String(stage||''));}
      function templateFillProgressSnapshot(session,stage,updatedAt=new Date().toISOString()){return {renewalId:session?.renewalId||null,massBatchId:session?.massBatchId||null,massBatchItemIndex:session?.massBatchItemIndex??null,status:session?.renewalId?'draft':session?.status||'running',stage:String(stage||session?.stage||''),newAdId:session?.newAdId||null,lastError:null,operationId:session?.operationId||null,parentOperationId:session?.parentOperationId||null,fillId:session?.fillId||null,updatedAt};}

      return Object.freeze({
        TERMINAL_TEMPLATE_FILL_STATUSES: terminalStatuses,
        readFillSessions, writeFillSessions, withTemplateFillMutation, terminalizeTemplateFillForWatchdog,
        templatePayload, assertTemplateSourceReady, templateFillHoldsInsertionLock, isRecoverableTrashTemplateSession, isEmergencyResettableSession, getTemplateFillSession,
        evictTemplateImageTransfer, evictTemplateImageTransfersForFill, evictTemplateImageTransfersForTab,
        resolveTemplateImageTransfer, templateImageChunk,
        isTransientTemplateFillProgress, templateFillProgressSnapshot
      });
    }
  });
  globalThis.KRDeps?.register?.('KRTemplateFillService', API);
  if (typeof module !== 'undefined' && module?.exports) module.exports = API;
})();
