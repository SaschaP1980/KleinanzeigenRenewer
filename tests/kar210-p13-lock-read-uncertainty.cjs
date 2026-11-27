'use strict';
// Product-level RED independent of excluded P8 admission. A rejected owner read is not proof of no conflicting work.
const test=require('node:test'),assert=require('node:assert/strict');
const {fixture}=require('./kar210-p13-owner-fixture.cjs');
for(const kind of ['renewal','archive','fill','mass'])test('unknown '+kind+' owner read must not authorize competing insertion',async()=>{
 const f=fixture();f.seed(kind);const before=structuredClone(f.rows);
 assert.equal((await f.make().getInsertionLockState()).locked,true,'control: actual persisted owner blocks before outage');
 f.deny(kind);
 await assert.rejects(f.make().assertInsertionStartAvailable({kind:'renewal'}),'unavailable owner read must not authorize insertion');
 assert.deepEqual(f.rows,before);
});
