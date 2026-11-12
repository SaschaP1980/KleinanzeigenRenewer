'use strict';
// KAR-99 P9: canonical rolling comments can exceed Linux MAX_ARG_STRLEN.
// Keep GitHub CLI argv short; transport the complete JSON PATCH body via stdin.
const assert=require('node:assert/strict');
const {nextBody,buildRollingCommentPatch}=require('../scripts/kar-work-pr-preflight.cjs');
const old='a'.repeat(40),current='b'.repeat(40);
const prefix='**Work branch / exact head:** `work/KAR-99` / `'+old+'`';
const huge='<!-- KAR-ROLLING-COMMENT -->\n'+prefix+'\n'+'Historical evidence '.repeat(12000)+'\n';
assert.ok(Buffer.byteLength(huge,'utf8')>131072,'fixture must exceed Linux argv one-argument limit');
const updated=nextBody(huge,99,old,current);
assert.ok(updated.includes('**Work branch / exact head:** `work/KAR-99` / `'+current+'`'),
  'only exact Work branch SHA changes');
assert.ok(updated.includes('Historical evidence '.repeat(12000)),
  'full comment history must survive head synchronization');
const req=buildRollingCommentPatch('SaschaP1980/KleinanzeigenRenewer',6207471438,updated);
assert.equal(req.command,'gh');
assert.deepEqual(req.args,['api','--method','PATCH','--input','-',
  'repos/SaschaP1980/KleinanzeigenRenewer/issues/comments/6207471438']);
assert.ok(req.args.join(' ').length<1024,'no oversized comment in command argv');
assert.deepEqual(JSON.parse(req.options.input),{body:updated},
  'exact full-size GitHub API PATCH body transported via stdin without loss');
assert.ok(req.options.timeout>0,'bounded GitHub API invocation required');
console.log('PASS KAR99 P9 full-size canonical Rolling Comment PATCH via short argv + JSON stdin');
