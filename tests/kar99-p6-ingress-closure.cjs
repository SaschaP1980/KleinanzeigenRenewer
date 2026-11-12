// KAR-99 P6 #4/#6: actual managed ingress, immutable intent, archive recovery
// and exact-Ad-ID delete boundaries. Local fixtures only; no live account I/O.
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
let checks = 0;
function ok(value, label) {
  assert.ok(value, label);
  checks++;
  console.log('PASS KAR99-P6-INGRESS ' + label);
}
function source(name) { return fs.readFileSync(name, 'utf8'); }
function section(body, start, end) {
  const a = body.indexOf(start), b = body.indexOf(end, a + start.length);
  assert.ok(a >= 0 && b > a, 'actual production function boundaries required: ' + start);
  return body.slice(a, b);
}
const filler = source('src/content/template-filler.js');
const pending = section(filler, 'async function runPendingFill()', 'const API = Object.freeze(');
const getSession = pending.indexOf("type: 'GET_TEMPLATE_FILL_SESSION'");
const guard = pending.indexOf('armPublishDetection(session.fillId)');
const dispatch = pending.indexOf("if (kind === 'category')", getSession);
ok(getSession >= 0 && guard > getSession && guard < dispatch,
  'managed session installs before-click guard at initial fill/reentry BEFORE any workflow branch');
const guardContext = pending.slice(Math.max(0, guard - 160), guard + 75);
ok(guardContext.includes('!session.templateOnly')
   && guardContext.includes('session.renewalId')
   && guardContext.includes('session.archiveInsertionId'),
  'early interception covers renewal/archive but excludes user-owned template-only publish');
ok(guard < pending.indexOf("if (kind === 'post-fill'", getSession)
   && guard < pending.indexOf('return await runFillSession(session)', getSession),
  'early guard precedes async template fill, retry, and post-fill recovery');

const flow = source('src/content/template-publish-flow.js');
const postFill = section(flow, 'async function autoPublishVerifiedRenewal(', 'function findPostFillContinueButtons(');
ok(postFill.indexOf('armPublishDetection(fillId)') >= 0
   && postFill.indexOf('armPublishDetection(fillId)') < postFill.indexOf('const candidates = findVisiblePublishButtons()'),
  'direct post-fill and ambiguous buttons also arm the same before-click interceptor');
ok(postFill.indexOf("type: 'AUTHORIZE_AUTOMATIC_PUBLISH'") > 0
   && postFill.indexOf("type: 'AUTHORIZE_AUTOMATIC_PUBLISH'") < postFill.indexOf('button.click();'),
  'real automatic publish click is preceded by awaited background/journal authorization');
const listener = section(flow, 'function armPublishDetection(fillId)', 'function scrollToPublishButton()');
ok(listener.includes("document.addEventListener('click'") && listener.includes("document.addEventListener('submit'")
   && listener.includes('event.preventDefault()') && listener.includes('nativeSubmitConsumed = true'),
  'capture-phase click + implicit-submit handlers require one-shot native submit and stop replay');

const deleteService = source('src/background/services/remote-delete-replacement-service.js');
const phase4 = section(deleteService, 'async function preverifyAndTriggerRenewalSourceDeleteAttempt(', 'async function ');
const intent = phase4.indexOf('await beginPhase4Attempt(');
const remoteDelete = phase4.indexOf("type: 'DELETE_OWN_AD_BY_ID'");
ok(intent >= 0 && remoteDelete > intent
   && phase4.indexOf("type: 'MY_ADS_STATUS'") < intent,
  'same-profile My Ads proof and durable Phase-4 intent both precede exact-ID remote DELETE');
ok(phase4.indexOf("'RENEWAL_PHASE4_ATOMIC_PREVERIFY_DELETE_STARTED'")
    < phase4.lastIndexOf("type: 'MY_ADS_STATUS'")
   && phase4.lastIndexOf("type: 'MY_ADS_STATUS'") < remoteDelete,
  'final independent My Ads account binding follows diagnostic await directly before DELETE');
const ownDelete = source('src/content/inventory-delete-operations.js');
const ownDeleteFn = section(ownDelete, 'async function deleteOwnAdById(', 'async function ');
ok(ownDeleteFn.includes('exactDeleteControls(listing.root)')
   && ownDeleteFn.includes('deleteControls.length !== 1')
   && ownDeleteFn.includes('deleteControls[0].click()'),
  'only an unambiguous exact-ad-id own-listing Delete control may proceed');

const verify = source('src/background/services/archive-insertion-verification-service.js');
const archivePost = section(verify, 'async function runArchiveInsertionPostPublish(', 'async function confirmPublishedArchiveInsertion(');
ok(archivePost.includes('findArchivePublishedAd(session)')
   && !archivePost.includes('.click(') && !archivePost.includes('DELETE_OWN_AD_BY_ID')
   && !archivePost.includes('AUTHORIZE_AUTOMATIC_PUBLISH'),
  'detached archive postpublish continuation has no second external publish/delete side effect');
const archiveConfirm = section(verify, 'async function confirmPublishedArchiveInsertion(', 'return Object.freeze(');
ok(archiveConfirm.indexOf('await resolvePublishIntent(fill, detected)') >= 0
   && archiveConfirm.indexOf('await resolvePublishIntent(fill, detected)') < archiveConfirm.indexOf('session.newAdId = newAdId'),
  'archive postpublish/inventory promotion requires independent immutable receipt resolution first');
const archiveRecovery = source('src/background/services/archive-insertion-recovery-service.js');
ok((archiveRecovery.match(/withAutonomousAdmission\('archive-postpublish-detached'/g) || []).length === 2
   && archiveConfirm.includes("withAutonomousAdmission('archive-postpublish-detached'"),
  'all three detached archive postpublish/recovery producers use the same admission owner');
const renewal = source('src/background/controllers/renewal-workflow-controller.js');
const renewalConfirm = section(renewal, 'async function confirmPublishedRenewal(', 'async function ');
ok(renewalConfirm.indexOf('await resolvePublishIntent(fill, detected)') >= 0
   && renewalConfirm.indexOf('await resolvePublishIntent(fill, detected)') < renewalConfirm.indexOf('renewal.newAdId = newAdId'),
  'renewal follow-up verification and Phase-4 cannot consume navigation as remote publication proof');
const contentDir = 'src/content';
const modules = fs.readdirSync(contentDir).filter(x => x.endsWith('.js'));
const callers = [];
for (const name of modules) {
  const raw = source(path.join(contentDir, name));
  const lines = raw.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('//') && /(?:^|[^.])(?:form\.)?requestSubmit\s*\(|\.submit\s*\(/.test(line))
      callers.push(name + ':' + (i+1));
  }
}
ok(callers.length === 0, 'no direct form.submit()/requestSubmit() bypass in any content runtime module: ' + callers.join(', '));
// Execute the actual runPendingFill orchestration in a sandbox, not a
// reimplementation of its branch decisions. Capture must precede the
// asynchronous fill/reentry entrypoints for both managed owner kinds.
const vm = require('node:vm');
async function runRealIngress(session, kind) {
  const events=[];
  const run = vm.runInNewContext(
    section(filler, 'async function runPendingFill()', 'const API = Object.freeze(')
      + '\nrunPendingFill;', {
      armMassRenewalHeartbeat:()=>{},
      pageKind:()=>kind,
      runtimeMessage:async msg=>{
        assert.equal(msg.type,'GET_TEMPLATE_FILL_SESSION');
        return session;
      },
      activeCorrelationContext:{}, panelTemplateOnly:false,panelArchiveInsertion:false,
      armPublishDetection:id=>{events.push('armed:'+id);},
      runFillSession:async()=>{events.push('fill');return {};},
      runPostFillSession:async()=>{events.push('postfill');return {};},
      runLegacyCategorySelection:async()=>{events.push('category');return {};}
    });
  await run();
  return events;
}
(async()=>{
  const fillId='bound-managed-fill';
  const renewal=await runRealIngress({fillId,renewalId:'renew-one',templateOnly:false,stage:'form-ready'},'target');
  ok(renewal.join(',')==='armed:'+fillId+',fill',
    'actual managed renewal arms before initial async template fill');
  const archive=await runRealIngress({fillId,archiveInsertionId:'archive-one',templateOnly:false,stage:'form-ready'},'target');
  ok(archive.join(',')==='armed:'+fillId+',fill',
    'actual managed archive import arms before initial async template fill');
  const reentry=await runRealIngress({fillId,renewalId:'renew-one',templateOnly:false,stage:'auto-publish-ready'},'post-fill');
  ok(reentry.join(',')==='armed:'+fillId+',postfill',
    'actual post-fill reentry arms before recovery publication');
  const userOwned=await runRealIngress({fillId,templateOnly:true,stage:'form-ready'},'target');
  ok(userOwned.join(',')==='fill',
    'actual user-owned template-only fill is not intercepted');
  console.log('PASS KAR99 P6 ingress closure ' + checks + ' assertions');
})().catch(e=>{console.error(e);process.exitCode=1});
