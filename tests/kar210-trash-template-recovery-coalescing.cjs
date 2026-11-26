// KAR-210: independent KAR-195 product witness; deferred to S07, not a P8 gate.
// Original assertion body preserved verbatim from KAR-195.
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

test('KAR-195 duplicate passive trash-template recovery queries coalesce while startup is in flight',
  async () => {
    const TrashTemplate = require('../src/app/trash-template-ui-controller.js');
    let calls = 0, release;
    const gate = new Promise(resolve => { release = resolve; });
    const controller = TrashTemplate.create({
      insertionLockActive: () => false,
      runtimeMessage: async message => {
        assert.equal(message.type, 'GET_RECOVERABLE_TRASH_TEMPLATE_FILL');
        calls++;
        await gate;
        return null; // no active template session
      }
    });
    for (let i = 0; i < 8; i++) controller.syncFromLock();
    assert.equal(calls, 1, 'eight synchronous refreshes must send one recovery read');
    release();
    await new Promise(resolve => setImmediate(resolve));
    controller.syncFromLock(); // stable empty result is briefly cached
    assert.equal(calls, 1, 'a verified empty recovery result must not immediately fan out again');
  });
