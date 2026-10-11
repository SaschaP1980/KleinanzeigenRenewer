const fs = require('fs');
const assert = require('assert');
const runtimeFiles = ['src/app/app.js','src/background/background.js'];
const texts = Object.fromEntries(runtimeFiles.map(f=>[f,fs.readFileSync(f,'utf8')]));
const deadFunctions = [
  'controlAccordionIsControlled','controlAccordionReadOpen','controlAccordionWriteOpen','controlAccordionEffectiveOpen','setControlAccordionOpen',
  'normalizeUiActivity','uiActivityFingerprint','uiActivityPriority','uiActivityTimestamp','retainedUiActivityHistory','messageHistoryCountText','removeUiActivityHistoryEntry','renderUiActivityVisibility','persistUiActivityCenter','activityHistoryKindLabel','animateMessageHistoryRemoval','deleteUiActivityHistoryItem',
  'renewalAttemptLabel','renderRenewalConfiguration','chooseRenewalMode','chooseRenewalPhaseAttempts','actionGateTooltip','performActionsResync','stickyContexts','diagnosticResetBusy','syncEmergencyWorkflowResetUi','sidebarBottomDiagnosticSnapshot',
  'isKleinanzeigenInsertionErrorUrl','openSharedInventoryDatabase','diagnosticRequiresImmediateFlush','recordMatchesProfile','shouldSkipTrashPurge','isMyAdsProjectsTabUrl'
];
const deadBindings = ['TAB_REGISTRY_KEY','detectedCandidate'];
const joined = runtimeFiles.map(f=>texts[f]).join('\n');
let pass=0; function p(name,fn){fn(); pass++; console.log('PASS',name)}
p('proven unreachable function facades are removed',()=>{
  const remaining = deadFunctions.filter(name => new RegExp(`\\bfunction\\s+${name}\\s*\\(`).test(joined));
  assert.deepEqual(remaining,[],'remaining dead functions: '+remaining.join(', '));
});
p('proven unreachable bindings are removed',()=>{
  const remaining = deadBindings.filter(name => new RegExp(`\\b(?:const|let|var)\\s+${name}\\b`).test(joined));
  assert.deepEqual(remaining,[],'remaining dead bindings: '+remaining.join(', '));
});
p('controller-backed live facades required by runtime remain',()=>{
  assert.match(texts['src/app/app.js'],/function controlAccordionReducedMotion\(/);
  assert.match(texts['src/app/app.js'],/function refreshRenewalConfiguration\(/);
  assert.match(texts['src/background/background.js'],/function tabLoadSignalVersion\(/);
});
console.log(`v1.23.11 dead-code cleanup: ${pass}/3 PASS`);
